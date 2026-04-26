import { normalizeText } from './embeddings';

/**
 * Calcula a Confiança da tag (0 a 1)
 */
export function calculateConfidence(
  text: string, 
  context: any, 
  externalMatches: number, 
  humanValidations: number
): number {
  let score = 0.4; // Base score
  
  if (externalMatches > 0) score += 0.2;
  if (humanValidations > 0) score += 0.3;
  if (text.length > 3) score += 0.1;
  
  return Math.min(score, 1.0);
}

/**
 * Calcula a Novidade (0 a 1)
 */
export function calculateNovelty(
  text: string, 
  internalSimilarityMax: number, 
  isConceptMissing: boolean
): number {
  let score = 0.5;
  
  if (internalSimilarityMax < 0.3) score += 0.3;
  if (isConceptMissing) score += 0.2;
  
  return Math.min(score, 1.0);
}

/**
 * Calcula a Tensão Documental (0 a 1)
 * Alta quando a tag aponta sentido não presente na descrição institucional.
 */
export function calculateTension(
  tagText: string, 
  institutionalDesc: string, 
  semanticOverlap: number
): number {
  const normTag = normalizeText(tagText);
  const normDesc = normalizeText(institutionalDesc);
  
  if (normDesc.includes(normTag)) return 0.2; // Baixa tensão, já está previsto
  
  let score = 0.6; // Tensão média por padrão para novas leituras
  if (semanticOverlap < 0.2) score += 0.3; // Alta tensão se o sentido for muito diferente
  
  return Math.min(score, 1.0);
}

/**
 * Calcula a Ressonância (0 a 1)
 * Alta quando conecta muitas obras, tags e fontes.
 */
export function calculateResonance(
  connectionsCount: number, 
  externalSourcesCount: number
): number {
  let score = connectionsCount * 0.1 + externalSourcesCount * 0.15;
  return Math.min(score, 1.0);
}
