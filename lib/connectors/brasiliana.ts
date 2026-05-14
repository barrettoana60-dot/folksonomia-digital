/**
 * Folksonomia Digital 2.0 — Conector Brasiliana Museus / Tainacan (Real)
 * 
 * Busca dados reais da Biblioteca Nacional Digital do Brasil via WordPress REST API.
 * A Brasiliana Fotográfica não possui API pública documentada,
 * então usamos BNDigital como proxy principal.
 * 
 * Endpoints:
 * - BNDigital: https://bndigital.bn.gov.br/wp-json/wp/v2/posts
 * - Acervo BN: https://acervo.bn.gov.br (sem API REST pública)
 */

import { ExternalMatch, OpenDataConnector } from './types';

export interface BrasilianaRecord {
  id: string;
  title: string;
  description?: string;
  creator?: string;
  date?: string;
  type?: string;
  url?: string;
  thumbnail?: string;
  source: string;
  raw: unknown;
}

export class BrasilianaConnector implements OpenDataConnector {
  name = 'Brasiliana Museus';
  
  /**
   * Busca na BNDigital via WordPress REST API.
   */
  async searchBNDigital(query: string, perPage: number = 5): Promise<BrasilianaRecord[]> {
    try {
      const params = new URLSearchParams({
        search: query,
        per_page: String(perPage),
        orderby: 'relevance',
        _fields: 'id,title,excerpt,link,date'
      });

      const url = `https://bndigital.bn.gov.br/wp-json/wp/v2/posts?${params}`;
      const res = await fetch(url, { 
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        id: `bn-${item.id}`,
        title: this.stripHtml(item.title?.rendered || 'Sem título'),
        description: this.stripHtml(item.excerpt?.rendered || '').substring(0, 300),
        creator: 'Biblioteca Nacional',
        date: item.date ? new Date(item.date).getFullYear().toString() : undefined,
        type: 'TEXT',
        url: item.link || 'https://bndigital.bn.gov.br',
        source: 'Brasiliana Museus',
        raw: item
      }));
    } catch (err) {
      console.warn('[Brasiliana/BNDigital] Fetch failed:', err);
      return [];
    }
  }

  /**
   * Busca no acervo digital da BN via busca de páginas.
   */
  async searchBNAcervo(query: string): Promise<BrasilianaRecord[]> {
    try {
      const params = new URLSearchParams({
        search: query,
        per_page: '5',
        _fields: 'id,title,excerpt,link'
      });

      const url = `https://bndigital.bn.gov.br/wp-json/wp/v2/pages?${params}`;
      const res = await fetch(url, { 
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        id: `bn-page-${item.id}`,
        title: this.stripHtml(item.title?.rendered || 'Sem título'),
        description: this.stripHtml(item.excerpt?.rendered || '').substring(0, 300),
        creator: 'Biblioteca Nacional',
        url: item.link || 'https://bndigital.bn.gov.br',
        source: 'Brasiliana Museus',
        raw: item
      }));
    } catch {
      return [];
    }
  }

  /**
   * Busca principal — combina múltiplas fontes da BN.
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const [posts, pages] = await Promise.allSettled([
      this.searchBNDigital(query, 5),
      this.searchBNAcervo(query)
    ]);

    const allRecords: BrasilianaRecord[] = [];
    if (posts.status === 'fulfilled') allRecords.push(...posts.value);
    if (pages.status === 'fulfilled') allRecords.push(...pages.value);

    // Deduplicar por título
    const seen = new Set<string>();
    const unique = allRecords.filter(r => {
      const key = r.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 5).map(rec => ({
      source: this.name,
      external_id: rec.id,
      title: rec.title,
      description: rec.description || `Acervo Brasiliana Museus`,
      url: rec.url || 'https://bndigital.bn.gov.br',
      provider: 'Brasiliana Museus',
      match_score: 0.75,
      relation_type: 'closeMatch' as const,
      raw: rec.raw
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch('https://bndigital.bn.gov.br/wp-json/wp/v2/posts?per_page=1', {
        signal: AbortSignal.timeout(5000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
