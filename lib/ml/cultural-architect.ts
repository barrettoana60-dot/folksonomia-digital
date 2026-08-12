/**
 * Folksonomia Digital 2.0 — Arquitetura de Coesão da Cultura Popular Brasileira
 * 
 * Estrutura conceitos populares em eixos matemáticos e matrizes de pertinência.
 * Impede que conceitos desconexos (como "carranca" e "capoeira") se correlacionem
 * sem base cultural coerente.
 */

import { normalizeForComparison } from './tag-correlator';

export type CulturalAxis = 
  | 'FESTAS_CELEBRACOES' 
  | 'MUSICA_DANCA_PERFORMANCE' 
  | 'SABERES_OFICIOS_MATERIAIS' 
  | 'CRENCAS_RITOS' 
  | 'TRADICAO_ORAL_COSMOLOGIAS';

export type CulturalMatrix = 
  | 'AFRO_BRASILEIRA' 
  | 'INDIGENA' 
  | 'LUSO_CABOCLA';

export interface CulturalProfile {
  axes: CulturalAxis[];
  matrices: CulturalMatrix[];
}

// Dicionário de Palavras-Chave e Mapeamento de Eixos/Matrizes
const AXIS_KEYWORDS: Record<CulturalAxis, string[]> = {
  FESTAS_CELEBRACOES: [
    'bumba meu boi', 'bumba-meu-boi', 'boi bumba', 'boi-bumba', 'boi de mamao', 'boi de reis',
    'maracatu', 'congada', 'congado', 'congo', 'reisado', 'folia de reis', 'cavalhada',
    'pastoril', 'folguedo', 'sao joao', 'são joão', 'quadrilha', 'festa junina', 'bumba',
    'maracatu rural', 'maracatu nação', 'caboclinho', 'afoxe', 'afoxé', 'carnaval'
  ],
  MUSICA_DANCA_PERFORMANCE: [
    'capoeira', 'berimbau', 'atabaque', 'pandeiro', 'agogo', 'agogô', 'caxixi', 'luta',
    'samba de roda', 'jongo', 'coco', 'ciranda', 'lundu', 'xaxado', 'forro', 'forró',
    'maxixe', 'choro', 'viola caipira', 'catira', 'batuque', 'repique', 'repente',
    'cantoria', 'aboio', 'embolada', 'frevo', 'instrumento musical', 'viola'
  ],
  SABERES_OFICIOS_MATERIAIS: [
    'ceramica', 'cerâmica', 'barro', 'argila', 'oleiro', 'boneca de pano', 'talha',
    'entalhe', 'carranca', 'ex voto', 'ex-voto', 'promessa', 'oratorio', 'oratório',
    'santo de roca', 'santo de vestir', 'xilogravura', 'cordel', 'folheto', 'renda',
    'rendeira', 'renda de bilro', 'labirinto', 'tecelagem', 'cestaria', 'trancado',
    'trançado', 'palha', 'fibra', 'artesao', 'artesão', 'mestre de oficio', 'madeira'
  ],
  CRENCAS_RITOS: [
    'sincretismo', 'catolicismo popular', 'romaria', 'procissao', 'procissão', 'candomble',
    'candomblé', 'umbanda', 'benzedura', 'pajelanca', 'pajelança', 'catimbo', 'catimbó',
    'jurema', 'orixa', 'orixá', 'caboclo', 'terreiro', 'benzedor', 'rezador',
    'garrafada', 'erva medicinal', 'defumador', 'amuleto', 'patua', 'patuá', 'figa',
    'santo', 'santa', 'devocional', 'devoção', 'sagrado', 'religiao', 'religião'
  ],
  TRADICAO_ORAL_COSMOLOGIAS: [
    'lenda', 'causo', 'mito', 'saci', 'curupira', 'iara', 'mula sem cabeca', 'mula sem cabeça',
    'boitata', 'boitatá', 'lobisomem', 'boto cor de rosa', 'boto cor-de-rosa', 'negrinho',
    'assombracao', 'assombração', 'proverbio', 'provérbio', 'parlenda', 'adivinha', 'conto popular'
  ]
};

const MATRIX_KEYWORDS: Record<CulturalMatrix, string[]> = {
  AFRO_BRASILEIRA: [
    'capoeira', 'candomble', 'candomblé', 'umbanda', 'maracatu', 'congada', 'congado',
    'jongo', 'samba de roda', 'afoxe', 'afoxé', 'tambor de crioula', 'atabaque',
    'berimbau', 'agogo', 'agogô', 'orixa', 'orixá', 'terreiro', 'quilombo', 'quilombola',
    'abolição', 'abolicao', 'escravidão', 'escravidao', 'negro', 'afro-brasileiro'
  ],
  INDIGENA: [
    'pajelanca', 'pajelança', 'plumaria', 'plumária', 'cestaria', 'ceramica indigena',
    'cerâmica indígena', 'grafismo', 'rito', 'tupi', 'guarani', 'paje', 'pajé',
    'banzeiro', 'maraca', 'maracá', 'tacape', 'arco', 'flecha', 'indigena', 'indígena',
    'índio', 'indio', 'etnia', 'povo originario'
  ],
  LUSO_CABOCLA: [
    'folia de reis', 'cavalhada', 'ex voto', 'ex-voto', 'oratorio', 'oratório',
    'santo de roca', 'santo de vestir', 'catolicismo popular', 'reisado', 'repente',
    'viola caipira', 'cordel', 'folheto', 'quadrilha', 'romaria', 'procissao',
    'procissão', 'barroco', 'colonial', 'rococo', 'rococó'
  ]
};

export class BrazilianCultureArchitect {
  /**
   * Extrai o perfil cultural de uma tag analisando correspondências de palavras-chave.
   */
  public static getCulturalProfile(tag: string): CulturalProfile {
    const norm = normalizeForComparison(tag);
    const words = norm.split(' ');
    
    const matchedAxes: CulturalAxis[] = [];
    const matchedMatrices: CulturalMatrix[] = [];

    // Validar eixos
    for (const [axis, keywords] of Object.entries(AXIS_KEYWORDS)) {
      for (const kw of keywords) {
        const kwNorm = normalizeForComparison(kw);
        if (kwNorm.includes(' ')) {
          if (norm.includes(kwNorm)) {
            matchedAxes.push(axis as CulturalAxis);
            break;
          }
        } else {
          if (words.includes(kwNorm)) {
            matchedAxes.push(axis as CulturalAxis);
            break;
          }
        }
      }
    }

    // Validar matrizes
    for (const [matrix, keywords] of Object.entries(MATRIX_KEYWORDS)) {
      for (const kw of keywords) {
        const kwNorm = normalizeForComparison(kw);
        if (kwNorm.includes(' ')) {
          if (norm.includes(kwNorm)) {
            matchedMatrices.push(matrix as CulturalMatrix);
            break;
          }
        } else {
          if (words.includes(kwNorm)) {
            matchedMatrices.push(matrix as CulturalMatrix);
            break;
          }
        }
      }
    }

    return {
      axes: [...new Set(matchedAxes)],
      matrices: [...new Set(matchedMatrices)]
    };
  }

  /**
   * Calcula o fator de coesão cultural entre duas tags.
   * Se ambos os termos possuem perfis bem definidos, mas não compartilham NENHUM eixo ou matriz
   * E também não compartilham palavras idênticas, impõe-se um fator restritivo de 0.15.
   * Caso contrário, retorna 1.0 (conexão viável).
   */
  public static calculateCohesion(tagA: string, tagB: string): number {
    const normA = normalizeForComparison(tagA);
    const normB = normalizeForComparison(tagB);

    // Se as palavras compartilham alguma raiz/palavra significativa comum, são coesas
    const wordsA = normA.split(' ').filter(w => w.length > 3);
    const wordsB = normB.split(' ').filter(w => w.length > 3);
    const sharedWords = wordsA.filter(w => wordsB.includes(w));
    if (sharedWords.length > 0) return 1.0;

    const profileA = this.getCulturalProfile(tagA);
    const profileB = this.getCulturalProfile(tagB);

    // Se uma das tags não está mapeada nos eixos específicos (é um conceito geral como "cultura" ou "arte"),
    // não podemos restringir a ligação
    if (profileA.axes.length === 0 || profileB.axes.length === 0) {
      return 1.0;
    }

    // Verificar interseção de eixos
    const sharedAxes = profileA.axes.filter(a => profileB.axes.includes(a));
    if (sharedAxes.length > 0) return 1.0;

    // Verificar interseção de matrizes
    const sharedMatrices = profileA.matrices.filter(m => profileB.matrices.includes(m));
    if (sharedMatrices.length > 0) return 0.85; // Alta coesão por afinidade de matriz cultural

    // Conexões de exceção legítimas (Ex: Ex-voto [Saberes/Ofícios] com Romaria [Crenças/Ritos])
    const exceptionPairs = [
      ['ex voto', 'romaria'], ['ex-voto', 'romaria'],
      ['ex voto', 'procissao'], ['ex voto', 'procissão'],
      ['carranca', 'lenda'], ['carranca', 'mito'],
      ['cordel', 'repente'], ['cordel', 'cantoria'],
      ['xilogravura', 'cordel'], ['capoeira', 'berimbau']
    ];

    for (const [excA, excB] of exceptionPairs) {
      if ((normA.includes(excA) && normB.includes(excB)) || (normB.includes(excA) && normA.includes(excB))) {
        return 1.0;
      }
    }

    // Penalidade pesada por incompatibilidade estrutural de eixos
    return 0.15;
  }
}
