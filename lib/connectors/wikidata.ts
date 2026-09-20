/**
 * Conector Wikidata
 *
 * Busca correspondências culturais na base de conhecimento aberta Wikidata.
 * Normaliza os resultados para o formato ExternalMatch antes de retorná-los.
 *
 * Cada resultado preserva a sua origem (Wikidata) e o identificador externo (Q-number).
 */

import { ExternalMatch } from './types';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wikidata timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Busca entidades no Wikidata via API de busca de rótulos.
 */
async function searchByLabel(query: string, language = 'pt'): Promise<any[]> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language,
    uselang: language,
    type: 'item',
    limit: '5',
    format: 'json',
    origin: '*',
  });

  const res = await withTimeout(
    fetch(`${WIKIDATA_API}?${params.toString()}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FolksonomiaDigital/2.0 (cultural-interop)' },
    }),
    TIMEOUT_MS,
  );

  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.search) ? json.search : [];
}

/**
 * Busca via SPARQL — encontra entidades com rótulos similares em português,
 * retornando tipo, imagem e descrição.
 */
async function searchBySparql(query: string): Promise<any[]> {
  const escapedQuery = query.replace(/"/g, '\\"');

  const sparql = `
    SELECT ?item ?itemLabel ?itemDescription ?instanceLabel WHERE {
      ?item rdfs:label "${escapedQuery}"@pt .
      OPTIONAL { ?item wdt:P31 ?instance . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
    }
    LIMIT 5
  `;

  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await withTimeout(
    fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'FolksonomiaDigital/2.0 (cultural-interop)',
      },
    }),
    TIMEOUT_MS,
  );

  if (!res.ok) return [];
  const json = await res.json();
  return json?.results?.bindings || [];
}

/**
 * Normaliza um resultado da API de busca Wikidata para ExternalMatch.
 */
function normalizeSearchResult(item: any, score: number): ExternalMatch {
  const entityId: string = item.id || '';
  return {
    external_id: entityId,
    title: item.label || item.display?.label?.value || entityId,
    description: item.description || item.display?.description?.value || '',
    url: entityId ? `https://www.wikidata.org/wiki/${entityId}` : undefined,
    source: 'Wikidata',
    provider: 'Wikidata / Wikimedia Foundation',
    relation_type: score >= 0.85 ? 'sameAs' : score >= 0.65 ? 'closeMatch' : 'relatedMatch',
    match_score: score,
  };
}

/**
 * Normaliza um resultado SPARQL para ExternalMatch.
 */
function normalizeSparqlResult(binding: any, score: number): ExternalMatch {
  const uri: string = binding.item?.value || '';
  const entityId = uri.replace('http://www.wikidata.org/entity/', '');
  return {
    external_id: entityId,
    title: binding.itemLabel?.value || entityId,
    description: binding.itemDescription?.value || binding.instanceLabel?.value || '',
    url: entityId ? `https://www.wikidata.org/wiki/${entityId}` : uri,
    source: 'Wikidata',
    provider: 'Wikidata / Wikimedia Foundation',
    relation_type: 'exactMatch',
    match_score: score,
  };
}

export class WikidataConnector {
  readonly name = 'Wikidata';

  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    if (!query || query.length < 2) return [];

    try {
      // Busca paralela: API de rótulos + SPARQL exato
      const [labelResults, sparqlResults] = await Promise.allSettled([
        searchByLabel(query, 'pt'),
        searchBySparql(query),
      ]);

      const matches: ExternalMatch[] = [];
      const seen = new Set<string>();

      // Resultados SPARQL (correspondência exata — maior pontuação)
      if (sparqlResults.status === 'fulfilled') {
        for (const binding of sparqlResults.value.slice(0, 3)) {
          const normalized = normalizeSparqlResult(binding, 0.90);
          const key = normalized.external_id || normalized.title;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push(normalized);
          }
        }
      }

      // Resultados por rótulo (busca fuzzy — pontuação menor)
      if (labelResults.status === 'fulfilled') {
        labelResults.value.slice(0, 5).forEach((item, idx) => {
          const score = Math.max(0.40, 0.78 - idx * 0.08);
          const normalized = normalizeSearchResult(item, score);
          const key = normalized.external_id || normalized.title;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push(normalized);
          }
        });
      }

      return matches
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 5);
    } catch {
      return [];
    }
  }
}
