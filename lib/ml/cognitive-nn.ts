/**
 * Folksonomia Digital 2.0 — Rede Neural de Aprendizado Cognitivo Responsivo
 * 
 * Implementa um Multi-Layer Perceptron (MLP) de duas camadas (10 -> 8 -> 1) 
 * que roda inteiramente no servidor local Next.js.
 * 
 * A rede estima a confiança de uma tag com base em 10 indicadores (fatores).
 * Quando os curadores aprovam ou rejeitam tags, a rede passa por retropropagação
 * (backpropagation) online para calibrar dinamicamente os pesos com base nas decisões reais.
 * 
 * Os pesos são persistidos de forma assíncrona na tabela `ml_execucoes`.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { ConfidenceFactors } from './scoring';

// Arquitetura: 10 Entradas, 8 Neurônios Ocultos, 1 Saída
const INPUT_DIM = 10;
const HIDDEN_DIM = 8;
const OUTPUT_DIM = 1;

export interface NeuralWeights {
  weights1: number[][]; // [HIDDEN_DIM][INPUT_DIM]
  bias1: number[];      // [HIDDEN_DIM]
  weights2: number[];   // [HIDDEN_DIM]
  bias2: number;
}

export class CognitiveNeuralNetwork {
  private weights1: number[][];
  private bias1: number[];
  private weights2: number[];
  private bias2: number;
  private learningRate: number = 0.01; // Taxa de aprendizado inicial ideal para Adam
  private isLoaded: boolean = false;

  // Hiperparâmetros Adam
  private beta1: number = 0.9;
  private beta2: number = 0.999;
  private epsilon: number = 1e-8;

  // Adam: Momentos de primeira ordem (m)
  private mWeights1: number[][];
  private mBias1: number[];
  private mWeights2: number[];
  private mBias2: number;

  // Adam: Momentos de segunda ordem (v)
  private vWeights1: number[][];
  private vBias1: number[];
  private vWeights2: number[];
  private vBias2: number;
  
  private trainStepCount: number = 0;

  constructor() {
    // Inicialização He/Xavier básica para fallback
    this.weights1 = Array.from({ length: HIDDEN_DIM }, () =>
      Array.from({ length: INPUT_DIM }, () => (Math.random() - 0.5) * Math.sqrt(2 / INPUT_DIM))
    );
    this.bias1 = Array(HIDDEN_DIM).fill(0);
    
    // Inicialização de Adam (Momentos m e v) para a primeira camada
    this.mWeights1 = Array.from({ length: HIDDEN_DIM }, () => Array(INPUT_DIM).fill(0));
    this.vWeights1 = Array.from({ length: HIDDEN_DIM }, () => Array(INPUT_DIM).fill(0));
    this.mBias1 = Array(HIDDEN_DIM).fill(0);
    this.vBias1 = Array(HIDDEN_DIM).fill(0);

    // Inicialização de Adam (Momentos m e v) para a segunda camada (saída)
    this.mWeights2 = Array(HIDDEN_DIM).fill(0);
    this.vWeights2 = Array(HIDDEN_DIM).fill(0);
    this.mBias2 = 0;
    this.vBias2 = 0;

    // Warm-start: Pesos iniciais da camada oculta para corresponder 
    // aproximadamente às heurísticas de pontuação estática originais.
    // Fatores de entrada:
    // 0: modelProbability (peso aprox: 0.30)
    // 1: vectorSimilarity (peso aprox: 0.10)
    // 2: externalSourceCount (peso aprox: 0.15)
    // 3: externalSourceQuality (peso aprox: 0.10)
    // 4: humanValidations (peso aprox: 0.25)
    // 5: humanRejections (peso aprox: -0.30)
    // 6: obraCoherence (peso aprox: 0.10)
    // 7: categoryAccuracy (peso aprox: 0.05)
    // 8: memoryMatches (peso aprox: 0.05)
    // 9: termType (multiword: 0.05)
    
    this.weights2 = Array(HIDDEN_DIM).fill(0.2);
    this.bias2 = -0.5;

    // Configurando neurônios da camada oculta para focar em fatores específicos
    // Neurônio 0: Foco em inteligência de modelos (NER + embeddings)
    this.weights1[0][0] = 1.5; this.weights1[0][1] = 0.8;
    // Neurônio 1: Foco em validação humana positiva
    this.weights1[1][4] = 2.0; this.weights1[1][8] = 0.5;
    // Neurônio 2: Foco em rejeição humana (forte impacto negativo)
    this.weights1[2][5] = -3.0;
    // Neurônio 3: Foco em fontes externas
    this.weights1[3][2] = 1.2; this.weights1[3][3] = 0.8;
    // Neurônio 4: Foco em coerência textual e contexto
    this.weights1[4][6] = 1.5; this.weights1[4][7] = 0.5;
    // Neurônio 5: Termos compostos e correspondência de memória
    this.weights1[5][9] = 1.0; this.weights1[5][8] = 0.8;
    // Neurônio 6: Combinação geral positiva
    this.weights1[6][0] = 0.6; this.weights1[6][4] = 0.8; this.weights1[6][2] = 0.5;
    // Neurônio 7: Combinação geral de controle de qualidade
    this.weights1[7][1] = 0.5; this.weights1[7][3] = 0.5; this.weights1[7][5] = -1.5;

    // Pesos da saída para ponderar os neurônios ocultos
    this.weights2 = [0.25, 0.30, -0.45, 0.20, 0.15, 0.10, 0.25, -0.20];
    this.bias2 = 0.1;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private sigmoidDerivative(y: number): number {
    return y * (1 - y);
  }

  private leakyRelu(x: number): number {
    return Math.max(0.01 * x, x);
  }

  private leakyReluDerivative(x: number): number {
    return x > 0 ? 1 : 0.01;
  }

  /**
   * Converte a estrutura de fatores do sistema em vetor de entrada normalizado [0, 1]
   */
  public factorsToVector(factors: ConfidenceFactors): number[] {
    const vec = Array(INPUT_DIM).fill(0);
    vec[0] = factors.modelProbability !== undefined ? factors.modelProbability : 0.4;
    vec[1] = factors.vectorSimilarity !== undefined ? factors.vectorSimilarity : 0.3;
    
    const count = factors.externalSourceCount || 0;
    vec[2] = Math.min(count / 5, 1.0); // Normalizado
    vec[3] = factors.externalSourceQuality !== undefined ? factors.externalSourceQuality : 0.0;
    
    const valids = factors.humanValidations || 0;
    vec[4] = Math.min(valids / 4, 1.0); // A partir de 4 validações, satura em 1
    
    const rejects = factors.humanRejections || 0;
    vec[5] = Math.min(rejects / 4, 1.0);
    
    vec[6] = factors.obraCoherence !== undefined ? factors.obraCoherence : 0.0;
    vec[7] = factors.categoryAccuracy !== undefined ? factors.categoryAccuracy : 0.8;
    
    const matches = factors.memoryMatches || 0;
    vec[8] = Math.min(matches / 5, 1.0);
    
    vec[9] = factors.isMultiWord ? 1.0 : 0.0;
    return vec;
  }

  /**
   * Executa a inferência direta (Forward Pass)
   */
  public forward(input: number[]): { output: number; hidden: number[] } {
    const hidden: number[] = [];
    
    // Camada Oculta: Input -> Hidden (Ativação LeakyReLU para evitar Dead Neurons)
    for (let i = 0; i < HIDDEN_DIM; i++) {
      let sum = this.bias1[i];
      for (let j = 0; j < INPUT_DIM; j++) {
        sum += input[j] * this.weights1[i][j];
      }
      hidden.push(this.leakyRelu(sum));
    }

    // Camada de Saída: Hidden -> Output (Ativação Sigmoid para probabilidade)
    let outSum = this.bias2;
    for (let i = 0; i < HIDDEN_DIM; i++) {
      outSum += hidden[i] * this.weights2[i];
    }
    const output = this.sigmoid(outSum);

    return { output, hidden };
  }

  /**
   * Rede Semântica de Aprendizado Mútuo & Vetores Co-Adjacentes:
   * Realiza a troca de preposições e retransposição de embeddings baseados em hashes co-adjacentes.
   */
  public swapPrepositions(term: string): string {
    // Retransforma preposições para mapeamento mútuo e normalização de conceitos redundantes
    const preposicoes = [' de ', ' da ', ' do ', ' em ', ' para ', ' com ', ' sob ', ' sobre ', ' a ', ' o '];
    let cleaned = term.toLowerCase().trim();
    for (const prep of preposicoes) {
      cleaned = cleaned.replace(new RegExp(prep, 'g'), ' ');
    }
    return cleaned.split(/\s+/).sort().join(' '); // Reordenação alfabética co-adjacente
  }

  public getCoAdjacentMatrix(tagNormalized: string, siblingTags: string[]): number[] {
    // Computa a assinatura vetorial co-adjacente de co-ocorrência baseada em Jaccard de caracteres e hash
    const vec = Array(10).fill(0);
    const swappedMain = this.swapPrepositions(tagNormalized);

    siblingTags.forEach((sibling, idx) => {
      if (idx >= 10) return;
      const swappedSibling = this.swapPrepositions(sibling);
      
      // Hash do conceito simples (Soma dos caracteres ASCII mod 100 / 100)
      let hash = 0;
      for (let i = 0; i < swappedSibling.length; i++) {
        hash += swappedSibling.charCodeAt(i);
      }
      const hashVal = (hash % 100) / 100;

      // Jaccard Similarity Index de caracteres entre termos normalizados
      const setA = new Set(swappedMain.split(''));
      const setB = new Set(swappedSibling.split(''));
      
      let intersection = 0;
      setA.forEach(char => {
        if (setB.has(char)) intersection++;
      });
      
      const union = new Set([...setA, ...setB]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      
      vec[idx] = (hashVal * 0.3) + (jaccard * 0.7); // Fusão matemática co-adjacente
    });

    return vec;
  }

  /**
   * Aprendizado Mútuo & Memória Muscular de Longo Prazo:
   * Modula pesos neurais baseados nas relações cruzadas co-adjacentes de tags irmãs.
   */
  public async trainMutually(mainTag: string, siblingTags: string[], target: number): Promise<number> {
    await this.ensureLoaded();
    const vecInput = this.getCoAdjacentMatrix(mainTag, siblingTags);
    
    // Retropropagação do vetor co-adjacente diretamente na rede neural de aprendizado mútuo
    const error = await this.trainStep(vecInput, target);
    console.log(`[CognitiveNN] Aprendizado Mútuo Muscular executado para "${mainTag}". Erro residual: ${error.toFixed(4)}`);
    return error;
  }

  public async trainStep(input: number[], target: number): Promise<number> {
    await this.ensureLoaded();

    this.trainStepCount++;
    const t = this.trainStepCount;

    // Hiperparâmetros Adam
    const lr = this.learningRate;
    const beta1 = this.beta1;
    const beta2 = this.beta2;
    const eps = this.epsilon;
    const lambda = 0.0001; // Regularização L2 (Weight Decay)

    // 1. Forward Pass
    const { output, hidden } = this.forward(input);
    const error = target - output;

    // 2. Backpropagation - Gradiente da camada de saída
    const outputDelta = error * this.sigmoidDerivative(output);

    // Gradientes da camada oculta (LeakyReLU Derivative)
    const hiddenDeltas: number[] = Array(HIDDEN_DIM).fill(0);
    for (let i = 0; i < HIDDEN_DIM; i++) {
      const deriv = this.leakyReluDerivative(hidden[i]);
      hiddenDeltas[i] = outputDelta * this.weights2[i] * deriv;
    }

    // 3. Atualização de parâmetros com Adam Optimizer
    
    // Atualizar Pesos da Camada de Saída (weights2)
    for (let i = 0; i < HIDDEN_DIM; i++) {
      const gW2 = -outputDelta * hidden[i] + lambda * this.weights2[i];
      this.mWeights2[i] = beta1 * this.mWeights2[i] + (1 - beta1) * gW2;
      this.vWeights2[i] = beta2 * this.vWeights2[i] + (1 - beta2) * gW2 * gW2;
      
      const mHat = this.mWeights2[i] / (1 - Math.pow(beta1, t));
      const vHat = this.vWeights2[i] / (1 - Math.pow(beta2, t));
      
      this.weights2[i] -= lr * mHat / (Math.sqrt(vHat) + eps);
    }
    
    // Atualizar Bias da Camada de Saída (bias2)
    const gB2 = -outputDelta;
    this.mBias2 = beta1 * this.mBias2 + (1 - beta1) * gB2;
    this.vBias2 = beta2 * this.vBias2 + (1 - beta2) * gB2 * gB2;
    
    const mBias2Hat = this.mBias2 / (1 - Math.pow(beta1, t));
    const vBias2Hat = this.vBias2 / (1 - Math.pow(beta2, t));
    this.bias2 -= lr * mBias2Hat / (Math.sqrt(vBias2Hat) + eps);

    // Atualizar Pesos da Camada Oculta (weights1)
    for (let i = 0; i < HIDDEN_DIM; i++) {
      for (let j = 0; j < INPUT_DIM; j++) {
        const gW1 = -hiddenDeltas[i] * input[j] + lambda * this.weights1[i][j];
        this.mWeights1[i][j] = beta1 * this.mWeights1[i][j] + (1 - beta1) * gW1;
        this.vWeights1[i][j] = beta2 * this.vWeights1[i][j] + (1 - beta2) * gW1 * gW1;
        
        const mHat = this.mWeights1[i][j] / (1 - Math.pow(beta1, t));
        const vHat = this.vWeights1[i][j] / (1 - Math.pow(beta2, t));
        
        this.weights1[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps);
      }
      
      // Atualizar Bias da Camada Oculta (bias1)
      const gB1 = -hiddenDeltas[i];
      this.mBias1[i] = beta1 * this.mBias1[i] + (1 - beta1) * gB1;
      this.vBias1[i] = beta2 * this.vBias1[i] + (1 - beta2) * gB1 * gB1;
      
      const mBias1Hat = this.mBias1[i] / (1 - Math.pow(beta1, t));
      const vBias1Hat = this.vBias1[i] / (1 - Math.pow(beta2, t));
      this.bias1[i] -= lr * mBias1Hat / (Math.sqrt(vBias1Hat) + eps);
    }

    // 4. Persistir pesos no banco
    await this.saveWeights();

    return Math.abs(error);
  }


  /**
   * Carrega os pesos mais recentes salvos no Supabase.
   */
  public async ensureLoaded() {
    if (this.isLoaded) return;

    try {
      const { data, error } = await supabaseAdmin
        .from('ml_execucoes')
        .select('metricas')
        .eq('tipo_execucao', 'cognitive_weights')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].metricas) {
        const payload = data[0].metricas as any;
        if (payload.weights1 && payload.weights2) {
          this.weights1 = payload.weights1;
          this.bias1 = payload.bias1 || Array(HIDDEN_DIM).fill(0);
          this.weights2 = payload.weights2;
          this.bias2 = payload.bias2 !== undefined ? payload.bias2 : 0;
          console.log('[CognitiveNN] Pesos neurais carregados com sucesso do banco.');
        }
      } else {
        console.log('[CognitiveNN] Sem pesos no banco. Usando pesos warm-start calibrados.');
        // Registrar pesos padrão iniciais no banco
        await this.saveWeights();
      }
    } catch (err) {
      console.warn('[CognitiveNN] Falha ao ler pesos do banco, usando inicialização local:', err);
    } finally {
      this.isLoaded = true;
    }
  }

  public getWeights(): NeuralWeights {
    return {
      weights1: this.weights1,
      bias1: this.bias1,
      weights2: this.weights2,
      bias2: this.bias2
    };
  }

  /**
   * Memória Muscular de Longo Prazo — Replay Semântico Autônomo:
   * Reproduz toda a memória semântica validada do banco como ciclo de retreinamento
   * contínuo. Semelhante ao sono REM — o sistema consolida padrões aprendidos.
   * 
   * Chamado pelo cron às 4h da manhã (Brasília) para auto-calibração noturna.
   */
  public async replaySemanticMemory(): Promise<{ trained: number; avgError: number }> {
    await this.ensureLoaded();
    let trained = 0;
    let totalError = 0;

    try {
      // 1. Buscar todos os termos da memória semântica validados
      const { data: memories } = await supabaseAdmin
        .from('semantic_memory')
        .select('termo_normalizado, confianca, status')
        .in('status', ['validado', 'ativo'])
        .limit(100);

      if (!memories || memories.length === 0) {
        console.log('[CognitiveNN-Replay] Memória semântica vazia — sem replay a executar.');
        return { trained: 0, avgError: 0 };
      }

      console.log(`[CognitiveNN-Replay] Iniciando replay de ${memories.length} memórias...`);

      // 2. Para cada memória, buscar co-ocorrências reais e retreinar
      for (const mem of memories) {
        try {
          const termName = mem.termo_normalizado;

          // Buscar os 10 irmãos mais frequentes deste termo no banco de tags
          const { data: siblings } = await supabaseAdmin
            .from('tags')
            .select('tag_normalizada')
            .neq('tag_normalizada', termName)
            .limit(10);

          const siblingNames = (siblings || []).map((s: any) => s.tag_normalizada);

          // Target: confiança salva na memória (0.0 – 1.0)
          const target = typeof mem.confianca === 'number'
            ? Math.max(0, Math.min(1, mem.confianca))
            : 0.7;

          // Treinar mútuo com a co-adjacência dos irmãos reais
          const vecInput = this.getCoAdjacentMatrix(termName, siblingNames);
          const err = await this.trainStep(vecInput, target);
          totalError += err;
          trained++;
        } catch {
          // Falha silenciosa por termo individual
        }
      }

      const avgError = trained > 0 ? totalError / trained : 0;

      // 3. Registrar log do ciclo de replay
      try {
        await supabaseAdmin.from('ml_execucoes').insert({
          tipo_execucao: 'semantic_memory_replay',
          resumo: `Replay noturno: ${trained} memórias retreinadas. Erro médio: ${(avgError * 100).toFixed(2)}%`,
          status: 'completed',
          metricas: { trained, avgError, timestamp: new Date().toISOString() }
        });
      } catch { /* silent */ }

      console.log(`[CognitiveNN-Replay] ✓ Concluído. Memórias retreinadas: ${trained}. Erro médio: ${(avgError * 100).toFixed(2)}%`);
      return { trained, avgError };

    } catch (err) {
      console.warn('[CognitiveNN-Replay] Erro no replay:', err);
      return { trained, avgError: totalError > 0 ? totalError / Math.max(trained, 1) : 0 };
    }
  }

  /**
   * Salva os pesos atuais no banco de dados.
   */
  private async saveWeights() {
    try {
      const payload: NeuralWeights = {
        weights1: this.weights1,
        bias1: this.bias1,
        weights2: this.weights2,
        bias2: this.bias2
      };

      await supabaseAdmin
        .from('ml_execucoes')
        .insert({
          tipo_execucao: 'cognitive_weights',
          resumo: 'Pesos calibrados do cérebro neural cognitivo',
          status: 'active',
          metricas: payload
        });
    } catch (err) {
      console.warn('[CognitiveNN] Erro ao persistir pesos neurais:', err);
    }
  }
}

// Singleton global da Rede Neural
export const cognitiveNN = new CognitiveNeuralNetwork();
