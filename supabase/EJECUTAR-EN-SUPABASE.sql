-- ============================================================
-- COPIAR Y PEGAR TODO ESTE ARCHIVO EN EL SQL EDITOR DE SUPABASE
-- Ejecutar una sola vez (o cuando actualicemos estas funciones).
-- ============================================================

-- ----- 1. Política de cancelación (24h, reembolso/deuda) -----

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'late_cancellation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'late_cancellation';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_rest NUMERIC(10,2);
  v_start_ts TIMESTAMPTZ;
  v_hours_until_start NUMERIC;
BEGIN
  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.court_id, b.booking_date, b.start_time,
         c.deposit, c.price
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'No puedes cancelar esta reserva';
  END IF;
  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar reservas confirmadas';
  END IF;

  v_deposit := COALESCE(v_booking.deposit, 4.50);
  v_price   := COALESCE(v_booking.price, 18.00);
  v_rest    := v_price - v_deposit;

  v_start_ts := (v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Europe/Madrid';
  v_hours_until_start := EXTRACT(EPOCH FROM (v_start_ts - now())) / 3600.0;

  UPDATE public.bookings SET status = 'cancelled', updated_at = timezone('utc', now()) WHERE id = p_booking_id;

  IF v_hours_until_start >= 24 THEN
    IF v_booking.deposit_paid THEN
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_deposit WHERE id = p_user_id;
      INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
      VALUES (p_user_id, 'refund', v_deposit, 'Reembolso por cancelación de reserva', p_booking_id, auth.uid());
    END IF;
  ELSE
    IF v_booking.deposit_paid THEN
      UPDATE public.profiles
      SET wallet_balance = wallet_balance - v_rest
      WHERE id = p_user_id;
      INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
      VALUES (p_user_id, 'late_cancellation', -v_rest, 'Penalización por cancelación tardía (resto de la reserva)', p_booking_id, auth.uid());
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_cancel_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.cancel_booking(p_booking_id, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_booking(p_booking_id UUID, p_refund_deposit BOOLEAN DEFAULT true)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.court_id
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar reservas confirmadas';
  END IF;

  UPDATE public.bookings SET status = 'cancelled', updated_at = timezone('utc', now()) WHERE id = p_booking_id;

  IF p_refund_deposit AND v_booking.deposit_paid THEN
    SELECT COALESCE(c.deposit, 4.50) INTO v_deposit FROM public.courts c WHERE c.id = v_booking.court_id;
    v_deposit := COALESCE(v_deposit, 4.50);
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_deposit WHERE id = v_booking.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
    VALUES (v_booking.user_id, 'refund', v_deposit, 'Reembolso por cancelación (admin)', p_booking_id, auth.uid());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_cancel_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_booking(UUID, BOOLEAN) TO authenticated;


-- ----- 2. No permitir reservar en una hora ya pasada -----

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
BEGIN
  SELECT deposit INTO v_deposit FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF v_deposit IS NULL THEN RAISE EXCEPTION 'Court not found or inactive'; END IF;

  IF ((p_booking_date + p_start_time) AT TIME ZONE 'Europe/Madrid') <= now() THEN
    RAISE EXCEPTION 'No se puede reservar en una hora que ya ha pasado';
  END IF;
  IF p_booking_date > ((now() AT TIME ZONE 'Europe/Madrid')::date + 14) THEN
    RAISE EXCEPTION 'Solo se pueden hacer reservas como máximo a 14 días vista';
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
