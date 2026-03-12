-- ============================================================
-- Opción "Pagar en el club" al reservar.
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

-- 1. Nueva columna payment_method en bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'wallet'
  CHECK (payment_method IN ('wallet', 'pay_at_club'));

COMMENT ON COLUMN public.bookings.payment_method IS 'Método de pago elegido al reservar: wallet (señal del monedero) o pay_at_club (pago total en el club).';


-- 2. RPC booking_reserve_free: reserva sin señal (pago en el club)
--    Mismas validaciones que booking_pay_deposit pero sin descontar del monedero.
CREATE OR REPLACE FUNCTION public.booking_reserve_free(
  p_user_id UUID,
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking_id UUID;
  v_court_name TEXT;
BEGIN
  SELECT name INTO v_court_name FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF v_court_name IS NULL THEN RAISE EXCEPTION 'Court not found or inactive'; END IF;

  IF ((p_booking_date + p_start_time) AT TIME ZONE 'Europe/Madrid') <= now() THEN
    RAISE EXCEPTION 'No se puede reservar en una hora que ya ha pasado';
  END IF;
  IF p_booking_date > ((now() AT TIME ZONE 'Europe/Madrid')::date + 14) THEN
    RAISE EXCEPTION 'Solo se pueden hacer reservas como máximo a 14 días vista';
  END IF;

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

  INSERT INTO public.bookings (user_id, court_id, booking_date, start_time, end_time, status, deposit_paid, payment_method, created_by)
  VALUES (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time, 'confirmed', false, 'pay_at_club', COALESCE(auth.uid(), p_user_id))
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;
