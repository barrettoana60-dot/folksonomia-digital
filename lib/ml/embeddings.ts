/**
 * Motor de Embeddings Determinístico de 384 dimensões
 * Baseado em Hashing de Tokens para ambiente serverless sem dependências externas.
 */

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  
  // Unigramas
  const unigrams = norm.split(' ').filter(t => t.length > 2);
  
  // Bigramas para contexto
  const bigrams: string[] = [];
  const words = norm.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i+1]}`);
  }
  
  return [...unigrams, ...bigrams];
}

/**
 * Gera um vetor de 384 dimensões usando hashing de tokens.
 * Cada token "vota" em posições aleatórias (mas fixas por token) do vetor.
 */
export async function createLocalEmbedding(text: string): Promise<number[]> {
  const tokens = tokenize(text);
  const dimensions = 384;
  const vector = new Array(dimensions).fill(0);
  
  if (tokens.length === 0) return vector;

  for (const token of tokens) {
    // Usar uma semente determinística por token
    let seed = 0;
    for (let i = 0; i < token.length; i++) {
      seed = (seed << 5) - seed + token.charCodeAt(i);
      seed |= 0; // Convert to 32bit integer
    }

    // Cada token afeta N dimensões (ex: 8)
    for (let i = 0; i < 8; i++) {
      const pos = Math.abs((seed ^ (i * 0x517cc1b7)) % dimensions);
      const weight = (seed ^ (i * 0x9e3779b9)) > 0 ? 1 : -1;
      vector[pos] += weight;
    }
  }

  // Normalização L2 (Unit Vector)
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  
  return vector.map(v => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct; // Como são vetores unitários, o dot product é a similaridade de cosseno
}

export async function createCombinedEmbedding(values: string[]): Promise<number[]> {
  const vectors = await Promise.all(values.map(v => createLocalEmbedding(v)));
  const dimensions = 384;
  const combined = new Array(dimensions).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < dimensions; i++) {
      combined[i] += vec[i];
    }
  }
  
  const magnitude = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return combined;
  
  return combined.map(v => v / magnitude);
}
