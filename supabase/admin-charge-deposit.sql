-- ============================================================
-- Cobrar señal del monedero sobre una reserva ya existente (admin).
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_charge_booking_deposit_wallet(
  p_booking_id UUID,
  p_deposit    NUMERIC DEFAULT NULL,
  p_admin_id   UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking    RECORD;
  v_balance    NUMERIC(10,2);
  v_deposit    NUMERIC(10,2);
  v_desc       TEXT;
BEGIN
  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.booking_date, b.start_time,
         b.deposit_amount, c.name AS court_name, c.deposit AS court_deposit
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.deposit_paid THEN
    RAISE EXCEPTION 'El depósito ya está pagado';
  END IF;
  IF v_booking.status NOT IN ('confirmed', 'blocked') THEN
    RAISE EXCEPTION 'Estado de reserva no válido';
  END IF;
  IF v_booking.user_id IS NULL THEN
    RAISE EXCEPTION 'La reserva no tiene usuario asociado';
  END IF;

  v_deposit := COALESCE(p_deposit, NULLIF(v_booking.deposit_amount, 0), v_booking.court_deposit, 4.50);

  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_booking.user_id
  FOR UPDATE;

  IF v_balance < v_deposit THEN
    RAISE EXCEPTION 'Saldo insuficiente en el monedero';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_deposit
  WHERE id = v_booking.user_id;

  v_desc := 'Depósito reserva (admin) — ' || COALESCE(trim(v_booking.court_name), 'Pista') || ', ' ||
    to_char(v_booking.booking_date, 'DD') || ' ' || lower(to_char(v_booking.booking_date, 'TMMon')) || ' ' ||
    to_char(v_booking.start_time, 'HH24:MI');

  INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
  VALUES (
    v_booking.user_id,
    'booking_deposit',
    -v_deposit,
    v_desc,
    p_booking_id,
    COALESCE(p_admin_id, auth.uid())
  );

  UPDATE public.bookings
  SET deposit_paid = true,
      deposit_amount = v_deposit,
      payment_method = 'wallet',
      pagado_con_bono = false
  WHERE id = p_booking_id;
END;
$$;
