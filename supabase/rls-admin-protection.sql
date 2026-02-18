-- ============================================================
-- RLS: protección frente a escalada a admin
-- El usuario NUNCA puede hacerse admin ni realizar acciones de admin.
-- ============================================================

-- RIESGO: La política "Profiles update own" no impedía cambiar la columna role.
-- Un usuario podría hacer: UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
-- y obtener privilegios de administrador. Se corrige exigiendo que role no cambie.

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND wallet_balance IS NOT DISTINCT FROM (SELECT wallet_balance FROM public.profiles WHERE id = auth.uid())
    AND (has_debt IS NOT DISTINCT FROM (SELECT has_debt FROM public.profiles WHERE id = auth.uid()))
    AND (debt_amount IS NOT DISTINCT FROM (SELECT debt_amount FROM public.profiles WHERE id = auth.uid()))
    AND (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

-- Con esto el usuario solo puede actualizar en su fila: full_name, email, phone (y similares).
-- No puede modificar: wallet_balance, has_debt, debt_amount, role.
