-- ============================================================
-- Folksonomia Digital 2.0 — Infraestrutura de Aprendizado ML
-- Migração 0006: Tabelas de aprendizado + migração vetores 384→768
-- ============================================================

-- ============================================================
-- PARTE A: Migrar dimensão dos vetores de 384 para 768
-- (ModernBERT-base produz embeddings de 768 dimensões)
-- ============================================================

-- Remover a função antiga que usa vector(384)
DROP FUNCTION IF EXISTS match_nucleos(vector(384), float, int);

-- Alterar coluna de embedding nos nucleos
ALTER TABLE nucleos ALTER COLUMN embedding TYPE VECTOR(768) USING NULL;

-- Recriar função de busca semântica com 768d
CREATE OR REPLACE FUNCTION match_nucleos (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  conteudo_original TEXT,
  obra_id UUID,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nucleos.id,
    nucleos.conteudo_original,
    nucleos.obra_id,
    1 - (nucleos.embedding <=> query_embedding) AS similarity
  FROM nucleos
  WHERE 1 - (nucleos.embedding <=> query_embedding) > match_threshold
  ORDER BY nucleos.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- PARTE B: Tabelas de Aprendizado
-- ============================================================

-- 1. Exemplos de treinamento semântico (dataset NER com contexto)
CREATE TABLE IF NOT EXISTS semantic_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto TEXT NOT NULL,
  tokens JSONB NOT NULL,         -- ["Retábulo", "em", "madeira", ...]
  labels JSONB NOT NULL,         -- ["B-TIPO", "O", "B-MATERIAL", ...]
  contexto JSONB DEFAULT '{}',   -- {tipo: "arte sacra", periodo: "XVIII"}
  obra_referencia TEXT,          -- nome ou ID da obra
  fonte TEXT NOT NULL,           -- 'europeana', 'ibram', 'brasiliana', 'curador', 'active_learning'
  fonte_id TEXT,                 -- ID na fonte original
  qualidade TEXT DEFAULT 'auto', -- 'auto' (regra), 'humano' (validado), 'modelo' (predito)
  validado_por TEXT,             -- curator ID
  validado_em TIMESTAMPTZ,
  modelo_versao TEXT,            -- versão do modelo que gerou/usou
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Log de predições do modelo (tudo que o modelo previu)
CREATE TABLE IF NOT EXISTS semantic_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto_input TEXT NOT NULL,
  tokens_preditos JSONB NOT NULL,  -- [{token, label, confidence}, ...]
  motor TEXT NOT NULL,             -- 'modernbert_ner', 'heuristic', 'contextual'
  modelo_versao TEXT,
  confianca_media NUMERIC DEFAULT 0,
  confianca_calibrada NUMERIC DEFAULT 0,
  obra_id UUID,
  contexto JSONB DEFAULT '{}',
  tempo_inferencia_ms INTEGER,
  correto BOOLEAN,                 -- preenchido após validação humana
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Feedback semântico estruturado (correções humanas → dado de treino)
CREATE TABLE IF NOT EXISTS semantic_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES semantic_predictions(id) ON DELETE SET NULL,
  token TEXT NOT NULL,
  label_predito TEXT NOT NULL,     -- o que o modelo disse
  label_correto TEXT NOT NULL,     -- o que o curador corrigiu
  contexto_correcao TEXT,          -- explicação do curador
  curador_id TEXT NOT NULL,
  incorporado_ao_treino BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Memória semântica (conceitos aprendidos com evidências)
CREATE TABLE IF NOT EXISTS semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termo TEXT NOT NULL,
  termo_normalizado TEXT NOT NULL,
  significado TEXT,                -- "técnica decorativa em madeira com aplicação de ouro"
  categoria TEXT NOT NULL,         -- 'TECNICA', 'MATERIAL', etc.
  contextos JSONB DEFAULT '[]',    -- ["arte sacra", "barroco", "madeira"]
  embedding VECTOR(768),
  confianca NUMERIC DEFAULT 0.5,
  status TEXT DEFAULT 'hipotese',  -- 'hipotese', 'validado', 'rejeitado'
  fontes JSONB DEFAULT '[]',       -- [{fonte, termo_externo, relacao, peso}]
  total_ocorrencias INTEGER DEFAULT 1,
  total_validacoes INTEGER DEFAULT 0,
  ultima_validacao TIMESTAMPTZ,
  modelo_versao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(termo_normalizado, categoria)
);

-- 5. Termos desconhecidos (sistema de aprendizado ativo)
CREATE TABLE IF NOT EXISTS unknown_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termo TEXT NOT NULL,
  termo_normalizado TEXT NOT NULL,
  contexto_texto TEXT,             -- frase original onde apareceu
  obra_id UUID,
  hipotese_categoria TEXT,         -- melhor palpite
  hipotese_confianca NUMERIC DEFAULT 0,
  evidencias_externas JSONB DEFAULT '[]',  -- resultados de busca externa
  status TEXT DEFAULT 'pendente',  -- 'pendente', 'resolvido', 'descartado'
  resolvido_como TEXT,             -- categoria final atribuída
  resolvido_por TEXT,              -- 'curador' ou 'modelo'
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(termo_normalizado)
);

-- 6. Versões de modelos (registro de cada versão treinada)
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,              -- 'modernbert_ner', 'contextual_classifier', etc.
  versao TEXT NOT NULL,            -- 'v1.0.0'
  descricao TEXT,
  tipo TEXT NOT NULL,              -- 'ner', 'classifier', 'embedder', 'rotate', 'gat'
  metricas JSONB DEFAULT '{}',     -- {precision, recall, f1, accuracy, por_classe: {...}}
  confusion_matrix JSONB,          -- matriz de confusão
  calibration_curve JSONB,         -- curva de calibração
  dataset_tamanho INTEGER,
  dataset_hash TEXT,               -- hash do dataset usado
  parametros JSONB DEFAULT '{}',   -- hiperparâmetros
  caminho_modelo TEXT,             -- path/URL do modelo salvo
  ativo BOOLEAN DEFAULT FALSE,     -- apenas uma versão ativa por tipo
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nome, versao)
);

-- 7. Histórico de treinamento
CREATE TABLE IF NOT EXISTS training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  nome_modelo TEXT NOT NULL,
  status TEXT DEFAULT 'iniciado',  -- 'iniciado', 'treinando', 'avaliando', 'concluido', 'falhou'
  dataset_exemplos INTEGER,
  dataset_split JSONB,             -- {train: 80, eval: 20}
  metricas_treino JSONB DEFAULT '{}',
  metricas_avaliacao JSONB DEFAULT '{}',
  duracao_segundos INTEGER,
  erro TEXT,
  disparado_por TEXT,              -- 'curador', 'agendado', 'api'
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 8. Evidências cruzadas de fontes externas
CREATE TABLE IF NOT EXISTS cross_source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termo TEXT NOT NULL,
  termo_normalizado TEXT NOT NULL,
  fonte TEXT NOT NULL,             -- 'europeana', 'ibram', 'brasiliana'
  termo_externo TEXT NOT NULL,     -- como aparece na fonte externa
  categoria_externa TEXT,          -- categoria na fonte
  tipo_relacao TEXT NOT NULL,      -- 'exactMatch', 'closeMatch', 'relatedMatch', 'broadMatch'
  peso NUMERIC DEFAULT 0.5,       -- 0-1
  metadados JSONB DEFAULT '{}',   -- dados extras da fonte
  url_fonte TEXT,                  -- link para o registro original
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(termo_normalizado, fonte, termo_externo)
);

-- ============================================================
-- PARTE C: Índices de Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ste_fonte ON semantic_training_examples(fonte);
CREATE INDEX IF NOT EXISTS idx_ste_qualidade ON semantic_training_examples(qualidade);
CREATE INDEX IF NOT EXISTS idx_sp_motor ON semantic_predictions(motor);
CREATE INDEX IF NOT EXISTS idx_sp_modelo ON semantic_predictions(modelo_versao);
CREATE INDEX IF NOT EXISTS idx_sp_correto ON semantic_predictions(correto);
CREATE INDEX IF NOT EXISTS idx_sf_incorporado ON semantic_feedback(incorporado_ao_treino);
CREATE INDEX IF NOT EXISTS idx_sm_termo ON semantic_memory(termo_normalizado);
CREATE INDEX IF NOT EXISTS idx_sm_categoria ON semantic_memory(categoria);
CREATE INDEX IF NOT EXISTS idx_sm_status ON semantic_memory(status);
CREATE INDEX IF NOT EXISTS idx_ut_status ON unknown_terms(status);
CREATE INDEX IF NOT EXISTS idx_ut_termo ON unknown_terms(termo_normalizado);
CREATE INDEX IF NOT EXISTS idx_mv_nome ON model_versions(nome);
CREATE INDEX IF NOT EXISTS idx_mv_ativo ON model_versions(ativo);
CREATE INDEX IF NOT EXISTS idx_tr_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_cse_termo ON cross_source_evidence(termo_normalizado);
CREATE INDEX IF NOT EXISTS idx_cse_fonte ON cross_source_evidence(fonte);

-- ============================================================
-- PARTE D: RLS (desabilitado para protótipo)
-- ============================================================

ALTER TABLE semantic_training_examples DISABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memory DISABLE ROW LEVEL SECURITY;
ALTER TABLE unknown_terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE cross_source_evidence DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE E: Função de busca semântica na memória (768d)
-- ============================================================

CREATE OR REPLACE FUNCTION match_semantic_memory (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  termo TEXT,
  categoria TEXT,
  significado TEXT,
  confianca NUMERIC,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    semantic_memory.id,
    semantic_memory.termo,
    semantic_memory.categoria,
    semantic_memory.significado,
    semantic_memory.confianca,
    1 - (semantic_memory.embedding <=> query_embedding) AS similarity
  FROM semantic_memory
  WHERE semantic_memory.embedding IS NOT NULL
    AND 1 - (semantic_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY semantic_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
