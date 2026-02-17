-- ============================================================
-- Horarios del club: semanal + excepciones por fecha
-- Ejecutar en SQL Editor de Supabase (una vez).
-- ============================================================

-- Horario semanal por defecto (day_of_week 1 = Lunes … 7 = Domingo)
CREATE TABLE IF NOT EXISTS public.club_schedule (
  day_of_week smallint PRIMARY KEY CHECK (day_of_week >= 1 AND day_of_week <= 7),
  is_open boolean NOT NULL DEFAULT true,
  open_time time,
  close_time time,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- RLS: solo servicio/admin; lectura pública para comprobar si está abierto
ALTER TABLE public.club_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club schedule read all" ON public.club_schedule;
CREATE POLICY "Club schedule read all" ON public.club_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Club schedule admin write" ON public.club_schedule;
CREATE POLICY "Club schedule admin write" ON public.club_schedule FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Excepciones por fecha (o rango: end_date opcional)
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_date date NOT NULL,
  end_date date,
  is_open boolean NOT NULL DEFAULT false,
  open_time time,
  close_time time,
  label text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT end_date_after_date CHECK (end_date IS NULL OR end_date >= exception_date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON public.schedule_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_end_date ON public.schedule_exceptions(end_date);

ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedule exceptions read all" ON public.schedule_exceptions;
CREATE POLICY "Schedule exceptions read all" ON public.schedule_exceptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Schedule exceptions admin write" ON public.schedule_exceptions;
CREATE POLICY "Schedule exceptions admin write" ON public.schedule_exceptions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_schedule_exceptions_updated_at ON public.schedule_exceptions;
CREATE TRIGGER set_schedule_exceptions_updated_at
  BEFORE UPDATE ON public.schedule_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Valores por defecto si no hay filas: L-V 09:00-22:00, S-D 10:00-21:00
INSERT INTO public.club_schedule (day_of_week, is_open, open_time, close_time)
VALUES
  (1, true, '09:00', '22:00'),
  (2, true, '09:00', '22:00'),
  (3, true, '09:00', '22:00'),
  (4, true, '09:00', '22:00'),
  (5, true, '09:00', '22:00'),
  (6, true, '10:00', '21:00'),
  (7, true, '10:00', '21:00')
ON CONFLICT (day_of_week) DO NOTHING;
