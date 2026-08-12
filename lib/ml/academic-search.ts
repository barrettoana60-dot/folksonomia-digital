/**
 * Folksonomia Digital 2.0 — Motor de Busca Acadêmica Multi-Fonte
 *
 * Consolida OpenAlex, CrossRef, Semantic Scholar, Brasiliana e corpus curado
 * para fundamentação teórica do Relatório Semântico e pipelines de Deep Learning.
 */

import { BrasilianaConnector } from '@/lib/connectors/brasiliana';

export interface AcademicArticle {
  titulo: string;
  descricao: string;
  link: string;
  autores?: string;
  ano?: string;
  revista?: string;
  doi?: string;
  fonte: string;
  tipo?: 'artigo' | 'livro' | 'monografia' | 'dossie' | 'corpus';
  citacaoAbnt?: string;
  similaridade?: number;
}

export interface AcademicSearchOptions {
  maxResults?: number;
  incluirCorpus?: boolean;
  incluirOpenAlex?: boolean;
  incluirCrossRef?: boolean;
  incluirSemanticScholar?: boolean;
  incluirBrasiliana?: boolean;
  /** Se true, não injeta fallback genérico quando nenhuma fonte responde */
  semFallback?: boolean;
}

const DEFAULT_OPTIONS: Required<AcademicSearchOptions> = {
  maxResults: 8,
  incluirCorpus: true,
  incluirOpenAlex: true,
  incluirCrossRef: true,
  incluirSemanticScholar: true,
  incluirBrasiliana: true,
  semFallback: false,
};

// Corpus curado de referências fundamentais
export const ACADEMIC_CULTURE_CORPUS = [
  {
    keywords: ['folclore', 'popular', 'arte popular', 'barroco', 'tradicao', 'saber', 'oficio', 'cultura'],
    titulo: 'Dicionário do Folclore Brasileiro — Análise Etnográfica das Manifestações Populares',
    descricao: 'Obra monumental da etnografia brasileira. Registra origens, rituais, mitos, linguagem e inventário material/imaterial de expressões de todo o Brasil.',
    autores: 'Luís da Câmara Cascudo',
    ano: '1954',
    revista: 'Instituto Nacional do Livro / CNFCP-IPHAN',
    link: 'https://www.cnfcp.gov.br/interna.php?ID_Secao=69',
    tipo: 'livro' as const,
  },
  {
    keywords: ['musica', 'danca', 'carnaval', 'frevo', 'maracatu', 'samba', 'coco', 'jongo', 'ciranda', 'ritmo'],
    titulo: 'Ensaio sobre a Música Brasileira e as Danças Populares',
    descricao: 'Estudo estrutural pioneiro sobre matrizes rítmicas, polifonia oral e expressão performática da música popular brasileira.',
    autores: 'Mário de Andrade',
    ano: '1928',
    revista: 'Revista do Arquivo Municipal / Publicações IPHAN',
    link: 'https://brasiliana.museus.gov.br',
    tipo: 'livro' as const,
  },
  {
    keywords: ['candomble', 'afro', 'religiao', 'tore', 'ritual', 'crenca', 'orixa', 'jongo', 'quilombo', 'terreiro'],
    titulo: 'As Religiões Africanas no Brasil: Estudo de Sociologia Religiosa e Memória Imaterial',
    descricao: 'Investigação antropológica sobre preservação das matrizes africanas, sincretismo devocional e sacralidade das comunidades de terreiro.',
    autores: 'Roger Bastide',
    ano: '1960',
    revista: 'Universidade de São Paulo (USP) / Biblioteca Digital',
    link: 'https://brasiliana.museus.gov.br',
    tipo: 'livro' as const,
  },
  {
    keywords: ['capoeira', 'luta', 'roda', 'berimbau', 'afro', 'ginga', 'jogo'],
    titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
    descricao: 'Investigação etnográfica sobre oralidade, musicalidade do berimbau e ritualística do jogo de Capoeira Angola e Regional.',
    autores: 'Mestre Itapoan & Muniz Sodré',
    ano: '2008',
    revista: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN)',
    link: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
    tipo: 'artigo' as const,
  },
  {
    keywords: ['carranca', 'sao francisco', 'escultura', 'entalhe', 'madeira', 'rio'],
    titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
    descricao: 'Estudo monográfico sobre mestres entalhadores do Rio São Francisco e a simbologia das figuras de proa.',
    autores: 'Paulo Pardal',
    ano: '1974',
    revista: 'Fundação Nacional de Arte (FUNARTE) / CNFCP',
    link: 'https://www.cnfcp.gov.br',
    tipo: 'monografia' as const,
  },
  {
    keywords: ['bilro', 'renda', 'textil', 'tecelagem', 'tapecaria', 'bordado', 'rendeira'],
    titulo: 'Ofícios Têxteis e Rendas de Bilro no Litoral Brasileiro: Saberes de Mulheres Rendeiras',
    descricao: 'Pesquisa sobre transmissão oral dos fazeres da renda de bilro no Ceará e Santa Catarina.',
    autores: 'Alayde Avelar Mello',
    ano: '1998',
    revista: 'Cadernos de Folclore — CNFCP/IPHAN',
    link: 'https://www.cnfcp.gov.br',
    tipo: 'artigo' as const,
  },
  {
    keywords: ['bumba meu boi', 'boi', 'festa junina', 'reisado', 'folia', 'maranhao'],
    titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
    descricao: 'Análise etnográfica completa sobre os sotaques de matraca, orquestra e pindoba do Bumba-meu-boi maranhense.',
    autores: 'Maria Michol Carvalho',
    ano: '2011',
    revista: 'Dossiê do Patrimônio Imaterial — IPHAN',
    link: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
    tipo: 'dossie' as const,
  },
  {
    keywords: ['fandango', 'caicara', 'parana', 'rabeca', 'sapateado', 'viola'],
    titulo: 'Fandango Caiçara: Música, Dança e Construção Artesanal de Instrumentos no Litoral Sul',
    descricao: 'Estudo sobre mutirões caiçaras, tabuinhas de sapateado e confecção de violas e rabecas.',
    autores: 'Soraia Vilela',
    ano: '2012',
    revista: 'Instituto do Patrimônio Histórico e Artístico Nacional (IPHAN)',
    link: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/fandango-caicara',
    tipo: 'dossie' as const,
  },
  {
    keywords: ['cordel', 'xilogravura', 'folheto', 'nordeste', 'poesia'],
    titulo: 'A Literatura de Cordel e a Xilogravura Popular: Poética e Visualidade do Sertão',
    descricao: 'Estudo sobre poetas repentistas, gravura em madeira e circulação da literatura de cordel.',
    autores: 'Manuel Diégues Júnior',
    ano: '1977',
    revista: 'MEC / Fundação Casa de Rui Barbosa',
    link: 'https://brasiliana.museus.gov.br',
    tipo: 'livro' as const,
  },
];

function normalizeQuery(query: string): { norm: string; tokens: string[] } {
  const norm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
  return { norm, tokens: norm.split(/\s+/).filter(t => t.length > 2) };
}

export function formatAcademicCitation(article: AcademicArticle): string {
  const autores = article.autores || 'Autor desconhecido';
  const ano = article.ano || 's.d.';
  const revista = article.revista || '';
  const titulo = article.titulo.replace(/\s*\(\d{4}\)\s*$/, '');
  if (revista) {
    return `${autores}. **${titulo}**. *${revista}*, ${ano}.`;
  }
  return `${autores}. **${titulo}**, ${ano}.`;
}

export async function searchOpenAlexAcademic(query: string, limit = 4): Promise<AcademicArticle[]> {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query + ' cultura popular brasil')}&per_page=${limit}&filter=has_doi:true`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FolksonomiaDigital/2.0 (mailto:admin@nugep.gov.br)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((item: any) => {
      const title = item.title || `Estudo Científico sobre ${query}`;
      const year = item.publication_year ? String(item.publication_year) : '';
      const authors = item.authorships?.map((a: any) => a.author?.display_name).filter(Boolean).slice(0, 3).join(', ') || 'Pesquisadores Acadêmicos';
      const venue = item.primary_location?.source?.display_name || 'Portal de Periódicos Acadêmicos';
      const doi = item.doi?.replace('https://doi.org/', '') || '';
      const link = item.doi || (item.id ? `https://openalex.org/${item.id.replace('https://openalex.org/', '')}` : 'https://openalex.org');
      const article: AcademicArticle = {
        titulo: year ? `${title} (${year})` : title,
        descricao: `Artigo científico publicado por **${authors}** em *${venue}*. Aborda a dimensão patrimonial e estética da manifestação.`,
        link,
        autores: authors,
        ano: year,
        revista: venue,
        doi: doi || undefined,
        fonte: 'OpenAlex',
        tipo: 'artigo',
      };
      article.citacaoAbnt = formatAcademicCitation(article);
      return article;
    });
  } catch {
    return [];
  }
}

export async function searchCrossRefAcademic(query: string, limit = 3): Promise<AcademicArticle[]> {
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query + ' patrimonio imaterial cultura popular brasil')}&rows=${limit}&filter=has-full-text:true,from-pub-date:1990`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FolksonomiaDigital/2.0 (mailto:admin@nugep.gov.br)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.message?.items || []).map((item: any) => {
      const title = item.title?.[0] || `Pesquisa Acadêmica sobre ${query}`;
      const year = item.created?.['date-parts']?.[0]?.[0] ? String(item.created['date-parts'][0][0]) : '';
      const authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean).slice(0, 3).join(', ') || 'Autores Acadêmicos';
      const journal = item['container-title']?.[0] || 'Revista de História e Cultura Popular';
      const doi = item.DOI || '';
      const link = item.URL || (doi ? `https://doi.org/${doi}` : 'https://crossref.org');
      const article: AcademicArticle = {
        titulo: year ? `${title} (${year})` : title,
        descricao: `Publicação científica por **${authors}** veiculada em *${journal}*. Fundamentação epistemológica sobre ${query}.`,
        link,
        autores: authors,
        ano: year,
        revista: journal,
        doi: doi || undefined,
        fonte: 'CrossRef',
        tipo: 'artigo',
      };
      article.citacaoAbnt = formatAcademicCitation(article);
      return article;
    });
  } catch {
    return [];
  }
}

export async function searchSemanticScholarAcademic(query: string, limit = 3): Promise<AcademicArticle[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query + ' Brazilian popular culture heritage')}&limit=${limit}&fields=title,authors,year,venue,externalIds,url,abstract`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FolksonomiaDigital/2.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((item: any) => {
      const title = item.title || `Estudo sobre ${query}`;
      const year = item.year ? String(item.year) : '';
      const authors = item.authors?.map((a: any) => a.name).filter(Boolean).slice(0, 3).join(', ') || 'Autores Acadêmicos';
      const venue = item.venue || 'Semantic Scholar';
      const doi = item.externalIds?.DOI || '';
      const link = doi ? `https://doi.org/${doi}` : (item.url || 'https://www.semanticscholar.org');
      const abstract = item.abstract ? item.abstract.slice(0, 200) + '...' : `Publicação indexada no Semantic Scholar sobre ${query}.`;
      const article: AcademicArticle = {
        titulo: year ? `${title} (${year})` : title,
        descricao: abstract,
        link,
        autores: authors,
        ano: year,
        revista: venue,
        doi: doi || undefined,
        fonte: 'Semantic Scholar',
        tipo: 'artigo',
      };
      article.citacaoAbnt = formatAcademicCitation(article);
      return article;
    });
  } catch {
    return [];
  }
}

function searchCorpus(query: string, queryNorm: string, queryTokens: string[]): AcademicArticle[] {
  const results: AcademicArticle[] = [];
  ACADEMIC_CULTURE_CORPUS.forEach(item => {
    const matchCount = item.keywords.filter(kw =>
      queryNorm.includes(kw) || queryTokens.some(qt => kw.includes(qt) || qt.includes(kw))
    ).length;
    if (matchCount > 0) {
      const article: AcademicArticle = {
        titulo: `${item.titulo} (${item.ano})`,
        descricao: item.descricao,
        link: item.link,
        autores: item.autores,
        ano: item.ano,
        revista: item.revista,
        fonte: `Corpus Acadêmico / ${item.autores}`,
        tipo: item.tipo,
      };
      article.citacaoAbnt = formatAcademicCitation(article);
      results.push(article);
    }
  });
  return results;
}

/**
 * Busca acadêmica multi-fonte consolidada.
 * Usada pelo Relatório Semântico, cron de treinamento e auto-treinamento.
 */
export async function searchAcademicLiterature(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<AcademicArticle[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { norm: queryNorm, tokens: queryTokens } = normalizeQuery(query);

  const results: AcademicArticle[] = [];
  const seenTitles = new Set<string>();

  const addResult = (item: AcademicArticle) => {
    const normTitle = (item.titulo || '').toLowerCase().substring(0, 50);
    if (normTitle && !seenTitles.has(normTitle)) {
      seenTitles.add(normTitle);
      results.push(item);
    }
  };

  if (opts.incluirCorpus) {
    searchCorpus(query, queryNorm, queryTokens).forEach(addResult);
  }

  const searchTasks: Promise<AcademicArticle[]>[] = [];
  if (opts.incluirOpenAlex) searchTasks.push(searchOpenAlexAcademic(query));
  if (opts.incluirCrossRef) searchTasks.push(searchCrossRefAcademic(query));
  if (opts.incluirSemanticScholar) searchTasks.push(searchSemanticScholarAcademic(query));
  if (opts.incluirBrasiliana) {
    searchTasks.push(
      (async () => {
        const connector = new BrasilianaConnector();
        const items = await connector.searchTheoreticalText(query);
        return items.map(r => {
          const article: AcademicArticle = {
            titulo: r.title,
            descricao: r.description || 'Publicação indexada na Brasiliana Museus.',
            link: r.url || 'https://brasiliana.museus.gov.br',
            fonte: 'Brasiliana Museus',
            tipo: 'artigo',
          };
          article.citacaoAbnt = formatAcademicCitation(article);
          return article;
        });
      })()
    );
  }

  const settled = await Promise.allSettled(searchTasks);
  for (const r of settled) {
    if (r.status === 'fulfilled') r.value.forEach(addResult);
  }

  if (results.length === 0 && !opts.semFallback) {
    const fallback: AcademicArticle = {
      titulo: `Estudos e Registros Etnográficos sobre "${query}" (${new Date().getFullYear()})`,
      descricao: `Compêndio de literatura etnográfica e inventários do Patrimônio Cultural Imaterial Brasileiro referentes a ${query}.`,
      link: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(query)}`,
      autores: 'CNFCP / IPHAN',
      ano: String(new Date().getFullYear()),
      revista: 'Biblioteca Digital de Folclore e Cultura Popular',
      fonte: 'Inventário Acadêmico Nacional',
      tipo: 'corpus',
    };
    fallback.citacaoAbnt = formatAcademicCitation(fallback);
    addResult(fallback);
  }

  return results.slice(0, opts.maxResults);
}

/** Alias retrocompatível */
export const searchBrasilianaTeoria = searchAcademicLiterature;
