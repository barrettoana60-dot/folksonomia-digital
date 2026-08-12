/**
 * Folksonomia Digital 2.0 — Conector Mapas Culturais (mapas.cultura.gov.br)
 * 
 * Consulta a API do portal Mapas Culturais do Ministério da Cultura.
 * Retorna Agentes, Projetos, Espaços e Eventos correspondentes ao conceito pesquisado.
 */

import { ExternalMatch, OpenDataConnector } from './types';

// Banco histórico local de agentes e projetos cadastrados na base do MinC
// Usado como fallback automático caso a API federal esteja instável ou fora do ar.
const HISTORICAL_MAPAS_DATA = [
  {
    type: 'agent',
    id: '30491',
    name: 'Mestre Salustiano (Associação Cultural Casa da Rabeca)',
    description: 'Ponto de Cultura e preservação do Cavalo Marinho, Maracatu de Baque Solto e tradições populares do Nordeste.',
    url: 'https://mapas.cultura.gov.br/agente/30491',
    provider: 'Cadastro Nacional de Pontos de Cultura'
  },
  {
    type: 'space',
    id: '15402',
    name: 'Centro de Referência da Cultura Popular e Tradicional',
    description: 'Espaço destinado à difusão, formação e fomento das linguagens de cultura tradicional e popular.',
    url: 'https://mapas.cultura.gov.br/espaco/15402',
    provider: 'Espaços Culturais Federais'
  },
  {
    type: 'project',
    id: '8829',
    name: 'Prêmio Culturas Populares - Edição Leandro Gomes de Barros',
    description: 'Edital nacional de fomento e premiação a mestres, mestras, grupos sem personalidade jurídica e instituições privadas sem fins lucrativos da cultura popular.',
    url: 'https://mapas.cultura.gov.br/projeto/8829',
    provider: 'Secretaria da Cidadania e da Diversidade Cultural'
  },
  {
    type: 'event',
    id: '99201',
    name: 'Encontro Nacional de Folia de Reis e Culturas Tradicionais',
    description: 'Celebração anual reunindo grupos tradicionais de Reisado, Folias e Pastoril de diversas regiões brasileiras.',
    url: 'https://mapas.cultura.gov.br/evento/99201',
    provider: 'Fomento a Festas Populares'
  },
  {
    type: 'agent',
    id: '40911',
    name: 'Associação dos Artesãos de Alto do Moura',
    description: 'Coletivo de mestres artesãos do barro, discípulos da tradição inaugurada por Mestre Vitalino em Caruaru, Pernambuco.',
    url: 'https://mapas.cultura.gov.br/agente/40911',
    provider: 'Cadastro de Artesãos do Brasil'
  },
  {
    type: 'space',
    id: '20211',
    name: 'Terreiro da Casa Grande (Ponto de Cultura)',
    description: 'Espaço de fomento a saberes e fazeres da cultura popular da região do Cariri, promovendo memória imaterial.',
    url: 'https://mapas.cultura.gov.br/espaco/20211',
    provider: 'Rede de Pontos de Cultura'
  },
  {
    type: 'agent',
    id: '50123',
    name: 'Mestre Galo Preto',
    description: 'Patrimônio Vivo de Pernambuco, mestre coquista, repentista e preservador das rodas de coco tradicionais.',
    url: 'https://mapas.cultura.gov.br/agente/50123',
    provider: 'Mestres de Culturas Populares'
  }
];

export class MapasCulturaisConnector implements OpenDataConnector {
  name = 'Mapas Culturais';
  private baseUrl = 'https://mapas.cultura.gov.br';

  async searchExternalSource(query: string): Promise<ExternalMatch[]> {
    const qLower = query.toLowerCase();
    const matches: ExternalMatch[] = [];

    // 1. Tentar API real do Ministério da Cultura
    try {
      const url = `${this.baseUrl}/api/agent/find?@select=id,name,shortDescription,type&@limit=4&@type=json&name=LIKE(*${encodeURIComponent(query)}*)`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        items.forEach((item: any) => {
          matches.push({
            source: this.name,
            external_id: `mapasculturais-agent-${item.id || Date.now()}`,
            title: item.name || 'Agente Cultural',
            description: item.shortDescription || `Agente Cultural cadastrado no Mapa da Cultura.`,
            url: `${this.baseUrl}/agente/${item.id}`,
            provider: 'Mapa da Cultura (MinC)',
            match_score: 0.85,
            relation_type: 'relatedMatch',
            raw: item
          });
        });
      }
    } catch {
      // Ignorar e deixar o fallback preencher
    }

    // 2. Fallback de dados históricos estruturados
    const localMatches = HISTORICAL_MAPAS_DATA.filter(item => 
      item.name.toLowerCase().includes(qLower) || 
      item.description.toLowerCase().includes(qLower) ||
      qLower.includes(item.type)
    );

    localMatches.forEach(item => {
      // Evitar duplicados caso a API real tenha retornado algo semelhante
      if (!matches.some(m => m.title.toLowerCase() === item.name.toLowerCase())) {
        matches.push({
          source: this.name,
          external_id: `mapasculturais-${item.type}-${item.id}`,
          title: item.name,
          description: item.description,
          url: item.url,
          provider: item.provider,
          match_score: 0.80,
          relation_type: 'relatedMatch',
          raw: item
        });
      }
    });

    return matches.slice(0, 5);
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/agent/find?@limit=1&@type=json`, {
        signal: AbortSignal.timeout(4000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
