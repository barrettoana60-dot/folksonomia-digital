import { cosineSimilarity } from './similarity';

interface Nucleus {
  centroid: number[];
  tags: string[];
  theme: string;
}

/**
 * Agrupa tags em núcleos temáticos baseados nos vetores de 384 dimensões.
 * Utiliza uma versão simplificada de centroides.
 */
export function clusterTags(tags: { text: string, vector: number[] }[], existingNuclei: Nucleus[]): Nucleus[] {
  const result = [...existingNuclei];
  
  for (const tag of tags) {
    let bestMatch: Nucleus | null = null;
    let maxSim = -1;
    
    for (const nucleus of result) {
      const sim = cosineSimilarity(tag.vector, nucleus.centroid);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = nucleus;
      }
    }
    
    // Se a similaridade for alta o suficiente (> 0.7), adiciona ao núcleo existente
    if (bestMatch && maxSim > 0.7) {
      bestMatch.tags.push(tag.text);
      // Atualiza levemente o centroide (média móvel)
      bestMatch.centroid = bestMatch.centroid.map((val, i) => (val + tag.vector[i]) / 2);
    } else {
      // Cria um novo núcleo se não houver match
      result.push({
        centroid: tag.vector,
        tags: [tag.text],
        theme: 'Novo Núcleo'
      });
    }
  }
  
  return result;
}
