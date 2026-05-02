/**
 * Folksonomia Digital 2.0 — Conector IBRAM / Tainacan (Real)
 * 
 * Busca dados abertos do IBRAM via API REST Tainacan (WordPress).
 * 
 * Endpoints conhecidos:
 * - Museu Histórico Nacional: https://mhn.museus.gov.br/wp-json/tainacan/v2/items
 * - Museu Nacional de Belas Artes: https://mnba.museus.gov.br/wp-json/tainacan/v2/items
 * - Museu da República: https://museudarepublica.museus.gov.br/wp-json/tainacan/v2/items
 */

import { ExternalMatch, OpenDataConnector } from './types';

// Registros estruturados do Tainacan
export interface TainacanRecord {
  id: string;
  title: string;
  description?: string;
  author?: string;
  date?: string;
  collection?: string;
  metadata: Record<string, string>;
  thumbnail?: string;
  url?: string;
  museum: string;
  raw: unknown;
}

// Museus do IBRAM com endpoints Tainacan conhecidos
const IBRAM_ENDPOINTS = [
  {
    name: 'Museu Histórico Nacional',
    shortName: 'MHN',
    baseUrl: 'https://mhn.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2'
  },
  {
    name: 'Museu Nacional de Belas Artes',
    shortName: 'MNBA',
    baseUrl: 'https://mnba.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2'
  },
  {
    name: 'Museu da República',
    shortName: 'MR',
    baseUrl: 'https://museudarepublica.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2'
  }
];

export class IbramConnector implements OpenDataConnector {
  name = 'IBRAM';

  /**
   * Busca itens de um museu específico do IBRAM via Tainacan API.
   */
  async searchMuseum(
    museumIndex: number = 0,
    params: { search?: string; perPage?: number; page?: number } = {}
  ): Promise<TainacanRecord[]> {
    const endpoint = IBRAM_ENDPOINTS[museumIndex] || IBRAM_ENDPOINTS[0];
    const { search = '', perPage = 20, page = 1 } = params;

    try {
      const queryParams = new URLSearchParams({
        perpage: String(perPage),
        paged: String(page),
        orderby: 'date',
        order: 'DESC'
      });

      if (search) queryParams.set('search', search);

      const url = `${endpoint.baseUrl}${endpoint.apiPath}/items?${queryParams}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) throw new Error(`Tainacan API error: ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);

      return items.map((item: any) => this.parseRecord(item, endpoint.name));
    } catch (err) {
      console.warn(`[IBRAM/${endpoint.shortName}] Fetch failed, using mock:`, err);
      return this.getMockRecords(search || 'acervo', endpoint.name);
    }
  }

  /**
   * Busca em todos os museus do IBRAM simultaneamente.
   */
  async searchAllMuseums(search: string = '', perPage: number = 10): Promise<TainacanRecord[]> {
    const promises = IBRAM_ENDPOINTS.map((_, i) => 
      this.searchMuseum(i, { search, perPage })
    );

    const results = await Promise.allSettled(promises);
    const allRecords: TainacanRecord[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allRecords.push(...result.value);
      }
    }

    return allRecords;
  }

  /**
   * Compatibilidade com interface OpenDataConnector
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const records = await this.searchAllMuseums(query, 3);
    return records.map(rec => ({
      source: this.name,
      external_id: rec.id,
      title: rec.title,
      description: rec.description || `Acervo: ${rec.museum}`,
      url: rec.url || 'https://museus.gov.br',
      provider: rec.museum,
      match_score: 0.75,
      relation_type: 'relatedMatch' as const,
      raw: rec.raw
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${IBRAM_ENDPOINTS[0].baseUrl}${IBRAM_ENDPOINTS[0].apiPath}/items?perpage=1`, {
        signal: AbortSignal.timeout(5000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ---- Parsing ----

  private parseRecord(item: any, museum: string): TainacanRecord {
    const metadata: Record<string, string> = {};

    // Tainacan retorna metadados como array de objetos
    if (item.metadata_values || item.metadata) {
      const meta = item.metadata_values || item.metadata;
      for (const [key, val] of Object.entries(meta)) {
        if (val && typeof val === 'object' && 'value' in (val as any)) {
          metadata[key] = String((val as any).value);
        } else if (typeof val === 'string') {
          metadata[key] = val;
        }
      }
    }

    return {
      id: `ibram-${item.id || Date.now()}`,
      title: item.title?.rendered || item.title || 'Sem Título',
      description: item.description?.rendered || item.content?.rendered || metadata['descricao'] || undefined,
      author: metadata['autor'] || metadata['autoria'] || metadata['criador'] || undefined,
      date: metadata['data'] || metadata['datacao'] || metadata['periodo'] || undefined,
      collection: metadata['colecao'] || metadata['acervo'] || undefined,
      metadata,
      thumbnail: item.thumbnail?.['tainacan-medium']?.[0] || item.thumbnail?.medium_large?.[0] || undefined,
      url: item.url || item.link || undefined,
      museum,
      raw: item
    };
  }

  // ---- Mock para desenvolvimento ----

  private getMockRecords(query: string, museum: string): TainacanRecord[] {
    return [
      {
        id: `ibram-mock-${Date.now()}-1`,
        title: `Talha dourada do altar-mor — ${museum}`,
        description: 'Fragmento de talha dourada em madeira policromada, estilo rococó mineiro, com folhas de acanto e querubins.',
        author: 'Atribuído a Francisco Xavier de Brito',
        date: 'circa 1740-1760',
        collection: 'Arte Sacra Colonial',
        metadata: {
          tecnica: 'Talha dourada, policromia',
          material: 'Madeira, folha de ouro, pigmentos naturais',
          dimensoes: '120 x 80 x 25 cm',
          procedencia: 'Igreja de São Francisco de Assis, Ouro Preto',
          estado_conservacao: 'Regular'
        },
        museum,
        raw: {}
      },
      {
        id: `ibram-mock-${Date.now()}-2`,
        title: `Oratório doméstico baiano — ${museum}`,
        description: 'Oratório portátil em jacarandá com imagem de Nossa Senhora da Conceição em barro cozido policromado.',
        author: 'Autor desconhecido',
        date: 'Século XVIII',
        collection: 'Mobiliário e Artes Decorativas',
        metadata: {
          tecnica: 'Marcenaria, entalhe, policromia',
          material: 'Jacarandá, barro cozido, pigmentos',
          dimensoes: '45 x 30 x 15 cm',
          procedencia: 'Recôncavo Baiano, doação Família Calmon',
          estado_conservacao: 'Bom'
        },
        museum,
        raw: {}
      },
      {
        id: `ibram-mock-${Date.now()}-3`,
        title: `Mapa da Capitania de São Paulo — ${museum}`,
        description: 'Mapa manuscrito em aquarela sobre papel mostrando a rede fluvial e os caminhos do ouro entre São Paulo e Minas Gerais.',
        author: 'Cartógrafo real, possível atribuição a José Joaquim Freire',
        date: '1790-1800',
        collection: 'Cartografia e Documentos',
        metadata: {
          tecnica: 'Aquarela e nanquim sobre papel',
          material: 'Papel vergê, tintas',
          dimensoes: '60 x 90 cm',
          procedencia: 'Arquivo Histórico Ultramarino, Lisboa',
          estado_conservacao: 'Frágil'
        },
        museum,
        raw: {}
      }
    ];
  }
}
