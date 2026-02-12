-- ============================================================
-- Verificar / arreglar que el monedero se actualice tras Stripe
-- Ejecuta esto en Supabase → SQL Editor si el saldo no aparece.
-- ============================================================

-- 1) Comprobar que la función wallet_recharge existe
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'wallet_recharge';
-- Si no devuelve ninguna fila, la función no existe: ejecuta supabase/schema.sql completo.

-- 2) Recrear wallet_recharge (idempotente por stripe_session_id; created_by con COALESCE)
CREATE OR REPLACE FUNCTION public.wallet_recharge(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_stripe_session_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.transactions WHERE stripe_session_id = p_stripe_session_id) THEN
    RETURN;
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;
  INSERT INTO public.transactions (user_id, type, amount, description, stripe_session_id, created_by)
  VALUES (p_user_id, 'recharge', p_amount, COALESCE(p_description, 'Recarga monedero'), p_stripe_session_id, COALESCE(auth.uid(), p_user_id));
END;
$$;

-- 3) Después de una recarga de prueba, comprueba en Table Editor:
--    - profiles: columna wallet_balance del usuario que recargó
--    - transactions: última fila con type = 'recharge' y el user_id correcto
-- Para listar últimas recargas:
-- SELECT id, user_id, amount, description, stripe_session_id, created_at
-- FROM public.transactions WHERE type = 'recharge' ORDER BY created_at DESC LIMIT 10;
