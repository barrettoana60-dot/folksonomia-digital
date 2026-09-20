/**
 * Identidade Computacional da Tag
 *
 * Cada tag possui uma identidade persistente composta por:
 *   - tag_id: identificador estável, gerado a partir do label normalizado
 *   - version: número de versão, incrementado a cada alteração relevante
 *   - digest: impressão digital SHA-256 do estado atual do registro
 *   - relations: relações com outras tags e conceitos culturais
 *   - sources: fontes externas com origem preservada
 *   - objects: obras e objetos culturais vinculados
 *   - contributions: contribuições associadas a esta tag
 *   - provenance: cadeia de proveniência verificável
 *
 * O SHA-256 NÃO é armazenamento. É a impressão digital criptográfica do estado.
 * As informações ficam no registro estruturado vinculado ao tag_id.
 */

import { canonicalize, generateSignature } from './crypto';

// ─── TIPOS PÚBLICOS ──────────────────────────────────────────────────────────

export interface TagRelation {
  /** ID da tag ou conceito relacionado */
  targetId: string;
  /** Label legível da tag ou conceito relacionado */
  targetLabel: string;
  /** Tipo de relação (ex: skos:related, skos:closeMatch, skos:broader) */
  relationType: string;
  /** Origem da relação (ex: "Wikidata Q12345", "usuário", "sistema") */
  source: string;
  /** Evidência textual ou URI que sustenta a relação */
  evidence?: string;
}

export interface TagSource {
  /** Identificador externo da fonte (ex: URI Wikidata, ID Europeana) */
  sourceId?: string;
  /** Nome legível da fonte */
  label: string;
  /** URL de acesso */
  url?: string;
  /** Tipo da fonte */
  type:
    | 'user_contribution'
    | 'institutional_acervo'
    | 'academic_reference'
    | 'wikidata'
    | 'wikipedia'
    | 'europeana'
    | 'brasiliana'
    | 'ibram'
    | 'tainacan'
    | 'mapas_culturais'
    | 'dados_cultura'
    | 'external';
  /** Nome do conector/adaptador que trouxe este resultado */
  connector: string;
  /** Pontuação de correspondência (0–1) */
  matchScore?: number;
  /** Tipo de correspondência SKOS */
  skosRelation?: string;
}

export interface TagObject {
  /** ID da obra/objeto no sistema */
  objectId: string;
  /** Título da obra */
  title: string;
  /** Tipo do objeto (ex: 'obra', 'documento', 'artefato') */
  objectType: string;
  /** URL de acesso ao objeto */
  url?: string;
}

export interface TagContribution {
  /** Identificador único da contribuição */
  contributionId: string;
  /** ID da tag associada */
  tagId: string;
  /** ID do objeto/obra associado */
  objectId?: string;
  /** ID da fonte associada */
  sourceId?: string;
  /** Timestamp da contribuição */
  timestamp: string;
  /** Tipo da contribuição */
  type: 'criacao' | 'relacao' | 'fonte' | 'revisao' | 'validacao' | 'exportacao';
  /** Conteúdo descritivo da contribuição */
  content?: string;
  /** Hash do estado anterior do registro */
  previousState?: string;
  /** Hash do estado atual do registro */
  currentState: string;
  /** Impressão digital desta contribuição */
  digest: string;
  /** Relações desta contribuição com outras contribuições */
  relationships?: string[];
  /** Hash anônimo do contribuidor (privacidade preservada) */
  contributorHash?: string;
}

export interface TagProvenance {
  /** Evento de proveniência */
  eventType: 'genesis' | 'update' | 'relation_added' | 'source_added' | 'validation' | 'export';
  /** Timestamp do evento */
  occurredAt: string;
  /** Hash do estado antes do evento */
  previousDigest: string | null;
  /** Hash do estado após o evento */
  currentDigest: string;
  /** Versão após o evento */
  version: number;
  /** Agente responsável (ex: 'user_contribution', 'curation', 'system', 'connector:wikidata') */
  actor: string;
  /** Descrição do evento */
  description?: string;
}

export interface TagIdentity {
  /** Label visível ao usuário (ex: "boi") */
  tag: string;
  /** Identificador único e estável da identidade */
  tagId: string;
  /** Número de versão atual (incrementa a cada alteração relevante) */
  version: number;
  /**
   * Impressão digital SHA-256 do estado atual do registro.
   * Formato: "sha256:<hex>"
   * NÃO é armazenamento — é verificação de integridade.
   */
  digest: string;
  /** Label normalizado (sem acentos, lowercase, underscores) */
  normalizedLabel: string;
  /** Eixo cultural principal */
  eixo?: string;
  /** Timestamp de criação */
  createdAt: string;
  /** Timestamp da última atualização */
  updatedAt: string;
  /** Relações com outras tags e conceitos */
  relations: TagRelation[];
  /** Fontes externas vinculadas com origem preservada */
  sources: TagSource[];
  /** Obras e objetos culturais vinculados */
  objects: TagObject[];
  /** Contribuições associadas a esta tag */
  contributions: TagContribution[];
  /** Cadeia de proveniência verificável */
  provenance: TagProvenance[];
}

// ─── ESTADO SERIALIZÁVEL PARA O DIGEST ───────────────────────────────────────

export interface TagStateSnapshot {
  tagId: string;
  tag: string;
  normalizedLabel: string;
  version: number;
  eixo?: string;
  relations: Array<Pick<TagRelation, 'targetId' | 'relationType' | 'source'>>;
  sources: Array<Pick<TagSource, 'sourceId' | 'type' | 'connector'>>;
  objects: Array<Pick<TagObject, 'objectId' | 'objectType'>>;
  contributionCount: number;
}

// ─── FUNÇÕES PRINCIPAIS ───────────────────────────────────────────────────────

/**
 * Gera um tag_id estável a partir do label normalizado.
 * O identificador é determinístico: o mesmo label sempre gera o mesmo tag_id.
 */
export function generateTagId(normalizedLabel: string): string {
  const seed = canonicalize({ domain: 'folksonomia-digital/tag-identity/v1', label: normalizedLabel });
  const hash = generateSignature(seed);
  return `tag_${hash.slice(0, 24)}`;
}

/**
 * Serializa o estado atual do registro em um snapshot canônico.
 * Apenas os campos relevantes para verificação de integridade são incluídos.
 */
export function serializeTagState(identity: Pick<TagIdentity, 'tagId' | 'tag' | 'normalizedLabel' | 'version' | 'eixo' | 'relations' | 'sources' | 'objects' | 'contributions'>): TagStateSnapshot {
  return {
    tagId: identity.tagId,
    tag: identity.tag,
    normalizedLabel: identity.normalizedLabel,
    version: identity.version,
    eixo: identity.eixo,
    relations: [...identity.relations]
      .sort((a, b) => `${a.targetId}:${a.relationType}`.localeCompare(`${b.targetId}:${b.relationType}`))
      .map(r => ({ targetId: r.targetId, relationType: r.relationType, source: r.source })),
    sources: [...identity.sources]
      .sort((a, b) => `${a.connector}:${a.sourceId || a.type}`.localeCompare(`${b.connector}:${b.sourceId || b.type}`))
      .map(s => ({ sourceId: s.sourceId, type: s.type, connector: s.connector })),
    objects: [...identity.objects]
      .sort((a, b) => a.objectId.localeCompare(b.objectId))
      .map(o => ({ objectId: o.objectId, objectType: o.objectType })),
    contributionCount: identity.contributions.length,
  };
}

/**
 * Calcula o digest SHA-256 do estado atual do registro.
 * Retorna no formato "sha256:<hex>".
 *
 * O digest NÃO armazena dados — é a impressão digital criptográfica
 * que permite verificar se o estado foi alterado.
 */
export function computeTagDigest(snapshot: TagStateSnapshot): string {
  const canonical = canonicalize({
    domain: 'folksonomia-digital/tag-digest/v1',
    snapshot,
  });
  const hex = generateSignature(canonical);
  return `sha256:${hex}`;
}

/**
 * Cria um registro de proveniência ao criar ou atualizar uma identidade.
 */
export function createProvenanceRecord(params: {
  eventType: TagProvenance['eventType'];
  previousDigest: string | null;
  currentDigest: string;
  version: number;
  actor: string;
  description?: string;
}): TagProvenance {
  return {
    eventType: params.eventType,
    occurredAt: new Date().toISOString(),
    previousDigest: params.previousDigest,
    currentDigest: params.currentDigest,
    version: params.version,
    actor: params.actor,
    description: params.description,
  };
}

/**
 * Cria uma nova identidade de tag a partir de um label.
 * Gera tag_id, version=1, digest inicial e registro de proveniência de gênese.
 */
export function createTagIdentity(params: {
  tag: string;
  normalizedLabel: string;
  eixo?: string;
  objectId?: string;
  objectTitle?: string;
  contributorHash?: string;
}): TagIdentity {
  const tagId = generateTagId(params.normalizedLabel);
  const now = new Date().toISOString();

  const baseIdentity = {
    tagId,
    tag: params.tag,
    normalizedLabel: params.normalizedLabel,
    version: 1,
    eixo: params.eixo,
    relations: [] as TagRelation[],
    sources: [] as TagSource[],
    objects: params.objectId
      ? [{ objectId: params.objectId, title: params.objectTitle || '', objectType: 'obra' }]
      : [] as TagObject[],
    contributions: [] as TagContribution[],
  };

  const snapshot = serializeTagState(baseIdentity);
  const digest = computeTagDigest(snapshot);

  const genesisContribution: TagContribution = {
    contributionId: generateSignature(canonicalize({ tagId, timestamp: now, type: 'criacao' })).slice(0, 24),
    tagId,
    objectId: params.objectId,
    timestamp: now,
    type: 'criacao',
    content: `Identidade criada para a tag "${params.tag}"`,
    previousState: null as unknown as string,
    currentState: digest,
    digest: computeTagDigest(snapshot),
    contributorHash: params.contributorHash,
  };

  const genesisProvenance = createProvenanceRecord({
    eventType: 'genesis',
    previousDigest: null,
    currentDigest: digest,
    version: 1,
    actor: 'user_contribution',
    description: `Tag "${params.tag}" registrada como identidade computacional`,
  });

  return {
    tag: params.tag,
    tagId,
    version: 1,
    digest,
    normalizedLabel: params.normalizedLabel,
    eixo: params.eixo,
    createdAt: now,
    updatedAt: now,
    relations: [],
    sources: [],
    objects: baseIdentity.objects,
    contributions: [genesisContribution],
    provenance: [genesisProvenance],
  };
}

/**
 * Aplica uma atualização à identidade existente.
 * Incrementa version, recalcula digest, registra proveniência.
 *
 * Implementa a cadeia:
 *   estado_anterior → estado_atual → novo_digest
 */
export function applyTagUpdate(
  existing: TagIdentity,
  update: {
    relationsToAdd?: TagRelation[];
    sourcesToAdd?: TagSource[];
    objectsToAdd?: TagObject[];
    contributionToAdd?: Omit<TagContribution, 'tagId' | 'previousState' | 'currentState' | 'digest'>;
    actor?: string;
    eventType?: TagProvenance['eventType'];
    description?: string;
  },
): TagIdentity {
  const previousDigest = existing.digest;
  const now = new Date().toISOString();

  const mergedRelations = mergeRelations(existing.relations, update.relationsToAdd || []);
  const mergedSources = mergeSources(existing.sources, update.sourcesToAdd || []);
  const mergedObjects = mergeObjects(existing.objects, update.objectsToAdd || []);
  const newVersion = existing.version + 1;

  const snapshot = serializeTagState({
    ...existing,
    version: newVersion,
    relations: mergedRelations,
    sources: mergedSources,
    objects: mergedObjects,
    contributions: existing.contributions,
  });
  const newDigest = computeTagDigest(snapshot);

  const newContribution: TagContribution | null = update.contributionToAdd
    ? {
        ...update.contributionToAdd,
        tagId: existing.tagId,
        previousState: previousDigest,
        currentState: newDigest,
        digest: computeTagDigest(serializeTagState({
          ...existing,
          version: newVersion,
          relations: mergedRelations,
          sources: mergedSources,
          objects: mergedObjects,
          contributions: [...existing.contributions, { tagId: existing.tagId } as TagContribution],
        })),
      }
    : null;

  const provenanceRecord = createProvenanceRecord({
    eventType: update.eventType || 'update',
    previousDigest,
    currentDigest: newDigest,
    version: newVersion,
    actor: update.actor || 'system',
    description: update.description,
  });

  return {
    ...existing,
    version: newVersion,
    digest: newDigest,
    updatedAt: now,
    relations: mergedRelations,
    sources: mergedSources,
    objects: mergedObjects,
    contributions: newContribution ? [...existing.contributions, newContribution] : existing.contributions,
    provenance: [...existing.provenance, provenanceRecord],
  };
}

/**
 * Verifica se um digest corresponde ao estado atual de uma identidade.
 */
export function verifyTagDigest(identity: TagIdentity): {
  valid: boolean;
  expected: string;
  actual: string;
} {
  const snapshot = serializeTagState(identity);
  const expected = computeTagDigest(snapshot);
  return {
    valid: expected === identity.digest,
    expected,
    actual: identity.digest,
  };
}

/**
 * Verifica a cadeia de proveniência, garantindo que cada entrada
 * aponte para o digest correto da entrada anterior.
 */
export function verifyProvenanceChain(provenance: TagProvenance[]): {
  valid: boolean;
  brokenAt?: number;
} {
  for (let i = 1; i < provenance.length; i++) {
    const current = provenance[i];
    const previous = provenance[i - 1];
    if (current.previousDigest !== previous.currentDigest) {
      return { valid: false, brokenAt: i };
    }
  }
  return { valid: true };
}

// ─── UTILITÁRIOS INTERNOS ─────────────────────────────────────────────────────

function mergeRelations(existing: TagRelation[], toAdd: TagRelation[]): TagRelation[] {
  const seen = new Set(existing.map(r => `${r.targetId}:${r.relationType}:${r.source}`));
  const newOnes = toAdd.filter(r => !seen.has(`${r.targetId}:${r.relationType}:${r.source}`));
  return [...existing, ...newOnes];
}

function mergeSources(existing: TagSource[], toAdd: TagSource[]): TagSource[] {
  const seen = new Set(existing.map(s => `${s.connector}:${s.sourceId || s.url || s.label}`));
  const newOnes = toAdd.filter(s => !seen.has(`${s.connector}:${s.sourceId || s.url || s.label}`));
  return [...existing, ...newOnes];
}

function mergeObjects(existing: TagObject[], toAdd: TagObject[]): TagObject[] {
  const seen = new Set(existing.map(o => o.objectId));
  const newOnes = toAdd.filter(o => !seen.has(o.objectId));
  return [...existing, ...newOnes];
}

/**
 * Converte uma TagIdentity para o formato de exibição da interface,
 * omitindo detalhes internos desnecessários para o usuário.
 */
export function toDisplayFormat(identity: TagIdentity): {
  tag: string;
  tagId: string;
  version: number;
  digest: string;
  eixo?: string;
  createdAt: string;
  updatedAt: string;
  relationsCount: number;
  sourcesCount: number;
  objectsCount: number;
  contributionsCount: number;
  lastProvenance?: Pick<TagProvenance, 'eventType' | 'occurredAt' | 'actor'>;
} {
  const last = identity.provenance[identity.provenance.length - 1];
  return {
    tag: identity.tag,
    tagId: identity.tagId,
    version: identity.version,
    digest: identity.digest,
    eixo: identity.eixo,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    relationsCount: identity.relations.length,
    sourcesCount: identity.sources.length,
    objectsCount: identity.objects.length,
    contributionsCount: identity.contributions.length,
    lastProvenance: last
      ? { eventType: last.eventType, occurredAt: last.occurredAt, actor: last.actor }
      : undefined,
  };
}
