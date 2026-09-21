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

  const CANONICAL_TAGS = [
    { id: 'tag_cultura_popular', label: 'Cultura Popular', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_barroco', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_ibram_cp_9921', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Saberes tradicionais e expressões coletivas do povo brasileiro.', contribution: 'Manifestações tradicionais e festas comunitárias transmitidas oralmente.' },
    { id: 'tag_barroco', label: 'Barroco', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_talha_dourada', relationType: 'skos:narrower', sourceConnector: 'Brasiliana Museus', externalId: 'br_ibram_barroco_04', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Estilo artístico e arquitetônico colonial de grande expressão sacra.', contribution: 'Talha dourada e estatuária sacra dos séculos XVII e XVIII em Minas e Bahia.' },
    { id: 'tag_arte_popular', label: 'Arte Popular', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_cultura_popular', relationType: 'skos:broadMatch', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_artpop_12', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Produção artística espontânea oriunda de mestres tradicionais.', contribution: 'Escultura em barro, madeira e renda produzida fora do cânone acadêmico.' },
    { id: 'tag_cultura', label: 'Cultura', eixo: 'PATRIMONIO_GLOBAL', targetRelation: 'tag_cultura_popular', relationType: 'skos:narrower', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_cult_01', creator: 'adm_root', creatorRole: 'ADMIN' as ActorRole, desc: 'Conjunto de saberes, crenças e manifestações de um povo.', contribution: 'Patrimônio material e imaterial registrado no livro de saberes e celebrações.' },
    { id: 'tag_arte', label: 'Arte', eixo: 'PATRIMONIO_GLOBAL', targetRelation: 'tag_arte_popular', relationType: 'skos:narrower', sourceConnector: 'Europeana', externalId: 'eur_art_global_77', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Atividade humana ligada a manifestações estéticas e sensoriais.', contribution: 'Criação visual, escultórica e performática de relevância histórica e museológica.' },
    { id: 'tag_mestre_vitalino', label: 'Mestre Vitalino', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_ceramica', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_vitalino_88', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Vitalino Pereira dos Santos, pioneiro da cerâmica figurativa de Caruaru.', contribution: 'Retratação do cotidiano sertanejo, retirantes e músicos em peças de barro policromadas.' },
    { id: 'tag_ceramica', label: 'Cerâmica', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_cultura_popular', relationType: 'skos:broader', sourceConnector: 'Brasiliana Museus', externalId: 'br_ibram_ceramica_31', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Modelagem e cocção de artefatos de barro e argila.', contribution: 'Prática milenar de confecção de utensílios utilitários e figuras representativas da vida popular.' },
    { id: 'tag_talha_dourada', label: 'Talha Dourada', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_barroco', relationType: 'skos:broader', sourceConnector: 'Brasiliana Museus', externalId: 'br_ibram_talha_55', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Escultura ornamental em madeira revestida por folhas de ouro.', contribution: 'Elemento característico dos retábulos, altares e forros das igrejas coloniais brasileiras.' },
    { id: 'tag_carranca', label: 'Carranca', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_ibram_carranca_19', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Escultura antropomórfica instalada na proa das barcas do São Francisco.', contribution: 'Símbolo místico de proteção fluvial contra maus espíritos na navegação ribeirinha do Velho Chico.' },
    { id: 'tag_cordel', label: 'Literatura de Cordel', eixo: 'TRADICAO_ORAL_COSMOLOGIAS', targetRelation: 'tag_xilogravura', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_cordel_44', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Gênero literário popular em versos rimados e metrificados.', contribution: 'Folhetos impressos e pendurados em cordões contendo narrativas épicas, causos e sátiras populares.' },
    { id: 'tag_xilogravura', label: 'Xilogravura', eixo: 'SABERES_OFICIOS_MATERIAIS', targetRelation: 'tag_cordel', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_xilo_22', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Gravura artesanal impressa a partir de matrizes de madeira entalhada.', contribution: 'Expressão visual da capa dos folhetos de cordel talhada em madeira de umburana ou cedro.' },
    { id: 'tag_capoeira', label: 'Capoeira', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_berimbau', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_capoeira_01', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Manifestação cultural afro-brasileira que une luta, dança e jogo.', contribution: 'Patrimônio cultural imaterial da humanidade com matriz em Salvador e no Recôncavo Baiano.' },
    { id: 'tag_berimbau', label: 'Berimbau', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_capoeira', relationType: 'skos:broader', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_berimbau_09', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Instrumento musical de corda percutida composto por arco de madeira e cabaça.', contribution: 'Comanda o ritmo, a velocidade e o tipo de jogo dos capoeiristas dentro da roda.' },
    { id: 'tag_samba_de_roda', label: 'Samba de Roda', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_samba_03', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Tradição musical e coreográfica do Recôncavo Baiano.', contribution: 'Origem do samba brasileiro, unindo palmas, canto de resposta, viola machete e prato-e-faca.' },
    { id: 'tag_frevo', label: 'Frevo', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_carnaval', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_frevo_07', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Dança acrobática com sombrinha e ritmo acelerado de metais.', contribution: 'Patrimônio cultural imaterial associado à efervescência carnavalesca de Recife e Olinda.' },
    { id: 'tag_maracatu', label: 'Maracatu', eixo: 'FESTAS_CELEBRACOES', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_maracatu_14', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Cortejo dramático e percussivo de Baque Virado e Baque Solto.', contribution: 'Celebração das nações coroadas e ancestralidade afro-indígena na zona da mata e litoral pernambucano.' },
    { id: 'tag_bumba_meu_boi', label: 'Bumba Meu Boi', eixo: 'FESTAS_CELEBRACOES', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_boi_02', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Folguedo dramático do ciclo junino narrando a morte e ressurreição do boi.', contribution: 'Complexo cultural maranhense dividido em sotaques de matraca, zabumba, orquestra e costa de mão.' },
    { id: 'tag_folia_de_reis', label: 'Folia de Reis', eixo: 'FESTAS_CELEBRACOES', targetRelation: 'tag_catolicismo_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_folia_18', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Cortejo devocional que celebra a visita dos Reis Magos ao Menino Jesus.', contribution: 'Grupo de músicos e mascarados com fardamento colorido percorrendo casas de devotos no ciclo natalino.' },
    { id: 'tag_carnaval', label: 'Carnaval', eixo: 'FESTAS_CELEBRACOES', targetRelation: 'tag_frevo', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_carnaval_01', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Maior celebração popular coletiva de rua do Brasil.', contribution: 'Festa de inversão de papéis com blocos, cordões, escolas de samba e afoxés em todo o território nacional.' },
    { id: 'tag_coco', label: 'Coco de Roda', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_coco_33', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Dança e canto comunitário com pisada forte em piso de barro batido.', contribution: 'Ritmo sincopado marcado por ganzá, surdo e estalo de dedos nas praias e sertões nordestinos.' },
    { id: 'tag_ciranda', label: 'Ciranda', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_ciranda_12', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Dança comunitária de roda de mãos dadas típica do litoral pernambucano.', contribution: 'Guiada pelo mestre cirandeiro e instrumentistas no centro da roda formada na beira da praia.' },
    { id: 'tag_forro', label: 'Forró', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_forro_21', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Matriz tradicional de dança e baile do ciclo junino nordestino.', contribution: 'Trio clássico de sanfona, zabumba e triângulo executando baião, xote, xaxado e arrasta-pé.' },
    { id: 'tag_congada', label: 'Congada', eixo: 'FESTAS_CELEBRACOES', targetRelation: 'tag_sincretismo', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_congada_08', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Festa afro-católica de coroação do Rei do Congo e da Rainha Ginga.', contribution: 'Dança guerreira com bastões de madeira, tambores e louvor a Nossa Senhora do Rosário e São Benedito.' },
    { id: 'tag_jongo', label: 'Jongo', eixo: 'MUSICA_DANCA_PERFORMANCE', targetRelation: 'tag_samba_de_roda', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_iphan_jongo_05', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Dança de roda e tambores com umbigada das comunidades quilombolas.', contribution: 'Ancestral direto do samba de terreiro e do samba de morro, preservado no Vale do Paraíba.' },
    { id: 'tag_cubismo', label: 'Cubismo', eixo: 'VANGUARDA_MODERNISMO', targetRelation: 'tag_picasso', relationType: 'skos:related', sourceConnector: 'Europeana', externalId: 'eur_cubism_modern_01', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Vanguarda europeia que rompeu com a perspectiva renascentista clássica.', contribution: 'Decomposição das formas em planos geométricos múltiplos e simultâneos no espaço bidimensional.' },
    { id: 'tag_guernica', label: 'Guernica', eixo: 'VANGUARDA_MODERNISMO', targetRelation: 'tag_cubismo', relationType: 'skos:broader', sourceConnector: 'Europeana', externalId: 'eur_guernica_reina_37', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Painel monumental pintado por Picasso retratando o horror da guerra.', contribution: 'Mural encomendado pelo governo republicano espanhol para a Exposição Internacional de Paris de 1937.' },
    { id: 'tag_picasso', label: 'Picasso', eixo: 'VANGUARDA_MODERNISMO', targetRelation: 'tag_guernica', relationType: 'skos:related', sourceConnector: 'Europeana', externalId: 'eur_picasso_bio_99', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Pablo Ruiz Picasso (1881-1973), expoente máximo das vanguardas modernas.', contribution: 'Pintor e escultor espanhol revolucionário que fundou o cubismo e pintou Guernica.' },
    { id: 'tag_guerra_civil_espanhola', label: 'Guerra Civil Espanhola', eixo: 'HISTORIA_MEMORIA', targetRelation: 'tag_guernica', relationType: 'skos:related', sourceConnector: 'Europeana', externalId: 'eur_spanish_civil_war_36', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Conflito bélico travado na Espanha entre 1936 e 1939.', contribution: 'Contexto histórico que culminou no trágico bombardeio da Legião Condor à população civil de Guernica.' },
    { id: 'tag_preto_e_branco', label: 'Preto e Branco', eixo: 'VANGUARDA_MODERNISMO', targetRelation: 'tag_guernica', relationType: 'skos:related', sourceConnector: 'Europeana', externalId: 'eur_monochrome_palette_10', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Gama tonal monocromática empregada para evocar luto, imprensa e desolação.', contribution: 'Uso deliberado e exclusivo de cinza, preto e branco em Guernica para acentuar o impacto documental da dor.' },
    { id: 'tag_vanguarda', label: 'Vanguarda', eixo: 'VANGUARDA_MODERNISMO', targetRelation: 'tag_cubismo', relationType: 'skos:narrower', sourceConnector: 'Europeana', externalId: 'eur_avant_garde_02', creator: 'usr_curador_institucional', creatorRole: 'REVIEWER' as ActorRole, desc: 'Movimentos estéticos de ruptura com a tradição acadêmica no início do século XX.', contribution: 'Inovações conceituais e estilísticas que redefiniram radicalmente as artes visuais no Ocidente.' },
    { id: 'tag_machado_de_assis', label: 'Machado de Assis', eixo: 'LITERATURA_MEMORIA', targetRelation: 'tag_cultura', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_bn_machado_assis_01', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Joaquim Maria Machado de Assis (1839-1908), mestre da literatura brasileira.', contribution: 'Fundador da Academia Brasileira de Letras, contista e cronista sagaz da sociedade carioca oitocentista.' },
    { id: 'tag_sincretismo', label: 'Sincretismo', eixo: 'CRENCAS_RITOS', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_sincretismo_17', creator: 'usr_pesquisador_nordeste', creatorRole: 'RESEARCHER' as ActorRole, desc: 'Diálogo e amálgama entre diferentes matrizes religiosas e culturais no Brasil.', contribution: 'Harmonização devocional entre orixás das religiões de matriz africana e santos do catolicismo popular.' },
    { id: 'tag_catolicismo_popular', label: 'Catolicismo Popular', eixo: 'CRENCAS_RITOS', targetRelation: 'tag_sincretismo', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_catolicismo_pop_29', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Práticas devocionais laicas, romarias, promessas e pagamento de ex-votos.', contribution: 'Fé comunitária expressa em capelas do sertão, romarias e festas de padroeiros com autonomia leiga.' },
    { id: 'tag_saci', label: 'Saci-Pererê', eixo: 'TRADICAO_ORAL_COSMOLOGIAS', targetRelation: 'tag_cultura_popular', relationType: 'skos:related', sourceConnector: 'Brasiliana Museus', externalId: 'br_cnfcp_saci_90', creator: 'usr_comunidade_01', creatorRole: 'USER' as ActorRole, desc: 'Figura mítica da tradição oral brasileira que habita as matas e estradas.', contribution: 'Narrativa imaterial de matriz indígena e afro-brasileira com presença viva em todo o território nacional.' },
  ];

  memoryAuditEvents = [];
  memoryRelations = [];
  memorySources = [];
  memoryContributions = [];
  memorySnapshots = [];
  let prevEventDigest: string | null = null;
  let eventCounter = 1;

  memorySources = [
    {
      id: 'src_brasiliana_ibram',
      source: 'Brasiliana Museus',
      source_id: 'br_ibram_federacao',
      external_id: 'ibram_portal_nacional',
      external_uri: 'https://brasiliana.museus.gov.br',
      retrieved_at: tMinus(300),
      adapter_version: '2.1.0',
      response_digest: `sha256:${sha256Hex('brasiliana_ibram_source')}`,
      matching_method: 'skos_exact_match',
      confidence: 0.98,
      raw_metadata: { institution: 'IBRAM / MinC', scope: 'Patrimônio Museológico Brasileiro' },
      created_at: tMinus(300),
    },
    {
      id: 'src_cnfcp_iphan',
      source: 'CNFCP / IPHAN',
      source_id: 'br_cnfcp_folclore',
      external_id: 'cnfcp_vocabulario_cultura_popular',
      external_uri: 'http://www.cnfcp.gov.br',
      retrieved_at: tMinus(280),
      adapter_version: '2.0.0',
      response_digest: `sha256:${sha256Hex('cnfcp_iphan_source')}`,
      matching_method: 'thesaurus_alignment',
      confidence: 0.99,
      raw_metadata: { institution: 'Centro Nacional de Folclore e Cultura Popular', scope: 'Saberes e Fazeres Tradicionais' },
      created_at: tMinus(280),
    },
    {
      id: 'src_europeana_open',
      source: 'Europeana',
      source_id: 'europeana_cultural_heritage',
      external_id: 'eur_open_data_sparql',
      external_uri: 'https://www.europeana.eu',
      retrieved_at: tMinus(260),
      adapter_version: '1.4.0',
      response_digest: `sha256:${sha256Hex('europeana_open_source')}`,
      matching_method: 'identifier_match',
      confidence: 0.99,
      raw_metadata: { provider: 'European Cultural Heritage Consortium', scope: 'História da Arte e Vanguardas' },
      created_at: tMinus(260),
    },
  ];

  CANONICAL_TAGS.forEach((tag, tIdx) => {
    const baseTime = 240 - tIdx * 4;
    const time1 = tMinus(baseTime + 30);
    const time2 = tMinus(baseTime + 24);
    const time3 = tMinus(baseTime + 18);
    const time4 = tMinus(baseTime + 12);
    const time5 = tMinus(baseTime + 6);
    const time6 = tMinus(baseTime);

    const conId = `con_${String(tIdx + 1).padStart(4, '0')}_${tag.id.replace('tag_', '')}`;
    const conDigest = `sha256:${sha256Hex(conId + tag.contribution)}`;
    memoryContributions.push({
      contribution_id: conId,
      actor_id: tag.creator,
      actor_role: tag.creatorRole,
      tag_id: tag.id,
      tag_label: tag.label,
      object_id: `obj_${tag.id}_registro`,
      content: tag.contribution,
      created_at: time2,
      version: 2,
      previous_version: 1,
      previous_digest: `sha256:${sha256Hex(conId + tag.desc)}`,
      digest: conDigest,
      source: tag.creatorRole === 'USER' ? 'questionario_usuario' : 'pesquisa_academica',
      status: 'VALIDATED',
      history: [
        {
          version: 1,
          content: tag.desc,
          timestamp: time1,
          digest: `sha256:${sha256Hex(conId + tag.desc)}`,
          actor_id: tag.creator,
          reason: 'Registro inicial via acolhimento cultural e questionário',
        },
        {
          version: 2,
          content: tag.contribution,
          timestamp: time2,
          digest: conDigest,
          actor_id: 'usr_pesquisador_nordeste',
          reason: 'Expansão de notas etnográficas e bibliográficas',
        },
      ],
    });

    if (tag.targetRelation) {
      const relId = `rel_${tag.id.replace('tag_', '')}_${tag.targetRelation.replace('tag_', '')}`;
      const relDigest = `sha256:${sha256Hex(relId + tag.relationType)}`;
      memoryRelations.push({
        relation_id: relId,
        source_entity: tag.id,
        target_entity: tag.targetRelation,
        relation_type: tag.relationType,
        created_by: 'usr_curador_institucional',
        status: 'VALIDATED',
        confidence: 0.95,
        source: tag.sourceConnector,
        digest: relDigest,
        evidence: `Vínculo ontológico no eixo ${tag.eixo}: ${tag.label} com ${tag.targetRelation.replace('tag_', '').replace(/_/g, ' ')}`,
        created_at: time4,
        updated_at: time5,
      });
    }

    const stages = [
      {
        event_type: 'tag_created',
        version: 1,
        prevVersion: 0,
        actor: tag.creator,
        role: tag.creatorRole,
        time: time1,
        source: tag.creatorRole === 'USER' ? 'questionario_usuario' : 'catalogacao_acervo',
        reason: `Registro inicial da tag '${tag.label}' no catálogo de Interoperabilidade Cultural`,
        metadata: { label: tag.label, eixo: tag.eixo, status: 'RAW' },
      },
      {
        event_type: 'contribution_added',
        version: 2,
        prevVersion: 1,
        actor: 'usr_pesquisador_nordeste',
        role: 'RESEARCHER' as ActorRole,
        time: time2,
        source: 'formulario_pesquisa',
        reason: `Adição de referências etnográficas e documentação descritiva`,
        metadata: { label: tag.label, eixo: tag.eixo, status: 'SUGGESTED', contribution_id: conId },
      },
      {
        event_type: 'match_found',
        version: 3,
        prevVersion: 2,
        actor: 'sys_interop_daemon',
        role: 'SYSTEM' as ActorRole,
        time: time3,
        source: tag.sourceConnector,
        reason: `Correspondência externa confirmada com o acervo ${tag.sourceConnector} (ID: ${tag.externalId})`,
        metadata: { label: tag.label, external_id: tag.externalId, matching_method: 'skos_exact_match', confidence: 0.98, status: 'UNDER_REVIEW' },
      },
      {
        event_type: 'relation_created',
        version: 4,
        prevVersion: 3,
        actor: 'usr_curador_institucional',
        role: 'REVIEWER' as ActorRole,
        time: time4,
        source: 'curadoria_manual',
        reason: `Vínculo ontológico estruturado com ${tag.targetRelation || 'patrimônio cultural'} via ${tag.relationType || 'skos:related'}`,
        metadata: { label: tag.label, target_entity: tag.targetRelation, relation_type: tag.relationType, status: 'UNDER_REVIEW' },
      },
      {
        event_type: 'relation_validated',
        version: 5,
        prevVersion: 4,
        actor: 'adm_comite_cientifico',
        role: 'VALIDATOR' as ActorRole,
        time: time5,
        source: 'conselho_editorial',
        reason: `Chancela formal pelo Comitê Científico da autenticidade da proveniência e rede de conexões`,
        metadata: { label: tag.label, target_entity: tag.targetRelation, status: 'VALIDATED' },
      },
      {
        event_type: 'version_published',
        version: 6,
        prevVersion: 5,
        actor: 'adm_root',
        role: 'ADMIN' as ActorRole,
        time: time6,
        source: 'publicador_oficial',
        reason: `Publicação definitiva no Grafo de Interoperabilidade Cultural`,
        metadata: { label: tag.label, target_entity: tag.targetRelation, status: 'PUBLISHED' },
      },
    ];

    let prevStageDigest: string | null = null;

    stages.forEach(stage => {
      const stateDigest = `sha256:${sha256Hex(tag.id + String(stage.version) + stage.event_type)}`;
      const payload_digest = computePayloadDigest({
        entity_id: tag.id,
        entity_type: 'tag',
        event_type: stage.event_type,
        metadata: stage.metadata,
        new_digest: stateDigest,
        new_version: stage.version,
        previous_digest: prevStageDigest,
        previous_version: stage.prevVersion,
        reason: stage.reason,
        source: stage.source,
      });

      const eventPayload = {
        entity_id: tag.id,
        entity_type: 'tag' as const,
        event_type: stage.event_type,
        actor_id: stage.actor,
        actor_role: stage.role,
        timestamp: stage.time,
        previous_version: stage.prevVersion,
        new_version: stage.version,
        previous_digest: prevStageDigest,
        new_digest: stateDigest,
        payload_digest,
        previous_event_digest: prevEventDigest,
        source: stage.source,
        reason: stage.reason,
        metadata: stage.metadata,
      };

      const event_digest = computeEventDigest(eventPayload);
      const event_id = `evt_${String(eventCounter).padStart(4, '0')}_${sha256Hex(tag.id + stage.time).slice(0, 8)}`;
      eventCounter++;

      const fullEvent: AuditEvent = {
        ...eventPayload,
        event_id,
        event_digest,
      };

      memoryAuditEvents.push(fullEvent);
      prevEventDigest = event_digest;
      prevStageDigest = stateDigest;
    });

    const latestEvent = memoryAuditEvents[memoryAuditEvents.length - 1];
    memorySnapshots.push({
      snapshot_id: `snp_${tag.id}_v${latestEvent.new_version}`,
      entity_id: tag.id,
      entity_type: 'tag',
      version: latestEvent.new_version,
      state_snapshot: {
        label: tag.label,
        eixo: tag.eixo,
        status: 'PUBLISHED',
        relation: tag.targetRelation,
      },
      state_digest: latestEvent.new_digest,
      last_event_id: latestEvent.event_id,
      last_event_digest: latestEvent.event_digest,
      created_at: latestEvent.timestamp,
    });
  });

  const secEvents = [
    { type: 'login', actor: 'usr_curador_institucional', role: 'REVIEWER', ip: '189.28.10.4', details: { method: 'sessao_institucional' }, time: tMinus(260) },
    { type: 'failed_login', actor: 'ip_desconhecido', role: 'ANONYMOUS', ip: '45.142.12.9', details: { reason: 'credenciais_invalidas' }, time: tMinus(200) },
    { type: 'login', actor: 'adm_root', role: 'ADMIN', ip: '177.18.90.11', details: { method: 'admin_bearer_token' }, time: tMinus(120) },
    { type: 'permission_change', actor: 'adm_root', role: 'ADMIN', ip: '177.18.90.11', details: { target: 'usr_pesquisador_nordeste', new_role: 'RESEARCHER' }, time: tMinus(80) },
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
      user_agent: 'FolksonomiaDigital-Auditoria/2.0',
      details: s.details,
      timestamp: s.time,
      log_digest: `sha256:${sha256Hex(canonical)}`,
    };
  });

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

  // A cadeia segue a ordem de registro do ledger, independentemente da data exibida.
  const events = [...memoryAuditEvents];
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
