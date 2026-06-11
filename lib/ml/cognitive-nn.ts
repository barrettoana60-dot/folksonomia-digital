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
  private learningRate: number = 0.05;
  private isLoaded: boolean = false;

  constructor() {
    // Inicialização He/Xavier básica para fallback
    this.weights1 = Array.from({ length: HIDDEN_DIM }, () =>
      Array.from({ length: INPUT_DIM }, () => (Math.random() - 0.5) * Math.sqrt(2 / INPUT_DIM))
    );
    this.bias1 = Array(HIDDEN_DIM).fill(0);
    
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

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
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
    
    // Camada Oculta: Input -> Hidden (Ativação ReLU para maior linearidade cognitiva)
    for (let i = 0; i < HIDDEN_DIM; i++) {
      let sum = this.bias1[i];
      for (let j = 0; j < INPUT_DIM; j++) {
        sum += input[j] * this.weights1[i][j];
      }
      hidden.push(this.relu(sum));
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
   * Treina a rede neural utilizando Retropropagação (Backpropagation) online
   * baseado em um único exemplo de feedback.
   */
  public async trainStep(input: number[], target: number): Promise<number> {
    await this.ensureLoaded();

    // 1. Forward Pass
    const { output, hidden } = this.forward(input);
    const error = target - output;

    // 2. Cálculo dos Gradientes (Backpropagation)
    // Gradiente da camada de saída
    const outputDelta = error * this.sigmoidDerivative(output);

    // Gradientes da camada oculta
    const hiddenDeltas: number[] = Array(HIDDEN_DIM).fill(0);
    for (let i = 0; i < HIDDEN_DIM; i++) {
      // Usamos a derivada de ReLU com base na ativação oculta (ReLU derivativa é 1 se ativo, 0 caso contrário)
      const deriv = hidden[i] > 0 ? 1 : 0;
      hiddenDeltas[i] = outputDelta * this.weights2[i] * deriv;
    }

    // 3. Atualização de Pesos e Bias (Gradient Descent)
    // Atualizar camada de saída
    for (let i = 0; i < HIDDEN_DIM; i++) {
      this.weights2[i] += this.learningRate * outputDelta * hidden[i];
    }
    this.bias2 += this.learningRate * outputDelta;

    // Atualizar camada oculta
    for (let i = 0; i < HIDDEN_DIM; i++) {
      for (let j = 0; j < INPUT_DIM; j++) {
        this.weights1[i][j] += this.learningRate * hiddenDeltas[i] * input[j];
      }
      this.bias1[i] += this.learningRate * hiddenDeltas[i];
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
  public getWeights(): NeuralWeights {
    return {
      weights1: this.weights1,
      bias1: this.bias1,
      weights2: this.weights2,
      bias2: this.bias2
    };
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
