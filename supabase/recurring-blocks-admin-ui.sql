-- Bloques permanentes de pistas (recurrentes cada semana).
-- day_of_week: 1=Lunes, 7=Domingo. Las franjas bloqueadas no aparecen en disponibilidad.
-- Ejecutar en Supabase → SQL Editor (si ya existe la tabla con end_time, elimínala o altera antes).

CREATE TABLE IF NOT EXISTS public.recurring_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_blocks_court_dow_start
  ON public.recurring_blocks(court_id, day_of_week, start_time);

ALTER TABLE public.recurring_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring blocks read all" ON public.recurring_blocks;
CREATE POLICY "Recurring blocks read all" ON public.recurring_blocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Recurring blocks admin write" ON public.recurring_blocks;
CREATE POLICY "Recurring blocks admin write" ON public.recurring_blocks FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
