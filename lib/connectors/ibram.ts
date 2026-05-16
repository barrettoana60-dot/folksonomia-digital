/**
 * Folksonomia Digital 2.0 — Conector IBRAM / Tainacan (Real)
 * 
 * Busca dados abertos do IBRAM via API REST Tainacan (WordPress).
 * Utiliza endpoints reais com formato json-flat e mapper INBCM-IBRAM.
 * 
 * Museus incluídos:
 * - MART (Museu de Arte Religiosa e Tradicional) — arte sacra, cultura popular
 * - Museu Regional de Caeté — cultura popular, tradições locais
 * - Museu da Abolição — memória afro-brasileira
 * - Museu do Diamante — cultura material, mineração semântica
 * - Museu do Índio — cultura indígena (20.965 itens)
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
  material?: string;
  tecnica?: string;
  metadata: Record<string, string>;
  thumbnail?: string;
  url?: string;
  museum: string;
  raw: unknown;
}

// Museus do IBRAM com endpoints Tainacan confirmados
const IBRAM_ENDPOINTS = [
  {
    name: 'Museu de Arte Religiosa e Tradicional',
    shortName: 'MART',
    baseUrl: 'https://museudeartereligiosaetradicional.acervos.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 878,
    useINBCM: true,
    tematica: ['arte sacra', 'cultura popular', 'arte religiosa', 'tradição']
  },
  {
    name: 'Museu Regional de Caeté',
    shortName: 'MRC',
    baseUrl: 'https://museuregionaldecaete.acervos.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 848,
    useINBCM: true,
    tematica: ['cultura popular', 'tradições locais', 'saberes', 'fazeres', 'arte popular', 'afro-brasileiro']
  },
  {
    name: 'Museu de Arqueologia de Itaipu',
    shortName: 'MAI',
    baseUrl: 'https://museudearqueologiadeitaipu.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 94553,
    useINBCM: true,
    tematica: ['cultura popular', 'território', 'arqueologia']
  },
  {
    name: 'Museu da Abolição',
    shortName: 'MA',
    baseUrl: 'https://museudaabolicao.acervos.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 7,
    useINBCM: true,
    tematica: ['abolição', 'escravidão', 'resistência', 'memória afro-brasileira', 'objetos históricos']
  },
  {
    name: 'Museu do Diamante',
    shortName: 'MD',
    baseUrl: 'http://museudodiamante.acervos.museus.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 11603,
    useINBCM: true,
    tematica: ['cultura material', 'mineração', 'objetos', 'técnicas', 'materiais']
  },
  {
    name: 'Museu do Índio',
    shortName: 'MI',
    baseUrl: 'https://tainacan.museudoindio.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 471,
    useINBCM: false,
    tematica: ['indígena', 'etnografia', 'artesanato', 'ritual', 'cultura material indígena']
  },
  {
    name: 'Museu da Pessoa',
    shortName: 'MP',
    baseUrl: 'https://acervo.museudapessoa.org',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 1,
    useINBCM: false,
    tematica: ['história de vida', 'memória', 'relatos', 'depoimentos']
  },
  {
    name: 'Museu de Folclore Edison Carneiro',
    shortName: 'CNFCP',
    baseUrl: 'http://acervo.cnfcp.gov.br',
    apiPath: '/wp-json/tainacan/v2',
    collectionId: 1,
    useINBCM: true,
    tematica: ['folclore', 'cultura popular', 'artesanato', 'saberes']
  }
];

export class IbramConnector implements OpenDataConnector {
  name = 'IBRAM';

  /**
   * Busca itens de um museu específico do IBRAM via Tainacan API.
   * Utiliza o formato json-flat com mapper INBCM-IBRAM quando disponível.
   */
  async searchMuseum(
    museumIndex: number = 0,
    params: { search?: string; perPage?: number; page?: number } = {}
  ): Promise<TainacanRecord[]> {
    const endpoint = IBRAM_ENDPOINTS[museumIndex] || IBRAM_ENDPOINTS[0];
    const { search = '', perPage = 10, page = 1 } = params;

    try {
      const queryParams = new URLSearchParams({
        perpage: String(perPage),
        paged: String(page),
        order: 'DESC',
        orderby: 'date',
        exposer: 'json-flat'
      });

      if (endpoint.useINBCM) {
        queryParams.set('mapper', 'inbcm-ibram');
      }

      if (search) queryParams.set('search', search);

      const url = `${endpoint.baseUrl}${endpoint.apiPath}/collection/${endpoint.collectionId}/items/?${queryParams}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        console.warn(`[IBRAM/${endpoint.shortName}] HTTP ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items = data.items || (Array.isArray(data) ? data : []);

      return items.map((item: any) => this.parseRecord(item, endpoint));
    } catch (err) {
      console.warn(`[IBRAM/${endpoint.shortName}] Fetch failed:`, err);
      return [];
    }
  }

  /**
   * Busca em todos os museus do IBRAM simultaneamente.
   */
  async searchAllMuseums(search: string = '', perPage: number = 5): Promise<TainacanRecord[]> {
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
    const records = await this.searchAllMuseums(query, 5);
    return records.map(rec => ({
      source: this.name,
      external_id: rec.id,
      title: rec.title,
      description: rec.description || `Acervo: ${rec.museum}`,
      url: rec.url || 'https://museus.gov.br',
      provider: rec.museum,
      match_score: 0.85,
      relation_type: 'relatedMatch' as const,
      raw: rec.raw
    }));
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${IBRAM_ENDPOINTS[0].baseUrl}${IBRAM_ENDPOINTS[0].apiPath}/collection/${IBRAM_ENDPOINTS[0].collectionId}/items/?perpage=1&exposer=json-flat`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retorna informações sobre os museus disponíveis.
   */
  getMuseums() {
    return IBRAM_ENDPOINTS.map(e => ({
      name: e.name,
      shortName: e.shortName,
      tematica: e.tematica,
      collectionId: e.collectionId
    }));
  }

  // ---- Parsing ----

  private parseRecord(item: any, endpoint: typeof IBRAM_ENDPOINTS[0]): TainacanRecord {
    const metadata: Record<string, string> = {};

    // Formato INBCM (json-flat com mapper inbcm-ibram)
    if (item.data && typeof item.data === 'object') {
      for (const [key, val] of Object.entries(item.data)) {
        if (val && typeof val === 'object' && 'value' in (val as any)) {
          const v = (val as any).value;
          if (v && typeof v === 'string' && v.trim()) {
            metadata[key] = v.trim();
          }
        }
      }
    }

    // Tainacan padrão (sem INBCM)
    if (item.metadata_values || item.metadata) {
      const meta = item.metadata_values || item.metadata;
      for (const [key, val] of Object.entries(meta)) {
        if (val && typeof val === 'object' && 'value' in (val as any)) {
          const v = String((val as any).value);
          if (v.trim()) metadata[key] = v.trim();
        } else if (typeof val === 'string' && val.trim()) {
          metadata[key] = val.trim();
        }
      }
    }

    // Extrair título — vários formatos possíveis
    const title = metadata['title-2'] 
      || metadata['title-4']
      || metadata['denominacao']
      || item.title?.rendered 
      || item.title 
      || 'Sem Título';

    // Extrair descrição
    const description = metadata['resumo-descritivo']
      || metadata['description-4']
      || item.description?.rendered
      || item.content?.rendered
      || metadata['descricao']
      || undefined;

    // Extrair autor
    const author = metadata['autor-2']
      || metadata['artesao-3']
      || metadata['autor']
      || metadata['autoria']
      || metadata['criador']
      || undefined;

    // Extrair data
    const date = metadata['seculo-de-pruducao']
      || metadata['ano-de-producao']
      || metadata['texto-simples']
      || metadata['data']
      || metadata['datacao']
      || metadata['periodo']
      || undefined;

    return {
      id: `ibram-${endpoint.shortName.toLowerCase()}-${item.id || Date.now()}`,
      title: typeof title === 'string' ? title : String(title),
      description,
      author,
      date,
      collection: metadata['colecao'] || metadata['categoria'] || metadata['categoria-3'] || undefined,
      material: metadata['material'] || metadata['materia-primarevisada'] || undefined,
      tecnica: metadata['tecnica'] || metadata['tecnica-de-confeccao-3'] || undefined,
      metadata,
      thumbnail: Array.isArray(item.thumbnail) ? item.thumbnail[0] : (item.document?.value || undefined),
      url: item.url || item.link || undefined,
      museum: endpoint.name,
      raw: item
    };
  }
}
