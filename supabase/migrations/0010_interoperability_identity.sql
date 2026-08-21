-- Stable identities and an auditable relation ledger for the cultural graph.
-- dna_code is an opaque HMAC only when INTEROP_DNA_KEY is configured.

CREATE TABLE IF NOT EXISTS interoperability_tag_identities (
  tag_key TEXT PRIMARY KEY,
  dna_code TEXT NOT NULL UNIQUE,
  canonical_label TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]',
  provenance JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interoperability_relation_ledger (
  relation_key TEXT PRIMARY KEY,
  source_dna TEXT NOT NULL REFERENCES interoperability_tag_identities(dna_code) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  layer TEXT NOT NULL CHECK (layer IN ('factual', 'inferred', 'validated')),
  mechanism TEXT NOT NULL,
  explanation TEXT NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interop_identity_dna ON interoperability_tag_identities(dna_code);
CREATE INDEX IF NOT EXISTS idx_interop_ledger_source ON interoperability_relation_ledger(source_dna);
CREATE INDEX IF NOT EXISTS idx_interop_ledger_target ON interoperability_relation_ledger(target_id);
CREATE INDEX IF NOT EXISTS idx_interop_ledger_confidence ON interoperability_relation_ledger(confidence DESC);
