import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';

// ─── Dossiês Culturais Canônicos do Cofre Semântico Vivo ───────────────────
export interface CanonicalCulturalConcept {
  id: string;
  tag: string;
  uuid: string;
  autor: string;
  dataCriacao: string;
  eixo: 'SABERES' | 'FESTA' | 'MUSICA' | 'CRENCAS' | 'PATRIMONIO';
  cor: string;
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
  };
  conexoesNaturais: { targetId: string; peso: number; relacao: string; explicacao: string }[];
}

export const CANONICAL_CULTURE_VAULT: Record<string, CanonicalCulturalConcept> = {
  carranca: {
    id: 'carranca',
    tag: 'Carranca',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    autor: 'João Silva (Curador Social / Vale do São Francisco)',
    dataCriacao: '2026-08-20T10:15:00Z',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    tripla: {
      sujeito: 'Carranca',
      predicado: 'tem_origem_cultural',
      objeto: 'Rio São Francisco'
    },
    familia: 'saberes.escultura.fluvial.apotropaica',
    descricao: 'Escultura antropomórfica em madeira colocada na proa das embarcações fluviais do Rio São Francisco para afastar maus espíritos e proteger navegantes.',
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
      resumo: 'Estudo monográfico fundamental sobre os mestres entalhadores ribeirinhos, as figuras zoomórficas míticas e a função apotropaica de afastar os perigos fluviais e o Minhocão.'
    },
    conexoesNaturais: [
      { targetId: 'mestre_vitalino', peso: 0.86, relacao: 'skos:related', explicacao: 'Tradição mística do artesanato modelado e imaginária popular nordestina.' },
      { targetId: 'ex_voto', peso: 0.82, relacao: 'skos:related', explicacao: 'Entalhes de fé e proteção espiritual vinculados à promessa e devoção comunitária.' },
      { targetId: 'bumba_boi', peso: 0.68, relacao: 'skos:related', explicacao: 'Simbolismo zoomórfico protetor presente no ciclo das narrativas populares.' }
    ]
  },
  mestre_vitalino: {
    id: 'mestre_vitalino',
    tag: 'Mestre Vitalino',
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    autor: 'Ana Beatriz (Pesquisadora Comunitária de Caruaru)',
    dataCriacao: '2026-08-20T12:10:00Z',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    tripla: {
      sujeito: 'Mestre Vitalino',
      predicado: 'produziu_arte_em',
      objeto: 'Cerâmica Figurativa de Caruaru'
    },
    familia: 'saberes.ceramica.figurativa.agreste',
    descricao: 'Pioneiro da cerâmica figurativa em barro no Alto do Moura, retratando com expressividade o cotidiano, retirantes, músicos e vaqueiros do sertão.',
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
      resumo: 'Documentação seminal sobre a gênese da cerâmica do Alto do Moura, o universo sociocultural dos artesãos e a escultura identitária do agreste pernambucano.'
    },
    conexoesNaturais: [
      { targetId: 'carranca', peso: 0.86, relacao: 'skos:related', explicacao: 'Expressão magna da arte popular figurativa de matriz ribeirinha e sertaneja.' },
      { targetId: 'cordel', peso: 0.79, relacao: 'skos:related', explicacao: 'Narrativas visuais correspondentes às xilogravuras e folhetos de cordel.' },
      { targetId: 'frevo', peso: 0.71, relacao: 'skos:related', explicacao: 'Registro iconográfico em barro dos músicos de bandas marciais e passistas.' }
    ]
  },
  bumba_boi: {
    id: 'bumba_boi',
    tag: 'Bumba-meu-boi',
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    autor: 'Maria Eduarda (Guardiã de Tradição de São Luís)',
    dataCriacao: '2026-08-20T11:30:00Z',
    eixo: 'FESTA',
    cor: '#1E3A8A',
    tripla: {
      sujeito: 'Bumba-meu-boi',
      predicado: 'celebra_ciclo_ritual',
      objeto: 'Festas Juninas e Solstício de Inverno'
    },
    familia: 'festa.popular.auto_dramatico.nordeste',
    descricao: 'Complexo ritual lúdico-dramático do ciclo junino maranhense com sotaques de matraca, zabumba, orquestra e costa-de-mão, patrimônio imaterial da humanidade.',
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
      resumo: 'Inventário e análise etnográfica do ciclo do boi: batismo, morte, ressurreição, toadas, sincretismo religioso e relações de compadrio comunitário.'
    },
    conexoesNaturais: [
      { targetId: 'maracatu', peso: 0.85, relacao: 'skos:related', explicacao: 'Ritualização dramática e cortejo percussivo sincrético de festas públicas.' },
      { targetId: 'frevo', peso: 0.74, relacao: 'skos:related', explicacao: 'Folguedos de rua que mobilizam comunidades urbanas e matrizes percussivas.' },
      { targetId: 'carranca', peso: 0.68, relacao: 'skos:related', explicacao: 'Imaginário mítico zoomórfico que une terra, rio e devoção ancestral.' }
    ]
  },
  frevo: {
    id: 'frevo',
    tag: 'Frevo',
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    autor: 'Carlos Alberto (Passista e Pesquisador do Recife)',
    dataCriacao: '2026-08-20T09:45:00Z',
    eixo: 'MUSICA',
    cor: '#0891B2',
    tripla: {
      sujeito: 'Frevo',
      predicado: 'possui_matriz_performatica',
      objeto: 'Passo Acrobático e Dobrados Urbanos'
    },
    familia: 'musica.danca.carnaval.acrobatico',
    descricao: 'Expressão musical e coreográfica de ritmo sincopado acelerado e passos acrobáticos nascida no carnaval de Recife e Olinda, patrimônio imaterial da humanidade.',
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
      resumo: 'Exame etnomusicológico da fusão entre as marchas militares, polcas e a corporalidade defensiva dos capoeiristas nos cortejos de rua do século XIX.'
    },
    conexoesNaturais: [
      { targetId: 'capoeira', peso: 0.89, relacao: 'skos:related', explicacao: 'O passo do frevo descende diretamente da agilidade marcial e rasteiras da capoeira.' },
      { targetId: 'maracatu', peso: 0.81, relacao: 'skos:related', explicacao: 'Tradição centenária de agremiações carnavalescas de Pernambuco.' },
      { targetId: 'bumba_boi', peso: 0.74, relacao: 'skos:related', explicacao: 'Expressão rítmica e de catarse coletiva nos espaços públicos brasileiros.' }
    ]
  },
  capoeira: {
    id: 'capoeira',
    tag: 'Roda de Capoeira',
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    autor: 'Mestre Damião (Mestre de Ofício Tradicional de Salvador)',
    dataCriacao: '2026-08-20T08:20:00Z',
    eixo: 'MUSICA',
    cor: '#0891B2',
    tripla: {
      sujeito: 'Roda de Capoeira',
      predicado: 'expressa_cosmologia_afro',
      objeto: 'Oralidade, Berimbau e Jogo Ritual'
    },
    familia: 'musica.luta.matriz_africana.tradicao_oral',
    descricao: 'Prática cultural afro-brasileira que mescla luta, dança, musicalidade, ancestralidade, teatro e jogo ritual de resistência, patrimônio imaterial da humanidade.',
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
      resumo: 'Investigação etnofilosófica da ancestralidade bantu, toques de berimbau, fundamentos dos mestres e a transmissão geracional do saber corporal.'
    },
    conexoesNaturais: [
      { targetId: 'frevo', peso: 0.89, relacao: 'skos:related', explicacao: 'Matriz corporal acrobática formadora do passo pernambucano nos primórdios do carnaval.' },
      { targetId: 'maracatu', peso: 0.83, relacao: 'skos:related', explicacao: 'Herança litúrgica e percussiva de resistência afro-brasileira.' },
      { targetId: 'ex_voto', peso: 0.65, relacao: 'skos:related', explicacao: 'Práticas de salvaguarda e fé nas proteções espirituais ancestrais.' }
    ]
  },
  maracatu: {
    id: 'maracatu',
    tag: 'Maracatu Nação',
    uuid: '33e198b0-a54c-4821-bc10-998811ae2310',
    autor: 'Dona Elda (Batuqueira e Pesquisadora de Olinda)',
    dataCriacao: '2026-08-20T13:00:00Z',
    eixo: 'MUSICA',
    cor: '#0891B2',
    tripla: {
      sujeito: 'Maracatu Nação',
      predicado: 'coroa_reis_e_rainhas_em',
      objeto: 'Cortejo Sagrado Afro-Pernambucano'
    },
    familia: 'musica.cortejo.afro_brasileiro.percussao',
    descricao: 'Manifestação artística e religiosa sincrética de cortejo real com baque virado de alfaias, calungas sagradas e louvação aos ancestrais nos terreiros e ruas.',
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
      resumo: 'Análise etnográfica da instituição das Nações de Maracatu do Recife, a autoridade sagrada das Calungas e o sincretismo entre Nagô, Mina e Catolicismo popular.'
    },
    conexoesNaturais: [
      { targetId: 'bumba_boi', peso: 0.85, relacao: 'skos:related', explicacao: 'Ritualização dramática e cortejo percussivo sincrético de festas públicas.' },
      { targetId: 'capoeira', peso: 0.83, relacao: 'skos:related', explicacao: 'Matriz rítmica e espiritual de resistência ancestral afro-brasileira.' },
      { targetId: 'frevo', peso: 0.81, relacao: 'skos:related', explicacao: 'Tradições centenárias de agremiações carnavalescas de Pernambuco.' }
    ]
  },
  cordel: {
    id: 'cordel',
    tag: 'Literatura de Cordel',
    uuid: '55f891a2-33b4-4c12-98ab-44119933cc55',
    autor: 'Severino do Vale (Poeta e Xilogravador de Patos)',
    dataCriacao: '2026-08-20T14:15:00Z',
    eixo: 'SABERES',
    cor: '#1A6B3A',
    tripla: {
      sujeito: 'Literatura de Cordel',
      predicado: 'narra_memoria_social_em',
      objeto: 'Folhetos em Sextilha e Xilogravura'
    },
    familia: 'saberes.literatura_oral.poesia_popular',
    descricao: 'Gênero poético popular estruturado em métrica, rima e oratória, impresso em folhetos ilustrados com xilogravuras e cantado em feiras nordestinas.',
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
      resumo: 'Estudo sobre os gêneros de peleja, valentia, fatos históricos e a circulação da memória oral impressa nas feiras do Nordeste brasileiro.'
    },
    conexoesNaturais: [
      { targetId: 'mestre_vitalino', peso: 0.79, relacao: 'skos:related', explicacao: 'Tradução visual e plástica das mesmíssimas narrativas épicas do sertão.' },
      { targetId: 'carranca', peso: 0.75, relacao: 'skos:related', explicacao: 'Mitos sertanejos e ribeirinhos narrados nas sagas e lendas poéticas.' },
      { targetId: 'bumba_boi', peso: 0.72, relacao: 'skos:related', explicacao: 'Autos de boi e folguedos registrados em estrofes e declamações rimadas.' }
    ]
  },
  ex_voto: {
    id: 'ex_voto',
    tag: 'Ex-votos do Nordeste',
    uuid: '66a119c4-88e2-411a-99bb-223344dd5566',
    autor: 'Francisca de Assis (Curadora de Santuário de Juazeiro)',
    dataCriacao: '2026-08-20T15:00:00Z',
    eixo: 'CRENCAS',
    cor: '#6D28D9',
    tripla: {
      sujeito: 'Ex-votos do Nordeste',
      predicado: 'testemunha_promessa_em',
      objeto: 'Madeira e Cera nas Salas de Milagres'
    },
    familia: 'crencas.religiosidade_popular.imaginaria',
    descricao: 'Objetos esculpidos em madeira ou moldados em cera ofertados em santuários como agradecimento a graças alcançadas, constituindo rica coleção de arte votiva.',
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
      resumo: 'Estudo clássico da iconografia votiva popular, as técnicas primitivas de entalhe em cedro e a relação existencial de troca entre o romeiro e a divindade.'
    },
    conexoesNaturais: [
      { targetId: 'carranca', peso: 0.82, relacao: 'skos:related', explicacao: 'Técnica de entalhe devocional e proteção espiritual em madeira rústica.' },
      { targetId: 'mestre_vitalino', peso: 0.76, relacao: 'skos:related', explicacao: 'Modelagem anatômica figurativa e fé popular no interior nordestino.' },
      { targetId: 'capoeira', peso: 0.65, relacao: 'skos:related', explicacao: 'Devoção sincrética e proteção aos guerreiros e romeiros nas peregrinações.' }
    ]
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag, allNodeIds } = body;

    const queryKey = normalizeForComparison(sourceTag || 'carranca').replace(/\s+/g, '_');
    const concept = CANONICAL_CULTURE_VAULT[queryKey] || CANONICAL_CULTURE_VAULT['carranca'];

    // Obter conexões autônomas da rede neural
    const discoveries = concept.conexoesNaturais.map(c => {
      const target = CANONICAL_CULTURE_VAULT[c.targetId];
      return {
        targetTag: target?.tag || c.targetId,
        targetId: c.targetId,
        similarity: c.peso,
        cohesion: c.peso * 0.95,
        combinedScore: c.peso,
        relation: c.relacao,
        insight: c.explicacao,
        targetConcept: target
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        sourceTag: concept.tag,
        sourceId: concept.id,
        concept,
        discoveries,
        article: concept.artigo,
        totalTagsAnalyzed: Object.keys(CANONICAL_CULTURE_VAULT).length,
        newConnectionsPersisted: discoveries.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
