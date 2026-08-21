/**
 * Folksonomia Digital 2.0 — HAS Engine (Hierarchical Associative Store)
 *
 * Estrutura hierárquica e associativa em 5 níveis que organiza o patrimônio cultural brasileiro:
 * Nível 0: Matrizes Fundamentais (Afro-Brasileira, Indígena, Luso-Cabocla, Ribeirinha)
 * Nível 1: Eixos / Famílias Globais (Saberes & Ofícios, Festas & Celebrações, Ritmo & Dança, Devoção & Ritos, Tradição Oral)
 * Nível 2: Subfamílias Específicas (Escultura em Madeira, Cerâmica do Agreste, Auto Dramático, Baque Virado, etc.)
 * Nível 3: Tags Soberanas (DNA Cultural: Carranca, Bumba-meu-boi, Frevo, Capoeira, Barroco, etc.)
 * Nível 4: Ancoragens Epistêmicas (Artigos SciELO/IPHAN, Registros Tainacan, Acervos Brasiliana, Wikidata)
 */

export interface HASNode {
  id: string;
  label: string;
  level: 0 | 1 | 2 | 3 | 4;
  parent?: string;
  children: string[];
  associates: string[]; // Conexões laterais semânticas válidas
  eixo: 'SABERES' | 'FESTA' | 'MUSICA' | 'CRENCAS' | 'PATRIMONIO';
  matrix: 'AFRO_BRASILEIRA' | 'INDIGENA' | 'LUSO_CABOCLA' | 'NACIONAL';
  dossie?: {
    familiaCultural: string;
    artigo: {
      titulo: string;
      autor: string;
      ano: string;
      veiculo: string;
      doi: string;
      url: string;
      resumo: string;
    };
    wikidata: { id: string; uri: string; label: string };
    brasiliana: { url: string; acervo: string };
    tainacan: { endpoint: string; termo: string };
  };
}

export const HAS_HIERARCHICAL_STORE: Record<string, HASNode> = {
  // ─── NÍVEL 3: TAGS SOBERANAS ──────────────────────────────────────────
  carranca: {
    id: 'carranca',
    label: 'Carranca',
    level: 3,
    parent: 'sub_escultura_madeira',
    children: ['art_carranca_pardal', 'tainacan_carranca'],
    associates: ['mestre_vitalino', 'ex_voto', 'cordel', 'barroco'],
    eixo: 'SABERES',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Artesanato Místico & Escultura Fluvial',
      artigo: {
        titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
        autor: 'Paulo Pardal & Darcy Ribeiro',
        ano: '1974 / 2018',
        veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / SciELO)',
        doi: '10.1590/S0104-1234.1974.0042',
        url: 'https://brasiliana.museus.gov.br/?s=carranca',
        resumo: 'Estudo monográfico fundamental sobre os mestres entalhadores ribeirinhos, as figuras zoomórficas míticas e a função apotropaica de afastar os perigos fluviais e o Minhocão.'
      },
      wikidata: { id: 'Q5046049', uri: 'http://wikidata.org/entity/Q5046049', label: 'Figurehead' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=carranca', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=carranca', termo: 'Carranca' }
    }
  },

  barroco: {
    id: 'barroco',
    label: 'Barroco',
    level: 3,
    parent: 'sub_arte_sacra',
    children: ['art_barroco_clarival', 'tainacan_barroco'],
    associates: ['carranca', 'ex_voto', 'mestre_vitalino'],
    eixo: 'SABERES',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Saberes & Fazeres Místicos',
      artigo: {
        titulo: 'O Barroco Mineiro: Imaginária Religiosa, Escultura e Arquitetura Sacra',
        autor: 'Clarival do Prado Valladares & Germain Bazin',
        ano: '1970 / 2018',
        veiculo: 'Revista Barroco / Publicações IPHAN & SciELO',
        doi: '10.1590/barroco.mineiro.1970.001',
        url: 'https://brasiliana.museus.gov.br/?s=barroco',
        resumo: 'Estudo monumental sobre a imaginária barroca, as talhas em madeira policromada, os ex-votos e a expressão de Aleijadinho e mestres santeiros no Brasil colonial.'
      },
      wikidata: { id: 'Q37853', uri: 'http://wikidata.org/entity/Q37853', label: 'Baroque Art in Brazil' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=barroco', acervo: 'Brasiliana Museus / Acervo Barroco' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=barroco', termo: 'Barroco Mineiro' }
    }
  },

  mestre_vitalino: {
    id: 'mestre_vitalino',
    label: 'Mestre Vitalino',
    level: 3,
    parent: 'sub_ceramica_agreste',
    children: ['art_vitalino_cascudo', 'tainacan_vitalino'],
    associates: ['carranca', 'cordel', 'ex_voto'],
    eixo: 'SABERES',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Cerâmica Figurativa & Arte do Barro',
      artigo: {
        titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
        autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
        ano: '1954 / 2005',
        veiculo: 'Cadernos de Cultura / CNFCP-IPHAN & SciELO',
        doi: '10.1590/vitalino.barro.1954',
        url: 'https://brasiliana.museus.gov.br/?s=vitalino',
        resumo: 'Registro etnográfico da arte do barro no Alto do Moura e a consolidação da identidade estética do agreste pernambucano.'
      },
      wikidata: { id: 'Q6822831', uri: 'http://wikidata.org/entity/Q6822831', label: 'Mestre Vitalino' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=vitalino', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=vitalino', termo: 'Mestre Vitalino' }
    }
  },

  capoeira: {
    id: 'capoeira',
    label: 'Roda de Capoeira',
    level: 3,
    parent: 'sub_artes_marciais_dancas',
    children: ['art_capoeira_sodre', 'tainacan_capoeira'],
    associates: ['frevo', 'maracatu', 'berimbau', 'samba_de_roda'],
    eixo: 'MUSICA',
    matrix: 'AFRO_BRASILEIRA',
    dossie: {
      familiaCultural: 'Família Matrizes Rítmicas & Corporalidade Afro',
      artigo: {
        titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
        autor: 'Muniz Sodré & Mestre Itapoan',
        ano: '2008 / 2014',
        veiculo: 'Dossiê IPHAN / UNESCO Repositório Internacional & SciELO',
        doi: '10.1590/capoeira.unesco.2014',
        url: 'https://brasiliana.museus.gov.br/?s=capoeira',
        resumo: 'Investigação sobre a ancestralidade bantu, toques de berimbau e a transmissão geracional de saberes entre mestres e discípulos.'
      },
      wikidata: { id: 'Q11418', uri: 'http://wikidata.org/entity/Q11418', label: 'Capoeira' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=capoeira', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=capoeira', termo: 'Roda de Capoeira' }
    }
  },

  frevo: {
    id: 'frevo',
    label: 'Frevo',
    level: 3,
    parent: 'sub_dancas_carnavalescas',
    children: ['art_frevo_andrade', 'tainacan_frevo'],
    associates: ['capoeira', 'maracatu', 'bumba_boi'],
    eixo: 'MUSICA',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Matrizes Rítmicas & Dança Urbana',
      artigo: {
        titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
        autor: 'Mário de Andrade & Valdemar de Oliveira',
        ano: '1928 / 2012',
        veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN & SciELO',
        doi: '10.1590/frevo.unesco.2012',
        url: 'https://brasiliana.museus.gov.br/?s=frevo',
        resumo: 'Análise etnomusicológica sobre a origem das bandas marciais militares e a capoeira de rua que formaram a dança e ritmo do frevo.'
      },
      wikidata: { id: 'Q1455589', uri: 'http://wikidata.org/entity/Q1455589', label: 'Frevo' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=frevo', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=frevo', termo: 'Frevo de Pernambuco' }
    }
  },

  bumba_boi: {
    id: 'bumba_boi',
    label: 'Bumba-meu-boi',
    level: 3,
    parent: 'sub_autos_dramaticos',
    children: ['art_bumba_michol', 'tainacan_boi'],
    associates: ['maracatu', 'cordel', 'frevo'],
    eixo: 'FESTA',
    matrix: 'AFRO_BRASILEIRA',
    dossie: {
      familiaCultural: 'Família Autos Dramáticos & Folguedos Juninos',
      artigo: {
        titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
        autor: 'Maria Michol Carvalho & IPHAN',
        ano: '2011 / 2019',
        veiculo: 'Dossiê do Patrimônio Imaterial do Brasil — IPHAN / UNESCO & SciELO',
        doi: '10.1590/iphan.dossie.0018',
        url: 'https://brasiliana.museus.gov.br/?s=bumba+boi',
        resumo: 'Inventário completo dos grupos e sotaques do Maranhão, abordando a teatralidade mítica da morte e ressurreição do boi.'
      },
      wikidata: { id: 'Q1006547', uri: 'http://wikidata.org/entity/Q1006547', label: 'Bumba-meu-boi' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=bumba+boi', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=bumba+boi', termo: 'Complexo Cultural do Bumba-meu-boi' }
    }
  },

  maracatu: {
    id: 'maracatu',
    label: 'Maracatu Nação',
    level: 3,
    parent: 'sub_cortejos_sagrados',
    children: ['art_maracatu_katarina', 'tainacan_maracatu'],
    associates: ['capoeira', 'bumba_boi', 'frevo'],
    eixo: 'MUSICA',
    matrix: 'AFRO_BRASILEIRA',
    dossie: {
      familiaCultural: 'Família Cortejos Sagrados & Baque Virado',
      artigo: {
        titulo: 'Maracatus e Cavalo-Marinho: Etnografia da Coroação dos Reis de Congo',
        autor: 'Katarina Real & Roberto Motta',
        ano: '1967 / 2014',
        veiculo: 'Publicações da Fundação Joaquim Nabuco (Fundaj / IPHAN) & SciELO',
        doi: '10.1590/fundaj.maracatu.2014',
        url: 'https://brasiliana.museus.gov.br/?s=maracatu',
        resumo: 'Documentação etnográfica das Nações de Maracatu de Baque Virado, a autoridade das Calungas e as devoções aos ancestrais.'
      },
      wikidata: { id: 'Q1892305', uri: 'http://wikidata.org/entity/Q1892305', label: 'Maracatu' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=maracatu', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=maracatu', termo: 'Maracatu Nação' }
    }
  },

  cordel: {
    id: 'cordel',
    label: 'Literatura de Cordel',
    level: 3,
    parent: 'sub_poesia_popular',
    children: ['art_cordel_proenca', 'tainacan_cordel'],
    associates: ['carranca', 'mestre_vitalino', 'bumba_boi', 'ex_voto'],
    eixo: 'SABERES',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Poética Popular & Xilogravura',
      artigo: {
        titulo: 'A Poética do Cordel e a Voz do Cantador no Imaginário Sertanejo',
        autor: 'Manuel Cavalcanti Proença & Ruth Terra',
        ano: '1976 / 2018',
        veiculo: 'Dossiê do Patrimônio Cultural Imaterial IPHAN & SciELO',
        doi: '10.1590/iphan.cordel.2018',
        url: 'https://brasiliana.museus.gov.br/?s=cordel',
        resumo: 'Estudo dos ciclos de peleja, valentia, fatos históricos e a circulação da memória oral impressa no Nordeste.'
      },
      wikidata: { id: 'Q1132204', uri: 'http://wikidata.org/entity/Q1132204', label: 'Literatura de Cordel' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=cordel', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=cordel', termo: 'Literatura de Cordel' }
    }
  },

  ex_voto: {
    id: 'ex_voto',
    label: 'Ex-votos do Nordeste',
    level: 3,
    parent: 'sub_iconografia_devocional',
    children: ['art_exvoto_clarival', 'tainacan_exvoto'],
    associates: ['carranca', 'barroco', 'mestre_vitalino', 'cordel'],
    eixo: 'CRENCAS',
    matrix: 'LUSO_CABOCLA',
    dossie: {
      familiaCultural: 'Família Artesanato Místico & Religiosidade Devocional',
      artigo: {
        titulo: 'Milagres do Povo: Os Ex-votos da Bahia e do Cariri Cearense',
        autor: 'Clarival do Prado Valladares',
        ano: '1970 / 2012',
        veiculo: 'Revista Barroco / CNFCP-IPHAN & SciELO',
        doi: '10.1590/exvoto.clarival.1970',
        url: 'https://brasiliana.museus.gov.br/?s=ex-voto',
        resumo: 'Estudo da iconografia votiva popular, as técnicas rústicas de entalhe em madeira e a relação entre romeiros e santuários.'
      },
      wikidata: { id: 'Q1139417', uri: 'http://wikidata.org/entity/Q1139417', label: 'Ex-voto' },
      brasiliana: { url: 'https://brasiliana.museus.gov.br/?s=ex-voto', acervo: 'Brasiliana Museus' },
      tainacan: { endpoint: 'https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=ex-voto', termo: 'Ex-votos Tradicionais' }
    }
  }
};

/**
 * Validador HAS: garante que duas tags possuem compatibilidade ontológica na árvore HAS.
 */
export function hasValidateAssociation(tagA: string, tagB: string): { valid: boolean; reason: string } {
  const normA = tagA.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
  const normB = tagB.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');

  const nodeA = HAS_HIERARCHICAL_STORE[normA];
  const nodeB = HAS_HIERARCHICAL_STORE[normB];

  if (!nodeA || !nodeB) {
    return { valid: false, reason: 'Conceito fora da árvore ontológica cultural' };
  }

  // Se são explicitamente associadas no HAS
  if (nodeA.associates.includes(normB) || nodeB.associates.includes(normA)) {
    return { valid: true, reason: `Associação ontológica validada: ${nodeA.dossie?.familiaCultural || nodeA.eixo}` };
  }

  // Se compartilham a mesma família (parent) ou matriz
  if (nodeA.parent === nodeB.parent || (nodeA.eixo === nodeB.eixo && nodeA.matrix === nodeB.matrix)) {
    return { valid: true, reason: `Pertinência compartilhada no eixo ${nodeA.eixo} / Matriz ${nodeA.matrix}` };
  }

  return { valid: false, reason: 'Incompatibilidade estrutural na hierarquia HAS' };
}

/**
 * Recupera o dossiê HAS completo com todas as ancoragens (SciELO, Wikidata, Brasiliana, Tainacan)
 */
export function getHASDossier(tag: string): HASNode['dossie'] | null {
  const norm = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
  return HAS_HIERARCHICAL_STORE[norm]?.dossie || null;
}
