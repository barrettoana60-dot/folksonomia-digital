import { ExternalMatch, OpenDataConnector } from './types';

export class EuropeanaConnector implements OpenDataConnector {
  name = 'Europeana';
  
  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const apiKey = process.env.EUROPEANA_API_KEY;
    if (!apiKey) {
      console.warn('Europeana API Key not configured.');
      // Return mock for demo purposes if key is missing, so it doesn't break
      return [
        {
          source: this.name,
          external_id: 'eu-mock-123',
          title: `Documento relacionado a ${query} (Mock)`,
          description: 'Metadado agregado da Europeana para interoperabilidade.',
          url: 'https://europeana.eu/item/mock',
          match_score: 0.85,
          relation_type: 'relatedMatch',
          raw: {}
        }
      ];
    }
    
    try {
      const res = await fetch(`https://api.europeana.eu/record/v2/search.json?wskey=${apiKey}&query=${encodeURIComponent(query)}&rows=3`);
      const data = await res.json();
      
      return (data.items || []).map((item: any) => ({
        source: this.name,
        external_id: item.id,
        title: item.title?.[0] || 'Sem Título',
        description: item.dcCreator?.[0] || item.type,
        url: `https://europeana.eu/item${item.id}`,
        provider: item.dataProvider?.[0],
        rights: item.rights?.[0],
        match_score: 0.9,
        relation_type: 'closeMatch',
        raw: item
      }));
    } catch (err) {
      console.error('Error fetching from Europeana:', err);
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    return !!process.env.EUROPEANA_API_KEY;
  }
}
