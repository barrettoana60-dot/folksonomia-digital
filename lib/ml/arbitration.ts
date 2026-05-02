/**
 * Folksonomia Digital 2.0 — Motor de Arbitragem de Conflitos
 * 
 * Quando Europeana e IBRAM têm metadados diferentes sobre o mesmo objeto,
 * este módulo:
 * 1. Detecta o conflito
 * 2. Registra ambas as versões sem descartar nenhuma
 * 3. Aplica política de precedência baseada na confiabilidade da fonte
 * 4. Expõe ambiguidades para resolução curatorial
 */

import type { 
  ClassifiedField, 
  ConflictRecord, 
  DataSource, 
  FieldQualifier 
} from './types';

// ============================================================
// Política de Precedência por Fonte
// ============================================================

const SOURCE_PRIORITY: Record<DataSource, number> = {
  ibram: 0.9,           // IBRAM tem precedência — dados institucionais brasileiros
  europeana: 0.85,      // Europeana — agregador europeu de alta qualidade
  brasiliana: 0.8,      // Brasiliana — acervo digital brasileiro
  user_tag: 0.3,        // Tags de visitantes — menor confiança
  inferred: 0.2         // Inferido pelo sistema — requer validação
};

// Qualificadores que indicam incerteza no dado original
const UNCERTAINTY_MARKERS = [
  'circa', 'possivelmente', 'atribuido', 'atribuído',
  'provavel', 'provável', 'estimado', 'aproximadamente',
  'possibly', 'attributed', 'circa', 'around',
  'provavelmente', 'talvez', 'presumido'
];

// ============================================================
// Detecção de Qualificadores
// ============================================================

/**
 * Detecta se um valor contém marcadores de incerteza
 */
export function detectQualifier(value: string): FieldQualifier {
  if (!value || value.trim() === '') return 'empty';
  
  const lower = value.toLowerCase();
  for (const marker of UNCERTAINTY_MARKERS) {
    if (lower.includes(marker)) return 'estimated';
  }
  
  return 'verified';
}

// ============================================================
// Arbitragem de Conflitos
// ============================================================

/**
 * Compara dois campos do mesmo objeto vindos de fontes diferentes.
 * Retorna o campo vencedor e o registro de conflito.
 */
export function arbitrateConflict(
  fieldName: string,
  fieldA: ClassifiedField,
  fieldB: ClassifiedField
): { winner: ClassifiedField; conflict: ConflictRecord } {
  
  const priorityA = SOURCE_PRIORITY[fieldA.source] * fieldA.confidence;
  const priorityB = SOURCE_PRIORITY[fieldB.source] * fieldB.confidence;

  // Regra especial: dado verificado sempre vence estimado
  if (fieldA.qualifier === 'verified' && fieldB.qualifier === 'estimated') {
    return {
      winner: fieldA,
      conflict: buildConflictRecord(fieldName, fieldA, fieldB, 'sourceA_priority')
    };
  }
  if (fieldB.qualifier === 'verified' && fieldA.qualifier === 'estimated') {
    return {
      winner: fieldB,
      conflict: buildConflictRecord(fieldName, fieldA, fieldB, 'sourceB_priority')
    };
  }

  // Regra geral: fonte com maior prioridade ponderada pela confiança do modelo
  const resolution = priorityA >= priorityB ? 'sourceA_priority' : 'sourceB_priority';
  const winner = priorityA >= priorityB ? fieldA : fieldB;

  return {
    winner,
    conflict: buildConflictRecord(fieldName, fieldA, fieldB, resolution)
  };
}

/**
 * Reconcilia listas de campos de múltiplas fontes.
 * Campos sem conflito são mantidos diretamente.
 * Campos conflitantes passam pela arbitragem.
 */
export function reconcileFields(
  fieldsA: ClassifiedField[],
  fieldsB: ClassifiedField[],
  sourceA: DataSource,
  sourceB: DataSource
): { merged: ClassifiedField[]; conflicts: ConflictRecord[] } {
  
  const merged: ClassifiedField[] = [];
  const conflicts: ConflictRecord[] = [];
  const processedCategories = new Set<string>();

  for (const a of fieldsA) {
    const matching = fieldsB.find(b => b.category === a.category);
    
    if (!matching) {
      // Sem conflito — campo existe só em A
      merged.push(a);
    } else if (a.value.toLowerCase().trim() === matching.value.toLowerCase().trim()) {
      // Concordam — confiança máxima
      merged.push({
        ...a,
        confidence: Math.min(a.confidence * 1.2, 1.0),
        qualifier: 'verified'
      });
    } else {
      // Conflito real
      const { winner, conflict } = arbitrateConflict(a.category, a, matching);
      merged.push(winner);
      conflicts.push(conflict);
    }
    
    processedCategories.add(a.category);
  }

  // Campos que existem só em B
  for (const b of fieldsB) {
    if (!processedCategories.has(b.category)) {
      merged.push(b);
    }
  }

  return { merged, conflicts };
}

// ============================================================
// Helpers
// ============================================================

function buildConflictRecord(
  field: string,
  fieldA: ClassifiedField,
  fieldB: ClassifiedField,
  resolution: ConflictRecord['resolution']
): ConflictRecord {
  return {
    field,
    sourceA: {
      provider: fieldA.source,
      value: fieldA.value,
      timestamp: new Date().toISOString()
    },
    sourceB: {
      provider: fieldB.source,
      value: fieldB.value,
      timestamp: new Date().toISOString()
    },
    resolution
  };
}
