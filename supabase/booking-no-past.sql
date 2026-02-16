-- Validación server-side: no permitir reservar en una hora ya pasada.
-- Ejecutar en SQL Editor de Supabase (una sola vez).

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
