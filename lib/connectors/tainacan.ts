/**
 * Conector Tainacan
 *
 * Busca itens em repositórios Tainacan (plataforma de acervos digitais do IBRAM/MCTI).
 * Suporta a API REST pública do Tainacan.
 *
 * Cada resultado preserva a sua origem (Tainacan) com URL do item.
 */

import { ExternalMatch } from './types';

// Endpoint público do Tainacan — instâncias federais abertas
const TAINACAN_ENDPOINTS = [
  'https://museus.cultura.gov.br/wp-json/tainacan/v2',
  'https://acervos.museus.gov.br/wp-json/tainacan/v2',
];

const TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('tainacan timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Busca itens em um endpoint Tainacan
 */
async function searchEndpoint(baseUrl: string, query: string): Promise<any[]> {
  // Tainacan REST API: GET /items?search=<query>&perpage=5
  const params = new URLSearchParams({
    search: query,
    perpage: '4',
    status: 'publish',
  });

  const url = `${baseUrl}/items?${params.toString()}`;
  const res = await withTimeout(
    fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FolksonomiaDigital/2.0 (cultural-interop)',
      },
    }),
    TIMEOUT_MS,
  );

  if (!res.ok) return [];
  const json = await res.json();

  // Tainacan retorna array de items ou objeto com items
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  return [];
}

/**
 * Extrai texto de um campo de metadados Tainacan (pode ser array ou string)
 */
function extractMetaValue(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(v => (typeof v === 'string' ? v : v?.value || '')).filter(Boolean).join(', ');
  if (typeof value === 'object' && value.value) return String(value.value);
  return '';
}

/**
 * Normaliza um item Tainacan para ExternalMatch
 */
function normalizeItem(item: any, baseUrl: string, score: number): ExternalMatch | null {
  const title = item.title || item.name || extractMetaValue(item.metadata?.titulo) || '';
  if (!title) return null;

  const description = item.description
    || extractMetaValue(item.metadata?.descricao)
    || extractMetaValue(item.metadata?.historico)
    || '';

  const itemUrl = item.url
    || item.link
    || (item.id ? `${baseUrl}/items/${item.id}` : undefined);

  return {
    external_id: `tainacan:${item.id || item.slug || ''}`,
    title: String(title).slice(0, 200),
    description: String(description).slice(0, 400),
    url: itemUrl,
    source: 'Tainacan',
    provider: 'Tainacan / Museus Brasileiros',
    relation_type: score >= 0.80 ? 'closeMatch' : 'relatedMatch',
    match_score: score,
  };
}

/**
 * Calcula pontuação de relevância simples por sobreposição de tokens
 */
function calcScore(query: string, title: string, idx: number): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  if (t === q) return 0.88;
  if (t.includes(q) || q.includes(t)) return 0.78;
  const qTokens = new Set(q.split(/\s+/));
  const tTokens = t.split(/\s+/);
  const matches = tTokens.filter(tok => qTokens.has(tok)).length;
  const base = matches > 0 ? 0.52 + (matches / Math.max(qTokens.size, 1)) * 0.25 : 0.38;
  return Math.max(0.30, base - idx * 0.04);
}

export class TainacanConnector {
  readonly name = 'Tainacan';

  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    if (!query || query.length < 3) return [];

    try {
      // Tenta todos os endpoints disponíveis em paralelo
      const results = await Promise.allSettled(
        TAINACAN_ENDPOINTS.map(endpoint => searchEndpoint(endpoint, query).then(items => ({ endpoint, items }))),
      );

      const matches: ExternalMatch[] = [];
      const seen = new Set<string>();

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { endpoint, items } = result.value;

        items.slice(0, 4).forEach((item, idx) => {
          const score = calcScore(query, item.title || '', idx);
          const normalized = normalizeItem(item, endpoint, score);
          if (!normalized) return;

          const key = normalized.external_id || normalized.title;
          if (seen.has(key)) return;
          seen.add(key);
          matches.push(normalized);
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
