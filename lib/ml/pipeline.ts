import { generateSignature } from '../core/crypto';
import { normalizeText, createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestConcepts, detectThemeGroup } from './ontology-matcher';
import { calculateConfidence, calculateNovelty, calculateTension, calculateResonance } from './scoring';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

export async function runSemanticPipeline(tag: string, obraId: string, visitanteId?: string) {
  const norm = normalizeText(tag);
  if (!norm) throw new Error('Tag vazia ou inválida');

  // 1. Gerar Assinatura (DNA)
  const signature = generateSignature({ tag, obraId, ts: Date.now() });

  // 2. Gerar Vetor (pgvector format)
  const embedding = await createLocalEmbedding(norm);

  // 3. Consultar Contexto da Obra
  const { data: obra } = await supabase
    .from('obras')
    .select('titulo, descricao')
    .eq('id', obraId)
    .single();

  // 4. Consultar Ontologias Locais
  const { data: ontologias } = await supabase
    .from('ontologias')
    .select('*')
    .limit(50);

  // 5. Casamento Semântico
  const matchedOntologies = matchOntologies(tag, ontologias || []);
  const suggestedConcepts = suggestConcepts(tag);
  const themeGroup = detectThemeGroup(tag, suggestedConcepts);

  // 6. Simular Busca em Open Data (Ranker simplificado)
  const externalMatchesCount = suggestedConcepts.length > 0 ? 1 : 0;

  // 7. Calcular Indicadores (0 a 100 para interface)
  const confidence = calculateConfidence(tag, {}, externalMatchesCount, 0) * 100;
  const novelty = calculateNovelty(tag, 0.4, suggestedConcepts.length === 0) * 100;
  const tension = calculateTension(tag, obra?.descricao || '', 0.3) * 100;
  const resonance = calculateResonance(suggestedConcepts.length, externalMatchesCount) * 100;

  // 8. Preparar Resultados
  return {
    dna: {
      signature,
      embedding: `[${embedding.join(',')}]`,
      normalized: norm
    },
    semantics: {
      themeGroup,
      concepts: suggestedConcepts,
      ontologies: matchedOntologies,
      indicators: {
        confidence,
        novelty,
        tension,
        resonance
      }
    }
  };
}
