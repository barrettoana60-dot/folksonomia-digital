import { orchestrator, type InteropDossier } from '@/lib/ml/IntelligenceOrchestrator';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NOISE = /(^|\s)(oi|eu|m|o|test|teste|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;

function isValidCulturalTag(label?: string): label is string {
  return Boolean(label && label.trim().length >= 3 && !NOISE.test(label.trim()) && !/^\d+$/.test(label.trim()));
}

function jsonLdFor(dossier: InteropDossier) {
  const tagUri = `urn:folksonomia:tag:${dossier.dna}`;
  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      skos: 'http://www.w3.org/2004/02/skos/core#',
      dcterms: 'http://purl.org/dc/terms/',
      prov: 'http://www.w3.org/ns/prov#',
      folk: 'https://folksonomia.digital/vocab#',
    },
    '@id': tagUri,
    '@type': 'skos:Concept',
    'skos:prefLabel': { '@value': dossier.tag, '@language': 'pt-BR' },
    'skos:altLabel': dossier.aliases.map(label => ({ '@value': label, '@language': 'pt-BR' })),
    'dcterms:identifier': dossier.dna,
    'skos:inScheme': dossier.family,
    'folk:occurrenceCount': dossier.occurrenceCount,
    'folk:provenance': dossier.provenance,
    'skos:related': dossier.relations.filter(relation => relation.target.kind === 'tag').map(relation => ({
      '@id': `urn:folksonomia:tag:${relation.target.id}`,
      'folk:relation': relation.relation,
      'folk:confidence': relation.confidence,
      'folk:layer': relation.layer,
      'folk:explanation': relation.explanation,
    })),
    subjectOf: dossier.evidence.map(evidence => ({
      '@type': 'CreativeWork', name: evidence.label, url: evidence.url, provider: evidence.source, 'folk:confidence': evidence.confidence,
    })),
    'prov:wasDerivedFrom': dossier.provenance.dataSources,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag') || undefined;
    if (tag && !isValidCulturalTag(tag)) {
      return NextResponse.json({ success: false, error: 'Tag indisponível para exibição pública.' }, { status: 404 });
    }
    const network = await orchestrator.getNetworkView(tag);
    if (tag && req.headers.get('accept')?.includes('application/ld+json')) {
      if (!network.dossier) return NextResponse.json({ success: false, error: 'Tag não encontrada.' }, { status: 404 });
      return NextResponse.json(jsonLdFor(network.dossier), {
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/ld+json; charset=utf-8' },
      });
    }
    return NextResponse.json({ success: true, data: network }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[LiveVault GET]', error);
    return NextResponse.json({ success: false, error: 'Não foi possível carregar a rede cultural.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tag = body.sourceTag || body.tag;
    if (!isValidCulturalTag(tag)) return NextResponse.json({ success: false, error: 'Informe uma tag cultural válida.' }, { status: 400 });
    const network = await orchestrator.processAndEnrichTag(tag);
    return NextResponse.json({
      success: true,
      data: { ...network, message: `A rede consultou as fontes disponíveis e recalculou as relações de “${tag}”.` },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[LiveVault POST]', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha ao enriquecer a tag.' }, { status: 500 });
  }
}
