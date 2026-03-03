-- Bloques recurrentes semanales: franjas que NUNCA están disponibles para reserva online.
-- day_of_week: 1 = Lunes, 3 = Miércoles, 7 = Domingo (ISO).
-- Ejecutar en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.recurring_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_blocks_court_dow_start
  ON public.recurring_blocks(court_id, day_of_week, start_time);
CREATE INDEX IF NOT EXISTS idx_recurring_blocks_court_dow
  ON public.recurring_blocks(court_id, day_of_week);

COMMENT ON TABLE public.recurring_blocks IS 'Franjas horarias bloqueadas cada semana (ej. actividades del club). No aparecen en disponibilidad.';

-- RLS: solo servicio y admin pueden gestionar; la API de disponibilidad usa service role.
ALTER TABLE public.recurring_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring blocks read by service" ON public.recurring_blocks;
CREATE POLICY "Recurring blocks read by service" ON public.recurring_blocks
  FOR SELECT USING (true);

-- Insertar los dos bloques fijos:
-- Pista 1 — todos los lunes — 19:30 a 21:00
-- Pista 3 — todos los miércoles — 19:30 a 21:00
INSERT INTO public.recurring_blocks (court_id, day_of_week, start_time, end_time)
SELECT c.id, 1, '19:30'::time, '21:00'::time FROM public.courts c WHERE c.name = 'Pista 1'
ON CONFLICT (court_id, day_of_week, start_time) DO NOTHING;

INSERT INTO public.recurring_blocks (court_id, day_of_week, start_time, end_time)
SELECT c.id, 3, '19:30'::time, '21:00'::time FROM public.courts c WHERE c.name = 'Pista 3'
ON CONFLICT (court_id, day_of_week, start_time) DO NOTHING;
