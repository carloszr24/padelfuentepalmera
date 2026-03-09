-- Tabla para que el webhook Cecabank sepa user_id y amount por Num_operacion (según manual).
-- Ejecutar en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS wallet_operations_pending (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  num_operacion   TEXT        NOT NULL UNIQUE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_euros    NUMERIC(10, 2) NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'failed')),
  referencia      TEXT,
  num_aut         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_ops_num_operacion
  ON wallet_operations_pending (num_operacion);

CREATE INDEX IF NOT EXISTS idx_wallet_ops_user_id
  ON wallet_operations_pending (user_id);

ALTER TABLE wallet_operations_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Denegar acceso público" ON wallet_operations_pending;
CREATE POLICY "Denegar acceso público"
  ON wallet_operations_pending
  FOR ALL
  USING (false);
