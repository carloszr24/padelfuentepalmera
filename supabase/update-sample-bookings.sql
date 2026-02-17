-- ============================================================
-- Actualizar reservas de ejemplo con horarios variados (1h30)
-- Mañana 9-14, Tarde 16-20, Noche 20-22. Ejecutar una vez en SQL Editor.
-- ============================================================

-- Slots de 1h30: mañana, tarde y noche (variados)
WITH slots AS (
  SELECT 1 AS n, '09:00'::time AS start_t, '10:30'::time AS end_t
  UNION ALL SELECT 2, '10:00'::time, '11:30'::time
  UNION ALL SELECT 3, '11:30'::time, '13:00'::time
  UNION ALL SELECT 4, '12:00'::time, '13:30'::time
  UNION ALL SELECT 5, '16:30'::time, '18:00'::time
  UNION ALL SELECT 6, '18:00'::time, '19:30'::time
  UNION ALL SELECT 7, '19:30'::time, '21:00'::time
  UNION ALL SELECT 8, '21:00'::time, '22:30'::time
),
numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.bookings
)
UPDATE public.bookings b
SET
  start_time = s.start_t,
  end_time = s.end_t,
  updated_at = timezone('utc', now())
FROM numbered n, slots s
WHERE b.id = n.id
  AND s.n = ((n.rn - 1) % 8) + 1;
