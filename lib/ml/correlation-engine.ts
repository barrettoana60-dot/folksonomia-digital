/**
 * Folksonomia Digital 2.0 — Motor de Correlação Semântica
 * 
 * Calcula POR QUE um resultado externo se correlaciona com uma tag.
 * Não apenas lista resultados — explica a conexão com evidências.
 * 
 * Cada correlação tem:
 * - Score numérico (0-1)
 * - Razões explícitas (keywords, período, técnica, geografia em comum)
 * - Camada (factual/inferida)
 */

import { normalizeForComparison } from './tag-correlator';

// ============================================================
// Tipos
// ============================================================

export interface CorrelationReason {
  type: 'keyword' | 'period' | 'technique' | 'geography' | 'material' | 'theme' | 'provenance' | 'creator';
  match: string;          // O que especificamente combinou
  weight: number;         // Peso desta razão (0-1)
  description: string;    // Descrição legível
}

export interface CorrelationResult {
  externalId: string;
  title: string;
  source: string;
  score: number;                    // Score composto (0-1)
  reasons: CorrelationReason[];     // Por que se correlaciona
  matchedFields: string[];          // Campos que combinaram
  layer: 'factual' | 'inferred';   // Camada da correlação
  summary: string;                  // Resumo legível da correlação
}

export interface CrossConnection {
  sourceA: string;
  titleA: string;
  externalIdA: string;
  sourceB: string;
  titleB: string;
  externalIdB: string;
  connectionType: string;
  sharedAttributes: string[];
  confidence: number;
  description: string;
}

export interface CorrelationGraph {
  tag: string;
  correlations: CorrelationResult[];
  crossConnections: CrossConnection[];
  totalScore: number;
  depth: 'ALTA' | 'MÉDIA' | 'BAIXA';
  layerBreakdown: {
    factual: number;
    inferred: number;
    validated: number;
  };
}

// ============================================================
// Vocabulário de extração (keywords → categorias)
// ============================================================

const KEYWORD_CATEGORIES: Record<string, string[]> = {
  period: [
    'medieval', 'renascimento', 'barroco', 'rococo', 'rococó', 'neoclassico', 'neoclássico',
    'romantico', 'romântico', 'realismo', 'impressionismo', 'modernismo', 'art nouveau',
    'art deco', 'contemporaneo', 'contemporâneo', 'colonial', 'imperial', 'republicano',
    'século', 'seculo', 'setecentista', 'oitocentista', 'novecentista'
  ],
  technique: [
    'oleo', 'óleo', 'aquarela', 'gravura', 'escultura', 'fotografia', 'talha',
    'policromia', 'dourado', 'douração', 'cinzelado', 'fundição', 'fundido',
    'entalhe', 'marcenaria', 'ourivesaria', 'litografia', 'xilogravura',
    'serigrafia', 'modelagem', 'torneado', 'tecelagem', 'bordado',
    'pintura', 'desenho', 'colagem', 'assemblage', 'instalação'
  ],
  geography: [
    'brasil', 'portugal', 'espanha', 'italia', 'itália', 'frança', 'franca',
    'holanda', 'alemanha', 'africa', 'áfrica', 'angola', 'mocambique', 'moçambique',
    'minas gerais', 'rio de janeiro', 'sao paulo', 'são paulo', 'bahia',
    'pernambuco', 'maranhao', 'maranhão', 'para', 'pará', 'goias', 'goiás',
    'ouro preto', 'congonhas', 'diamantina', 'tiradentes', 'salvador', 'recife', 'olinda',
    'europa', 'america', 'américa', 'asia', 'ásia'
  ],
  material: [
    'madeira', 'ouro', 'prata', 'bronze', 'cobre', 'ferro', 'marfim',
    'marmore', 'mármore', 'pedra', 'barro', 'argila', 'ceramica', 'cerâmica',
    'vidro', 'cristal', 'tecido', 'seda', 'algodao', 'algodão', 'couro',
    'papel', 'pergaminho', 'tinta', 'pigmento'
  ],
  theme: [
    'religiao', 'religião', 'sacro', 'sagrado', 'liturgia', 'devocional',
    'retrato', 'paisagem', 'natureza', 'guerra', 'batalha', 'militar',
    'maternidade', 'familia', 'família', 'morte', 'nascimento',
    'politica', 'política', 'poder', 'nobreza', 'real', 'imperial',
    'trabalho', 'escravidão', 'escravidao', 'liberdade', 'resistencia', 'resistência'
  ],
  folk: [
    'folclore', 'folklore', 'cultura popular', 'arte popular', 'artesanato',
    'folguedo', 'bumba-meu-boi', 'maracatu', 'congada', 'reisado', 'folia de reis',
    'cordel', 'xilogravura', 'repente', 'cantoria', 'capoeira', 'samba de roda',
    'jongo', 'coco', 'ciranda', 'carimbó', 'frevo', 'forró',
    'cerâmica', 'tecelagem', 'trançado', 'bordado', 'renda', 'cestaria'
  ],
  ritual: [
    'ritual', 'candomblé', 'umbanda', 'pajelança', 'benzedura',
    'orixá', 'terreiro', 'sincretismo', 'procissão', 'romaria',
    'festa religiosa', 'ex-voto', 'promessa', 'devoção', 'santo',
    'mascara', 'máscara', 'máscara-esteira', 'festa', 'carnaval'
  ],
  ethnicity: [
    'indígena', 'indigena', 'índio', 'indio', 'povo', 'etnia',
    'afro-brasileiro', 'afrobrasileiro', 'quilombo', 'quilombola',
    'krahô', 'tupi', 'guarani', 'yanomami', 'xavante', 'kayapó',
    'timbira', 'mehin', 'batoque', 'plumária', 'pintura corporal',
    'abolição', 'abolicao', 'escravatura', 'negro', 'africano'
  ]
};

// ============================================================
// Extração de Atributos
// ============================================================

/**
 * Extrai atributos categorizados de um texto (título + descrição).
 */
function extractAttributes(text: string): Record<string, string[]> {
  const normalized = normalizeForComparison(text);
  const words = normalized.split(' ');
  const attributes: Record<string, string[]> = {};

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    const found: string[] = [];
    for (const keyword of keywords) {
      const kwNorm = normalizeForComparison(keyword);
      // Multi-word check
      if (kwNorm.includes(' ')) {
        if (normalized.includes(kwNorm)) found.push(keyword);
      } else {
        if (words.includes(kwNorm)) found.push(keyword);
      }
    }
    if (found.length > 0) attributes[category] = found;
  }

  // Extrair datas numéricas
  const yearMatches = text.match(/\b(1[4-9]\d{2}|20[0-2]\d)\b/g);
  if (yearMatches) {
    attributes['period'] = [...(attributes['period'] || []), ...yearMatches];
  }

  return attributes;
}

// ============================================================
// Motor de Correlação
// ============================================================

/**
 * Calcula a correlação entre uma tag e um registro externo.
 * Retorna score + razões explícitas.
 */
export function correlateExternalRecord(
  tagText: string,
  record: { titulo: string; descricao?: string; criador?: string; data?: string; fonte: string; link?: string; [key: string]: any }
): CorrelationResult {
  const tagNorm = normalizeForComparison(tagText);
  const tagWords = new Set(tagNorm.split(' ').filter(w => w.length > 2));

  // Construir texto completo do registro
  const recordText = [
    record.titulo,
    record.descricao,
    record.criador,
    record.data,
    ...(record.subject || []),
    ...(record.spatial || []),
    ...(record.medium || []),
    record.provedor,
    record.museu,
    record.pais
  ].filter(Boolean).join(' ');

  const recordNorm = normalizeForComparison(recordText);
  const recordWords = new Set(recordNorm.split(' ').filter(w => w.length > 2));

  const reasons: CorrelationReason[] = [];

  // 1. Keyword overlap direto
  const sharedWords = [...tagWords].filter(w => recordWords.has(w));
  if (sharedWords.length > 0) {
    reasons.push({
      type: 'keyword',
      match: sharedWords.join(', '),
      weight: Math.min(0.5 + sharedWords.length * 0.1, 0.9),
      description: `Palavras-chave em comum: ${sharedWords.map(w => `"${w}"`).join(', ')}`
    });
  }

  // 2. Tag contida no título (match forte)
  if (normalizeForComparison(record.titulo).includes(tagNorm)) {
    reasons.push({
      type: 'keyword',
      match: tagText,
      weight: 0.95,
      description: `A tag "${tagText}" aparece diretamente no título "${record.titulo}"`
    });
  }

  // 3. Extrair atributos do registro e comparar com atributos da tag
  const tagAttrs = extractAttributes(tagText);
  const recordAttrs = extractAttributes(recordText);

  for (const category of Object.keys(KEYWORD_CATEGORIES)) {
    const tagVals = new Set((tagAttrs[category] || []).map(normalizeForComparison));
    const recordVals = new Set((recordAttrs[category] || []).map(normalizeForComparison));

    const shared = [...tagVals].filter(v => recordVals.has(v));
    if (shared.length > 0) {
      const categoryLabels: Record<string, string> = {
        period: 'Mesmo período',
        technique: 'Mesma técnica',
        geography: 'Mesma região',
        material: 'Mesmo material',
        theme: 'Mesma temática'
      };

      reasons.push({
        type: category as CorrelationReason['type'],
        match: shared.join(', '),
        weight: 0.6 + shared.length * 0.1,
        description: `${categoryLabels[category] || category}: ${shared.map(s => `"${s}"`).join(', ')}`
      });
    }
  }

  // 4. Criador em comum
  if (record.criador && record.criador !== 'Desconhecido') {
    const criadorNorm = normalizeForComparison(record.criador);
    if (tagNorm.includes(criadorNorm) || criadorNorm.includes(tagNorm)) {
      reasons.push({
        type: 'creator',
        match: record.criador,
        weight: 0.85,
        description: `Mesma autoria: "${record.criador}"`
      });
    }
  }

  // Calcular score composto
  const totalWeight = reasons.reduce((sum, r) => sum + r.weight, 0);
  const maxPossibleWeight = reasons.length * 1.0;
  const score = maxPossibleWeight > 0 
    ? Math.min(Math.round((totalWeight / Math.max(maxPossibleWeight, 1)) * 100) / 100, 1.0)
    : 0;

  // Gerar resumo
  const matchedFields = reasons.map(r => r.type);
  const uniqueFields = [...new Set(matchedFields)];
  const summary = reasons.length > 0
    ? `Correlação ${score >= 0.7 ? 'forte' : score >= 0.4 ? 'moderada' : 'fraca'} — ${reasons.map(r => r.description).join('. ')}`
    : `Sem correlação semântica direta detectada.`;

  return {
    externalId: record.link || record.external_id || `${record.fonte}-${Date.now()}`,
    title: record.titulo,
    source: record.fonte,
    score: Math.max(score, reasons.length > 0 ? 0.3 : 0),
    reasons,
    matchedFields: uniqueFields,
    layer: reasons.some(r => r.weight >= 0.8) ? 'factual' : 'inferred',
    summary
  };
}

// ============================================================
// Análise Cross-Source
// ============================================================

/**
 * Detecta conexões ENTRE fontes diferentes.
 * Ex: item da Europeana e item do IBRAM sobre o mesmo tema.
 */
export function analyzeCrossSourceConnections(
  europeana: any[],
  ibram: any[],
  brasiliana: any[]
): CrossConnection[] {
  const connections: CrossConnection[] = [];
  const allPairs: [any, string, any, string][] = [];

  // Montar todos os pares cross-source
  for (const eu of europeana) {
    for (const ib of ibram) allPairs.push([eu, 'Europeana', ib, 'IBRAM']);
    for (const br of brasiliana) allPairs.push([eu, 'Europeana', br, 'Brasiliana']);
  }
  for (const ib of ibram) {
    for (const br of brasiliana) allPairs.push([ib, 'IBRAM', br, 'Brasiliana']);
  }

  for (const [itemA, sourceA, itemB, sourceB] of allPairs) {
    const textA = [itemA.titulo, itemA.descricao, itemA.criador].filter(Boolean).join(' ');
    const textB = [itemB.titulo, itemB.descricao, itemB.criador].filter(Boolean).join(' ');

    const attrsA = extractAttributes(textA);
    const attrsB = extractAttributes(textB);

    const sharedAttributes: string[] = [];
    let confidence = 0;

    for (const category of Object.keys(KEYWORD_CATEGORIES)) {
      const valsA = new Set((attrsA[category] || []).map(normalizeForComparison));
      const valsB = new Set((attrsB[category] || []).map(normalizeForComparison));
      const shared = [...valsA].filter(v => valsB.has(v));

      if (shared.length > 0) {
        sharedAttributes.push(`${category}: ${shared.join(', ')}`);
        confidence += 0.2 * shared.length;
      }
    }

    if (sharedAttributes.length >= 2 && confidence >= 0.3) {
      connections.push({
        sourceA,
        titleA: itemA.titulo,
        externalIdA: itemA.link || itemA.external_id || '',
        sourceB,
        titleB: itemB.titulo,
        externalIdB: itemB.link || itemB.external_id || '',
        connectionType: sharedAttributes.length >= 3 ? 'strong_thematic' : 'shared_attributes',
        sharedAttributes,
        confidence: Math.min(Math.round(confidence * 100) / 100, 1.0),
        description: `"${itemA.titulo}" (${sourceA}) se conecta com "${itemB.titulo}" (${sourceB}) porque compartilham: ${sharedAttributes.join('; ')}`
      });
    }
  }

  return connections.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/**
 * Constrói o grafo completo de correlações para uma tag.
 */
export function buildCorrelationGraph(
  tag: string,
  europeana: any[],
  ibram: any[],
  brasiliana: any[],
  auxiliares: any[] = []
): CorrelationGraph {
  // Correlacionar cada resultado com a tag
  const allResults = [
    ...europeana.map(r => ({ ...r, fonte: 'Europeana' })),
    ...ibram.map(r => ({ ...r, fonte: 'IBRAM' })),
    ...brasiliana.map(r => ({ ...r, fonte: 'Brasiliana' })),
    ...auxiliares.map(r => ({ ...r, fonte: r.fonte || 'Auxiliar' }))
  ];

  const correlations = allResults
    .map(record => correlateExternalRecord(tag, record))
    .filter(c => c.score > 0 || c.reasons.length > 0)
    .sort((a, b) => b.score - a.score);

  // Conexões cruzadas entre fontes
  const crossConnections = analyzeCrossSourceConnections(europeana, ibram, brasiliana);

  // Breakdown por camada
  const factualCount = correlations.filter(c => c.layer === 'factual').length;
  const inferredCount = correlations.filter(c => c.layer === 'inferred').length;

  const totalScore = correlations.length > 0
    ? Math.round((correlations.reduce((sum, c) => sum + c.score, 0) / correlations.length) * 100) / 100
    : 0;

  const totalItems = correlations.length + crossConnections.length;
  const depth = totalItems > 8 ? 'ALTA' : totalItems > 3 ? 'MÉDIA' : 'BAIXA';

  return {
    tag,
    correlations,
    crossConnections,
    totalScore,
    depth,
    layerBreakdown: {
      factual: factualCount,
      inferred: inferredCount,
      validated: 0  // Será preenchido com dados do banco
    }
  };
}
