-- ============================================================
-- Flujo de membresía de socios (pago online vía Cecabank).
-- Ejecutar en SQL Editor de Supabase.
-- ============================================================

-- 1. Tabla de operaciones de membresía pendientes (análoga a wallet_operations_pending)
CREATE TABLE IF NOT EXISTS public.membership_payments_pending (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_operacion TEXT       NOT NULL UNIQUE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_euros NUMERIC(10,2) NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'completed', 'failed')),
  referencia   TEXT,
  num_aut      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_num_op
  ON public.membership_payments_pending(num_operacion);

CREATE INDEX IF NOT EXISTS idx_membership_payments_user_id
  ON public.membership_payments_pending(user_id);

ALTER TABLE public.membership_payments_pending ENABLE ROW LEVEL SECURITY;
-- Solo service_role accede (APIs internas); usuarios normales no pueden leer ni escribir.


-- 2. RLS en members: los usuarios autenticados pueden leer su propia membresía
--    (necesario para que /api/panel/profile la obtenga y para la página del panel)
DROP POLICY IF EXISTS "Users can read own membership" ON public.members;
CREATE POLICY "Users can read own membership"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- 3. RPC activate_membership: activa o renueva la membresía de un usuario
--    Hace UPSERT en members y actualiza profiles.is_member = true.
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
  INSERT INTO public.members (user_id, start_date, expiry_date, is_paid)
  VALUES (p_user_id, v_start_date, v_expiry_date, true)
  ON CONFLICT (user_id) DO UPDATE
    SET start_date   = v_start_date,
        expiry_date  = v_expiry_date,
        is_paid      = true,
        updated_at   = timezone('utc', now());

  UPDATE public.profiles
    SET is_member = true
  WHERE id = p_user_id;
END;
$$;
