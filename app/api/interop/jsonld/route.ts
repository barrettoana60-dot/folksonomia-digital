import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { getEncryptionStatus } from '@/lib/core/crypto';
import { createSemanticVaultFingerprint } from '@/lib/core/semantic-vault';

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
        { error: 'A contribuição não foi encontrada no cofre de usuários.' },
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

    const jsonLdPayload = {
      '@context': {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        prov: 'http://www.w3.org/ns/prov#',
        vault: 'https://folksonomia-digital.cultura.gov.br/vocab/semantic-vault#',
      },
      '@id': `https://folksonomia-digital.cultura.gov.br/contribuicao/${encodeURIComponent(normalizedLabel)}`,
      '@type': 'skos:Concept',
      'skos:prefLabel': { '@value': label, '@language': 'pt-BR' },
      'schema:description': 'Contribuição cultural preservada no Cofre Semântico Vivo.',
      'schema:category': contribution.grupo_tematico || 'Cultura',
      'prov:wasGeneratedBy': {
        '@type': 'vault:UserContribution',
        'prov:generatedAtTime': contribution.criado_em || undefined,
      },
      'vault:semanticTriple': semanticTriple,
      'vault:payloadHash': payloadHash,
      'vault:crossHash': crossHash,
      'vault:geneticCode': geneticCode,
      ...(sealedAudit ? {
        'vault:auditChainHash': sealedAudit.chain_hash,
        'vault:auditSequence': sealedAudit.chain_position,
        'vault:sealedAt': sealedAudit.created_at,
      } : {}),
      'vault:security': getEncryptionStatus(),
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
