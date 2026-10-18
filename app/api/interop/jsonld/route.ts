import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { createSemanticVaultFingerprint } from '@/lib/core/semantic-vault';
import { searchCulturalDerivatives } from '@/lib/connectors/cultural-interop';
import { generateTagId } from '@/lib/core/tag-identity';

export const dynamic = 'force-dynamic';

interface ContributionRow {
  id: string;
  tag_original?: string | null;
  tag_normalizada?: string | null;
  grupo_tematico?: string | null;
  criado_em?: string | null;
}

interface SecureRecordRow {
  submission_id: string;
  tag_id: string;
  metadata_digest: string;
  encryption_algorithm?: string | null;
  envelope_version?: string | null;
  key_version?: string | null;
  visual_status?: string | null;
  visual_model?: string | null;
  created_at?: string | null;
}

interface AuditRow {
  vault_id: string;
  payload_hash: string;
  cross_hash: string;
  genetic_code: string;
  chain_hash: string;
  chain_position: number;
  created_at: string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalized(value: string): string {
  return normalizeForComparison(value).replace(/\s+/g, '_');
}

async function findContribution(params: {
  submissionId?: string;
  tag?: string;
}): Promise<ContributionRow | null> {
  if (params.submissionId) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .eq('id', params.submissionId)
      .maybeSingle();
    if (error) throw error;
    return data as ContributionRow | null;
  }

  const requested = normalized(params.tag || '');
  const { data, error } = await supabaseAdmin
    .from('tags')
    .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
    .order('criado_em', { ascending: false })
    .limit(300);
  if (error) throw error;
  return ((data || []) as ContributionRow[]).find(item => {
    const label = String(item.tag_original || item.tag_normalizada || '');
    return normalized(label) === requested;
  }) || null;
}

async function findSecureRecord(submissionId: string): Promise<SecureRecordRow | null> {
  const { data, error } = await supabaseAdmin
    .from('tag_secure_records')
    .select('submission_id, tag_id, metadata_digest, encryption_algorithm, envelope_version, key_version, visual_status, visual_model, created_at')
    .eq('submission_id', submissionId)
    .maybeSingle();

  // Permite exportação de dados históricos antes da migração, mas não esconde
  // qualquer outro erro de banco/credencial.
  if (error && (error as { code?: string }).code !== '42P01') throw error;
  return (data as SecureRecordRow | null) || null;
}

async function findLatestAudit(vaultId: string, legacyVaultId?: string): Promise<AuditRow | null> {
  const vaultIds = [...new Set([vaultId, legacyVaultId].filter(Boolean))] as string[];
  const { data, error } = await supabaseAdmin
    .from('semantic_vault_audit')
    .select('vault_id, payload_hash, cross_hash, genetic_code, chain_hash, chain_position, created_at')
    .in('vault_id', vaultIds)
    .order('chain_position', { ascending: false })
    .limit(8);

  if (error && (error as { code?: string }).code !== '42P01') throw error;
  const records = (data || []) as AuditRow[];
  return records.find(record => record.vault_id === vaultId) || records[0] || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const submissionId = (searchParams.get('submission_id') || '').trim();
  const tagParam = (searchParams.get('tag') || '').trim();

  if (!submissionId && !tagParam) {
    return NextResponse.json({ error: 'Informe submission_id (preferível) ou tag.' }, { status: 400 });
  }
  if (submissionId && !isUuid(submissionId)) {
    return NextResponse.json({ error: 'submission_id inválido.' }, { status: 400 });
  }

  try {
    const contribution = await findContribution({
      ...(submissionId ? { submissionId } : {}),
      ...(tagParam ? { tag: tagParam } : {}),
    });
    if (!contribution) {
      return NextResponse.json(
        { error: 'A contribuição não foi encontrada na rede de interoperabilidade.' },
        { status: 404 },
      );
    }

    const label = String(contribution.tag_original || contribution.tag_normalizada || '').trim();
    const normalizedLabel = normalized(label);
    const secureRecord = await findSecureRecord(String(contribution.id));
    const generatedTagId = generateTagId(normalizedLabel);

    let tagIdentity: { tag_id: string; version: number; digest: string } | null = null;
    try {
      const identityId = secureRecord?.tag_id || generatedTagId;
      const { data: idData, error: identityError } = await supabaseAdmin
        .from('tag_identities')
        .select('tag_id, version, digest')
        .eq('tag_id', identityId)
        .maybeSingle();
      if (identityError && (identityError as { code?: string }).code !== '42P01') throw identityError;
      tagIdentity = idData as typeof tagIdentity;
    } catch {
      // A identidade canônica é complementar à exportação histórica.
      tagIdentity = null;
    }

    const canonicalTagId = secureRecord?.tag_id || tagIdentity?.tag_id || generatedTagId;
    const metadataDigest = secureRecord?.metadata_digest || null;
    const semanticTriple = metadataDigest
      ? {
          subject: canonicalTagId,
          predicate: 'interop:hasSealedUserContribution',
          object: `sha256:${metadataDigest}`,
        }
      : {
          subject: label,
          predicate: 'foi_registrada_como',
          object: 'contribuição cultural de usuário',
        };
    const isSubmissionScoped = Boolean(secureRecord || submissionId);
    const vaultId = isSubmissionScoped ? String(contribution.id) : normalizedLabel;
    const sealedAt = secureRecord?.created_at || contribution.criado_em || undefined;
    const fingerprint = createSemanticVaultFingerprint({
      vaultId,
      label,
      normalizedLabel,
      semanticTriple,
      sources: metadataDigest
        ? [{ id: `sha256:${metadataDigest}`, label: 'Metadados de contribuição cifrados', type: 'sealed_metadata' }]
        : [{ id: normalizedLabel, label: 'Contribuição registrada no Folksonomia Digital', type: 'user_contribution' }],
      provenance: {
        actorScope: 'user_contribution',
        createdAt: sealedAt,
        sourceRecordId: String(contribution.id),
      },
      ...(metadataDigest ? {
        heartbeat: {
          pulseCount: 1,
          lastPulse: sealedAt,
          connectionCount: 0,
          generation: 1,
        },
      } : {}),
    });

    // Registros novos usam o UUID da submissão como vault_id. O segundo valor
    // preserva a leitura de cadeias históricas, que usavam a tag normalizada.
    const sealedAudit = await findLatestAudit(vaultId, vaultId === normalizedLabel ? undefined : normalizedLabel);
    const payloadHash = sealedAudit?.payload_hash || fingerprint.payloadHash;
    const crossHash = sealedAudit?.cross_hash || fingerprint.crossHash;
    const geneticCode = sealedAudit?.genetic_code || fingerprint.geneticCode;
    const derivatives = await searchCulturalDerivatives(label);
    const publicSubmissionId = String(contribution.id);

    const jsonLdPayload = {
      '@context': {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        prov: 'http://www.w3.org/ns/prov#',
        edm: 'http://www.europeana.eu/schemas/edm/',
        crm: 'http://www.cidoc-crm.org/cidoc-crm/',
        interop: 'https://folksonomia-digital.cultura.gov.br/vocab/interoperabilidade#',
      },
      '@id': `https://folksonomia-digital.cultura.gov.br/contribuicao/${encodeURIComponent(publicSubmissionId)}`,
      '@type': ['skos:Concept', 'edm:ProvidedCHO', 'crm:E28_Conceptual_Object'],
      'skos:prefLabel': { '@value': label, '@language': 'pt-BR' },
      'schema:description': 'Contribuição cultural individual com metadados privados selados e comprovante público verificável.',
      'schema:category': contribution.grupo_tematico || 'Cultura',
      'prov:wasGeneratedBy': {
        '@type': 'interop:UserContribution',
        'prov:generatedAtTime': contribution.criado_em || undefined,
      },
      'interop:submissionId': publicSubmissionId,
      'interop:tagId': canonicalTagId,
      'interop:version': tagIdentity?.version || 1,
      'interop:digest': tagIdentity?.digest || `sha256:${payloadHash}`,
      'interop:culturalTriple': semanticTriple,
      'interop:livingCode': geneticCode,
      'interop:payloadHash': payloadHash,
      'interop:crossHash': crossHash,
      ...(metadataDigest ? {
        'interop:sealedMetadata': {
          '@type': 'interop:EncryptedMetadata',
          'interop:metadataDigest': `sha256:${metadataDigest}`,
          'interop:encryptionAlgorithm': secureRecord?.encryption_algorithm || 'AES-256-GCM',
          'interop:envelopeVersion': secureRecord?.envelope_version || 'FSDV1',
          'interop:keyVersion': secureRecord?.key_version || 'v1',
          'interop:contentExposed': false,
        },
        'interop:visualAnalysis': {
          status: secureRecord?.visual_status || 'not_requested',
          ...(secureRecord?.visual_model ? { model: secureRecord.visual_model } : {}),
          requiresHumanReview: true,
        },
      } : {}),
      'skos:relatedMatch': derivatives.map(item => ({
        '@id': item.url || `urn:acervo:${item.source}:${item.externalId}`,
        '@type': 'edm:ProvidedCHO',
        'skos:prefLabel': item.title,
        'schema:provider': item.source,
        'edm:dataProvider': item.provider || item.source,
        'interop:relation': item.relation,
      })),
      ...(sealedAudit ? {
        'interop:auditChainHash': sealedAudit.chain_hash,
        'interop:auditSequence': sealedAudit.chain_position,
        'interop:sealedAt': sealedAudit.created_at,
      } : {
        'interop:auditStatus': 'not_persisted_or_legacy',
      }),
    };

    return NextResponse.json(jsonLdPayload, {
      headers: {
        'Content-Type': 'application/ld+json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'X-Semantic-Cross-Hash': crossHash,
      },
    });
  } catch (error: unknown) {
    console.error('[JSON-LD] Falha ao exportar contribuição:', error);
    const message = error instanceof Error ? error.message : 'Falha ao gerar JSON-LD.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
