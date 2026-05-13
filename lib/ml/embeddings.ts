/**
 * Folksonomia Digital 2.0 — Motor de Embeddings
 * 
 * Dimensão padrão: 768 (compatível com ModernBERT-base)
 * 
 * Dois modos:
 * 1. Hash Embedding (fallback local, sem dependências externas)
 * 2. Semantic Embedding (via ML Service, ModernBERT-base + pooling)
 */

import { ML_SERVICE_URL } from '@/lib/core/env';
// Dimensão padrão dos vetores — DEVE corresponder ao banco (VECTOR(768))
export const EMBEDDING_DIMENSIONS = 768;

// Tipo para embeddings padronizados
export type EmbeddingVector = number[];

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  
  // 1. Unigramas
  const words = norm.split(' ');
  const unigrams = words.filter(t => t.length > 2);
  
  // 2. Bigramas para contexto
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i+1]}`);
  }

  // 3. N-gramas de caracteres (trigramas) para similaridade ortográfica
  const charNgrams: string[] = [];
  const clean = norm.replace(/\s/g, '');
  for (let i = 0; i < clean.length - 2; i++) {
    charNgrams.push(clean.substring(i, i + 3));
  }
  
  return [...unigrams, ...bigrams, ...charNgrams];
}


/**
 * Gera um vetor de EMBEDDING_DIMENSIONS dimensões usando hashing de tokens.
 * Cada token "vota" em posições aleatórias (mas fixas por token) do vetor.
 * 
 * FALLBACK LOCAL: Não entende semântica. Usado quando o ML Service está offline.
 * Para embeddings semânticos reais, use createSemanticEmbedding().
 */
export async function createHashEmbedding(text: string): Promise<EmbeddingVector> {
  const tokens = tokenize(text);
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  
  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    // Usar uma semente determinística por token
    let seed = 0;
    for (let i = 0; i < token.length; i++) {
      seed = (seed << 5) - seed + token.charCodeAt(i);
      seed |= 0; // Convert to 32bit integer
    }

    // Cada token afeta N dimensões (ex: 12 para melhor distribuição em 768d)
    for (let i = 0; i < 12; i++) {
      const pos = Math.abs((seed ^ (i * 0x517cc1b7)) % EMBEDDING_DIMENSIONS);
      const weight = (seed ^ (i * 0x9e3779b9)) > 0 ? 1 : -1;
      vector[pos] += weight;
    }
  }

  // Normalização L2 (Unit Vector)
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  
  return vector.map(v => v / magnitude);
}

/**
 * Gera embedding semântico real via ML Service (ModernBERT-base + pooling).
 * Retorna vetor de 768 dimensões com compreensão contextual.
 * 
 * Se o ML Service estiver offline, faz fallback para hash embedding.
 */
export async function createSemanticEmbedding(text: string): Promise<{
  vector: EmbeddingVector;
  source: 'ml_service' | 'hash_fallback';
}> {
  const mlServiceUrl = ML_SERVICE_URL;
  
  if (mlServiceUrl) {
    try {
      const res = await fetch(`${mlServiceUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.embedding && data.embedding.length === EMBEDDING_DIMENSIONS) {
          return { vector: data.embedding, source: 'ml_service' };
        }
      }
    } catch {
      console.warn('[Embeddings] ML Service offline, usando hash fallback');
    }
  }

  return { 
    vector: await createHashEmbedding(text), 
    source: 'hash_fallback' 
  };
}

/**
 * Wrapper principal — tenta semântico, fallback para hash.
 * Compatível com chamadas existentes.
 */
export async function createLocalEmbedding(text: string): Promise<EmbeddingVector> {
  const { vector } = await createSemanticEmbedding(text);
  return vector;
}

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct; // Vetores unitários → dot product = cosseno
}

export async function createCombinedEmbedding(values: string[]): Promise<EmbeddingVector> {
  const vectors = await Promise.all(values.map(v => createLocalEmbedding(v)));
  const combined = new Array(EMBEDDING_DIMENSIONS).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      combined[i] += vec[i];
    }
  }
  
  const magnitude = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return combined;
  
  return combined.map(v => v / magnitude);
}
