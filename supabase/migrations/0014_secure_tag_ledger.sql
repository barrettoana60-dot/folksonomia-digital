-- ============================================================
-- Cofre de contribuições culturais por tag
--
-- Uma identidade de tag representa o conceito canônico. Cada envio de uma
-- pessoa recebe um registro próprio, cifrado e encadeado, sem expor o contexto
-- privado, vetores visuais ou dados da pessoa contribuinte.
-- ============================================================

-- Corrige a divergência entre a migração inicial do cofre e as colunas usadas
-- pela aplicação v2. As colunas novas ficam nulas para registros históricos.
ALTER TABLE semantic_vault_audit
  ADD COLUMN IF NOT EXISTS payload_hash_wide TEXT,
  ADD COLUMN IF NOT EXISTS cross_hash_wide TEXT,
  ADD COLUMN IF NOT EXISTS genetic_seed TEXT,
  ADD COLUMN IF NOT EXISTS envelope_version TEXT;

-- A primeira versão aceitava somente três tipos de evento. Mantemos os
-- registros anteriores e incluímos gênese, visão e correlação protegida.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.semantic_vault_audit'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.semantic_vault_audit DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

ALTER TABLE semantic_vault_audit
  ADD CONSTRAINT semantic_vault_audit_event_type_check
  CHECK (event_type IN (
    'vault_pulse',
    'vault_export',
    'vault_validation',
    'vault_genesis',
    'vault_visual_analysis',
    'vault_correlation'
  ));

-- Garante a continuidade da corrente mesmo quando duas requisições chegam ao
-- mesmo tempo. O backend faz nova tentativa quando esta guarda detecta disputa.
CREATE OR REPLACE FUNCTION enforce_semantic_vault_audit_chain()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  previous_record RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.vault_id));

  SELECT chain_position, chain_hash
  INTO previous_record
  FROM semantic_vault_audit
  WHERE vault_id = NEW.vault_id
  ORDER BY chain_position DESC
  LIMIT 1;

  IF NOT FOUND THEN
    IF NEW.chain_position <> 1 OR NEW.previous_hash IS NOT NULL THEN
      RAISE EXCEPTION 'cadeia do cofre deve iniciar em posição 1 sem hash anterior';
    END IF;
  ELSIF NEW.chain_position <> previous_record.chain_position + 1
     OR NEW.previous_hash IS DISTINCT FROM previous_record.chain_hash THEN
    RAISE EXCEPTION 'cadeia do cofre não é contínua para vault_id %', NEW.vault_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS semantic_vault_audit_chain_guard ON semantic_vault_audit;
CREATE TRIGGER semantic_vault_audit_chain_guard
  BEFORE INSERT ON semantic_vault_audit
  FOR EACH ROW
  EXECUTE FUNCTION enforce_semantic_vault_audit_chain();

-- O rótulo da tag pode ser público para interoperabilidade. O restante do
-- metadado (pessoa, contexto, inferências e saída do modelo) fica cifrado.
CREATE TABLE IF NOT EXISTS tag_secure_records (
  submission_id UUID PRIMARY KEY REFERENCES tags(id) ON DELETE RESTRICT,
  tag_id TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE RESTRICT,
  obra_id UUID REFERENCES obras(id) ON DELETE SET NULL,
  metadata_digest TEXT NOT NULL CHECK (char_length(metadata_digest) = 64),
  encrypted_metadata TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  envelope_version TEXT NOT NULL DEFAULT 'FSDV1',
  key_version TEXT NOT NULL DEFAULT 'v1',
  public_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_blind_indexes TEXT[] NOT NULL DEFAULT '{}'::text[],
  visual_status TEXT NOT NULL DEFAULT 'not_requested',
  visual_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_secure_records_tag_id
  ON tag_secure_records(tag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_secure_records_obra_id
  ON tag_secure_records(obra_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_secure_records_context_blind_indexes
  ON tag_secure_records USING GIN(context_blind_indexes);

ALTER TABLE tag_secure_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_tag_secure_records_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tag_secure_records é somente para inserção';
END;
$$;

DROP TRIGGER IF EXISTS tag_secure_records_immutable ON tag_secure_records;
CREATE TRIGGER tag_secure_records_immutable
  BEFORE UPDATE OR DELETE ON tag_secure_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tag_secure_records_mutation();

-- Relações oriundas de contexto visual são hipóteses: não expõem os termos que
-- coincidiram, exigem revisão humana e guardam somente o digest da evidência.
CREATE TABLE IF NOT EXISTS tag_context_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_submission_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  target_submission_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  source_tag_id TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE RESTRICT,
  target_tag_id TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE RESTRICT,
  relation_type TEXT NOT NULL DEFAULT 'skos:related',
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  method TEXT NOT NULL,
  evidence_digest TEXT NOT NULL CHECK (char_length(evidence_digest) = 64),
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'validated', 'rejected', 'revoked')),
  requires_human_review BOOLEAN NOT NULL DEFAULT true,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_submission_id < target_submission_id),
  UNIQUE (source_submission_id, target_submission_id, method)
);

CREATE INDEX IF NOT EXISTS idx_tag_context_correlations_source
  ON tag_context_correlations(source_submission_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_context_correlations_target
  ON tag_context_correlations(target_submission_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_context_correlations_review
  ON tag_context_correlations(status, requires_human_review, created_at DESC);

ALTER TABLE tag_context_correlations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tag_secure_records IS
  'Cofre privado por contribuição de tag: envelope AES-256-GCM e manifestos verificáveis.';
COMMENT ON TABLE tag_context_correlations IS
  'Hipóteses de correlação por contexto visual protegido; nunca relações publicadas automaticamente.';
