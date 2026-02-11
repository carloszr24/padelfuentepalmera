-- ============================================================
-- COPIAR TODO ESTE BLOQUE Y PEGARLO EN EL SQL EDITOR DE SUPABASE
-- Dashboard → Tu proyecto → SQL Editor → New query → Pegar → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_cancel_booking(p_booking_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
BEGIN
  SELECT id, user_id, status, deposit_paid, court_id, booking_date, start_time
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes cancelar esta reserva';
  END IF;
  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar reservas confirmadas';
  END IF;
  -- Solo se puede cancelar con al menos 1 hora de antelación al inicio de la reserva
  IF ((v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Europe/Madrid') < (now() + interval '1 hour') THEN
    RAISE EXCEPTION 'Solo se puede cancelar con al menos 1 hora de antelación al inicio de la reserva';
  END IF;
  IF NOT v_booking.deposit_paid THEN
    UPDATE public.bookings SET status = 'cancelled', updated_at = timezone('utc', now()) WHERE id = p_booking_id;
    RETURN;
  END IF;

  SELECT c.deposit INTO v_deposit FROM public.courts c WHERE c.id = v_booking.court_id;
  v_deposit := COALESCE(v_deposit, 4.50);

  UPDATE public.bookings SET status = 'cancelled', updated_at = timezone('utc', now()) WHERE id = p_booking_id;
  UPDATE public.profiles SET wallet_balance = wallet_balance + v_deposit WHERE id = v_booking.user_id;
  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (v_booking.user_id, 'refund', v_deposit, 'Reembolso por cancelación de reserva', p_booking_id, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_cancel_booking(UUID) TO authenticated;
