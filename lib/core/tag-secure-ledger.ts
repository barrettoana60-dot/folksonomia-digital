/**
 * Cofre por contribuição de tag.
 *
 * A identidade canônica (`tag_identities`) representa um conceito cultural.
 * Este módulo representa uma ocorrência criada por uma pessoa: cada envio tem
 * UUID próprio, envelope AES-256-GCM próprio e cadeia de auditoria própria.
 * Assim, duas pessoas podem usar a mesma tag sem colapsar a proveniência.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import {
  assertEncryptionConfigured,
  encryptWithChecksum,
  generateBlindIndex,
  generateSignature,
} from '@/lib/core/crypto';
import { ENCRYPTION_KEY_VERSION } from '@/lib/core/env';
import {
  createSemanticVaultAuditRecord,
  type SemanticVaultRelation,
  type SemanticVaultSource,
  type SemanticVaultAuditInput,
} from '@/lib/core/semantic-vault';

export type SecureLedgerEvent = 'vault_genesis' | 'vault_visual_analysis' | 'vault_correlation';

export interface VisualCandidateForLedger {
  label?: string;
  term?: string;
  tag?: string;
  name?: string;
  family?: string;
  confidence?: number;
  score?: number;
  assessment?: 'supports_tag' | 'related_context' | 'not_evidenced' | string;
}

export interface VisualContextForLedger {
  status?: string;
  provider?: string;
  model?: string;
  promptHash?: string;
  imageSha256?: string;
  confidence?: number;
  candidates?: VisualCandidateForLedger[];
  context?: Record<string, unknown> | string;
}

export interface SealTagSubmissionInput {
  submissionId: string;
  canonicalTagId: string;
  obraId?: string | null;
  tag: string;
  normalizedTag: string;
  createdAt: string;
  privateMetadata: Record<string, unknown>;
  visual?: VisualContextForLedger | null;
}

export interface LedgerReceipt {
  submissionId: string;
  metadataDigest: string;
  auditChainHash: string;
  auditSequence: number;
  visualAuditSequence?: number;
  contextBlindIndexCount: number;
  visualStatus: string;
}

export interface ContextCorrelation {
  id?: string;
  sourceSubmissionId: string;
  targetSubmissionId: string;
  sourceTagId: string;
  targetTagId: string;
  confidence: number;
  status: 'suggested';
  method: 'visual_context_hmac_overlap';
  evidenceDigest: string;
}

export class SecureLedgerStorageError extends Error {
  constructor(message: string, readonly causeMessage?: string) {
    super(message);
    this.name = 'SecureLedgerStorageError';
  }
}

function normalizeContextTerm(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  return [];
}

function candidateLabel(candidate: VisualCandidateForLedger): string | null {
  for (const key of ['label', 'term', 'tag', 'name', 'family'] as const) {
    const value = candidate[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function candidateConfidence(candidate: VisualCandidateForLedger): number {
  const value = candidate.confidence ?? candidate.score;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Only vision-backed output is allowed to originate visual correlations. */
export function isVisionBackedAnalysis(visual?: VisualContextForLedger | null): boolean {
  if (!visual?.provider || visual.provider === 'catalog_only' || visual.provider === 'unavailable') return false;
  const status = String(visual.status || '').toLowerCase();
  return ['analyzed', 'complete', 'completed', 'ok'].includes(status) && (visual.candidates || []).length > 0;
}

/**
 * Produz índices HMAC para termos visuais. Os termos nunca são gravados na
 * tabela de busca; ela contém somente índices cegos calculáveis pelo servidor.
 */
export function buildVisualContextBlindIndexes(visual?: VisualContextForLedger | null): string[] {
  if (!isVisionBackedAnalysis(visual)) return [];

  const terms = new Set<string>();
  for (const candidate of visual?.candidates || []) {
    const confidence = candidateConfidence(candidate);
    const label = candidateLabel(candidate);
    // Uma hipótese marcada como não sustentada pela própria análise nunca
    // pode alimentar a rede, ainda que o modelo tenha atribuído confiança alta.
    if (label && confidence >= 0.55 && candidate.assessment !== 'not_evidenced') {
      terms.add(normalizeContextTerm(label));
    }
  }

  if (visual?.context && typeof visual.context === 'object' && !Array.isArray(visual.context)) {
    const context = visual.context as Record<string, unknown>;
    for (const key of ['family', 'families', 'culturalFamily', 'culturalFamilies', 'themes']) {
      for (const value of stringValues(context[key])) {
        const normalized = normalizeContextTerm(value);
        if (normalized) terms.add(normalized);
      }
    }
  }

  return [...terms]
    .filter(term => term.length >= 3)
    .sort()
    .slice(0, 12)
    .map(term => generateBlindIndex({ term }, 'folksonomia-digital/visual-context-term/v1'));
}

function visualRelations(visual?: VisualContextForLedger | null): SemanticVaultRelation[] {
  if (!isVisionBackedAnalysis(visual)) return [];
  return (visual?.candidates || [])
    .map(candidate => ({
      label: candidateLabel(candidate),
      confidence: candidateConfidence(candidate),
    }))
    .filter((item): item is { label: string; confidence: number } => Boolean(item.label && item.confidence >= 0.55))
    .slice(0, 8)
    .map(item => ({
      targetId: `visual:${generateSignature({ label: item.label }).slice(0, 24)}`,
      // Este campo entra somente no envelope da auditoria, nunca no manifesto público.
      targetLabel: item.label,
      relation: 'interop:visualContextSuggestion',
      evidence: `confidence:${item.confidence.toFixed(2)}`,
    }));
}

function toAuditInput(params: {
  input: Pick<SealTagSubmissionInput, 'submissionId' | 'canonicalTagId' | 'tag' | 'normalizedTag' | 'createdAt'>;
  metadataDigest: string;
  eventType: SecureLedgerEvent;
  sequence: number;
  previousHash: string | null;
  relations?: SemanticVaultRelation[];
  sources?: SemanticVaultSource[];
  occurredAt: string;
}): SemanticVaultAuditInput {
  return {
    vaultId: params.input.submissionId,
    label: params.input.tag,
    normalizedLabel: params.input.normalizedTag,
    semanticTriple: {
      subject: params.input.canonicalTagId,
      predicate: 'interop:hasSealedUserContribution',
      object: `sha256:${params.metadataDigest}`,
    },
    relations: params.relations || [],
    sources: [
      {
        id: `sha256:${params.metadataDigest}`,
        label: 'Metadados de contribuição cifrados',
        type: 'sealed_metadata',
      },
      ...(params.sources || []),
    ],
    provenance: {
      actorScope: 'user_contribution',
      createdAt: params.input.createdAt,
      sourceRecordId: params.input.submissionId,
    },
    heartbeat: {
      pulseCount: params.sequence,
      lastPulse: params.occurredAt,
      connectionCount: params.relations?.length || 0,
      generation: params.sequence,
    },
    eventType: params.eventType,
    sequence: params.sequence,
    previousHash: params.previousHash,
    occurredAt: params.occurredAt,
  };
}

async function appendAuditEvent(params: {
  input: Pick<SealTagSubmissionInput, 'submissionId' | 'canonicalTagId' | 'tag' | 'normalizedTag' | 'createdAt'>;
  metadataDigest: string;
  eventType: SecureLedgerEvent;
  relations?: SemanticVaultRelation[];
  sources?: SemanticVaultSource[];
  privateEvent?: Record<string, unknown>;
}): Promise<{ chainHash: string; sequence: number }> {
  assertEncryptionConfigured();

  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: previous, error: previousError } = await supabaseAdmin
      .from('semantic_vault_audit')
      .select('chain_hash, chain_position')
      .eq('vault_id', params.input.submissionId)
      .order('chain_position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError) {
      throw new SecureLedgerStorageError('Não foi possível ler a cadeia de auditoria do cofre.', previousError.message);
    }

    const occurredAt = new Date().toISOString();
    const record = createSemanticVaultAuditRecord(toAuditInput({
      input: params.input,
      metadataDigest: params.metadataDigest,
      eventType: params.eventType,
      sequence: previous ? Number(previous.chain_position) + 1 : 1,
      previousHash: previous?.chain_hash || null,
      relations: params.relations,
      sources: params.sources,
      occurredAt,
    }));

    const encrypted = encryptWithChecksum({
      audit: record.auditPayload,
      sealedMetadataDigest: params.metadataDigest,
      ...(params.privateEvent ? { eventDetail: params.privateEvent } : {}),
    });

    const { error: insertError } = await supabaseAdmin.from('semantic_vault_audit').insert({
      vault_id: params.input.submissionId,
      event_type: params.eventType,
      chain_position: record.sequence,
      previous_hash: record.previousHash,
      chain_hash: record.chainHash,
      payload_hash: record.payloadHash,
      payload_hash_wide: record.payloadHashWide,
      cross_hash: record.crossHash,
      cross_hash_wide: record.crossHashWide,
      genetic_code: record.geneticCode,
      genetic_seed: record.geneticSeed,
      public_manifest: {
        schemaVersion: 'tag-secure-ledger/v1',
        eventType: params.eventType,
        submissionId: params.input.submissionId,
        canonicalTagId: params.input.canonicalTagId,
        metadataDigest: params.metadataDigest,
        sequence: record.sequence,
        chainHash: record.chainHash,
        payloadHash: record.payloadHash,
        crossHash: record.crossHash,
        envelopeVersion: encrypted.info.version,
        encryptionAlgorithm: 'AES-256-GCM',
        keyVersion: ENCRYPTION_KEY_VERSION,
      },
      encrypted_payload: encrypted.envelope,
      encryption_algorithm: 'AES-256-GCM',
      compression: 'gzip',
      envelope_version: encrypted.info.version,
      created_at: occurredAt,
    });

    if (!insertError) return { chainHash: record.chainHash, sequence: record.sequence };
    lastError = insertError.message;
    // A cadeia é concorrente por natureza. Releia e tente novamente somente
    // para a colisão de posição/hash; outros erros não são recuperáveis.
    const retryableRace = (insertError as any).code === '23505'
      || /cadeia do cofre/i.test(insertError.message || '');
    if (!retryableRace) break;
  }

  throw new SecureLedgerStorageError('Não foi possível anexar o evento à cadeia auditável.', lastError);
}

export async function sealTagSubmission(input: SealTagSubmissionInput): Promise<LedgerReceipt> {
  assertEncryptionConfigured();
  const metadata = {
    schemaVersion: 'tag-submission-private/v1',
    sealedAt: input.createdAt,
    submissionId: input.submissionId,
    canonicalTagId: input.canonicalTagId,
    ...(input.obraId ? { obraId: input.obraId } : {}),
    ...input.privateMetadata,
  };
  const encrypted = encryptWithChecksum(metadata);
  const contextBlindIndexes = buildVisualContextBlindIndexes(input.visual);
  const visualStatus = String(input.visual?.status || 'not_requested');

  const recordPayload = {
    submission_id: input.submissionId,
    tag_id: input.canonicalTagId,
    obra_id: input.obraId || null,
    metadata_digest: encrypted.signature,
    encrypted_metadata: encrypted.envelope,
    encryption_algorithm: 'AES-256-GCM',
    envelope_version: encrypted.info.version,
    key_version: ENCRYPTION_KEY_VERSION,
    public_manifest: {
      schemaVersion: 'tag-secure-record/v1',
      submissionId: input.submissionId,
      canonicalTagId: input.canonicalTagId,
      metadataDigest: encrypted.signature,
      encryptionAlgorithm: 'AES-256-GCM',
      envelopeVersion: encrypted.info.version,
      keyVersion: ENCRYPTION_KEY_VERSION,
      visualStatus,
    },
    context_blind_indexes: contextBlindIndexes,
    visual_status: visualStatus,
    visual_model: input.visual?.model || null,
    created_at: input.createdAt,
  };

  const { error: secureInsertError } = await supabaseAdmin
    .from('tag_secure_records')
    .insert(recordPayload);

  if (secureInsertError && (secureInsertError as any).code !== '23505') {
    throw new SecureLedgerStorageError('Não foi possível selar os metadados da contribuição.', secureInsertError.message);
  }

  if (secureInsertError) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tag_secure_records')
      .select('metadata_digest')
      .eq('submission_id', input.submissionId)
      .maybeSingle();
    if (existingError || !existing || existing.metadata_digest !== encrypted.signature) {
      throw new SecureLedgerStorageError('O identificador da contribuição já está associado a outro conteúdo selado.');
    }
  }

  const genesis = await appendAuditEvent({
    input,
    metadataDigest: encrypted.signature,
    eventType: 'vault_genesis',
    sources: [{
      id: input.submissionId,
      label: 'Contribuição de usuário registrada',
      type: 'user_contribution',
    }],
  });

  let visualAuditSequence: number | undefined;
  if (isVisionBackedAnalysis(input.visual)) {
    const visualEvent = await appendAuditEvent({
      input,
      metadataDigest: encrypted.signature,
      eventType: 'vault_visual_analysis',
      relations: visualRelations(input.visual),
      sources: [{
        id: input.visual?.imageSha256 || `submission:${input.submissionId}`,
        label: `${input.visual?.provider || 'vision'}:${input.visual?.model || 'configured-model'}`,
        type: 'visual_inference',
      }],
      privateEvent: {
        provider: input.visual?.provider,
        model: input.visual?.model,
        promptHash: input.visual?.promptHash,
        imageSha256: input.visual?.imageSha256,
        confidence: input.visual?.confidence,
        status: input.visual?.status,
      },
    });
    visualAuditSequence = visualEvent.sequence;
  }

  return {
    submissionId: input.submissionId,
    metadataDigest: encrypted.signature,
    auditChainHash: genesis.chainHash,
    auditSequence: genesis.sequence,
    visualAuditSequence,
    contextBlindIndexCount: contextBlindIndexes.length,
    visualStatus,
  };
}

export async function discoverAndRecordVisualContextCorrelations(params: {
  input: Pick<SealTagSubmissionInput, 'submissionId' | 'canonicalTagId' | 'tag' | 'normalizedTag' | 'createdAt'>;
  metadataDigest: string;
  visual?: VisualContextForLedger | null;
}): Promise<ContextCorrelation[]> {
  const contextBlindIndexes = buildVisualContextBlindIndexes(params.visual);
  if (contextBlindIndexes.length === 0) return [];

  const { data: peers, error: peersError } = await supabaseAdmin
    .from('tag_secure_records')
    .select('submission_id, tag_id, context_blind_indexes')
    .neq('submission_id', params.input.submissionId)
    .overlaps('context_blind_indexes', contextBlindIndexes)
    .limit(40);

  if (peersError) {
    throw new SecureLedgerStorageError('Não foi possível consultar contextos culturais protegidos.', peersError.message);
  }

  const currentSet = new Set(contextBlindIndexes);
  const correlations: ContextCorrelation[] = [];
  for (const peer of peers || []) {
    const peerIndexes = Array.isArray(peer.context_blind_indexes) ? peer.context_blind_indexes : [];
    const shared = peerIndexes.filter((index: string) => currentSet.has(index));
    if (shared.length === 0) continue;

    const union = new Set([...currentSet, ...peerIndexes]);
    const jaccard = shared.length / Math.max(union.size, 1);
    // Um único descritor compartilhado é um sinal fraco: mantém-se visível
    // para curadoria, mas sem se apresentar como vínculo cultural confirmado.
    const confidenceCeiling = shared.length >= 2 ? 0.93 : 0.78;
    const confidence = Math.min(
      confidenceCeiling,
      Number((0.45 + jaccard * 0.25 + Math.min(shared.length, 3) * 0.1).toFixed(2)),
    );
    if (confidence < 0.6) continue;

    const [sourceSubmissionId, targetSubmissionId] = [params.input.submissionId, String(peer.submission_id)].sort();
    const sourceIsCurrent = sourceSubmissionId === params.input.submissionId;
    const correlation: ContextCorrelation = {
      sourceSubmissionId,
      targetSubmissionId,
      sourceTagId: sourceIsCurrent ? params.input.canonicalTagId : String(peer.tag_id),
      targetTagId: sourceIsCurrent ? String(peer.tag_id) : params.input.canonicalTagId,
      confidence,
      status: 'suggested',
      method: 'visual_context_hmac_overlap',
      evidenceDigest: generateSignature({
        domain: 'folksonomia-digital/visual-correlation-evidence/v1',
        sourceSubmissionId,
        targetSubmissionId,
        sharedBlindIndexes: [...shared].sort(),
        confidence,
      }),
    };

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tag_context_correlations')
      .select('id')
      .eq('source_submission_id', sourceSubmissionId)
      .eq('target_submission_id', targetSubmissionId)
      .eq('method', correlation.method)
      .maybeSingle();
    if (existingError) {
      throw new SecureLedgerStorageError('Não foi possível verificar uma correlação existente.', existingError.message);
    }
    if (existing) continue;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tag_context_correlations')
      .insert({
        source_submission_id: correlation.sourceSubmissionId,
        target_submission_id: correlation.targetSubmissionId,
        source_tag_id: correlation.sourceTagId,
        target_tag_id: correlation.targetTagId,
        relation_type: 'skos:related',
        confidence: correlation.confidence,
        method: correlation.method,
        evidence_digest: correlation.evidenceDigest,
        status: correlation.status,
        requires_human_review: true,
      })
      .select('id')
      .maybeSingle();
    if (insertError && (insertError as any).code !== '23505') {
      throw new SecureLedgerStorageError('Não foi possível registrar a correlação sugerida.', insertError.message);
    }
    if (inserted?.id) correlation.id = inserted.id;

    // A relação é somente uma sugestão até revisão humana, mas sua geração já
    // fica encadeada e verificável no cofre da contribuição atual.
    await appendAuditEvent({
      input: params.input,
      metadataDigest: params.metadataDigest,
      eventType: 'vault_correlation',
      relations: [{
        targetId: String(peer.submission_id),
        targetLabel: 'Contribuição com contexto visual compatível',
        relation: 'skos:related',
        evidence: `sha256:${correlation.evidenceDigest}`,
      }],
      sources: [{
        id: String(peer.submission_id),
        label: 'Registro cultural correlacionado',
        type: 'protected_context_match',
      }],
      privateEvent: {
        correlationId: correlation.id,
        confidence: correlation.confidence,
        status: correlation.status,
        evidenceDigest: correlation.evidenceDigest,
      },
    });
    correlations.push(correlation);
  }

  return correlations;
}
