-- ============================================================
-- Opción "Pagar en el club": reserva sin señal del monedero.
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

-- 1. Columna payment_method en bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'wallet'
  CHECK (payment_method IN ('wallet', 'pay_at_club'));

-- 2. RPC booking_reserve_free: reserva sin descontar del monedero
--    El socio paga los 18 € completos en el club al llegar.
CREATE OR REPLACE FUNCTION public.booking_reserve_free(
  p_user_id   UUID,
  p_court_id  UUID,
  p_booking_date DATE,
  p_start_time   TIME,
  p_end_time     TIME
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking_id UUID;
  v_court_name TEXT;
BEGIN
  SELECT name INTO v_court_name
    FROM public.courts
   WHERE id = p_court_id AND is_active = true;
  IF v_court_name IS NULL THEN
    RAISE EXCEPTION 'Court not found or inactive';
  END IF;

  -- Bloquear si tiene deuda
  IF COALESCE((SELECT has_debt FROM public.profiles WHERE id = p_user_id), false) THEN
    RAISE EXCEPTION 'No puedes reservar con una deuda pendiente';
  END IF;

  -- Verificar disponibilidad (sin solapamientos)
  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE court_id    = p_court_id
       AND booking_date = p_booking_date
       AND status NOT IN ('cancelled')
       AND start_time   < p_end_time
       AND end_time     > p_start_time
  ) THEN
    RAISE EXCEPTION 'Ese horario ya está reservado';
  END IF;

  INSERT INTO public.bookings
    (user_id, court_id, booking_date, start_time, end_time,
     status, deposit_paid, payment_method, created_by)
  VALUES
    (p_user_id, p_court_id, p_booking_date, p_start_time, p_end_time,
     'confirmed', false, 'pay_at_club', COALESCE(auth.uid(), p_user_id))
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;


-- 3. Actualizar activate_membership para registrar el pago de cuota
--    como transacción informativa (no afecta al saldo del monedero).
CREATE OR REPLACE FUNCTION public.activate_membership(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date  DATE := CURRENT_DATE;
  v_expiry_date DATE := CURRENT_DATE + INTERVAL '1 year';
BEGIN
  INSERT INTO public.members (user_id, start_date, expiry_date, is_paid)
  VALUES (p_user_id, v_start_date, v_expiry_date, true)
  ON CONFLICT (user_id) DO UPDATE
    SET start_date   = v_start_date,
        expiry_date  = v_expiry_date,
        is_paid      = true,
        updated_at   = timezone('utc', now());

  UPDATE public.profiles
    SET is_member = true
  WHERE id = p_user_id;

  -- Registro informativo: cuota de socio (no modifica wallet_balance)
  INSERT INTO public.transactions (user_id, type, amount, description, created_by)
  VALUES (p_user_id, 'membership_fee', -15, 'Cuota de socio anual', p_user_id);
END;
$$;
