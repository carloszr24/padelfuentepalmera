-- ============================================================
-- Señal variable: socios 4,50 €, no socios 5,00 €.
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 1. Columna que guarda el importe real cobrado en la reserva
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 4.50;

-- 2. Función que acepta el importe de señal como parámetro
CREATE OR REPLACE FUNCTION public.booking_pay_deposit(
  p_user_id    UUID,
  p_court_id   UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_deposit    NUMERIC DEFAULT NULL  -- NULL = usar el deposit configurado en la pista
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deposit    NUMERIC(10,2);
  v_balance    NUMERIC(10,2);
  v_booking_id UUID;
  v_court_name TEXT;
  v_desc       TEXT;
BEGIN
  -- Obtener nombre y depósito base de la pista
  SELECT deposit, name INTO v_deposit, v_court_name
  FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF v_deposit IS NULL THEN RAISE EXCEPTION 'Court not found or inactive'; END IF;

  -- Si se pasa un importe explícito, usarlo en lugar del de la pista
  IF p_deposit IS NOT NULL THEN
    v_deposit := p_deposit;
  END IF;

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

  INSERT INTO public.bookings
    (user_id, court_id, booking_date, start_time, end_time, status, deposit_paid, deposit_amount, created_by)
  VALUES
    (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time, 'confirmed', true, v_deposit,
     COALESCE(auth.uid(), p_user_id))
  RETURNING id INTO v_booking_id;

  v_desc := 'Depósito reserva — ' || COALESCE(trim(v_court_name), 'Pista') || ', ' ||
    to_char(p_booking_date, 'DD') || ' ' || lower(to_char(p_booking_date, 'TMMon')) || ' ' ||
    to_char(p_start_time, 'HH24:MI');

  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (p_user_id, 'booking_deposit', -v_deposit, v_desc, v_booking_id,
          COALESCE(auth.uid(), p_user_id));

  RETURN v_booking_id;
END;
$$;
