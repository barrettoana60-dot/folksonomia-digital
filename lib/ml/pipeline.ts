import { normalizeText, tokenize } from '../core/normalize';
import { createLocalEmbedding } from './engine';
import { suggestConceptsFromOntologies } from './ontology-matcher';
import { encryptPayload, generateSignature } from '../core/crypto';
import { calculateConfidence, calculateNovelty, calculateResonance, calculateTension } from './scoring';

export async function runSemanticPipeline(tag: string, obraId: string, contextoObra: string = '') {
  // 1. Normalization
  const normalized = normalizeText(tag);
  
  // 2. Embedding Generation (Vectorization)
  const embedding = await createLocalEmbedding(normalized);
  
  // 3. Ontology Matching
  const ontologies = suggestConceptsFromOntologies(normalized);
  
  // 4. Crypto sealing
  const payload = { tag, normalized, obraId, timestamp: new Date().toISOString() };
  const encryptedPayload = encryptPayload(payload);
  const signature = generateSignature(payload);
  
  // 5. Scoring
  const confidence = calculateConfidence(1, ontologies.length > 0, false);
  const novelty = calculateNovelty(ontologies.length > 0, 0.2); // mock similarity
  
  // Dummy institutional vector to calculate tension (in real app, fetched from Obra)
  const dummyInstVector = await createLocalEmbedding(contextoObra || 'arte');
  const tension = calculateTension(embedding, dummyInstVector);
  
  const resonance = calculateResonance(ontologies.length);
  
  return {
    cell: {
      original: tag,
      normalized,
      signature,
      encryptedPayload,
      embedding
    },
    semantics: {
      concepts: ontologies,
      confidence,
      novelty,
      tension,
      resonance
    }
  };
}
