/**
 * Folksonomia Digital 2.0 — Conector Brasiliana Museus / Tainacan
 * 
 * Consulta o Agregador Oficial da Brasiliana Museus.
 */

import { ExternalMatch, OpenDataConnector } from './types';

export class BrasilianaConnector implements OpenDataConnector {
  name = 'Brasiliana Museus';
  private baseUrls = [
    'https://brasilianamuseus.cultura.gov.br',
    'https://brasiliana.museus.gov.br'
  ];
  private apiPath = '/wp-json/tainacan/v2/items';

  /**
   * Busca nos acervos da Brasiliana Museus.
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FolksonomiaDigital/2.0'
    };

    const queryParams = new URLSearchParams({
      perpage: '8',
      search: query,
      exposer: 'json-flat'
    });

    let items: any[] = [];

    for (const baseUrl of this.baseUrls) {
      try {
        const url = `${baseUrl}${this.apiPath}/?${queryParams}`;
        const res = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(10000)
        });

        if (res.ok) {
          const data = await res.json();
          items = data.items || (Array.isArray(data) ? data : []);
          if (items.length > 0) break;
        }
      } catch (err) {
        console.warn(`[Brasiliana] Error fetching ${baseUrl}:`, err);
      }
    }

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

  /**
   * Busca específica por Artigos, Livros ou Textos Teóricos na Brasiliana para embasamento conceitual.
   * Filtra itens cujo metadado indica publicação, livro, artigo ou documento teórico.
   */
  async searchTheoreticalText(query: string): Promise<ExternalMatch[]> {
    const theoreticalQueries = [
      `${query} publicação`,
      `${query} artigo`,
      `${query} livro`,
    ];

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
          metaStr.includes('catalogo') ||
          metaStr.includes('folclore') ||
          metaStr.includes('cultura popular') ||
          metaStr.includes('patrimonio') ||
          r.title.toLowerCase().includes('estudo') ||
          r.title.toLowerCase().includes('pesquisa') ||
          r.title.toLowerCase().includes('artigo') ||
          r.title.toLowerCase().includes('livro') ||
          r.title.toLowerCase().includes('publicação');

        if (isTheoretical) {
          seen.add(key);
          allResults.push({ ...r, match_score: 0.92, relation_type: 'exactMatch' });
        }
      }
    }

    // Fallback: se nenhum filtro teórico passou, retorna busca geral limitada
    if (allResults.length === 0) {
      return this.searchExternalSource(query);
    }

    return allResults.slice(0, 5);
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
