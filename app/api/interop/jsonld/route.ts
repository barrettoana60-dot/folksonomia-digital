import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { CULTURAL_VAULT_REGISTRY } from '../live-vault/registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagParam = searchParams.get('tag') || 'carranca';
  const cleanId = normalizeForComparison(tagParam).replace(/\s+/g, '_');
  
  const item = CULTURAL_VAULT_REGISTRY[cleanId] || CULTURAL_VAULT_REGISTRY['carranca'];

  // Schema exato do JSON-LD 1.1 especificado pelo usuário
  const jsonLdPayload = {
    "@context": {
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "schema": "http://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "wd": "http://www.wikidata.org/entity/"
    },
    "@id": `https://folksonomia-digital.cultura.gov.br/tag/${item.id}`,
    "@type": "skos:Concept",
    "skos:prefLabel": {
      "@value": item.tag,
      "@language": "pt-BR"
    },
    "schema:description": item.descricao,
    "prov:wasAttributedTo": {
      "@id": `https://folksonomia-digital.cultura.gov.br/user/${item.uuid.substring(0, 8)}`,
      "@type": "prov:Person",
      "schema:name": item.autor
    },
    "skos:broadMatch": {
      "@id": item.wikidata.id,
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": item.wikidata.enLabel,
        "@language": "en"
      }
    },
    "schema:subjectOf": [
      {
        "@id": item.artigo.url,
        "@type": "schema:ScholarlyArticle",
        "schema:name": item.artigo.titulo,
        "schema:publisher": item.artigo.veiculo
      }
    ]
  };

  return NextResponse.json(jsonLdPayload, {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
