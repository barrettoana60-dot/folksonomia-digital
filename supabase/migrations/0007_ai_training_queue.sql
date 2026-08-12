-- ============================================================
-- Folksonomia Digital 2.0 — Pipeline de IA Pura e Auto-Treinamento
-- Migração 0007: Fila de treinamento ML + Correlações Semânticas
-- ============================================================

-- ============================================================
-- 1. Fila de Treinamento Autônomo (ml_training_queue)
--    Tags com certeza < 95% são enfileiradas para ciclo noturno
-- ============================================================
CREATE TABLE IF NOT EXISTS ml_training_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag            TEXT NOT NULL,
  certeza_atual  NUMERIC DEFAULT 0,             -- certeza calculada atual (0-100)
  ultimo_pensamento TEXT,                        -- síntese da última análise
  status         TEXT DEFAULT 'pending',         -- 'pending' | 'learning' | 'resolved'
  tentativas     INTEGER DEFAULT 0,              -- quantas vezes o cron tentou
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tag, status)                            -- evita duplicatas por tag+status
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_mtq_status     ON ml_training_queue(status);
CREATE INDEX IF NOT EXISTS idx_mtq_certeza    ON ml_training_queue(certeza_atual);
CREATE INDEX IF NOT EXISTS idx_mtq_created    ON ml_training_queue(created_at);

-- Desabilitar RLS (protótipo usa service role)
ALTER TABLE ml_training_queue DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. Correlações Semânticas Aprendidas (semantic_correlations)
--    O sistema persiste o que aprende de cada fonte externa
-- ============================================================
CREATE TABLE IF NOT EXISTS semantic_correlations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_normalizada   TEXT NOT NULL,
  source            TEXT NOT NULL,               -- 'IBRAM', 'Brasiliana Museus', etc.
  external_id       TEXT NOT NULL,
  external_title    TEXT,
  correlation_score NUMERIC DEFAULT 0,           -- similaridade cosseno (0-1)
  correlation_reasons JSONB DEFAULT '[]',        -- razões textuais do match
  layer             TEXT,                        -- camada semântica (1-5)
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tag_normalizada, source, external_id)   -- upsert seguro
);

CREATE INDEX IF NOT EXISTS idx_sc_tag    ON semantic_correlations(tag_normalizada);
CREATE INDEX IF NOT EXISTS idx_sc_source ON semantic_correlations(source);
CREATE INDEX IF NOT EXISTS idx_sc_score  ON semantic_correlations(correlation_score DESC);

ALTER TABLE semantic_correlations DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. Conexões Cruzadas Entre Fontes (cross_source_connections)
--    Registra quando um item de uma fonte coincide com outra
-- ============================================================
CREATE TABLE IF NOT EXISTS cross_source_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_a         TEXT NOT NULL,
  external_id_a    TEXT NOT NULL,
  title_a          TEXT,
  source_b         TEXT NOT NULL,
  external_id_b    TEXT NOT NULL,
  title_b          TEXT,
  connection_type  TEXT NOT NULL,                -- 'shared_material', 'shared_technique', etc.
  connection_details JSONB DEFAULT '{}',         -- { sharedAttributes, description }
  confidence       NUMERIC DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csc_source_a ON cross_source_connections(source_a);
CREATE INDEX IF NOT EXISTS idx_csc_source_b ON cross_source_connections(source_b);
CREATE INDEX IF NOT EXISTS idx_csc_type     ON cross_source_connections(connection_type);

ALTER TABLE cross_source_connections DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. Histórico de Aprendizado por Tag (tag_learning_history)
--    Log completo de todos os ciclos de treinamento e correlação
-- ============================================================
CREATE TABLE IF NOT EXISTS tag_learning_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_normalizada TEXT NOT NULL,
  event_type      TEXT NOT NULL,                 -- 'correlated' | 'auto_training_success' | 'auto_training_partial'
  event_details   JSONB DEFAULT '{}',            -- certeza, vetores, evidencias, timestamp...
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlh_tag    ON tag_learning_history(tag_normalizada);
CREATE INDEX IF NOT EXISTS idx_tlh_type   ON tag_learning_history(event_type);
CREATE INDEX IF NOT EXISTS idx_tlh_created ON tag_learning_history(created_at DESC);

ALTER TABLE tag_learning_history DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. Função auxiliar: buscar tags com certeza abaixo do limite
--    Uso: SELECT * FROM tags_para_treinar(95);
-- ============================================================
CREATE OR REPLACE FUNCTION tags_para_treinar(limite_certeza NUMERIC DEFAULT 95)
RETURNS TABLE (
  tag              TEXT,
  certeza_atual    NUMERIC,
  tentativas       INTEGER,
  ultimo_pensamento TEXT,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.tag,
    q.certeza_atual,
    q.tentativas,
    q.ultimo_pensamento,
    q.created_at
  FROM ml_training_queue q
  WHERE q.certeza_atual < limite_certeza
    AND q.status IN ('pending', 'learning')
  ORDER BY q.certeza_atual ASC, q.created_at ASC;
END;
$$;
