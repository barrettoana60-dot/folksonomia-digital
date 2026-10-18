-- ============================================================
-- Incorporação contínua do acervo legado ao Cofre Semântico Vivo
--
-- Esta migração não cifra dados históricos no banco: a chave AES-256-GCM
-- nunca deve existir em SQL. Depois de aplicada, o worker do aplicativo lê
-- cada tag já existente, cifra seus metadados no servidor e grava a gênese
-- auditável usando a chave do ambiente.
-- ============================================================

-- Uma análise visual é uma evidência independente e imutável. Isso permite
-- que uma tag histórica seja selada imediatamente e receba a análise LLM mais
-- tarde, sem alterar o envelope original da contribuição.
CREATE TABLE IF NOT EXISTS tag_visual_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_key TEXT NOT NULL UNIQUE,
  submission_id UUID NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
  tag_id TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE RESTRICT,
  metadata_digest TEXT NOT NULL CHECK (metadata_digest ~ '^[0-9a-f]{64}$'),
  encrypted_payload TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  envelope_version TEXT NOT NULL DEFAULT 'FSDV1',
  key_version TEXT NOT NULL DEFAULT 'v1',
  provider TEXT NOT NULL,
  model TEXT,
  prompt_hash TEXT NOT NULL CHECK (prompt_hash ~ '^[0-9a-f]{64}$'),
  image_sha256 TEXT NOT NULL CHECK (image_sha256 ~ '^[0-9a-f]{64}$'),
  context_blind_indexes TEXT[] NOT NULL DEFAULT '{}'::text[],
  public_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_visual_analyses_submission
  ON tag_visual_analyses(submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tag_visual_analyses_context_blind_indexes
  ON tag_visual_analyses USING GIN(context_blind_indexes);

ALTER TABLE tag_visual_analyses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_tag_visual_analyses_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tag_visual_analyses é somente para inserção';
END;
$$;

DROP TRIGGER IF EXISTS tag_visual_analyses_immutable ON tag_visual_analyses;
CREATE TRIGGER tag_visual_analyses_immutable
  BEFORE UPDATE OR DELETE ON tag_visual_analyses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tag_visual_analyses_mutation();

-- Uma correlação precisa apontar para o mesmo par (submissão, identidade)
-- registrado no cofre. Isso fecha a possibilidade de cruzar IDs válidos mas
-- semanticamente incompatíveis.
ALTER TABLE tag_secure_records
  ADD CONSTRAINT tag_secure_records_submission_tag_unique
  UNIQUE (submission_id, tag_id);

ALTER TABLE tag_context_correlations
  ADD CONSTRAINT tag_context_correlations_source_secure_record_fk
  FOREIGN KEY (source_submission_id, source_tag_id)
  REFERENCES tag_secure_records(submission_id, tag_id)
  ON DELETE RESTRICT;

ALTER TABLE tag_context_correlations
  ADD CONSTRAINT tag_context_correlations_target_secure_record_fk
  FOREIGN KEY (target_submission_id, target_tag_id)
  REFERENCES tag_secure_records(submission_id, tag_id)
  ON DELETE RESTRICT;

-- Recibo append-only para a criação de uma correlação. O detalhe permanece
-- cifrado; o digest permite conferência independente sem revelar a evidência.
CREATE TABLE IF NOT EXISTS tag_context_correlation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL REFERENCES tag_context_correlations(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'reviewed', 'revoked')),
  actor TEXT NOT NULL,
  snapshot_digest TEXT NOT NULL CHECK (snapshot_digest ~ '^[0-9a-f]{64}$'),
  encrypted_payload TEXT NOT NULL,
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  envelope_version TEXT NOT NULL DEFAULT 'FSDV1',
  public_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (correlation_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_tag_context_correlation_events_correlation
  ON tag_context_correlation_events(correlation_id, created_at DESC);

ALTER TABLE tag_context_correlation_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_tag_context_correlation_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tag_context_correlation_events é somente para inserção';
END;
$$;

DROP TRIGGER IF EXISTS tag_context_correlation_events_immutable ON tag_context_correlation_events;
CREATE TRIGGER tag_context_correlation_events_immutable
  BEFORE UPDATE OR DELETE ON tag_context_correlation_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tag_context_correlation_events_mutation();

COMMENT ON TABLE tag_visual_analyses IS
  'Evidências multimodais cifradas e imutáveis, separadas do envelope de gênese da tag.';
COMMENT ON TABLE tag_context_correlation_events IS
  'Recibos append-only das relações entre contribuições culturais seladas.';
