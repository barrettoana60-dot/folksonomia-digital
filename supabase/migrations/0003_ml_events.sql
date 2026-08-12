-- ============================================================
-- Folksonomia Digital 2.0 — Tabela de Eventos ML
-- Barramento de eventos para rastreamento de INGESTAO,
-- CONEXAO, VALIDACAO e CONSULTA.
-- ============================================================

CREATE TABLE IF NOT EXISTS ml_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('INGESTAO', 'CONEXAO', 'VALIDACAO', 'CONSULTA')),
  origem TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  resultado JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'erro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_ml_events_tipo ON ml_events(tipo);
CREATE INDEX IF NOT EXISTS idx_ml_events_created ON ml_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_events_status ON ml_events(status);

-- RLS: permitir leitura/escrita pelo service role (admin)
ALTER TABLE ml_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON ml_events
  FOR ALL USING (true) WITH CHECK (true);
