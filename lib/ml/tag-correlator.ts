/**
 * Folksonomia Digital 2.0 — Motor de Correlação Inter-Tags
 * 
 * Detecta relações entre TODAS as tags do sistema:
 * 1. Variações de case/acentuação ("Cubismo" = "cubismo")
 * 2. Erros ortográficos ("cubisno" → "cubismo", "barrco" → "barroco")
 * 3. Sinônimos semânticos ("óleo sobre tela" ↔ "pintura a óleo")
 * 4. Famílias temáticas ("cubismo" + "surrealismo" → Vanguardas)
 * 
 * Funciona para qualquer palavra, conceito, termo ou significado.
 */

import { THESAURUS } from './thesaurus';

// ============================================================
// Tipos
// ============================================================

export interface SpellingCorrection {
  original: string;
  correctedTo: string;
  distance: number;
  confidence: number;   // 0-1
}

export interface SemanticSibling {
  tag: string;
  relation: 'exact_match' | 'case_variant' | 'spelling_error' | 'synonym' | 'broader_concept' | 'narrower_concept' | 'related';
  score: number;        // 0-1
  reason: string;       // Descrição legível da razão
}

export interface TagFamily {
  name: string;
  type: 'movement' | 'technique' | 'period' | 'material' | 'geography' | 'theme' | 'provenance';
  members: string[];
  confidence: number;
}

export interface TagCorrelationReport {
  tag: string;
  normalized: string;
  duplicates: SemanticSibling[];       // Tags que são a mesma coisa
  siblings: SemanticSibling[];         // Tags semanticamente relacionadas
  family: TagFamily | null;            // Família temática detectada
  spellingErrors: SpellingCorrection[];// Erros ortográficos detectados
  suggestions: string[];               // Sugestões de ação para o curador
  totalRelated: number;
}

// ============================================================
// Dicionário de Sinônimos Museais (Conceitos = Significados)
// ============================================================

const SYNONYM_MAP: Record<string, string[]> = {
  // Técnicas artísticas — termos que significam a mesma coisa
  'oleo sobre tela': ['pintura a oleo', 'oleo/tela', 'oleo s/ tela', 'pintura oleo'],
  'aquarela': ['aguarela', 'watercolor', 'pintura em aquarela'],
  'tempera': ['tempera sobre madeira', 'tempera/madeira'],
  'xilogravura': ['gravura em madeira', 'xilo', 'woodcut'],
  'litografia': ['litogravura', 'lithograph'],
  'talha dourada': ['talha em madeira dourada', 'douramento', 'entalhe dourado'],
  'policromia': ['policromado', 'pintura policroma', 'policromia sobre madeira'],
  'escultura': ['estatuaria', 'esculpido', 'modelagem', 'peca escultorica'],
  'fotografia': ['foto', 'registro fotografico', 'imagem fotografica'],
  'gravura': ['estampa', 'impressao', 'print'],
  'serigrafia': ['silkscreen', 'silk screen'],
  'cerâmica': ['ceramica', 'faianca', 'louça', 'louca'],
  'ourivesaria': ['ouriversaria', 'joalheria', 'prata lavrada'],
  'marcenaria': ['carpintaria', 'trabalho em madeira', 'movelaria'],
  'tecelagem': ['tecido', 'tear', 'tapeçaria', 'tapecaria'],
  'bordado': ['bordadura', 'trabalho de agulha'],

  // Períodos — termos equivalentes
  'seculo xviii': ['setecentista', 'sec xviii', 'sec. xviii', '1700', 'setecentos', 'anos 1700'],
  'seculo xix': ['oitocentista', 'sec xix', 'sec. xix', '1800', 'oitocentos', 'anos 1800'],
  'seculo xvii': ['seiscentista', 'sec xvii', 'sec. xvii', '1600', 'seiscentos'],
  'seculo xx': ['novecentista', 'sec xx', 'sec. xx', '1900', 'novecentos', 'anos 1900'],
  'periodo colonial': ['colonial', 'colonia', 'brasil colonia', 'era colonial'],
  'periodo imperial': ['imperio', 'brasil imperio', 'imperial', 'era imperial'],
  'barroco': ['estilo barroco', 'arte barroca', 'barroco brasileiro', 'barroco mineiro'],
  'rococo': ['rococó', 'estilo rococo', 'rocaille'],
  'neoclassico': ['neoclássico', 'neoclassicismo', 'estilo neoclassico'],
  'art nouveau': ['arte nova', 'jugendstil', 'modernismo catalan'],
  'modernismo': ['arte moderna', 'modernista', 'movimento modernista'],
  'contemporaneo': ['contemporâneo', 'arte contemporanea', 'arte contemporânea'],

  // Movimentos artísticos — família semântica
  'cubismo': ['arte cubista', 'cubista', 'cubist'],
  'surrealismo': ['surrealista', 'arte surrealista', 'surrealist'],
  'impressionismo': ['impressionista', 'impressionist'],
  'expressionismo': ['expressionista', 'expressionist'],
  'abstracionismo': ['arte abstrata', 'abstrato', 'abstract'],
  'realismo': ['realista', 'arte realista'],
  'romantismo': ['romantico', 'romântico', 'arte romantica'],
  'dadaismo': ['dadaísmo', 'dada', 'dadaista'],
  'futurismo': ['futurista', 'arte futurista'],
  'construtivismo': ['construtivista', 'arte construtiva'],
  'minimalismo': ['minimalista', 'minimal', 'arte minimal'],
  'pop art': ['arte pop', 'pop'],

  // Materiais — termos equivalentes
  'madeira': ['lenho', 'material ligneo', 'ligneous'],
  'ouro': ['aurum', 'dourado', 'folha de ouro'],
  'prata': ['argentum', 'prateado', 'folha de prata'],
  'bronze': ['liga de bronze', 'bronzeado'],
  'marmore': ['mármore', 'pedra marmore'],
  'marfim': ['ivory', 'material eburneo'],
  'couro': ['pelica', 'curtido', 'pele curtida'],
  'vidro': ['cristal', 'vitral', 'vidrado'],
  'papel': ['papiro', 'suporte papel'],

  // Temáticas
  'religiao': ['religiosidade', 'fe', 'fé', 'sagrado', 'sacro', 'religioso', 'devocional'],
  'liturgia': ['liturgico', 'litúrgico', 'ritual', 'cerimonial', 'missa'],
  'retrato': ['portrait', 'efígie', 'efigie', 'busto retratistico'],
  'paisagem': ['landscape', 'vista', 'panorama', 'natureza'],
  'natureza morta': ['still life', 'bodegon', 'vanitas'],
  'guerra': ['conflito', 'batalha', 'combate', 'belico', 'bélico', 'militar'],
  'maternidade': ['mae', 'mãe', 'maternal', 'materno'],
  'morte': ['obito', 'óbito', 'funebre', 'fúnebre', 'mortuario', 'mortuário'],
  'nascimento': ['natividade', 'natal', 'berço', 'berco'],

  // Proveniência
  'acervo': ['coleção', 'colecao', 'collection', 'fundo'],
  'doacao': ['doação', 'legado', 'dádiva', 'dadiva'],
  'aquisicao': ['aquisição', 'compra', 'purchase'],
  'espoliacao': ['espoliação', 'pilhagem', 'saque', 'confisco'],
  'restauracao': ['restauração', 'conservação', 'conservacao', 'reparo'],

  // Geografia
  'minas gerais': ['mg', 'minas', 'terra dos gerais'],
  'rio de janeiro': ['rj', 'rio', 'guanabara'],
  'sao paulo': ['são paulo', 'sp', 'terra da garoa'],
  'bahia': ['ba', 'terra de todos os santos'],
  'pernambuco': ['pe', 'terra do frevo'],

  // Cultura Popular e Arte Folclórica — variantes terminológicas
  'cultura popular': ['cultura tradicional', 'folclore', 'saber popular', 'expressao popular', 'manifestacao cultural', 'tradicao popular', 'cultura folk', 'arte do povo'],
  'arte popular': ['artesanato', 'arte tradicional', 'criacao popular', 'escultura popular', 'arte folklorica', 'imaginaria popular', 'arte folk', 'arte artesanal'],
  'ceramica popular': ['ceramica de barro', 'arte em barro', 'faianca popular', 'louca de barro', 'olaria', 'barro modelado', 'escultura em barro', 'figuracao em barro'],
  'imaginaria': ['escultura sacra popular', 'imagem devocional', 'escultura devocional', 'santos esculpidos', 'bulto sacro', 'estatuaria religiosa'],
  'ex-voto': ['milagre', 'promessa', 'objeto votivo', 'tabuleta votiva', 'ex voto', 'voto'],
  'bumba meu boi': ['boi bumba', 'bumba-meu-boi', 'boi de mamao', 'boi bumbá', 'bumba meu boi nordestino'],
  'xilogravura nordestina': ['cordel ilustrado', 'gravura de cordel', 'gravura popular', 'xilogravura de cordel'],
  'cerâmica nordestina': ['ceramica nordestina', 'ceramica de caruaru', 'ceramica de juazeiro', 'figuracao nordestina'],
};

// Famílias temáticas expandidas
const THEMATIC_FAMILIES: Record<string, { name: string; type: TagFamily['type']; members: string[] }> = {
  vanguardas: {
    name: 'Vanguardas Artísticas Europeias',
    type: 'movement',
    members: ['cubismo', 'surrealismo', 'dadaismo', 'futurismo', 'expressionismo', 'construtivismo', 'abstracionismo', 'fauvismo', 'suprematismo']
  },
  modernismo_br: {
    name: 'Modernismo Brasileiro',
    type: 'movement',
    members: ['modernismo', 'semana de 22', 'antropofagia', 'pau brasil', 'tropicalia', 'concretismo', 'neoconcretismo']
  },
  arte_sacra: {
    name: 'Arte Sacra e Religiosidade',
    type: 'theme',
    members: ['religiao', 'liturgia', 'santo', 'santa', 'cristo', 'madonna', 'calice', 'crucifixo', 'retablo', 'altar', 'ex-voto', 'oratorio', 'imagem devocional', 'arte sacra']
  },
  tecnicas_coloniais: {
    name: 'Técnicas Artísticas Coloniais',
    type: 'technique',
    members: ['talha dourada', 'policromia', 'entalhe', 'escultura', 'pintura mural', 'azulejaria', 'imaginaria', 'ourivesaria', 'toreutica']
  },
  materiais_nobres: {
    name: 'Materiais Nobres e Preciosos',
    type: 'material',
    members: ['ouro', 'prata', 'bronze', 'marfim', 'marmore', 'cristal', 'seda', 'jacaranda', 'mogno']
  },
  materiais_populares: {
    name: 'Materiais Populares e Artesanais',
    type: 'material',
    members: ['barro', 'argila', 'madeira', 'couro', 'algodao', 'palha', 'fibra', 'coco', 'cabaça']
  },
  periodo_colonial: {
    name: 'Brasil Colonial (Séc. XVI–XIX)',
    type: 'period',
    members: ['colonial', 'barroco', 'rococo', 'jesuitico', 'setecentista', 'oitocentista', 'seculo xviii', 'seculo xvii', 'imperio', 'coroa']
  },
  periodo_moderno: {
    name: 'Brasil Moderno (Séc. XX)',
    type: 'period',
    members: ['modernismo', 'art deco', 'contemporaneo', 'novecentista', 'seculo xx', 'pos-guerra', 'ditadura']
  },
  minas_gerais: {
    name: 'Arte e Patrimônio de Minas Gerais',
    type: 'geography',
    members: ['minas gerais', 'ouro preto', 'congonhas', 'diamantina', 'tiradentes', 'sabara', 'mariana', 'aleijadinho', 'ataíde', 'barroco mineiro']
  },
  nordeste: {
    name: 'Arte e Cultura do Nordeste',
    type: 'geography',
    members: ['bahia', 'pernambuco', 'salvador', 'recife', 'olinda', 'sao luis', 'cordel', 'xilogravura nordestina', 'mamulengo']
  },
  armaria: {
    name: 'Armaria e Objetos Militares',
    type: 'theme',
    members: ['espada', 'arma', 'armadura', 'escudo', 'lanca', 'mosquete', 'canone', 'baioneta', 'sable', 'punhal', 'militar', 'guerra', 'batalha']
  },
  mobiliario: {
    name: 'Mobiliário e Artes Decorativas',
    type: 'theme',
    members: ['mesa', 'cadeira', 'comoda', 'armario', 'arca', 'bau', 'oratório', 'leito', 'escritorio', 'mobilia', 'movelaria']
  },
  documentos: {
    name: 'Documentação e Cartografia',
    type: 'theme',
    members: ['mapa', 'carta', 'documento', 'manuscrito', 'alvara', 'decreto', 'certidao', 'inventario', 'testamento', 'cartografia']
  },
  indumentaria: {
    name: 'Indumentária e Têxteis',
    type: 'theme',
    members: ['vestido', 'traje', 'uniforme', 'farda', 'renda', 'bordado', 'tecido', 'seda', 'algodao', 'tapeçaria', 'moda', 'indumentaria']
  },
  cultura_popular_brasileira: {
    name: 'Cultura Popular e Arte Folclórica Brasileira',
    type: 'theme',
    members: [
      'cultura popular', 'arte popular', 'folclore', 'artesanato', 'ceramica popular',
      'imaginaria', 'ex-voto', 'tradicao popular', 'saber popular', 'patrimonio imaterial',
      'manifestacao cultural', 'bumba meu boi', 'xilogravura nordestina', 'ceramica nordestina',
      'cordel', 'mamulengo', 'arte do povo', 'mestre artesao', 'figuracao popular',
      'escultura popular', 'gravura popular'
    ]
  }
};

// ============================================================
// Algoritmos de Similaridade
// ============================================================

/**
 * Calcula distância de Levenshtein entre duas strings.
 * Usado para detectar erros ortográficos.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substituição
          matrix[i][j - 1] + 1,       // inserção
          matrix[i - 1][j] + 1        // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalização avançada para comparação.
 * Remove acentos, converte para minúscula, normaliza espaços.
 */
export function normalizeForComparison(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // remove caracteres especiais
    .replace(/\s+/g, ' ')             // normaliza espaços
    .trim();
}

/**
 * Calcula similaridade de Jaccard entre conjuntos de palavras.
 * Útil para detectar tags com palavras em comum.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ============================================================
// Motor de Correlação
// ============================================================

/**
 * Retorna o vocabulário canônico controlado derivado do Tesauro CNFCP/IPHAN,
 * famílias temáticas, dicionário de sinônimos e termos existentes no acervo.
 */
export function getCanonicalVocabulary(knownTags: string[] = []): string[] {
  const vocabulary = new Set<string>();

  // 1. Termos canônicos do Tesauro CNFCP/IPHAN
  try {
    THESAURUS.forEach(t => {
      vocabulary.add(t.termo);
      t.up?.forEach(u => vocabulary.add(u));
      t.te?.forEach(te => vocabulary.add(te));
      t.ta?.forEach(ta => vocabulary.add(ta));
    });
  } catch {}

  // 2. Chaves canônicas de SYNONYM_MAP
  for (const key of Object.keys(SYNONYM_MAP)) {
    vocabulary.add(key);
  }

  // 3. Membros de THEMATIC_FAMILIES
  for (const fam of Object.values(THEMATIC_FAMILIES)) {
    fam.members.forEach(m => vocabulary.add(m));
  }

  // 4. Tags conhecidas do acervo/banco
  for (const t of knownTags) {
    if (t && t.trim().length > 1) {
      vocabulary.add(t.trim());
    }
  }

  return [...vocabulary];
}

/**
 * Detecta inconsistências ortográficas comparando o descritor com o vocabulário
 * canônico controlado do acervo e do Tesauro CNFCP/IPHAN.
 */
export function detectSpellingErrors(
  tag: string,
  knownTags: string[] = []
): SpellingCorrection[] {
  const normalized = normalizeForComparison(tag);
  const corrections: SpellingCorrection[] = [];
  const referencePool = getCanonicalVocabulary(knownTags);
  const seenCorrections = new Set<string>();

  for (const candidate of referencePool) {
    const candidateNorm = normalizeForComparison(candidate);
    if (candidateNorm === normalized) continue;

    const distance = levenshteinDistance(normalized, candidateNorm);
    const maxLen = Math.max(normalized.length, candidateNorm.length);

    // Aceitar distância proporcional ao tamanho da expressão
    const maxDistance = normalized.length <= 4 ? 1 : normalized.length <= 8 ? 2 : 3;

    if (distance > 0 && distance <= maxDistance) {
      const confidence = 1 - (distance / maxLen);
      if (confidence >= 0.75 && !seenCorrections.has(candidateNorm)) {
        seenCorrections.add(candidateNorm);
        corrections.push({
          original: tag,
          correctedTo: candidate,
          distance,
          confidence: Math.round(confidence * 100) / 100
        });
      }
    }
  }

  // Análise por token/palavra para expressões compostas
  const tagTokens = normalized.split(' ').filter(Boolean);
  if (tagTokens.length > 1) {
    for (const candidate of referencePool) {
      const candidateNorm = normalizeForComparison(candidate);
      const candTokens = candidateNorm.split(' ').filter(Boolean);
      if (candTokens.length !== tagTokens.length) continue;

      let tokenDifferences = 0;
      let totalTokenDist = 0;
      for (let i = 0; i < tagTokens.length; i++) {
        const tDist = levenshteinDistance(tagTokens[i], candTokens[i]);
        if (tDist > 0) {
          tokenDifferences++;
          totalTokenDist += tDist;
        }
      }

      if (tokenDifferences === 1 && totalTokenDist <= 2 && !seenCorrections.has(candidateNorm)) {
        seenCorrections.add(candidateNorm);
        const maxLen = Math.max(normalized.length, candidateNorm.length);
        const confidence = 1 - (totalTokenDist / maxLen);
        corrections.push({
          original: tag,
          correctedTo: candidate,
          distance: totalTokenDist,
          confidence: Math.round(confidence * 100) / 100
        });
      }
    }
  }

  return corrections.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Encontra sinônimos semânticos — tags com mesmo significado.
 * Usa o dicionário museal expandido.
 */
export function findSemanticSiblings(
  tag: string,
  allTags: string[]
): SemanticSibling[] {
  const normalized = normalizeForComparison(tag);
  const siblings: SemanticSibling[] = [];
  const seen = new Set<string>();

  // 1. Match exato após normalização (variações de case/acento)
  for (const other of allTags) {
    const otherNorm = normalizeForComparison(other);
    if (otherNorm === normalized && other !== tag && !seen.has(otherNorm)) {
      seen.add(otherNorm);
      siblings.push({
        tag: other,
        relation: 'case_variant',
        score: 1.0,
        reason: `Mesma palavra com diferença de maiúsculas/acentuação: "${tag}" = "${other}"`
      });
    }
  }

  // 2. Busca no dicionário de sinônimos
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const canonicalNorm = normalizeForComparison(canonical);
    const allForms = [canonicalNorm, ...synonyms.map(normalizeForComparison)];

    if (allForms.includes(normalized)) {
      // A tag buscada está neste grupo de sinônimos
      for (const other of allTags) {
        const otherNorm = normalizeForComparison(other);
        if (otherNorm !== normalized && allForms.includes(otherNorm) && !seen.has(otherNorm)) {
          seen.add(otherNorm);
          siblings.push({
            tag: other,
            relation: 'synonym',
            score: 0.9,
            reason: `Sinônimo semântico: "${tag}" e "${other}" significam a mesma coisa (grupo: ${canonical})`
          });
        }
      }

      // Também retornar sinônimos que não estão no banco mas poderiam estar
      for (const syn of [canonical, ...synonyms]) {
        const synNorm = normalizeForComparison(syn);
        if (synNorm !== normalized && !seen.has(synNorm)) {
          const existsInDb = allTags.some(t => normalizeForComparison(t) === synNorm);
          if (!existsInDb) {
            seen.add(synNorm);
            siblings.push({
              tag: syn,
              relation: 'synonym',
              score: 0.7,
              reason: `Termo equivalente (não presente no sistema): "${syn}"`
            });
          }
        }
      }
    }
  }

  // 3. Similaridade por palavras em comum (Jaccard)
  for (const other of allTags) {
    const otherNorm = normalizeForComparison(other);
    if (otherNorm === normalized || seen.has(otherNorm)) continue;

    const jaccard = jaccardSimilarity(normalized, otherNorm);
    if (jaccard >= 0.4 && normalized.split(' ').length > 1) {
      seen.add(otherNorm);
      siblings.push({
        tag: other,
        relation: 'related',
        score: Math.round(jaccard * 100) / 100,
        reason: `Compartilham palavras em comum: "${tag}" ↔ "${other}" (similaridade: ${Math.round(jaccard * 100)}%)`
      });
    }
  }

  // 4. Correspondência fuzzy com chaves do SYNONYM_MAP via Levenshtein
  // Permite que "cultura populae" seja vinculada a "cultura popular" mesmo sem hit exato
  if (normalized.length >= 5) {
    for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
      const canonicalNorm = normalizeForComparison(canonical);
      const allForms = [canonicalNorm, ...synonyms.map(normalizeForComparison)];

      // Verificar se a tag buscada é aproximada de qualquer forma do grupo
      const matchedForm = allForms.find(form => {
        if (form === normalized) return false;
        if (Math.abs(form.length - normalized.length) > 3) return false;
        const d = levenshteinDistance(normalized, form);
        const maxL = Math.max(normalized.length, form.length);
        return d <= Math.min(2, Math.floor(maxL * 0.12)) && (1 - d / maxL) >= 0.82;
      });

      if (matchedForm && !seen.has(canonicalNorm)) {
        // Expor o descritor canônico como variante grafêmica
        seen.add(canonicalNorm);
        const dist = levenshteinDistance(normalized, matchedForm);
        const maxL = Math.max(normalized.length, matchedForm.length);
        siblings.push({
          tag: canonical,
          relation: 'spelling_error',
          score: Math.round((1 - dist / maxL) * 100) / 100,
          reason: `Possível variante grafêmica de "${canonical}": "${tag}" difere por ${dist} caractere(s)`
        });

        // Expor sinônimos do grupo que existem no banco
        for (const other of allTags) {
          const otherNorm = normalizeForComparison(other);
          if (otherNorm !== normalized && allForms.includes(otherNorm) && !seen.has(otherNorm)) {
            seen.add(otherNorm);
            siblings.push({
              tag: other,
              relation: 'synonym',
              score: 0.8,
              reason: `Descritor relacionado ao grupo terminológico de "${canonical}"`
            });
          }
        }
      }
    }
  }

  return siblings.sort((a, b) => b.score - a.score);
}

/**
 * Detecta a família temática de uma tag.
 * Funciona para qualquer conceito do vocabulário museal.
 */
export function detectTagFamily(tag: string): TagFamily | null {
  const normalized = normalizeForComparison(tag);

  for (const [, family] of Object.entries(THEMATIC_FAMILIES)) {
    const normalizedMembers = family.members.map(normalizeForComparison);
    
    // Match direto: a tag é membro da família
    if (normalizedMembers.includes(normalized)) {
      return {
        name: family.name,
        type: family.type,
        members: family.members,
        confidence: 0.95
      };
    }

    // Match parcial: a tag contém ou é contida por um membro
    // Proteção: apenas considerar match parcial se a palavra tiver pelo menos 4 caracteres
    // Isso evita que tags como "m" ou "x" deem match em "cubismo" só por conter a letra
    if (normalized.length > 3) {
      for (const member of normalizedMembers) {
        if (member.length > 3 && (normalized.includes(member) || member.includes(normalized))) {
          // Garantia extra: o match deve ser significativo (evita que "arte" dê match em "martelo")
          const minLen = Math.min(normalized.length, member.length);
          const maxLen = Math.max(normalized.length, member.length);
          if (minLen / maxLen > 0.4) {
            return {
              name: family.name,
              type: family.type,
              members: family.members,
              confidence: 0.7
            };
          }
        }
      }
    }
  }

  // Tentar via sinônimos: se a tag tem um sinônimo que pertence a uma família
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const allForms = [normalizeForComparison(canonical), ...synonyms.map(normalizeForComparison)];
    if (allForms.includes(normalized)) {
      // Verificar se o canônico pertence a alguma família
      const canonicalNorm = normalizeForComparison(canonical);
      for (const [, family] of Object.entries(THEMATIC_FAMILIES)) {
        if (family.members.map(normalizeForComparison).includes(canonicalNorm)) {
          return {
            name: family.name,
            type: family.type,
            members: family.members,
            confidence: 0.8
          };
        }
      }
    }
  }

  // 3. Fallback fuzzy: verificar se a tag corrige para um membro de alguma família (Levenshtein)
  // Isso garante que "cultura populae" → encontra família de "cultura popular"
  if (normalized.length >= 5) {
    for (const [, family] of Object.entries(THEMATIC_FAMILIES)) {
      for (const member of family.members) {
        const memberNorm = normalizeForComparison(member);
        if (memberNorm.length < 4) continue;
        const dist = levenshteinDistance(normalized, memberNorm);
        const maxLen = Math.max(normalized.length, memberNorm.length);
        if (dist > 0 && dist <= Math.min(2, Math.floor(memberNorm.length * 0.15))) {
          const confidence = Math.round((1 - dist / maxLen) * 100) / 100;
          if (confidence >= 0.82) {
            return {
              name: family.name,
              type: family.type,
              members: family.members,
              confidence
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Encontra outras tags no banco que pertencem à mesma família.
 */
export function findFamilyMembers(tag: string, allTags: string[] = []): string[] {
  const family = detectTagFamily(tag);
  if (!family) return [];

  const normTag = normalizeForComparison(tag);
  // Membros canônicos conceituais da família taxonômica
  const canonicalMembers = family.members.filter(m => normalizeForComparison(m) !== normTag);

  // Membros já presentes nas unidades do acervo
  const dbMembers = allTags.filter(t => {
    const norm = normalizeForComparison(t);
    return norm !== normTag && family.members.some(m => normalizeForComparison(m) === norm);
  });

  return [...new Set([...dbMembers, ...canonicalMembers])];
}

// ============================================================
// Pipeline Completo
// ============================================================

/**
 * Análise completa de correlação inter-tags.
 * Executa todas as camadas para qualquer tag fornecida.
 */
export function analyzeTagCorrelations(
  tag: string,
  allDbTags: string[]
): TagCorrelationReport {
  const normalized = normalizeForComparison(tag);

  // 1. Detectar erros ortográficos
  const spellingErrors = detectSpellingErrors(tag, allDbTags);

  // 2. Encontrar sinônimos e variantes
  const siblings = findSemanticSiblings(tag, allDbTags);

  // 3. Separar duplicatas/erros grafêmicos (score >= 0.8 ou relação explícita) de descritores relacionados
  const duplicates = siblings.filter(s =>
    s.relation === 'exact_match' ||
    s.relation === 'case_variant' ||
    s.relation === 'spelling_error' ||
    s.score >= 0.9
  );
  const relatedSiblings = siblings.filter(s =>
    s.relation !== 'exact_match' &&
    s.relation !== 'case_variant' &&
    s.relation !== 'spelling_error' &&
    s.score < 0.9
  );

  // 4. Detectar família temática
  const family = detectTagFamily(tag);

  // Se tem família, adicionar membros conceituais e do acervo como descritores relacionados
  if (family) {
    const familyMembers = findFamilyMembers(tag, allDbTags);
    for (const member of familyMembers) {
      if (!siblings.some(s => normalizeForComparison(s.tag) === normalizeForComparison(member)) &&
          !relatedSiblings.some(s => normalizeForComparison(s.tag) === normalizeForComparison(member))) {
        relatedSiblings.push({
          tag: member,
          relation: 'related',
          score: 0.85,
          reason: `Descritor correlato na categoria taxonômica "${family.name}"`
        });
      }
    }
  }

  // Adicionar inconsistências ortográficas como duplicatas
  for (const err of spellingErrors) {
    if (!duplicates.some(d => normalizeForComparison(d.tag) === normalizeForComparison(err.correctedTo))) {
      duplicates.push({
        tag: err.correctedTo,
        relation: 'spelling_error',
        score: err.confidence,
        reason: `Inconsistência ortográfica identificada: forma canônica recomendada é "${err.correctedTo}" (similaridade: ${Math.round(err.confidence * 100)}%)`
      });
    }
  }

  // 5. Gerar sugestões de curadoria em terminologia museológica formal
  const suggestions: string[] = [];

  // Erros ortográficos têm prioridade
  const spellingDups = duplicates.filter(d => d.relation === 'spelling_error');
  if (spellingDups.length > 0) {
    const corrected = spellingDups.map(d => `"${d.tag}"`).join(', ');
    suggestions.push(`Variante grafêmica identificada — forma normalizada preferencial: ${corrected}`);
  }

  if (spellingErrors.length > 0) {
    suggestions.push(`Inconsistência ortográfica detectada — forma canônica recomendada: "${spellingErrors[0].correctedTo}" (distância: ${spellingErrors[0].distance})`);
  }

  if (duplicates.filter(d => d.relation !== 'spelling_error').length > 0) {
    const dupNames = duplicates.filter(d => d.relation !== 'spelling_error').map(d => `"${d.tag}"`).join(', ');
    suggestions.push(`Descritores cossignificativos identificados — recomenda-se normalização terminológica: ${dupNames}`);
  }

  if (family) {
    const familyMembers = findFamilyMembers(tag, allDbTags);
    if (familyMembers.length > 0) {
      suggestions.push(`Descritor classifica-se na categoria taxonômica "${family.name}" junto com: ${familyMembers.map(m => `"${m}"`).join(', ')}`);
    } else {
      suggestions.push(`Descritor classifica-se na categoria taxonômica "${family.name}" — nenhum outro membro desta categoria localizado no acervo`);
    }
  }

  if (relatedSiblings.length > 0 && !family) {
    suggestions.push(`Descritores semanticamente análogos identificados: ${relatedSiblings.slice(0, 3).map(s => `"${s.tag}"`).join(', ')}`);
  }

  return {
    tag,
    normalized,
    duplicates,
    siblings: relatedSiblings,
    family,
    spellingErrors,
    suggestions,
    totalRelated: duplicates.length + relatedSiblings.length
  };
}
