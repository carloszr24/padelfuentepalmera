-- Excepciones a bloqueos recurrentes: liberar la franja solo en una fecha concreta.
-- El bloqueo permanente sigue activo el resto de semanas.
-- Ejecutar en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.recurring_block_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_block_id UUID NOT NULL REFERENCES public.recurring_blocks(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_block_exceptions_block_date
  ON public.recurring_block_exceptions(recurring_block_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_recurring_block_exceptions_date
  ON public.recurring_block_exceptions(exception_date);

COMMENT ON TABLE public.recurring_block_exceptions IS
  'Fechas en las que un bloqueo recurrente no aplica (pista disponible solo ese día).';

ALTER TABLE public.recurring_block_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring block exceptions read all" ON public.recurring_block_exceptions;
CREATE POLICY "Recurring block exceptions read all" ON public.recurring_block_exceptions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Recurring block exceptions admin write" ON public.recurring_block_exceptions;
CREATE POLICY "Recurring block exceptions admin write" ON public.recurring_block_exceptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
