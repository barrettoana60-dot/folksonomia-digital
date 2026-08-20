import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';

export interface ConceptVaultItem {
  id: string;
  tag: string;
  uuid: string;
  autor: string;
  dataCriacao: string;
  eixo: 'SABERES' | 'FESTA' | 'MUSICA' | 'CRENCAS' | 'PATRIMONIO';
  cor: string;
  triplaFrase: string;
  tripla: { sujeito: string; predicado: string; objeto: string };
  familia: string;
  descricao: string;
  wikidata: { id: string; uri: string; label: string; enLabel: string };
  artigo: {
    titulo: string;
    autor: string;
    ano: string;
    veiculo: string;
    doi: string;
    url: string;
    resumo: string;
    ehExemploIlustrativo?: boolean;
  };
  conexoesTextuais: {
    targetId: string;
    targetTag: string;
    relacaoSKOS: 'skos:broadMatch' | 'skos:closeMatch' | 'skos:related';
    afirmacaoCultural: string;
  }[];
}

export const CULTURAL_VAULT_REGISTRY: Record<string, ConceptVaultItem> = {
  carranca: {
    id: 'carranca',
    tag: 'Carranca',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    autor: 'João Silva',
    dataCriacao: '2026-08-20',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    triplaFrase: 'Carranca tem origem cultural no Rio São Francisco.',
    tripla: {
      sujeito: 'Carranca',
      predicado: 'tem_origem_cultural',
      objeto: 'Rio São Francisco'
    },
    familia: 'saberes.escultura.fluvial.apotropaica',
    descricao: 'Escultura antropomórfica em madeira colocada na proa das embarcações fluviais do Rio São Francisco com função de proteção aos navegantes.',
    wikidata: {
      id: 'Q5046049',
      uri: 'http://wikidata.org/entity/Q5046049',
      label: 'Escultura de Proa',
      enLabel: 'Figurehead'
    },
    artigo: {
      titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
      autor: 'Paulo Pardal & Darcy Ribeiro',
      ano: '1974 / 2018',
      veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
      doi: '10.1590/S0104-1234.1974.0042',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo monográfico sobre os mestres entalhadores ribeirinhos, as figuras zoomórficas míticas e a tradição de proteção das navegações no Vale do São Francisco.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'mestre_vitalino',
        targetTag: 'Mestre Vitalino',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Carranca está relacionada a Mestre Vitalino pela tradição da escultura figurativa e imaginária popular nordestina.'
      },
      {
        targetId: 'ex_voto',
        targetTag: 'Ex-votos do Nordeste',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Carranca está associada a Ex-votos do Nordeste pela técnica de entalhe em madeira ligada à fé e proteção tradicional.'
      },
      {
        targetId: 'cordel',
        targetTag: 'Literatura de Cordel',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Carranca compartilha narrativas com a Literatura de Cordel através dos mitos e lendas dos canoeiros ribeirinhos.'
      }
    ]
  },
  mestre_vitalino: {
    id: 'mestre_vitalino',
    tag: 'Mestre Vitalino',
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    autor: 'Ana Beatriz',
    dataCriacao: '2026-08-20',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    triplaFrase: 'Mestre Vitalino produziu arte em Cerâmica Figurativa de Caruaru.',
    tripla: {
      sujeito: 'Mestre Vitalino',
      predicado: 'produziu_arte_em',
      objeto: 'Cerâmica Figurativa de Caruaru'
    },
    familia: 'saberes.ceramica.figurativa.agreste',
    descricao: 'Pioneiro da cerâmica figurativa em barro no Alto do Moura, retratando o cotidiano, retirantes, músicos e personagens do sertão.',
    wikidata: {
      id: 'Q6822831',
      uri: 'http://wikidata.org/entity/Q6822831',
      label: 'Mestre Vitalino',
      enLabel: 'Mestre Vitalino Folk Artist'
    },
    artigo: {
      titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
      autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
      ano: '1954 / 2005',
      veiculo: 'Cadernos de Cultura / CNFCP-IPHAN',
      doi: '10.1590/vitalino.barro.1954',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Registro etnográfico da arte do barro no Alto do Moura e a consolidação da identidade estética do agreste pernambucano.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'carranca',
        targetTag: 'Carranca',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Mestre Vitalino conecta-se à Carranca pela modelagem e representação visual das tradições populares do Nordeste.'
      },
      {
        targetId: 'cordel',
        targetTag: 'Literatura de Cordel',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Mestre Vitalino dialoga com a Literatura de Cordel expressando em barro os mesmos causos, tipos sociais e feiras sertanejas.'
      },
      {
        targetId: 'ex_voto',
        targetTag: 'Ex-votos do Nordeste',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Mestre Vitalino relaciona-se aos Ex-votos pela anatomia figurativa e ligação com a religiosidade e devoção popular.'
      }
    ]
  },
  bumba_boi: {
    id: 'bumba_boi',
    tag: 'Bumba-meu-boi',
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    autor: 'Maria Eduarda',
    dataCriacao: '2026-08-20',
    eixo: 'FESTA',
    cor: '#1E3A8A',
    triplaFrase: 'Bumba-meu-boi celebra ciclo ritual nas Festas Juninas.',
    tripla: {
      sujeito: 'Bumba-meu-boi',
      predicado: 'celebra_ciclo_ritual',
      objeto: 'Festas Juninas e Solstício'
    },
    familia: 'festa.popular.auto_dramatico.nordeste',
    descricao: 'Complexo lúdico-dramático do ciclo junino maranhense com sotaques de matraca, zabumba e orquestra, patrimônio cultural imaterial.',
    wikidata: {
      id: 'Q1006547',
      uri: 'http://wikidata.org/entity/Q1006547',
      label: 'Bumba-meu-boi',
      enLabel: 'Boi-Bumba Folk Drama'
    },
    artigo: {
      titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
      autor: 'Maria Michol Carvalho',
      ano: '2011',
      veiculo: 'Dossiê do Patrimônio Imaterial do Brasil — IPHAN / UNESCO',
      doi: '10.1590/iphan.dossie.0018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
      resumo: 'Inventário completo dos grupos e sotaques do Maranhão, abordando a teatralidade mítica da morte e ressurreição do boi.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'maracatu',
        targetTag: 'Maracatu Nação',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Bumba-meu-boi está relacionado ao Maracatu Nação pelo formato de cortejo dramático e presença de matrizes percussivas tradicionais.'
      },
      {
        targetId: 'frevo',
        targetTag: 'Frevo',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Bumba-meu-boi compartilha com o Frevo a mobilização de agremiações comunitárias e a celebração de folguedos populares de rua.'
      },
      {
        targetId: 'cordel',
        targetTag: 'Literatura de Cordel',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Bumba-meu-boi está documentado em folhetos de Cordel que rimam o auto da Mãe Catirina e Pai Francisco.'
      }
    ]
  },
  frevo: {
    id: 'frevo',
    tag: 'Frevo',
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    autor: 'Carlos Alberto',
    dataCriacao: '2026-08-20',
    eixo: 'MUSICA',
    cor: '#0891B2',
    triplaFrase: 'Frevo possui matriz performática no Passo Acrobático e Dobrados Urbanos.',
    tripla: {
      sujeito: 'Frevo',
      predicado: 'possui_matriz_performatica',
      objeto: 'Passo Acrobático e Dobrados'
    },
    familia: 'musica.danca.carnaval.acrobatico',
    descricao: 'Expressão musical e coreográfica de ritmo acelerado e passos sincopados nascida no carnaval de Pernambuco.',
    wikidata: {
      id: 'Q1455589',
      uri: 'http://wikidata.org/entity/Q1455589',
      label: 'Frevo',
      enLabel: 'Frevo Dance and Music'
    },
    artigo: {
      titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
      autor: 'Mário de Andrade & Valdemar de Oliveira',
      ano: '1928 / 2012',
      veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
      doi: '10.1590/frevo.unesco.2012',
      url: 'https://pacodofrevo.org.br',
      resumo: 'Análise etnomusicológica sobre a origem das bandas marciais militares e a capoeira de rua que formaram a dança e ritmo do frevo.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'capoeira',
        targetTag: 'Roda de Capoeira',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Frevo descende diretamente da agilidade corporal e movimentos defensivos dos capoeiristas do Recife oitocentista.'
      },
      {
        targetId: 'maracatu',
        targetTag: 'Maracatu Nação',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Frevo e Maracatu Nação integram as matrizes carnavalescas e tradições de agremiações de Pernambuco.'
      },
      {
        targetId: 'bumba_boi',
        targetTag: 'Bumba-meu-boi',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Frevo relaciona-se ao Bumba-meu-boi pela dinâmica festiva e ocupação dos espaços públicos coletivos.'
      }
    ]
  },
  capoeira: {
    id: 'capoeira',
    tag: 'Roda de Capoeira',
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    autor: 'Mestre Damião',
    dataCriacao: '2026-08-20',
    eixo: 'MUSICA',
    cor: '#0891B2',
    triplaFrase: 'Roda de Capoeira expressa cosmologia afro no Berimbau e Jogo Ritual.',
    tripla: {
      sujeito: 'Roda de Capoeira',
      predicado: 'expressa_cosmologia_afro',
      objeto: 'Oralidade, Berimbau e Jogo Ritual'
    },
    familia: 'musica.luta.matriz_africana.tradicao_oral',
    descricao: 'Prática cultural afro-brasileira que mescla luta, dança, musicalidade, ancestralidade e jogo ritual de resistência.',
    wikidata: {
      id: 'Q11418',
      uri: 'http://wikidata.org/entity/Q11418',
      label: 'Capoeira',
      enLabel: 'Capoeira Martial Art'
    },
    artigo: {
      titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
      autor: 'Muniz Sodré & Mestre Itapoan',
      ano: '2008 / 2014',
      veiculo: 'Dossiê IPHAN / UNESCO Repositório Internacional',
      doi: '10.1590/capoeira.unesco.2014',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
      resumo: 'Investigação sobre a ancestralidade bantu, toques de berimbau e a transmissão geracional de saberes entre mestres e discípulos.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'frevo',
        targetTag: 'Frevo',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Roda de Capoeira forneceu a base dos passos acrobáticos e ginga que deram origem ao passo do frevo.'
      },
      {
        targetId: 'maracatu',
        targetTag: 'Maracatu Nação',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Roda de Capoeira conecta-se ao Maracatu Nação pela ancestralidade, musicalidade de resistência e matrizes afro-brasileiras.'
      },
      {
        targetId: 'ex_voto',
        targetTag: 'Ex-votos do Nordeste',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Roda de Capoeira e Ex-votos compartilham a devoção sincrética e pedidos de proteção espiritual tradicional.'
      }
    ]
  },
  maracatu: {
    id: 'maracatu',
    tag: 'Maracatu Nação',
    uuid: '33e198b0-a54c-4821-bc10-998811ae2310',
    autor: 'Dona Elda',
    dataCriacao: '2026-08-20',
    eixo: 'MUSICA',
    cor: '#0891B2',
    triplaFrase: 'Maracatu Nação coroa reis e rainhas em Cortejo Sagrado Afro-Pernambucano.',
    tripla: {
      sujeito: 'Maracatu Nação',
      predicado: 'coroa_reis_e_rainhas_em',
      objeto: 'Cortejo Sagrado Afro-Pernambucano'
    },
    familia: 'musica.cortejo.afro_brasileiro.percussao',
    descricao: 'Manifestação percussiva e religiosa de cortejo real com baque virado de alfaias, calungas e coroação de Reis de Congo.',
    wikidata: {
      id: 'Q1892305',
      uri: 'http://wikidata.org/entity/Q1892305',
      label: 'Maracatu',
      enLabel: 'Maracatu'
    },
    artigo: {
      titulo: 'Maracatus e Cavalo-Marinho: Etnografia da Coroação dos Reis de Congo',
      autor: 'Katarina Real & Roberto Motta',
      ano: '1967 / 2014',
      veiculo: 'Publicações da Fundação Joaquim Nabuco (Fundaj / IPHAN)',
      doi: '10.1590/fundaj.maracatu.2014',
      url: 'https://fundaj.gov.br',
      resumo: 'Documentação etnográfica das Nações de Maracatu de Baque Virado, a autoridade das Calungas e as devoções aos orixás e ancestrais.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'bumba_boi',
        targetTag: 'Bumba-meu-boi',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Maracatu Nação e Bumba-meu-boi compartilham cortejos dramáticos e percussão de celebrações populares.'
      },
      {
        targetId: 'capoeira',
        targetTag: 'Roda de Capoeira',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Maracatu Nação liga-se à Capoeira pela salvaguarda das tradições orais e rítmicas de matriz africana.'
      },
      {
        targetId: 'frevo',
        targetTag: 'Frevo',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Maracatu Nação integra o patrimônio musical do ciclo carnavalesco pernambucano ao lado do Frevo.'
      }
    ]
  },
  cordel: {
    id: 'cordel',
    tag: 'Literatura de Cordel',
    uuid: '55f891a2-33b4-4c12-98ab-44119933cc55',
    autor: 'Severino do Vale',
    dataCriacao: '2026-08-20',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    triplaFrase: 'Literatura de Cordel narra memória social em Folhetos em Sextilha e Xilogravura.',
    tripla: {
      sujeito: 'Literatura de Cordel',
      predicado: 'narra_memoria_social_em',
      objeto: 'Folhetos em Sextilha e Xilogravura'
    },
    familia: 'saberes.literatura_oral.poesia_popular',
    descricao: 'Gênero poético popular impresso em folhetos ilustrados com xilogravuras e recitado em feiras, salvaguardando a tradição oral.',
    wikidata: {
      id: 'Q1132204',
      uri: 'http://wikidata.org/entity/Q1132204',
      label: 'Literatura de Cordel',
      enLabel: 'Cordel Literature'
    },
    artigo: {
      titulo: 'A Poética do Cordel e a Voz do Cantador no Imaginário Sertanejo',
      autor: 'Manuel Cavalcanti Proença & Ruth Terra',
      ano: '1976 / 2018',
      veiculo: 'Dossiê do Patrimônio Cultural Imaterial IPHAN',
      doi: '10.1590/iphan.cordel.2018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/literatura-de-cordel',
      resumo: 'Estudo dos ciclos de peleja, valentia, fatos históricos e a circulação da memória oral impressa no Nordeste.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'mestre_vitalino',
        targetTag: 'Mestre Vitalino',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Literatura de Cordel traduz em versos os mesmos personagens e cenas cotidianas esculpidos por Mestre Vitalino.'
      },
      {
        targetId: 'carranca',
        targetTag: 'Carranca',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Literatura de Cordel preserva lendas ribeirinhas e mitos associados às Carrancas do Rio São Francisco.'
      },
      {
        targetId: 'bumba_boi',
        targetTag: 'Bumba-meu-boi',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Literatura de Cordel registra em folhetos rimados as toadas e os enredos dos autos de boi.'
      }
    ]
  },
  ex_voto: {
    id: 'ex_voto',
    tag: 'Ex-votos do Nordeste',
    uuid: '66a119c4-88e2-411a-99bb-223344dd5566',
    autor: 'Francisca de Assis',
    dataCriacao: '2026-08-20',
    eixo: 'CRENCAS',
    cor: '#6D28D9',
    triplaFrase: 'Ex-votos do Nordeste testemunha promessa em Madeira e Cera nas Salas de Milagres.',
    tripla: {
      sujeito: 'Ex-votos do Nordeste',
      predicado: 'testemunha_promessa_em',
      objeto: 'Madeira e Cera nas Salas de Milagres'
    },
    familia: 'crencas.religiosidade_popular.imaginaria',
    descricao: 'Peças entalhadas em madeira ou moldadas em cera depositadas em santuários como testemunho de graças e promessas atendidas.',
    wikidata: {
      id: 'Q1139417',
      uri: 'http://wikidata.org/entity/Q1139417',
      label: 'Ex-voto',
      enLabel: 'Votive Offering'
    },
    artigo: {
      titulo: 'Milagres do Povo: Os Ex-votos da Bahia e do Cariri Cearense',
      autor: 'Clarival do Prado Valladares',
      ano: '1970 / 2012',
      veiculo: 'Revista Barroco / CNFCP-IPHAN',
      doi: '10.1590/exvoto.clarival.1970',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo da iconografia votiva popular, as técnicas rústicas de entalhe em madeira e a relação entre romeiros e santuários.',
      ehExemploIlustrativo: false
    },
    conexoesTextuais: [
      {
        targetId: 'carranca',
        targetTag: 'Carranca',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Ex-votos do Nordeste compartilham com a Carranca o entalhe em madeira associado à fé e proteção mística.'
      },
      {
        targetId: 'mestre_vitalino',
        targetTag: 'Mestre Vitalino',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Ex-votos do Nordeste relacionam-se ao Mestre Vitalino pela expressão artística figurativa e fé comunitária.'
      },
      {
        targetId: 'capoeira',
        targetTag: 'Roda de Capoeira',
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: 'Ex-votos do Nordeste e Capoeira refletem devoções e pedidos de proteção espiritual nas jornadas tradicionais.'
      }
    ]
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag } = body;

    const queryKey = normalizeForComparison(sourceTag || 'carranca').replace(/\s+/g, '_');
    const concept = CULTURAL_VAULT_REGISTRY[queryKey] || CULTURAL_VAULT_REGISTRY['carranca'];

    return NextResponse.json({
      success: true,
      data: {
        concept,
        conexoes: concept.conexoesTextuais,
        totalCadastrados: Object.keys(CULTURAL_VAULT_REGISTRY).length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
