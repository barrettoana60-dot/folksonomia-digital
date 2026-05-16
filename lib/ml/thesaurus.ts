/**
 * Folksonomia Digital 2.0 — Tesauro de Folclore e Cultura Popular
 * 
 * Vocabulário controlado baseado no Tesauro do CNFCP/IPHAN.
 * Implementa as relações hierárquicas padrão:
 *   USE / UP  = sinônimos e termos não preferidos
 *   TG  / TE  = termo geral e termo específico
 *   TGP / TEP = todo e parte
 *   TA        = termo associado
 *   NA        = definição do termo (nota de aplicação)
 *   NI        = regra de uso institucional
 * 
 * Fonte: https://antigo.cnfcp.gov.br/tesauro/cnfcp.html
 * PDF:   https://bibliotecadigital.iphan.gov.br/items/197b3e10-5b68-410f-94b1-3417ed5f9cf4
 */

// ============================================================
// Estrutura do Tesauro
// ============================================================

export interface ThesaurusEntry {
  termo: string;
  use?: string[];        // USE — termos preferidos (quando este é UP)
  up?: string[];         // UP — termos não preferidos (sinônimos deste)
  tg?: string[];         // TG — termo geral (pai hierárquico)
  te?: string[];         // TE — termos específicos (filhos)
  tgp?: string[];        // TGP — termo geral partitivo (todo)
  tep?: string[];        // TEP — termo específico partitivo (parte)
  ta?: string[];         // TA — termos associados
  na?: string;           // NA — nota de aplicação (definição)
  ni?: string;           // NI — nota institucional
}

// ============================================================
// Base do Tesauro CNFCP — Termos Essenciais
// Extraído do Tesauro de Folclore e Cultura Popular Brasileira
// ============================================================

const THESAURUS: ThesaurusEntry[] = [
  // ---- ARTE ----
  {
    termo: 'arte popular',
    tg: ['arte'],
    te: ['arte sacra popular', 'artesanato', 'escultura popular', 'pintura popular', 'gravura popular'],
    ta: ['cultura popular', 'folclore', 'artesão'],
    na: 'Produção artística de caráter espontâneo, realizada geralmente por autodidatas, vinculada às tradições culturais de uma comunidade.'
  },
  {
    termo: 'arte sacra',
    tg: ['arte'],
    te: ['imaginária', 'ex-voto', 'oratório', 'retábulo', 'talha'],
    ta: ['religiosidade popular', 'santos', 'catolicismo popular'],
    na: 'Conjunto de objetos e representações visuais de caráter religioso, vinculados ao culto e à devoção.'
  },
  {
    termo: 'artesanato',
    tg: ['arte popular'],
    te: ['cerâmica popular', 'tecelagem', 'trançado', 'bordado', 'renda', 'cestaria', 'entalhe'],
    ta: ['artesão', 'técnica artesanal', 'matéria-prima'],
    na: 'Atividade predominantemente manual de produção de objetos utilitários e decorativos.'
  },
  {
    termo: 'imaginária',
    tg: ['arte sacra'],
    te: ['santo de roca', 'santo de vestir', 'santo de barro'],
    ta: ['ex-voto', 'oratório', 'devoção'],
    na: 'Escultura representando figuras religiosas, em geral santos, anjos e cenas bíblicas.'
  },
  {
    termo: 'ex-voto',
    up: ['milagre', 'promessa'],
    tg: ['arte sacra'],
    ta: ['imaginária', 'religiosidade popular', 'devoção', 'sala de milagres'],
    na: 'Objeto oferecido em agradecimento por graça recebida, geralmente depositado em igrejas ou santuários.'
  },
  {
    termo: 'talha',
    tg: ['arte sacra', 'técnica artesanal'],
    te: ['talha dourada'],
    ta: ['retábulo', 'madeira', 'entalhe', 'barroco'],
    na: 'Técnica de entalhe em madeira para fins decorativos e religiosos.'
  },
  
  // ---- CULTURA POPULAR ----
  {
    termo: 'cultura popular',
    te: ['arte popular', 'folclore', 'medicina popular', 'culinária popular', 'religiosidade popular'],
    ta: ['tradição', 'patrimônio imaterial', 'saber popular'],
    na: 'Conjunto de manifestações culturais criadas, mantidas e transmitidas no âmbito das camadas populares da sociedade.'
  },
  {
    termo: 'folclore',
    up: ['folklore'],
    tg: ['cultura popular'],
    te: ['folguedo', 'dança popular', 'música popular', 'lenda', 'mito', 'conto popular', 'provérbio'],
    ta: ['tradição oral', 'patrimônio imaterial'],
    na: 'Conjunto de tradições, costumes, conhecimentos e crenças populares transmitidos de geração em geração.'
  },
  {
    termo: 'religiosidade popular',
    tg: ['cultura popular'],
    te: ['catolicismo popular', 'candomblé', 'umbanda', 'pajelança', 'benzedura'],
    ta: ['arte sacra', 'festa religiosa', 'santo', 'devoção', 'sincretismo'],
    na: 'Manifestações religiosas de caráter popular, muitas vezes sincréticas.'
  },
  {
    termo: 'catolicismo popular',
    tg: ['religiosidade popular'],
    ta: ['santo', 'romaria', 'procissão', 'festa religiosa', 'ex-voto'],
    na: 'Práticas religiosas católicas que incorporam elementos da cultura popular.'
  },

  // ---- FESTAS E FOLGUEDOS ----
  {
    termo: 'folguedo',
    up: ['auto popular', 'brincadeira'],
    tg: ['folclore'],
    te: ['bumba-meu-boi', 'maracatu', 'reisado', 'congada', 'cavalhada', 'folia de reis', 'pastoril'],
    ta: ['dança popular', 'música popular', 'máscara', 'figurino'],
    na: 'Manifestação dramático-coreográfica de caráter coletivo e tradicional.'
  },
  {
    termo: 'bumba-meu-boi',
    up: ['boi-bumbá', 'boi de mamão', 'boi de reis'],
    tg: ['folguedo'],
    ta: ['auto popular', 'máscara', 'bordado'],
    na: 'Folguedo popular que dramatiza a morte e ressurreição de um boi, com variações regionais em todo o Brasil.'
  },
  {
    termo: 'maracatu',
    tg: ['folguedo'],
    te: ['maracatu nação', 'maracatu rural'],
    ta: ['candomblé', 'afro-brasileiro', 'percussão'],
    na: 'Cortejo de origem afro-brasileira, com rei, rainha e corte, acompanhado de percussão.'
  },
  {
    termo: 'congada',
    up: ['congado', 'congo'],
    tg: ['folguedo'],
    ta: ['afro-brasileiro', 'catolicismo popular', 'dança popular'],
    na: 'Folguedo que dramatiza a coroação de reis congos, com elementos católicos e africanos.'
  },
  
  // ---- MÚSICA E DANÇA ----
  {
    termo: 'dança popular',
    tg: ['folclore'],
    te: ['samba de roda', 'jongo', 'coco', 'ciranda', 'carimbó', 'frevo', 'forró', 'capoeira'],
    ta: ['folguedo', 'música popular', 'instrumento musical'],
    na: 'Dança de caráter tradicional e coletivo, transmitida oralmente.'
  },
  {
    termo: 'capoeira',
    tg: ['dança popular'],
    ta: ['afro-brasileiro', 'luta', 'berimbau', 'patrimônio imaterial'],
    na: 'Manifestação cultural afro-brasileira que integra luta, dança, música e ritual.'
  },
  {
    termo: 'samba de roda',
    tg: ['dança popular'],
    ta: ['afro-brasileiro', 'patrimônio imaterial', 'Recôncavo Baiano'],
    na: 'Expressão musical, coreográfica e poética do Recôncavo Baiano, patrimônio imaterial da humanidade.'
  },

  // ---- TÉCNICAS E MATERIAIS ----
  {
    termo: 'técnica artesanal',
    te: ['tecelagem', 'trançado', 'entalhe', 'modelagem', 'fundição', 'policromia', 'douração'],
    ta: ['artesanato', 'matéria-prima', 'artesão'],
    na: 'Procedimentos técnicos utilizados na produção artesanal.'
  },
  {
    termo: 'cerâmica popular',
    tg: ['artesanato'],
    te: ['cerâmica figurativa', 'cerâmica utilitária'],
    ta: ['barro', 'modelagem', 'oleiro'],
    na: 'Produção cerâmica de caráter popular, abrangendo peças utilitárias e figurativas.'
  },
  {
    termo: 'tecelagem',
    tg: ['técnica artesanal', 'artesanato'],
    ta: ['tear', 'algodão', 'fibra'],
    na: 'Técnica de entrelaçamento de fios para produção de tecidos.'
  },
  {
    termo: 'trançado',
    tg: ['técnica artesanal', 'artesanato'],
    te: ['cestaria'],
    ta: ['fibra', 'palha', 'cipó', 'indígena'],
    na: 'Técnica de entrelaçamento de fibras vegetais.'
  },
  {
    termo: 'entalhe',
    tg: ['técnica artesanal'],
    ta: ['madeira', 'talha', 'escultura popular'],
    na: 'Técnica de esculpir ou gravar em material sólido, especialmente madeira.'
  },

  // ---- MATERIAIS ----
  {
    termo: 'madeira',
    ta: ['entalhe', 'talha', 'marcenaria', 'escultura popular'],
    na: 'Material de origem vegetal utilizado em diversas técnicas artesanais e artísticas.'
  },
  {
    termo: 'barro',
    up: ['argila'],
    ta: ['cerâmica popular', 'modelagem', 'oleiro'],
    na: 'Material plástico de origem mineral utilizado na produção cerâmica.'
  },
  {
    termo: 'fibra',
    te: ['fibra de buriti', 'fibra de tucum', 'cipó', 'palha'],
    ta: ['trançado', 'cestaria', 'indígena'],
    na: 'Material de origem vegetal utilizado em trançados e tecelagens.'
  },
  {
    termo: 'bronze',
    ta: ['fundição', 'sino', 'escultura'],
    na: 'Liga metálica utilizada na produção de sinos, esculturas e objetos artísticos.'
  },

  // ---- PATRIMÔNIO ----
  {
    termo: 'patrimônio imaterial',
    up: ['patrimônio intangível'],
    ta: ['cultura popular', 'folclore', 'tradição', 'saber popular'],
    na: 'Práticas, representações, expressões, conhecimentos e técnicas que as comunidades reconhecem como parte integrante de seu patrimônio cultural.'
  },
  {
    termo: 'patrimônio material',
    te: ['bem móvel', 'bem imóvel', 'bem integrado'],
    ta: ['tombamento', 'museu', 'acervo'],
    na: 'Conjunto de bens culturais de natureza material, classificados segundo sua natureza.'
  },
  {
    termo: 'bem móvel',
    tg: ['patrimônio material'],
    ta: ['acervo', 'museu', 'objeto'],
    na: 'Objeto que pode ser transportado sem comprometer sua integridade.'
  },
  
  // ---- CULTURA INDÍGENA ----
  {
    termo: 'indígena',
    up: ['índio'],
    te: ['arte indígena', 'cultura material indígena', 'ritual indígena'],
    ta: ['etnia', 'povo', 'aldeia', 'território', 'língua indígena'],
    na: 'Relativo aos povos originários do Brasil e suas manifestações culturais.'
  },
  {
    termo: 'arte indígena',
    tg: ['indígena'],
    te: ['plumária', 'cerâmica indígena', 'pintura corporal', 'trançado indígena', 'máscara indígena'],
    ta: ['artesanato', 'cultura material indígena'],
    na: 'Produção artística dos povos indígenas brasileiros.'
  },
  {
    termo: 'cultura material indígena',
    tg: ['indígena'],
    te: ['adorno', 'instrumento musical indígena', 'arma indígena', 'utensílio doméstico'],
    ta: ['arte indígena', 'etnografia'],
    na: 'Conjunto de objetos produzidos e utilizados pelos povos indígenas.'
  },
  {
    termo: 'máscara',
    ta: ['folguedo', 'ritual', 'indígena', 'carnaval'],
    na: 'Objeto usado para cobrir o rosto em rituais, folguedos ou festas.'
  },

  // ---- CULTURA AFRO-BRASILEIRA ----
  {
    termo: 'afro-brasileiro',
    te: ['candomblé', 'capoeira', 'samba', 'quilombo', 'congada', 'maracatu'],
    ta: ['escravidão', 'resistência', 'sincretismo', 'memória'],
    na: 'Relativo à cultura brasileira de matriz africana.'
  },
  {
    termo: 'candomblé',
    tg: ['religiosidade popular', 'afro-brasileiro'],
    ta: ['orixá', 'terreiro', 'sincretismo', 'umbanda'],
    na: 'Religião de matriz africana praticada no Brasil, com rituais, músicas e danças específicas.'
  },
  {
    termo: 'escravidão',
    ta: ['afro-brasileiro', 'abolição', 'resistência', 'quilombo', 'memória'],
    na: 'Sistema de trabalho forçado que vigorou no Brasil até 1888.'
  },
  {
    termo: 'abolição',
    ta: ['escravidão', 'resistência', 'memória', 'afro-brasileiro'],
    na: 'Processo histórico de extinção da escravidão no Brasil.'
  },

  // ---- PERÍODOS E ESTILOS ----
  {
    termo: 'barroco',
    ta: ['arte sacra', 'talha', 'imaginária', 'colonial', 'ouro preto'],
    na: 'Estilo artístico dos séculos XVII e XVIII, com forte presença na arte sacra colonial brasileira.'
  },
  {
    termo: 'colonial',
    ta: ['barroco', 'arte sacra', 'período colonial', 'ouro', 'mineração'],
    na: 'Relativo ao período de colonização portuguesa do Brasil (1500-1822).'
  },
  {
    termo: 'rococó',
    ta: ['barroco', 'arte sacra', 'talha', 'Aleijadinho'],
    na: 'Estilo decorativo derivado do barroco, com formas mais leves e assimétricas.'
  }
];

// ============================================================
// Funções de Consulta ao Tesauro
// ============================================================

/**
 * Busca um termo no tesauro (case-insensitive, normalizado).
 */
export function findTerm(query: string): ThesaurusEntry | undefined {
  const norm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return THESAURUS.find(entry => {
    const termNorm = entry.termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (termNorm === norm) return true;
    // Checar sinônimos (UP)
    if (entry.up?.some(u => u.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm)) return true;
    return false;
  });
}

/**
 * Expande uma query usando relações do tesauro.
 * Retorna a query original + termos relacionados para ampliar a busca.
 */
export function expandQuery(query: string): { original: string; expanded: string[]; context: string } {
  const entry = findTerm(query);
  if (!entry) {
    // Busca parcial — se algum termo do tesauro está contido na query
    const partial = THESAURUS.filter(e => {
      const termNorm = e.termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const queryNorm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return queryNorm.includes(termNorm) || termNorm.includes(queryNorm);
    });

    if (partial.length > 0) {
      const expanded = new Set<string>();
      for (const p of partial.slice(0, 3)) {
        p.ta?.forEach(t => expanded.add(t));
        p.te?.forEach(t => expanded.add(t));
      }
      return {
        original: query,
        expanded: [...expanded].slice(0, 8),
        context: partial.map(p => `${p.termo}: ${p.na || ''}`).join(' | ')
      };
    }

    return { original: query, expanded: [], context: '' };
  }

  const expanded = new Set<string>();
  
  // Adicionar sinônimos
  entry.up?.forEach(t => expanded.add(t));
  // Termos específicos (mais granulares)
  entry.te?.forEach(t => expanded.add(t));
  // Termos associados (contexto lateral)
  entry.ta?.forEach(t => expanded.add(t));
  // Termo geral (contexto hierárquico)
  entry.tg?.forEach(t => expanded.add(t));

  return {
    original: query,
    expanded: [...expanded].slice(0, 10),
    context: entry.na || ''
  };
}

/**
 * Enriquece resultados de busca com informações do tesauro.
 * Gera um bloco de texto para o prompt do LLM.
 */
export function enrichWithThesaurus(tag: string): string {
  const { original, expanded, context } = expandQuery(tag);
  
  if (!context && expanded.length === 0) {
    return `O tesauro do CNFCP não possui entrada direta para "${original}".`;
  }

  const lines: string[] = [];
  lines.push(`TESAURO CNFCP — Análise do termo "${original}":`);
  
  if (context) {
    lines.push(`Definição: ${context}`);
  }

  const entry = findTerm(tag);
  if (entry) {
    if (entry.tg?.length) lines.push(`Termo geral (TG): ${entry.tg.join(', ')}`);
    if (entry.te?.length) lines.push(`Termos específicos (TE): ${entry.te.join(', ')}`);
    if (entry.ta?.length) lines.push(`Termos associados (TA): ${entry.ta.join(', ')}`);
    if (entry.up?.length) lines.push(`Sinônimos/Variantes (UP): ${entry.up.join(', ')}`);
    if (entry.tgp?.length) lines.push(`Todo (TGP): ${entry.tgp.join(', ')}`);
    if (entry.tep?.length) lines.push(`Partes (TEP): ${entry.tep.join(', ')}`);
    if (entry.ni) lines.push(`Nota institucional (NI): ${entry.ni}`);
  }

  if (expanded.length > 0) {
    lines.push(`Termos expandidos para busca: ${expanded.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Retorna todas as categorias temáticas do tesauro
 * para uso no motor de correlação.
 */
export function getThesaurusCategories(): Record<string, string[]> {
  return {
    arte: ['arte popular', 'arte sacra', 'artesanato', 'imaginária', 'talha', 'cerâmica popular', 'escultura popular'],
    tecnica: ['tecelagem', 'trançado', 'entalhe', 'modelagem', 'fundição', 'policromia', 'douração'],
    material: ['madeira', 'barro', 'fibra', 'bronze', 'ouro', 'prata', 'algodão'],
    religiao: ['religiosidade popular', 'catolicismo popular', 'candomblé', 'umbanda', 'ex-voto', 'santo'],
    festa: ['folguedo', 'bumba-meu-boi', 'maracatu', 'congada', 'folia de reis', 'carnaval'],
    danca: ['dança popular', 'samba de roda', 'jongo', 'capoeira', 'frevo', 'forró'],
    indigena: ['indígena', 'arte indígena', 'cultura material indígena', 'máscara', 'plumária'],
    afrobrasileiro: ['afro-brasileiro', 'candomblé', 'capoeira', 'quilombo', 'maracatu', 'congada'],
    patrimonio: ['patrimônio imaterial', 'patrimônio material', 'bem móvel', 'tombamento'],
    periodo: ['barroco', 'colonial', 'rococó']
  };
}
