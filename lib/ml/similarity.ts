import { normalizeText } from '../core/normalize';
import { tokenizeText } from './embeddings';

/**
 * Calcula a similaridade de cosseno entre dois vetores de 384 dimensões.
 * Retorna valor entre -1 e 1 (sendo 1 idênticos e 0 ortogonais).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Distância de Levenshtein (edição) para correções ortográficas básicas
 */
export function levenshteinDistance(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  if (normA === normB) return 0;
  if (!normA) return normB.length;
  if (!normB) return normA.length;
  
  const matrix = [];
  for (let i = 0; i <= normB.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= normA.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= normB.length; i++) {
    for (let j = 1; j <= normA.length; j++) {
      if (normB.charAt(i - 1) === normA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }
  
  return matrix[normB.length][normA.length];
}

/**
 * Similaridade baseada em tokens (Jaccard Index)
 * Mede quão próximos dois textos são baseados em seus n-gramas e tokens.
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenizeText(a));
  const tokensB = new Set(tokenizeText(b));
  
  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;
  
  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionSize++;
    }
  }
  
  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return intersectionSize / unionSize;
}

/**
 * Algoritmo híbrido que combina métricas para um score semântico simulado.
 * Usa substrings, tokens e distância de edição.
 */
export function hybridSemanticSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  if (normA === normB) return 1.0;
  
  // Contenção direta (um está dentro do outro)
  if (normA.includes(normB) || normB.includes(normA)) {
    const lengthRatio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length);
    return 0.55 + 0.45 * lengthRatio;
  }
  
  const tokSim = tokenSimilarity(a, b);
  const levDist = levenshteinDistance(a, b);
  const maxLen = Math.max(normA.length, normB.length);
  const levSim = maxLen > 0 ? 1 - (levDist / maxLen) : 0;
  
  return (tokSim * 0.65) + (levSim * 0.35);
}
