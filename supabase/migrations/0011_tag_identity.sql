-- ============================================================
-- Folksonomia Digital — Tag como Identidade Computacional Persistente
--
-- Cada tag possui:
--   tag_id     : identificador único e estável
--   version    : número de versão, incrementado a cada alteração relevante
--   digest     : impressão digital SHA-256 do estado (NÃO é armazenamento)
--   relations  : relações com outras tags e conceitos culturais
--   sources    : fontes externas com origem preservada
--   objects    : obras e objetos vinculados
--   contributions : rede de contribuições relacional
--   provenance : cadeia verificável de eventos
-- ============================================================

-- 1. Identidade principal da tag
CREATE TABLE IF NOT EXISTS tag_identities (
  tag_id            TEXT PRIMARY KEY,         -- ex: "tag_a3f8c2b1..."
  tag               TEXT NOT NULL,            -- label visível ao usuário
  normalized_label  TEXT NOT NULL UNIQUE,     -- label normalizado (sem acentos, lowercase)
  version           INTEGER NOT NULL DEFAULT 1,
  -- Impressão digital do estado atual. NÃO armazena dados — apenas verifica integridade.
  digest            TEXT NOT NULL,            -- formato: "sha256:<hex>"
  eixo              TEXT,                     -- eixo cultural (SABERES, FESTA, MUSICA, etc.)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_identities_normalized ON tag_identities(normalized_label);
CREATE INDEX IF NOT EXISTS idx_tag_identities_eixo ON tag_identities(eixo);
CREATE INDEX IF NOT EXISTS idx_tag_identities_updated ON tag_identities(updated_at DESC);

-- 2. Relações entre tags e conceitos culturais
CREATE TABLE IF NOT EXISTS tag_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE CASCADE,
  target_tag_id   TEXT,                      -- NULL se o alvo for externo
  target_label    TEXT NOT NULL,
  relation_type   TEXT NOT NULL,             -- ex: skos:related, skos:closeMatch, skos:broader
  source          TEXT NOT NULL,             -- origem da relação (ex: "Wikidata", "usuário", "sistema")
  evidence        TEXT,                      -- evidência textual ou URI
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_relations_tag_id ON tag_relations(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_relations_target ON tag_relations(target_tag_id);

-- 3. Fontes externas vinculadas (com origem preservada)
CREATE TABLE IF NOT EXISTS tag_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE CASCADE,
  source_external_id TEXT,                   -- ID na fonte externa (ex: URI Wikidata)
  label           TEXT NOT NULL,             -- nome legível
  url             TEXT,
  source_type     TEXT NOT NULL,             -- wikidata, wikipedia, europeana, brasiliana, etc.
  connector       TEXT NOT NULL,             -- nome do adaptador/conector
  match_score     NUMERIC,                   -- pontuação de correspondência (0–1)
  skos_relation   TEXT,                      -- skos:exactMatch, skos:closeMatch, etc.
  raw_data        JSONB,                     -- dados brutos da fonte (preservação de origem)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_sources_tag_id ON tag_sources(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_sources_type ON tag_sources(source_type);

-- 4. Objetos/obras vinculados à tag
CREATE TABLE IF NOT EXISTS tag_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE CASCADE,
  object_id       UUID REFERENCES obras(id) ON DELETE CASCADE,
  object_type     TEXT NOT NULL DEFAULT 'obra',
  title           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_objects_tag_id ON tag_objects(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_objects_object_id ON tag_objects(object_id);

-- 5. Rede de contribuições — modelo relacional profundo
--    Cada contribuição pode estar relacionada a: tag, objeto, fonte, outra contribuição, versão
CREATE TABLE IF NOT EXISTS tag_contributions (
  contribution_id   TEXT PRIMARY KEY,        -- identificador único da contribuição
  tag_id            TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE CASCADE,
  object_id         UUID REFERENCES obras(id) ON DELETE SET NULL,
  source_id         UUID REFERENCES tag_sources(id) ON DELETE SET NULL,
  previous_contribution_id TEXT REFERENCES tag_contributions(contribution_id) ON DELETE SET NULL,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Tipo da contribuição
  contribution_type TEXT NOT NULL CHECK (
    contribution_type IN ('criacao','relacao','fonte','revisao','validacao','exportacao')
  ),
  content           TEXT,                    -- descrição da contribuição
  -- Cadeia de estado verificável
  previous_state    TEXT,                    -- digest do estado anterior
  current_state     TEXT NOT NULL,           -- digest do estado após esta contribuição
  digest            TEXT NOT NULL,           -- impressão digital desta contribuição
  -- Relações desta contribuição com outras
  relationships     TEXT[],                  -- IDs de outras contribuições relacionadas
  -- Privacidade: hash anônimo do contribuidor
  contributor_hash  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_contributions_tag_id ON tag_contributions(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_contributions_object_id ON tag_contributions(object_id);
CREATE INDEX IF NOT EXISTS idx_tag_contributions_previous ON tag_contributions(previous_contribution_id);
CREATE INDEX IF NOT EXISTS idx_tag_contributions_timestamp ON tag_contributions(timestamp DESC);

-- 6. Cadeia verificável de versões
--    Implementa: estado_anterior → estado_atual → novo_digest
CREATE TABLE IF NOT EXISTS tag_version_chain (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id          TEXT NOT NULL REFERENCES tag_identities(tag_id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  previous_digest TEXT,                      -- NULL apenas na versão 1 (gênese)
  current_digest  TEXT NOT NULL,             -- digest desta versão
  event_type      TEXT NOT NULL CHECK (
    event_type IN ('genesis','update','relation_added','source_added','validation','export')
  ),
  actor           TEXT NOT NULL,             -- agente responsável
  description     TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tag_id, version)
);

CREATE INDEX IF NOT EXISTS idx_tag_version_chain_tag_id ON tag_version_chain(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_version_chain_version ON tag_version_chain(tag_id, version DESC);

-- 7. Acesso controlado (service role apenas)
ALTER TABLE tag_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_relations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tag_version_chain DISABLE ROW LEVEL SECURITY;

-- 8. Função auxiliar: buscar identidade completa da tag por label normalizado
CREATE OR REPLACE FUNCTION get_tag_identity_full(p_normalized_label TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tag_id TEXT;
  v_result JSONB;
BEGIN
  SELECT tag_id INTO v_tag_id
  FROM tag_identities
  WHERE normalized_label = p_normalized_label;

  IF v_tag_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'tag_id',       ti.tag_id,
    'tag',          ti.tag,
    'normalized_label', ti.normalized_label,
    'version',      ti.version,
    'digest',       ti.digest,
    'eixo',         ti.eixo,
    'created_at',   ti.created_at,
    'updated_at',   ti.updated_at,
    'relations',    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'target_tag_id', tr.target_tag_id,
        'target_label',  tr.target_label,
        'relation_type', tr.relation_type,
        'source',        tr.source,
        'evidence',      tr.evidence
      ) ORDER BY tr.created_at)
      FROM tag_relations tr WHERE tr.tag_id = v_tag_id
    ), '[]'),
    'sources',      COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'source_external_id', ts.source_external_id,
        'label',     ts.label,
        'url',       ts.url,
        'source_type', ts.source_type,
        'connector', ts.connector,
        'match_score', ts.match_score,
        'skos_relation', ts.skos_relation
      ) ORDER BY ts.match_score DESC NULLS LAST)
      FROM tag_sources ts WHERE ts.tag_id = v_tag_id
    ), '[]'),
    'contributions_count', (
      SELECT COUNT(*) FROM tag_contributions tc WHERE tc.tag_id = v_tag_id
    ),
    'provenance',   COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'version',       vc.version,
        'event_type',    vc.event_type,
        'actor',         vc.actor,
        'previous_digest', vc.previous_digest,
        'current_digest', vc.current_digest,
        'occurred_at',   vc.occurred_at,
        'description',   vc.description
      ) ORDER BY vc.version)
      FROM tag_version_chain vc WHERE vc.tag_id = v_tag_id
    ), '[]')
  )
  INTO v_result
  FROM tag_identities ti
  WHERE ti.tag_id = v_tag_id;

  RETURN v_result;
END;
$$;
