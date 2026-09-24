-- ============================================================
-- Folksonomia Digital — Análise Multimodal de Tags
-- Migração 0015
--
-- Persiste a evidência visual da tag na imagem e métricas de
-- coerência multimodal. A tabela não guarda dados pessoais.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.image_tag_ml_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  tag_id TEXT,
  tag_original TEXT NOT NULL,
  tag_normalizada TEXT NOT NULL,

  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,

  visual_evidence NUMERIC,
  context_similarity NUMERIC,
  tag_set_coherence NUMERIC,
  cohesion_score NUMERIC,

  visual_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  other_tags TEXT[] NOT NULL DEFAULT '{}',
  raw_model_output JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (obra_id, tag_normalizada, model_name)
);

CREATE INDEX IF NOT EXISTS idx_image_tag_ml_tag
  ON public.image_tag_ml_analysis(tag_normalizada);

CREATE INDEX IF NOT EXISTS idx_image_tag_ml_obra
  ON public.image_tag_ml_analysis(obra_id);

CREATE INDEX IF NOT EXISTS idx_image_tag_ml_cohesion
  ON public.image_tag_ml_analysis(cohesion_score DESC);

ALTER TABLE public.image_tag_ml_analysis ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.image_tag_ml_analysis IS
  'Evidência multimodal (imagem + contexto textual + conjunto de tags) para associações tag/obra.';

COMMENT ON COLUMN public.image_tag_ml_analysis.visual_evidence IS
  'Evidência visual produzida por modelo vision-language; não é probabilidade calibrada.';

COMMENT ON COLUMN public.image_tag_ml_analysis.context_similarity IS
  'Similaridade semântica entre a tag e o contexto museológico da obra.';

COMMENT ON COLUMN public.image_tag_ml_analysis.tag_set_coherence IS
  'Coerência semântica da tag com as demais tags atribuídas à mesma obra.';

COMMENT ON COLUMN public.image_tag_ml_analysis.cohesion_score IS
  'Composição transparente das evidências disponíveis para a associação tag/obra.';
