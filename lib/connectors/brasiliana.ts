/**
 * Folksonomia Digital 2.0 — Conector Brasiliana Museus / Tainacan
 * 
 * Consulta o Agregador Oficial da Brasiliana Museus.
 */

import { ExternalMatch, OpenDataConnector } from './types';

export class BrasilianaConnector implements OpenDataConnector {
  name = 'Brasiliana Museus';
  private baseUrl = 'https://brasiliana.museus.gov.br';
  private apiPath = '/wp-json/tainacan/v2/items';

  /**
   * Busca nos acervos da Brasiliana Museus.
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    try {
      const queryParams = new URLSearchParams({
        perpage: '5',
        search: query,
        exposer: 'json-flat'
      });

      const url = `${this.baseUrl}${this.apiPath}/?${queryParams}`;
      
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        console.warn(`[Brasiliana] HTTP ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items = data.items || (Array.isArray(data) ? data : []);

      // Deduplicar e parsear
      const seen = new Set<string>();
      const uniqueItems = items.filter((item: any) => {
        const titleStr = this.extractTitle(item);
        if (!titleStr) return false;
        const key = titleStr.toLowerCase().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return uniqueItems.slice(0, 5).map((item: any) => {
        const metadata = item.data || {};
        
        const description = item.description?.rendered 
          || this.getMetaValue(metadata, 'description')
          || this.getMetaValue(metadata, 'resumo-descritivo');
          
        const author = this.getMetaValue(metadata, 'autor') 
          || this.getMetaValue(metadata, 'autoria');

        const date = this.getMetaValue(metadata, 'data-de-producao')
          || this.getMetaValue(metadata, 'creation-date');

        const museum = this.getMetaValue(metadata, 'instalacao') || 'Brasiliana Museus';

        return {
          source: this.name,
          external_id: `brasiliana-${item.id || Date.now()}`,
          title: this.extractTitle(item),
          description: description || `Acervo: ${museum}`,
          url: item.url || this.baseUrl,
          provider: museum,
          match_score: 0.80,
          relation_type: 'closeMatch' as const,
          raw: item
        };
      });
    } catch (err) {
      console.warn('[Brasiliana] Fetch failed:', err);
      return [];
    }
  }

  private extractTitle(item: any): string {
    const metadata = item.data || {};
    const title = this.getMetaValue(metadata, 'title') 
      || this.getMetaValue(metadata, 'titulo')
      || this.getMetaValue(metadata, 'denominacao')
      || item.title?.rendered 
      || item.title;
      
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
    try {
      const url = `${this.baseUrl}${this.apiPath}/?perpage=1&exposer=json-flat`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
