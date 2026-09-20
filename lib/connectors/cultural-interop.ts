/**
 * Hub de interoperabilidade cultural
 *
 * Arquitetura de descoberta de correspondências:
 *
 *   TAG
 *    ↓
 *   IDENTIFICAÇÃO
 *    ↓
 *   BUSCA DE CORRESPONDÊNCIAS
 *    ↓
 *   FONTES EXTERNAS (adaptadores independentes)
 *    ↓
 *   NORMALIZAÇÃO
 *    ↓
 *   RELACIONAMENTOS
 *    ↓
 *   REGISTRO DA TAG
 *
 * Cada conector é um adaptador independente que normaliza os resultados
 * da sua fonte para o formato ExternalMatch antes de retorná-los.
 * Cada resultado preserva a sua origem (source, connector, external_id).
 *
 * Fontes suportadas:
 *   - Europeana
 *   - Brasiliana Digital
 *   - IBRAM
 *   - Mapas Culturais
 *   - Dados da Cultura
 *   - Wikidata
 *   - Wikipedia (PT)
 *   - Tainacan
 */

import { ExternalMatch } from './types';
import { EuropeanaConnector } from './europeana';
import { BrasilianaConnector } from './brasiliana';
import { IbramConnector } from './ibram';
import { MapasCulturaisConnector } from './mapas-culturais';
import { DadosCulturaConnector } from './dados-cultura';
import { WikidataConnector } from './wikidata';
import { WikipediaConnector } from './wikipedia';
import { TainacanConnector } from './tainacan';
import type { TagSource } from '../core/tag-identity';

export interface CulturalDerivative {
  /** Nome da fonte (ex: "Wikidata", "Europeana") */
  source: string;
  /** Identificador externo que preserva a origem */
  externalId: string;
  title: string;
  description?: string;
  url?: string;
  provider?: string;
  /** Tipo de correspondência SKOS */
  relation: string;
  /** Pontuação de correspondência (0–1) */
  score: number;
  /** Nome do conector/adaptador */
  connector: string;
}

export interface DiscoveryResult {
  derivatives: CulturalDerivative[];
  /** Fontes prontas para persistir em tag_sources */
  tagSources: TagSource[];
  /** Mapa de origem: connector → quantidade de resultados */
  summary: Record<string, number>;
}

const SEARCH_TIMEOUT_MS = 8000;
const PER_SOURCE_LIMIT = 3;
const TOTAL_LIMIT = 15;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

function skosRelation(match: ExternalMatch): string {
  if (match.relation_type === 'sameAs' || match.relation_type === 'exactMatch') return 'skos:exactMatch';
  if (match.relation_type === 'closeMatch') return 'skos:closeMatch';
  if (match.relation_type === 'relatedMatch') return 'skos:relatedMatch';
  return 'edm:isRelatedTo';
}

/**
 * Mapeia o nome do conector para o tipo de fonte no sistema.
 */
function connectorToSourceType(connectorName: string): TagSource['type'] {
  const name = connectorName.toLowerCase();
  if (name.includes('wikidata')) return 'wikidata';
  if (name.includes('wikipedia')) return 'wikipedia';
  if (name.includes('europeana')) return 'europeana';
  if (name.includes('brasiliana')) return 'brasiliana';
  if (name.includes('ibram')) return 'ibram';
  if (name.includes('tainacan')) return 'tainacan';
  if (name.includes('mapas')) return 'mapas_culturais';
  if (name.includes('dados')) return 'dados_cultura';
  return 'external';
}

/**
 * Instancia todos os conectores registrados.
 * Para adicionar novas fontes, basta incluir um novo conector aqui.
 */
function buildConnectors() {
  return [
    new EuropeanaConnector(),
    new BrasilianaConnector(),
    new IbramConnector(),
    new MapasCulturaisConnector(),
    new DadosCulturaConnector(),
    new WikidataConnector(),
    new WikipediaConnector(),
    new TainacanConnector(),
  ];
}

/**
 * Busca derivados culturais em todas as fontes externas em paralelo.
 *
 * Fluxo:
 *   1. Cada conector é chamado em paralelo com timeout individual
 *   2. Resultados são normalizados para CulturalDerivative
 *   3. Duplicatas são removidas por (source, external_id)
 *   4. Resultados são ordenados por pontuação e limitados
 */
export async function searchCulturalDerivatives(tag: string): Promise<CulturalDerivative[]> {
  const { derivatives } = await discoverCulturalRelations(tag);
  return derivatives;
}

/**
 * Rotina completa de descoberta de correspondências e relações.
 * Retorna derivados, fontes prontas para persistência e resumo por conector.
 *
 * Chamada automaticamente ao criar uma nova tag.
 */
export async function discoverCulturalRelations(tag: string): Promise<DiscoveryResult> {
  const query = String(tag || '').trim();
  if (query.length < 2) {
    return { derivatives: [], tagSources: [], summary: {} };
  }

  const connectors = buildConnectors();

  const settled = await Promise.allSettled(
    connectors.map(connector =>
      withTimeout(connector.searchExternalSource(query), SEARCH_TIMEOUT_MS)
        .then(matches => ({
          connectorName: connector.name,
          matches: matches.slice(0, PER_SOURCE_LIMIT),
        }))
        .catch(() => ({ connectorName: connector.name, matches: [] as ExternalMatch[] })),
    ),
  );

  const seen = new Set<string>();
  const derivatives: CulturalDerivative[] = [];
  const tagSources: TagSource[] = [];
  const summary: Record<string, number> = {};

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const { connectorName, matches } = result.value;
    summary[connectorName] = matches.length;

    for (const match of matches) {
      const key = `${match.source}:${match.external_id || match.url || match.title}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const derivative: CulturalDerivative = {
        source: match.source || connectorName,
        externalId: String(match.external_id || ''),
        title: match.title,
        description: match.description,
        url: match.url,
        provider: match.provider,
        relation: skosRelation(match),
        score: Number(match.match_score || 0.5),
        connector: match.connector || connectorName,
      };
      derivatives.push(derivative);

      // Fonte pronta para persistir em tag_sources com origem preservada
      tagSources.push({
        sourceId: match.external_id || match.url || undefined,
        label: `${connectorName}: ${match.title}`,
        url: match.url,
        type: connectorToSourceType(connectorName),
        connector: connectorName,
        matchScore: Number(match.match_score || 0.5),
        skosRelation: skosRelation(match),
      });
    }
  }

  const sortedDerivatives = derivatives
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, TOTAL_LIMIT);

  const sortedSources = tagSources
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, TOTAL_LIMIT);

  return {
    derivatives: sortedDerivatives,
    tagSources: sortedSources,
    summary,
  };
}
