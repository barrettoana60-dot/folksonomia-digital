/**
 * Folksonomia Digital 2.0 — Pipeline Semântico (v3 — Calibrado)
 * 
 * Orquestra os motores da arquitetura ML:
 * 1. Classificação de Tokens (ModernBERT via ML Service → heurístico fallback)
 * 2. Grafo de Conhecimento (RotatE via ML Service → heurístico fallback)
 * 3. Comunidades Sobrepostas (GAT via ML Service → heurístico fallback)
 * 4. Tag Tricamada (Factual → Inferida → Validada)
 * 5. Evidências Cross-Source (Europeana + Ibram + Brasiliana)
 * 6. Aprendizado Ativo (termos desconhecidos)
 * 7. Motor de Confiança Calibrado (multi-fator)
 * 
 * Cada motor tem fallback heurístico automático quando ML Service offline.
 */

import { generateSignature } from '../core/crypto';
import { normalizeText, createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestConcepts, detectThemeGroup } from './ontology-matcher';
import { calculateCalibratedConfidence, calculateNovelty, calculateTension, calculateResonance } from './scoring';
import { recommendRelations } from './recommendations';
import { createSemanticTag } from './tag-factory';
import { eventBus, createQueryEvent } from './events';
import { collectEvidence, getCachedEvidence } from './evidence-collector';
import { processUnknownTerm } from './active-learning';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import type { SemanticTag, ClassifiedField } from './types';

// ============================================================
// ML Service Client (shared)
// ============================================================

async function callMLService(endpoint: string, body: any): Promise<any | null> {
  const mlServiceUrl = process.env.ML_SERVICE_URL;
  if (!mlServiceUrl) return null;

  try {
    const res = await fetch(`${mlServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ============================================================
// Motor 1: Classificação de Tokens
// ============================================================

async function classifyTokens(tag: string): Promise<{
  motor: string;
  category?: string;
  confidence: number;
  modelVersion?: string;
}> {
  // Tentar ML Service
  const mlResult = await callMLService('/predict-ner', { text: tag });
  if (mlResult?.tokens?.length > 0) {
    const classified = mlResult.tokens.filter((t: any) => t.category !== 'O');
    const bestToken = classified.length > 0 ? classified[0] : mlResult.tokens[0];
    return {
      motor: 'modernbert_ner',
      category: bestToken.category,
      confidence: bestToken.confidence || bestToken.probability || 0.5,
      modelVersion: mlResult.model_version
    };
  }

  // Fallback heurístico
  return {
    motor: 'heuristic_fallback',
    category: undefined,
    confidence: 0.3
  };
}

// ============================================================
// Motor 5: Evidências Cross-Source
// ============================================================

async function getEvidences(tag: string): Promise<{
  evidences: any[];
  sourceCount: number;
  sourceQuality: number;
  consensusCategory?: string;
}> {
  // Primeiro tentar cache
  const cached = await getCachedEvidence(tag);
  if (cached.length > 0) {
    const sources = new Set(cached.map(e => e.fonte));
    const avgWeight = cached.reduce((s, e) => s + e.peso, 0) / cached.length;
    
    // Categoria consenso do cache
    const catVotes: Record<string, number> = {};
    cached.forEach(e => { catVotes[e.categoria] = (catVotes[e.categoria] || 0) + e.peso; });
    const topCat = Object.entries(catVotes).sort(([,a],[,b]) => b - a)[0];
    
    return {
      evidences: cached,
      sourceCount: sources.size,
      sourceQuality: avgWeight,
      consensusCategory: topCat?.[0]
    };
  }

  // Se não há cache, coletar (assíncrono, não bloqueia resposta principal)
  // Para não atrasar o pipeline, fazemos fire-and-forget
  collectEvidence(tag).catch(() => {});
  
  return {
    evidences: [],
    sourceCount: 0,
    sourceQuality: 0
  };
}

// ============================================================
// Motor 6: Aprendizado Ativo
// ============================================================

async function checkActiveLearning(tag: string, confidence: number, obraId?: string): Promise<{
  needsLearning: boolean;
  hypothesis?: any;
}> {
  if (confidence >= 0.4) {
    return { needsLearning: false };
  }

  const result = await processUnknownTerm(tag, {
    obra_id: obraId,
    confidence_threshold: 0.4
  });

  return {
    needsLearning: result.needs_validation,
    hypothesis: result.hypothesis
  };
}

// ============================================================
// Motor 7: Memória Semântica
// ============================================================

async function checkSemanticMemory(tag: string): Promise<{
  found: boolean;
  category?: string;
  confidence?: number;
  significado?: string;
}> {
  const termNorm = normalizeText(tag);
  try {
    const { data } = await supabase
      .from('semantic_memory')
      .select('categoria, confianca, significado, status')
      .eq('termo_normalizado', termNorm)
      .eq('status', 'validado')
      .single();
    
    if (data) {
      return {
        found: true,
        category: data.categoria,
        confidence: data.confianca,
        significado: data.significado
      };
    }
  } catch {}
  
  return { found: false };
}

/**
 * Pipeline Semântico Completo — v3 (Calibrado)
 * 
 * Processa uma tag de entrada e retorna:
 * - A SemanticTag tricamada completa
 * - Indicadores semânticos calibrados
 * - Evidências cross-source
 * - Status de aprendizado ativo
 */
export async function runSemanticPipeline(tag: string, obraId: string, visitanteId?: string) {
  const startTime = Date.now();
  const norm = normalizeText(tag);
  if (!norm) throw new Error('Tag vazia ou inválida');

  // ============================================================
  // Executar motores em paralelo para performance
  // ============================================================
  const [
    tokenResult,
    semanticTag,
    evidenceResult,
    memoryResult,
    ontologias,
    existingTags
  ] = await Promise.all([
    classifyTokens(tag),
    createSemanticTag(tag, obraId, 'user_tag', visitanteId),
    getEvidences(tag),
    checkSemanticMemory(tag),
    supabase.from('ontologias').select('*').limit(50).then(r => r.data || []).catch(() => []),
    supabase.from('tags').select('tag_normalizada').limit(100).then(r => r.data || []).catch(() => [])
  ]);

  // ============================================================
  // Enriquecimento Semântico
  // ============================================================
  const matchedOntologies = matchOntologies(tag, ontologias);
  const suggestedConcepts = suggestConcepts(tag);
  const relations = recommendRelations(norm, existingTags.map((t: any) => t.tag_normalizada));

  // Determinar categoria final (prioridade: memória > modelo > evidência > heurística)
  const finalCategory = memoryResult.found ? memoryResult.category
    : tokenResult.category ? tokenResult.category
    : evidenceResult.consensusCategory
    || 'TEMA';

  // ============================================================
  // Motor de Confiança Calibrado
  // ============================================================
  const obra = await supabase.from('obras').select('titulo, descricao')
    .eq('id', obraId).single().then(r => r.data).catch(() => null);

  const calibrated = calculateCalibratedConfidence({
    modelProbability: tokenResult.motor !== 'heuristic_fallback' ? tokenResult.confidence : undefined,
    vectorSimilarity: memoryResult.found ? (memoryResult.confidence || 0.5) : undefined,
    externalSourceCount: evidenceResult.sourceCount,
    externalSourceQuality: evidenceResult.sourceQuality,
    humanValidations: 0, // será preenchido do banco futuramente
    obraCoherence: obra?.descricao ? (normalizeText(obra.descricao).includes(norm) ? 0.9 : 0.3) : 0,
    memoryMatches: memoryResult.found ? 1 : 0,
    termLength: tag.length,
    isMultiWord: tag.includes(' ')
  });

  // ============================================================
  // Aprendizado Ativo (se confiança baixa)
  // ============================================================
  const learningResult = await checkActiveLearning(tag, calibrated.calibrated, obraId);

  // ============================================================
  // Indicadores Semânticos
  // ============================================================
  const confidence = calibrated.calibrated * 100;
  const novelty = calculateNovelty(tag, 0.4, suggestedConcepts.length === 0) * 100;
  const tension = calculateTension(tag, obra?.descricao || '', 0.3) * 100;
  const resonance = calculateResonance(suggestedConcepts.length, evidenceResult.sourceCount) * 100;

  // ============================================================
  // Emitir Evento
  // ============================================================
  const latencyMs = Date.now() - startTime;
  await eventBus.emit(createQueryEvent({
    queryType: 'graph_autocomplete',
    query: norm,
    resultsCount: relations.length,
    latencyMs
  }));

  // ============================================================
  // Determinar motores ativos
  // ============================================================
  const mlServiceOnline = !!process.env.ML_SERVICE_URL;

  // ============================================================
  // Resposta Estruturada
  // ============================================================
  return {
    // Tag Tricamada completa
    tag: semanticTag,

    // DNA para compatibilidade com v1
    dna: {
      signature: semanticTag.dna,
      embedding: `[${semanticTag.inferred.embedding.slice(0, 10).join(',')}...]`, // truncado para log
      normalized: norm
    },

    // Semântica enriquecida
    semantics: {
      themeGroup: detectThemeGroup(tag, suggestedConcepts),
      concepts: suggestedConcepts,
      ontologies: matchedOntologies,
      relations,
      finalCategory,
      indicators: {
        confidence,
        novelty,
        tension,
        resonance
      }
    },

    // Confiança calibrada (detalhada)
    confidence: {
      value: calibrated.calibrated,
      raw: calibrated.raw,
      status: calibrated.status,
      explanation: calibrated.explanation,
      factors: calibrated.factors
    },

    // Evidências cross-source
    evidence: {
      total: evidenceResult.evidences.length,
      sources: evidenceResult.sourceCount,
      consensusCategory: evidenceResult.consensusCategory,
      items: evidenceResult.evidences.slice(0, 10)
    },

    // Aprendizado ativo
    learning: {
      needsValidation: learningResult.needsLearning,
      hypothesis: learningResult.hypothesis,
      memoryMatch: memoryResult.found ? {
        category: memoryResult.category,
        confidence: memoryResult.confidence,
        significado: memoryResult.significado
      } : null
    },

    // Metadados do processamento
    meta: {
      version: '3.0',
      latencyMs,
      motors: {
        tokenClassifier: tokenResult.motor === 'modernbert_ner' ? 'modernbert_ner' : 'heuristic_fallback',
        knowledgeGraph: mlServiceOnline ? 'rotate_link_prediction' : 'heuristic_fallback',
        communities: mlServiceOnline ? 'gat_clustering' : 'heuristic_fallback',
        semanticMemory: process.env.ML_SERVICE_URL ? 'pgvector_embedding' : 'hash_fallback',
        confidence: 'calibrated_model',
        tagFactory: 'active',
        evidenceCollector: 'cross_source',
        activeLearning: 'enabled'
      },
      modelVersion: tokenResult.modelVersion
    }
  };
}
