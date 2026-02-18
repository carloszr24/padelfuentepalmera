-- ============================================================
-- RLS: revisión monedero y deuda (profiles + transactions)
-- El usuario solo debe tener SELECT sobre datos de wallet/debt,
-- nunca UPDATE ni DELETE.
-- ============================================================

-- CONTEXTO:
-- - No existen tablas "wallets" ni "debts". El monedero y la deuda
--   están en public.profiles: wallet_balance, has_debt, debt_amount.
-- - El historial de movimientos está en public.transactions.

-- TRANSACTIONS: ya correcto
-- - SELECT: usuario solo sus filas (user_id = auth.uid()), admin todas.
-- - INSERT: WITH CHECK (false) → nadie inserta por RLS; solo vía funciones (wallet_recharge, etc.).
-- - UPDATE/DELETE: sin política para usuario → denegado. Admin tiene FOR ALL.
-- Conclusión: el usuario solo tiene SELECT sobre transactions. OK.

-- PROFILES: ajuste necesario
-- - La política "Profiles update own" permitía al usuario UPDATE de su fila
--   pero solo comprobaba que wallet_balance no cambiara. has_debt y debt_amount
--   no estaban protegidos, por lo que el usuario podría ponerse has_debt = false.
-- Se refuerza la política para que el usuario no pueda modificar
-- wallet_balance, has_debt, debt_amount NI role (no puede hacerse admin).
-- Requiere que existan has_debt y debt_amount (supabase/noshow-and-debt.sql).

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

-- RESUMEN:
-- - profiles: usuario SELECT (su fila) y UPDATE solo de campos no sensibles;
--   no puede cambiar wallet_balance, has_debt, debt_amount ni role.
-- - transactions: usuario solo SELECT (sus filas); sin INSERT/UPDATE/DELETE.
-- - DELETE: en ambas tablas el usuario no tiene política DELETE → denegado.
