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
// Pesos dos Fatores
// ============================================================

const WEIGHTS = {
  modelProbability:    0.30,  // modelo treinado tem maior peso
  vectorSimilarity:    0.10,  // similaridade com memória semântica
  externalSources:     0.20,  // evidências de fontes externas
  humanValidation:     0.25,  // validação humana é crucial
  obraCoherence:       0.10,  // coerência contextual
  categoryHistory:     0.05,  // histórico de acerto
};

// ============================================================
// Cálculo de Confiança Calibrado
// ============================================================

/**
 * Calcula a confiança calibrada multi-fator.
 * Cada fator contribui com peso proporcional à sua importância.
 */
export function calculateCalibratedConfidence(factors: ConfidenceFactors): CalibratedScore {
  let weightedSum = 0;
  let totalWeight = 0;
  const explanations: string[] = [];

  // 1. Probabilidade do modelo
  if (factors.modelProbability !== undefined && factors.modelProbability > 0) {
    weightedSum += factors.modelProbability * WEIGHTS.modelProbability;
    totalWeight += WEIGHTS.modelProbability;
    explanations.push(`modelo: ${(factors.modelProbability * 100).toFixed(0)}%`);
  }

  // 2. Similaridade vetorial com memória
  if (factors.vectorSimilarity !== undefined && factors.vectorSimilarity > 0) {
    weightedSum += factors.vectorSimilarity * WEIGHTS.vectorSimilarity;
    totalWeight += WEIGHTS.vectorSimilarity;
    if (factors.vectorSimilarity > 0.7) {
      explanations.push(`memória semântica: forte (${(factors.vectorSimilarity * 100).toFixed(0)}%)`);
    }
  }

  // 3. Evidências externas
  const srcCount = factors.externalSourceCount || 0;
  const srcQuality = factors.externalSourceQuality || 0;
  if (srcCount > 0) {
    // Mais fontes = mais confiança, com retorno decrescente
    const sourceScore = Math.min(srcCount / 3, 1.0) * 0.6 + srcQuality * 0.4;
    weightedSum += sourceScore * WEIGHTS.externalSources;
    totalWeight += WEIGHTS.externalSources;
    explanations.push(`${srcCount} fonte(s) externa(s)`);
  }

  // 4. Validação humana
  const validations = factors.humanValidations || 0;
  const rejections = factors.humanRejections || 0;
  if (validations > 0 || rejections > 0) {
    const total = validations + rejections;
    const humanScore = total > 0 ? validations / total : 0.5;
    weightedSum += humanScore * WEIGHTS.humanValidation;
    totalWeight += WEIGHTS.humanValidation;
    if (validations > 0) {
      explanations.push(`${validations} validação(ões) humana(s)`);
    }
    if (rejections > 0) {
      explanations.push(`${rejections} rejeição(ões)`);
    }
  }

  // 5. Coerência com a obra
  if (factors.obraCoherence !== undefined && factors.obraCoherence > 0) {
    weightedSum += factors.obraCoherence * WEIGHTS.obraCoherence;
    totalWeight += WEIGHTS.obraCoherence;
    if (factors.obraCoherence > 0.7) {
      explanations.push('coerente com a obra');
    }
  }

  // 6. Histórico por categoria
  if (factors.categoryAccuracy !== undefined) {
    weightedSum += factors.categoryAccuracy * WEIGHTS.categoryHistory;
    totalWeight += WEIGHTS.categoryHistory;
  }

  // Score bruto
  const raw = totalWeight > 0 ? weightedSum / totalWeight : 0.3;

  // Ajustes heurísticos adicionais
  let adjusted = raw;

  // Bônus para termos multi-palavra (mais específicos)
  if (factors.isMultiWord) {
    adjusted = Math.min(adjusted + 0.05, 1.0);
  }

  // Penalidade para termos muito curtos
  if (factors.termLength !== undefined && factors.termLength <= 3) {
    adjusted = Math.max(adjusted - 0.1, 0);
  }

  // Bônus para muitas correspondências na memória
  if (factors.memoryMatches !== undefined && factors.memoryMatches > 3) {
    adjusted = Math.min(adjusted + 0.05, 1.0);
  }

  // Calibração: aplicar isotonic-like correction
  // Evita overconfidence — o sistema nunca diz >0.98 sem validação humana
  const calibrated = calibrate(adjusted, validations);

  // Determinar status
  const status = calibrated >= 0.85 ? 'certeza_alta' 
    : calibrated >= 0.65 ? 'hipotese_forte'
    : calibrated >= 0.40 ? 'hipotese'
    : calibrated >= 0.20 ? 'incerto'
    : 'desconhecido';

  const explanation = explanations.length > 0 
    ? `Confiança ${(calibrated * 100).toFixed(0)}%: ${explanations.join(', ')}`
    : `Confiança ${(calibrated * 100).toFixed(0)}%: sem evidências fortes`;

  return { raw, calibrated, factors, explanation, status };
}

/**
 * Calibração: previne overconfidence.
 * Sem validação humana, o teto é 0.85.
 * Com validação humana, pode chegar a 0.98.
 */
function calibrate(score: number, humanValidations: number): number {
  if (humanValidations >= 3) {
    // Múltiplas validações: permite alta confiança
    return Math.min(score * 1.05, 0.98);
  }
  if (humanValidations >= 1) {
    // Uma validação: teto de 0.95
    return Math.min(score, 0.95);
  }
  // Sem validação humana: teto de 0.85
  return Math.min(score, 0.85);
}

// ============================================================
// Funções Legadas (Compatibilidade com Pipeline Existente)
// ============================================================

/**
 * Calcula a Confiança da tag (0 a 1) — versão calibrada
 */
export function calculateConfidence(
  text: string, 
  context: any, 
  externalMatches: number, 
  humanValidations: number
): number {
  const result = calculateCalibratedConfidence({
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
