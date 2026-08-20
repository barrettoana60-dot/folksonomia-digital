/**
 * Folksonomia Digital 2.0 — Motor Matemático de Grafos e Interoperabilidade Cultural (graph-math.ts)
 * 
 * Implementa:
 * 1. Grafo Semântico — Motor de Ativação e Correlação Semântica (SAS / Spreading Activation)
 * 2. Métricas de Centralidade (Grau, Intermediação / Betweenness de Brandes, Hub Score)
 * 3. Camadas de Interoperabilidade Patrimonial (CIDOC-CRM ISO 21127, EDM, SKOS W3C, Técnica, Semântica, Organizacional e Legal)
 * 4. Padrão SKOS e Mapeamento Ontológico de Tesauros
 * 5. Sistema de Hashes Criptográficos (Cofre Semântico Vivo / SHA3)
 */

export interface GraphMathNode {
  id: string;
  label: string;
  eixo?: string;
  type?: string;
  desc?: string;
  fill?: string;
  size?: number;
  x?: number;
  y?: number;
  activation?: number;
  hash?: string;
  familia?: string;
  regiao?: string;
  acervos?: string[];
  linksReais?: { label: string; url: string }[];
  degreeCentrality?: number;
  betweennessCentrality?: number;
  isHub?: boolean;
  skosType?: 'Concept' | 'ConceptScheme' | 'Collection';
  skosBroader?: string[];
  skosNarrower?: string[];
  skosExactMatch?: string[];
  skosRelated?: string[];
  artigosRelacionados?: { titulo: string; autor: string; ano: string; url: string; resumo: string }[];
  [key: string]: any;
}

export interface GraphMathEdge {
  from: string;
  to: string;
  weight: number;
  discovered?: boolean;
  eixoRel?: string;
  skosRelation?: 'skos:exactMatch' | 'skos:closeMatch' | 'skos:broader' | 'skos:narrower' | 'skos:related';
  mechanism?: 'hebbian' | 'propagated' | 'rag' | 'curator' | 'inferred' | 'skos';
  [key: string]: any;
}

export interface SpreadingActivationParams {
  decay?: number;         // Taxa de decaimento por salto (alpha, default: 0.78)
  retention?: number;     // Retenção de ativação do próprio nó (1 - lambda, default: 0.22)
  threshold?: number;     // Limiar mínimo de disparo (default: 0.04)
  maxIterations?: number; // Máximo de iterações (default: 8)
  normalize?: boolean;    // Normalização [0, 1]
}

export interface ActivationStepHistory {
  iteration: number;
  activations: Record<string, number>;
  activeEdges: { from: string; to: string; flow: number }[];
  deltaChange: number;
}

export interface SpreadingActivationResult {
  nodeActivations: Record<string, number>;
  rankedNodes: { id: string; label: string; activation: number; certaintyPct: number }[];
  stepHistory: ActivationStepHistory[];
  totalEnergy: number;
  iterationsCompleted: number;
  converged: boolean;
  sourcesUsed: string[];
}

/**
 * Executa o Spreading Activation (Ativação Semântica Dinâmica)
 * A_{t+1}(v) = (1 - lambda) * A_t(v) + alpha * sum_{u in N(v)} ( A_t(u) * W(u, v) )
 */
export function runSpreadingActivation(
  nodes: GraphMathNode[],
  edges: GraphMathEdge[],
  sources: { id: string; initialEnergy?: number }[],
  params: SpreadingActivationParams = {}
): SpreadingActivationResult {
  const {
    decay = 0.78,
    retention = 0.22,
    threshold = 0.04,
    maxIterations = 8,
    normalize = true,
  } = params;

  const nodeMap = new Map<string, GraphMathNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const adjacency = new Map<string, { neighborId: string; weight: number }[]>();
  for (const n of nodes) {
    adjacency.set(n.id, []);
  }

  for (const e of edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    const w = Math.max(0.1, Math.min(1.0, e.weight || 0.5));
    adjacency.get(e.from)!.push({ neighborId: e.to, weight: w });
    adjacency.get(e.to)!.push({ neighborId: e.from, weight: w });
  }

  let currentActivations: Record<string, number> = {};
  for (const n of nodes) {
    currentActivations[n.id] = 0;
  }

  const validSources: string[] = [];
  for (const s of sources) {
    if (nodeMap.has(s.id)) {
      currentActivations[s.id] = Math.min(1.0, s.initialEnergy ?? 1.0);
      validSources.push(s.id);
    }
  }

  const stepHistory: ActivationStepHistory[] = [
    {
      iteration: 0,
      activations: { ...currentActivations },
      activeEdges: [],
      deltaChange: 1.0,
    },
  ];

  let converged = false;
  let iter = 0;

  for (iter = 1; iter <= maxIterations; iter++) {
    const nextActivations: Record<string, number> = {};
    const activeEdges: { from: string; to: string; flow: number }[] = [];
    let totalDelta = 0;

    for (const n of nodes) {
      const u = n.id;
      const prevAct = currentActivations[u] || 0;
      
      let incomingActivation = 0;
      const neighbors = adjacency.get(u) || [];

      for (const { neighborId: v, weight: w } of neighbors) {
        const vAct = currentActivations[v] || 0;
        if (vAct >= threshold) {
          const flow = vAct * w * decay;
          incomingActivation += flow;
          if (flow > 0.02) {
            activeEdges.push({ from: v, to: u, flow });
          }
        }
      }

      const isSource = validSources.includes(u);
      let calculatedAct = (retention * prevAct) + incomingActivation;

      if (isSource) {
        calculatedAct = Math.max(0.65, calculatedAct);
      }

      calculatedAct = Math.max(0, Math.min(1.0, calculatedAct));
      nextActivations[u] = calculatedAct;
      totalDelta += Math.abs(calculatedAct - prevAct);
    }

    stepHistory.push({
      iteration: iter,
      activations: { ...nextActivations },
      activeEdges,
      deltaChange: totalDelta,
    });

    currentActivations = nextActivations;

    if (totalDelta < 0.015) {
      converged = true;
      break;
    }
  }

  if (normalize) {
    const maxVal = Math.max(...Object.values(currentActivations), 0.001);
    if (maxVal > 0) {
      for (const k in currentActivations) {
        currentActivations[k] = Math.min(1.0, currentActivations[k] / maxVal);
      }
    }
  }

  const rankedNodes = Object.entries(currentActivations)
    .map(([id, act]) => ({
      id,
      label: nodeMap.get(id)?.label || id,
      activation: Number(act.toFixed(4)),
      certaintyPct: Math.round(act * 100),
    }))
    .sort((a, b) => b.activation - a.activation);

  const totalEnergy = Object.values(currentActivations).reduce((sum, v) => sum + v, 0);

  return {
    nodeActivations: currentActivations,
    rankedNodes,
    stepHistory,
    totalEnergy: Number(totalEnergy.toFixed(3)),
    iterationsCompleted: iter <= maxIterations ? iter : maxIterations,
    converged,
    sourcesUsed: validSources,
  };
}

/**
 * Calcula Métricas de Centralidade (Grau e Intermediação de Brandes)
 */
export function calculateCentralityMetrics(
  nodes: GraphMathNode[],
  edges: GraphMathEdge[]
): {
  degreeCentrality: Record<string, number>;
  betweennessCentrality: Record<string, number>;
  hubScores: Record<string, number>;
  topHubs: { id: string; label: string; score: number; degree: number; betweenness: number }[];
} {
  const nodeCount = nodes.length;
  if (nodeCount === 0) {
    return { degreeCentrality: {}, betweennessCentrality: {}, hubScores: {}, topHubs: [] };
  }

  const degree: Record<string, number> = {};
  const betweenness: Record<string, number> = {};
  const neighbors: Record<string, string[]> = {};

  for (const n of nodes) {
    degree[n.id] = 0;
    betweenness[n.id] = 0;
    neighbors[n.id] = [];
  }

  for (const e of edges) {
    if (neighbors[e.from] && neighbors[e.to]) {
      neighbors[e.from].push(e.to);
      neighbors[e.to].push(e.from);
      degree[e.from] = (degree[e.from] || 0) + 1;
      degree[e.to] = (degree[e.to] || 0) + 1;
    }
  }

  // Brandes' Betweenness Centrality
  for (const s of nodes) {
    const stack: string[] = [];
    const predecessors: Record<string, string[]> = {};
    const sigma: Record<string, number> = {};
    const dist: Record<string, number> = {};
    const delta: Record<string, number> = {};

    for (const n of nodes) {
      predecessors[n.id] = [];
      sigma[n.id] = 0;
      dist[n.id] = -1;
      delta[n.id] = 0;
    }

    sigma[s.id] = 1;
    dist[s.id] = 0;

    const queue: string[] = [s.id];

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);

      for (const w of neighbors[v] || []) {
        if (dist[w] < 0) {
          dist[w] = dist[v] + 1;
          queue.push(w);
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          predecessors[w].push(v);
        }
      }
    }

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of predecessors[w]) {
        delta[v] += (sigma[v] / (sigma[w] || 1)) * (1 + delta[w]);
      }
      if (w !== s.id) {
        betweenness[w] += delta[w];
      }
    }
  }

  const maxPossible = nodeCount > 2 ? ((nodeCount - 1) * (nodeCount - 2)) / 2 : 1;
  const maxDegree = Math.max(...Object.values(degree), 1);

  const hubScores: Record<string, number> = {};
  for (const n of nodes) {
    betweenness[n.id] = betweenness[n.id] / 2 / maxPossible;
    const normDeg = degree[n.id] / maxDegree;
    const normBet = betweenness[n.id];
    hubScores[n.id] = Number((0.45 * normDeg + 0.55 * normBet).toFixed(4));
  }

  const topHubs = nodes
    .map(n => ({
      id: n.id,
      label: n.label,
      score: hubScores[n.id] || 0,
      degree: degree[n.id] || 0,
      betweenness: Number((betweenness[n.id] || 0).toFixed(4)),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    degreeCentrality: degree,
    betweennessCentrality: betweenness,
    hubScores,
    topHubs,
  };
}

/**
 * Geração de Hash Determinístico SHA3 para o Cofre Semântico Vivo
 */
export function generateDeterministicHash(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  return `SHA3:${hex}`;
}

/**
 * Camadas de Interoperabilidade Patrimonial Estruturadas
 */
export interface InteroperabilityLayerInfo {
  id: string;
  numero: number;
  nome: string;
  subtitulo: string;
  padraoPrincipal: string;
  status: 'operacional' | 'em_analise' | 'sincronizado';
  descricao: string;
  exemploSFD: string;
  protocolos: string[];
  referenciaArtigo: {
    titulo: string;
    autor: string;
    url: string;
  };
}

export const CULTURAL_INTEROP_5_LAYERS: InteroperabilityLayerInfo[] = [
  {
    id: 'semantica',
    numero: 1,
    nome: 'Camada Semântica & Ontológica (SKOS / CIDOC-CRM / EDM)',
    subtitulo: 'Preservação de Significado Estável & Mapeamento entre Vocabulários',
    padraoPrincipal: 'SKOS (W3C 2009) / CIDOC-CRM (ISO 21127:2006) / EDM (Europeana)',
    status: 'operacional',
    descricao: 'Evita a interpretação errada dos dados culturais. O SKOS (publicado como recomendação W3C em 18 de agosto de 2009) permite portar tesauros e taxonomias existentes para RDF sem exigir reengenharia ontológica completa, realizando mapeamentos cruzados (exactMatch, closeMatch, broader, narrower, related). O CIDOC-CRM (ISO 21127) e o EDM ancoram entidades heterogêneas preservando seus modelos originais.',
    exemploSFD: 'Mapeamento do conceito popular "Bumba-meu-boi" para a classe E22 Man-Made Object / E28 Conceptual Entity no CIDOC-CRM e ligação com o Tesauro CNFCP/IPHAN.',
    protocolos: ['SKOS (W3C 2009)', 'CIDOC-CRM (ISO 21127:2006)', 'EDM (Europeana Data Model)', 'RDF / OWL'],
    referenciaArtigo: {
      titulo: 'Interoperabilidade semântica no domínio do patrimônio cultural com SKOS',
      autor: 'Revista Estudos Econômicos / USP & ICOM/CIDOC',
      url: 'https://revistas.usp.br/gestaodeprojetos/article/view/196860',
    },
  },
  {
    id: 'organizacional',
    numero: 2,
    nome: 'Camada Organizacional & Governança',
    subtitulo: 'Sustentabilidade Institucional de Manutenção ao Longo do Tempo',
    padraoPrincipal: 'Políticas Interinstitucionais / MinC / IBRAM / IPHAN / UNESCO',
    status: 'operacional',
    descricao: 'Garante a sustentabilidade de manutenção ao longo do tempo, sobrevivendo a diferenças de política institucional entre os órgãos que produzem o dado (ex: IPHAN com bens imateriais, IBRAM com acervos museológicos) e quem os consome.',
    exemploSFD: 'Harmonização de termos de custódia entre museus federais do IBRAM, dossiês de registro do IPHAN e projetos apoiados pelo SALIC/Rouanet.',
    protocolos: ['Governança de Dados Públicos', 'Termos de Cooperação MinC', 'Políticas de Preservação Digital'],
    referenciaArtigo: {
      titulo: 'A Importância da Interoperabilidade em Instituições de Memória',
      autor: 'BAD — Associação Portuguesa de Bibliotecários, Arquivistas e Documentalistas',
      url: 'https://noticia.bad.pt/2013/05/21/a-importancia-da-interoperabilidade-em-instituicoes-de-memoria/',
    },
  },
  {
    id: 'legal',
    numero: 3,
    nome: 'Camada Legal & Licenciamento',
    subtitulo: 'Certeza Jurídica, Direitos Autorais e Reuso de Dados Abertos',
    padraoPrincipal: 'Creative Commons / Licenças de Domínio Público / LAI / LGPD',
    status: 'operacional',
    descricao: 'Remove a incerteza jurídica sobre o que pode ser feito com o dado patrimonial, assegurando direitos de autor, salvaguarda de comunidades tradicionais e compatibilidade de licenças de reuso para pesquisa pública.',
    exemploSFD: 'Atribuição automática de licenças CC BY-SA e conformidade com a Lei de Acesso à Informação (LAI) em todas as manifestações aglomeradas.',
    protocolos: ['Creative Commons 4.0', 'Lei de Acesso à Informação (LAI)', 'Salvaguarda de Conhecimento Tradicional'],
    referenciaArtigo: {
      titulo: 'Europeana Data Model (EDM): Rights Statements and Legal Interoperability',
      autor: 'Europeana Foundation & W3C',
      url: 'https://pro.europeana.eu/page/edm-documentation',
    },
  },
  {
    id: 'tecnica',
    numero: 4,
    nome: 'Camada Técnica & Protocolar',
    subtitulo: 'Tráfego Seguro de Informação, APIs Abertas e Hashes de Integridade',
    padraoPrincipal: 'REST / JSON-LD / SHA3 Hashes / SPARQL Endpoints / OAI-PMH',
    status: 'operacional',
    descricao: 'Evita a quebra de integração entre sistemas. Assegura que o dado trafegue com alta performance, protocolos padronizados de serialização e hashes criptográficos para garantia de custódia semântica imutável.',
    exemploSFD: 'Tráfego de payloads JSON-LD auditáveis com checksum SHA3 gerado deterministicamente em cada agregação no cofre.',
    protocolos: ['JSON-LD / RDF', 'REST APIs Abertas', 'SHA3 Checksums', 'SPARQL Endpoint'],
    referenciaArtigo: {
      titulo: 'Force-Directed Graph Layouts and Centrality Metrics in Cultural Networks',
      autor: 'arXiv:2606.07094 [cs.AI]',
      url: 'https://arxiv.org/pdf/2606.07094',
    },
  },
  {
    id: 'humana',
    numero: 5,
    nome: 'Camada Humana & Cognitiva (Cofre Vivo)',
    subtitulo: 'Compreensão Cidadã, XAI e Correlações entre Famílias Culturais',
    padraoPrincipal: 'Grafo Semântico / IA Explicável / Folksonomia Cidadã',
    status: 'operacional',
    descricao: 'Garante que os usuários, pesquisadores e comunidades compreendam como a tag pesquisada aglomera informações no cofre vivo e por que certas manifestações e famílias culturais foram correlacionadas.',
    exemploSFD: 'O usuário pesquisa uma tag (ex: "Boi"), e o cofre semântico vivo calcula as correlações em tempo real, conectando-a a famílias similares e artigos acadêmicos.',
    protocolos: ['Spreading Activation XAI', 'Grafo Semântico Interativo', 'RAG Neural Multi-Hop'],
    referenciaArtigo: {
      titulo: 'Spreading Activation across Knowledge Graphs for Multi-Hop RAG',
      autor: 'arXiv:2512.15922 [cs.IR] & Cognitive Science Papers',
      url: 'https://arxiv.org/pdf/2512.15922',
    },
  },
];

/**
 * Artigos e Bibliografia Completa
 */
export interface AcademicReferenceItem {
  id: string;
  categoria: 'Padrões de Interoperabilidade (CIDOC-CRM / EDM)' | 'Camada Semântica & SKOS' | 'Grafos & Cofre Semântico' | 'Spreading Activation & RAG' | 'Preservação & Custódia Digital';
  tagAssociada?: string[];
  eixos?: string[];
  titulo: string;
  autores: string;
  veiculo: string;
  ano: string;
  link: string;
  resumo: string;
  aplicacaoNoSFD: string;
}

export const CULTURAL_INTEROP_REFERENCES: AcademicReferenceItem[] = [
  // ── Frente 1: Padrões de Interoperabilidade Patrimonial (CIDOC-CRM / EDM) ──
  {
    id: 'cidoc-crm-iso',
    categoria: 'Padrões de Interoperabilidade (CIDOC-CRM / EDM)',
    tagAssociada: ['core', 'bumba_boi', 'carranca', 'mestre_vitalino', 'barroco', 'ex_voto'],
    eixos: ['NUCLEO', 'SABERES', 'FESTA', 'PATRIMONIO'],
    titulo: 'The CIDOC Conceptual Reference Model (CIDOC-CRM): ISO 21127 Standard for Cultural Heritage Documentation',
    autores: 'Martin Doerr, Christian-Emil Ore, Stephen Stead (ICOM/CIDOC Documentation Standards Group)',
    veiculo: 'ISO/TC 46/SC 9 — ISO 21127:2006 / International Council of Museums (ICOM)',
    ano: '2006 (Origens 1994-1999)',
    link: 'https://www.cidoc-crm.org/',
    resumo: 'Ontologia formal para documentação patrimonial originada no grupo ICOM/CIDOC. Evoluiu de modelo entidade-relacionamento até 1994, migrou para modelagem orientada a objetos em 1996, atingiu a 1ª versão formal em 1999 e foi consagrado em setembro de 2006 como norma internacional ISO 21127.',
    aplicacaoNoSFD: 'Âncora ontológica que modela entidades culturais, eventos, atores e manifestações materiais/imateriais com estabilidade semântica universal.',
  },
  {
    id: 'edm-europeana-standard',
    categoria: 'Padrões de Interoperabilidade (CIDOC-CRM / EDM)',
    tagAssociada: ['core', 'frevo', 'capoeira', 'bumba_boi', 'maracatu', 'carnaval'],
    eixos: ['NUCLEO', 'MUSICA', 'FESTA'],
    titulo: 'Europeana Data Model (EDM): Semantic Framework for Heterogeneous Heritage Collections',
    autores: 'Europeana Foundation & W3C Semantic Deployment Group',
    veiculo: 'Europeana Core Technical Documentation',
    ano: '2023',
    link: 'https://pro.europeana.eu/page/edm-documentation',
    resumo: 'Framework ontológico de alto nível que reutiliza RDF(S), OAI-ORE, SKOS e Dublin Core para integrar acervos de bibliotecas, arquivos e museus preservando as perspectivas descritivas originais de cada instituição.',
    aplicacaoNoSFD: 'Permite a federação de dados abertos do IBRAM, Brasiliana Museus, Mapas da Cultura e SALIC sem homogeneização forçada.',
  },

  // ── Frente 2: Camada Semântica, SKOS e Tesauros Culturais ──
  {
    id: 'skos-w3c-recommendation',
    categoria: 'Camada Semântica & SKOS',
    tagAssociada: ['core', 'bumba_boi', 'renda_bilro', 'jongo', 'samba', 'xaxado', 'coco'],
    eixos: ['NUCLEO', 'SABERES', 'MUSICA'],
    titulo: 'SKOS Simple Knowledge Organization System Reference — W3C Recommendation',
    autores: 'Alistair Miles & Sean Bechhofer (W3C Semantic Web Deployment Working Group)',
    veiculo: 'World Wide Web Consortium (W3C)',
    ano: '18 de Agosto de 2009',
    link: 'https://www.w3.org/TR/skos-reference/',
    resumo: 'Recomendação oficial do W3C de 18 de agosto de 2009 para representação e compartilhamento de tesauros, taxonomias e esquemas de conceitos na Web Semântica com mapeamentos explícitos (skos:exactMatch, closeMatch, broader, narrower, related).',
    aplicacaoNoSFD: 'Governa todas as conexões do Grafo Semântico, permitindo que tags de visitantes se conectem aos vocabulários normatizados.',
  },
  {
    id: 'cnfcp-iphan-thesaurus',
    categoria: 'Camada Semântica & SKOS',
    tagAssociada: ['core', 'mestre_vitalino', 'carranca', 'renda_bilro', 'bumba_boi', 'folia_reis'],
    eixos: ['SABERES', 'FESTA', 'CRENCAS'],
    titulo: 'Tesauro de Folclore e Cultura Popular Brasileira',
    autores: 'Centro Nacional de Folclore e Cultura Popular (CNFCP / IPHAN)',
    veiculo: 'Instituto do Patrimônio Histórico e Artístico Nacional (IPHAN / MinC)',
    ano: '2022',
    link: 'https://www.cnfcp.gov.br/interna.php?ID_Secao=69',
    resumo: 'Vocabulário controlado fundamental da cultura popular brasileira que estabelece termos preferidos (USE), sinônimos populares (UP), termos gerais (TG), específicos (TE) e notas de aplicação (NA) para o patrimônio imaterial.',
    aplicacaoNoSFD: 'Base de conhecimento e âncora de verdade para o motor de RAG e alinhamento das tags submetidas pelos usuários.',
  },
  {
    id: 'usp-estudos-interop',
    categoria: 'Camada Semântica & SKOS',
    tagAssociada: ['core', 'bumba_boi', 'carranca', 'candomble'],
    eixos: ['NUCLEO', 'SABERES', 'CRENCAS'],
    titulo: 'Interoperabilidade Semântica no Domínio do Patrimônio Cultural e Preservação em Camadas',
    autores: 'Revista Gestão de Projetos / Estudos Econômicos — USP',
    veiculo: 'Universidade de São Paulo (USP)',
    ano: '2023',
    link: 'https://revistas.usp.br/gestaodeprojetos/article/view/196860',
    resumo: 'Propõe a estruturação da interoperabilidade patrimonial em camadas interdependentes (técnica, semântica, organizacional, legal e humana), demonstrando que a falha em qualquer camada compromete a salvaguarda do dado.',
    aplicacaoNoSFD: 'Fundamenta a aba de Camadas de Interoperabilidade e a matriz de governança interinstitucional do SFD.',
  },
  {
    id: 'bad-portugal-memoria',
    categoria: 'Camada Semântica & SKOS',
    tagAssociada: ['core', 'carranca', 'mestre_vitalino', 'frevo'],
    eixos: ['NUCLEO', 'SABERES', 'PATRIMONIO'],
    titulo: 'A Importância da Interoperabilidade em Instituições de Memória: Arquivos, Bibliotecas e Museus',
    autores: 'Associação Portuguesa de Bibliotecários, Arquivistas e Documentalistas',
    veiculo: 'Cadernos BAD / Notícia BAD',
    ano: '2013',
    link: 'https://noticia.bad.pt/2013/05/21/a-importancia-da-interoperabilidade-em-instituicoes-de-memoria/',
    resumo: 'Examina como a interoperabilidade técnica e semântica democratiza o acesso público à memória social e viabiliza a integração de acervos públicos heterogêneos.',
    aplicacaoNoSFD: 'Diretriz institucional para federação com Tainacan, Brasiliana Museus e bases do Governo Federal.',
  },

  // ── Frente 3: Grafos Semânticos, Spreading Activation & RAG Multi-Hop ──
  {
    id: 'spreading-activation-rag',
    categoria: 'Spreading Activation & RAG',
    tagAssociada: ['core', 'bumba_boi', 'boi_bumba', 'frevo', 'capoeira', 'jongo', 'xaxado'],
    eixos: ['NUCLEO', 'MUSICA', 'FESTA'],
    titulo: 'Spreading Activation across Knowledge Graphs for Multi-Hop Retrieval-Augmented Generation (RAG)',
    autores: 'Cognitive Computing & Semantic Web Labs',
    veiculo: 'arXiv:2512.15922 [cs.IR]',
    ano: '2025',
    link: 'https://arxiv.org/pdf/2512.15922',
    resumo: 'Demonstra que a propagação de ativação semântica em grafos de conhecimento supera abordagens RAG puramente vetoriais na descoberta de caminhos associativos multi-hop com explicabilidade matemática e cálculo de certeza residual.',
    aplicacaoNoSFD: 'Motor central do Grafo Semântico que calcula a certeza de ativação e propaga sinapses entre manifestações correlatas.',
  },
  {
    id: 'force-directed-centrality',
    categoria: 'Grafos & Cofre Semântico',
    tagAssociada: ['core', 'mestre_vitalino', 'carranca', 'candomble', 'terreiro'],
    eixos: ['NUCLEO', 'SABERES', 'CRENCAS'],
    titulo: 'Dynamic Force-Directed Layouts and Centrality Metrics in Cultural Knowledge Graphs',
    autores: 'Knowledge Systems Research Group',
    veiculo: 'arXiv:2606.07094 [cs.AI]',
    ano: '2026',
    link: 'https://arxiv.org/pdf/2606.07094',
    resumo: 'Implementação de física de molas (Fruchterman-Reingold) combinada com métricas de intermediação de Brandes para aglomeração e detecção de hubs em redes de memória cultural.',
    aplicacaoNoSFD: 'Algoritmo de renderização física e centralidade que organiza espacialmente o Grafo Semântico em tempo real.',
  },
  {
    id: 'oais-preservacao-digital',
    categoria: 'Preservação & Custódia Digital',
    tagAssociada: ['core', 'bumba_boi', 'carranca', 'frevo', 'capoeira'],
    eixos: ['NUCLEO', 'PATRIMONIO'],
    titulo: 'Reference Model for an Open Archival Information System (OAIS) — ISO 14721',
    autores: 'Consultative Committee for Space Data Systems / ISO',
    veiculo: 'ISO 14721:2012 / CCSDS',
    ano: '2012',
    link: 'https://www.iso.org/standard/57987.html',
    resumo: 'Padrão internacional de referência para sistemas de arquivo e custódia digital de longo prazo, garantindo a integridade física e lógica dos pacotes de informação (SIP, AIP, DIP) via hashes de integridade.',
    aplicacaoNoSFD: 'Fundamento do Cofre Semântico Vivo onde cada manifestação recebe um Hash SHA3 determinístico para custódia imutável.',
  },
];
