import { normalizeText, tokenize } from './embeddings';

interface Concept {
  termo: string;
  sinonimos: string[];
  ontologia: string;
}

const INITIAL_CONCEPTS: Concept[] = [
  { termo: 'mãe', sinonimos: ['mamae', 'materno', 'progenitora'], ontologia: 'Maternidade' },
  { termo: 'maternidade', sinonimos: ['gravidez', 'parto', 'nascimento'], ontologia: 'Maternidade' },
  { termo: 'cuidado', sinonimos: ['zelo', 'protecao', 'atencao'], ontologia: 'Cuidado' },
  { termo: 'familia', sinonimos: ['parentesco', 'lar', 'casa'], ontologia: 'Família' },
  { termo: 'afeto', sinonimos: ['carinho', 'amor', 'ternura'], ontologia: 'Afeto' },
  { termo: 'guerra', sinonimos: ['conflito', 'combate', 'batalha'], ontologia: 'Guerra' },
  { termo: 'religiosidade', sinonimos: ['fe', 'sagrado', 'divino'], ontologia: 'Religioso' },
];

export function matchOntologies(text: string, ontologies: any[]): string[] {
  const norm = normalizeText(text);
  const matched: string[] = [];
  
  for (const ont of ontologies) {
    // Check if name or terms match
    if (norm.includes(normalizeText(ont.nome))) {
      matched.push(ont.nome);
      continue;
    }
    
    for (const termo of (ont.termos || [])) {
      if (norm === normalizeText(termo)) {
        matched.push(ont.nome);
        break;
      }
    }
  }
  
  return Array.from(new Set(matched));
}

export function suggestConcepts(text: string): string[] {
  const norm = normalizeText(text);
  const suggestions: string[] = [];
  
  for (const concept of INITIAL_CONCEPTS) {
    if (norm === normalizeText(concept.termo)) {
      suggestions.push(concept.termo);
    }
    for (const syn of concept.sinonimos) {
      if (norm === normalizeText(syn)) {
        suggestions.push(concept.termo);
      }
    }
  }
  
  // Exemplo obrigatório para "mamãe"
  if (norm === 'mamae' || norm === 'mae') {
    return ['mãe', 'maternidade', 'cuidado', 'família', 'afeto'];
  }
  
  return Array.from(new Set(suggestions));
}

export function detectThemeGroup(text: string, matchedConcepts: string[]): string {
  if (matchedConcepts.includes('mãe') || matchedConcepts.includes('maternidade')) return 'Maternidade';
  if (matchedConcepts.includes('guerra')) return 'Guerra';
  if (matchedConcepts.includes('religiosidade')) return 'Religioso';
  
  return 'Outros';
}
