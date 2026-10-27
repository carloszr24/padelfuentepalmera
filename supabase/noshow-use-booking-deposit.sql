-- ============================================================
-- Penalización por no presentarse: restar la señal REALMENTE pagada
-- (bookings.deposit_amount) y no la señal base de la pista (courts.deposit = 4,50).
-- Con la señal unificada a 5 € desde el 1/11/2026, la versión anterior cobraría 0,50 € de más.
-- Es la misma función de transactions-rich-descriptions.sql con solo ese cambio.
-- Ejecutar en Supabase → SQL Editor. Es idempotente (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_mark_noshow(p_booking_id UUID, p_charge_penalty BOOLEAN DEFAULT false)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
  v_price NUMERIC(10,2);
  v_rest NUMERIC(10,2);
  v_start_ts TIMESTAMPTZ;
  v_balance NUMERIC(10,2);
  v_paid_from_wallet NUMERIC(10,2);
  v_remaining_debt NUMERIC(10,2);
  v_court_name TEXT;
  v_desc TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.deposit_amount, b.court_id, b.booking_date, b.start_time
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'Solo se puede marcar no-show en reservas confirmadas';
  END IF;

  v_start_ts := (v_booking.booking_date + v_booking.start_time) AT TIME ZONE 'Europe/Madrid';
  IF v_start_ts > now() THEN
    RAISE EXCEPTION 'La hora de la reserva aún no ha pasado';
  END IF;

  UPDATE public.bookings SET status = 'no_show', updated_at = timezone('utc', now()) WHERE id = p_booking_id;

  IF p_charge_penalty AND v_booking.deposit_paid THEN
    SELECT COALESCE(c.deposit, 4.50), COALESCE(c.price, 18.00), c.name
    INTO v_deposit, v_price, v_court_name
    FROM public.courts c WHERE c.id = v_booking.court_id;
    -- Señal realmente pagada en la reserva; la de la pista solo como último recurso.
    v_deposit := COALESCE(NULLIF(v_booking.deposit_amount, 0), v_deposit);
    v_rest := v_price - v_deposit;

    v_desc := 'Penalización no-show — ' || COALESCE(trim(v_court_name), 'Pista') || ', ' ||
      to_char(v_booking.booking_date, 'DD') || ' ' || lower(to_char(v_booking.booking_date, 'TMMon')) || ' ' ||
      to_char(v_booking.start_time, 'HH24:MI');

    SELECT wallet_balance, debt_amount INTO v_balance, v_remaining_debt
    FROM public.profiles WHERE id = v_booking.user_id FOR UPDATE;
    v_remaining_debt := COALESCE(v_remaining_debt, 0);
    v_balance := COALESCE(v_balance, 0);

    v_paid_from_wallet := LEAST(v_balance, v_rest);
    v_remaining_debt := v_rest - v_paid_from_wallet;

    UPDATE public.profiles
    SET
      wallet_balance = wallet_balance - v_paid_from_wallet,
      debt_amount = debt_amount + v_remaining_debt,
      has_debt = (debt_amount + v_remaining_debt > 0)
    WHERE id = v_booking.user_id;

    INSERT INTO public.transactions (user_id, type, amount, description, booking_id, created_by)
    VALUES (v_booking.user_id, 'no_show_penalty', -v_rest, v_desc, p_booking_id, auth.uid());
  END IF;
END;
$$;
