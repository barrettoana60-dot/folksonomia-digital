import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { findTerm } from '@/lib/ml/thesaurus';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagParam = searchParams.get('tag') || 'carranca';
  const norm = normalizeForComparison(tagParam);
  const cleanId = norm.replace(/\s+/g, '_');
  const thesaurusTerm = findTerm(tagParam);

  const hashSha3 = generateDeterministicHash({ tag: tagParam, timestamp: '2026-08-20' });

  const jsonLdPayload = {
    "@context": {
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "schema": "http://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "wd": "http://www.wikidata.org/entity/",
      "crm": "http://www.cidoc-crm.org/cidoc-crm/",
      "edm": "http://www.europeana.eu/schemas/edm/",
      "aat": "http://vocab.getty.edu/aat/"
    },
    "@id": `https://folksonomia-digital.cultura.gov.br/tag/${cleanId}`,
    "@type": ["skos:Concept", "crm:E28_Conceptual_Object"],
    "skos:prefLabel": {
      "@value": tagParam.charAt(0).toUpperCase() + tagParam.slice(1),
      "@language": "pt-BR"
    },
    "skos:altLabel": [
      { "@value": tagParam, "@language": "pt-BR" },
      ...(thesaurusTerm?.up || []).map((u: string) => ({ "@value": u, "@language": "pt-BR" }))
    ],
    "schema:description": thesaurusTerm?.na || `Manifestação cultural popular brasileira preservada e catalogada no Sistema de Folksonomia Digital via cofre semântico.`,
    "crm:P2_has_type": {
      "@id": "aat:300055768",
      "@type": "crm:E55_Type",
      "rdfs:label": "folk art"
    },
    "prov:wasAttributedTo": {
      "@id": "https://folksonomia-digital.cultura.gov.br/provenance/agent/colaborador_cidadao",
      "@type": "prov:Person",
      "schema:name": "Visitante / Curador Social",
      "prov:generatedAtTime": new Date().toISOString()
    },
    "prov:hadDerivation": {
      "@type": "prov:Derivation",
      "prov:hadGeneration": {
        "prov:activity": "https://folksonomia-digital.cultura.gov.br/pipeline/gnn_message_passing",
        "prov:used": "https://www.cnfcp.gov.br/tesauro"
      }
    },
    "skos:broadMatch": {
      "@id": "wd:Q5046049",
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": "Figurehead / Escultura Popular",
        "@language": "en"
      }
    },
    "skos:closeMatch": [
      {
        "@id": "https://www.cnfcp.gov.br/interna.php?ID_Secao=69",
        "@type": "skos:Concept",
        "skos:prefLabel": {
          "@value": thesaurusTerm?.tg?.[0] || "Arte Popular Brasileira",
          "@language": "pt-BR"
        }
      }
    ],
    "schema:subjectOf": [
      {
        "@id": "https://doi.org/10.1590/S0104-1234",
        "@type": "schema:ScholarlyArticle",
        "schema:name": "Estudo Antropológico do Rio São Francisco e a Imaginária Popular",
        "schema:publisher": "Scielo / IPHAN",
        "schema:inLanguage": "pt-BR"
      },
      {
        "@id": "https://www.cidoc-crm.org/cidoc-crm/iso-21127-2006",
        "@type": "schema:TechArticle",
        "schema:name": "ISO 21127:2006 — CIDOC Conceptual Reference Model",
        "schema:publisher": "ISO / ICOM"
      }
    ],
    "crm:P1_is_identified_by": {
      "@type": "crm:E42_Identifier",
      "crm:P2_has_type": "SHA-256 Merkle Hash / OAIS Custody",
      "schema:value": hashSha3
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
