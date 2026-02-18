-- ============================================================
-- Tabla members: socios del club (membresías).
-- Un usuario (profiles) puede tener como mucho una membresía (user_id UNIQUE).
-- Estado Activo/Caducado se calcula en app: hoy < expiry_date → Activo.
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON public.members(expiry_date);

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS: solo acceso vía service role (APIs admin). No políticas para authenticated.
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Sin políticas para authenticated: los usuarios normales no pueden leer ni modificar.
-- Las APIs de admin usan createSupabaseServiceClient() (service role), que bypassa RLS.

COMMENT ON TABLE public.members IS 'Membresías de socios. Gestionado solo por admin.';
