/**
 * Folksonomia Digital 2.0 — Gerador de Dataset NER para ModernBERT
 * 
 * Coleta registros da Europeana e IBRAM e os transforma em
 * dados de treinamento rotulados para NER (Named Entity Recognition).
 * 
 * Labels (expandidas):
 *   B-DATA / I-DATA, B-TECNICA / I-TECNICA, B-GEO / I-GEO,
 *   B-MATERIAL / I-MATERIAL, B-AUTORIA / I-AUTORIA,
 *   B-PROVENIENCIA / I-PROVENIENCIA, B-QUALIFICADOR / I-QUALIFICADOR,
 *   B-ICONOGRAFIA / I-ICONOGRAFIA, B-TEMA / I-TEMA,
 *   B-ESTILO / I-ESTILO, B-MOVIMENTO / I-MOVIMENTO,
 *   B-CONSERVACAO / I-CONSERVACAO, B-PERIODO / I-PERIODO, O
 */

import { EuropeanaConnector, EuropeanaRecord } from '../connectors/europeana';
import { IbramConnector, TainacanRecord } from '../connectors/ibram';

// ============================================================
// Tipos do Dataset NER
// ============================================================

interface NERToken {
  token: string;
  label: string;  // BIO format: B-TECNICA, I-TECNICA, O, etc.
}

interface NERSample {
  id: string;
  source: string;
  text: string;
  tokens: NERToken[];
  contexto?: {
    tipo?: string;       // 'arte sacra', 'mobiliário', etc.
    periodo?: string;    // 'século XVIII'
    obra?: string;       // nome da obra
    museu?: string;      // museu de origem
  };
}

// ============================================================
// Dicionários de Entidades Museais Brasileiras
// ============================================================

const DICTIONARY = {
  DATA: [
    'circa', 'seculo', 'século', 'anos', 'decada', 'década', 'periodo', 'período',
    'setecentista', 'oitocentista', 'novecentista', 'medieval', 'colonial',
    'barroco', 'rococo', 'rococó', 'neoclassico', 'neoclássico', 'art nouveau',
    'modernista', 'contemporaneo', 'contemporâneo',
    ...Array.from({ length: 30 }, (_, i) => String(1500 + i * 10)),
    ...Array.from({ length: 10 }, (_, i) => `${i + 15}00`),
    'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'
  ],
  TECNICA: [
    'oleo', 'óleo', 'tela', 'aquarela', 'guache', 'tempera', 'têmpera',
    'gravura', 'litografia', 'xilogravura', 'serigrafia', 'fotografia',
    'escultura', 'entalhe', 'talha', 'dourada', 'policromia', 'policromado',
    'marcenaria', 'ourivesaria', 'toreutica', 'torêutica', 'fundição',
    'tecelagem', 'bordado', 'renda', 'cerâmica', 'ceramica', 'modelagem',
    'nanquim', 'carvão', 'pastel', 'crayon', 'lápis', 'pena', 'pincel',
    'lavrado', 'cinzelado', 'repuxado', 'filigrana', 'esmaltado'
  ],
  GEO: [
    'brasil', 'portugal', 'lisboa', 'rio de janeiro', 'são paulo', 'sao paulo',
    'minas gerais', 'bahia', 'pernambuco', 'maranhão', 'pará', 'goiás',
    'ouro preto', 'congonhas', 'diamantina', 'tiradentes', 'sabará', 'mariana',
    'salvador', 'recife', 'olinda', 'são luís', 'belém', 'goiânia',
    'europa', 'áfrica', 'asia', 'américa', 'holanda', 'espanha', 'itália',
    'roma', 'paris', 'madri', 'amsterdam', 'angola', 'moçambique',
    'recôncavo', 'sertão', 'litoral', 'planalto'
  ],
  MATERIAL: [
    'madeira', 'jacarandá', 'cedro', 'pinho', 'peroba', 'vinhático',
    'ouro', 'prata', 'bronze', 'cobre', 'ferro', 'estanho', 'latão',
    'marfim', 'osso', 'chifre', 'couro', 'pergaminho',
    'barro', 'argila', 'faiança', 'porcelana', 'terracota',
    'papel', 'papelão', 'cartão', 'tecido', 'seda', 'algodão', 'lã',
    'vidro', 'cristal', 'pedra', 'mármore', 'granito',
    'pigmento', 'tinta', 'verniz', 'goma', 'resina', 'cola',
    'folha de ouro', 'folha de prata'
  ],
  AUTORIA: [
    'aleijadinho', 'ataíde', 'ataide', 'debret', 'portinari', 'di cavalcanti',
    'tarsila', 'anita malfatti', 'lasar segall', 'brecheret', 'victor brecheret',
    'mestre valentim', 'francisco lisboa', 'manuel da costa',
    'atribuído', 'atribuido', 'escola', 'oficina', 'mestre', 'discípulo',
    'seguidor', 'circulo', 'círculo', 'autor desconhecido', 'anônimo', 'anonimo'
  ],
  PROVENIENCIA: [
    'coleção', 'colecao', 'acervo', 'doação', 'doacao', 'aquisição', 'aquisicao',
    'legado', 'herança', 'heranca', 'espólio', 'espolio', 'espoliação',
    'transferência', 'transferencia', 'empréstimo', 'emprestimo',
    'museu', 'igreja', 'convento', 'mosteiro', 'catedral', 'palácio',
    'arquivo', 'biblioteca', 'pinacoteca', 'galeria',
    'leilão', 'leilao', 'antiquário', 'antiquario'
  ],
  QUALIFICADOR: [
    'possivelmente', 'provavelmente', 'talvez', 'circa', 'aproximadamente',
    'atribuído a', 'atribuido a', 'possível', 'possivel', 'provável', 'provavel',
    'estimado', 'presumido', 'suposto', 'hipotético', 'hipotetico'
  ],
  ICONOGRAFIA: [
    'santo', 'santa', 'cristo', 'jesus', 'virgem', 'maria', 'nossa senhora',
    'são josé', 'são francisco', 'são pedro', 'são paulo', 'são sebastião',
    'anjo', 'querubim', 'serafim', 'arcanjo', 'crucifixo', 'pietà', 'pieta',
    'natividade', 'assunção', 'coroação', 'anunciação', 'adoração',
    'ex-voto', 'relicário', 'oratório', 'imagem de roca'
  ],
  TEMA: [
    'retrato', 'paisagem', 'natureza morta', 'cena de gênero', 'alegoria',
    'mitologia', 'história', 'religioso', 'profano', 'decorativo',
    'cotidiano', 'guerra', 'festa', 'trabalho', 'escravidão'
  ],
  ESTILO: [
    'gótico', 'renascentista', 'maneirista', 'churrigueresco',
    'pombalino', 'joanino', 'rocaille', 'neogótico', 'neoclássico',
    'eclético', 'art déco', 'art nouveau'
  ],
  MOVIMENTO: [
    'impressionismo', 'expressionismo', 'cubismo', 'surrealismo',
    'abstracionismo', 'concretismo', 'neoconcretismo',
    'modernismo', 'tropicália', 'arte povera', 'minimalismo',
    'semana de 22', 'grupo santa helena', 'pau-brasil'
  ],
  CONSERVACAO: [
    'restaurado', 'restauração', 'consolidado', 'consolidação',
    'fragmento', 'fragmentado', 'lacuna', 'fissura', 'craquelado',
    'repintura', 'retoque', 'limpeza', 'verniz', 'patina', 'pátina',
    'original', 'íntegro', 'deteriorado', 'atacado', 'infestação'
  ],
  PERIODO: [
    'pré-colombiano', 'medieval', 'renascimento', 'maneirismo',
    'barroco', 'rococó', 'neoclassicismo', 'romantismo',
    'realismo', 'belle époque', 'era vargas', 'ditadura',
    'redemocratização', 'contemporâneo'
  ]
};

// ============================================================
// Rotulador Automático (Rule-Based NER Labeling)
// ============================================================

/**
 * Rotula tokens de um texto com base nos dicionários de entidades.
 * Usa BIO tagging: B-TAG (início), I-TAG (continuação), O (nenhuma).
 */
function labelTokens(text: string): NERToken[] {
  const words = text.split(/\s+/).filter(Boolean);
  const labels: NERToken[] = [];
  let i = 0;

  while (i < words.length) {
    const word = words[i];
    const wordLower = word.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    let matched = false;

    // Tentar match de multi-word primeiro (ex: "folha de ouro")
    for (const [category, terms] of Object.entries(DICTIONARY)) {
      for (const term of terms) {
        const termWords = term.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/\s+/);

        if (termWords.length > 1 && i + termWords.length <= words.length) {
          const candidate = words.slice(i, i + termWords.length)
            .map(w => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''))
            .join(' ');
          const target = termWords.join(' ').replace(/[^a-z0-9 ]/g, '');

          if (candidate === target) {
            labels.push({ token: words[i], label: `B-${category}` });
            for (let j = 1; j < termWords.length; j++) {
              labels.push({ token: words[i + j], label: `I-${category}` });
            }
            i += termWords.length;
            matched = true;
            break;
          }
        }
      }
      if (matched) break;
    }

    if (!matched) {
      // Tentar match de single-word
      for (const [category, terms] of Object.entries(DICTIONARY)) {
        const found = terms.some(term => {
          const termClean = term.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          return wordLower === termClean;
        });

        if (found) {
          labels.push({ token: word, label: `B-${category}` });
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Detectar datas numéricas
        if (/^\d{4}$/.test(word) && parseInt(word) >= 1400 && parseInt(word) <= 2100) {
          labels.push({ token: word, label: 'B-DATA' });
        } else if (/^\d{3,4}[-/]\d{3,4}$/.test(word)) {
          labels.push({ token: word, label: 'B-DATA' });
        } else {
          labels.push({ token: word, label: 'O' });
        }
      }

      i++;
    }
  }

  return labels;
}

// ============================================================
// Conversão de Registros → Amostras NER
// ============================================================

function europeanaToNERSamples(records: EuropeanaRecord[]): NERSample[] {
  const samples: NERSample[] = [];

  for (const rec of records) {
    // Combinar todos os campos textuais em uma string
    const parts = [
      rec.title,
      rec.description,
      rec.creator,
      rec.date,
      ...(rec.subject || []),
      ...(rec.spatial || []),
      ...(rec.medium || []),
      rec.provenance
    ].filter(Boolean);

    const text = parts.join('. ').replace(/\s+/g, ' ').trim();
    if (text.length < 10) continue;

    samples.push({
      id: `eu-${rec.id}`,
      source: 'europeana',
      text,
      tokens: labelTokens(text)
    });
  }

  return samples;
}

function ibramToNERSamples(records: TainacanRecord[]): NERSample[] {
  const samples: NERSample[] = [];

  for (const rec of records) {
    const parts = [
      rec.title,
      rec.description,
      rec.author,
      rec.date,
      ...Object.values(rec.metadata)
    ].filter(Boolean);

    const text = parts.join('. ').replace(/\s+/g, ' ').trim();
    if (text.length < 10) continue;

    samples.push({
      id: rec.id,
      source: `ibram-${rec.museum}`,
      text,
      tokens: labelTokens(text)
    });
  }

  return samples;
}

// ============================================================
// Pipeline Principal de Coleta
// ============================================================

/**
 * Coleta dados da Europeana + IBRAM e gera dataset NER.
 * 
 * @param europeanaRows - Quantidade de registros da Europeana
 * @param ibramPerMuseum - Quantidade de registros por museu IBRAM
 * @returns Dataset NER completo em formato BIO
 */
export async function collectTrainingData(
  europeanaRows: number = 50,
  ibramPerMuseum: number = 20
): Promise<{
  samples: NERSample[];
  stats: {
    total: number;
    europeana: number;
    ibram: number;
    labelDistribution: Record<string, number>;
  };
}> {
  const europeana = new EuropeanaConnector();
  const ibram = new IbramConnector();

  // Coletar dados em paralelo
  const [euRecords, ibRecords] = await Promise.all([
    europeana.searchBrazilianMuseumRecords(europeanaRows),
    ibram.searchAllMuseums('', ibramPerMuseum)
  ]);

  // Converter para NER
  const euSamples = europeanaToNERSamples(euRecords);
  const ibSamples = ibramToNERSamples(ibRecords);
  const allSamples = [...euSamples, ...ibSamples];

  // Estatísticas de distribuição de labels
  const labelDist: Record<string, number> = {};
  for (const sample of allSamples) {
    for (const tok of sample.tokens) {
      labelDist[tok.label] = (labelDist[tok.label] || 0) + 1;
    }
  }

  return {
    samples: allSamples,
    stats: {
      total: allSamples.length,
      europeana: euSamples.length,
      ibram: ibSamples.length,
      labelDistribution: labelDist
    }
  };
}

/**
 * Exporta o dataset no formato HuggingFace (JSON Lines).
 * Pronto para consumo pelo script de fine-tuning do ModernBERT.
 */
export function exportToHuggingFace(samples: NERSample[]): string {
  return samples.map(s => JSON.stringify({
    id: s.id,
    tokens: s.tokens.map(t => t.token),
    ner_tags: s.tokens.map(t => t.label)
  })).join('\n');
}
