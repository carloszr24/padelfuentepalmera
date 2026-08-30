-- ============================================================
-- Aviso al club de membresías próximas a caducar (< 5 días).
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

-- 1. Columna de control: cuándo se avisó por última vez de esta caducidad.
--    Se resetea a NULL en cada renovación para que el próximo ciclo pueda avisar de nuevo.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS expiry_alert_sent_at DATE;

-- 2. activate_membership: al renovar, resetear el aviso para el nuevo ciclo.
CREATE OR REPLACE FUNCTION public.activate_membership(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE  := CURRENT_DATE;
  v_expiry_date DATE := CURRENT_DATE + INTERVAL '1 year';
BEGIN
  INSERT INTO public.members (user_id, start_date, expiry_date, is_paid, expiry_alert_sent_at)
  VALUES (p_user_id, v_start_date, v_expiry_date, true, NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET start_date   = v_start_date,
        expiry_date  = v_expiry_date,
        is_paid      = true,
        expiry_alert_sent_at = NULL,
        updated_at   = timezone('utc', now());

  UPDATE public.profiles
    SET is_member = true
  WHERE id = p_user_id;
END;
$$;
