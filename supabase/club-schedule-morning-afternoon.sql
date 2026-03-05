-- Horario mañana y tarde por día (club_schedule).
-- Añade morning_open, morning_close, afternoon_open, afternoon_close.
-- Ejecutar en Supabase → SQL Editor.
-- Si ya tienes datos: migra open_time/close_time a tarde y luego elimina columnas viejas.

ALTER TABLE public.club_schedule
  ADD COLUMN IF NOT EXISTS morning_open time,
  ADD COLUMN IF NOT EXISTS morning_close time,
  ADD COLUMN IF NOT EXISTS afternoon_open time,
  ADD COLUMN IF NOT EXISTS afternoon_close time;

-- Migrar horario actual a "tarde" (mantener comportamiento hasta ahora)
UPDATE public.club_schedule
SET
  afternoon_open = open_time,
  afternoon_close = close_time
WHERE open_time IS NOT NULL AND close_time IS NOT NULL;

-- Eliminar columnas antiguas (si existen)
ALTER TABLE public.club_schedule DROP COLUMN IF EXISTS open_time;
ALTER TABLE public.club_schedule DROP COLUMN IF EXISTS close_time;

COMMENT ON COLUMN public.club_schedule.morning_open IS 'Apertura franja mañana';
COMMENT ON COLUMN public.club_schedule.morning_close IS 'Cierre franja mañana';
COMMENT ON COLUMN public.club_schedule.afternoon_open IS 'Apertura franja tarde';
COMMENT ON COLUMN public.club_schedule.afternoon_close IS 'Cierre franja tarde';
