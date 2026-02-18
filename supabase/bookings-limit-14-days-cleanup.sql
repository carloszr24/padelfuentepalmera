-- Limpieza one-off: reservas con fecha más allá de 14 días desde hoy (Madrid).
-- Ejecutar en SQL Editor de Supabase cuando quieras reagrupar/limpiar reservas
-- para que solo existan en la ventana [hoy, hoy+14].

-- Fecha máxima permitida (hoy + 14 en Europe/Madrid)
DO $$
DECLARE
  max_date date := (now() AT TIME ZONE 'Europe/Madrid')::date + 14;
  deleted_count int;
BEGIN
  WITH deleted AS (
    DELETE FROM public.bookings
    WHERE booking_date > max_date
    RETURNING id
  )
  SELECT count(*)::int INTO deleted_count FROM deleted;
  RAISE NOTICE 'Eliminadas % reservas con booking_date > %', deleted_count, max_date;
END;
$$;
