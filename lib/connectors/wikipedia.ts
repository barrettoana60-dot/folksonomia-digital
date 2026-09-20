/**
 * Conector Wikipedia
 *
 * Busca resumos e informações de artigos da Wikipedia em português.
 * Normaliza os resultados para o formato ExternalMatch antes de retorná-los.
 *
 * Cada resultado preserva a sua origem (Wikipedia PT) com URL do artigo.
 */

import { ExternalMatch } from './types';

const WIKIPEDIA_API = 'https://pt.wikipedia.org/w/api.php';
const TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wikipedia timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Busca via Wikipedia OpenSearch (autocomplete)
 */
async function openSearch(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: '5',
    namespace: '0',
    format: 'json',
    origin: '*',
  });

  const res = await withTimeout(
    fetch(`${WIKIPEDIA_API}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    }),
    TIMEOUT_MS,
  );

  if (!res.ok) return [];
  const json = await res.json();
  // OpenSearch retorna: [query, [titles], [descriptions], [urls]]
  return Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
}

/**
 * Busca extratos de artigos Wikipedia por título
 */
async function fetchExtracts(titles: string[]): Promise<Record<string, { title: string; extract: string; pageUrl: string }>> {
  if (titles.length === 0) return {};

  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    inprop: 'url',
    titles: titles.slice(0, 5).join('|'),
    format: 'json',
    origin: '*',
  });

  const res = await withTimeout(
    fetch(`${WIKIPEDIA_API}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
    }),
    TIMEOUT_MS,
  );

  if (!res.ok) return {};
  const json = await res.json();
  const pages = json?.query?.pages || {};

  const result: Record<string, { title: string; extract: string; pageUrl: string }> = {};
  for (const page of Object.values(pages) as any[]) {
    if (page.missing) continue;
    result[page.title] = {
      title: page.title,
      extract: page.extract || '',
      pageUrl: page.fullurl || `https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    };
  }
  return result;
}

/**
 * Calcula pontuação de relevância baseada na sobreposição de tokens
 */
function relevanceScore(query: string, title: string): number {
  const qTokens = new Set(query.toLowerCase().split(/\s+/));
  const tTokens = title.toLowerCase().split(/\s+/);
  const matches = tTokens.filter(t => qTokens.has(t)).length;
  const exactMatch = title.toLowerCase() === query.toLowerCase();
  if (exactMatch) return 0.95;
  return Math.min(0.88, 0.45 + (matches / Math.max(qTokens.size, 1)) * 0.43);
}

export class WikipediaConnector {
  readonly name = 'Wikipedia';

  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    if (!query || query.length < 3) return [];

    try {
      const titles = await openSearch(query);
      if (titles.length === 0) return [];

      const extracts = await fetchExtracts(titles);
      const matches: ExternalMatch[] = [];

      for (const title of titles.slice(0, 5)) {
        const page = extracts[title];
        const score = relevanceScore(query, title);
        const description = page?.extract
          ? page.extract.slice(0, 300).replace(/\n/g, ' ').trim()
          : '';

        matches.push({
          external_id: `wikipedia:pt:${encodeURIComponent(title)}`,
          title,
          description: description || title,
          url: page?.pageUrl || `https://pt.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          source: 'Wikipedia',
          provider: 'Wikipedia (Português)',
          relation_type: score >= 0.90 ? 'sameAs' : score >= 0.65 ? 'closeMatch' : 'relatedMatch',
          match_score: score,
        });
      }

      return matches
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 4);
    } catch {
      return [];
    }
  }
}
