-- ============================================================
-- Marcar como "completadas" todas las reservas confirmadas
-- desde hoy hasta el 31 de marzo (del año actual o del siguiente
-- si ya pasamos marzo).
-- Ejecutar una vez en SQL Editor de Supabase.
-- ============================================================

-- Fin de marzo: 31 de marzo del año actual; si ya pasamos marzo, 31 de marzo del año siguiente
WITH params AS (
  SELECT
    current_date AS hoy,
    CASE
      WHEN current_date <= (date_trunc('year', current_date) + interval '3 months' - interval '1 day')::date
      THEN (date_trunc('year', current_date) + interval '3 months' - interval '1 day')::date
      ELSE (date_trunc('year', current_date) + interval '1 year' + interval '3 months' - interval '1 day')::date
    END AS fin_marzo
)
UPDATE public.bookings b
SET
  status = 'completed',
  updated_at = timezone('utc', now())
FROM params p
WHERE b.booking_date >= p.hoy
  AND b.booking_date <= p.fin_marzo
  AND b.status = 'confirmed';

-- Opcional: ver cuántas filas se actualizaron (ejecutar antes y después o revisar en Table Editor).
