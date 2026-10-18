import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runSemanticPipeline } from '@/lib/ml/pipeline';
import { analyzeVisualContext } from '@/lib/ml/visual-context';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { supabaseAdmin } from '@/lib/supabase/client';
import {
  EncryptionConfigurationError,
  assertEncryptionConfigured,
  generateBlindIndex,
  generateSignature,
  getEncryptionStatus,
} from '@/lib/core/crypto';
import {
  createTagIdentity,
  generateTagId,
  type TagIdentity,
} from '@/lib/core/tag-identity';
import {
  persistContribution,
  persistVersionChain,
} from '@/lib/core/contribution-network';
import {
  discoverAndRecordVisualContextCorrelations,
  sealTagSubmission,
  SecureLedgerStorageError,
} from '@/lib/core/tag-secure-ledger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_TAG_LENGTH = 160;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

type RateLimitEntry = { count: number; resetAt: number };
const rateLimits = new Map<string, RateLimitEntry>();

interface ArtworkRecord {
  id: string;
  titulo?: string | null;
  artista?: string | null;
  descricao?: string | null;
  imagem_url?: string | null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function boundedString(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.replace(/[\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
  return result || null;
}

function clientRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown-client';
  return crypto.createHash('sha256').update(forwarded).digest('hex');
}

function isRateLimited(request: NextRequest): boolean {
  const now = Date.now();
  const key = clientRateLimitKey(request);
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

async function loadArtwork(obraId: string): Promise<{ artwork: ArtworkRecord | null; databaseId: string | null }> {
  // O registro de demonstração mantém compatibilidade com a tela de teste, mas
  // não é ligado por FK nem enviado a um provedor visual como se fosse acervo.
  if (obraId === 'picasso-test') return { artwork: null, databaseId: null };
  if (!isUuid(obraId)) return { artwork: null, databaseId: null };

  const { data, error } = await supabaseAdmin
    .from('obras')
    .select('id, titulo, artista, descricao, imagem_url')
    .eq('id', obraId)
    .maybeSingle();
  if (error) throw error;
  return { artwork: data as ArtworkRecord | null, databaseId: data ? obraId : null };
}

async function ensureTagObjectLink(params: {
  tagId: string;
  objectId?: string | null;
  objectTitle?: string | null;
}): Promise<void> {
  if (!params.objectId) return;
  const { data: linkedObject, error: linkedLookupError } = await supabaseAdmin
    .from('tag_objects')
    .select('id')
    .eq('tag_id', params.tagId)
    .eq('object_id', params.objectId)
    .maybeSingle();
  if (linkedLookupError) throw linkedLookupError;
  if (linkedObject) return;

  const { error: objectError } = await supabaseAdmin.from('tag_objects').insert({
    tag_id: params.tagId,
    object_id: params.objectId,
    object_type: 'obra',
    title: params.objectTitle || null,
  });
  if (objectError && (objectError as { code?: string }).code !== '23505') throw objectError;
}

async function ensureCanonicalTagIdentity(params: {
  tag: string;
  normalizedLabel: string;
  eixo?: string;
  objectId?: string | null;
  objectTitle?: string | null;
}): Promise<Pick<TagIdentity, 'tagId' | 'digest'>> {
  const tagId = generateTagId(params.normalizedLabel);
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('tag_identities')
    .select('*')
    .eq('tag_id', tagId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const existingTagId = String(existing.tag_id);
    await ensureTagObjectLink({
      tagId: existingTagId,
      objectId: params.objectId,
      objectTitle: params.objectTitle,
    });
    return { tagId: existingTagId, digest: String(existing.digest) };
  }

  const identity = createTagIdentity({
    tag: params.tag,
    normalizedLabel: params.normalizedLabel,
    eixo: params.eixo,
    objectId: params.objectId || undefined,
    objectTitle: params.objectTitle || undefined,
  });

  const { error: insertError } = await supabaseAdmin
    .from('tag_identities')
    .insert({
      tag_id: identity.tagId,
      tag: identity.tag,
      normalized_label: identity.normalizedLabel,
      version: identity.version,
      digest: identity.digest,
      eixo: identity.eixo || null,
      created_at: identity.createdAt,
      updated_at: identity.updatedAt,
    });

  if (insertError && (insertError as any).code !== '23505') throw insertError;
  if (insertError) {
    const { data: raced, error: racedError } = await supabaseAdmin
      .from('tag_identities')
      .select('*')
      .eq('tag_id', tagId)
      .maybeSingle();
    if (racedError || !raced) throw racedError || insertError;
    const racedTagId = String(raced.tag_id);
    await ensureTagObjectLink({
      tagId: racedTagId,
      objectId: params.objectId,
      objectTitle: params.objectTitle,
    });
    return { tagId: racedTagId, digest: String(raced.digest) };
  }

  await ensureTagObjectLink({
    tagId: identity.tagId,
    objectId: params.objectId,
    objectTitle: params.objectTitle,
  });

  const versionResult = await persistVersionChain({
    tagId: identity.tagId,
    version: identity.version,
    previousDigest: null,
    currentDigest: identity.digest,
    eventType: 'genesis',
    actor: 'system:canonical-tag-identity',
    description: 'Identidade canônica criada para contribuições culturais seladas.',
  });
  if (!versionResult.success) throw new Error(versionResult.error || 'Falha ao registrar a gênese da identidade.');

  if (identity.contributions[0]) {
    const contributionResult = await persistContribution(identity.contributions[0]);
    if (!contributionResult.success) throw new Error(contributionResult.error || 'Falha ao registrar a contribuição de gênese.');
  }
  return identity;
}

async function savePublicSubmission(params: {
  submissionId: string;
  tag: string;
  normalizedTag: string;
  obraId: string | null;
  pipeline: any;
}): Promise<{ tagId: string; nucleusId: string; created: boolean }> {
  const embeddingVector = Array.isArray(params.pipeline.dna?.embedding)
    ? `[${params.pipeline.dna.embedding.join(',')}]`
    : null;
  const nucleoPayload: Record<string, unknown> = {
    tipo: 'tag',
    conteudo_original: params.tag,
    conteudo_normalizado: params.normalizedTag,
    origem: 'interface_publica',
    assinatura_hash: params.pipeline.dna?.signature || generateSignature({ tag: params.tag }),
    embedding: embeddingVector,
    status_validacao: 'bruto',
    confianca: params.pipeline.semantics?.indicators?.confidence || 0,
    novidade: params.pipeline.semantics?.indicators?.novelty || 0,
    tensao: params.pipeline.semantics?.indicators?.tension || 0,
    ressonancia: params.pipeline.semantics?.indicators?.resonance || 0,
    // Só dados necessários à operação pública. Inferências, evidências e dados
    // da pessoa seguem no envelope cifrado em tag_secure_records.
    contexto: { themeGroup: params.pipeline.semantics?.themeGroup || 'Outros' },
    metadados: { schemaVersion: 'public-tag-shell/v1' },
  };
  if (params.obraId) nucleoPayload.obra_id = params.obraId;

  const { data: nucleus, error: nucleusError } = await supabaseAdmin
    .from('nucleos')
    .insert(nucleoPayload)
    .select('id')
    .single();
  if (nucleusError || !nucleus?.id) throw nucleusError || new Error('Falha ao criar núcleo público.');

  const tagPayload: Record<string, unknown> = {
    id: params.submissionId,
    nucleo_id: nucleus.id,
    tag_original: params.tag,
    tag_normalizada: params.normalizedTag,
    grupo_tematico: params.pipeline.semantics?.themeGroup || 'Outros',
    // O registro só se torna uma contribuição ativa após receber o envelope e
    // o primeiro evento auditável no cofre.
    status: 'selando',
  };
  if (params.obraId) tagPayload.obra_id = params.obraId;

  const { data: tagRecord, error: tagError } = await supabaseAdmin
    .from('tags')
    .insert(tagPayload)
    .select('id, nucleo_id')
    .single();
  if (tagError && (tagError as any).code === '23505') {
    await supabaseAdmin.from('nucleos').delete().eq('id', nucleus.id);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('tags')
      .select('id, nucleo_id, tag_original, tag_normalizada')
      .eq('id', params.submissionId)
      .maybeSingle();
    if (existingError || !existing?.id || !existing.nucleo_id) throw existingError || tagError;
    if (existing.tag_original !== params.tag || existing.tag_normalizada !== params.normalizedTag) {
      throw new SecureLedgerStorageError('O identificador de contribuição já foi usado para outro conteúdo.');
    }
    return { tagId: String(existing.id), nucleusId: String(existing.nucleo_id), created: false };
  }
  if (tagError || !tagRecord?.id) {
    await supabaseAdmin.from('nucleos').delete().eq('id', nucleus.id);
    throw tagError || new Error('Falha ao criar registro público da tag.');
  }
  return { tagId: String(tagRecord.id), nucleusId: String(tagRecord.nucleo_id || nucleus.id), created: true };
}

async function loadExistingSealedSubmission(submissionId: string): Promise<{
  canonicalTagId: string;
  metadataDigest: string;
  visualStatus: string;
  audit: { chainHash: string; sequence: number } | null;
} | null> {
  const { data: record, error: recordError } = await supabaseAdmin
    .from('tag_secure_records')
    .select('submission_id, tag_id, metadata_digest, visual_status')
    .eq('submission_id', submissionId)
    .maybeSingle();
  if (recordError) {
    throw new SecureLedgerStorageError('Não foi possível verificar a idempotência da contribuição.', recordError.message);
  }
  if (!record) return null;

  const { data: audit, error: auditError } = await supabaseAdmin
    .from('semantic_vault_audit')
    .select('chain_hash, chain_position')
    .eq('vault_id', submissionId)
    .order('chain_position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (auditError) {
    throw new SecureLedgerStorageError('Não foi possível recuperar o recibo auditável da contribuição.', auditError.message);
  }
  if (!audit) {
    // Nunca trate um envelope sem gênese encadeada como envio concluído. Esse
    // estado é recuperável pela operação administrativa, mas não é um recibo.
    throw new SecureLedgerStorageError('A contribuição possui um envelope pendente de anexação à cadeia auditável.');
  }
  return {
    canonicalTagId: String(record.tag_id),
    metadataDigest: String(record.metadata_digest),
    visualStatus: String(record.visual_status || 'not_requested'),
    audit: { chainHash: String(audit.chain_hash), sequence: Number(audit.chain_position) },
  };
}

async function removeUnsealedPublicSubmission(submissionId?: string, nucleusId?: string): Promise<void> {
  // Compensação segura para falha antes de existir um registro selado. Se um
  // envelope já foi inserido, a imutabilidade impede remoção e o item continua
  // em "selando" até recuperação administrativa.
  if (submissionId) await supabaseAdmin.from('tags').delete().eq('id', submissionId);
  if (nucleusId) await supabaseAdmin.from('nucleos').delete().eq('id', nucleusId);
}

async function persistSubmissionContribution(params: {
  submissionId: string;
  canonicalTagId: string;
  obraId: string | null;
  identityDigest: string;
  metadataDigest: string;
  contributorHash?: string | null;
  createdAt: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('tag_contributions').insert({
    contribution_id: `submission_${params.submissionId}`,
    tag_id: params.canonicalTagId,
    object_id: params.obraId,
    timestamp: params.createdAt,
    contribution_type: 'criacao',
    content: 'Contribuição individual selada; metadados privados preservados no cofre.',
    previous_state: params.identityDigest,
    current_state: `sha256:${params.metadataDigest}`,
    digest: `sha256:${generateSignature({
      domain: 'folksonomia-digital/submission-contribution/v1',
      submissionId: params.submissionId,
      canonicalTagId: params.canonicalTagId,
      metadataDigest: params.metadataDigest,
    })}`,
    relationships: [],
    contributor_hash: params.contributorHash || null,
  });
  if (error && (error as any).code !== '23505') throw error;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(request)) {
    return NextResponse.json({ error: 'Limite temporário de contribuições atingido. Tente novamente em alguns minutos.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const tag = boundedString(body.tag, MAX_TAG_LENGTH);
  const obraId = boundedString(body.obra_id, 80);
  if (!tag || tag.length < 2 || !obraId) {
    return NextResponse.json({ error: 'Tag e obra são obrigatórios; a tag deve ter entre 2 e 160 caracteres.' }, { status: 400 });
  }

  const clientSubmissionId = boundedString(body.submission_id, 64);
  if (clientSubmissionId && !isUuid(clientSubmissionId)) {
    return NextResponse.json({ error: 'submission_id inválido.' }, { status: 400 });
  }
  const visitorHash = boundedString(body.visitante_hash, 256);
  const visitorName = boundedString(body.visitante_nome, 160);
  const normalizedTag = normalizeForComparison(tag).replace(/\s+/g, '_');
  if (!normalizedTag || normalizedTag.length < 2) {
    return NextResponse.json({ error: 'A tag não contém conteúdo cultural utilizável.' }, { status: 400 });
  }
  // O cliente pode conservar este UUID para repetir uma requisição interrompida;
  // caso contrário, cada envio recebe uma identidade própria e auditável.
  const submissionId = clientSubmissionId || crypto.randomUUID();

  let publicSubmission: { tagId: string; nucleusId: string; created: boolean } | null = null;
  try {
    // Não persiste sequer o invólucro público se a configuração criptográfica
    // não estiver pronta. SHA-256 será usado para integridade, não como cifra.
    assertEncryptionConfigured();
    if (clientSubmissionId) {
      const existingSubmission = await loadExistingSealedSubmission(clientSubmissionId);
      if (existingSubmission) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          message: 'Esta contribuição já havia sido registrada no cofre auditável.',
          data: {
            submissionId: clientSubmissionId,
            canonicalTagId: existingSubmission.canonicalTagId,
            metadataDigest: `sha256:${existingSubmission.metadataDigest}`,
            audit: existingSubmission.audit,
            visual: { status: existingSubmission.visualStatus, requiresHumanReview: true },
          },
        });
      }
    }
    const { artwork, databaseId } = await loadArtwork(obraId);
    if (obraId !== 'picasso-test' && isUuid(obraId) && !artwork) {
      return NextResponse.json({ error: 'Obra não encontrada.' }, { status: 404 });
    }
    if (obraId !== 'picasso-test' && !isUuid(obraId)) {
      return NextResponse.json({ error: 'Identificador de obra inválido.' }, { status: 400 });
    }

    const [pipeline, visual] = await Promise.all([
      runSemanticPipeline(tag, databaseId || 'picasso-test', ''),
      analyzeVisualContext({
        tag,
        imageUrl: artwork?.imagem_url,
        catalog: artwork ? {
          title: artwork.titulo,
          artist: artwork.artista,
          description: artwork.descricao,
        } : undefined,
      }),
    ]);

    const identity = await ensureCanonicalTagIdentity({
      tag,
      normalizedLabel: normalizedTag,
      eixo: pipeline.semantics?.themeGroup || undefined,
      objectId: databaseId,
      objectTitle: artwork?.titulo,
    });

    publicSubmission = await savePublicSubmission({
      submissionId,
      tag,
      normalizedTag,
      obraId: databaseId,
      pipeline,
    });

    if (!publicSubmission.created) {
      const existingSubmission = await loadExistingSealedSubmission(publicSubmission.tagId);
      if (existingSubmission) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          message: 'Esta contribuição já havia sido registrada no cofre auditável.',
          data: {
            submissionId: publicSubmission.tagId,
            canonicalTagId: existingSubmission.canonicalTagId,
            metadataDigest: `sha256:${existingSubmission.metadataDigest}`,
            audit: existingSubmission.audit,
            visual: { status: existingSubmission.visualStatus, requiresHumanReview: true },
          },
        });
      }
      return NextResponse.json({
        error: 'Esta contribuição já está em processamento. Aguarde alguns instantes antes de tentar novamente.',
      }, { status: 409 });
    }

    const contributorHash = visitorHash
      ? generateBlindIndex({ visitorHash }, 'folksonomia-digital/contributor/v1')
      : null;
    const createdAt = new Date().toISOString();
    const receipt = await sealTagSubmission({
      submissionId: publicSubmission.tagId,
      canonicalTagId: identity.tagId,
      obraId: databaseId,
      tag,
      normalizedTag,
      createdAt,
      visual,
      privateMetadata: {
        submission: {
          visitorHash: visitorHash || undefined,
          visitorName: visitorName || undefined,
          clientSubmissionId: clientSubmissionId || undefined,
        },
        semanticProcessing: {
          dna: pipeline.dna,
          semantics: pipeline.semantics,
          confidence: pipeline.confidence,
          evidence: pipeline.evidence,
          learning: pipeline.learning,
          brain: pipeline.brain,
          meta: pipeline.meta,
        },
        visualProcessing: visual,
      },
    });

    await supabaseAdmin
      .from('tags')
      .update({ status: 'em análise' })
      .eq('id', publicSubmission.tagId)
      .throwOnError();

    const warnings: string[] = [];
    try {
      await persistSubmissionContribution({
        submissionId: publicSubmission.tagId,
        canonicalTagId: identity.tagId,
        obraId: databaseId,
        identityDigest: identity.digest,
        metadataDigest: receipt.metadataDigest,
        contributorHash,
        createdAt,
      });
    } catch {
      warnings.push('A contribuição foi selada, mas sua projeção na rede de contribuições será recuperada em segundo plano.');
    }

    let correlationCount = 0;
    try {
      const correlations = await discoverAndRecordVisualContextCorrelations({
        input: {
          submissionId: publicSubmission.tagId,
          canonicalTagId: identity.tagId,
          tag,
          normalizedTag,
          createdAt,
        },
        metadataDigest: receipt.metadataDigest,
        visual,
      });
      correlationCount = correlations.length;
    } catch {
      warnings.push('A busca de correlações protegidas será repetida sem afetar o registro da sua contribuição.');
    }

    return NextResponse.json({
      success: true,
      message: 'Tag registrada, cifrada e anexada à cadeia auditável.',
      data: {
        submissionId: publicSubmission.tagId,
        canonicalTagId: identity.tagId,
        tagId: identity.tagId,
        metadataDigest: `sha256:${receipt.metadataDigest}`,
        audit: {
          chainHash: receipt.auditChainHash,
          sequence: receipt.auditSequence,
          visualSequence: receipt.visualAuditSequence || null,
        },
        visual: {
          status: receipt.visualStatus,
          provider: visual.provider,
          requiresHumanReview: true,
        },
        correlations: {
          suggested: correlationCount,
          published: 0,
          requiresHumanReview: true,
        },
        indicators: {
          nivel_conexao: Math.round(pipeline.semantics?.indicators?.confidence || 0),
          nivel_novidade: Math.round(pipeline.semantics?.indicators?.novelty || 0),
          conceitos_sugeridos: pipeline.semantics?.concepts?.length || 0,
          fontes_conectadas: pipeline.evidence?.sources || 0,
        },
        warnings,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof EncryptionConfigurationError) {
      return NextResponse.json({
        error: 'Registro bloqueado: configure uma ENCRYPTION_KEY de pelo menos 32 bytes para proteger a contribuição.',
        security: getEncryptionStatus(),
      }, { status: 503 });
    }

    if (error instanceof SecureLedgerStorageError) {
      // Se falhou antes de inserir o envelope, não deixe uma tag pública solta.
      // Um cofre já inserido é imutável e fica no estado "selando" para reparo.
      if (publicSubmission?.created) {
        await removeUnsealedPublicSubmission(publicSubmission.tagId, publicSubmission.nucleusId).catch(() => undefined);
      }
      console.error('[TagSubmission] Falha ao selar contribuição:', error.causeMessage || error.message);
      return NextResponse.json({
        error: 'Não foi possível confirmar a selagem no cofre auditável. O registro público permanece indisponível; uma eventual tentativa parcial fica em recuperação administrativa.',
      }, { status: 503 });
    }

    if (publicSubmission?.created) {
      await removeUnsealedPublicSubmission(publicSubmission.tagId, publicSubmission.nucleusId).catch(() => undefined);
    }
    console.error('[TagSubmission] Erro ao registrar tag:', error instanceof Error ? error.message : 'erro desconhecido');
    return NextResponse.json({ error: 'Erro ao processar e registrar a tag cultural.' }, { status: 500 });
  }
}
