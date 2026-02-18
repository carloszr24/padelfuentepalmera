-- ============================================================
-- Funcionalidades admin: reservas gratis, ajuste monedero, resto pagado
-- Ejecuta este archivo en el SQL Editor de Supabase (una sola vez).
-- ============================================================

-- 1) Columna "resto pagado en club" en reservas
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS remaining_paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.remaining_paid_at IS 'Cuando el admin marca que el cliente pagó el resto de la pista en el club.';

-- 2) Admin puede restar saldo (ajuste monedero: positivo = recarga, negativo = resta)
CREATE OR REPLACE FUNCTION public.admin_wallet_recharge(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance NUMERIC(10,2);
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;
  IF p_amount = 0 THEN RAISE EXCEPTION 'Amount cannot be zero'; END IF;

  IF p_amount < 0 THEN
    SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF (v_balance + p_amount) < 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente para restar esa cantidad. Saldo actual: %', v_balance;
    END IF;
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  INSERT INTO public.transactions (user_id, type, amount, description, created_by)
  VALUES (
    p_user_id,
    'admin_recharge',
    p_amount,
    COALESCE(p_description, CASE WHEN p_amount > 0 THEN 'Recarga admin' ELSE 'Ajuste admin (resta)' END),
    auth.uid()
  );
END;
$$;

-- 3) Admin crea reserva sin cobrar señal (reserva gratuita)
CREATE OR REPLACE FUNCTION public.admin_create_booking(
  p_user_id UUID,
  p_court_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;

  IF p_booking_date > ((now() AT TIME ZONE 'Europe/Madrid')::date + 14) THEN
    RAISE EXCEPTION 'Solo se pueden hacer reservas como máximo a 14 días vista';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id = p_court_id AND is_active = true) THEN
    RAISE EXCEPTION 'Pista no encontrada o inactiva';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.court_id = p_court_id AND b.booking_date = p_booking_date
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN
    RAISE EXCEPTION 'La pista ya está reservada en ese horario';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_schedules cs
    WHERE cs.court_id = p_court_id AND cs.blocked_date = p_booking_date
      AND (cs.start_time, cs.end_time) OVERLAPS (p_start_time, p_end_time)
  ) THEN
    RAISE EXCEPTION 'Horario bloqueado para esa pista';
  END IF;

  INSERT INTO public.bookings (user_id, court_id, booking_date, start_time, end_time, status, deposit_paid, created_by)
  VALUES (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time, 'confirmed', true, auth.uid())
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- 4) Admin marca "resto pagado en club" en una reserva
CREATE OR REPLACE FUNCTION public.admin_mark_remaining_paid(
  p_booking_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins'; END IF;
  UPDATE public.bookings
  SET remaining_paid_at = timezone('utc', now())
  WHERE id = p_booking_id AND status = 'confirmed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada o no confirmada';
  END IF;
END;
$$;
