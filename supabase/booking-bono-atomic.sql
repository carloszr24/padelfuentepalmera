-- ============================================================
-- Bono de socio en una sola transacción + callback idempotente.
-- Ejecutar en Supabase -> SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.booking_create_with_bono(
  p_user_id UUID,
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_used BOOLEAN;
BEGIN
  IF ((p_booking_date + p_start_time) AT TIME ZONE 'Europe/Madrid') <= now() THEN
    RAISE EXCEPTION 'No se puede reservar en una hora que ya ha pasado';
  END IF;

  IF p_booking_date > ((now() AT TIME ZONE 'Europe/Madrid')::date + 14) THEN
    RAISE EXCEPTION 'Solo se pueden hacer reservas como máximo a 14 días vista';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.court_id = p_court_id
      AND b.booking_date = p_booking_date
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN
    RAISE EXCEPTION 'Court already booked in this slot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_schedules cs
    WHERE cs.court_id = p_court_id
      AND cs.blocked_date = p_booking_date
      AND (cs.start_time, cs.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN
    RAISE EXCEPTION 'Court blocked in this slot';
  END IF;

  SELECT public.usar_bono(p_user_id) INTO v_used;
  IF v_used IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Bono no disponible, elige otro método de pago';
  END IF;

  INSERT INTO public.bookings (
    user_id,
    court_id,
    booking_date,
    start_time,
    end_time,
    status,
    deposit_paid,
    pagado_con_bono,
    created_by
  )
  VALUES (
    p_user_id,
    p_court_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    'confirmed',
    true,
    true,
    COALESCE(p_created_by, auth.uid(), p_user_id)
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_booking_bono(
  p_booking_id UUID,
  p_admin_id UUID DEFAULT NULL,
  p_deposit NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_used BOOLEAN;
BEGIN
  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.pagado_con_bono
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.deposit_paid OR v_booking.pagado_con_bono THEN
    RAISE EXCEPTION 'El depósito ya está pagado';
  END IF;
  IF v_booking.status NOT IN ('confirmed', 'blocked') THEN
    RAISE EXCEPTION 'Estado de reserva no válido';
  END IF;
  IF v_booking.user_id IS NULL THEN
    RAISE EXCEPTION 'La reserva no tiene usuario asociado';
  END IF;

  SELECT public.usar_bono(v_booking.user_id) INTO v_used;
  IF v_used IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Bono no disponible';
  END IF;

  UPDATE public.bookings
  SET deposit_paid = true,
      pagado_con_bono = true,
      deposit_amount = COALESCE(p_deposit, deposit_amount),
      updated_at = timezone('utc', now())
  WHERE id = p_booking_id;
END;
$$;
