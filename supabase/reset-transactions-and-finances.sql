-- ============================================================
-- Reset: transacciones y finanzas a 0 + estadísticas de reservas a 0.
-- NO borra reservas ni horarios bloqueados; las reservas ya hechas
-- dejan de contar en las estadísticas; las nuevas sí contarán.
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 1. Borrar todas las transacciones
DELETE FROM public.transactions;

-- 2. Poner saldo y deuda de todos los perfiles a 0
UPDATE public.profiles
SET
  wallet_balance = 0,
  has_debt       = false,
  debt_amount    = 0;

-- 3. Excluir todas las reservas actuales de las estadísticas
--    (las nuevas reservas sí contarán; columna por defecto true)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS included_in_stats BOOLEAN NOT NULL DEFAULT true;

UPDATE public.bookings SET included_in_stats = false;

-- 4. Actualizar la función de estadísticas para solo contar reservas con included_in_stats = true
CREATE OR REPLACE FUNCTION public.get_booking_stats(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_by_hour jsonb;
  v_by_dow jsonb;
  v_by_court jsonb;
  v_by_date jsonb;
  v_by_status jsonb;
  v_noshows bigint;
  v_total_noshow_denom bigint;
  v_result jsonb;
BEGIN
  -- (a) Horas más concurridas
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('hour', row.hour, 'total', row.total) ORDER BY row.total DESC)
     FROM (
       SELECT EXTRACT(HOUR FROM b.start_time)::int AS hour, COUNT(*)::bigint AS total
       FROM bookings b
       WHERE b.included_in_stats = true
         AND b.status IN ('confirmed', 'completed', 'blocked')
         AND (p_start IS NULL OR b.created_at >= p_start)
         AND (p_end IS NULL OR b.created_at <= p_end)
       GROUP BY EXTRACT(HOUR FROM b.start_time)
     ) row),
    '[]'::jsonb
  ) INTO v_by_hour;

  -- (b) Días de la semana
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('day_of_week', row.day_of_week, 'total', row.total) ORDER BY row.total DESC)
     FROM (
       SELECT EXTRACT(DOW FROM b.booking_date)::int AS day_of_week, COUNT(*)::bigint AS total
       FROM bookings b
       WHERE b.included_in_stats = true
         AND b.status IN ('confirmed', 'completed', 'blocked')
         AND (p_start IS NULL OR b.created_at >= p_start)
         AND (p_end IS NULL OR b.created_at <= p_end)
       GROUP BY EXTRACT(DOW FROM b.booking_date)
     ) row),
    '[]'::jsonb
  ) INTO v_by_dow;

  -- (c) Pistas más reservadas
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('name', row.name, 'total', row.total) ORDER BY row.total DESC)
     FROM (
       SELECT c.name, COUNT(*)::bigint AS total
       FROM bookings b
       JOIN courts c ON c.id = b.court_id
       WHERE b.included_in_stats = true
         AND b.status IN ('confirmed', 'completed', 'blocked')
         AND (p_start IS NULL OR b.created_at >= p_start)
         AND (p_end IS NULL OR b.created_at <= p_end)
       GROUP BY c.name
     ) row),
    '[]'::jsonb
  ) INTO v_by_court;

  -- (d) Evolución por día
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('booking_date', row.booking_date, 'total', row.total) ORDER BY row.booking_date)
     FROM (
       SELECT b.booking_date::text AS booking_date, COUNT(*)::bigint AS total
       FROM bookings b
       WHERE b.included_in_stats = true
         AND b.status IN ('confirmed', 'completed', 'blocked')
         AND (p_start IS NULL OR b.created_at >= p_start)
         AND (p_end IS NULL OR b.created_at <= p_end)
       GROUP BY b.booking_date
     ) row),
    '[]'::jsonb
  ) INTO v_by_date;

  -- (e) Por estado
  SELECT COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('status', row.status, 'total', row.total))
     FROM (
       SELECT b.status::text AS status, COUNT(*)::bigint AS total
       FROM bookings b
       WHERE b.included_in_stats = true
         AND (p_start IS NULL OR b.created_at >= p_start)
         AND (p_end IS NULL OR b.created_at <= p_end)
       GROUP BY b.status
     ) row),
    '[]'::jsonb
  ) INTO v_by_status;

  -- (f) Tasa no-show
  SELECT
    COUNT(*) FILTER (WHERE b.status = 'no_show'),
    COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed', 'no_show', 'cancelled', 'blocked'))
  INTO v_noshows, v_total_noshow_denom
  FROM bookings b
  WHERE b.included_in_stats = true
    AND (p_start IS NULL OR b.created_at >= p_start)
    AND (p_end IS NULL OR b.created_at <= p_end);

  v_result := jsonb_build_object(
    'by_hour', v_by_hour,
    'by_dow', v_by_dow,
    'by_court', v_by_court,
    'by_date', v_by_date,
    'by_status', v_by_status,
    'noshows', COALESCE(v_noshows, 0),
    'total_for_noshow_rate', COALESCE(v_total_noshow_denom, 0)
  );

  RETURN v_result;
END;
$$;
