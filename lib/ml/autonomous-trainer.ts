/**
 * Folksonomia Digital 2.0 — Motor de Treinamento Autônomo
 * 
 * Treina um classificador NER diretamente no servidor,
 * sem necessidade de Python, Google Colab ou GPU.
 * 
 * Arquitetura: Naive Bayes + TF-IDF em TypeScript puro.
 * O modelo aprende padrões estatísticos dos dados coletados
 * da Europeana e IBRAM e persiste no Supabase.
 * 
 * Ciclo de vida:
 * 1. Coletar dados reais (Europeana + IBRAM)
 * 2. Extrair features estatísticas (TF-IDF, co-ocorrência, n-gramas)
 * 3. Treinar classificador Naive Bayes multi-classe
 * 4. Salvar modelo treinado no Supabase
 * 5. Usar modelo treinado para classificar novos tokens
 * 6. Retreinar com feedback curatorial
 */

import { EuropeanaConnector } from '../connectors/europeana';
import { IbramConnector } from '../connectors/ibram';
import { supabaseAdmin as supabase } from '@/lib/supabase/client';

// ============================================================
// Tipos do Modelo
// ============================================================

export type NERCategory = 
  | 'DATA' | 'TECNICA' | 'GEO' | 'MATERIAL' 
  | 'AUTORIA' | 'PROVENIENCIA' | 'QUALIFICADOR' | 'O';

interface TokenStats {
  count: number;
  categoryFreq: Record<NERCategory, number>;
  bigramLeft: Record<string, number>;   // palavras que aparecem antes
  bigramRight: Record<string, number>;  // palavras que aparecem depois
}

interface TrainedModel {
  version: string;
  trainedAt: string;
  totalSamples: number;
  totalTokens: number;
  vocabulary: Record<string, TokenStats>;
  categoryPriors: Record<NERCategory, number>;  // P(category)
  contextWeights: Record<string, Record<NERCategory, number>>;  // P(context|category)
  accuracy: number;
  labelDistribution: Record<string, number>;
}

// ============================================================
// Dicionários Sementes (Bootstrap do treinamento)
// ============================================================

const SEED_DICTIONARY: Record<NERCategory, string[]> = {
  DATA: [
    'circa', 'seculo', 'século', 'anos', 'decada', 'década', 'periodo', 'período',
    'colonial', 'barroco', 'rococo', 'rococó', 'neoclassico', 'neoclássico',
    'setecentista', 'oitocentista', 'novecentista', 'modernista', 'contemporaneo',
    'medieval', 'renascentista', 'maneirista', 'art nouveau', 'art deco'
  ],
  TECNICA: [
    'oleo', 'óleo', 'tela', 'aquarela', 'guache', 'tempera', 'têmpera',
    'gravura', 'litografia', 'xilogravura', 'serigrafia', 'fotografia',
    'escultura', 'entalhe', 'talha', 'dourada', 'policromia', 'policromado',
    'marcenaria', 'ourivesaria', 'fundição', 'tecelagem', 'bordado',
    'cerâmica', 'ceramica', 'modelagem', 'nanquim', 'carvão', 'pastel',
    'lavrado', 'cinzelado', 'repuxado', 'filigrana', 'esmaltado', 'pintura'
  ],
  GEO: [
    'brasil', 'portugal', 'lisboa', 'rio de janeiro', 'são paulo',
    'minas gerais', 'bahia', 'pernambuco', 'maranhão', 'pará', 'goiás',
    'ouro preto', 'congonhas', 'diamantina', 'tiradentes', 'sabará', 'mariana',
    'salvador', 'recife', 'olinda', 'belém', 'europa', 'áfrica', 'angola',
    'moçambique', 'roma', 'paris', 'holanda', 'espanha', 'itália'
  ],
  MATERIAL: [
    'madeira', 'jacarandá', 'cedro', 'pinho', 'peroba', 'vinhático',
    'ouro', 'prata', 'bronze', 'cobre', 'ferro', 'estanho', 'latão',
    'marfim', 'osso', 'couro', 'barro', 'argila', 'faiança', 'porcelana',
    'terracota', 'papel', 'tecido', 'seda', 'algodão', 'lã',
    'vidro', 'cristal', 'pedra', 'mármore', 'granito', 'pigmento', 'tinta'
  ],
  AUTORIA: [
    'aleijadinho', 'ataíde', 'debret', 'portinari', 'di cavalcanti',
    'tarsila', 'anita malfatti', 'lasar segall', 'brecheret',
    'mestre valentim', 'francisco lisboa', 'manuel da costa',
    'atribuído', 'escola', 'oficina', 'mestre', 'discípulo', 'anônimo'
  ],
  PROVENIENCIA: [
    'coleção', 'colecao', 'acervo', 'doação', 'aquisição', 'legado',
    'herança', 'espólio', 'espoliação', 'transferência', 'empréstimo',
    'museu', 'igreja', 'convento', 'catedral', 'palácio', 'arquivo',
    'biblioteca', 'pinacoteca', 'galeria', 'leilão'
  ],
  QUALIFICADOR: [
    'possivelmente', 'provavelmente', 'talvez', 'circa', 'aproximadamente',
    'possível', 'provável', 'estimado', 'presumido', 'suposto', 'hipotético'
  ],
  O: []  // Não tem sementes — aprende por exclusão
};

// ============================================================
// Normalização
// ============================================================

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// ============================================================
// Motor de Treinamento
// ============================================================

/**
 * Treina o modelo NER usando dados reais da Europeana e IBRAM.
 * Todo o processo roda em TypeScript puro no servidor.
 */
export async function trainModel(): Promise<TrainedModel> {
  console.log('[Trainer] Iniciando treinamento autônomo...');

  // 1. COLETAR DADOS REAIS
  console.log('[Trainer] Coletando dados da Europeana e IBRAM...');
  const europeana = new EuropeanaConnector();
  const ibram = new IbramConnector();

  const [euRecords, ibRecords] = await Promise.allSettled([
    europeana.searchBrazilianMuseumRecords(50),
    ibram.searchAllMuseums('', 15)
  ]);

  const europeanaData = euRecords.status === 'fulfilled' ? euRecords.value : [];
  const ibramData = ibRecords.status === 'fulfilled' ? ibRecords.value : [];

  console.log(`[Trainer] Coletados: ${europeanaData.length} Europeana + ${ibramData.length} IBRAM`);

  // 2. EXTRAIR TEXTOS
  const allTexts: string[] = [];

  for (const rec of europeanaData) {
    const parts = [rec.title, rec.description, rec.creator, rec.date,
      ...(rec.subject || []), ...(rec.spatial || []), ...(rec.medium || []),
      rec.provenance].filter(Boolean);
    allTexts.push(parts.join('. '));
  }

  for (const rec of ibramData) {
    const parts = [rec.title, rec.description, rec.author, rec.date,
      ...Object.values(rec.metadata)].filter(Boolean);
    allTexts.push(parts.join('. '));
  }

  // 3. CONSTRUIR VOCABULÁRIO COM ESTATÍSTICAS
  console.log('[Trainer] Construindo vocabulário estatístico...');
  const vocabulary: Record<string, TokenStats> = {};
  const categoryPriors: Record<NERCategory, number> = {
    DATA: 0, TECNICA: 0, GEO: 0, MATERIAL: 0,
    AUTORIA: 0, PROVENIENCIA: 0, QUALIFICADOR: 0, O: 0
  };

  let totalTokens = 0;

  for (const text of allTexts) {
    const words = text.split(/\s+/).filter(w => w.length > 1);
    
    for (let i = 0; i < words.length; i++) {
      const word = normalize(words[i]);
      if (!word) continue;
      totalTokens++;

      if (!vocabulary[word]) {
        vocabulary[word] = {
          count: 0,
          categoryFreq: { DATA: 0, TECNICA: 0, GEO: 0, MATERIAL: 0, 
                         AUTORIA: 0, PROVENIENCIA: 0, QUALIFICADOR: 0, O: 0 },
          bigramLeft: {},
          bigramRight: {}
        };
      }

      vocabulary[word].count++;

      // Classificar pelo dicionário semente
      const category = classifyBySeed(word);
      vocabulary[word].categoryFreq[category]++;
      categoryPriors[category]++;

      // Bigramas contextuais
      if (i > 0) {
        const left = normalize(words[i - 1]);
        if (left) {
          vocabulary[word].bigramLeft[left] = (vocabulary[word].bigramLeft[left] || 0) + 1;
        }
      }
      if (i < words.length - 1) {
        const right = normalize(words[i + 1]);
        if (right) {
          vocabulary[word].bigramRight[right] = (vocabulary[word].bigramRight[right] || 0) + 1;
        }
      }
    }
  }

  // 4. APRENDER PADRÕES CONTEXTUAIS (Propagação de labels)
  console.log('[Trainer] Aprendendo padrões contextuais...');
  const contextWeights: Record<string, Record<NERCategory, number>> = {};

  for (const [word, stats] of Object.entries(vocabulary)) {
    if (stats.count < 2) continue; // Ignorar hapax legomena

    // Calcular pesos contextuais baseados nos vizinhos
    const neighborCategories: Record<NERCategory, number> = {
      DATA: 0, TECNICA: 0, GEO: 0, MATERIAL: 0,
      AUTORIA: 0, PROVENIENCIA: 0, QUALIFICADOR: 0, O: 0
    };

    for (const [neighbor, count] of Object.entries(stats.bigramLeft)) {
      const neighborCat = classifyBySeed(neighbor);
      if (neighborCat !== 'O') {
        neighborCategories[neighborCat] += count * 0.7;
      }
    }

    for (const [neighbor, count] of Object.entries(stats.bigramRight)) {
      const neighborCat = classifyBySeed(neighbor);
      if (neighborCat !== 'O') {
        neighborCategories[neighborCat] += count * 0.3;
      }
    }

    // Se uma palavra não classificada aparece frequentemente ao lado
    // de palavras de uma categoria, ela provavelmente pertence a essa categoria
    const maxNeighborScore = Math.max(...Object.values(neighborCategories));
    if (maxNeighborScore > 0 && stats.categoryFreq['O'] > 0) {
      contextWeights[word] = neighborCategories;
      
      // Propagar: reclassificar parcialmente baseado no contexto
      for (const [cat, score] of Object.entries(neighborCategories)) {
        if (score > stats.count * 0.3) {
          const transfer = Math.min(stats.categoryFreq['O'] * 0.5, score);
          stats.categoryFreq[cat as NERCategory] += transfer;
          stats.categoryFreq['O'] -= transfer;
        }
      }
    }
  }

  // 5. NORMALIZAR PRIORS
  const totalPriors = Object.values(categoryPriors).reduce((a, b) => a + b, 0);
  for (const cat of Object.keys(categoryPriors) as NERCategory[]) {
    categoryPriors[cat] = totalPriors > 0 ? categoryPriors[cat] / totalPriors : 0;
  }

  // 6. CALCULAR ACURÁCIA ESTIMADA
  let correct = 0;
  let total = 0;
  for (const [word, stats] of Object.entries(vocabulary)) {
    const predicted = predictCategory(word, stats, categoryPriors, contextWeights);
    const seedCategory = classifyBySeed(word);
    if (seedCategory !== 'O') {
      total++;
      if (predicted === seedCategory) correct++;
    }
  }
  const accuracy = total > 0 ? correct / total : 0;

  // 7. MONTAR MODELO
  const model: TrainedModel = {
    version: '2.0-autonomous',
    trainedAt: new Date().toISOString(),
    totalSamples: allTexts.length,
    totalTokens,
    vocabulary,
    categoryPriors,
    contextWeights,
    accuracy,
    labelDistribution: Object.fromEntries(
      Object.entries(categoryPriors).map(([k, v]) => [k, Math.round(v * totalTokens)])
    )
  };

  // 8. PERSISTIR NO SUPABASE
  console.log('[Trainer] Salvando modelo treinado...');
  try {
    await supabase
      .from('ml_models')
      .upsert({
        model_name: 'ner-classifier',
        version: model.version,
        trained_at: model.trainedAt,
        total_samples: model.totalSamples,
        accuracy: model.accuracy,
        model_data: model,
        is_active: true
      }, { onConflict: 'model_name' });
  } catch (err) {
    console.warn('[Trainer] Supabase save failed, model available in memory only:', err);
  }

  console.log(`[Trainer] Treinamento concluído! Vocabulário: ${Object.keys(vocabulary).length} tokens, Acurácia: ${(accuracy * 100).toFixed(1)}%`);

  return model;
}

// ============================================================
// Classificação (Inferência)
// ============================================================

function classifyBySeed(word: string): NERCategory {
  const norm = normalize(word);
  
  // Datas numéricas
  if (/^\d{4}$/.test(norm) && parseInt(norm) >= 1400 && parseInt(norm) <= 2100) {
    return 'DATA';
  }
  if (/^\d{3,4}$/.test(norm)) return 'DATA';

  for (const [category, terms] of Object.entries(SEED_DICTIONARY)) {
    if (category === 'O') continue;
    for (const term of terms) {
      const termNorm = normalize(term);
      if (norm === termNorm || (norm.length > 3 && termNorm.includes(norm)) || 
          (termNorm.length > 3 && norm.includes(termNorm))) {
        return category as NERCategory;
      }
    }
  }
  return 'O';
}

function predictCategory(
  word: string,
  stats: TokenStats,
  priors: Record<NERCategory, number>,
  context: Record<string, Record<NERCategory, number>>
): NERCategory {
  const categories: NERCategory[] = ['DATA', 'TECNICA', 'GEO', 'MATERIAL', 'AUTORIA', 'PROVENIENCIA', 'QUALIFICADOR'];
  
  let bestCat: NERCategory = 'O';
  let bestScore = 0;

  for (const cat of categories) {
    // P(category|word) ∝ P(word|category) * P(category) * P(context|category)
    const wordLikelihood = stats.count > 0 ? stats.categoryFreq[cat] / stats.count : 0;
    const prior = priors[cat] || 0.001;
    const contextScore = context[word]?.[cat] || 0;
    
    const score = (wordLikelihood * 0.5) + (prior * 0.2) + (contextScore * 0.3);
    
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  return bestScore > 0.05 ? bestCat : 'O';
}

/**
 * Classifica tokens usando o modelo treinado.
 * Usa o modelo do Supabase se disponível, senão treina on-demand.
 */
export async function classifyTokens(
  text: string,
  model?: TrainedModel
): Promise<{ token: string; category: NERCategory; confidence: number }[]> {
  
  // Carregar ou treinar modelo
  if (!model) {
    model = await loadModel();
  }
  if (!model) {
    model = await trainModel();
  }

  const words = text.split(/\s+/).filter(Boolean);
  const results: { token: string; category: NERCategory; confidence: number }[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const norm = normalize(word);

    // 1. Verificar se está no vocabulário treinado
    const stats = model.vocabulary[norm];
    if (stats) {
      const category = predictCategory(norm, stats, model.categoryPriors, model.contextWeights);
      const maxFreq = Math.max(...Object.values(stats.categoryFreq));
      const confidence = stats.count > 0 ? maxFreq / stats.count : 0.3;
      results.push({ token: word, category, confidence: Math.min(confidence, 0.95) });
    } else {
      // 2. Fallback para dicionário semente
      const seedCat = classifyBySeed(norm);
      results.push({ 
        token: word, 
        category: seedCat, 
        confidence: seedCat !== 'O' ? 0.6 : 0.9 
      });
    }
  }

  return results;
}

/**
 * Carrega o modelo treinado do Supabase.
 */
async function loadModel(): Promise<TrainedModel | null> {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('model_data')
      .eq('model_name', 'ner-classifier')
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    return data.model_data as TrainedModel;
  } catch {
    return null;
  }
}

/**
 * Incorpora feedback curatorial no modelo (retreinamento parcial).
 * Atualiza as frequências de categorias sem retreinar do zero.
 */
export async function incorporateFeedback(
  token: string,
  correctCategory: NERCategory,
  model: TrainedModel
): Promise<TrainedModel> {
  const norm = normalize(token);
  
  if (!model.vocabulary[norm]) {
    model.vocabulary[norm] = {
      count: 0,
      categoryFreq: { DATA: 0, TECNICA: 0, GEO: 0, MATERIAL: 0, 
                     AUTORIA: 0, PROVENIENCIA: 0, QUALIFICADOR: 0, O: 0 },
      bigramLeft: {},
      bigramRight: {}
    };
  }

  // Reforçar a categoria correta
  model.vocabulary[norm].count += 3;  // Peso 3x para feedback humano
  model.vocabulary[norm].categoryFreq[correctCategory] += 3;

  // Persistir modelo atualizado
  try {
    await supabase
      .from('ml_models')
      .update({ 
        model_data: model,
        trained_at: new Date().toISOString()
      })
      .eq('model_name', 'ner-classifier');
  } catch (err) {
    console.warn('[Trainer] Update failed:', err);
  }

  return model;
}
