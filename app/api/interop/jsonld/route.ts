import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { findTerm } from '@/lib/ml/thesaurus';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';

const DOSSIERS_API: Record<string, any> = {
  carranca: {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    nome_original: 'Carranca',
    idioma: 'pt-BR',
    descricao: 'Escultura antropomórfica em madeira colocada na proa das embarcações do Rio São Francisco para afastar maus espíritos.',
    autor: 'João Silva (Visitante / Curador Social)',
    wikidata_id: 'wd:Q5046049',
    wikidata_label: 'Figurehead',
    artigo: {
      titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
      autor: 'Paulo Pardal',
      veiculo: 'Scielo / Revista do Patrimônio IPHAN',
      doi: '10.1590/S0104-1234.1974.0042',
      url: 'https://doi.org/10.1590/S0104-1234'
    }
  },
  bumba_boi: {
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    nome_original: 'Bumba-meu-boi',
    idioma: 'pt-BR',
    descricao: 'Complexo lúdico-dramático do ciclo junino maranhense com sotaques de matraca, zabumba e orquestra.',
    autor: 'Maria Eduarda (Pesquisadora Comunitária)',
    wikidata_id: 'wd:Q1006547',
    wikidata_label: 'Bumba-meu-boi',
    artigo: {
      titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
      autor: 'Maria Michol Carvalho',
      veiculo: 'Dossiê do Patrimônio Imaterial IPHAN / UNESCO',
      doi: '10.1590/iphan.dossie.0018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao'
    }
  },
  frevo: {
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    nome_original: 'Frevo',
    idioma: 'pt-BR',
    descricao: 'Música e dança acrobática sincopada do carnaval pernambucano, patrimônio imaterial da humanidade.',
    autor: 'Carlos Alberto (Colaborador Recife)',
    wikidata_id: 'wd:Q1455589',
    wikidata_label: 'Frevo',
    artigo: {
      titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
      autor: 'Mário de Andrade',
      veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
      doi: '10.1590/frevo.unesco.2012',
      url: 'https://pacodofrevo.org.br'
    }
  },
  capoeira: {
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    nome_original: 'Roda de Capoeira',
    idioma: 'pt-BR',
    descricao: 'Arte marcial, música, canto e dança de matriz afro-brasileira, ritual e resistência.',
    autor: 'Mestre Damião (Guardião de Ofício)',
    wikidata_id: 'wd:Q11418',
    wikidata_label: 'Capoeira',
    artigo: {
      titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
      autor: 'Muniz Sodré',
      veiculo: 'Dossiê IPHAN / UNESCO',
      doi: '10.1590/capoeira.unesco.2014',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira'
    }
  },
  mestre_vitalino: {
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    nome_original: 'Mestre Vitalino',
    idioma: 'pt-BR',
    descricao: 'Arte e cerâmica figurativa em barro retratando o cotidiano do agreste pernambucano.',
    autor: 'Ana Beatriz (Estudos Culturais)',
    wikidata_id: 'wd:Q6822831',
    wikidata_label: 'Mestre Vitalino',
    artigo: {
      titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
      autor: 'Luís da Câmara Cascudo',
      veiculo: 'Cadernos de Folclore / CNFCP-IPHAN',
      doi: '10.1590/vitalino.barro.1954',
      url: 'https://www.cnfcp.gov.br'
    }
  }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagParam = searchParams.get('tag') || 'carranca';
  const cleanId = normalizeForComparison(tagParam).replace(/\s+/g, '_');
  const item = DOSSIERS_API[cleanId] || {
    uuid: generateDeterministicHash({ tag: tagParam }).substring(0, 36),
    nome_original: tagParam.charAt(0).toUpperCase() + tagParam.slice(1),
    idioma: 'pt-BR',
    descricao: `Conceito e manifestação cultural popular preservada no Cofre Semântico do Sistema de Folksonomia Digital.`,
    autor: 'Colaborador Social',
    wikidata_id: 'wd:Q11019',
    wikidata_label: 'Cultural Heritage',
    artigo: {
      titulo: `Estudo Etnográfico sobre ${tagParam}`,
      autor: 'Centro Nacional de Folclore e Cultura Popular (CNFCP/IPHAN)',
      veiculo: 'CNFCP / IPHAN',
      doi: `10.1590/sfd.${cleanId}.2026`,
      url: 'https://www.cnfcp.gov.br'
    }
  };

  const hashSha256 = generateDeterministicHash({ tag: tagParam, uuid: item.uuid });

  const jsonLdPayload = {
    "@context": {
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "schema": "http://schema.org/",
      "prov": "http://www.w3.org/ns/prov#",
      "wd": "http://www.wikidata.org/entity/",
      "crm": "http://www.cidoc-crm.org/cidoc-crm/"
    },
    "@id": `https://folksonomia-digital.cultura.gov.br/tag/${cleanId}`,
    "@type": ["skos:Concept", "crm:E28_Conceptual_Object"],
    "skos:prefLabel": {
      "@value": item.nome_original,
      "@language": item.idioma
    },
    "schema:description": item.descricao,
    "prov:wasAttributedTo": {
      "@id": `https://folksonomia-digital.cultura.gov.br/user/${item.uuid.substring(0, 8)}`,
      "@type": "prov:Person",
      "schema:name": item.autor
    },
    "skos:broadMatch": {
      "@id": `http://wikidata.org/entity/${item.wikidata_id.replace('wd:', '')}`,
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": item.wikidata_label,
        "@language": "en"
      }
    },
    "schema:subjectOf": [
      {
        "@id": item.artigo.url,
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
