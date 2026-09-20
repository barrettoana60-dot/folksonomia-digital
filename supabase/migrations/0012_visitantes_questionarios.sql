-- ============================================================
-- Migration: Visitantes e Questionários de Primeiro Acesso
-- Garante persistência e integridade das respostas do questionário
-- ============================================================

CREATE TABLE IF NOT EXISTS visitantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_publico TEXT,
  pseudonimo TEXT,
  visitante_hash TEXT UNIQUE,
  criado_em TIMESTAMPTZ DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_visitantes_hash ON visitantes(visitante_hash);
CREATE INDEX IF NOT EXISTS idx_questionarios_visitante ON questionarios(visitante_id);
CREATE INDEX IF NOT EXISTS idx_questionarios_criado ON questionarios(criado_em DESC);

ALTER TABLE visitantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE questionarios DISABLE ROW LEVEL SECURITY;
