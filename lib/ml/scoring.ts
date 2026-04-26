import { normalizeText } from '../core/normalize';

/**
 * Calcula o nível de confiança (0 a 1) baseado na robustez da informação.
 */
export function calculateConfidence(tag: string, context?: any, externalMatchesCount: number = 0, existingFrequency: number = 0): number {
  let score = 0.4; // Base confidence
  
  const norm = normalizeText(tag);
  
  // Palavras muito curtas têm menor confiança intrínseca
  if (norm.length > 3) score += 0.1;
  if (norm.length > 6) score += 0.05;
  
  // Validação cruzada com open data aumenta drasticamente a confiança
  if (externalMatchesCount > 0) {
    score += Math.min(0.3, externalMatchesCount * 0.1);
  }
  
  // Concordância (frequência histórica)
  if (existingFrequency > 0) {
    score += Math.min(0.2, existingFrequency * 0.05);
  }
  
  // Se veio com contexto rico estruturado
  if (context && Object.keys(context).length > 1) {
    score += 0.05;
  }
  
  return Math.min(0.99, Number(score.toFixed(3)));
}

/**
 * Calcula o índice de novidade (0 a 1).
 * Quão disruptiva ou inédita é essa tag em relação ao corpus atual.
 */
export function calculateNovelty(tag: string, maxSimilarityToExisting: number, isNewToken: boolean = false): number {
  let novelty = 0.5; // Base
  
  // Se é muito parecida com algo que já existe, novidade é baixa
  novelty -= maxSimilarityToExisting * 0.4;
  
  // Se é um token que nunca foi visto
  if (isNewToken) {
    novelty += 0.4;
  }
  
  // Se a tag é longa (possível descrição complexa), costuma ser mais "nova"
  const wordCount = normalizeText(tag).split(/\s+/).length;
  if (wordCount > 1) {
    novelty += Math.min(0.2, (wordCount - 1) * 0.05);
  }
  
  return Math.min(0.99, Math.max(0.01, Number(novelty.toFixed(3))));
}

/**
 * Calcula a tensão documental (0 a 1).
 * Indica se a tag de folksonomia popular entra em conflito com descrições formais (ontologias institucionais).
 */
export function calculateTension(tag: string, ontologyMatchesCount: number, institutionalMetadataSimilarity: number): number {
  let tension = 0.2; // Base de atrito inerente da folksonomia
  
  // Se a tag bate perfeitamente com a ontologia formal, tensão é baixíssima
  if (ontologyMatchesCount > 0) {
    tension -= 0.15;
  } else {
    // Se não bate com nada formal, aumenta a tensão (pode ser gíria, visão nova)
    tension += 0.3;
  }
  
  // Se a tag tem pouquíssima similaridade com a descrição institucional, é uma leitura subversiva ou divergente
  if (institutionalMetadataSimilarity < 0.2) {
    tension += 0.3;
  } else if (institutionalMetadataSimilarity > 0.7) {
    tension -= 0.2; // Está apenas ecoando a voz institucional
  }
  
  return Math.min(0.99, Math.max(0.01, Number(tension.toFixed(3))));
}

/**
 * Calcula a ressonância (0 a 1).
 * A capacidade deste núcleo de conectar informações (densidade de arestas no grafo).
 */
export function calculateResonance(tag: string, internalConnectionsCount: number, externalMatchesCount: number): number {
  let resonance = 0.1;
  
  // Conexões dentro do próprio acervo
  resonance += Math.min(0.5, internalConnectionsCount * 0.05);
  
  // Conexões com o mundo exterior (open data)
  resonance += Math.min(0.4, externalMatchesCount * 0.1);
  
  return Math.min(0.99, Math.max(0.01, Number(resonance.toFixed(3))));
}
