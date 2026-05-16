/**
 * Folksonomia Digital 2.0 — Conector Brasiliana Museus / Tainacan
 * 
 * Wrapper sobre o IbramConnector que filtra museus com temática
 * Brasiliana (cultura popular, memória, patrimônio imaterial).
 * 
 * Não utiliza mais a BNDigital (WordPress posts/pages).
 * Todas as buscas passam pelo Tainacan real.
 */

import { ExternalMatch, OpenDataConnector } from './types';
import { IbramConnector, TainacanRecord } from './ibram';

export class BrasilianaConnector implements OpenDataConnector {
  name = 'Brasiliana Museus';
  private ibram = new IbramConnector();

  /**
   * Busca nos acervos Tainacan com temática Brasiliana.
   * Reutiliza o IbramConnector, mas apresenta resultados
   * como vindos da rede Brasiliana Museus.
   */
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const records = await this.ibram.searchAllMuseums(query, 3);
    
    // Deduplicar por título
    const seen = new Set<string>();
    const unique = records.filter(r => {
      const key = r.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 5).map(rec => ({
      source: this.name,
      external_id: rec.id,
      title: rec.title,
      description: rec.description || `Acervo: ${rec.museum}`,
      url: rec.url || 'https://museus.gov.br',
      provider: `${rec.museum} / Brasiliana Museus`,
      match_score: 0.80,
      relation_type: 'closeMatch' as const,
      raw: rec.raw
    }));
  }

  async testConnection(): Promise<boolean> {
    return this.ibram.testConnection();
  }
}
