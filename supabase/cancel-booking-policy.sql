-- ============================================================
-- Política de cancelación: 24h antelación
-- Ejecutar en SQL Editor de Supabase (una sola vez).
-- ============================================================

-- Añadir tipo de transacción para cancelación tardía (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'late_cancellation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'late_cancellation';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Función principal: cancelar reserva (usuario). Lógica 24h.
-- Recibe p_booking_id y p_user_id. Si >= 24h: reembolso señal. Si < 24h: no reembolso y cobro del resto.
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

  -- Fecha/hora de inicio de la reserva en timezone local (Europe/Madrid) como timestamptz
  v_start_ts := (v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Europe/Madrid';
  v_hours_until_start := EXTRACT(EPOCH FROM (v_start_ts - now())) / 3600.0;

  UPDATE public.bookings SET status = 'cancelled', updated_at = timezone('utc', now()) WHERE id = p_booking_id;

  IF v_hours_until_start >= 24 THEN
    -- Más de 24h: devolver señal
    IF v_booking.deposit_paid THEN
      UPDATE public.profiles SET wallet_balance = wallet_balance + v_deposit WHERE id = p_user_id;
      INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
      VALUES (p_user_id, 'refund', v_deposit, 'Reembolso por cancelación de reserva', p_booking_id, auth.uid());
    END IF;
  ELSE
    -- Menos de 24h: no devolver señal y cobrar el resto
    IF v_booking.deposit_paid THEN
      -- Cobrar el resto (v_rest) del monedero
      UPDATE public.profiles
      SET wallet_balance = wallet_balance - v_rest
      WHERE id = p_user_id
        AND wallet_balance >= v_rest;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes saldo suficiente para la penalización por cancelación tardía. Recarga tu monedero.';
      END IF;
      INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
      VALUES (p_user_id, 'late_cancellation', -v_rest, 'Penalización por cancelación tardía (resto de la reserva)', p_booking_id, auth.uid());
    END IF;
  END IF;
END;
$$;

-- Usuario: cancelar solo su reserva (llama a cancel_booking con auth.uid())
CREATE OR REPLACE FUNCTION public.user_cancel_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.cancel_booking(p_booking_id, auth.uid());
END;
$$;

-- Admin: cancelar cualquier reserva, con opción de devolver o no la señal
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
