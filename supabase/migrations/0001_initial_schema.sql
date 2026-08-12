-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Profiles (Admins)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  role TEXT DEFAULT 'admin',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Visitantes
CREATE TABLE IF NOT EXISTS visitantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_publico TEXT,
  pseudonimo TEXT,
  visitante_hash TEXT UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Questionários
CREATE TABLE IF NOT EXISTS questionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitante_id UUID REFERENCES visitantes(id) ON DELETE SET NULL,
  faixa_etaria TEXT,
  cidade_bairro TEXT,
  vinculo_museu TEXT,
  familiaridade_arte TEXT,
  necessidades_acessibilidade TEXT,
  aceite_participacao BOOLEAN DEFAULT TRUE,
  respostas JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Obras
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  artista TEXT,
  ano TEXT,
  tipo TEXT,
  descricao TEXT,
  material TEXT,
  tecnica TEXT,
  dimensoes TEXT,
  origem TEXT,
  imagem_url TEXT,
  audio_descricao TEXT,
  metadados JSONB DEFAULT '{}',
  publicado BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 5. Núcleos (The informational core)
CREATE TABLE IF NOT EXISTS nucleos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT, -- 'tag', 'obra', 'imagem', 'comentario', 'metadado'
  conteudo_original TEXT,
  conteudo_normalizado TEXT,
  contexto JSONB DEFAULT '{}',
  metadados JSONB DEFAULT '{}',
  origem TEXT,
  assinatura_hash TEXT,
  embedding VECTOR(768),
  status_validacao TEXT DEFAULT 'bruto', -- 'bruto', 'em_analise', 'validado', 'rejeitado', 'publicado'
  confianca NUMERIC DEFAULT 0,
  novidade NUMERIC DEFAULT 0,
  tensao NUMERIC DEFAULT 0,
  ressonancia NUMERIC DEFAULT 0,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  visitante_id UUID REFERENCES visitantes(id) ON DELETE SET NULL,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 6. Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  visitante_id UUID REFERENCES visitantes(id) ON DELETE SET NULL,
  tag_original TEXT,
  tag_normalizada TEXT,
  grupo_tematico TEXT,
  status TEXT DEFAULT 'em análise',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 7. Ontologias
CREATE TABLE IF NOT EXISTS ontologias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT,
  termos TEXT[] DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 8. Conceitos
CREATE TABLE IF NOT EXISTS conceitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ontologia_id UUID REFERENCES ontologias(id) ON DELETE CASCADE,
  termo_preferido TEXT NOT NULL,
  sinonimos TEXT[] DEFAULT '{}',
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 9. Relações
CREATE TABLE IF NOT EXISTS relacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  destino_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  origem_tipo TEXT,
  destino_tipo TEXT,
  destino_externo TEXT,
  tipo_relacao TEXT, -- 'sameAs', 'closeMatch', 'broader', etc.
  peso NUMERIC DEFAULT 0,
  metodo TEXT, -- 'manual', 'ml', 'open_data'
  fonte TEXT,
  status TEXT DEFAULT 'sugerida',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 10. Fontes Externas
CREATE TABLE IF NOT EXISTS fontes_externas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  url TEXT,
  endpoint TEXT,
  tipo TEXT,
  licenca TEXT,
  autenticacao TEXT,
  padroes TEXT[] DEFAULT '{}',
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 11. Resultados Externos
CREATE TABLE IF NOT EXISTS resultados_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  fonte TEXT,
  external_id TEXT,
  titulo TEXT,
  descricao TEXT,
  url TEXT,
  rights TEXT,
  provider TEXT,
  dados JSONB DEFAULT '{}',
  match_score NUMERIC DEFAULT 0,
  tipo_relacao TEXT,
  status TEXT DEFAULT 'sugerido',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 12. Validações
CREATE TABLE IF NOT EXISTS validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  decisao TEXT, -- 'validado', 'rejeitado', 'revisar', 'fundido'
  justificativa TEXT,
  status_anterior TEXT,
  status_novo TEXT,
  validado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 13. Eventos (Proveniência)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo TEXT,
  entidade_id UUID,
  tipo_evento TEXT,
  ator UUID,
  resumo TEXT,
  payload JSONB DEFAULT '{}',
  hash_evento TEXT,
  hash_anterior TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 14. Feedback ML
CREATE TABLE IF NOT EXISTS feedback_ml (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  sugestao_id UUID,
  tipo_feedback TEXT,
  decisao_humana TEXT,
  valor_original TEXT,
  valor_corrigido TEXT,
  justificativa TEXT,
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 15. ML Sugestões
CREATE TABLE IF NOT EXISTS ml_sugestoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE CASCADE,
  tipo_sugestao TEXT, -- 'ontologia', 'conceito', 'relacao', 'termo'
  sugestao TEXT,
  score NUMERIC,
  metodo TEXT,
  status TEXT DEFAULT 'pendente',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 16. ML Execuções
CREATE TABLE IF NOT EXISTS ml_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID REFERENCES nucleos(id) ON DELETE SET NULL,
  tipo_execucao TEXT,
  resumo TEXT,
  status TEXT,
  metricas JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 17. ML Model Versions
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  versao TEXT,
  descricao TEXT,
  parametros JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 18. Configurações Acessibilidade
CREATE TABLE IF NOT EXISTS configuracoes_acessibilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitante_id UUID REFERENCES visitantes(id) ON DELETE CASCADE,
  fonte_tamanho INTEGER DEFAULT 18,
  alto_contraste BOOLEAN DEFAULT FALSE,
  modo_escuro BOOLEAN DEFAULT TRUE,
  audio_ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- RLS (Basic setup)
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read obras" ON obras FOR SELECT USING (publicado = true);

ALTER TABLE nucleos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert nucleos" ON nucleos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read validados" ON nucleos FOR SELECT USING (status_validacao = 'publicado');

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert tags" ON tags FOR INSERT WITH CHECK (true);
