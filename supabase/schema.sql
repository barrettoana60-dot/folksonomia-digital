-- Ativar a extensão de vetores (Machine Learning) e encriptação
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Limpar tabelas existentes se necessário (descomentar se for resetar)
-- DROP TABLE IF EXISTS ml_execucoes, ml_sugestoes, resultados_externos, eventos, tags, nucleos, obras CASCADE;

-- 1. Tabela Principal de Obras
CREATE TABLE obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  artista TEXT,
  ano TEXT,
  descricao TEXT,
  imagem_url TEXT,
  audio_descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Células Informacionais (Núcleos) com vetor semântico
CREATE TABLE nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'tag', 'contexto', etc.
  conteudo_original TEXT NOT NULL,
  conteudo_normalizado TEXT NOT NULL,
  origem TEXT NOT NULL, -- 'interface_publica', 'importacao', etc.
  assinatura_hash TEXT, -- Hash criptográfico gerado no momento do envio
  embedding VECTOR(384), -- Vetor gerado pelo @xenova/transformers (all-MiniLM-L6-v2)
  status_validacao TEXT DEFAULT 'bruto', -- 'bruto', 'em_revisao', 'validado', 'rejeitado', 'publicado'
  confianca NUMERIC DEFAULT 0,
  novidade NUMERIC DEFAULT 0,
  tensao NUMERIC DEFAULT 0,
  ressonancia NUMERIC DEFAULT 0,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  contexto JSONB, -- Payload encriptado do ambiente de submissão
  metadados JSONB, -- Outras inferências
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Tags Visuais
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE SET NULL,
  tag_original TEXT NOT NULL,
  tag_normalizada TEXT NOT NULL,
  visitante_hash TEXT, -- Privacidade: hash do visitante (não logado)
  visitante_nome TEXT,
  grupo_tematico TEXT, -- Ex: 'Natureza', 'Sentimentos'
  status TEXT DEFAULT 'em análise',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sugestões de Machine Learning
CREATE TABLE ml_sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  tipo_sugestao TEXT NOT NULL, -- 'conceito_relacionado', 'correcao_ortografica'
  sugestao TEXT NOT NULL,
  score NUMERIC NOT NULL,
  metodo TEXT, -- 'ontology_match + embedding_local'
  status TEXT DEFAULT 'pendente', -- 'pendente', 'aceita', 'rejeitada'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Histórico e Logs de Execução do ML
CREATE TABLE ml_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  tipo_execucao TEXT,
  resumo TEXT,
  status TEXT,
  metricas JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Resultados de Fontes Externas (Interoperabilidade)
CREATE TABLE resultados_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  fonte TEXT NOT NULL, -- 'Europeana', 'IBRAM', 'Brasiliana'
  external_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url TEXT,
  rights TEXT,
  provider TEXT,
  match_score NUMERIC,
  tipo_relacao TEXT, -- 'closeMatch', 'relatedMatch'
  status TEXT DEFAULT 'sugerido', -- 'sugerido', 'aprovado'
  dados JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabela de Eventos (Proveniência/Trilha de Auditoria)
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo TEXT NOT NULL, -- 'nucleo', 'obra', 'tag'
  entidade_id UUID NOT NULL,
  tipo_evento TEXT NOT NULL, -- 'tag_criada', 'validacao_aprovada'
  resumo TEXT,
  hash_evento TEXT, -- Assinatura do momento do evento
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices de Performance
CREATE INDEX idx_tags_obra ON tags(obra_id);
CREATE INDEX idx_nucleos_obra ON nucleos(obra_id);
CREATE INDEX idx_eventos_entidade ON eventos(entidade_id);
CREATE INDEX idx_nucleos_status ON nucleos(status_validacao);

-- Segurança: Desativar RLS nas tabelas para este protótipo (uso do Service Role)
ALTER TABLE obras DISABLE ROW LEVEL SECURITY;
ALTER TABLE nucleos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_sugestoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ml_execucoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_externos DISABLE ROW LEVEL SECURITY;
ALTER TABLE eventos DISABLE ROW LEVEL SECURITY;

-- 8. Função de Busca de Similaridade Semântica (Cosine Distance via pgvector)
CREATE OR REPLACE FUNCTION match_nucleos (
  query_embedding vector(384),
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
