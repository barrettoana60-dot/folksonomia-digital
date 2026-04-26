import { normalizeText } from '../core/normalize';

/**
 * Tokeniza um texto em palavras, bigramas, etc. para gerar uma representação semântica rica.
 * Emula a tokenização de um motor ML simples localmente.
 */
export function tokenizeText(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];

  const words = norm.split(/\s+/).filter(w => w.length > 0);
  const tokens = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    tokens.add(word);

    // Prefixos e sufixos
    for (let size = 1; size <= Math.min(word.length, 10); size++) {
      tokens.add(word.substring(0, size));
    }
    for (let size = 1; size <= Math.min(word.length, 6); size++) {
      tokens.add(word.substring(word.length - size));
    }

    // N-gramas de caracteres internos (apenas para palavras um pouco maiores)
    if (word.length > 3) {
      for (let n = 2; n <= Math.min(5, word.length); n++) {
        for (let j = 0; j <= word.length - n; j++) {
          tokens.add(word.substring(j, j + n));
        }
      }
    }

    // Bigramas e trigramas de palavras
    if (i + 1 < words.length) {
      tokens.add(`${words[i]} ${words[i + 1]}`);
    }
    if (i + 2 < words.length) {
      tokens.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return Array.from(tokens);
}

/**
 * Gera um embedding local determinístico de 384 dimensões usando hashing de tokens.
 * Esta é uma solução ultraleve para Vercel sem o uso do pesado Transformers.js,
 * garantindo compatibilidade perfeita com a coluna VECTOR(384) do Supabase pgvector.
 */
export async function createLocalEmbedding(text: string): Promise<number[]> {
  const tokens = tokenizeText(text);
  const vec = new Array(384).fill(0);

  // Se o texto for vazio, retorna vetor zerado (ou próximo disso)
  if (tokens.length === 0) {
    return vec;
  }

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Garantir índice positivo entre 0 e 383
    const index = Math.abs(hash) % 384;
    
    // Adicionar um peso baseado no tamanho do token (tokens maiores = mais significativos)
    const weight = Math.min(1.0, token.length / 5.0);
    vec[index] += weight;
    
    // Espalhar a energia para vizinhos criando sobreposição
    const neighborIdx1 = (index + 1) % 384;
    const neighborIdx2 = Math.abs(index - 1) % 384;
    vec[neighborIdx1] += weight * 0.3;
    vec[neighborIdx2] += weight * 0.3;
  }

  // L2 Normalization (garante que a distância de cosseno funcione perfeitamente no banco)
  let sumSquares = 0;
  for (let i = 0; i < 384; i++) {
    sumSquares += vec[i] * vec[i];
  }
  
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude === 0) return vec;
  
  for (let i = 0; i < 384; i++) {
    vec[i] = vec[i] / magnitude;
  }

  return vec;
}

/**
 * Cria um embedding combinado a partir de múltiplas fontes textuais (ex: título + tags + descrição)
 */
export async function createCombinedEmbedding(values: string[]): Promise<number[]> {
  const combinedText = values.join(' . ');
  return createLocalEmbedding(combinedText);
}
