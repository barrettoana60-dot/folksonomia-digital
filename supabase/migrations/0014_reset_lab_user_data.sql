-- ============================================================
-- Reset de laboratório — dados de usuários
--
-- Limpa tags, identidades/correlações derivadas e questionários
-- antes da rodada de testes com usuários reais.
-- Preserva obras, estrutura do banco e trilhas de auditoria imutáveis.
-- ============================================================

BEGIN;

-- Respostas e visitantes do questionário.
DO $$
BEGIN
  IF to_regclass('public.questionarios') IS NOT NULL THEN
    TRUNCATE TABLE public.questionarios RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.visitantes') IS NOT NULL THEN
    TRUNCATE TABLE public.visitantes RESTART IDENTITY CASCADE;
  END IF;
END $$;

-- Tags do catálogo legado e seus núcleos derivados.
DO $$
BEGIN
  IF to_regclass('public.tags') IS NOT NULL THEN
    TRUNCATE TABLE public.tags RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.nucleos') IS NOT NULL THEN
    DELETE FROM public.nucleos WHERE tipo = 'tag' OR origem = 'interface_publica';
  END IF;
END $$;

-- Identidades de tags e todas as relações/fontes/contribuições dependentes.
DO $$
BEGIN
  IF to_regclass('public.tag_identities') IS NOT NULL THEN
    TRUNCATE TABLE public.tag_identities RESTART IDENTITY CASCADE;
  END IF;
END $$;

-- Cache semântico e aprendizado derivados das tags antigas.
DO $$
BEGIN
  IF to_regclass('public.semantic_correlations') IS NOT NULL THEN
    TRUNCATE TABLE public.semantic_correlations RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.cross_source_connections') IS NOT NULL THEN
    TRUNCATE TABLE public.cross_source_connections RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.tag_learning_history') IS NOT NULL THEN
    TRUNCATE TABLE public.tag_learning_history RESTART IDENTITY CASCADE;
  END IF;
  IF to_regclass('public.tag_families') IS NOT NULL THEN
    TRUNCATE TABLE public.tag_families RESTART IDENTITY CASCADE;
  END IF;
END $$;

-- Respostas salvas no fallback usado enquanto questionarios/visitantes
-- não estavam disponíveis. Eventos de auditoria não são apagados.
DO $$
BEGIN
  IF to_regclass('public.eventos') IS NOT NULL THEN
    DELETE FROM public.eventos WHERE tipo_evento = 'questionario_completado';
  END IF;
END $$;

COMMIT;
