-- ============================================================
-- Folksonomia Digital 2.0 — Schema de Dados ML
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Habilitar extensão pgvector para busca vetorial
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de Tags Semânticas Tricamada
CREATE TABLE IF NOT EXISTS semantic_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized TEXT NOT NULL,
    dna TEXT NOT NULL UNIQUE,           -- SHA-256
    obra_id UUID REFERENCES obras(id),
    visitante_hash TEXT,

    -- Camada Factual (JSONB para flexibilidade)
    factual_fields JSONB DEFAULT '[]'::jsonb,
    factual_sources JSONB DEFAULT '[]'::jsonb,
    factual_changelog JSONB DEFAULT '[]'::jsonb,

    -- Camada Inferida
    inferred_relations JSONB DEFAULT '[]'::jsonb,
    inferred_clusters JSONB DEFAULT '{}'::jsonb,
    inferred_embedding vector(256),

    -- Camada Validada
    validated_relations JSONB DEFAULT '[]'::jsonb,
    rejected_inferences JSONB DEFAULT '[]'::jsonb,

    -- Metadados
    confidence FLOAT DEFAULT 0.3,
    layer_status TEXT DEFAULT 'factual' CHECK (layer_status IN ('factual', 'inferred', 'validated')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice vetorial para busca por similaridade semântica
CREATE INDEX IF NOT EXISTS idx_semantic_tags_embedding 
    ON semantic_tags USING ivfflat (inferred_embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_semantic_tags_dna ON semantic_tags(dna);
CREATE INDEX IF NOT EXISTS idx_semantic_tags_normalized ON semantic_tags(normalized);

-- 3. Tabela do Grafo de Conhecimento (Triplas)
CREATE TABLE IF NOT EXISTS knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    head_entity TEXT NOT NULL,
    relation TEXT NOT NULL,
    tail_entity TEXT NOT NULL,
    head_embedding vector(256),
    tail_embedding vector(256),
    relation_embedding vector(256),
    confidence FLOAT DEFAULT 0.5,
    layer TEXT DEFAULT 'factual' CHECK (layer IN ('factual', 'inferred', 'validated')),
    source TEXT DEFAULT 'system',
    mechanism TEXT,                     -- 'rotate', 'gat', 'modernbert', 'heuristic'
    created_at TIMESTAMPTZ DEFAULT now(),
    validated_by UUID,
    validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kg_head ON knowledge_graph(head_entity);
CREATE INDEX IF NOT EXISTS idx_kg_tail ON knowledge_graph(tail_entity);
CREATE INDEX IF NOT EXISTS idx_kg_relation ON knowledge_graph(relation);
CREATE INDEX IF NOT EXISTS idx_kg_layer ON knowledge_graph(layer);

-- Índice vetorial para busca de entidades similares
CREATE INDEX IF NOT EXISTS idx_kg_head_embedding 
    ON knowledge_graph USING ivfflat (head_embedding vector_cosine_ops) 
    WITH (lists = 100);

-- 4. Tabela de Observações Curatoriais (Map Graph como instrumento de aprendizado)
CREATE TABLE IF NOT EXISTS curator_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curator_id UUID NOT NULL,
    observed_nodes TEXT[] DEFAULT '{}',
    observed_pattern TEXT,
    action TEXT NOT NULL CHECK (action IN ('confirm_connection', 'reject_connection', 'suggest_new', 'annotate')),
    
    -- Sinais de treinamento
    positive_pairs JSONB DEFAULT '[]'::jsonb,
    negative_pairs JSONB DEFAULT '[]'::jsonb,
    new_relation JSONB,
    
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Log de Eventos
CREATE TABLE IF NOT EXISTS event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('INGESTION', 'CONNECTION', 'VALIDATION', 'QUERY')),
    priority INTEGER DEFAULT 4,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_log_type ON event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_processed ON event_log(processed);

-- 6. Tabela de Conflitos entre Fontes
CREATE TABLE IF NOT EXISTS metadata_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID REFERENCES semantic_tags(id),
    field TEXT NOT NULL,
    source_a_provider TEXT NOT NULL,
    source_a_value TEXT NOT NULL,
    source_a_timestamp TIMESTAMPTZ,
    source_b_provider TEXT NOT NULL,
    source_b_value TEXT NOT NULL,
    source_b_timestamp TIMESTAMPTZ,
    resolution TEXT DEFAULT 'unresolved' CHECK (resolution IN ('sourceA_priority', 'sourceB_priority', 'unresolved')),
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Função de busca vetorial para tags similares
CREATE OR REPLACE FUNCTION search_similar_tags(
    query_embedding vector(256),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    normalized TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.normalized,
        1 - (st.inferred_embedding <=> query_embedding) AS similarity
    FROM semantic_tags st
    WHERE st.inferred_embedding IS NOT NULL
    AND 1 - (st.inferred_embedding <=> query_embedding) > match_threshold
    ORDER BY st.inferred_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 8. Função de busca de entidades no grafo por similaridade
CREATE OR REPLACE FUNCTION search_graph_neighbors(
    entity_name TEXT,
    max_depth INT DEFAULT 2
)
RETURNS TABLE (
    head TEXT,
    relation TEXT,
    tail TEXT,
    confidence FLOAT,
    layer TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kg.head_entity,
        kg.relation,
        kg.tail_entity,
        kg.confidence,
        kg.layer
    FROM knowledge_graph kg
    WHERE kg.head_entity = entity_name 
       OR kg.tail_entity = entity_name
    ORDER BY kg.confidence DESC
    LIMIT 50;
END;
$$;
