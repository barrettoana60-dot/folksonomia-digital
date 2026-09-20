import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { createSemanticVaultFingerprint } from '@/lib/core/semantic-vault';
import { searchCulturalDerivatives } from '@/lib/connectors/cultural-interop';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagParam = (searchParams.get('tag') || '').trim();
  if (!tagParam) {
    return NextResponse.json({ error: 'Informe a contribuição no parâmetro tag.' }, { status: 400 });
  }

  try {
    const normalizedLabel = normalizeForComparison(tagParam).replace(/\s+/g, '_');
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(300);

    if (error) throw error;
    const contribution = (data || []).find(tag => {
      const label = String(tag.tag_original || tag.tag_normalizada || '');
      return normalizeForComparison(label).replace(/\s+/g, '_') === normalizedLabel;
    });

    if (!contribution) {
      return NextResponse.json(
        { error: 'A contribuição não foi encontrada na rede de interoperabilidade.' },
        { status: 404 },
      );
    }

    const label = String(contribution.tag_original || contribution.tag_normalizada).trim();
    const semanticTriple = {
      subject: label,
      predicate: 'foi_registrada_como',
      object: 'contribuição cultural de usuário',
    };
    const fingerprint = createSemanticVaultFingerprint({
      vaultId: normalizedLabel,
      label,
      normalizedLabel,
      semanticTriple,
      sources: [{
        id: normalizedLabel,
        label: 'Contribuição registrada no Folksonomia Digital',
        type: 'user_contribution',
      }],
      provenance: {
        actorScope: 'user_contribution',
        createdAt: contribution.criado_em || undefined,
        sourceRecordId: normalizedLabel,
      },
    });

    // Quando o cofre já foi selado, exporte a mesma impressão digital pública
    // que está na cadeia auditável — e não um novo hash calculado por acaso.
    let sealedAudit: {
      payload_hash?: string;
      cross_hash?: string;
      genetic_code?: string;
      chain_hash?: string;
      chain_position?: number;
      created_at?: string;
    } | null = null;
    try {
      const { data: auditData } = await supabaseAdmin
        .from('semantic_vault_audit')
        .select('payload_hash, cross_hash, genetic_code, chain_hash, chain_position, created_at')
        .eq('vault_id', normalizedLabel)
        .order('chain_position', { ascending: false })
        .limit(1)
        .maybeSingle();
      sealedAudit = auditData;
    } catch {
      // A migração pode ainda não ter sido aplicada; o pacote continua válido,
      // porém indicará que ainda não existe um selo persistido.
    }

    const payloadHash = sealedAudit?.payload_hash || fingerprint.payloadHash;
    const crossHash = sealedAudit?.cross_hash || fingerprint.crossHash;
    const geneticCode = sealedAudit?.genetic_code || fingerprint.geneticCode;

    const derivatives = await searchCulturalDerivatives(label);

    const { generateTagId } = await import('@/lib/core/tag-identity');
    const tagId = generateTagId(normalizedLabel);
    let tagIdentity: { tag_id: string; version: number; digest: string } | null = null;
    try {
      const { data: idData } = await supabaseAdmin
        .from('tag_identities')
        .select('tag_id, version, digest')
        .eq('tag_id', tagId)
        .maybeSingle();
      tagIdentity = idData;
    } catch {}

    const jsonLdPayload = {
      '@context': {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        prov: 'http://www.w3.org/ns/prov#',
        edm: 'http://www.europeana.eu/schemas/edm/',
        crm: 'http://www.cidoc-crm.org/cidoc-crm/',
        interop: 'https://folksonomia-digital.cultura.gov.br/vocab/interoperabilidade#',
      },
      '@id': `https://folksonomia-digital.cultura.gov.br/contribuicao/${encodeURIComponent(normalizedLabel)}`,
      '@type': ['skos:Concept', 'edm:ProvidedCHO', 'crm:E28_Conceptual_Object'],
      'skos:prefLabel': { '@value': label, '@language': 'pt-BR' },
      'schema:description': 'Tag como identidade computacional persistente da Folksonomia Digital: repositório de interoperabilidade cultural auditável, rastreável e interconectado.',
      'schema:category': contribution.grupo_tematico || 'Cultura',
      'prov:wasGeneratedBy': {
        '@type': 'interop:UserContribution',
        'prov:generatedAtTime': contribution.criado_em || undefined,
      },
      'interop:tagId': tagIdentity?.tag_id || tagId,
      'interop:version': tagIdentity?.version || 1,
      'interop:digest': tagIdentity?.digest || `sha256:${payloadHash}`,
      'interop:culturalTriple': semanticTriple,
      'interop:livingCode': geneticCode,
      'interop:payloadHash': payloadHash,
      'interop:crossHash': crossHash,
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
      } : {}),
    };

    return NextResponse.json(jsonLdPayload, {
      headers: {
        'Content-Type': 'application/ld+json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'X-Semantic-Cross-Hash': crossHash,
      },
    });
  } catch (error: any) {
    console.error('[JSON-LD] Falha ao exportar contribuição:', error);
    return NextResponse.json({ error: error.message || 'Falha ao gerar JSON-LD.' }, { status: 500 });
  }
}
