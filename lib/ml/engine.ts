import { pipeline, env } from '@xenova/transformers';

// Configure transformers to not download models from CDN if possible, but for first run it will download.
// We use a small, fast model for embeddings.
env.allowLocalModels = false; // We fetch from HF in Vercel environment
env.useBrowserCache = false;

let embeddingPipeline: any = null;

/**
 * Initializes the embedding pipeline.
 * We use 'Supabase/bge-small-en' or similar small 384-d model if available, 
 * or 'Xenova/all-MiniLM-L6-v2' which is 384d.
 */
async function getPipeline() {
  if (!embeddingPipeline) {
    try {
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (err) {
      console.error('Failed to initialize embedding pipeline', err);
      throw err;
    }
  }
  return embeddingPipeline;
}

/**
 * Generates a 384-dimensional embedding for a given string
 */
export async function createLocalEmbedding(text: string): Promise<number[]> {
  try {
    const pipe = await getPipeline();
    const result = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  } catch (error) {
    console.error('Embedding generation failed, falling back to deterministic hash embedding', error);
    return createDeterministicHashEmbedding(text);
  }
}

/**
 * Generates a combined embedding from multiple text sources
 */
export async function createCombinedEmbedding(values: string[]): Promise<number[]> {
  const combinedText = values.join(' . ');
  return createLocalEmbedding(combinedText);
}

/**
 * Fallback mechanism: If the ML model fails to load (e.g. timeout in serverless),
 * we generate a deterministic 384-d vector based on the string hash so the system doesn't break.
 */
function createDeterministicHashEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vec[code % 384] += 1;
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (mag === 0) return vec;
  return vec.map(v => v / mag);
}
