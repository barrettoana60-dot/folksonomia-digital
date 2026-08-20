import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { CANONICAL_CULTURE_VAULT } from '../live-vault/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagParam = searchParams.get('tag') || 'carranca';
  const cleanId = normalizeForComparison(tagParam).replace(/\s+/g, '_');
  
  const item = CANONICAL_CULTURE_VAULT[cleanId] || CANONICAL_CULTURE_VAULT['carranca'];
  const hashSha256 = generateDeterministicHash({ tag: item.tag, uuid: item.uuid });

  const jsonLdPayload = {
    "@context": {
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "schema": "http://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "wd": "http://www.wikidata.org/entity/",
      "crm": "http://www.cidoc-crm.org/cidoc-crm/"
    },
    "@id": `https://folksonomia-digital.cultura.gov.br/tag/${item.id}`,
    "@type": ["skos:Concept", "crm:E28_Conceptual_Object"],
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
      "@id": item.wikidata.uri,
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": item.wikidata.enLabel,
        "@language": "en"
      }
    },
    "schema:subjectOf": [
      {
        "@id": `https://doi.org/${item.artigo.doi}`,
        "@type": "schema:ScholarlyArticle",
        "schema:name": item.artigo.titulo,
        "schema:author": item.artigo.autor,
        "schema:publisher": item.artigo.veiculo,
        "schema:identifier": item.artigo.doi
      }
    ],
    "crm:P1_is_identified_by": {
      "@type": "crm:E42_Identifier",
      "crm:P2_has_type": "SHA-256 Merkle Custody Hash",
      "schema:value": hashSha256
    }
  };

  return NextResponse.json(jsonLdPayload, {
    headers: {
      'Content-Type': 'application/ld+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
