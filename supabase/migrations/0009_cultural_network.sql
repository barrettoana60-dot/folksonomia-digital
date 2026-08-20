-- ============================================================
-- Folksonomia Digital 2.0 — Rede Cadeada de Interoperabilidade Cultural
-- Persistência de nós e sinapses do grafo complexo
-- ============================================================

CREATE TABLE IF NOT EXISTS cultural_network_nodes (
  node_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  eixo TEXT NOT NULL DEFAULT 'PATRIMONIO',
  node_type TEXT DEFAULT 'Conceito',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  activation REAL DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cultural_network_edges (
  edge_id TEXT PRIMARY KEY,
  from_node TEXT NOT NULL REFERENCES cultural_network_nodes(node_id) ON DELETE CASCADE,
  to_node TEXT NOT NULL REFERENCES cultural_network_nodes(node_id) ON DELETE CASCADE,
  weight REAL DEFAULT 0.5,
  mechanism TEXT DEFAULT 'inferred',
  chain_depth INT DEFAULT 1,
  discovered BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cultural_edges_from ON cultural_network_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_cultural_edges_to ON cultural_network_edges(to_node);
CREATE INDEX IF NOT EXISTS idx_cultural_edges_weight ON cultural_network_edges(weight DESC);
CREATE INDEX IF NOT EXISTS idx_cultural_nodes_eixo ON cultural_network_nodes(eixo);

-- Nó central obrigatório
INSERT INTO cultural_network_nodes (node_id, label, eixo, node_type, description, activation)
VALUES ('core', 'Núcleo Folksonômico', 'NUCLEO', 'Núcleo do Acervo Semântico',
        'Centralizador semântico do acervo cultural brasileiro', 1.0)
ON CONFLICT (node_id) DO NOTHING;

INSERT INTO cultural_network_nodes (node_id, label, eixo, node_type, description, activation)
VALUES ('artigo_popular', 'Estudos de Cultura Popular', 'PATRIMONIO', 'Artigo Científico — Cultura Popular',
        'Publicações acadêmicas sobre manifestações da cultura popular brasileira', 0.0)
ON CONFLICT (node_id) DO NOTHING;
