/**
 * Folksonomia Digital 2.0 — Fábrica de Tags Semânticas Tricamada
 * 
 * Responsável por criar e gerenciar o ciclo de vida das Tags:
 * Factual → Inferida → Validada
 */

import { generateSignature } from '../core/crypto';
import { normalizeText, createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestConcepts, detectThemeGroup } from './ontology-matcher';
import { recommendRelations } from './recommendations';
import { detectQualifier } from './arbitration';
import { eventBus, createIngestionEvent, createConnectionEvent } from './events';
import type { 
  SemanticTag, 
  ClassifiedField, 
  InferredRelation,
  MultiMembership,
  DataSource,
  InferenceMechanism
} from './types';

// ============================================================
// Fábrica de Tags
// ============================================================

/**
 * Cria uma nova SemanticTag com a camada Factual preenchida.
 * A camada Inferida é calculada pelo motor local.
 * A camada Validada começa vazia.
 */
export async function createSemanticTag(
  rawTag: string,
  obraId: string,
  source: DataSource = 'user_tag',
  visitanteId?: string
): Promise<SemanticTag> {
  const normalized = normalizeText(rawTag);
  if (!normalized) throw new Error('Tag vazia ou inválida');

  const dna = generateSignature({ tag: normalized, obraId, ts: Date.now() });

  // ---- Camada Factual ----
  const qualifier = detectQualifier(rawTag);
  const baseConfidence = source === 'user_tag' ? 0.3 : 0.7;
  
  const factualField: ClassifiedField = {
    value: rawTag,
    category: 'MATERIAL',  // Placeholder até ModernBERT classificar
    confidence: baseConfidence,
    qualifier,
    source
  };

  // ---- Camada Inferida (motor local heurístico) ----
  const concepts = suggestConcepts(rawTag);
  const themeGroup = detectThemeGroup(rawTag, concepts);
  const embedding = await createLocalEmbedding(normalized);

  // Gerar relações inferidas por heurística
  const inferredRelations: InferredRelation[] = concepts.map((concept, i) => ({
    id: `inf_${dna.substring(0, 8)}_${i}`,
    target: concept,
    type: 'related_to' as const,
    confidence: 0.4 + (i === 0 ? 0.2 : 0),
    mechanism: 'heuristic' as InferenceMechanism,
    createdAt: new Date().toISOString()
  }));

  // Multi-membership padrão (grupo único até GAT)
  const clusters: MultiMembership = {
    entityId: dna,
    memberships: themeGroup !== 'Outros' ? [{
      groupId: themeGroup.toLowerCase(),
      groupName: themeGroup,
      weight: 0.6,
      contextRelevance: { [themeGroup.toLowerCase()]: 0.8 }
    }] : []
  };

  // ---- Montagem da Tag Tricamada ----
  const tag: SemanticTag = {
    id: dna.substring(0, 16),
    normalized,
    dna,

    factual: {
      fields: [factualField],
      sources: [{
        provider: source,
        ingestedAt: new Date().toISOString(),
        raw: { originalTag: rawTag, obraId }
      }],
      changelog: [{
        timestamp: new Date().toISOString(),
        author: visitanteId || 'system',
        diff: `Tag "${rawTag}" criada via ${source}`
      }]
    },

    inferred: {
      relations: inferredRelations,
      clusters,
      embedding: embedding
    },

    validated: {
      approvedRelations: [],
      rejectedInferences: []
    }
  };

  // ---- Emitir eventos ----
  await eventBus.emit(createIngestionEvent({
    source,
    entityId: tag.id,
    fields: [factualField],
    triggersReprocessing: false
  }));

  // Emitir eventos de conexão para cada relação inferida
  for (const rel of inferredRelations) {
    await eventBus.emit(createConnectionEvent({
      mechanism: rel.mechanism,
      head: normalized,
      tail: rel.target,
      relation: rel.type,
      confidence: rel.confidence,
      propagateToNeighbors: false
    }));
  }

  return tag;
}

/**
 * Promove uma inferência para a camada validada (curador aprovou).
 */
export function approveInference(
  tag: SemanticTag,
  inferenceId: string,
  curatorId: string
): SemanticTag {
  const inference = tag.inferred.relations.find(r => r.id === inferenceId);
  if (!inference) throw new Error(`Inferência ${inferenceId} não encontrada`);

  return {
    ...tag,
    validated: {
      ...tag.validated,
      approvedRelations: [
        ...tag.validated.approvedRelations,
        {
          originalInferenceId: inferenceId,
          validatedBy: curatorId,
          validatedAt: new Date().toISOString(),
          weight: 1.0
        }
      ]
    },
    factual: {
      ...tag.factual,
      changelog: [
        ...tag.factual.changelog,
        {
          timestamp: new Date().toISOString(),
          author: curatorId,
          diff: `Inferência "${inference.target}" (${inference.type}) aprovada — migrada para camada validada`
        }
      ]
    }
  };
}

/**
 * Rejeita uma inferência (curador rejeitou). 
 * O sinal negativo retorna como dado de treinamento.
 */
export function rejectInference(
  tag: SemanticTag,
  inferenceId: string,
  curatorId: string,
  reason?: string
): SemanticTag {
  return {
    ...tag,
    validated: {
      ...tag.validated,
      rejectedInferences: [
        ...tag.validated.rejectedInferences,
        {
          inferenceId,
          rejectedBy: curatorId,
          rejectedAt: new Date().toISOString(),
          feedbackSignal: -1,
          reason
        }
      ]
    },
    factual: {
      ...tag.factual,
      changelog: [
        ...tag.factual.changelog,
        {
          timestamp: new Date().toISOString(),
          author: curatorId,
          diff: `Inferência ${inferenceId} rejeitada${reason ? `: ${reason}` : ''} — sinal negativo registrado para retreinamento`
        }
      ]
    }
  };
}
