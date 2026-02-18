-- Descripciones detalladas en transacciones (nuevas).
-- Ejecutar en SQL Editor de Supabase después de booking-no-past y noshow-and-debt.
-- Las transacciones ya existentes no se modifican; solo afecta a las nuevas.

-- 1) booking_pay_deposit: description con pista y fecha/hora
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
  v_court_name TEXT;
  v_desc TEXT;
BEGIN
  SELECT deposit, name INTO v_deposit, v_court_name FROM public.courts WHERE id = p_court_id AND is_active = true;
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

  v_desc := 'Depósito reserva — ' || COALESCE(trim(v_court_name), 'Pista') || ', ' ||
    to_char(p_booking_date, 'DD') || ' ' || lower(to_char(p_booking_date, 'TMMon')) || ' ' ||
    to_char(p_start_time, 'HH24:MI');

  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (p_user_id, 'booking_deposit', -v_deposit, v_desc, v_booking_id, COALESCE(auth.uid(), p_user_id));

  RETURN v_booking_id;
END;
$$;

-- 2) admin_mark_noshow: description de penalización con pista y fecha/hora
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
  v_court_name TEXT;
  v_desc TEXT;
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
    SELECT COALESCE(c.deposit, 4.50), COALESCE(c.price, 18.00), c.name
    INTO v_deposit, v_price, v_court_name
    FROM public.courts c WHERE c.id = v_booking.court_id;
    v_rest := v_price - v_deposit;

    v_desc := 'Penalización no-show — ' || COALESCE(trim(v_court_name), 'Pista') || ', ' ||
      to_char(v_booking.booking_date, 'DD') || ' ' || lower(to_char(v_booking.booking_date, 'TMMon')) || ' ' ||
      to_char(v_booking.start_time, 'HH24:MI');

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
    VALUES (v_booking.user_id, 'no_show_penalty', -v_rest, v_desc, p_booking_id, auth.uid());
  END IF;
END;
$$;
