-- ============================================================
-- Resto de la pista = 3 x señal pagada (la pista cuesta 4 señales).
--   Tarifa normal:         señal 5 €  -> pista 20 € -> resto 15 €
--   Tarifa mañana (L-V):   señal 3 €  -> pista 12 € -> resto  9 €
--   Reservas antiguas:     señal 4,50 -> pista 18 € -> resto 13,50 €
-- Antes el resto se calculaba como courts.price (18) - señal, lo que cobraría de más
-- en las reservas de mañana y de menos con la pista a 20 €.
-- Sustituye a noshow-use-booking-deposit.sql (no volver a ejecutar aquel).
-- Ejecutar en Supabase -> SQL Editor. Solo CREATE OR REPLACE: no toca datos.
-- Las firmas no cambian y se conservan los permisos existentes.
-- ============================================================

-- 1) Cancelación del usuario: >=24h devuelve la señal pagada; <24h cobra el resto.
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
  v_rest NUMERIC(10,2);
  v_start_ts TIMESTAMPTZ;
  v_hours_until_start NUMERIC;
BEGIN
  SELECT b.id, b.user_id, b.status, b.deposit_paid, b.court_id, b.booking_date, b.start_time,
         b.deposit_amount, c.deposit
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

  v_deposit := COALESCE(v_booking.deposit_amount, v_booking.deposit, 5.00);
  v_rest    := v_deposit * 3;

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

-- 2) No-show con penalización: se cobra el resto (3 x señal pagada).
CREATE OR REPLACE FUNCTION public.admin_mark_noshow(p_booking_id UUID, p_charge_penalty BOOLEAN DEFAULT false)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_booking RECORD;
  v_deposit NUMERIC(10,2);
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
    SELECT COALESCE(c.deposit, 5.00), c.name
    INTO v_deposit, v_court_name
    FROM public.courts c WHERE c.id = v_booking.court_id;
    v_deposit := COALESCE(NULLIF(v_booking.deposit_amount, 0), v_deposit);
    v_rest := v_deposit * 3;

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
