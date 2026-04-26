import { normalizeText } from '../core/normalize';
import { tokenSimilarity, hybridSemanticSimilarity } from './similarity';

export interface OntologyDefinition {
  id: string | number;
  nome: string;
  categoria: string;
  termos: string[];
}

/**
 * Busca quais ontologias cadastradas casam com a tag informada
 */
export function matchOntologies(tag: string, ontologies: OntologyDefinition[]): string[] {
  const normTag = normalizeText(tag);
  const matches = new Set<string>();
  
  for (const ont of ontologies) {
    for (const term of ont.termos) {
      const normTerm = normalizeText(term);
      if (!normTerm) continue;
      
      // Correspondência exata ou parcial mútua
      if (normTag === normTerm || normTerm.includes(normTag) || normTag.includes(normTerm)) {
        matches.add(ont.nome);
        break; // Passa para a próxima ontologia, já deu match nesta
      }
      
      // Similaridade tokenizada
      if (hybridSemanticSimilarity(normTag, normTerm) > 0.75) {
        matches.add(ont.nome);
        break;
      }
    }
  }
  
  return Array.from(matches);
}

/**
 * Sugere relações com outros núcleos já existentes no banco local
 */
export function suggestInternalRelations(targetText: string, existingNuclei: Array<{id: string, conteudo_original: string}>): Array<{id: string, conteudo: string, score: number, tipo: string}> {
  const normTarget = normalizeText(targetText);
  const relations = [];
  
  for (const n of existingNuclei) {
    const normExisting = normalizeText(n.conteudo_original);
    if (normTarget === normExisting) continue; // Evita self-match
    
    const sim = hybridSemanticSimilarity(normTarget, normExisting);
    if (sim >= 0.4) {
      let tipo = "relatedMatch";
      if (sim >= 0.85) tipo = "closeMatch";
      if (normTarget.includes(normExisting) || normExisting.includes(normTarget)) tipo = "broader/narrower";
      
      relations.push({
        id: n.id,
        conteudo: n.conteudo_original,
        score: sim,
        tipo
      });
    }
  }
  
  // Retorna os top 5 ordenados por score
  return relations.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Sugestões ortográficas caso a tag esteja digitada incorretamente (baseado no dicionário/ontologia atual)
 */
export function suggestSpellingCorrections(tag: string, vocabulary: string[]): string[] {
  const normTag = normalizeText(tag);
  if (normTag.length < 4) return []; // Palavras muito curtas podem dar falso positivo demais
  
  const suggestions = [];
  for (const word of vocabulary) {
    const normWord = normalizeText(word);
    if (normTag === normWord) continue;
    
    // Calcula similaridade semântica (token/levenshtein hibrido)
    const sim = hybridSemanticSimilarity(normTag, normWord);
    
    // Se for altíssima similaridade mas não idêntica, provavelmente é erro de digitação/plural
    if (sim > 0.8 && sim < 1.0) {
      suggestions.push({ word, score: sim });
    }
  }
  
  return suggestions.sort((a, b) => b.score - a.score).map(s => s.word).slice(0, 3);
}
