import { hybridSemanticSimilarity } from './similarity';

interface ExternalResult {
  source: string;
  title: string;
  relevance: number;
  metadata: any;
}

/**
 * Ordena e filtra resultados vindos de fontes externas como Europeana e IBRAM.
 * Garante que apenas o que é semanticamente relevante chegue à interface.
 */
export function rankOpenData(tag: string, results: ExternalResult[]): ExternalResult[] {
  return results
    .map(res => ({
      ...res,
      score: hybridSemanticSimilarity(tag, res.title) * 0.7 + (res.relevance * 0.3)
    }))
    .filter(res => (res.score || 0) > 0.35)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}
