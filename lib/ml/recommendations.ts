import { hybridSemanticSimilarity } from './similarity';

export type RelationType = 'broader' | 'narrower' | 'related';

interface Recommendation {
  target: string;
  type: RelationType;
  score: number;
}

/**
 * Recomenda relações entre um termo novo e termos existentes no acervo ou ontologias.
 */
export function recommendRelations(term: string, existingTerms: string[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  for (const existing of existingTerms) {
    const similarity = hybridSemanticSimilarity(term, existing);
    
    if (similarity > 0.85) {
      // Quase idênticos ou um contém o outro de forma forte
      if (term.length > existing.length && term.includes(existing)) {
        recommendations.push({ target: existing, type: 'narrower', score: similarity });
      } else if (existing.length > term.length && existing.includes(term)) {
        recommendations.push({ target: existing, type: 'broader', score: similarity });
      } else {
        recommendations.push({ target: existing, type: 'related', score: similarity });
      }
    } else if (similarity > 0.4) {
      recommendations.push({ target: existing, type: 'related', score: similarity });
    }
  }
  
  return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
}
