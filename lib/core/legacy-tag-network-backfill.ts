/**
 * Incorporação automática do acervo já existente.
 *
 * O banco histórico já possui tags, núcleos, obras e relações. Este worker é
 * disparado pela própria leitura da rede pública e, em pequenos lotes
 * idempotentes, converte cada tag em uma contribuição selada. Não recria tags,
 * não substitui as relações existentes e não exige que alguém reenvie os 150
 * registros pela interface.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import {
  generateSignature,
  getEncryptionStatus,
} from '@/lib/core/crypto';
import { GEMINI_API_KEY } from '@/lib/core/env';
import { createTagIdentity, generateTagId, type TagIdentity } from '@/lib/core/tag-identity';
import { persistContribution, persistVersionChain } from '@/lib/core/contribution-network';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { analyzeVisualContext, type VisualContextAnalysis } from '@/lib/ml/visual-context';
import {
  discoverAndRecordVisualContextCorrelations,
  isVisionBackedAnalysis,
  recordAuditableContextCorrelation,
  recordVisualContextAnalysis,
  sealTagSubmission,
  type LedgerCorrelationEndpoint,
  type VisualContextForLedger,
} from '@/lib/core/tag-secure-ledger';

const TAG_PAGE_SIZE = 500;
const STRUCTURAL_BATCH_SIZE = 8;
const VISUAL_BATCH_SIZE = 2;
const CORRELATION_BATCH_SIZE = 16;
const MAX_GROUP_MEMBERS = 24;
const MAX_GENERATED_RELATIONS = 800;

type LegacyTagRow = {
  id: string;
  obra_id?: string | null;
  nucleo_id?: string | null;
  tag_original?: string | null;
  tag_normalizada?: string | null;
  grupo_tematico?: string | null;
  status?: string | null;
  criado_em?: string | null;
};

type LegacyNucleusRow = {
  id: string;
  obra_id?: string | null;
  conteudo_original?: string | null;
  conteudo_normalizado?: string | null;
  contexto?: Record<string, unknown> | null;
  metadados?: Record<string, unknown> | null;
  origem?: string | null;
  assinatura_hash?: string | null;
  status_validacao?: string | null;
  confianca?: number | null;
  novidade?: number | null;
  tensao?: number | null;
  ressonancia?: number | null;
  visitante_id?: string | null;
  criado_em?: string | null;
};

type LegacyArtworkRow = {
  id: string;
  titulo?: string | null;
  artista?: string | null;
  ano?: string | null;
  tipo?: string | null;
  descricao?: string | null;
  material?: string | null;
  tecnica?: string | null;
  dimensoes?: string | null;
  origem?: string | null;
  imagem_url?: string | null;
  metadados?: Record<string, unknown> | null;
  publicado?: boolean | null;
  criado_em?: string | null;
};

type SecureRecordRow = {
  submission_id: string;
  tag_id: string;
  metadata_digest: string;
  obra_id?: string | null;
};

interface LegacyEntry {
  tag: LegacyTagRow;
  nucleus?: LegacyNucleusRow;
  artwork?: LegacyArtworkRow;
  label: string;
  normalizedTag: string;
  createdAt: string;
  eixo: string;
}

interface LegacyRelationCandidate {
  source: LedgerCorrelationEndpoint;
  target: LedgerCorrelationEndpoint;
  relationType: string;
  confidence: number;
  method: string;
  status: 'suggested' | 'validated';
  requiresHumanReview: boolean;
  sourceLabel: string;
  privateEvidence: Record<string, unknown>;
}

export interface LegacyBackfillProgress {
  state: 'running' | 'complete' | 'blocked';
  totalTags: number;
  sealedTags: number;
  remainingTags: number;
  visualAnalyses: number;
  visualRemaining: number;
  correlations: number;
  correlationsRemaining: number;
  processedThisRun: number;
  message: string;
  code?: string;
  diagnosticCode?: string;
}

export interface LegacyNetworkPreview {
  nodes: Array<{
    id: string;
    label: string;
    normalizedLabel: string;
    eixo: string;
    familia: string;
    createdAt: string;
    obra?: {
      id: string;
      titulo?: string | null;
      artista?: string | null;
      ano?: string | null;
      tipo?: string | null;
      descricao?: string | null;
      material?: string | null;
      tecnica?: string | null;
      origem?: string | null;
      imagemUrl?: string | null;
    } | null;
    contextoTag?: {
      nucleoId: string | null;
      conteudoOriginal?: string | null;
      conteudoNormalizado?: string | null;
      origem?: string | null;
    };
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;
    skosRelation: string;
    discovered: boolean;
    auditPending: boolean;
  }>;
}

let activeBackfill: Promise<LegacyBackfillProgress> | null = null;

function plainString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stableCreatedAt(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const candidate = plainString(value);
    if (candidate) return candidate;
  }
  return '1970-01-01T00:00:00.000Z';
}

function normalizeLegacyTag(label: string, id: string): string {
  const normalized = normalizeForComparison(label).replace(/\s+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || `registro_cultural_${id.replace(/-/g, '').slice(0, 16)}`;
}

function legacyLabel(tag: LegacyTagRow, nucleus?: LegacyNucleusRow): string {
  return plainString(tag.tag_original)
    || plainString(tag.tag_normalizada)
    || plainString(nucleus?.conteudo_original)
    || plainString(nucleus?.conteudo_normalizado)
    || `Registro cultural ${tag.id.slice(0, 8)}`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clampConfidence(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(Math.max(0, Math.min(1, parsed)) * 100) / 100;
}

function slug(value: string, fallback: string): string {
  const result = value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return result || fallback;
}

function isServiceRoleConfigured(): boolean {
  return Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
}

function extractFailure(error: unknown): { code: string; message: string } {
  const codes: string[] = [];
  const messages: string[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth = 0) => {
    if (depth > 3 || value == null || seen.has(value)) return;
    if (typeof value === 'string') {
      if (value.trim()) messages.push(value.trim());
      return;
    }
    if (typeof value !== 'object') return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.code === 'string' || typeof record.code === 'number') codes.push(String(record.code));
    for (const key of ['message', 'details', 'hint', 'causeMessage']) {
      if (typeof record[key] === 'string' && String(record[key]).trim()) messages.push(String(record[key]).trim());
    }
    if (record.cause) visit(record.cause, depth + 1);
  };
  visit(error);
  return {
    code: codes[0] || '',
    message: [...new Set(messages)].join(' '),
  };
}

function classifyBackfillFailure(error: unknown): {
  category: string;
  code: string;
  message: string;
} {
  const failure = extractFailure(error);
  const material = `${failure.code} ${failure.message}`.toLowerCase();
  const missingSchema = /pgrst20[45]|42p01|42703/.test(material)
    || /relation .* does not exist|schema cache.*(table|column)|could not find the .* in the schema cache/i.test(material);
  if (missingSchema) {
    return {
      category: 'secure_schema_not_applied',
      code: failure.code || 'SCHEMA_MISSING',
      message: 'O banco não tem todas as tabelas/colunas exigidas. Aplique as migrações do projeto até 0015, especialmente 0014_secure_tag_ledger.sql e 0015_legacy_tag_network_backfill.sql no Supabase; nenhum registro confirmado foi apagado.',
    };
  }
  if (/42501|pgrst30[12]|401|403/.test(material) || /permission denied|invalid jwt|invalid api key|row-level security|not authorized/i.test(material)) {
    return {
      category: 'database_write_authorization',
      code: failure.code || 'DATABASE_AUTH',
      message: 'O Supabase recusou a escrita. A variável SUPABASE_SERVICE_ROLE_KEY do servidor está ausente, inválida ou sem acesso de escrita.',
    };
  }
  if (/econn|etimedout|enotfound|fetch failed|network|socket/i.test(material)) {
    return {
      category: 'database_unreachable',
      code: failure.code || 'DATABASE_NETWORK',
      message: 'O servidor não conseguiu alcançar o Supabase. Verifique a URL e a conectividade do projeto e recarregue para retomar.',
    };
  }
  return {
    category: 'backfill_failed',
    code: failure.code || 'UNCLASSIFIED',
    message: `A incorporação foi interrompida com o código ${failure.code || 'sem código'}; os recibos já confirmados foram preservados. Consulte os logs do servidor para a etapa exata e recarregue depois da correção.`,
  };
}

async function fetchAllTags(): Promise<LegacyTagRow[]> {
  const rows: LegacyTagRow[] = [];
  for (let from = 0; ; from += TAG_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, obra_id, nucleo_id, tag_original, tag_normalizada, grupo_tematico, status, criado_em')
      .order('criado_em', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + TAG_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []) as LegacyTagRow[];
    rows.push(...page);
    if (page.length < TAG_PAGE_SIZE) break;
  }
  return rows;
}

/**
 * A leitura da rede não deve depender de metadados opcionais do esquema antigo.
 * Começa com os vínculos mais úteis e reduz a projeção até chegar ao par mínimo
 * id/rótulo, preservando a visualização mesmo em instalações legadas.
 */
async function fetchPreviewTags(): Promise<LegacyTagRow[]> {
  const projections = [
    'id, obra_id, nucleo_id, tag_original, tag_normalizada, grupo_tematico, criado_em',
    'id, obra_id, nucleo_id, tag_original, tag_normalizada',
    'id, tag_original, tag_normalizada',
    'id, tag_original',
    'id',
  ];
  const rows: LegacyTagRow[] = [];
  let projectionIndex = 0;

  for (let from = 0; ; from += TAG_PAGE_SIZE) {
    let page: LegacyTagRow[] | null = null;
    let lastError: unknown;
    for (let index = projectionIndex; index < projections.length; index += 1) {
      const { data, error } = await supabaseAdmin
        .from('tags')
        .select(projections[index])
        .order('id', { ascending: true })
        .range(from, from + TAG_PAGE_SIZE - 1);
      if (!error) {
        projectionIndex = index;
        page = (data || []) as LegacyTagRow[];
        break;
      }
      lastError = error;
      const failure = extractFailure(error);
      const missingColumn = /42703|pgrst204/.test(`${failure.code} ${failure.message}`.toLowerCase())
        || /column .* does not exist|could not find the .* column|schema cache.*column/i.test(failure.message);
      if (!missingColumn) throw error;
    }
    if (!page) throw lastError || new Error('Não foi possível ler as tags históricas.');
    rows.push(...page);
    if (page.length < TAG_PAGE_SIZE) break;
  }
  return rows;
}

async function fetchPreviewContextRows(
  table: 'obras' | 'nucleos',
  ids: string[],
): Promise<Array<Record<string, any>>> {
  if (ids.length === 0) return [];
  const projections = table === 'obras'
    ? [
        'id, titulo, artista, ano, tipo, descricao, material, tecnica, origem, imagem_url',
        'id, titulo, artista, ano, tipo, descricao, material, tecnica, imagem_url',
        'id, titulo, artista, descricao, imagem_url',
        'id, titulo',
      ]
    : [
        'id, obra_id, conteudo_original, conteudo_normalizado, origem',
        'id, obra_id, conteudo_original, conteudo_normalizado',
        'id, obra_id, conteudo_original',
        'id, obra_id',
      ];
  const rows: Array<Record<string, any>> = [];

  for (let offset = 0; offset < ids.length; offset += 180) {
    const batch = ids.slice(offset, offset + 180);
    let selectedRows: Array<Record<string, any>> | null = null;
    let lastError: unknown;
    for (const projection of projections) {
      const { data, error } = await supabaseAdmin.from(table).select(projection).in('id', batch);
      if (!error) {
        selectedRows = (data || []) as Array<Record<string, any>>;
        break;
      }
      lastError = error;
      const failure = extractFailure(error);
      const missingColumn = /42703|pgrst204/.test(`${failure.code} ${failure.message}`.toLowerCase())
        || /column .* does not exist|could not find the .* column|schema cache.*column/i.test(failure.message);
      if (!missingColumn) return rows;
    }
    if (!selectedRows) {
      if (lastError) return rows;
      break;
    }
    rows.push(...selectedRows);
  }
  return rows;
}

async function fetchRowsByIds(table: 'nucleos' | 'obras', select: string, ids: string[]): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; offset < ids.length; offset += 180) {
    const batch = ids.slice(offset, offset + 180);
    if (batch.length === 0) continue;
    const { data, error } = await supabaseAdmin.from(table).select(select).in('id', batch);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

async function fetchSecureRecords(submissionIds: string[]): Promise<SecureRecordRow[]> {
  const rows: SecureRecordRow[] = [];
  for (let offset = 0; offset < submissionIds.length; offset += 180) {
    const batch = submissionIds.slice(offset, offset + 180);
    if (batch.length === 0) continue;
    const { data, error } = await supabaseAdmin
      .from('tag_secure_records')
      .select('submission_id, tag_id, metadata_digest, obra_id')
      .in('submission_id', batch);
    if (error) throw error;
    rows.push(...((data || []) as SecureRecordRow[]));
  }
  return rows;
}

async function fetchLegacyContributionIds(submissionIds: string[]): Promise<Set<string>> {
  const ids: string[] = [];
  for (let offset = 0; offset < submissionIds.length; offset += 180) {
    ids.push(...submissionIds.slice(offset, offset + 180).map(id => `legacy_submission_${id}`));
  }
  const found = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 180) {
    const batch = ids.slice(offset, offset + 180);
    if (batch.length === 0) continue;
    const { data, error } = await supabaseAdmin
      .from('tag_contributions')
      .select('contribution_id')
      .in('contribution_id', batch);
    if (error) throw error;
    for (const row of data || []) found.add(String(row.contribution_id));
  }
  return found;
}

async function loadLegacyEntries(): Promise<LegacyEntry[]> {
  const tags = await fetchAllTags();
  const nucleusIds = [...new Set(tags.map(tag => plainString(tag.nucleo_id)).filter(Boolean))];
  const nuclei = await fetchRowsByIds(
    'nucleos',
    'id, obra_id, conteudo_original, conteudo_normalizado, contexto, metadados, origem, assinatura_hash, status_validacao, confianca, novidade, tensao, ressonancia, visitante_id, criado_em',
    nucleusIds,
  );
  const nucleiById = new Map((nuclei as LegacyNucleusRow[]).map(row => [String(row.id), row]));
  const artworkIds = [...new Set([
    ...tags.map(tag => plainString(tag.obra_id)),
    ...(nuclei as LegacyNucleusRow[]).map(row => plainString(row.obra_id)),
  ].filter(Boolean))];
  const artworks = await fetchRowsByIds(
    'obras',
    'id, titulo, artista, ano, tipo, descricao, material, tecnica, dimensoes, origem, imagem_url, metadados, publicado, criado_em',
    artworkIds,
  );
  const artworksById = new Map((artworks as LegacyArtworkRow[]).map(row => [String(row.id), row]));

  return tags.map(tag => {
    const nucleus = tag.nucleo_id ? nucleiById.get(String(tag.nucleo_id)) : undefined;
    const artwork = tag.obra_id ? artworksById.get(String(tag.obra_id)) : undefined;
    const label = legacyLabel(tag, nucleus);
    return {
      tag,
      nucleus,
      artwork,
      label,
      normalizedTag: normalizeLegacyTag(label, tag.id),
      createdAt: stableCreatedAt(tag.criado_em, nucleus?.criado_em, artwork?.criado_em),
      eixo: plainString(tag.grupo_tematico, 'PATRIMONIO'),
    };
  });
}

async function ensureTagObjectLink(tagId: string, artwork?: LegacyArtworkRow): Promise<void> {
  if (!artwork?.id) return;
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('tag_objects')
    .select('id')
    .eq('tag_id', tagId)
    .eq('object_id', artwork.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;
  const { error } = await supabaseAdmin.from('tag_objects').insert({
    tag_id: tagId,
    object_id: artwork.id,
    object_type: 'obra',
    title: artwork.titulo || null,
  });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

async function ensureLegacyIdentityProvenance(
  identity: Pick<TagIdentity, 'tagId' | 'digest'>,
  entry: LegacyEntry,
): Promise<void> {
  const contributionId = `legacy_identity_${identity.tagId}`;
  const contributionDigest = generateSignature({
    domain: 'folksonomia-digital/legacy-identity-genesis/v1',
    tagId: identity.tagId,
    identityDigest: identity.digest,
  });
  const version = await persistVersionChain({
    tagId: identity.tagId,
    version: 1,
    previousDigest: null,
    currentDigest: identity.digest,
    eventType: 'genesis',
    actor: 'system:legacy-tag-backfill',
    description: 'Identidade canônica criada a partir do acervo histórico já existente.',
  });
  if (!version.success) throw new Error(version.error || 'Falha ao registrar a gênese da identidade histórica.');

  const contribution = await persistContribution({
    contributionId,
    tagId: identity.tagId,
    objectId: entry.artwork?.id,
    timestamp: entry.createdAt,
    type: 'criacao',
    content: 'Identidade canônica incorporada do acervo histórico.',
    previousState: null,
    currentState: identity.digest,
    digest: contributionDigest,
    relationships: [],
    contributorHash: entry.nucleus?.visitante_id
      ? generateSignature({ domain: 'folksonomia-digital/legacy-contributor/v1', visitorId: entry.nucleus.visitante_id })
      : undefined,
  });
  if (!contribution.success) throw new Error(contribution.error || 'Falha ao registrar a contribuição de gênese histórica.');
}

async function ensureLegacyCanonicalIdentity(entry: LegacyEntry): Promise<Pick<TagIdentity, 'tagId' | 'digest'>> {
  const expectedTagId = generateTagId(entry.normalizedTag);
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('tag_identities')
    .select('tag_id, digest')
    .eq('tag_id', expectedTagId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    await ensureTagObjectLink(String(existing.tag_id), entry.artwork);
    const identity = { tagId: String(existing.tag_id), digest: String(existing.digest) };
    await ensureLegacyIdentityProvenance(identity, entry);
    return identity;
  }

  const identity = createTagIdentity({
    tag: entry.label,
    normalizedLabel: entry.normalizedTag,
    eixo: entry.eixo,
    objectId: entry.artwork?.id,
    objectTitle: entry.artwork?.titulo || undefined,
  });
  const { error: insertError } = await supabaseAdmin.from('tag_identities').insert({
    tag_id: identity.tagId,
    tag: identity.tag,
    normalized_label: identity.normalizedLabel,
    version: identity.version,
    digest: identity.digest,
    eixo: identity.eixo || null,
    created_at: identity.createdAt,
    updated_at: identity.updatedAt,
  });
  if (insertError && (insertError as { code?: string }).code !== '23505') throw insertError;

  if (insertError) {
    let { data: raced, error: racedError } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, digest')
      .eq('tag_id', expectedTagId)
      .maybeSingle();
    if (!raced && !racedError) {
      const fallback = await supabaseAdmin
        .from('tag_identities')
        .select('tag_id, digest')
        .eq('normalized_label', entry.normalizedTag)
        .maybeSingle();
      raced = fallback.data;
      racedError = fallback.error;
    }
    if (racedError || !raced) throw racedError || insertError;
    await ensureTagObjectLink(String(raced.tag_id), entry.artwork);
    const identity = { tagId: String(raced.tag_id), digest: String(raced.digest) };
    await ensureLegacyIdentityProvenance(identity, entry);
    return identity;
  }

  await ensureTagObjectLink(identity.tagId, entry.artwork);
  await ensureLegacyIdentityProvenance(identity, entry);
  return identity;
}

function pendingVisual(entry: LegacyEntry): VisualContextForLedger {
  const hasImage = Boolean(plainString(entry.artwork?.imagem_url));
  return {
    status: hasImage ? 'pending_visual_analysis' : 'image_unavailable',
    provider: hasImage ? 'unavailable' : 'catalog_only',
    promptHash: generateSignature({
      domain: 'folksonomia-digital/legacy-visual-pending/v1',
      tagId: entry.tag.id,
      tag: entry.normalizedTag,
    }),
    candidates: [],
    context: { pendingVisualAnalysis: hasImage },
  };
}

async function analyzeLegacyVisualContext(entry: LegacyEntry): Promise<VisualContextAnalysis | VisualContextForLedger> {
  if (!GEMINI_API_KEY.trim() || !plainString(entry.artwork?.imagem_url)) return pendingVisual(entry);
  return analyzeVisualContext({
    tag: entry.label,
    imageUrl: entry.artwork?.imagem_url,
    catalog: {
      title: entry.artwork?.titulo,
      artist: entry.artwork?.artista,
      description: entry.artwork?.descricao,
      material: entry.artwork?.material,
      technique: entry.artwork?.tecnica,
      origin: entry.artwork?.origem,
    },
  });
}

function privateLegacyMetadata(entry: LegacyEntry): Record<string, unknown> {
  return {
    schemaVersion: 'legacy-tag-backfill-private/v1',
    migration: {
      source: 'folksonomia-digital-existing-database',
      sourceTagId: entry.tag.id,
      sourceNucleusId: entry.tag.nucleo_id || null,
      migratedWithoutUserResubmission: true,
    },
    legacyTag: {
      original: entry.tag.tag_original || null,
      normalized: entry.tag.tag_normalizada || null,
      thematicGroup: entry.tag.grupo_tematico || null,
      status: entry.tag.status || null,
      createdAt: entry.tag.criado_em || null,
    },
    legacyNucleus: entry.nucleus ? {
      original: entry.nucleus.conteudo_original || null,
      normalized: entry.nucleus.conteudo_normalizado || null,
      context: asObject(entry.nucleus.contexto),
      metadata: asObject(entry.nucleus.metadados),
      origin: entry.nucleus.origem || null,
      signature: entry.nucleus.assinatura_hash || null,
      validationStatus: entry.nucleus.status_validacao || null,
      indicators: {
        confidence: entry.nucleus.confianca ?? null,
        novelty: entry.nucleus.novidade ?? null,
        tension: entry.nucleus.tensao ?? null,
        resonance: entry.nucleus.ressonancia ?? null,
      },
      visitorId: entry.nucleus.visitante_id || null,
    } : null,
    artwork: entry.artwork ? {
      id: entry.artwork.id,
      title: entry.artwork.titulo || null,
      artist: entry.artwork.artista || null,
      year: entry.artwork.ano || null,
      type: entry.artwork.tipo || null,
      description: entry.artwork.descricao || null,
      material: entry.artwork.material || null,
      technique: entry.artwork.tecnica || null,
      dimensions: entry.artwork.dimensoes || null,
      origin: entry.artwork.origem || null,
      imageUrl: entry.artwork.imagem_url || null,
      metadata: asObject(entry.artwork.metadados),
    } : null,
  };
}

async function persistLegacyContribution(params: {
  entry: LegacyEntry;
  canonicalTagId: string;
  identityDigest: string;
  metadataDigest: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('tag_contributions').upsert({
    contribution_id: `legacy_submission_${params.entry.tag.id}`,
    tag_id: params.canonicalTagId,
    object_id: params.entry.artwork?.id || null,
    timestamp: params.entry.createdAt,
    contribution_type: 'criacao',
    content: 'Registro histórico incorporado automaticamente ao cofre auditável.',
    previous_state: params.identityDigest,
    current_state: `sha256:${params.metadataDigest}`,
    digest: `sha256:${generateSignature({
      domain: 'folksonomia-digital/legacy-submission-contribution/v1',
      submissionId: params.entry.tag.id,
      canonicalTagId: params.canonicalTagId,
      metadataDigest: params.metadataDigest,
    })}`,
    relationships: [],
    contributor_hash: params.entry.nucleus?.visitante_id
      ? generateSignature({ domain: 'folksonomia-digital/legacy-contributor/v1', visitorId: params.entry.nucleus.visitante_id })
      : null,
  }, { onConflict: 'contribution_id', ignoreDuplicates: true });
  if (error) throw error;
}

async function markLegacyTagSealed(tagId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('tags').update({ status: 'selada' }).eq('id', tagId);
  if (error) throw error;
}

async function repairSealedLegacyEntry(entry: LegacyEntry, secure: SecureRecordRow): Promise<void> {
  const { data: identity, error } = await supabaseAdmin
    .from('tag_identities')
    .select('digest')
    .eq('tag_id', secure.tag_id)
    .maybeSingle();
  if (error || !identity) throw error || new Error('A identidade canônica do registro selado não foi encontrada.');
  await ensureTagObjectLink(secure.tag_id, entry.artwork);
  await persistLegacyContribution({
    entry,
    canonicalTagId: secure.tag_id,
    identityDigest: String(identity.digest),
    metadataDigest: secure.metadata_digest,
  });
  await markLegacyTagSealed(entry.tag.id);
}

async function sealLegacyEntry(entry: LegacyEntry): Promise<void> {
  const identity = await ensureLegacyCanonicalIdentity(entry);
  const visual = await analyzeLegacyVisualContext(entry);
  const receipt = await sealTagSubmission({
    submissionId: entry.tag.id,
    canonicalTagId: identity.tagId,
    obraId: entry.artwork?.id || entry.tag.obra_id || null,
    tag: entry.label,
    normalizedTag: entry.normalizedTag,
    createdAt: entry.createdAt,
    privateMetadata: privateLegacyMetadata(entry),
    visual,
  });
  await persistLegacyContribution({
    entry,
    canonicalTagId: identity.tagId,
    identityDigest: identity.digest,
    metadataDigest: receipt.metadataDigest,
  });
  await markLegacyTagSealed(entry.tag.id);

  if (isVisionBackedAnalysis(visual)) {
    await discoverAndRecordVisualContextCorrelations({
      input: {
        submissionId: entry.tag.id,
        canonicalTagId: identity.tagId,
        tag: entry.label,
        normalizedTag: entry.normalizedTag,
        createdAt: entry.createdAt,
      },
      metadataDigest: receipt.metadataDigest,
      visual,
    });
  }
}

function endpointFrom(entry: LegacyEntry, secure: SecureRecordRow): LedgerCorrelationEndpoint {
  return {
    submissionId: entry.tag.id,
    canonicalTagId: secure.tag_id,
    tag: entry.label,
    normalizedTag: entry.normalizedTag,
    createdAt: entry.createdAt,
    metadataDigest: secure.metadata_digest,
  };
}

function correlationKey(candidate: LegacyRelationCandidate): string {
  const [a, b] = [candidate.source.submissionId, candidate.target.submissionId].sort();
  return `${a}::${b}::${candidate.method}`;
}

function addCandidate(
  result: Map<string, LegacyRelationCandidate>,
  candidate: LegacyRelationCandidate,
): void {
  if (candidate.source.submissionId === candidate.target.submissionId) return;
  if (result.size >= MAX_GENERATED_RELATIONS) return;
  const key = correlationKey(candidate);
  const current = result.get(key);
  if (!current || candidate.confidence > current.confidence || candidate.status === 'validated') {
    result.set(key, candidate);
  }
}

async function loadLegacyRelations(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('relacoes')
    .select('origem_id, destino_id, tipo_relacao, peso, metodo, fonte, status, criado_em')
    .limit(4_000);
  // Algumas instalações antigas não possuem a projeção de relações. A ausência
  // dela não bloqueia vínculos por obra ou identidade canônica.
  if (error) return [];
  return data || [];
}

/**
 * Mantém o acervo visível enquanto a infraestrutura do cofre está sendo
 * corrigida. Esses nós são explicitamente pendentes: não são apresentados
 * como selados, auditados ou como resultados de inferência visual.
 */
export async function loadLegacyTagNetworkPreview(): Promise<LegacyNetworkPreview> {
  const tags = await fetchPreviewTags();
  const nucleusIds = [...new Set(tags.map(tag => plainString(tag.nucleo_id)).filter(Boolean))];
  const nuclei = await fetchPreviewContextRows('nucleos', nucleusIds);
  const nucleiById = new Map(nuclei.map(row => [String(row.id), row]));
  const artworkIds = [...new Set([
    ...tags.map(tag => plainString(tag.obra_id)),
    ...nuclei.map(row => plainString(row.obra_id)),
  ].filter(Boolean))];
  const artworks = await fetchPreviewContextRows('obras', artworkIds);
  const artworksById = new Map(artworks.map(row => [String(row.id), row]));
  const entries = tags.map(tag => {
    const nucleus = tag.nucleo_id ? nucleiById.get(String(tag.nucleo_id)) : undefined;
    const artworkId = plainString(tag.obra_id || nucleus?.obra_id);
    const artwork = artworkId ? artworksById.get(artworkId) : undefined;
    const label = legacyLabel(tag);
    const normalizedTag = normalizeLegacyTag(label, tag.id);
    const eixo = plainString(tag.grupo_tematico, 'PATRIMONIO');
    return { tag, nucleus, artwork, label, normalizedTag, eixo };
  });
  const nodes = entries.map(entry => ({
    id: entry.tag.id,
    label: entry.label,
    normalizedLabel: entry.normalizedTag,
    eixo: entry.eixo,
    familia: `${entry.eixo.toLocaleLowerCase('pt-BR')}.${entry.normalizedTag}`,
    createdAt: stableCreatedAt(entry.tag.criado_em),
    obra: entry.artwork ? {
      id: String(entry.artwork.id),
      titulo: entry.artwork.titulo || null,
      artista: entry.artwork.artista || null,
      ano: entry.artwork.ano || null,
      tipo: entry.artwork.tipo || null,
      descricao: entry.artwork.descricao || null,
      material: entry.artwork.material || null,
      tecnica: entry.artwork.tecnica || null,
      origem: entry.artwork.origem || null,
      imagemUrl: entry.artwork.imagem_url || null,
    } : null,
    contextoTag: {
      nucleoId: entry.tag.nucleo_id || null,
      conteudoOriginal: entry.nucleus?.conteudo_original || null,
      conteudoNormalizado: entry.nucleus?.conteudo_normalizado || null,
      origem: entry.nucleus?.origem || null,
    },
  }));

  const edges = new Map<string, LegacyNetworkPreview['edges'][number]>();
  const addEdge = (a: string, b: string, weight: number, relation: string, preserveStoredRelation = false) => {
    if (!a || !b || a === b) return;
    const [from, to] = [a, b].sort();
    const key = `${from}::${to}`;
    const current = edges.get(key);
    if (!current || preserveStoredRelation || weight > current.weight) {
      edges.set(key, {
        from,
        to,
        weight,
        skosRelation: relation,
        discovered: false,
        auditPending: true,
      });
    }
  };

  const byNucleus = new Map<string, string[]>();
  const byArtwork = new Map<string, string[]>();
  const byNormalizedTag = new Map<string, string[]>();
  for (const entry of entries) {
    const nucleusId = plainString(entry.tag.nucleo_id);
    const artworkId = plainString(entry.tag.obra_id);
    if (nucleusId) byNucleus.set(nucleusId, [...(byNucleus.get(nucleusId) || []), entry.tag.id]);
    if (artworkId) byArtwork.set(artworkId, [...(byArtwork.get(artworkId) || []), entry.tag.id]);
    byNormalizedTag.set(entry.normalizedTag, [...(byNormalizedTag.get(entry.normalizedTag) || []), entry.tag.id]);
  }

  const addGroup = (groups: Map<string, string[]>, relation: string, weight: number) => {
    for (const memberIds of groups.values()) {
      const sample = memberIds.slice(0, MAX_GROUP_MEMBERS);
      for (let i = 0; i < sample.length; i++) {
        for (let j = i + 1; j < sample.length; j++) addEdge(sample[i], sample[j], weight, relation);
      }
    }
  };
  addGroup(byNucleus, 'interop:sharedNucleusContext', 0.86);
  addGroup(byArtwork, 'interop:sharedArtworkContext', 0.78);
  addGroup(byNormalizedTag, 'skos:exactMatch', 0.99);

  const legacyRelations = await loadLegacyRelations();
  for (const relation of legacyRelations) {
    const origins = byNucleus.get(String(relation.origem_id || '')) || [];
    const targets = byNucleus.get(String(relation.destino_id || '')) || [];
    const type = plainString(relation.tipo_relacao, 'skos:related');
    const weight = clampConfidence(relation.peso, 0.72);
    for (const source of origins.slice(0, MAX_GROUP_MEMBERS)) {
      for (const target of targets.slice(0, MAX_GROUP_MEMBERS)) addEdge(source, target, weight, type, true);
    }
    if (edges.size >= MAX_GENERATED_RELATIONS) break;
  }

  return { nodes, edges: [...edges.values()].slice(0, MAX_GENERATED_RELATIONS) };
}

function buildLegacyRelationCandidates(
  entries: LegacyEntry[],
  secureRecords: SecureRecordRow[],
  legacyRelations: any[],
): LegacyRelationCandidate[] {
  const entryByTagId = new Map(entries.map(entry => [entry.tag.id, entry]));
  const endpoints = new Map<string, LedgerCorrelationEndpoint>();
  for (const secure of secureRecords) {
    const entry = entryByTagId.get(String(secure.submission_id));
    if (entry) endpoints.set(entry.tag.id, endpointFrom(entry, secure));
  }
  const byNucleus = new Map<string, LedgerCorrelationEndpoint[]>();
  const byArtwork = new Map<string, LedgerCorrelationEndpoint[]>();
  const byCanonicalTag = new Map<string, LedgerCorrelationEndpoint[]>();
  for (const entry of entries) {
    const endpoint = endpoints.get(entry.tag.id);
    if (!endpoint) continue;
    const nucleusId = plainString(entry.tag.nucleo_id);
    const artworkId = plainString(entry.tag.obra_id || entry.artwork?.id);
    if (nucleusId) byNucleus.set(nucleusId, [...(byNucleus.get(nucleusId) || []), endpoint]);
    if (artworkId) byArtwork.set(artworkId, [...(byArtwork.get(artworkId) || []), endpoint]);
    byCanonicalTag.set(endpoint.canonicalTagId, [...(byCanonicalTag.get(endpoint.canonicalTagId) || []), endpoint]);
  }

  const candidates = new Map<string, LegacyRelationCandidate>();
  for (const relation of legacyRelations) {
    const origins = byNucleus.get(String(relation.origem_id || '')) || [];
    const targets = byNucleus.get(String(relation.destino_id || '')) || [];
    const relationType = plainString(relation.tipo_relacao, 'skos:related');
    const relationStatus = plainString(relation.status).toLocaleLowerCase('pt-BR');
    const validated = ['validado', 'validada', 'publicado', 'publicada', 'validated', 'approved'].includes(relationStatus);
    for (const source of origins.slice(0, MAX_GROUP_MEMBERS)) {
      for (const target of targets.slice(0, MAX_GROUP_MEMBERS)) {
        addCandidate(candidates, {
          source,
          target,
          relationType,
          confidence: clampConfidence(relation.peso, 0.72),
          method: `legacy_database_relation_${slug(relationType, 'related')}`,
          status: validated ? 'validated' : 'suggested',
          requiresHumanReview: !validated,
          sourceLabel: 'Relação já registrada no banco cultural',
          privateEvidence: {
            legacyRelation: {
              method: relation.metodo || null,
              source: relation.fonte || null,
              status: relation.status || null,
              createdAt: relation.criado_em || null,
            },
          },
        });
      }
    }
  }

  for (const [artworkId, members] of byArtwork) {
    const sample = members.slice(0, MAX_GROUP_MEMBERS);
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        addCandidate(candidates, {
          source: sample[i],
          target: sample[j],
          relationType: 'interop:sharedArtworkContext',
          confidence: 0.74,
          method: 'legacy_shared_artwork_context',
          status: 'suggested',
          requiresHumanReview: true,
          sourceLabel: 'Contexto compartilhado da mesma obra do acervo',
          privateEvidence: { sharedArtworkId: artworkId },
        });
      }
    }
  }

  for (const [canonicalTagId, members] of byCanonicalTag) {
    const sample = members.slice(0, MAX_GROUP_MEMBERS);
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        addCandidate(candidates, {
          source: sample[i],
          target: sample[j],
          relationType: 'skos:exactMatch',
          confidence: 0.99,
          method: 'legacy_same_canonical_tag',
          status: 'validated',
          requiresHumanReview: false,
          sourceLabel: 'Identidade canônica compartilhada por registros históricos',
          privateEvidence: { canonicalTagId },
        });
      }
    }
  }

  return [...candidates.values()];
}

async function countVisualAnalyses(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('tag_visual_analyses')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function enrichLegacyVisualBatch(entries: LegacyEntry[], secureRecords: SecureRecordRow[]): Promise<number> {
  if (!GEMINI_API_KEY.trim()) return 0;
  const { data: analyses, error } = await supabaseAdmin
    .from('tag_visual_analyses')
    .select('submission_id')
    .limit(5_000);
  if (error) throw error;
  const analyzed = new Set((analyses || []).map(row => String(row.submission_id)));
  const secureById = new Map(secureRecords.map(row => [String(row.submission_id), row]));
  const candidates = entries
    .filter(entry => Boolean(plainString(entry.artwork?.imagem_url)))
    .filter(entry => !analyzed.has(entry.tag.id))
    .filter(entry => secureById.has(entry.tag.id))
    .slice(0, VISUAL_BATCH_SIZE);

  let completed = 0;
  for (const entry of candidates) {
    const secure = secureById.get(entry.tag.id)!;
    const visual = await analyzeLegacyVisualContext(entry);
    if (!isVisionBackedAnalysis(visual)) continue;
    await recordVisualContextAnalysis({
      input: {
        submissionId: entry.tag.id,
        canonicalTagId: secure.tag_id,
        tag: entry.label,
        normalizedTag: entry.normalizedTag,
        createdAt: entry.createdAt,
      },
      metadataDigest: secure.metadata_digest,
      visual,
    });
    await discoverAndRecordVisualContextCorrelations({
      input: {
        submissionId: entry.tag.id,
        canonicalTagId: secure.tag_id,
        tag: entry.label,
        normalizedTag: entry.normalizedTag,
        createdAt: entry.createdAt,
      },
      metadataDigest: secure.metadata_digest,
      visual,
    });
    completed += 1;
  }
  return completed;
}

async function syncLegacyRelationships(entries: LegacyEntry[], secureRecords: SecureRecordRow[]): Promise<{
  total: number;
  remaining: number;
  processed: number;
}> {
  const legacyRelations = await loadLegacyRelations();
  const candidates = buildLegacyRelationCandidates(entries, secureRecords, legacyRelations);
  const { data: existing, error } = await supabaseAdmin
    .from('tag_context_correlations')
    .select('source_submission_id, target_submission_id, method')
    .limit(10_000);
  if (error) throw error;
  const existingKeys = new Set((existing || []).map(row =>
    `${String(row.source_submission_id)}::${String(row.target_submission_id)}::${String(row.method)}`,
  ));
  const pending = candidates.filter(candidate => !existingKeys.has(correlationKey(candidate)));
  let processed = 0;
  for (const candidate of pending.slice(0, CORRELATION_BATCH_SIZE)) {
    await recordAuditableContextCorrelation(candidate);
    processed += 1;
  }
  return { total: candidates.length, remaining: Math.max(0, pending.length - processed), processed };
}

async function runLegacyBackfill(): Promise<LegacyBackfillProgress> {
  let entries: LegacyEntry[] = [];
  let sealedTagCount = 0;
  let remainingTagCount = 0;
  let visualAnalysisCount = 0;
  let remainingVisualCount = 0;
  let recordedCorrelationCount = 0;
  let remainingCorrelationCount = 0;
  try {
    entries = await loadLegacyEntries();
    remainingTagCount = entries.length;
    const encryption = getEncryptionStatus();
    if (!encryption.configured) {
      return {
        state: 'blocked', totalTags: entries.length, sealedTags: 0, remainingTags: entries.length,
        visualAnalyses: 0, visualRemaining: 0, correlations: 0, correlationsRemaining: 0,
        processedThisRun: 0,
        code: 'encryption_not_configured',
        message: 'A chave AES-256 do ambiente não está configurada; as tags foram encontradas, mas ainda não podem ser seladas.',
      };
    }
    if (!isServiceRoleConfigured()) {
      return {
        state: 'blocked', totalTags: entries.length, sealedTags: 0, remainingTags: entries.length,
        visualAnalyses: 0, visualRemaining: 0, correlations: 0, correlationsRemaining: 0,
        processedThisRun: 0,
        code: 'service_role_not_configured',
        message: 'A credencial segura de escrita do Supabase não está configurada; as tags foram encontradas, mas ainda não podem ser incorporadas.',
      };
    }

    const tagIds = entries.map(entry => entry.tag.id);
    let secureRecords = await fetchSecureRecords(tagIds);
    let sealed = new Set(secureRecords.map(row => String(row.submission_id)));
    sealedTagCount = sealed.size;
    let legacyContributions = await fetchLegacyContributionIds(tagIds);
    const secureBySubmission = new Map(secureRecords.map(row => [String(row.submission_id), row]));
    const pendingEntries = entries.filter(entry => !sealed.has(entry.tag.id)
      || !legacyContributions.has(`legacy_submission_${entry.tag.id}`));
    const structuralBatch = pendingEntries.slice(0, STRUCTURAL_BATCH_SIZE);
    const outcomes = await Promise.allSettled(structuralBatch.map(entry => {
      const secure = secureBySubmission.get(entry.tag.id);
      return secure ? repairSealedLegacyEntry(entry, secure) : sealLegacyEntry(entry);
    }));
    const failed = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    if (failed) throw failed.reason;

    if (structuralBatch.length > 0) {
      secureRecords = await fetchSecureRecords(tagIds);
      sealed = new Set(secureRecords.map(row => String(row.submission_id)));
      legacyContributions = await fetchLegacyContributionIds(tagIds);
    }
    const sealedTags = sealed.size;
    const remainingTags = entries.filter(entry => !sealed.has(entry.tag.id)
      || !legacyContributions.has(`legacy_submission_${entry.tag.id}`)).length;
    sealedTagCount = sealedTags;
    remainingTagCount = remainingTags;

    const visualProcessed = await enrichLegacyVisualBatch(entries, secureRecords);
    const visualAnalyses = await countVisualAnalyses();
    const visualEligible = entries.filter(entry => Boolean(plainString(entry.artwork?.imagem_url))).length;
    const visualRemaining = Math.max(0, Math.min(sealedTags, visualEligible) - visualAnalyses);
    visualAnalysisCount = visualAnalyses;
    remainingVisualCount = visualRemaining;
    const relationState = await syncLegacyRelationships(entries, secureRecords);
    recordedCorrelationCount = relationState.total - relationState.remaining;
    remainingCorrelationCount = relationState.remaining;
    const processedThisRun = structuralBatch.length + visualProcessed + relationState.processed;
    const structuralComplete = remainingTags === 0 && relationState.remaining === 0;
    const visionBlocked = structuralComplete && visualRemaining > 0 && !GEMINI_API_KEY.trim();
    const complete = structuralComplete && visualRemaining === 0;

    return {
      state: visionBlocked ? 'blocked' : complete ? 'complete' : 'running',
      totalTags: entries.length,
      sealedTags,
      remainingTags,
      visualAnalyses,
      visualRemaining,
      correlations: relationState.total - relationState.remaining,
      correlationsRemaining: relationState.remaining,
      processedThisRun,
      message: complete
        ? 'As tags existentes, seus vínculos internos e seus recibos auditáveis já foram incorporados.'
        : visionBlocked
          ? `${sealedTags} de ${entries.length} tags e seus vínculos já foram incorporados; falta configurar o modelo visual para analisar ${visualRemaining} obras com imagem.`
          : 'A rede está incorporando automaticamente as tags e vínculos já existentes.',
    };
  } catch (error) {
    const failure = classifyBackfillFailure(error);
    // Se um lote teve sucesso parcial, recalcula os recibos já confirmados
    // antes de responder. O próximo GET só trabalha o que realmente falta.
    if (entries.length > 0 && isServiceRoleConfigured()) {
      try {
        const tagIds = entries.map(entry => entry.tag.id);
        const secureRecords = await fetchSecureRecords(tagIds);
        const sealed = new Set(secureRecords.map(row => String(row.submission_id)));
        sealedTagCount = sealed.size;
        try {
          const legacyContributions = await fetchLegacyContributionIds(tagIds);
          remainingTagCount = entries.filter(entry => !sealed.has(entry.tag.id)
            || !legacyContributions.has(`legacy_submission_${entry.tag.id}`)).length;
        } catch {
          remainingTagCount = Math.max(0, entries.length - sealed.size);
        }
      } catch {
        // O próprio schema/serviço pode ser a falha; os contadores anteriores
        // continuam sendo a melhor confirmação disponível.
      }
    }
    console.error('[LegacyTagBackfill] Falha na incorporação', {
      category: failure.category,
      code: failure.code || 'unknown',
    });
    return {
      state: 'blocked', totalTags: entries.length, sealedTags: sealedTagCount, remainingTags: remainingTagCount,
      visualAnalyses: visualAnalysisCount, visualRemaining: remainingVisualCount,
      correlations: recordedCorrelationCount, correlationsRemaining: remainingCorrelationCount,
      processedThisRun: 0,
      code: failure.category,
      diagnosticCode: failure.code || undefined,
      message: failure.message,
    };
  }
}

/**
 * Um processo por instância evita duas leituras simultâneas criando o mesmo
 * lote. As escritas também são idempotentes para sobreviver a novas instâncias
 * ou a uma reinicialização serverless.
 */
export async function ensureLegacyTagNetworkBackfill(): Promise<LegacyBackfillProgress> {
  if (!activeBackfill) {
    activeBackfill = runLegacyBackfill().finally(() => { activeBackfill = null; });
  }
  return activeBackfill!;
}
