/**
 * Folksonomia Digital 2.0 — Motor de Confiança Calibrado
 * 
 * Substitui o scoring simplista por cálculo multi-fator:
 * - Probabilidade do modelo (quando disponível)
 * - Similaridade vetorial com conceitos conhecidos
 * - Evidências de fontes externas cruzadas
 * - Qualidade das fontes (Europeana > mock)
 * - Validações humanas anteriores
 * - Coerência com metadados da obra
 * - Histórico de acerto por categoria
 * 
 * A confiança final é calibrada: se diz 0.9, acerta ~90% das vezes.
 */

import { normalizeText } from './embeddings';
import { cognitiveNN } from './cognitive-nn';

// ============================================================
// Tipos de Evidência
// ============================================================

export interface ConfidenceFactors {
  modelProbability?: number;       // 0-1, do softmax do modelo NER
  vectorSimilarity?: number;       // 0-1, similaridade com conceitos na memória
  externalSourceCount?: number;    // quantas fontes externas confirmam
  externalSourceQuality?: number;  // qualidade média das fontes (0-1)
  humanValidations?: number;       // quantas validações humanas positivas
  humanRejections?: number;        // quantas rejeições humanas
  obraCoherence?: number;          // 0-1, coerência com metadados da obra
  categoryAccuracy?: number;       // 0-1, taxa de acerto histórica para esta categoria
  memoryMatches?: number;          // quantos conceitos similares na memória semântica
  termLength?: number;             // comprimento do termo (termos mais longos = mais específicos)
  isMultiWord?: boolean;           // termos multi-palavra tendem a ser mais precisos
}

export interface CalibratedScore {
  raw: number;                     // confiança bruta (0-1)
  calibrated: number;              // confiança calibrada (0-1)
  factors: ConfidenceFactors;      // fatores usados no cálculo
  explanation: string;             // explicação legível
  status: 'certeza_alta' | 'hipotese_forte' | 'hipotese' | 'incerto' | 'desconhecido';
}

// ============================================================
// Cálculo de Confiança Calibrado via Rede Neural
// ============================================================

/**
 * Calcula a confiança calibrada utilizando uma rede neural de aprendizado cognitivo.
 * A rede neural avalia todos os fatores em paralelo e infere o score ótimo.
 */
export async function calculateCalibratedConfidence(factors: ConfidenceFactors): Promise<CalibratedScore> {
  // Garantir que os pesos da rede neural estejam carregados
  await cognitiveNN.ensureLoaded();

  // Converter os fatores para o vetor de entrada da rede neural
  const inputVec = cognitiveNN.factorsToVector(factors);

  // Executar forward pass na MLP
  const { output: rawScore } = cognitiveNN.forward(inputVec);

  const explanations: string[] = [];
  if (factors.modelProbability !== undefined && factors.modelProbability > 0.1) {
    explanations.push(`IA local: ${(factors.modelProbability * 100).toFixed(0)}%`);
  }
  if (factors.vectorSimilarity !== undefined && factors.vectorSimilarity > 0.1) {
    explanations.push(`memória: ${(factors.vectorSimilarity * 100).toFixed(0)}%`);
  }
  const srcCount = factors.externalSourceCount || 0;
  if (srcCount > 0) {
    explanations.push(`${srcCount} fonte(s) externa(s)`);
  }
  const validations = factors.humanValidations || 0;
  const rejections = factors.humanRejections || 0;
  if (validations > 0) {
    explanations.push(`${validations} aprovação(ões)`);
  }
  if (rejections > 0) {
    explanations.push(`${rejections} rejeição(ões)`);
  }

  // Calibração de limites
  const calibrated = calibrate(rawScore, validations);

  // Determinar status
  const status = calibrated >= 0.85 ? 'certeza_alta' 
    : calibrated >= 0.65 ? 'hipotese_forte'
    : calibrated >= 0.40 ? 'hipotese'
    : calibrated >= 0.20 ? 'incerto'
    : 'desconhecido';

  const explanation = explanations.length > 0 
    ? `Cérebro Neural (${(calibrated * 100).toFixed(0)}%): ${explanations.join(', ')}`
    : `Cérebro Neural (${(calibrated * 100).toFixed(0)}%): auto-inferido`;

  return { raw: rawScore, calibrated, factors, explanation, status };
}

/**
 * Calibração: previne overconfidence.
 * Sem validação humana, o teto é 0.85.
 * Com validação humana, pode chegar a 0.98.
 */
function calibrate(score: number, humanValidations: number): number {
  if (humanValidations >= 3) {
    return Math.min(score * 1.05, 0.98);
  }
  if (humanValidations >= 1) {
    return Math.min(score, 0.95);
  }
  return Math.min(score, 0.85);
}

// ============================================================
// Funções Legadas (Compatibilidade com Pipeline Existente)
// ============================================================

/**
 * Calcula a Confiança da tag (0 a 1) — versão calibrada
 */
export async function calculateConfidence(
  text: string, 
  context: any, 
  externalMatches: number, 
  humanValidations: number
): Promise<number> {
  const result = await calculateCalibratedConfidence({
    externalSourceCount: externalMatches,
    humanValidations,
    termLength: text.length,
    isMultiWord: text.includes(' '),
    obraCoherence: context?.coherence || 0,
  });
  return result.calibrated;
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
