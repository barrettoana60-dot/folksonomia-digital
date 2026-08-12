-- ============================================================
-- Folksonomia Digital 2.0 — Cache de Correlações Semânticas
-- Migração 0005: Persistência do conhecimento acumulado
-- ============================================================

-- 1. Cache de correlações semânticas (conhecimento acumulado)
CREATE TABLE IF NOT EXISTS semantic_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_normalizada TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'europeana', 'ibram', 'brasiliana'
  external_id TEXT NOT NULL,
  external_title TEXT,
  correlation_score NUMERIC DEFAULT 0.5, -- 0-1
  correlation_reasons JSONB DEFAULT '[]', -- [{type:'keyword', match:'espada'}, ...]
  layer TEXT DEFAULT 'inferred',     -- 'factual', 'inferred', 'validated'
  validated_by TEXT,                  -- curator ID se validado
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tag_normalizada, source, external_id)
);

-- 2. Conexões cruzadas entre fontes
CREATE TABLE IF NOT EXISTS cross_source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_a TEXT NOT NULL,
  external_id_a TEXT NOT NULL,
  title_a TEXT,
  source_b TEXT NOT NULL,
  external_id_b TEXT NOT NULL,
  title_b TEXT,
  connection_type TEXT,              -- 'same_period', 'same_technique', 'same_theme'
  connection_details JSONB DEFAULT '{}',
  confidence NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Histórico de aprendizado por tag
CREATE TABLE IF NOT EXISTS tag_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_normalizada TEXT NOT NULL,
  event_type TEXT NOT NULL,          -- 'created', 'correlated', 'validated', 'enriched', 'merged'
  event_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Famílias de tags (deduplicação + agrupamento semântico)
CREATE TABLE IF NOT EXISTS tag_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_tag TEXT NOT NULL,       -- tag canônica (forma normalizada principal)
  family_name TEXT,                  -- nome da família semântica
  family_type TEXT DEFAULT 'exact',  -- 'exact', 'spelling', 'synonym', 'semantic'
  members JSONB DEFAULT '[]',        -- [{tag, type, distance, confidence}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_corr_tag ON semantic_correlations(tag_normalizada);
CREATE INDEX IF NOT EXISTS idx_corr_source ON semantic_correlations(source);
CREATE INDEX IF NOT EXISTS idx_corr_layer ON semantic_correlations(layer);
CREATE INDEX IF NOT EXISTS idx_learning_tag ON tag_learning_history(tag_normalizada);
CREATE INDEX IF NOT EXISTS idx_learning_type ON tag_learning_history(event_type);
CREATE INDEX IF NOT EXISTS idx_families_canonical ON tag_families(canonical_tag);
CREATE INDEX IF NOT EXISTS idx_cross_source_a ON cross_source_connections(source_a, external_id_a);
CREATE INDEX IF NOT EXISTS idx_cross_source_b ON cross_source_connections(source_b, external_id_b);

-- RLS desativado para protótipo (uso do Service Role)
ALTER TABLE semantic_correlations DISABLE ROW LEVEL SECURITY;
ALTER TABLE cross_source_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_learning_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_families DISABLE ROW LEVEL SECURITY;
