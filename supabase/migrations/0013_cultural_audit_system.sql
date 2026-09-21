-- ============================================================
-- Sistema de Auditoria — Interoperabilidade Cultural
-- Migração 0013: Trilha de Proveniência Criptográfica e Imutabilidade
-- ============================================================

-- 1. Tabela Principal de Event Sourcing (audit_events)
CREATE TABLE IF NOT EXISTS audit_events (
  sequence_number       BIGSERIAL,
  event_id              TEXT PRIMARY KEY,
  entity_id             TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  event_type            TEXT NOT NULL,
  actor_id              TEXT NOT NULL,
  actor_role            TEXT NOT NULL CHECK (actor_role IN ('ADMIN', 'REVIEWER', 'VALIDATOR', 'RESEARCHER', 'USER', 'SYSTEM')),
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_version      INTEGER NOT NULL DEFAULT 0,
  new_version           INTEGER NOT NULL DEFAULT 1,
  previous_digest       TEXT,
  new_digest            TEXT NOT NULL,
  payload_digest        TEXT NOT NULL,
  previous_event_digest TEXT,
  event_digest          TEXT NOT NULL UNIQUE,
  source                TEXT NOT NULL DEFAULT 'sistema',
  reason                TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events (entity_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_chain ON audit_events (previous_event_digest, event_digest);

-- 2. Tabela de Snapshots de Estado (audit_snapshots)
CREATE TABLE IF NOT EXISTS audit_snapshots (
  snapshot_id           TEXT PRIMARY KEY,
  entity_id             TEXT NOT NULL,
  entity_type           TEXT NOT NULL,
  version               INTEGER NOT NULL,
  state_snapshot        JSONB NOT NULL,
  state_digest          TEXT NOT NULL,
  last_event_id         TEXT NOT NULL REFERENCES audit_events(event_id),
  last_event_digest     TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, version)
);

CREATE INDEX IF NOT EXISTS idx_audit_snapshots_entity ON audit_snapshots (entity_id, version DESC);

-- 3. Tabela de Relações Auditadas (audit_relations)
CREATE TABLE IF NOT EXISTS audit_relations (
  relation_id           TEXT PRIMARY KEY,
  source_entity         TEXT NOT NULL,
  target_entity         TEXT NOT NULL,
  relation_type         TEXT NOT NULL,
  created_by            TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('RAW', 'SUGGESTED', 'UNDER_REVIEW', 'VALIDATED', 'REVISED', 'PUBLISHED', 'REVOKED', 'ARCHIVED', 'suggested', 'validated', 'revoked')),
  confidence            NUMERIC NOT NULL DEFAULT 1.0,
  source                TEXT NOT NULL,
  digest                TEXT NOT NULL,
  evidence              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_relations_source ON audit_relations (source_entity);
CREATE INDEX IF NOT EXISTS idx_audit_relations_target ON audit_relations (target_entity);
CREATE INDEX IF NOT EXISTS idx_audit_relations_status ON audit_relations (status);

-- 4. Tabela de Fontes Externas com Proveniência Preservada (audit_external_sources)
CREATE TABLE IF NOT EXISTS audit_external_sources (
  id                    TEXT PRIMARY KEY,
  source                TEXT NOT NULL,
  source_id             TEXT,
  external_id           TEXT,
  external_uri          TEXT,
  retrieved_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  adapter_version       TEXT NOT NULL DEFAULT '1.0.0',
  response_digest       TEXT NOT NULL,
  matching_method       TEXT NOT NULL,
  confidence            NUMERIC NOT NULL DEFAULT 1.0,
  raw_metadata          JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_external_sources_src ON audit_external_sources (source);
CREATE INDEX IF NOT EXISTS idx_audit_external_sources_ext ON audit_external_sources (external_id);

-- 5. Tabela de Logs de Segurança Operacional Segregados (security_logs)
CREATE TABLE IF NOT EXISTS security_logs (
  log_id                TEXT PRIMARY KEY,
  event_type            TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'permission_change', 'role_change', 'export', 'api_access', 'key_rotation', 'authentication_failure')),
  actor_id              TEXT NOT NULL,
  actor_role            TEXT NOT NULL,
  ip_address            TEXT,
  user_agent            TEXT,
  details               JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_digest            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_actor ON security_logs (actor_id);

-- 6. Tabela de Pacotes de Exportação Auditados (audit_exports)
CREATE TABLE IF NOT EXISTS audit_exports (
  export_id             TEXT PRIMARY KEY,
  actor_id              TEXT NOT NULL,
  actor_role            TEXT NOT NULL,
  format                TEXT NOT NULL DEFAULT 'JSON-LD',
  record_count          INTEGER NOT NULL,
  dataset_digest        TEXT NOT NULL,
  filter_criteria       JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_exports_timestamp ON audit_exports (timestamp DESC);

-- 7. Triggers de Imutabilidade Estrita (No Physical Deletes or Updates)
CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events é estritamente imutável (append-only). Modificações e exclusões físicas são proibidas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events;
CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_events_mutation();

CREATE OR REPLACE FUNCTION prevent_audit_snapshots_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_snapshots é imutável. Modificações e exclusões físicas são proibidas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_snapshots_immutable ON audit_snapshots;
CREATE TRIGGER trg_audit_snapshots_immutable
  BEFORE UPDATE OR DELETE ON audit_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_snapshots_mutation();

CREATE OR REPLACE FUNCTION prevent_security_logs_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'security_logs é imutável. Modificações e exclusões físicas são proibidas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_security_logs_immutable ON security_logs;
CREATE TRIGGER trg_security_logs_immutable
  BEFORE UPDATE OR DELETE ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_security_logs_mutation();
