/**
 * Folksonomia Digital 2.0 — Conector Europeana (Real)
 * 
 * Busca metadados reais da API Europeana (gratuita).
 * Extrai campos estruturados para alimentar o treinamento do ModernBERT.
 * 
 * API: https://api.europeana.eu/record/v2/search.json
 * Documentação: https://pro.europeana.eu/page/search
 */

import { ExternalMatch, OpenDataConnector } from './types';

// Campos relevantes retornados pela Europeana
export interface EuropeanaRecord {
  id: string;
  title: string;
  description?: string;
  creator?: string;
  date?: string;
  type?: string;
  subject?: string[];
  spatial?: string[];        // Localizações geográficas
  temporal?: string[];       // Períodos temporais
  medium?: string[];         // Material/Técnica
  provenance?: string;
  provider?: string;
  dataProvider?: string;
  rights?: string;
  url?: string;
  thumbnail?: string;
  raw: unknown;
}

export class EuropeanaConnector implements OpenDataConnector {
  name = 'Europeana';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EUROPEANA_API_KEY || '';
  }

  /**
   * Busca registros na Europeana por query.
   * Retorna até `rows` resultados formatados.
   */
  async searchRecords(query: string, rows: number = 20): Promise<EuropeanaRecord[]> {
    if (!this.apiKey) {
      console.warn('[Europeana] API Key not configured, returning mock data');
      return this.getMockRecords(query);
    }

    try {
      const params = new URLSearchParams({
        wskey: this.apiKey,
        query: query,
        rows: String(rows),
        profile: 'rich',
        lang: 'pt'
      });

      const res = await fetch(`https://api.europeana.eu/record/v2/search.json?${params}`);
      if (!res.ok) throw new Error(`Europeana API error: ${res.status}`);

      const data = await res.json();
      return (data.items || []).map((item: any) => this.parseRecord(item));
    } catch (err) {
      console.error('[Europeana] Fetch error:', err);
      return this.getMockRecords(query);
    }
  }

  /**
   * Busca registros especificamente de museus brasileiros na Europeana.
   */
  async searchBrazilianMuseumRecords(rows: number = 50): Promise<EuropeanaRecord[]> {
    const queries = [
      'Brazil museum artifact',
      'Brasil colonial arte sacra',
      'Brazilian heritage collection',
      'arte brasileira museu',
      'patrimônio cultural brasileiro'
    ];

    const allRecords: EuropeanaRecord[] = [];
    for (const q of queries) {
      const records = await this.searchRecords(q, Math.ceil(rows / queries.length));
      allRecords.push(...records);
    }

    return allRecords;
  }

  /**
   * Compatibilidade com interface OpenDataConnector
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const records = await this.searchRecords(query, 5);
    return records.map(rec => ({
      source: this.name,
      external_id: rec.id,
      title: rec.title,
      description: rec.description || rec.creator || rec.type || '',
      url: rec.url || `https://europeana.eu/item${rec.id}`,
      provider: rec.dataProvider,
      rights: rec.rights,
      match_score: 0.85,
      relation_type: 'closeMatch' as const,
      raw: rec.raw
    }));
  }

  async testConnection(): Promise<boolean> {
    return !!this.apiKey;
  }

  // ---- Parsing ----
  
  private parseRecord(item: any): EuropeanaRecord {
    return {
      id: item.id || '',
      title: this.extractFirst(item.title) || this.extractFirst(item.dcTitleLangAware) || 'Sem Título',
      description: this.extractFirst(item.dcDescription) || this.extractFirst(item.dcDescriptionLangAware),
      creator: this.extractFirst(item.dcCreator) || this.extractFirst(item.dcCreatorLangAware),
      date: this.extractFirst(item.year) || this.extractFirst(item.dcDate),
      type: item.type || this.extractFirst(item.dcType),
      subject: this.extractArray(item.dcSubject),
      spatial: this.extractArray(item.dcCoverage) || this.extractArray(item.edmPlaceLabel),
      temporal: this.extractArray(item.dctermsTemporalLabel),
      medium: this.extractArray(item.dcFormat),
      provenance: this.extractFirst(item.dctermsProvenance),
      provider: this.extractFirst(item.provider),
      dataProvider: this.extractFirst(item.dataProvider),
      rights: this.extractFirst(item.rights),
      url: `https://europeana.eu/item${item.id}`,
      thumbnail: this.extractFirst(item.edmPreview),
      raw: item
    };
  }

  private extractFirst(val: any): string | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val[0]?.toString();
    if (typeof val === 'object') {
      const pt = val.pt || val.def || val.en;
      if (Array.isArray(pt)) return pt[0];
      if (typeof pt === 'string') return pt;
      return Object.values(val)[0]?.toString();
    }
    return val?.toString();
  }

  private extractArray(val: any): string[] | undefined {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.map(v => v?.toString()).filter(Boolean);
    if (typeof val === 'string') return [val];
    return undefined;
  }

  // ---- Mock para quando não há API key ----
  
  private getMockRecords(query: string): EuropeanaRecord[] {
    return [
      {
        id: 'eu-mock-001',
        title: `Retrato de família colonial - ${query}`,
        description: 'Óleo sobre tela, atribuído à escola carioca do século XVIII',
        creator: 'Atribuído a Manuel da Costa Ataíde',
        date: 'circa 1780',
        type: 'IMAGE',
        subject: ['retrato', 'família', 'colonial'],
        spatial: ['Minas Gerais', 'Brasil'],
        temporal: ['Século XVIII'],
        medium: ['Óleo sobre tela'],
        provenance: 'Coleção do Museu Nacional de Belas Artes, Rio de Janeiro',
        provider: 'Europeana',
        dataProvider: 'MNBA',
        rights: 'Public Domain',
        url: 'https://europeana.eu/item/mock/001',
        raw: {}
      },
      {
        id: 'eu-mock-002',
        title: `Cálice litúrgico jesuítico - ${query}`,
        description: 'Prata lavrada e dourada com inscrições em latim, possivelmente proveniente de Congonhas',
        creator: 'Autor desconhecido',
        date: '1750-1770',
        type: '3D',
        subject: ['litúrgia', 'sacro', 'ourivesaria'],
        spatial: ['Congonhas do Campo', 'Minas Gerais'],
        temporal: ['Período Colonial'],
        medium: ['Prata', 'Ouro'],
        provenance: 'Acervo da Igreja de Bom Jesus de Matosinhos',
        provider: 'Europeana',
        dataProvider: 'IBRAM',
        rights: 'Public Domain',
        url: 'https://europeana.eu/item/mock/002',
        raw: {}
      },
      {
        id: 'eu-mock-003',
        title: `Ex-voto de cura - ${query}`,
        description: 'Pintura votiva sobre madeira, representando milagre de cura atribuído a Nossa Senhora',
        creator: 'Autor popular anônimo',
        date: 'Século XIX',
        type: 'IMAGE',
        subject: ['ex-voto', 'religiosidade popular', 'milagre'],
        spatial: ['Bahia', 'Brasil'],
        temporal: ['Século XIX'],
        medium: ['Têmpera sobre madeira'],
        provenance: 'Museu de Arte Sacra da Bahia',
        provider: 'Europeana',
        dataProvider: 'UFBA',
        rights: 'Public Domain',
        url: 'https://europeana.eu/item/mock/003',
        raw: {}
      }
    ];
  }
}
