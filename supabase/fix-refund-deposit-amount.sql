-- ============================================================
-- FIX: reembolso debe devolver deposit_amount (lo cobrado),
-- no el depósito base de la pista (4,50 €).
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

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
         b.deposit_amount, c.deposit, c.price
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

  v_deposit := COALESCE(v_booking.deposit_amount, v_booking.deposit, 4.50);
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

CREATE OR REPLACE FUNCTION public.admin_cancel_booking(p_booking_id UUID, p_refund_deposit BOOLEAN DEFAULT true)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.court_id, b.deposit_amount
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
    v_deposit := COALESCE(v_booking.deposit_amount, v_deposit, 4.50);
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_deposit WHERE id = v_booking.user_id;
    INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
    VALUES (v_booking.user_id, 'refund', v_deposit, 'Reembolso por cancelación (admin)', p_booking_id, auth.uid());
  END IF;
END;
$$;
