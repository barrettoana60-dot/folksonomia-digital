export function calculateConfidence(occurrences: number, hasOntology: boolean, hasExternalSources: boolean): number {
  let score = 0;
  if (occurrences > 5) score += 40;
  else if (occurrences > 1) score += 20;
  
  if (hasOntology) score += 30;
  if (hasExternalSources) score += 30;
  
  return Math.min(100, score);
}

export function calculateNovelty(hasOntology: boolean, similarityToExisting: number): number {
  let score = 100;
  if (hasOntology) score -= 50;
  
  // Decreases novelty if it's very similar to something that already exists
  score -= (similarityToExisting * 50);
  
  return Math.max(0, score);
}

export function calculateTension(publicTagVector: number[], institutionalVector: number[]): number {
  // If we don't have vectors, return a default median tension
  if (!publicTagVector || !institutionalVector || publicTagVector.length === 0) return 50;
  
  // High cosine similarity means low tension
  // Low cosine similarity means high tension
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < publicTagVector.length; i++) {
    dotProduct += publicTagVector[i] * institutionalVector[i];
    normA += publicTagVector[i] * publicTagVector[i];
    normB += institutionalVector[i] * institutionalVector[i];
  }
  
  if (normA === 0 || normB === 0) return 50;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Convert similarity (usually 0 to 1) to tension (100 to 0)
  return Math.max(0, Math.min(100, (1 - similarity) * 100));
}

export function calculateResonance(connectionsCount: number): number {
  // Simple heuristic: more connections = higher resonance
  if (connectionsCount > 10) return 100;
  return connectionsCount * 10;
}
