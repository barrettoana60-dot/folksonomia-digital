/**
 * Folksonomia Digital 2.0 — Pipeline Semântico (Refatorado)
 * 
 * Orquestra os 4 motores da arquitetura ML:
 * 1. Classificação de Tokens (ModernBERT → heurístico por enquanto)
 * 2. Grafo de Conhecimento (RotatE → embeddings locais por enquanto)
 * 3. Comunidades Sobrepostas (GAT → clustering simples por enquanto)
 * 4. Tag Tricamada (Factual → Inferida → Validada)
 * 
 * Cada motor tem um fallback heurístico local que será substituído
 * pelo modelo real conforme os motores forem treinados.
 */

import { generateSignature } from '../core/crypto';
import { normalizeText, createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestConcepts, detectThemeGroup } from './ontology-matcher';
import { calculateConfidence, calculateNovelty, calculateTension, calculateResonance } from './scoring';
import { recommendRelations } from './recommendations';
import { createSemanticTag } from './tag-factory';
import { eventBus, createQueryEvent } from './events';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import type { SemanticTag, ClassifiedField } from './types';

/**
 * Pipeline Semântico Completo — v2
 * 
 * Processa uma tag de entrada e retorna:
 * - A SemanticTag tricamada completa
 * - Indicadores semânticos (confiança, novidade, tensão, ressonância)
 * - Metadados do DNA e do processamento
 */
export async function runSemanticPipeline(tag: string, obraId: string, visitanteId?: string) {
  const startTime = Date.now();
  const norm = normalizeText(tag);
  if (!norm) throw new Error('Tag vazia ou inválida');

  // ============================================================
  // 1. Criar Tag Tricamada (Motor 4 + Motor 1 heurístico)
  // ============================================================
  const semanticTag = await createSemanticTag(tag, obraId, 'user_tag', visitanteId);

  // ============================================================
  // 2. Coleta de Contexto (Supabase — resiliente)
  // ============================================================
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
    console.warn('[Pipeline] Database context fetch failed, using fallback:', dbErr);
  }

  // ============================================================
  // 3. Enriquecimento Semântico (Motores 2 e 3 — heurísticos)
  // ============================================================
  const matchedOntologies = matchOntologies(tag, ontologias);
  const suggestedConcepts = suggestConcepts(tag);
  const relations = recommendRelations(norm, existingTags.map(t => t.tag_normalizada));

  // ============================================================
  // 4. Indicadores Semânticos (0-100)
  // ============================================================
  const confidence = calculateConfidence(tag, {}, suggestedConcepts.length, 0) * 100;
  const novelty = calculateNovelty(tag, 0.4, suggestedConcepts.length === 0) * 100;
  const tension = calculateTension(tag, obra?.descricao || '', 0.3) * 100;
  const resonance = calculateResonance(suggestedConcepts.length, 0) * 100;

  // ============================================================
  // 5. Emitir Evento de Consulta (Analytics)
  // ============================================================
  const latencyMs = Date.now() - startTime;
  await eventBus.emit(createQueryEvent({
    queryType: 'graph_autocomplete',
    query: norm,
    resultsCount: relations.length,
    latencyMs
  }));

  // ============================================================
  // 6. Resposta Estruturada
  // ============================================================
  return {
    // Tag Tricamada completa
    tag: semanticTag,

    // DNA para compatibilidade com v1
    dna: {
      signature: semanticTag.dna,
      embedding: `[${semanticTag.inferred.embedding.join(',')}]`,
      normalized: norm
    },

    // Semântica enriquecida
    semantics: {
      themeGroup: detectThemeGroup(tag, suggestedConcepts),
      concepts: suggestedConcepts,
      ontologies: matchedOntologies,
      relations,
      indicators: {
        confidence,
        novelty,
        tension,
        resonance
      }
    },

    // Metadados do processamento
    meta: {
      version: '2.0',
      latencyMs,
      motors: {
        tokenClassifier: 'heuristic',   // → ModernBERT (Fase 2)
        knowledgeGraph: 'heuristic',     // → RotatE (Fase 3)
        communities: 'heuristic',        // → GAT (Fase 4)
        tagFactory: 'active'
      }
    }
  };
}
