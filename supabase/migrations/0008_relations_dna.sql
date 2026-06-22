-- ============================================================
-- Folksonomia Digital 2.0 — DNA Semântico e Proveniência Imutável
-- Adiciona colunas para registrar o DNA semântico das relações.
-- ============================================================

ALTER TABLE relacoes ADD COLUMN IF NOT EXISTS hash_dna TEXT;
ALTER TABLE relacoes ADD COLUMN IF NOT EXISTS metadados JSONB DEFAULT '{}';

-- Adicionar índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_relacoes_hash_dna ON relacoes(hash_dna);
