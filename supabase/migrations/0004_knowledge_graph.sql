-- ============================================================
-- Folksonomia Digital 2.0 — Grafo de Conhecimento Real
-- Armazena entidades extraídas pelo ModernBERT e conexões
-- descobertas pelo RotatE/GAT.
-- ============================================================

-- Entidades extraídas pelo NER (cada pedaço de conhecimento)
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL, -- AUTORIA, TECNICA, DATA, GEO, MATERIAL, PROVENIENCIA, QUALIFICADOR
  fonte TEXT NOT NULL, -- europeana, ibram, bndigital, tag_interna
  fonte_id TEXT,       -- ID do item na fonte original
  confianca FLOAT DEFAULT 0.5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conexões entre entidades (grafo de conhecimento)
CREATE TABLE IF NOT EXISTS knowledge_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade_a UUID REFERENCES knowledge_entities(id),
  entidade_b UUID REFERENCES knowledge_entities(id),
  tipo_relacao TEXT NOT NULL, -- ex: 'criou', 'usou_tecnica', 'periodo_de', 'localizado_em'
  peso FLOAT DEFAULT 0.5,
  motor TEXT DEFAULT 'rotate', -- rotate, gat, curador
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ke_tipo ON knowledge_entities(tipo);
CREATE INDEX IF NOT EXISTS idx_ke_texto ON knowledge_entities(texto);
CREATE INDEX IF NOT EXISTS idx_ke_fonte ON knowledge_entities(fonte);
CREATE INDEX IF NOT EXISTS idx_kr_a ON knowledge_relations(entidade_a);
CREATE INDEX IF NOT EXISTS idx_kr_b ON knowledge_relations(entidade_b);

-- RLS
ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all knowledge_entities" ON knowledge_entities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all knowledge_relations" ON knowledge_relations FOR ALL USING (true) WITH CHECK (true);
