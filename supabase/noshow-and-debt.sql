-- ============================================================
-- No-shows (gestión admin) y bloqueo por deuda
-- Ejecutar en SQL Editor de Supabase (una sola vez).
-- ============================================================

-- 1) Añadir 'no_show' al enum booking_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'no_show' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')) THEN
    ALTER TYPE public.booking_status ADD VALUE 'no_show';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Añadir 'no_show_penalty' y 'debt_payment' al enum transaction_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'no_show_penalty' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'no_show_penalty';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'debt_payment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'debt_payment';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Añadir columnas de deuda a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_debt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS debt_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 4) admin_mark_noshow: marcar reserva como no-show; opcionalmente cobrar resto (y deuda si no hay saldo)
CREATE OR REPLACE FUNCTION public.admin_mark_noshow(p_booking_id UUID, p_charge_penalty BOOLEAN DEFAULT false)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_rest NUMERIC(10,2);
  v_start_ts TIMESTAMPTZ;
  v_balance NUMERIC(10,2);
  v_paid_from_wallet NUMERIC(10,2);
  v_remaining_debt NUMERIC(10,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.court_id, b.booking_date, b.start_time
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'Solo se puede marcar no-show en reservas confirmadas';
  END IF;

  v_start_ts := (v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Europe/Madrid';
  IF v_start_ts > now() THEN
    RAISE EXCEPTION 'La hora de la reserva aún no ha pasado';
  END IF;

  UPDATE public.bookings SET status = 'no_show', updated_at = timezone('utc', now()) WHERE id = p_booking_id;

  IF p_charge_penalty AND v_booking.deposit_paid THEN
    SELECT COALESCE(c.deposit, 4.50), COALESCE(c.price, 18.00)
    INTO v_deposit, v_price
    FROM public.courts c WHERE c.id = v_booking.court_id;
    v_rest := v_price - v_deposit;

    SELECT wallet_balance, debt_amount INTO v_balance, v_remaining_debt
    FROM public.profiles WHERE id = v_booking.user_id FOR UPDATE;
    v_remaining_debt := COALESCE(v_remaining_debt, 0);
    v_balance := COALESCE(v_balance, 0);

    v_paid_from_wallet := LEAST(v_balance, v_rest);
    v_remaining_debt := v_rest - v_paid_from_wallet;

    UPDATE public.profiles
    SET
      wallet_balance = wallet_balance - v_paid_from_wallet,
      debt_amount = debt_amount + v_remaining_debt,
      has_debt = (debt_amount + v_remaining_debt > 0)
    WHERE id = v_booking.user_id;

    INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
    VALUES (v_booking.user_id, 'no_show_penalty', -v_rest, 'Penalización por no presentarse', p_booking_id, auth.uid());
  END IF;
END;
$$;

-- 5) wallet_recharge: después de acreditar la recarga, descontar deuda si la hay
CREATE OR REPLACE FUNCTION public.wallet_recharge(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance NUMERIC(10,2);
  v_debt NUMERIC(10,2);
  v_pay NUMERIC(10,2);
BEGIN
  IF p_stripe_session_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.transactions WHERE stripe_session_id = p_stripe_session_id) THEN
    RETURN;
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, description, stripe_session_id, created_by)
  VALUES (p_user_id, 'recharge', p_amount, COALESCE(p_description, 'Recarga monedero'), p_stripe_session_id, COALESCE(auth.uid(), p_user_id));

  SELECT wallet_balance, debt_amount INTO v_balance, v_debt
  FROM public.profiles WHERE id = p_user_id;
  v_debt := COALESCE(v_debt, 0);
  IF v_debt > 0 AND v_balance > 0 THEN
    v_pay := LEAST(v_debt, v_balance);
    UPDATE public.profiles
    SET
      wallet_balance = wallet_balance - v_pay,
      debt_amount = debt_amount - v_pay,
      has_debt = (debt_amount - v_pay > 0)
    WHERE id = p_user_id;
    INSERT INTO public.transactions (user_id, type, amount, description, created_by)
    VALUES (p_user_id, 'debt_payment', -v_pay, 'Pago de deuda', COALESCE(auth.uid(), p_user_id));
  END IF;
END;
$$;

-- 6) booking_pay_deposit: no permitir reservar si tiene deuda
CREATE OR REPLACE FUNCTION public.booking_pay_deposit(
  p_user_id UUID,
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deposit NUMERIC(10,2);
  v_balance NUMERIC(10,2);
  v_booking_id UUID;
  v_has_debt BOOLEAN;
BEGIN
  SELECT deposit INTO v_deposit FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF v_deposit IS NULL THEN RAISE EXCEPTION 'Court not found or inactive'; END IF;

  SELECT has_debt INTO v_has_debt FROM public.profiles WHERE id = p_user_id;
  IF v_has_debt THEN
    RAISE EXCEPTION 'Tienes una deuda pendiente. Recarga tu monedero.';
  END IF;

  IF ((p_booking_date + p_start_time) AT TIME ZONE 'Europe/Madrid') <= now() THEN
    RAISE EXCEPTION 'No se puede reservar en una hora que ya ha pasado';
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance < v_deposit THEN RAISE EXCEPTION 'Insufficient wallet balance for deposit'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.court_id = p_court_id AND b.booking_date = p_booking_date
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN RAISE EXCEPTION 'Court already booked in this slot'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_schedules cs
    WHERE cs.court_id = p_court_id AND cs.blocked_date = p_booking_date
      AND (cs.start_time, cs.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN RAISE EXCEPTION 'Court blocked in this slot'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_deposit WHERE id = p_user_id;

  INSERT INTO public.bookings (user_id, court_id, booking_date, start_time, end_time, status, deposit_paid, created_by)
  VALUES (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time, 'confirmed', true, COALESCE(auth.uid(), p_user_id))
  RETURNING id INTO v_booking_id;

  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (p_user_id, 'booking_deposit', -v_deposit, 'Señal reserva', v_booking_id, COALESCE(auth.uid(), p_user_id));

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_noshow(UUID, BOOLEAN) TO authenticated;
