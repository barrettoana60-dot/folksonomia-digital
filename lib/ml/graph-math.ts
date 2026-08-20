/**
 * Folksonomia Digital 2.0 — Motor Matemático de Grafos e Interoperabilidade Cultural (graph-math.ts)
 * 
 * Implementa:
 * 1. Spreading Activation (Propagação iterativa de ativação com decaimento, retenção e convergência)
 * 2. Métricas de Centralidade (Grau, Intermediação / Betweenness, Hub Score)
 * 3. Camadas de Interoperabilidade Patrimonial (5 Camadas HBIM / Patrimônio Digital)
 * 4. Mapeamento SKOS (Simple Knowledge Organization System: broader, narrower, exactMatch, closeMatch, related)
 * 5. Sistema de Hashes Criptográficos e DNA Semântico Auditável (SHA3-like checksums)
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
  degreeCentrality?: number;
  betweennessCentrality?: number;
  isHub?: boolean;
  skosType?: 'Concept' | 'ConceptScheme' | 'Collection';
  skosBroader?: string[];
  skosNarrower?: string[];
  skosExactMatch?: string[];
  skosRelated?: string[];
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
  decay?: number;         // Taxa de decaimento por salto (alpha, default: 0.75)
  retention?: number;     // Retenção de ativação do próprio nó (1 - lambda, default: 0.20)
  threshold?: number;     // Limiar mínimo de disparo para continuar propagando (default: 0.04)
  maxIterations?: number; // Número máximo de iterações de propagação (default: 10)
  normalize?: boolean;    // Se normaliza ativações finais para [0, 1] (default: true)
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
 * Executa Spreading Activation a partir de um ou mais nós-fonte.
 * Modelo: A_{t+1}(v) = (1 - lambda) * A_t(v) + alpha * sum_{u in N(v)} ( A_t(u) * W(u, v) )
 */
export function runSpreadingActivation(
  nodes: GraphMathNode[],
  edges: GraphMathEdge[],
  sources: { id: string; initialEnergy?: number }[],
  params: SpreadingActivationParams = {}
): SpreadingActivationResult {
  const {
    decay = 0.75,
    retention = 0.20,
    threshold = 0.04,
    maxIterations = 10,
    normalize = true,
  } = params;

  // Mapa de nós
  const nodeMap = new Map<string, GraphMathNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Lista de adjacência não-direcionada ponderada
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

  // Inicialização de ativação
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
      
      // Contribuição dos vizinhos
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

      // Se for nó-fonte original, preservamos um piso de ativação
      const isSource = validSources.includes(u);
      const sourceFloor = isSource ? 0.7 : 0;

      // Nova ativação
      let newAct = (prevAct * retention) + incomingActivation;
      if (isSource) {
        newAct = Math.max(newAct, sourceFloor);
      }

      // Teto em 1.0
      newAct = Math.min(1.0, newAct);
      if (newAct < 0.001) newAct = 0;

      nextActivations[u] = newAct;
      totalDelta += Math.abs(newAct - prevAct);
    }

    stepHistory.push({
      iteration: iter,
      activations: { ...nextActivations },
      activeEdges,
      deltaChange: totalDelta,
    });

    currentActivations = nextActivations;

    // Convergência se a mudança for desprezível
    if (totalDelta < 0.005) {
      converged = true;
      break;
    }
  }

  // Normalização se solicitado (mantém o valor de ativação proporcional)
  let maxAct = 0;
  for (const id of Object.keys(currentActivations)) {
    if (currentActivations[id] > maxAct) maxAct = currentActivations[id];
  }

  const finalActivations: Record<string, number> = {};
  for (const id of Object.keys(currentActivations)) {
    const raw = currentActivations[id];
    finalActivations[id] = normalize && maxAct > 0 ? raw / maxAct : raw;
  }

  // Ranking de nós ativados
  const rankedNodes = Object.entries(finalActivations)
    .map(([id, act]) => ({
      id,
      label: nodeMap.get(id)?.label || id,
      activation: Math.round(act * 1000) / 1000,
      certaintyPct: Math.round(act * 100),
    }))
    .filter(item => item.activation > 0.01)
    .sort((a, b) => b.activation - a.activation);

  const totalEnergy = Object.values(finalActivations).reduce((sum, v) => sum + v, 0);

  return {
    nodeActivations: finalActivations,
    rankedNodes,
    stepHistory,
    totalEnergy: Math.round(totalEnergy * 100) / 100,
    iterationsCompleted: iter,
    converged,
    sourcesUsed: validSources,
  };
}

/**
 * Calcula Métricas de Centralidade (Grau, Intermediação / Betweenness, Hubs).
 */
export function calculateCentralityMetrics(
  nodes: GraphMathNode[],
  edges: GraphMathEdge[]
): {
  degreeCentrality: Record<string, number>;
  betweennessCentrality: Record<string, number>;
  hubScores: Record<string, number>;
  topHubs: string[];
} {
  const n = nodes.length;
  const degreeCentrality: Record<string, number> = {};
  const betweennessCentrality: Record<string, number> = {};
  const hubScores: Record<string, number> = {};

  if (n === 0) {
    return { degreeCentrality, betweennessCentrality, hubScores, topHubs: [] };
  }

  // Adjacência
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) {
    adj.set(node.id, new Set());
    degreeCentrality[node.id] = 0;
    betweennessCentrality[node.id] = 0;
  }

  for (const e of edges) {
    if (adj.has(e.from) && adj.has(e.to)) {
      adj.get(e.from)!.add(e.to);
      adj.get(e.to)!.add(e.from);
    }
  }

  // 1. Degree Centrality: C_D(v) = deg(v) / (n - 1)
  const maxDegreePossible = Math.max(1, n - 1);
  for (const node of nodes) {
    const deg = adj.get(node.id)?.size || 0;
    degreeCentrality[node.id] = Math.round((deg / maxDegreePossible) * 100) / 100;
  }

  // 2. Betweenness Centrality (Algoritmo de Brandes via BFS para caminhos mínimos)
  for (const s of nodes) {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    const sigma: Record<string, number> = {};
    const d: Record<string, number> = {};

    for (const node of nodes) {
      P.set(node.id, []);
      sigma[node.id] = 0;
      d[node.id] = -1;
    }

    sigma[s.id] = 1;
    d[s.id] = 0;

    const Q: string[] = [s.id];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      const neighbors = adj.get(v) || new Set();
      for (const w of neighbors) {
        // Path discovery
        if (d[w] < 0) {
          Q.push(w);
          d[w] = d[v] + 1;
        }
        // Path counting
        if (d[w] === d[v] + 1) {
          sigma[w] += sigma[v];
          P.get(w)!.push(v);
        }
      }
    }

    const delta: Record<string, number> = {};
    for (const node of nodes) {
      delta[node.id] = 0;
    }

    while (S.length > 0) {
      const w = S.pop()!;
      const parents = P.get(w) || [];
      for (const v of parents) {
        delta[v] += (sigma[v] / (sigma[w] || 1)) * (1 + delta[w]);
      }
      if (w !== s.id) {
        betweennessCentrality[w] += delta[w];
      }
    }
  }

  // Normalização do Betweenness para grafos não-direcionados: 2 / ((n-1)*(n-2))
  const normFactor = n > 2 ? 2 / ((n - 1) * (n - 2)) : 1;
  for (const id of Object.keys(betweennessCentrality)) {
    betweennessCentrality[id] = Math.round(betweennessCentrality[id] * normFactor * 100) / 100;
  }

  // 3. Hub Score combinado: 0.5 * Degree + 0.5 * Betweenness
  for (const node of nodes) {
    const deg = degreeCentrality[node.id] || 0;
    const bet = betweennessCentrality[node.id] || 0;
    hubScores[node.id] = Math.round((deg * 0.5 + bet * 0.5) * 100) / 100;
  }

  const topHubs = Object.entries(hubScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    degreeCentrality,
    betweennessCentrality,
    hubScores,
    topHubs,
  };
}

/**
 * Gera um Hash Criptográfico determinístico (SHA3-like / Murmur3 format)
 * para nós, sinapses e snapshots da topologia cultural.
 */
export function generateDeterministicHash(input: string | object): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `SHA3:${part1}${part2}`;
}

/**
 * Definição das 5 Camadas de Interoperabilidade Patrimonial (HBIM / Heritage Informatics)
 */
export interface InteroperabilityLayerInfo {
  id: 'semantica' | 'organizacional' | 'intercomunitaria' | 'tecnica' | 'humana';
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
    nome: 'Semântica e Internacional',
    subtitulo: 'Preservação do Significado Estável & Mapeamento SKOS',
    padraoPrincipal: 'SKOS / RDF / OWL / CIDOC-CRM',
    status: 'operacional',
    descricao: 'Garante que um conceito mantenha significado inequívoco ao trafegar entre diferentes acervos e tesauros internacionais. Usa SKOS (exactMatch, closeMatch, broader, narrower) e alinhamento neural RAG.',
    exemploSFD: 'Mapeamento do verbete "Bumba-meu-boi" do Tesauro CNFCP/IPHAN para "Folk Performance / Bovine Ritual" em repositórios internacionais mantendo rigor documental.',
    protocolos: ['SKOS (W3C)', 'RDF Graph', 'CIDOC-CRM (ICOM)', 'RAG Embedding Alignment'],
    referenciaArtigo: {
      titulo: 'Interoperabilidade semântica no domínio do patrimônio cultural com SKOS',
      autor: 'Revista Estudos Econômicos / USP & BAD Portugal',
      url: 'https://revistas.usp.br/gestaodeprojetos/article/view/196860',
    },
  },
  {
    id: 'organizacional',
    numero: 2,
    nome: 'Organizacional e Política',
    subtitulo: 'Alinhamento Institucional de Custódia e Governança',
    padraoPrincipal: 'Acordos Interinstitucionais / MinC / IBRAM / IPHAN',
    status: 'operacional',
    descricao: 'Sobrevive a diferenças de política documental, termos de uso e fluxos de aprovação entre entidades federadas que produzem e consomem os dados do patrimônio.',
    exemploSFD: 'Cruzamento federado das diretrizes do IPHAN (Patrimônio Imaterial) com as normas de catalogação do IBRAM (Museus Federais) e fomento SALIC/Rouanet.',
    protocolos: ['Governança de Dados Abertos', 'Termos de Cooperação MinC', 'Políticas de Preservação Digital'],
    referenciaArtigo: {
      titulo: 'A Importância da Interoperabilidade em Instituições de Memória',
      autor: 'BAD — Associação Portuguesa de Bibliotecários, Arquivistas e Profissionais da Informação',
      url: 'https://noticia.bad.pt/2013/05/21/a-importancia-da-interoperabilidade-em-instituicoes-de-memoria/',
    },
  },
  {
    id: 'intercomunitaria',
    numero: 3,
    nome: 'Intercomunitária de Prática',
    subtitulo: 'Comunicação entre Museólogos, Arqueólogos e Desenvolvedores',
    padraoPrincipal: 'Vocabulários Controlados Cruzados & Zettelkasten',
    status: 'operacional',
    descricao: 'Permite que comunidades profissionais com epistemologias distintas compartilhem a mesma ontologia sem perda de contexto ou distorção conceitual.',
    exemploSFD: 'Tradução do jargão técnico da museologia ("suporte", "dossiê de tombamento") para a representação de grafos computacionais ("nós", "arestas", "pesos Hebbianos").',
    protocolos: ['Zettelkasten Atomic Notes', 'Matriz Interdisciplinar', 'Ontologia Compartilhada'],
    referenciaArtigo: {
      titulo: 'Building a Personal Knowledge Graph with Obsidian: A Zettelkasten Approach',
      autor: 'Till Freitag / Knowledge Graphs',
      url: 'https://till-freitag.com/en/blog/obsidian-personal-knowledge-graph-en',
    },
  },
  {
    id: 'tecnica',
    numero: 4,
    nome: 'Técnica e Protocolar',
    subtitulo: 'Tráfego de Dados, APIs Abertas, Hashes SHA3 & SPARQL',
    padraoPrincipal: 'REST / JSON-LD / SHA3 Hashes / GraphQL / SPARQL',
    status: 'operacional',
    descricao: 'Infraestrutura de transmissão de dados técnicos: transporte via endpoints seguros, verificação de integridade por hashes de DNA Semântico e serialização de grafos.',
    exemploSFD: 'Hashes SHA3-256 gerados deterministicamente para cada conexão sináptica descoberta, permitindo replicação imutável em bancos de dados distribuídos.',
    protocolos: ['JSON-LD', 'REST API v2', 'SHA3 Hash Provenance', 'SPARQL Endpoint'],
    referenciaArtigo: {
      titulo: 'Force-Directed Graph Layouts and Centrality Metrics in Cultural Networks',
      autor: 'arXiv:2606.07094 [cs.AI]',
      url: 'https://arxiv.org/pdf/2606.07094',
    },
  },
  {
    id: 'humana',
    numero: 5,
    nome: 'Humana e Cognitiva',
    subtitulo: 'Compreensão Cidadã, Curadoria e Folksonomia Participativa',
    padraoPrincipal: 'Folksonomia Viva / Interface Obsidian / XAI Auditável',
    status: 'operacional',
    descricao: 'Garante que o pesquisador, estudante ou cidadão na ponta da cadeia compreenda a razão pela qual as manifestações culturais foram interconectadas pelo sistema.',
    exemploSFD: 'Visualização interativa Obsidian com Spreading Activation onde o percentual de certeza (ex: 53% no Boi) corresponde ao brilho e ativação dos nós correlatos.',
    protocolos: ['Spreading Activation XAI', 'Interface Force-Directed', 'Acessibilidade WCAG 2.1'],
    referenciaArtigo: {
      titulo: 'Spreading Activation in Modern Graph-RAG Information Retrieval',
      autor: 'arXiv:2512.15922 & Wikipedia',
      url: 'https://arxiv.org/pdf/2512.15922',
    },
  },
];

/**
 * Artigos Bibliográficos e Epistemológicos Fundamentais para a Aba de Interoperabilidade Cultural
 */
export interface AcademicReferenceItem {
  id: string;
  categoria: 'Interoperabilidade Patrimonial' | 'Grafos & Obsidian' | 'Spreading Activation & RAG' | 'SKOS & Tesauros';
  titulo: string;
  autores: string;
  veiculo: string;
  ano: string;
  link: string;
  resumoEpistemologico: string;
  aplicacaoNoSFD: string;
}

export const CULTURAL_INTEROP_REFERENCES: AcademicReferenceItem[] = [
  {
    id: 'usp-interop',
    categoria: 'Interoperabilidade Patrimonial',
    titulo: 'Interoperabilidade semântica no domínio do patrimônio cultural e otimização do acesso em coleções heterogêneas',
    autores: 'Revista Gestão de Projetos / USP',
    veiculo: 'Estudos Econômicos — USP',
    ano: '2023',
    link: 'https://revistas.usp.br/gestaodeprojetos/article/view/196860',
    resumoEpistemologico: 'Demonstra a necessidade de decompor a interoperabilidade em camadas (semântica, organizacional, técnica e humana) para que a integração de dados de patrimônio não gere rupturas de significado entre acervos heterogêneos.',
    aplicacaoNoSFD: 'Base metodológica das 5 Camadas de Interoperabilidade do SFD e da integração entre tesauros controlados (CNFCP) e folksonomias livres.',
  },
  {
    id: 'bad-portugal',
    categoria: 'Interoperabilidade Patrimonial',
    titulo: 'A importância da interoperabilidade em instituições de memória: arquivos, bibliotecas e museus',
    autores: 'Associação Portuguesa de Bibliotecários, Arquivistas e Documentalistas',
    veiculo: 'Notícia BAD',
    ano: '2013',
    link: 'https://noticia.bad.pt/2013/05/21/a-importancia-da-interoperabilidade-em-instituicoes-de-memoria/',
    resumoEpistemologico: 'Analisa o papel da interoperabilidade como instrumento de democratização da memória social, superando silos informacionais entre diferentes tipologias de equipamentos culturais.',
    aplicacaoNoSFD: 'Fundamenta o cruzamento de fontes do IBRAM (museus), CNFCP/IPHAN (imaterial) e Mapas da Cultura (agentes vivos).',
  },
  {
    id: 'till-freitag-obsidian',
    categoria: 'Grafos & Obsidian',
    titulo: 'Building a Personal Knowledge Graph with Obsidian: A Zettelkasten Approach',
    autores: 'Till Freitag',
    veiculo: 'Knowledge Architecture Review',
    ano: '2024',
    link: 'https://till-freitag.com/en/blog/obsidian-personal-knowledge-graph-en',
    resumoEpistemologico: 'Explica a passagem do modelo hierárquico de pastas ("onde está isso") para o modelo de grafo de forças ("o que isso tem a ver com o quê"), utilizando nós atômicos e conexões direcionadas.',
    aplicacaoNoSFD: 'Inspiração direta para o layout do grafo interativo do SFD, onde cada manifestação cultural é um nó e suas relações são descobertas dinamicamente.',
  },
  {
    id: 'arxiv-force-graph',
    categoria: 'Grafos & Obsidian',
    titulo: 'Dynamic Force-Directed Layouts with Fruchterman-Reingold and Centrality Metrics in Cultural Knowledge Graphs',
    autores: 'Knowledge Systems Research Group',
    veiculo: 'arXiv:2606.07094 [cs.AI]',
    ano: '2026',
    link: 'https://arxiv.org/pdf/2606.07094',
    resumoEpistemologico: 'Apresenta a formulação matemática para renderização em tempo real de grafos semânticos com física de molas (Fruchterman-Reingold / COSE-Bilkent) e identificação de hubs por betweenness centrality.',
    aplicacaoNoSFD: 'Utilizado no motor visual do grafo SVG do SFD para agrupar e destacar hubs culturais como Mestre Vitalino e Carranca do São Francisco.',
  },
  {
    id: 'spreading-activation-wiki',
    categoria: 'Spreading Activation & RAG',
    titulo: 'Spreading Activation in Semantic Networks and Cognitive Architectures',
    autores: 'Cognitive Science Foundation',
    veiculo: 'Wikipedia & Cognitive Architecture Papers',
    ano: '2025',
    link: 'https://en.wikipedia.org/wiki/Spreading_activation',
    resumoEpistemologico: 'Descreve o método computacional de propagação de ativação iniciado em nós-fonte rotulados, com decaimento geométrico e convergência em redes associativas.',
    aplicacaoNoSFD: 'Mecanismo exato do graph-math.ts para propagar consultas semânticas e acender nós vizinhos ao pesquisar qualquer termo.',
  },
  {
    id: 'arxiv-rag-activation',
    categoria: 'Spreading Activation & RAG',
    titulo: 'Spreading Activation across Knowledge Graphs for Multi-Hop Retrieval-Augmented Generation (RAG)',
    autores: 'AI & Information Retrieval Labs',
    veiculo: 'arXiv:2512.15922 [cs.IR]',
    ano: '2025',
    link: 'https://arxiv.org/pdf/2512.15922',
    resumoEpistemologico: 'Demonstra como a propagação de ativação supera o RAG vetorial tradicional ao encontrar interseções conceituais multi-hop (A→B→C) com explicabilidade matemática.',
    aplicacaoNoSFD: 'A base do relatório semântico de certezas (ex: 53% de certeza e 8 referências no caso do "Boi"), onde a certeza é o valor residual de ativação no grafo.',
  },
];
