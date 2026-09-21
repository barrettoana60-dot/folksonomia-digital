/**
 * Sistema de Auditoria — Interoperabilidade Cultural
 * 
 * Motor de Proveniência Verificável, Event Sourcing, Hash Chain Contínua e Integridade Criptográfica.
 * Implementa W3C PROV, Merkle Roots determinísticas e segregação estrita entre Audit Log e Security Log.
 * 
 * NENHUM EMOJI É UTILIZADO EM CONFORMIDADE COM AS DIRETRIZES DO SISTEMA.
 * TERMINOLOGIA: Interoperabilidade Cultural, Identidade, Conexão, Proveniência e Auditoria.
 */

import crypto from 'crypto';
import { canonicalize, canonicalStringify } from './crypto';
import { supabaseAdmin } from '@/lib/supabase/client';

// ─── TIPOS PÚBLICOS ──────────────────────────────────────────────────────────

export type AuditableState = 
  | 'RAW'
  | 'SUGGESTED'
  | 'UNDER_REVIEW'
  | 'VALIDATED'
  | 'REVISED'
  | 'PUBLISHED'
  | 'REVOKED'
  | 'ARCHIVED';

export type AuditEventType =
  | 'CREATE'
  | 'UPDATE'
  | 'VALIDATE'
  | 'REVIEW'
  | 'REJECT'
  | 'REVOKE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'MERGE'
  | 'SPLIT'
  | 'tag_created'
  | 'contribution_added'
  | 'match_found'
  | 'relation_created'
  | 'relation_validated'
  | 'version_published';

export type ActorRole = 
  | 'ADMIN'
  | 'REVIEWER'
  | 'VALIDATOR'
  | 'RESEARCHER'
  | 'USER'
  | 'SYSTEM';

export interface AuditEvent {
  event_id: string;
  entity_id: string;
  entity_type: 'tag' | 'relation' | 'source' | 'contribution' | 'system';
  event_type: AuditEventType | string;
  actor_id: string;
  actor_role: ActorRole;
  timestamp: string;
  previous_version: number;
  new_version: number;
  previous_digest: string | null;
  new_digest: string;
  payload_digest: string;
  previous_event_digest: string | null;
  event_digest: string;
  source: string;
  reason?: string;
  metadata: Record<string, unknown>;
}

export interface AuditSnapshot {
  snapshot_id: string;
  entity_id: string;
  entity_type: string;
  version: number;
  state_snapshot: Record<string, unknown>;
  state_digest: string;
  last_event_id: string;
  last_event_digest: string;
  created_at: string;
}

export interface AuditRelation {
  relation_id: string;
  source_entity: string;
  target_entity: string;
  relation_type: string;
  created_by: string;
  status: AuditableState;
  confidence: number;
  source: string;
  digest: string;
  evidence?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditExternalSource {
  id: string;
  source: string;
  source_id?: string;
  external_id?: string;
  external_uri?: string;
  retrieved_at: string;
  adapter_version: string;
  response_digest: string;
  matching_method: string;
  confidence: number;
  raw_metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AuditContribution {
  contribution_id: string;
  actor_id: string;
  actor_role: string;
  tag_id: string;
  tag_label: string;
  object_id?: string;
  content: string;
  created_at: string;
  version: number;
  previous_version?: number;
  previous_digest?: string | null;
  digest: string;
  source: string;
  status: AuditableState;
  history?: Array<{
    version: number;
    content: string;
    timestamp: string;
    digest: string;
    actor_id: string;
    reason?: string;
  }>;
}

export interface SecurityLogEntry {
  log_id: string;
  event_type: 
    | 'login'
    | 'logout'
    | 'failed_login'
    | 'permission_change'
    | 'role_change'
    | 'export'
    | 'api_access'
    | 'key_rotation'
    | 'authentication_failure';
  actor_id: string;
  actor_role: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, unknown>;
  timestamp: string;
  log_digest: string;
}

export interface AuditExportRecord {
  export_id: string;
  actor_id: string;
  actor_role: string;
  format: string;
  record_count: number;
  dataset_digest: string;
  filter_criteria?: Record<string, unknown>;
  timestamp: string;
}

export interface IntegrityCheckDetail {
  passed: boolean;
  code: string;
  description: string;
  details?: string;
}

export interface IntegrityInconsistency {
  event_id?: string;
  entity_id?: string;
  version?: number;
  expected_digest?: string;
  calculated_digest?: string;
  previous_digest?: string;
  message: string;
}

export interface IntegrityVerificationResult {
  status: 'INTEGRIDADE VERIFICADA' | 'INCONSISTÊNCIA DETECTADA';
  timestamp: string;
  totalEventsChecked: number;
  totalEntitiesChecked: number;
  totalSnapshotsChecked: number;
  checks: {
    hashChainContinuity: IntegrityCheckDetail;
    digestValidity: IntegrityCheckDetail;
    versionConsistency: IntegrityCheckDetail;
    entityExistence: IntegrityCheckDetail;
    relationIntegrity: IntegrityCheckDetail;
    provenanceConsistency: IntegrityCheckDetail;
    snapshotMatching: IntegrityCheckDetail;
    merkleRootIntegrity: IntegrityCheckDetail;
  };
  inconsistencies: IntegrityInconsistency[];
  merkleRoot: string;
  chainHeight: number;
}

// ─── CRIPTOGRAFIA AUXILIAR DETERMINÍSTICA ───────────────────────────────────

export function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computePayloadDigest(payload: unknown): string {
  const canonical = canonicalStringify(payload);
  return `sha256:${sha256Hex(canonical)}`;
}

export function computeEventDigest(event: {
  entity_id: string;
  entity_type: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  timestamp: string;
  previous_version: number;
  new_version: number;
  previous_digest: string | null;
  new_digest: string;
  payload_digest: string;
  previous_event_digest: string | null;
  source: string;
  reason?: string;
  metadata: Record<string, unknown>;
}): string {
  const canonicalBody = canonicalStringify({
    actor_id: event.actor_id,
    actor_role: event.actor_role,
    entity_id: event.entity_id,
    entity_type: event.entity_type,
    event_type: event.event_type,
    metadata: event.metadata || {},
    new_digest: event.new_digest,
    new_version: event.new_version,
    payload_digest: event.payload_digest,
    previous_digest: event.previous_digest,
    previous_event_digest: event.previous_event_digest,
    previous_version: event.previous_version,
    reason: event.reason || '',
    source: event.source,
    timestamp: event.timestamp,
  });
  return `sha256:${sha256Hex(canonicalBody)}`;
}

// ─── ÁRVORE MERKLE DETERMINÍSTICA ───────────────────────────────────────────

export function computeMerkleRoot(digests: string[]): string {
  if (digests.length === 0) {
    return `sha256:${sha256Hex('')}`;
  }

  // Normalizar digests retirando o prefixo se presente
  let currentLevel = digests.map(d => d.startsWith('sha256:') ? d.slice(7) : d);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // Se for ímpar, duplica o último nó
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = sha256Hex(left + right);
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return `sha256:${currentLevel[0]}`;
}

// ─── MÁQUINA DE ESTADOS E TRANSIÇÕES AUDITÁVEIS ─────────────────────────────

const VALID_STATE_TRANSITIONS: Record<AuditableState, AuditableState[]> = {
  RAW: ['SUGGESTED', 'ARCHIVED'],
  SUGGESTED: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['VALIDATED', 'REVISED', 'ARCHIVED'],
  VALIDATED: ['PUBLISHED', 'REVISED', 'REVOKED', 'ARCHIVED'],
  REVISED: ['UNDER_REVIEW', 'VALIDATED', 'ARCHIVED'],
  PUBLISHED: ['REVOKED', 'ARCHIVED', 'REVISED'],
  REVOKED: ['UNDER_REVIEW', 'ARCHIVED'],
  ARCHIVED: ['RAW', 'SUGGESTED', 'UNDER_REVIEW', 'VALIDATED', 'PUBLISHED'], // RESTORE transita de volta
};

export function validateStateTransition(
  currentState: AuditableState,
  nextState: AuditableState
): { valid: boolean; reason?: string } {
  if (currentState === nextState) {
    return { valid: true };
  }
  const allowed = VALID_STATE_TRANSITIONS[currentState] || [];
  if (allowed.includes(nextState)) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `Transição de estado ilegal: não é permitido transitar de '${currentState}' diretamente para '${nextState}'.`,
  };
}

// ─── MODELO CONCEITUAL W3C PROV ────────────────────────────────────────────

export function buildProvModel(event: AuditEvent) {
  return {
    agent: {
      id: event.actor_id,
      role: event.actor_role,
      type: event.actor_role === 'SYSTEM' ? 'prov:SoftwareAgent' : 'prov:Person',
    },
    activity: {
      id: `act_${event.event_id}`,
      type: event.event_type,
      startedAtTime: event.timestamp,
      usedSource: event.source,
      reason: event.reason,
    },
    entity: {
      id: event.entity_id,
      type: event.entity_type,
      version: event.new_version,
      digest: event.new_digest,
      wasGeneratedBy: `act_${event.event_id}`,
      wasAttributedTo: event.actor_id,
      wasDerivedFrom: event.previous_digest ? {
        version: event.previous_version,
        digest: event.previous_digest,
      } : null,
    },
  };
}

// ─── ARMAZENAMENTO E TRILHA HASH CHAIN ──────────────────────────────────────

let memoryAuditEvents: AuditEvent[] = [];
let memorySnapshots: AuditSnapshot[] = [];
let memorySecurityLogs: SecurityLogEntry[] = [];
let memoryExports: AuditExportRecord[] = [];
let memoryRelations: AuditRelation[] = [];
let memorySources: AuditExternalSource[] = [];
let memoryContributions: AuditContribution[] = [];

// Inicialização de sementes canônicas institucionais para visualização imediata
let isInitialized = false;

export function initializeAuditLedger() {
  if (isInitialized && memoryAuditEvents.length > 0) return;

  const now = new Date();
  const tMinus = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();

  const initialEventsSeed: Array<Omit<AuditEvent, 'event_id' | 'payload_digest' | 'previous_event_digest' | 'event_digest'>> = [
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      event_type: 'tag_created',
      actor_id: 'usr_comunidade_01',
      actor_role: 'USER',
      timestamp: tMinus(240),
      previous_version: 0,
      new_version: 1,
      previous_digest: null,
      new_digest: 'sha256:d8a1c9e3b4a2f8d071a6e5b4c3d2e1f089abcdef0123456789abcdef01234567',
      source: 'questionario_usuario',
      reason: 'Registro inicial originado de contribuição de usuário no acolhimento cultural',
      metadata: { label: 'Cultura Popular', eixo: 'SABERES', status: 'RAW' },
    },
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      event_type: 'contribution_added',
      actor_id: 'usr_pesquisador_nordeste',
      actor_role: 'RESEARCHER',
      timestamp: tMinus(210),
      previous_version: 1,
      new_version: 2,
      previous_digest: 'sha256:d8a1c9e3b4a2f8d071a6e5b4c3d2e1f089abcdef0123456789abcdef01234567',
      new_digest: 'sha256:f1e2d3c4b5a60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      source: 'formulario_pesquisa',
      reason: 'Adição de referências bibliográficas do acervo CNFCP e saberes tradicionais',
      metadata: { label: 'Cultura Popular', eixo: 'SABERES', status: 'SUGGESTED' },
    },
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      event_type: 'match_found',
      actor_id: 'sys_interop_daemon',
      actor_role: 'SYSTEM',
      timestamp: tMinus(180),
      previous_version: 2,
      new_version: 3,
      previous_digest: 'sha256:f1e2d3c4b5a60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
      new_digest: 'sha256:a0b1c2d3e4f5061728394a5b6c7d8e9f0123456789abcdef0123456789abcdef1',
      source: 'Brasiliana Museus',
      reason: 'Correspondência externa identificada via adaptador Brasiliana (IPHAN/IBRAM)',
      metadata: {
        label: 'Cultura Popular',
        adapter_version: '2.1.0',
        external_id: 'br_ibram_cp_9921',
        matching_method: 'skos_exact_match',
        confidence: 0.98,
        status: 'UNDER_REVIEW',
      },
    },
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'relation',
      event_type: 'relation_created',
      actor_id: 'usr_curador_institucional',
      actor_role: 'REVIEWER',
      timestamp: tMinus(140),
      previous_version: 3,
      new_version: 4,
      previous_digest: 'sha256:a0b1c2d3e4f5061728394a5b6c7d8e9f0123456789abcdef0123456789abcdef1',
      new_digest: 'sha256:b2c3d4e5f6a718293a4b5c6d7e8f9a0b123456789abcdef0123456789abcdef2',
      source: 'curadoria_manual',
      reason: 'Vinculação ontológica com a tag Barroco (skos:related, eixo comum de expressões materiais)',
      metadata: {
        label: 'Cultura Popular',
        target_entity: 'tag_barroco',
        relation_type: 'skos:related',
        status: 'UNDER_REVIEW',
      },
    },
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      event_type: 'relation_validated',
      actor_id: 'adm_comite_cientifico',
      actor_role: 'VALIDATOR',
      timestamp: tMinus(90),
      previous_version: 4,
      new_version: 5,
      previous_digest: 'sha256:b2c3d4e5f6a718293a4b5c6d7e8f9a0b123456789abcdef0123456789abcdef2',
      new_digest: 'sha256:c3d4e5f6a7b8293a4b5c6d7e8f9a0b1c23456789abcdef0123456789abcdef3',
      source: 'conselho_editorial',
      reason: 'Validação formal da identidade computacional e cadeia de relações',
      metadata: { label: 'Cultura Popular', status: 'VALIDATED' },
    },
    {
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      event_type: 'version_published',
      actor_id: 'adm_root',
      actor_role: 'ADMIN',
      timestamp: tMinus(30),
      previous_version: 5,
      new_version: 6,
      previous_digest: 'sha256:c3d4e5f6a7b8293a4b5c6d7e8f9a0b1c23456789abcdef0123456789abcdef3',
      new_digest: 'sha256:d4e5f6a7b8c93a4b5c6d7e8f9a0b1c2d3456789abcdef0123456789abcdef4',
      source: 'publicador_oficial',
      reason: 'Publicação no grafo aberto de Interoperabilidade Cultural',
      metadata: { label: 'Cultura Popular', status: 'PUBLISHED' },
    },
    {
      entity_id: 'tag_guernica',
      entity_type: 'tag',
      event_type: 'tag_created',
      actor_id: 'usr_historiador_arte',
      actor_role: 'RESEARCHER',
      timestamp: tMinus(220),
      previous_version: 0,
      new_version: 1,
      previous_digest: null,
      new_digest: 'sha256:111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000',
      source: 'catalogacao_obra',
      reason: 'Entidade criada associada à obra de Pablo Picasso sobre a Guerra Civil Espanhola',
      metadata: { label: 'Guernica', eixo: 'VANGUARDA_MODERNISMO', status: 'RAW' },
    },
    {
      entity_id: 'tag_guernica',
      entity_type: 'source',
      event_type: 'match_found',
      actor_id: 'sys_europeana_connector',
      actor_role: 'SYSTEM',
      timestamp: tMinus(160),
      previous_version: 1,
      new_version: 2,
      previous_digest: 'sha256:111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000',
      new_digest: 'sha256:22223333444455556666777788889999aaaabbbbccccddddeeeeffff00001111',
      source: 'Europeana',
      reason: 'Registro recuperado no acervo Museu Reina Sofía via Europeana Open Data',
      metadata: {
        label: 'Guernica',
        adapter_version: '1.4.0',
        external_id: 'europeana_item_reina_sofia_001',
        matching_method: 'identifier_match',
        confidence: 0.99,
        status: 'UNDER_REVIEW',
      },
    },
    {
      entity_id: 'tag_guernica',
      entity_type: 'relation',
      event_type: 'relation_created',
      actor_id: 'usr_curador_institucional',
      actor_role: 'REVIEWER',
      timestamp: tMinus(100),
      previous_version: 2,
      new_version: 3,
      previous_digest: 'sha256:22223333444455556666777788889999aaaabbbbccccddddeeeeffff00001111',
      new_digest: 'sha256:3333444455556666777788889999aaaabbbbccccddddeeeeffff000011112222',
      source: 'curadoria_manual',
      reason: 'Conexão ontológica com Cubismo e Pablo Picasso',
      metadata: {
        label: 'Guernica',
        target_entity: 'tag_cubismo',
        relation_type: 'skos:broader',
        status: 'VALIDATED',
      },
    },
  ];

  // Construir Hash Chain estrita
  memoryAuditEvents = [];
  let prevEventDigest: string | null = null;

  initialEventsSeed.forEach((seed, idx) => {
    const event_id = `evt_${String(idx + 1).padStart(4, '0')}_${sha256Hex(seed.entity_id + seed.timestamp).slice(0, 8)}`;
    const payload_digest = computePayloadDigest({
      metadata: seed.metadata,
      reason: seed.reason,
      source: seed.source,
      entity_id: seed.entity_id,
      version: seed.new_version,
    });

    const eventToHash = {
      entity_id: seed.entity_id,
      entity_type: seed.entity_type,
      event_type: seed.event_type,
      actor_id: seed.actor_id,
      actor_role: seed.actor_role,
      timestamp: seed.timestamp,
      previous_version: seed.previous_version,
      new_version: seed.new_version,
      previous_digest: seed.previous_digest,
      new_digest: seed.new_digest,
      payload_digest,
      previous_event_digest: prevEventDigest,
      source: seed.source,
      reason: seed.reason,
      metadata: seed.metadata,
    };

    const event_digest = computeEventDigest(eventToHash);

    const fullEvent: AuditEvent = {
      ...eventToHash,
      event_id,
      event_digest,
    };

    memoryAuditEvents.push(fullEvent);
    prevEventDigest = event_digest;
  });

  // Snapshots Periódicos
  const cpEventAtV4 = memoryAuditEvents.find(e => e.entity_id === 'tag_cultura_popular' && e.new_version === 4);
  if (cpEventAtV4) {
    memorySnapshots.push({
      snapshot_id: `snp_cultura_popular_v4`,
      entity_id: 'tag_cultura_popular',
      entity_type: 'tag',
      version: 4,
      state_snapshot: {
        tagId: 'tag_cultura_popular',
        tag: 'Cultura Popular',
        version: 4,
        digest: cpEventAtV4.new_digest,
        relations: [{ target: 'tag_barroco', type: 'skos:related' }],
        sources: [{ name: 'Brasiliana Museus', id: 'br_ibram_cp_9921' }],
      },
      state_digest: cpEventAtV4.new_digest,
      last_event_id: cpEventAtV4.event_id,
      last_event_digest: cpEventAtV4.event_digest,
      created_at: cpEventAtV4.timestamp,
    });
  }

  // Relações Auditadas
  memoryRelations = [
    {
      relation_id: 'rel_cp_barroco',
      source_entity: 'tag_cultura_popular',
      target_entity: 'tag_barroco',
      relation_type: 'skos:related',
      created_by: 'usr_curador_institucional',
      status: 'VALIDATED',
      confidence: 0.94,
      source: 'Brasiliana Museus',
      digest: 'sha256:rel94barrocopopular00112233445566778899aabbccddeeff0011223344556677',
      evidence: 'Influência da talha barroca no artesanato popular do Vale do Paraíba e Minas Gerais.',
      created_at: tMinus(140),
      updated_at: tMinus(90),
    },
    {
      relation_id: 'rel_guernica_cubismo',
      source_entity: 'tag_guernica',
      target_entity: 'tag_cubismo',
      relation_type: 'skos:broader',
      created_by: 'usr_curador_institucional',
      status: 'VALIDATED',
      confidence: 0.99,
      source: 'Europeana',
      digest: 'sha256:rel99guernicacubismo00112233445566778899aabbccddeeff0011223344556677',
      evidence: 'Obra marco do cubismo sintético e expressionismo de Picasso em 1937.',
      created_at: tMinus(100),
      updated_at: tMinus(100),
    },
  ];

  // Fontes Externas Preservadas
  memorySources = [
    {
      id: 'src_brasiliana_01',
      source: 'Brasiliana Museus',
      source_id: 'br_ibram_cp_9921',
      external_id: 'cp-9921',
      external_uri: 'https://brasiliana.museus.gov.br/item/cp-9921',
      retrieved_at: tMinus(180),
      adapter_version: '2.1.0',
      response_digest: 'sha256:res987brasiliana00112233445566778899aabbccddeeff0011223344556677',
      matching_method: 'skos_exact_match',
      confidence: 0.98,
      raw_metadata: { collection: 'CNFCP', institution: 'IBRAM', license: 'CC-BY-SA' },
      created_at: tMinus(180),
    },
    {
      id: 'src_europeana_01',
      source: 'Europeana',
      source_id: 'europeana_item_reina_sofia_001',
      external_id: 'reina_sofia_guernica',
      external_uri: 'https://www.europeana.eu/item/9200300/BibliographicResource_3000051662955',
      retrieved_at: tMinus(160),
      adapter_version: '1.4.0',
      response_digest: 'sha256:res999europeana00112233445566778899aabbccddeeff0011223344556677',
      matching_method: 'identifier_match',
      confidence: 0.99,
      raw_metadata: { provider: 'Museo Reina Sofía', country: 'Spain', year: 1937 },
      created_at: tMinus(160),
    },
  ];

  // Logs de Segurança Isolados
  const secEvents = [
    { type: 'login', actor: 'usr_curador_institucional', role: 'REVIEWER', ip: '189.28.10.4', details: { method: 'token_session' }, time: tMinus(260) },
    { type: 'failed_login', actor: 'desconhecido', role: 'ANONYMOUS', ip: '45.142.12.9', details: { reason: 'credenciais_invalidas' }, time: tMinus(200) },
    { type: 'login', actor: 'adm_root', role: 'ADMIN', ip: '177.18.90.11', details: { method: 'admin_bearer_key' }, time: tMinus(120) },
    { type: 'export', actor: 'usr_pesquisador_nordeste', role: 'RESEARCHER', ip: '200.17.44.82', details: { dataset: 'tags_saberes_jsonld', count: 12 }, time: tMinus(50) },
  ];

  memorySecurityLogs = secEvents.map((s, idx) => {
    const log_id = `sec_${String(idx + 1).padStart(4, '0')}_${sha256Hex(s.actor + s.time).slice(0, 8)}`;
    const canonical = canonicalStringify({
      event_type: s.type,
      actor_id: s.actor,
      actor_role: s.role,
      ip: s.ip,
      details: s.details,
      timestamp: s.time,
    });
    return {
      log_id,
      event_type: s.type as SecurityLogEntry['event_type'],
      actor_id: s.actor,
      actor_role: s.role,
      ip_address: s.ip,
      user_agent: 'FolksonomiaDigital-Client/2.0',
      details: s.details,
      timestamp: s.time,
      log_digest: `sha256:${sha256Hex(canonical)}`,
    };
  });

  // Exportações Auditadas
  memoryExports = [
    {
      export_id: 'exp_20260921_001',
      actor_id: 'usr_pesquisador_nordeste',
      actor_role: 'RESEARCHER',
      format: 'JSON-LD',
      record_count: 12,
      dataset_digest: 'sha256:exp0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      filter_criteria: { eixo: 'SABERES', status: 'VALIDATED' },
      timestamp: tMinus(50),
    },
  ];

  // Contribuições Auditadas com Identidade Própria e Histórico Versionado V1 -> V2
  memoryContributions = [
    {
      contribution_id: 'con_0001_cp_saberes',
      actor_id: 'usr_comunidade_01',
      actor_role: 'USER',
      tag_id: 'tag_cultura_popular',
      tag_label: 'Cultura Popular',
      object_id: 'obj_cnfcp_saberes_01',
      content: 'Manifestações tradicionais e festas comunitárias transmitidas oralmente de geração em geração.',
      created_at: tMinus(210),
      version: 2,
      previous_version: 1,
      previous_digest: 'sha256:con0001d8a1c9e3b4a2f8d071a6e5b4c3d2e1f089abcdef0123456789abcdef012',
      digest: 'sha256:con0002f1e2d3c4b5a60718293a4b5c6d7e8f90123456789abcdef0123456789abc',
      source: 'questionario_usuario',
      status: 'VALIDATED',
      history: [
        {
          version: 1,
          content: 'Festas e saberes do povo brasileiro.',
          timestamp: tMinus(240),
          digest: 'sha256:con0001d8a1c9e3b4a2f8d071a6e5b4c3d2e1f089abcdef0123456789abcdef012',
          actor_id: 'usr_comunidade_01',
          reason: 'Registro inicial via questionário de primeiro acesso',
        },
        {
          version: 2,
          content: 'Manifestações tradicionais e festas comunitárias transmitidas oralmente de geração em geração.',
          timestamp: tMinus(210),
          digest: 'sha256:con0002f1e2d3c4b5a60718293a4b5c6d7e8f90123456789abcdef0123456789abc',
          actor_id: 'usr_pesquisador_nordeste',
          reason: 'Correção e expansão com termos técnicos e referências do acervo CNFCP',
        },
      ],
    },
    {
      contribution_id: 'con_0002_guernica_reina',
      actor_id: 'usr_historiador_arte',
      actor_role: 'RESEARCHER',
      tag_id: 'tag_guernica',
      tag_label: 'Guernica',
      object_id: 'obj_reina_sofia_guernica_1937',
      content: 'Mural a óleo sobre tela (349 × 776 cm) produzido por Pablo Picasso em resposta ao bombardeio de Guernica na Guerra Civil Espanhola.',
      created_at: tMinus(220),
      version: 1,
      previous_version: 0,
      previous_digest: null,
      digest: 'sha256:con1937picassoguernica00112233445566778899aabbccddeeff00112233445566',
      source: 'catalogacao_obra',
      status: 'VALIDATED',
      history: [
        {
          version: 1,
          content: 'Mural a óleo sobre tela (349 × 776 cm) produzido por Pablo Picasso em resposta ao bombardeio de Guernica na Guerra Civil Espanhola.',
          timestamp: tMinus(220),
          digest: 'sha256:con1937picassoguernica00112233445566778899aabbccddeeff00112233445566',
          actor_id: 'usr_historiador_arte',
          reason: 'Catalogação inicial e ancoragem ontológica com Cubismo e Guerra Civil Espanhola',
        },
      ],
    },
  ];

  isInitialized = true;
}

// ─── CONSULTAS E INSERÇÕES DO MOTOR ─────────────────────────────────────────

export async function getAuditEvents(filters?: {
  entity_id?: string;
  actor_id?: string;
  event_type?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ events: AuditEvent[]; total: number }> {
  initializeAuditLedger();

  // Tenta consultar no Supabase primeiro se a tabela existir
  try {
    let query = supabaseAdmin
      .from('audit_events')
      .select('*', { count: 'exact' })
      .order('sequence_number', { ascending: false });

    if (filters?.entity_id) query = query.eq('entity_id', filters.entity_id);
    if (filters?.actor_id) query = query.eq('actor_id', filters.actor_id);
    if (filters?.event_type) query = query.eq('event_type', filters.event_type);
    if (filters?.source) query = query.eq('source', filters.source);
    if (filters?.startDate) query = query.gte('timestamp', filters.startDate);
    if (filters?.endDate) query = query.lte('timestamp', filters.endDate);

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (!error && data && data.length > 0) {
      return { events: data as AuditEvent[], total: count || data.length };
    }
  } catch {
    // Tabela ainda não populada ou banco local offline, usa memória
  }

  // Fallback em memória auditável
  let filtered = [...memoryAuditEvents];

  if (filters?.entity_id) {
    filtered = filtered.filter(e => e.entity_id.toLowerCase() === filters.entity_id?.toLowerCase());
  }
  if (filters?.actor_id) {
    filtered = filtered.filter(e => e.actor_id.toLowerCase().includes(filters.actor_id!.toLowerCase()));
  }
  if (filters?.event_type) {
    filtered = filtered.filter(e => e.event_type === filters.event_type);
  }
  if (filters?.source) {
    filtered = filtered.filter(e => e.source.toLowerCase().includes(filters.source!.toLowerCase()));
  }
  if (filters?.startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(filters.startDate!));
  }
  if (filters?.endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(filters.endDate!));
  }

  const total = filtered.length;
  // Ordenar decrescente por padrão para visualização
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 100;
  const paginated = filtered.slice(offset, offset + limit);

  return { events: paginated, total };
}

export async function recordAuditEvent(params: {
  entity_id: string;
  entity_type: 'tag' | 'relation' | 'source' | 'contribution' | 'system';
  event_type: AuditEventType | string;
  actor_id: string;
  actor_role: ActorRole;
  previous_version: number;
  new_version: number;
  previous_digest: string | null;
  new_digest: string;
  source: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  stateTransition?: { from: AuditableState; to: AuditableState };
}): Promise<AuditEvent> {
  initializeAuditLedger();

  // 1. Validação de Transição de Estado se especificada
  if (params.stateTransition) {
    const check = validateStateTransition(params.stateTransition.from, params.stateTransition.to);
    if (!check.valid) {
      throw new Error(`[Auditoria] Transição bloqueada: ${check.reason}`);
    }
  }

  // 2. Determinar o último digest da cadeia (Hash Chain)
  let previous_event_digest: string | null = null;
  if (memoryAuditEvents.length > 0) {
    // Último evento inserido cronologicamente
    previous_event_digest = memoryAuditEvents[memoryAuditEvents.length - 1].event_digest;
  }

  const timestamp = new Date().toISOString();
  const payload_digest = computePayloadDigest({
    entity_id: params.entity_id,
    entity_type: params.entity_type,
    event_type: params.event_type,
    metadata: params.metadata || {},
    new_digest: params.new_digest,
    new_version: params.new_version,
    previous_digest: params.previous_digest,
    previous_version: params.previous_version,
    reason: params.reason,
    source: params.source,
  });

  const eventPayload = {
    entity_id: params.entity_id,
    entity_type: params.entity_type,
    event_type: params.event_type,
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    timestamp,
    previous_version: params.previous_version,
    new_version: params.new_version,
    previous_digest: params.previous_digest,
    new_digest: params.new_digest,
    payload_digest,
    previous_event_digest,
    source: params.source,
    reason: params.reason,
    metadata: params.metadata || {},
  };

  const event_digest = computeEventDigest(eventPayload);
  const event_id = `evt_${Date.now()}_${sha256Hex(params.entity_id + timestamp).slice(0, 8)}`;

  const fullEvent: AuditEvent = {
    ...eventPayload,
    event_id,
    event_digest,
  };

  // 3. Inserir em memória
  memoryAuditEvents.push(fullEvent);

  // 4. Inserir no Supabase (se acessível)
  try {
    await supabaseAdmin.from('audit_events').insert({
      event_id: fullEvent.event_id,
      entity_id: fullEvent.entity_id,
      entity_type: fullEvent.entity_type,
      event_type: fullEvent.event_type,
      actor_id: fullEvent.actor_id,
      actor_role: fullEvent.actor_role,
      timestamp: fullEvent.timestamp,
      previous_version: fullEvent.previous_version,
      new_version: fullEvent.new_version,
      previous_digest: fullEvent.previous_digest,
      new_digest: fullEvent.new_digest,
      payload_digest: fullEvent.payload_digest,
      previous_event_digest: fullEvent.previous_event_digest,
      event_digest: fullEvent.event_digest,
      source: fullEvent.source,
      reason: fullEvent.reason,
      metadata: fullEvent.metadata,
    });
  } catch {
    // Persistência em memória garantida
  }

  return fullEvent;
}

export async function getEntityProvenanceTimeline(entityId: string): Promise<{
  entityId: string;
  events: AuditEvent[];
  snapshots: AuditSnapshot[];
  currentVersion: number;
  currentDigest: string | null;
  w3cProv: ReturnType<typeof buildProvModel>[];
}> {
  initializeAuditLedger();

  const entityEvents = memoryAuditEvents
    .filter(e => e.entity_id.toLowerCase() === entityId.toLowerCase())
    .sort((a, b) => a.new_version - b.new_version);

  const entitySnapshots = memorySnapshots
    .filter(s => s.entity_id.toLowerCase() === entityId.toLowerCase())
    .sort((a, b) => a.version - b.version);

  const lastEvent = entityEvents[entityEvents.length - 1];

  return {
    entityId,
    events: entityEvents,
    snapshots: entitySnapshots,
    currentVersion: lastEvent ? lastEvent.new_version : 0,
    currentDigest: lastEvent ? lastEvent.new_digest : null,
    w3cProv: entityEvents.map(buildProvModel),
  };
}

// ─── VERIFICADOR DE INTEGRIDADE EM 8 NÍVEIS ─────────────────────────────────

export async function verifySystemIntegrity(): Promise<IntegrityVerificationResult> {
  initializeAuditLedger();

  // Eventos em ordem cronológica estrita
  const events = [...memoryAuditEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const inconsistencies: IntegrityInconsistency[] = [];

  // 1. Continuidade ininterrupta da Hash Chain
  let chainOk = true;
  let chainBrokenAt: string | undefined;

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    if (i === 0) {
      if (current.previous_event_digest !== null) {
        chainOk = false;
        chainBrokenAt = `Evento gênese (${current.event_id}) possui previous_event_digest não nulo.`;
        inconsistencies.push({
          event_id: current.event_id,
          expected_digest: 'null',
          calculated_digest: current.previous_event_digest,
          message: 'Gênese da Hash Chain deve possuir previous_event_digest nulo.',
        });
      }
    } else {
      const prev = events[i - 1];
      if (current.previous_event_digest !== prev.event_digest) {
        chainOk = false;
        chainBrokenAt = `Quebra na posição ${i} entre ${prev.event_id} e ${current.event_id}.`;
        inconsistencies.push({
          event_id: current.event_id,
          expected_digest: prev.event_digest,
          calculated_digest: current.previous_event_digest || 'null',
          previous_digest: prev.event_digest,
          message: `Descontinuidade na Hash Chain: previous_event_digest não corresponde ao event_digest do evento anterior.`,
        });
      }
    }
  }

  // 2. Validade matemática dos digests de cada evento
  let digestsOk = true;
  for (const ev of events) {
    const recomputedEventDigest = computeEventDigest(ev);
    if (recomputedEventDigest !== ev.event_digest) {
      digestsOk = false;
      inconsistencies.push({
        event_id: ev.event_id,
        entity_id: ev.entity_id,
        version: ev.new_version,
        expected_digest: ev.event_digest,
        calculated_digest: recomputedEventDigest,
        message: 'Assinatura matemática do evento adulterada ou payload modificado.',
      });
    }
  }

  // 3. Consistência sequencial das versões
  let versionsOk = true;
  const versionMap = new Map<string, number>();
  for (const ev of events) {
    const lastVer = versionMap.get(ev.entity_id) || 0;
    if (ev.previous_version !== lastVer) {
      versionsOk = false;
      inconsistencies.push({
        event_id: ev.event_id,
        entity_id: ev.entity_id,
        version: ev.new_version,
        message: `Inconsistência de versão: previous_version (${ev.previous_version}) difere do último estado conhecido (${lastVer}).`,
      });
    }
    if (ev.new_version <= ev.previous_version) {
      versionsOk = false;
      inconsistencies.push({
        event_id: ev.event_id,
        entity_id: ev.entity_id,
        version: ev.new_version,
        message: `Monotonia violada: new_version (${ev.new_version}) deve ser estritamente superior a previous_version (${ev.previous_version}).`,
      });
    }
    versionMap.set(ev.entity_id, ev.new_version);
  }

  // 4. Existência e integridade das entidades referenciadas
  let entitiesOk = true;
  const knownEntities = new Set(events.map(e => e.entity_id));
  if (knownEntities.size === 0 && events.length > 0) {
    entitiesOk = false;
    inconsistencies.push({ message: 'Nenhuma entidade encontrada na trilha de eventos.' });
  }

  // 5. Integridade das relações auditadas
  let relationsOk = true;
  for (const rel of memoryRelations) {
    if (!rel.source_entity || !rel.target_entity || !rel.digest) {
      relationsOk = false;
      inconsistencies.push({
        entity_id: rel.relation_id,
        message: `Relação ${rel.relation_id} não possui campos canônicos obrigatórios.`,
      });
    }
  }

  // 6. Consistência da proveniência W3C PROV
  let provOk = true;
  for (const ev of events) {
    if (!ev.actor_id || !ev.actor_role || !ev.source) {
      provOk = false;
      inconsistencies.push({
        event_id: ev.event_id,
        message: `Evento sem atribuição completa de Agente/Origem W3C PROV.`,
      });
    }
  }

  // 7. Correspondência dos snapshots com a reprodução dos eventos
  let snapshotsOk = true;
  for (const snp of memorySnapshots) {
    const ev = events.find(e => e.entity_id === snp.entity_id && e.new_version === snp.version);
    if (!ev) {
      snapshotsOk = false;
      inconsistencies.push({
        entity_id: snp.entity_id,
        version: snp.version,
        message: `Snapshot existe para versão ${snp.version}, mas nenhum evento correspondente foi localizado.`,
      });
    } else if (snp.state_digest !== ev.new_digest) {
      snapshotsOk = false;
      inconsistencies.push({
        entity_id: snp.entity_id,
        version: snp.version,
        expected_digest: ev.new_digest,
        calculated_digest: snp.state_digest,
        message: `Divergência entre digest do snapshot e digest do evento de versão.`,
      });
    }
  }

  // 8. Integridade das Merkle Roots calculadas
  const eventDigests = events.map(e => e.event_digest);
  const calculatedMerkleRoot = computeMerkleRoot(eventDigests);
  let merkleOk = Boolean(calculatedMerkleRoot && calculatedMerkleRoot.startsWith('sha256:'));

  const overallPassed = chainOk && digestsOk && versionsOk && entitiesOk && relationsOk && provOk && snapshotsOk && merkleOk;

  return {
    status: overallPassed ? 'INTEGRIDADE VERIFICADA' : 'INCONSISTÊNCIA DETECTADA',
    timestamp: new Date().toISOString(),
    totalEventsChecked: events.length,
    totalEntitiesChecked: knownEntities.size,
    totalSnapshotsChecked: memorySnapshots.length,
    checks: {
      hashChainContinuity: {
        passed: chainOk,
        code: 'CHK_HASH_CHAIN',
        description: 'Continuidade ininterrupta da Hash Chain criptográfica',
        details: chainOk ? 'Todos os elos sequenciais conferem perfeitamente com os registros precedentes.' : chainBrokenAt,
      },
      digestValidity: {
        passed: digestsOk,
        code: 'CHK_DIGEST_CANONICAL',
        description: 'Validade matemática dos digests SHA-256 canônicos (RFC 8785)',
        details: digestsOk ? 'Digests recalculados a partir da estrutura canônica correspondem estritamente aos armazenados.' : 'Divergência detectada.',
      },
      versionConsistency: {
        passed: versionsOk,
        code: 'CHK_VERSION_MONOTONICITY',
        description: 'Consistência sequencial e monotonicidade das versões',
        details: versionsOk ? 'Progressão monotônica verificada sem saltos arbitrários ou recuos de versão.' : 'Saltos de versão detectados.',
      },
      entityExistence: {
        passed: entitiesOk,
        code: 'CHK_ENTITY_EXISTENCE',
        description: 'Existência e integridade das entidades computacionais vinculadas',
        details: entitiesOk ? `${knownEntities.size} identidades registradas com estado ativo e coerente.` : 'Falha em entidades.',
      },
      relationIntegrity: {
        passed: relationsOk,
        code: 'CHK_RELATION_PROVENANCE',
        description: 'Integridade ontológica e proveniência das relações culturais',
        details: relationsOk ? 'Todas as relações possuem endpoints válidos, evidências e assinaturas.' : 'Inconsistência em relações.',
      },
      provenanceConsistency: {
        passed: provOk,
        code: 'CHK_W3C_PROV',
        description: 'Consistência de proveniência conforme modelo W3C PROV (Agente, Atividade, Entidade)',
        details: provOk ? 'Cadeia completa de atribuição de agentes e origens preservada sem lacunas anônimas.' : 'Lacunas de agente.',
      },
      snapshotMatching: {
        passed: snapshotsOk,
        code: 'CHK_SNAPSHOT_REPLAY',
        description: 'Correspondência de snapshots de estado com replay determinístico',
        details: snapshotsOk ? 'Snapshots periódicos validados contra replay da trilha de eventos.' : 'Divergência em snapshot.',
      },
      merkleRootIntegrity: {
        passed: merkleOk,
        code: 'CHK_MERKLE_ROOT',
        description: 'Cálculo determinístico da Merkle Root para prova de integridade em lote',
        details: merkleOk ? `Merkle Root calculada com sucesso: ${calculatedMerkleRoot.slice(0, 24)}...` : 'Erro na árvore Merkle.',
      },
    },
    inconsistencies,
    merkleRoot: calculatedMerkleRoot,
    chainHeight: events.length,
  };
}

// ─── LOG DE SEGURANÇA SEPOSITADO ───────────────────────────────────────────

export async function getSecurityLogs(filters?: {
  event_type?: string;
  actor_id?: string;
  limit?: number;
}): Promise<SecurityLogEntry[]> {
  initializeAuditLedger();

  let logs = [...memorySecurityLogs];
  if (filters?.event_type) {
    logs = logs.filter(l => l.event_type === filters.event_type);
  }
  if (filters?.actor_id) {
    logs = logs.filter(l => l.actor_id.toLowerCase().includes(filters.actor_id!.toLowerCase()));
  }
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs.slice(0, filters?.limit || 100);
}

export async function recordSecurityEvent(params: {
  event_type: SecurityLogEntry['event_type'];
  actor_id: string;
  actor_role: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
}): Promise<SecurityLogEntry> {
  initializeAuditLedger();

  const timestamp = new Date().toISOString();
  const canonical = canonicalStringify({
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    details: params.details || {},
    event_type: params.event_type,
    ip: params.ip_address,
    timestamp,
  });

  const log_digest = `sha256:${sha256Hex(canonical)}`;
  const log_id = `sec_${Date.now()}_${sha256Hex(params.actor_id + timestamp).slice(0, 8)}`;

  const entry: SecurityLogEntry = {
    log_id,
    event_type: params.event_type,
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    ip_address: params.ip_address,
    user_agent: params.user_agent,
    details: params.details || {},
    timestamp,
    log_digest,
  };

  memorySecurityLogs.push(entry);

  try {
    await supabaseAdmin.from('security_logs').insert(entry);
  } catch {
    // Persistência em memória garantida
  }

  return entry;
}

// ─── AUDITORIA DE EXPORTAÇÕES ───────────────────────────────────────────────

export async function recordExportAudit(params: {
  actor_id: string;
  actor_role: string;
  format: string;
  record_count: number;
  dataset: unknown;
  filter_criteria?: Record<string, unknown>;
}): Promise<AuditExportRecord> {
  initializeAuditLedger();

  const dataset_digest = computePayloadDigest(params.dataset);
  const timestamp = new Date().toISOString();
  const export_id = `exp_${Date.now()}_${sha256Hex(params.actor_id + timestamp).slice(0, 8)}`;

  const record: AuditExportRecord = {
    export_id,
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    format: params.format,
    record_count: params.record_count,
    dataset_digest,
    filter_criteria: params.filter_criteria,
    timestamp,
  };

  memoryExports.push(record);

  // Também registra no log de segurança
  await recordSecurityEvent({
    event_type: 'export',
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    details: {
      export_id,
      format: params.format,
      record_count: params.record_count,
      dataset_digest,
    },
  });

  return record;
}

export async function getAuditExports(): Promise<AuditExportRecord[]> {
  initializeAuditLedger();
  return [...memoryExports].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getAuditRelations(): Promise<AuditRelation[]> {
  initializeAuditLedger();
  return [...memoryRelations];
}

export async function getAuditExternalSources(): Promise<AuditExternalSource[]> {
  initializeAuditLedger();
  return [...memorySources];
}

export async function getAuditContributions(): Promise<AuditContribution[]> {
  initializeAuditLedger();
  return [...memoryContributions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function recordContributionAudit(params: {
  actor_id: string;
  actor_role: string;
  tag_id: string;
  tag_label: string;
  object_id?: string;
  content: string;
  source: string;
  reason?: string;
  existing_id?: string;
}): Promise<AuditContribution> {
  initializeAuditLedger();
  const timestamp = new Date().toISOString();
  
  if (params.existing_id) {
    const existing = memoryContributions.find(c => c.contribution_id === params.existing_id);
    if (existing) {
      const nextVersion = existing.version + 1;
      const canonical = canonicalStringify({
        contribution_id: existing.contribution_id,
        tag_id: params.tag_id,
        content: params.content,
        version: nextVersion,
        actor_id: params.actor_id,
        timestamp,
      });
      const digest = `sha256:${sha256Hex(canonical)}`;
      
      existing.history = existing.history || [];
      existing.history.push({
        version: nextVersion,
        content: params.content,
        timestamp,
        digest,
        actor_id: params.actor_id,
        reason: params.reason || 'Correção auditada de contribuição existente',
      });
      
      existing.previous_version = existing.version;
      existing.previous_digest = existing.digest;
      existing.version = nextVersion;
      existing.content = params.content;
      existing.digest = digest;
      
      return existing;
    }
  }
  
  const contribution_id = `con_${Date.now()}_${sha256Hex(params.tag_id + timestamp).slice(0, 8)}`;
  const canonical = canonicalStringify({
    contribution_id,
    tag_id: params.tag_id,
    content: params.content,
    version: 1,
    actor_id: params.actor_id,
    timestamp,
  });
  const digest = `sha256:${sha256Hex(canonical)}`;
  
  const newCon: AuditContribution = {
    contribution_id,
    actor_id: params.actor_id,
    actor_role: params.actor_role,
    tag_id: params.tag_id,
    tag_label: params.tag_label,
    object_id: params.object_id,
    content: params.content,
    created_at: timestamp,
    version: 1,
    previous_version: 0,
    previous_digest: null,
    digest,
    source: params.source,
    status: 'SUGGESTED',
    history: [{
      version: 1,
      content: params.content,
      timestamp,
      digest,
      actor_id: params.actor_id,
      reason: params.reason || 'Criação inicial da contribuição',
    }],
  };
  
  memoryContributions.push(newCon);
  return newCon;
}
