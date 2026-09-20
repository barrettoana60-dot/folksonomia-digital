-- ============================================================
-- Cofre Semântico Vivo: trilha de auditoria imutável e encadeada
--
-- A carga completa é cifrada no servidor com AES-256-GCM. Esta tabela mantém
-- os hashes públicos necessários para uma auditoria independente, sem guardar
-- chaves criptográficas ou dados de autenticação.
-- ============================================================

CREATE TABLE IF NOT EXISTS semantic_vault_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('vault_pulse', 'vault_export', 'vault_validation')),
  chain_position INTEGER NOT NULL CHECK (chain_position > 0),
  previous_hash TEXT,
  chain_hash TEXT NOT NULL UNIQUE CHECK (char_length(chain_hash) = 64),
  payload_hash TEXT NOT NULL CHECK (char_length(payload_hash) = 64),
  cross_hash TEXT NOT NULL CHECK (char_length(cross_hash) = 64),
  genetic_code TEXT NOT NULL,
  public_manifest JSONB NOT NULL,
  encrypted_payload TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  compression TEXT NOT NULL DEFAULT 'gzip',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vault_id, chain_position)
);

CREATE INDEX IF NOT EXISTS idx_semantic_vault_audit_vault_created
  ON semantic_vault_audit (vault_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_vault_audit_cross_hash
  ON semantic_vault_audit (cross_hash);

-- O acesso é exclusivo do backend com service role. Não criar política pública.
ALTER TABLE semantic_vault_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_semantic_vault_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'semantic_vault_audit é somente para inserção';
END;
$$;

DROP TRIGGER IF EXISTS semantic_vault_audit_immutable ON semantic_vault_audit;
CREATE TRIGGER semantic_vault_audit_immutable
  BEFORE UPDATE OR DELETE ON semantic_vault_audit
  FOR EACH ROW
  EXECUTE FUNCTION prevent_semantic_vault_audit_mutation();
