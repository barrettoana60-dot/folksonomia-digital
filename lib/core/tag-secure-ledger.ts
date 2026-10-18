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

export type CorrelationStatus = 'suggested' | 'validated' | 'rejected' | 'revoked';

export interface LedgerCorrelationEndpoint {
  submissionId: string;
  canonicalTagId: string;
  tag: string;
  normalizedTag: string;
  createdAt: string;
  metadataDigest: string;
}

export interface AuditableContextCorrelationInput {
  source: LedgerCorrelationEndpoint;
  target: LedgerCorrelationEndpoint;
  relationType: string;
  confidence: number;
  method: string;
  evidenceDigest?: string;
  status?: Extract<CorrelationStatus, 'suggested' | 'validated'>;
  requiresHumanReview?: boolean;
  sourceLabel?: string;
  privateEvidence?: Record<string, unknown>;
}

export interface VisualAnalysisReceipt {
  analysisKey: string;
  contextBlindIndexCount: number;
  auditSequence?: number;
}

export interface RecordedContextCorrelation {
  id: string;
  sourceSubmissionId: string;
  targetSubmissionId: string;
  sourceTagId: string;
  targetTagId: string;
  relationType: string;
  confidence: number;
  status: CorrelationStatus;
  method: string;
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
  /** Identificadores não sensíveis usados para tornar a escrita idempotente. */
  publicMarkers?: Record<string, string | number | boolean>;
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
        ...(params.publicMarkers || {}),
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

async function findAuditByMarker(
  submissionId: string,
  eventType: SecureLedgerEvent,
  marker: Record<string, string | number | boolean>,
): Promise<{ sequence: number } | null> {
  const { data, error } = await supabaseAdmin
    .from('semantic_vault_audit')
    .select('chain_position')
    .eq('vault_id', submissionId)
    .eq('event_type', eventType)
    .contains('public_manifest', marker)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new SecureLedgerStorageError('Não foi possível verificar a idempotência da cadeia auditável.', error.message);
  }
  return data ? { sequence: Number(data.chain_position) } : null;
}

function safeDigest(value: string | undefined, fallback: unknown): string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
    ? value.toLowerCase()
    : generateSignature(fallback);
}

/**
 * Persiste a evidência visual em um registro próprio, imutável e cifrado.
 * Isso possibilita adicionar análise LLM a um legado que já foi selado sem
 * abrir ou alterar o envelope de gênese da contribuição.
 */
export async function recordVisualContextAnalysis(params: {
  input: Pick<SealTagSubmissionInput, 'submissionId' | 'canonicalTagId' | 'tag' | 'normalizedTag' | 'createdAt'>;
  metadataDigest: string;
  visual?: VisualContextForLedger | null;
}): Promise<VisualAnalysisReceipt | null> {
  if (!isVisionBackedAnalysis(params.visual)) return null;
  assertEncryptionConfigured();

  const visual = params.visual!;
  const promptHash = safeDigest(visual.promptHash, {
    domain: 'folksonomia-digital/visual-prompt-fallback/v1',
    submissionId: params.input.submissionId,
    tag: params.input.normalizedTag,
  });
  const imageSha256 = safeDigest(visual.imageSha256, {
    domain: 'folksonomia-digital/visual-image-fallback/v1',
    submissionId: params.input.submissionId,
    promptHash,
  });
  const analysisKey = generateSignature({
    domain: 'folksonomia-digital/visual-analysis/v1',
    submissionId: params.input.submissionId,
    canonicalTagId: params.input.canonicalTagId,
    provider: visual.provider,
    model: visual.model || 'configured-model',
    promptHash,
    imageSha256,
  });
  const contextBlindIndexes = buildVisualContextBlindIndexes(visual);
  const encrypted = encryptWithChecksum({
    schemaVersion: 'tag-visual-analysis-private/v1',
    analysisKey,
    submissionId: params.input.submissionId,
    canonicalTagId: params.input.canonicalTagId,
    analyzedAt: new Date().toISOString(),
    visual,
  });

  const { error: visualInsertError } = await supabaseAdmin
    .from('tag_visual_analyses')
    .insert({
      analysis_key: analysisKey,
      submission_id: params.input.submissionId,
      tag_id: params.input.canonicalTagId,
      metadata_digest: encrypted.signature,
      encrypted_payload: encrypted.envelope,
      encryption_algorithm: 'AES-256-GCM',
      envelope_version: encrypted.info.version,
      key_version: ENCRYPTION_KEY_VERSION,
      provider: visual.provider || 'unknown',
      model: visual.model || null,
      prompt_hash: promptHash,
      image_sha256: imageSha256,
      context_blind_indexes: contextBlindIndexes,
      public_manifest: {
        schemaVersion: 'tag-visual-analysis/v1',
        analysisKey,
        submissionId: params.input.submissionId,
        canonicalTagId: params.input.canonicalTagId,
        metadataDigest: encrypted.signature,
        provider: visual.provider || 'unknown',
        model: visual.model || null,
        promptHash,
        imageSha256,
        encryptionAlgorithm: 'AES-256-GCM',
        envelopeVersion: encrypted.info.version,
        keyVersion: ENCRYPTION_KEY_VERSION,
      },
    });
  if (visualInsertError && (visualInsertError as { code?: string }).code !== '23505') {
    throw new SecureLedgerStorageError('Não foi possível preservar a análise visual no cofre.', visualInsertError.message);
  }

  const marker = { visualAnalysisKey: analysisKey };
  const existingAudit = await findAuditByMarker(params.input.submissionId, 'vault_visual_analysis', marker);
  if (existingAudit) {
    return {
      analysisKey,
      contextBlindIndexCount: contextBlindIndexes.length,
      auditSequence: existingAudit.sequence,
    };
  }

  const visualEvent = await appendAuditEvent({
    input: params.input,
    metadataDigest: params.metadataDigest,
    eventType: 'vault_visual_analysis',
    relations: visualRelations(visual),
    sources: [{
      id: imageSha256,
      label: `${visual.provider || 'vision'}:${visual.model || 'configured-model'}`,
      type: 'visual_inference',
    }],
    privateEvent: {
      analysisKey,
      provider: visual.provider,
      model: visual.model,
      promptHash,
      imageSha256,
      confidence: visual.confidence,
      status: visual.status,
    },
    publicMarkers: marker,
  });

  return {
    analysisKey,
    contextBlindIndexCount: contextBlindIndexes.length,
    auditSequence: visualEvent.sequence,
  };
}

function normalizeCorrelationEndpoints(params: AuditableContextCorrelationInput): {
  source: LedgerCorrelationEndpoint;
  target: LedgerCorrelationEndpoint;
} {
  if (params.source.submissionId === params.target.submissionId) {
    throw new SecureLedgerStorageError('Uma contribuição não pode ser correlacionada consigo mesma.');
  }
  return params.source.submissionId < params.target.submissionId
    ? { source: params.source, target: params.target }
    : { source: params.target, target: params.source };
}

async function persistCorrelationCreationEvent(params: {
  correlation: RecordedContextCorrelation;
  sourceLabel: string;
  requiresHumanReview: boolean;
  privateEvidence?: Record<string, unknown>;
}): Promise<void> {
  const snapshot = {
    schemaVersion: 'tag-context-correlation/v1',
    correlationId: params.correlation.id,
    sourceSubmissionId: params.correlation.sourceSubmissionId,
    targetSubmissionId: params.correlation.targetSubmissionId,
    sourceTagId: params.correlation.sourceTagId,
    targetTagId: params.correlation.targetTagId,
    relationType: params.correlation.relationType,
    confidence: params.correlation.confidence,
    status: params.correlation.status,
    method: params.correlation.method,
    evidenceDigest: params.correlation.evidenceDigest,
    requiresHumanReview: params.requiresHumanReview,
  };
  const encrypted = encryptWithChecksum({
    snapshot,
    sourceLabel: params.sourceLabel,
    ...(params.privateEvidence ? { privateEvidence: params.privateEvidence } : {}),
  });
  const { error } = await supabaseAdmin
    .from('tag_context_correlation_events')
    .insert({
      correlation_id: params.correlation.id,
      event_type: 'created',
      actor: `system:${params.correlation.method}`.slice(0, 240),
      snapshot_digest: generateSignature(snapshot),
      encrypted_payload: encrypted.envelope,
      encryption_algorithm: 'AES-256-GCM',
      envelope_version: encrypted.info.version,
      public_manifest: {
        schemaVersion: 'tag-context-correlation-event/v1',
        correlationId: params.correlation.id,
        eventType: 'created',
        snapshotDigest: generateSignature(snapshot),
        encryptionAlgorithm: 'AES-256-GCM',
        envelopeVersion: encrypted.info.version,
      },
    });
  if (error && (error as { code?: string }).code !== '23505') {
    throw new SecureLedgerStorageError('Não foi possível anexar o recibo imutável da correlação.', error.message);
  }
}

/**
 * Cria uma relação entre dois envelopes já selados e a audita nos dois lados
 * do circuito. Relações preexistentes são retomadas sem duplicar recibos.
 */
export async function recordAuditableContextCorrelation(
  params: AuditableContextCorrelationInput,
): Promise<RecordedContextCorrelation> {
  assertEncryptionConfigured();
  const { source, target } = normalizeCorrelationEndpoints(params);
  const status = params.status || 'suggested';
  const requiresHumanReview = params.requiresHumanReview ?? status !== 'validated';
  const confidence = Math.round(Math.min(1, Math.max(0, params.confidence)) * 100) / 100;
  const evidenceDigest = safeDigest(params.evidenceDigest, {
    domain: 'folksonomia-digital/correlation-evidence/v1',
    sourceSubmissionId: source.submissionId,
    targetSubmissionId: target.submissionId,
    method: params.method,
  });

  let correlationId = '';
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('tag_context_correlations')
    .select('id')
    .eq('source_submission_id', source.submissionId)
    .eq('target_submission_id', target.submissionId)
    .eq('method', params.method)
    .maybeSingle();
  if (existingError) {
    throw new SecureLedgerStorageError('Não foi possível verificar uma correlação existente.', existingError.message);
  }

  if (existing?.id) {
    correlationId = String(existing.id);
  } else {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tag_context_correlations')
      .insert({
        source_submission_id: source.submissionId,
        target_submission_id: target.submissionId,
        source_tag_id: source.canonicalTagId,
        target_tag_id: target.canonicalTagId,
        relation_type: params.relationType,
        confidence,
        method: params.method,
        evidence_digest: evidenceDigest,
        status,
        requires_human_review: requiresHumanReview,
        ...(status === 'validated' ? { reviewed_at: new Date().toISOString(), reviewed_by: 'legacy-system-record' } : {}),
      })
      .select('id')
      .maybeSingle();
    if (insertError && (insertError as { code?: string }).code !== '23505') {
      throw new SecureLedgerStorageError('Não foi possível registrar a correlação protegida.', insertError.message);
    }
    correlationId = inserted?.id ? String(inserted.id) : '';
    if (!correlationId) {
      const { data: raced, error: racedError } = await supabaseAdmin
        .from('tag_context_correlations')
        .select('id')
        .eq('source_submission_id', source.submissionId)
        .eq('target_submission_id', target.submissionId)
        .eq('method', params.method)
        .maybeSingle();
      if (racedError || !raced?.id) {
        throw new SecureLedgerStorageError('Não foi possível recuperar a correlação recém-criada.', racedError?.message || insertError?.message);
      }
      correlationId = String(raced.id);
    }
  }

  const correlation: RecordedContextCorrelation = {
    id: correlationId,
    sourceSubmissionId: source.submissionId,
    targetSubmissionId: target.submissionId,
    sourceTagId: source.canonicalTagId,
    targetTagId: target.canonicalTagId,
    relationType: params.relationType,
    confidence,
    status,
    method: params.method,
    evidenceDigest,
  };

  await persistCorrelationCreationEvent({
    correlation,
    sourceLabel: params.sourceLabel || 'Correlação cultural protegida',
    requiresHumanReview,
    privateEvidence: params.privateEvidence,
  });

  for (const [current, peer] of [[source, target], [target, source]] as const) {
    const marker = { correlationId, correlationMethod: params.method };
    const alreadyAudited = await findAuditByMarker(current.submissionId, 'vault_correlation', marker);
    if (alreadyAudited) continue;
    await appendAuditEvent({
      input: current,
      metadataDigest: current.metadataDigest,
      eventType: 'vault_correlation',
      relations: [{
        targetId: peer.submissionId,
        targetLabel: peer.tag,
        relation: params.relationType,
        evidence: `sha256:${evidenceDigest}`,
      }],
      sources: [{
        id: correlationId,
        label: params.sourceLabel || 'Correlação cultural protegida',
        type: 'protected_context_match',
      }],
      privateEvent: {
        correlationId,
        confidence,
        status,
        method: params.method,
        evidenceDigest,
        requiresHumanReview,
        ...(params.privateEvidence ? { privateEvidence: params.privateEvidence } : {}),
      },
      publicMarkers: marker,
    });
  }

  return correlation;
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

  let existingGenesis: { chainHash: string; sequence: number } | null = null;
  if (secureInsertError) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tag_secure_records')
      .select('metadata_digest')
      .eq('submission_id', input.submissionId)
      .maybeSingle();
    if (existingError || !existing || existing.metadata_digest !== encrypted.signature) {
      throw new SecureLedgerStorageError('O identificador da contribuição já está associado a outro conteúdo selado.');
    }
    const { data: genesisAudit, error: genesisError } = await supabaseAdmin
      .from('semantic_vault_audit')
      .select('chain_hash, chain_position')
      .eq('vault_id', input.submissionId)
      .eq('event_type', 'vault_genesis')
      .order('chain_position', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (genesisError) {
      throw new SecureLedgerStorageError('Não foi possível recuperar a gênese já registrada no cofre.', genesisError.message);
    }
    if (genesisAudit) {
      existingGenesis = {
        chainHash: String(genesisAudit.chain_hash),
        sequence: Number(genesisAudit.chain_position),
      };
    }
  }

  const genesis = existingGenesis || await appendAuditEvent({
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
    const visualReceipt = await recordVisualContextAnalysis({
      input,
      metadataDigest: encrypted.signature,
      visual: input.visual,
    });
    visualAuditSequence = visualReceipt?.auditSequence;
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

  const { data: sealedPeers, error: sealedPeersError } = await supabaseAdmin
    .from('tag_secure_records')
    .select('submission_id, tag_id, context_blind_indexes')
    .neq('submission_id', params.input.submissionId)
    .overlaps('context_blind_indexes', contextBlindIndexes)
    .limit(40);

  if (sealedPeersError) {
    throw new SecureLedgerStorageError('Não foi possível consultar contextos culturais protegidos.', sealedPeersError.message);
  }

  // Análises posteriores ao envelope de gênese também participam da busca.
  // Isso é essencial para o acervo legado: ele pode ser selado primeiro e
  // analisado pelo modelo multimodal assim que uma imagem estiver disponível.
  const { data: visualPeers, error: visualPeersError } = await supabaseAdmin
    .from('tag_visual_analyses')
    .select('submission_id, tag_id, context_blind_indexes')
    .neq('submission_id', params.input.submissionId)
    .overlaps('context_blind_indexes', contextBlindIndexes)
    .limit(80);
  if (visualPeersError) {
    throw new SecureLedgerStorageError('Não foi possível consultar as análises visuais protegidas.', visualPeersError.message);
  }

  const peerMap = new Map<string, { tagId: string; indexes: string[] }>();
  for (const peer of [...(sealedPeers || []), ...(visualPeers || [])]) {
    const submissionId = String(peer.submission_id || '');
    const tagId = String(peer.tag_id || '');
    if (!submissionId || !tagId) continue;
    const current = peerMap.get(submissionId) || { tagId, indexes: [] };
    for (const index of Array.isArray(peer.context_blind_indexes) ? peer.context_blind_indexes : []) {
      if (typeof index === 'string' && !current.indexes.includes(index)) current.indexes.push(index);
    }
    peerMap.set(submissionId, current);
  }

  const peerIds = [...peerMap.keys()];
  const peerLabels = new Map<string, { label: string; normalizedTag: string; createdAt: string }>();
  const peerMetadataDigests = new Map<string, string>();
  if (peerIds.length > 0) {
    const { data: peerSecureRecords, error: peerSecureRecordsError } = await supabaseAdmin
      .from('tag_secure_records')
      .select('submission_id, metadata_digest')
      .in('submission_id', peerIds);
    if (peerSecureRecordsError) {
      throw new SecureLedgerStorageError('Não foi possível recuperar os recibos das contribuições correlacionadas.', peerSecureRecordsError.message);
    }
    for (const peerRecord of peerSecureRecords || []) {
      peerMetadataDigests.set(String(peerRecord.submission_id), String(peerRecord.metadata_digest));
    }

    const { data: peerTags, error: peerTagsError } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, criado_em')
      .in('id', peerIds);
    if (peerTagsError) {
      throw new SecureLedgerStorageError('Não foi possível recuperar os rótulos das contribuições correlacionadas.', peerTagsError.message);
    }
    for (const peerTag of peerTags || []) {
      const label = String(peerTag.tag_original || peerTag.tag_normalizada || 'Contribuição cultural correlacionada').trim();
      peerLabels.set(String(peerTag.id), {
        label,
        normalizedTag: String(peerTag.tag_normalizada || normalizeContextTerm(label).replace(/\s+/g, '_')),
        createdAt: String(peerTag.criado_em || params.input.createdAt),
      });
    }
  }

  const currentSet = new Set(contextBlindIndexes);
  const correlations: ContextCorrelation[] = [];
  for (const [peerSubmissionId, peer] of peerMap) {
    const peerIndexes = peer.indexes;
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

    const peerLabel = peerLabels.get(peerSubmissionId) || {
      label: 'Contribuição cultural correlacionada',
      normalizedTag: `contribuicao_${peerSubmissionId.slice(0, 8)}`,
      createdAt: params.input.createdAt,
    };
    const peerMetadataDigest = peerMetadataDigests.get(peerSubmissionId);
    if (!peerMetadataDigest) continue;
    const [sourceSubmissionId, targetSubmissionId] = [params.input.submissionId, peerSubmissionId].sort();
    const evidenceDigest = generateSignature({
        domain: 'folksonomia-digital/visual-correlation-evidence/v1',
        sourceSubmissionId,
        targetSubmissionId,
        sharedBlindIndexes: [...shared].sort(),
        confidence,
    });
    const recorded = await recordAuditableContextCorrelation({
      source: { ...params.input, metadataDigest: params.metadataDigest },
      target: {
        submissionId: peerSubmissionId,
        canonicalTagId: peer.tagId,
        tag: peerLabel.label,
        normalizedTag: peerLabel.normalizedTag,
        createdAt: peerLabel.createdAt,
        metadataDigest: peerMetadataDigest,
      },
      relationType: 'skos:related',
      confidence,
      method: 'visual_context_hmac_overlap',
      evidenceDigest,
      status: 'suggested',
      requiresHumanReview: true,
      sourceLabel: 'Correlação visual proposta por análise multimodal',
      privateEvidence: { sharedBlindIndexes: [...shared].sort() },
    });
    correlations.push({
      id: recorded.id,
      sourceSubmissionId: recorded.sourceSubmissionId,
      targetSubmissionId: recorded.targetSubmissionId,
      sourceTagId: recorded.sourceTagId,
      targetTagId: recorded.targetTagId,
      confidence: recorded.confidence,
      status: 'suggested',
      method: 'visual_context_hmac_overlap',
      evidenceDigest: recorded.evidenceDigest,
    });
  }

  return correlations;
}
