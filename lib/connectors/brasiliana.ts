/**
 * Folksonomia Digital 2.0 — Conector Brasiliana Museus / Tainacan
 *
 * Consulta o agregador oficial da Brasiliana Museus via API REST Tainacan.
 */

import { ExternalMatch, OpenDataConnector } from './types';

export class BrasilianaConnector implements OpenDataConnector {
  name = 'Brasiliana Museus';
  private baseUrls = [
    'https://brasiliana.museus.gov.br',
    'https://brasilianamuseus.cultura.gov.br',
  ];
  private apiPath = '/wp-json/tainacan/v2/items';

  private buildHeaders() {
    return {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (compatible; FolksonomiaDigital/2.0; +https://folksonomia.digital)',
    };
  }

  /**
   * Busca nos acervos da Brasiliana Museus.
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const headers = this.buildHeaders();
    const queryParams = new URLSearchParams({
      perpage: '12',
      search: query.trim(),
      exposer: 'json-flat',
      orderby: 'relevance',
      order: 'DESC',
    });

    let items: any[] = [];
    let usedBase = this.baseUrls[0];

    for (const baseUrl of this.baseUrls) {
      try {
        const paths = [
          `${baseUrl}${this.apiPath}/?${queryParams}`,
          `${baseUrl}${this.apiPath}?${queryParams}`,
        ];

        for (const url of paths) {
          const res = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            if (res.status === 403) {
              console.warn(`[Brasiliana] API indisponível (${baseUrl}): restrição temporária`);
            }
            continue;
          }

          const data = await res.json();
          const found = data.items || (Array.isArray(data) ? data : []);
          if (found.length > 0) {
            items = found;
            usedBase = baseUrl;
            break;
          }
        }

        if (items.length > 0) break;
      } catch (err) {
        console.warn(`[Brasiliana] Erro ao consultar ${baseUrl}:`, err);
      }
    }

    if (items.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const uniqueItems = items.filter((item: any) => {
      const titleStr = this.extractTitle(item);
      if (!titleStr) return false;
      const key = titleStr.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueItems.slice(0, 8).map((item: any) => {
      const metadata = item.data || {};
      const description =
        item.description?.rendered ||
        this.getMetaValue(metadata, 'description') ||
        this.getMetaValue(metadata, 'resumo-descritivo');
      const museum = this.getMetaValue(metadata, 'instalacao') || 'Brasiliana Museus';

      return {
        source: this.name,
        external_id: `brasiliana-${item.id || Date.now()}`,
        title: this.extractTitle(item),
        description: description || `Acervo: ${museum}`,
        url: item.url || item.link || usedBase,
        provider: museum,
        match_score: 0.8,
        relation_type: 'closeMatch' as const,
        raw: item,
      };
    });
  }

  /**
   * Busca textos teóricos (publicações, artigos, livros) na Brasiliana.
   */
  async searchTheoreticalText(query: string): Promise<ExternalMatch[]> {
    const theoreticalQueries = [`${query} publicação`, `${query} artigo`, `${query} livro`, query];
    const allResults: ExternalMatch[] = [];
    const seen = new Set<string>();

    for (const q of theoreticalQueries) {
      const results = await this.searchExternalSource(q);
      for (const r of results) {
        const key = r.title.toLowerCase().substring(0, 50);
        if (seen.has(key)) continue;

        const raw = r.raw?.data || r.raw || {};
        const metaStr = JSON.stringify(raw).toLowerCase();
        const isTheoretical =
          metaStr.includes('publica') ||
          metaStr.includes('artigo') ||
          metaStr.includes('livro') ||
          metaStr.includes('monografia') ||
          metaStr.includes('documento') ||
          metaStr.includes('texto') ||
          metaStr.includes('folclore') ||
          metaStr.includes('cultura popular') ||
          metaStr.includes('patrimonio') ||
          r.title.toLowerCase().includes('estudo') ||
          r.title.toLowerCase().includes('pesquisa') ||
          r.title.toLowerCase().includes('artigo') ||
          r.title.toLowerCase().includes('livro');

        if (isTheoretical || q === query) {
          seen.add(key);
          allResults.push({
            ...r,
            match_score: isTheoretical ? 0.92 : 0.8,
            relation_type: isTheoretical ? 'exactMatch' : 'closeMatch',
          });
        }
      }
      if (allResults.length >= 5) break;
    }

    return allResults.slice(0, 5);
  }

  private extractTitle(item: any): string {
    const metadata = item.data || {};
    const title =
      this.getMetaValue(metadata, 'title') ||
      this.getMetaValue(metadata, 'titulo') ||
      this.getMetaValue(metadata, 'denominacao') ||
      item.title?.rendered ||
      item.title;

    return typeof title === 'string' ? title : String(title || 'Sem Título');
  }

  private getMetaValue(metadata: any, key: string): string | undefined {
    if (metadata[key] && metadata[key].value) {
      const v = String(metadata[key].value).trim();
      return v ? v : undefined;
    }
    return undefined;
  }

  async testConnection(): Promise<boolean> {
    for (const baseUrl of this.baseUrls) {
      try {
        const url = `${baseUrl}${this.apiPath}/?perpage=1&exposer=json-flat`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) return true;
      } catch {
        /* tenta próxima URL */
      }
    }
    return false;
  }
}
