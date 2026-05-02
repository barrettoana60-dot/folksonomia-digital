/**
 * Folksonomia Digital 2.0 — Motor de Grafo de Conhecimento
 * 
 * Gerencia triplas (head, relation, tail) com embeddings vetoriais.
 * Implementação atual: heurístico local com persistência no Supabase.
 * Futuro: RotatE treinado com PyTorch Geometric.
 */

import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { createLocalEmbedding } from './embeddings';
import { cosineSimilarity } from './similarity';
import type { KnowledgeTriple, MusealRelation, DataSource } from './types';

// ============================================================
// Inserção de Triplas
// ============================================================

/**
 * Adiciona uma tripla ao grafo de conhecimento.
 * Gera embeddings para head e tail automaticamente.
 */
export async function addTriple(
  head: string,
  relation: MusealRelation,
  tail: string,
  options: {
    confidence?: number;
    layer?: 'factual' | 'inferred' | 'validated';
    source?: DataSource;
    mechanism?: string;
  } = {}
): Promise<KnowledgeTriple | null> {
  const {
    confidence = 0.5,
    layer = 'inferred',
    source = 'inferred',
    mechanism = 'heuristic'
  } = options;

  // Gerar embeddings (384d → truncar para 256d)
  const headEmb = (await createLocalEmbedding(head)).slice(0, 256);
  const tailEmb = (await createLocalEmbedding(tail)).slice(0, 256);

  const triple: KnowledgeTriple = {
    id: `kg_${Date.now()}`,
    head,
    relation,
    tail,
    headEmbedding: headEmb,
    tailEmbedding: tailEmb,
    confidence,
    layer,
    source,
    mechanism,
    createdAt: new Date().toISOString()
  };

  // Persistir no Supabase
  const { error } = await supabase
    .from('knowledge_graph')
    .insert({
      head_entity: head,
      relation,
      tail_entity: tail,
      head_embedding: JSON.stringify(headEmb),
      tail_embedding: JSON.stringify(tailEmb),
      confidence,
      layer,
      source,
      mechanism
    });

  if (error) {
    console.warn('[KnowledgeGraph] Insert failed:', error);
    return triple; // Retorna o objeto mesmo sem persistência
  }

  return triple;
}

// ============================================================
// Consulta de Vizinhos
// ============================================================

/**
 * Busca todas as triplas conectadas a uma entidade.
 */
export async function findNeighbors(
  entity: string,
  maxResults: number = 20
): Promise<KnowledgeTriple[]> {
  const { data, error } = await supabase
    .from('knowledge_graph')
    .select('*')
    .or(`head_entity.eq.${entity},tail_entity.eq.${entity}`)
    .order('confidence', { ascending: false })
    .limit(maxResults);

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    head: row.head_entity,
    relation: row.relation as MusealRelation,
    tail: row.tail_entity,
    confidence: row.confidence,
    layer: row.layer,
    source: row.source as DataSource,
    mechanism: row.mechanism,
    createdAt: row.created_at
  }));
}

/**
 * Busca triplas por tipo de relação.
 */
export async function findByRelation(
  relation: MusealRelation,
  minConfidence: number = 0.3
): Promise<KnowledgeTriple[]> {
  const { data, error } = await supabase
    .from('knowledge_graph')
    .select('*')
    .eq('relation', relation)
    .gte('confidence', minConfidence)
    .order('confidence', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    head: row.head_entity,
    relation: row.relation as MusealRelation,
    tail: row.tail_entity,
    confidence: row.confidence,
    layer: row.layer,
    source: row.source as DataSource,
    mechanism: row.mechanism,
    createdAt: row.created_at
  }));
}

// ============================================================
// Inferência de Relações (Heurístico → RotatE futuro)
// ============================================================

/**
 * Dado um par de entidades, infere relações possíveis
 * baseado na similaridade dos embeddings.
 */
export async function inferRelations(
  entityA: string,
  entityB: string
): Promise<{ relation: MusealRelation; confidence: number }[]> {
  const embA = (await createLocalEmbedding(entityA)).slice(0, 256);
  const embB = (await createLocalEmbedding(entityB)).slice(0, 256);

  const sim = cosineSimilarity(embA, embB);
  const results: { relation: MusealRelation; confidence: number }[] = [];

  if (sim > 0.8) {
    results.push({ relation: 'mesma_tecnica', confidence: sim * 0.9 });
    results.push({ relation: 'mesmo_periodo', confidence: sim * 0.7 });
  } else if (sim > 0.5) {
    results.push({ relation: 'related_to', confidence: sim });
    results.push({ relation: 'influenciado_por', confidence: sim * 0.5 });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Promove uma tripla da camada inferida para validada.
 */
export async function validateTriple(
  tripleId: string,
  curatorId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('knowledge_graph')
    .update({
      layer: 'validated',
      confidence: 1.0,
      validated_by: curatorId,
      validated_at: new Date().toISOString()
    })
    .eq('id', tripleId);

  return !error;
}
