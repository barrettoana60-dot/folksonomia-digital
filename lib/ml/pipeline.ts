import { generateSignature } from '../core/crypto';
import { normalizeText, createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestConcepts, detectThemeGroup } from './ontology-matcher';
import { calculateConfidence, calculateNovelty, calculateTension, calculateResonance } from './scoring';
import { recommendRelations } from './recommendations';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * Pipeline Semântico Completo do Sistema Folksonomia Digital
 */
export async function runSemanticPipeline(tag: string, obraId: string, visitanteId?: string) {
  const norm = normalizeText(tag);
  if (!norm) throw new Error('Tag vazia ou inválida');

  // 1. DNA Semântico (Assinatura e Vetor 384d)
  const signature = generateSignature({ tag, obraId, ts: Date.now() });
  const embedding = await createLocalEmbedding(norm);

  // 2. Coleta de Contexto Local (Resiliente)
  // Tentamos carregar dados do banco, mas não travamos se algo falhar
  let obra = null;
  let ontologias: any[] = [];
  let existingTags: any[] = [];

  try {
    const results = await Promise.allSettled([
      supabase.from('obras').select('titulo, descricao').eq('id', obraId).single(),
      supabase.from('ontologias').select('*').limit(50),
      supabase.from('tags').select('tag_normalizada').limit(100)
    ]);

    if (results[0].status === 'fulfilled' && !results[0].value.error) obra = results[0].value.data;
    if (results[1].status === 'fulfilled' && !results[1].value.error) ontologias = results[1].value.data || [];
    if (results[2].status === 'fulfilled' && !results[2].value.error) existingTags = results[2].value.data || [];
  } catch (dbErr) {
    console.warn('Database context fetch failed, using fallback logic:', dbErr);
  }

  // 3. Processamento Semântico (Motor Local)
  const matchedOntologies = matchOntologies(tag, ontologias);
  const suggestedConcepts = suggestConcepts(tag);
  const themeGroup = detectThemeGroup(tag, suggestedConcepts);
  
  // 4. Recomendações de Relações
  const relations = recommendRelations(norm, existingTags.map(t => t.tag_normalizada));

  // 5. Indicadores Semânticos (0-100)
  const confidence = calculateConfidence(tag, {}, suggestedConcepts.length, 0) * 100;
  const novelty = calculateNovelty(tag, 0.4, suggestedConcepts.length === 0) * 100;
  const tension = calculateTension(tag, obra?.descricao || '', 0.3) * 100;
  const resonance = calculateResonance(suggestedConcepts.length, 0) * 100;

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
      relations,
      indicators: {
        confidence,
        novelty,
        tension,
        resonance
      }
    }
  };
}
