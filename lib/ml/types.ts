/**
 * Folksonomia Digital 2.0 — Tipos Fundamentais da Arquitetura ML
 * 
 * Define as estruturas de dados para:
 * - Tag Tricamada (Factual → Inferida → Validada)
 * - Campos Classificados com grau de confiança
 * - Pertencimento Múltiplo (Comunidades Sobrepostas)
 * - Observações Curatoriais (Map Graph como instrumento de aprendizado)
 */

// ============================================================
// Classificação de Tokens (Motor 1 — ModernBERT)
// ============================================================

export type TokenCategory = 
  | 'DATA' 
  | 'TECNICA' 
  | 'GEO' 
  | 'MATERIAL' 
  | 'AUTORIA' 
  | 'PROVENIENCIA'
  | 'QUALIFICADOR'
  | 'ICONOGRAFIA'
  | 'TEMA'
  | 'ESTILO'
  | 'MOVIMENTO'
  | 'CONSERVACAO'
  | 'PERIODO';

export type FieldQualifier = 'verified' | 'estimated' | 'empty';

export type FonteOficial = 'ibram' | 'brasiliana' | 'europeana' | 'tainacan';
export type FonteAuxiliar = 'dbpedia' | 'openalex';
export type DataSource = FonteOficial | FonteAuxiliar | 'user_tag' | 'inferred';

export interface ClassifiedField {
  value: string;
  category: TokenCategory;
  confidence: number;           // 0-1, do modelo NER
  qualifier: FieldQualifier;
  source: DataSource;
  conflictsWith?: ConflictRecord[];
}

export interface ConflictRecord {
  field: string;
  sourceA: { provider: string; value: string; timestamp: string };
  sourceB: { provider: string; value: string; timestamp: string };
  resolution: 'sourceA_priority' | 'sourceB_priority' | 'unresolved';
  resolvedBy?: string;  // curator ID
  resolvedAt?: string;
}

// ============================================================
// Grafo de Conhecimento (Motor 2 — RotatE)
// ============================================================

export type MusealRelation = 
  | 'pertence_a_acervo'
  | 'criado_por'
  | 'mesmo_periodo'
  | 'mesma_tecnica'
  | 'influenciado_por'
  | 'proveniencia_de'
  | 'conflito_com'
  | 'validado_como'
  | 'related_to';

export interface KnowledgeTriple {
  id: string;
  head: string;
  relation: MusealRelation;
  tail: string;
  headEmbedding?: number[];    // vetor 768d (ModernBERT-base)
  tailEmbedding?: number[];
  relationEmbedding?: number[];
  confidence: number;          // 0-1
  layer: 'factual' | 'inferred' | 'validated';
  source: DataSource;
  mechanism?: InferenceMechanism;
  createdAt: string;
  validatedBy?: string;
  validatedAt?: string;
}

// ============================================================
// Comunidades Sobrepostas (Motor 3 — GAT)
// ============================================================

export interface GroupMembership {
  groupId: string;
  groupName: string;
  weight: number;               // 0-1, grau de pertencimento
  contextRelevance: Record<string, number>;  // relevância varia por consulta
}

export interface MultiMembership {
  entityId: string;
  memberships: GroupMembership[];
}

// ============================================================
// Tag Tricamada (Motor 4)
// ============================================================

export type InferenceMechanism = 'rotate' | 'gat' | 'modernbert' | 'hybrid' | 'heuristic';

export interface InferredRelation {
  id: string;
  target: string;
  type: MusealRelation;
  confidence: number;          // 0-1
  mechanism: InferenceMechanism;
  createdAt: string;
}

export interface ValidatedRelation {
  originalInferenceId: string;
  validatedBy: string;         // curator ID
  validatedAt: string;
  weight: number;              // 1.0 = peso máximo
}

export interface RejectedInference {
  inferenceId: string;
  rejectedBy: string;
  rejectedAt: string;
  feedbackSignal: number;      // -1 retorna como dado de treinamento
  reason?: string;
}

export interface FactualLayer {
  fields: ClassifiedField[];
  sources: { provider: string; ingestedAt: string; raw: unknown }[];
  changelog: { timestamp: string; author: string; diff: string }[];
}

export interface InferredLayer {
  relations: InferredRelation[];
  clusters: MultiMembership;
  embedding: number[];         // vetor 768d (ModernBERT-base)
}

export interface ValidatedLayer {
  approvedRelations: ValidatedRelation[];
  rejectedInferences: RejectedInference[];
}

export interface SemanticTag {
  id: string;
  normalized: string;
  dna: string;                 // SHA-256

  factual: FactualLayer;
  inferred: InferredLayer;
  validated: ValidatedLayer;
}

// ============================================================
// Observações Curatoriais (Map Graph)
// ============================================================

export type CuratorAction = 'confirm_connection' | 'reject_connection' | 'suggest_new' | 'annotate';

export interface TrainingSignal {
  positivePairs?: [string, string][];   // "estes devem estar conectados"
  negativePairs?: [string, string][];   // "estes NÃO devem estar conectados"
  newRelation?: { head: string; relation: MusealRelation; tail: string };
}

export interface CuratorObservation {
  id: string;
  curatorId: string;
  timestamp: string;
  observedNodes: string[];
  observedPattern: string;     // descrição livre
  action: CuratorAction;
  trainingSignal: TrainingSignal;
}
