import { normalizeText } from '../core/normalize';

const ONTOLOGY_MAP: Record<string, string[]> = {
  'Maternidade': ['mae', 'mamae', 'filho', 'gestacao', 'nascimento', 'maternidade', 'cuidado'],
  'Família': ['familia', 'pai', 'mae', 'irmao', 'avo', 'parente'],
  'Afeto': ['afeto', 'amor', 'carinho', 'tristeza', 'dor', 'alegria', 'sentimento'],
  'Corpo': ['corpo', 'rosto', 'mao', 'olho', 'fisico', 'pele'],
  'Memória': ['memoria', 'lembranca', 'passado', 'historia', 'esquecimento'],
  'Guerra': ['guerra', 'batalha', 'conflito', 'arma', 'violencia', 'morte'],
  'Religiosidade': ['deus', 'santo', 'religiao', 'fe', 'igreja', 'sagrado', 'cruz', 'oracao']
};

export function suggestConceptsFromOntologies(normalizedTag: string): string[] {
  const suggestions: string[] = [];
  
  for (const [concept, keywords] of Object.entries(ONTOLOGY_MAP)) {
    if (keywords.includes(normalizedTag) || keywords.some(k => normalizedTag.includes(k))) {
      suggestions.push(concept);
    }
  }
  
  // Specific hardcoded rules for demo purposes as requested
  if (normalizedTag === 'mamae' || normalizedTag === 'mae') {
    if (!suggestions.includes('Mãe')) suggestions.push('Mãe');
    if (!suggestions.includes('Família')) suggestions.push('Família');
    if (!suggestions.includes('Afeto')) suggestions.push('Afeto');
    if (!suggestions.includes('Cuidado')) suggestions.push('Cuidado');
  }
  
  return Array.from(new Set(suggestions));
}
