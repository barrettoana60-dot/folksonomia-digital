/**
 * Folksonomia Digital 2.0 — ML Service Client
 * 
 * Client HTTP que comunica com o microserviço Python (FastAPI no Render).
 * Inclui:
 * - Retry com exponential backoff
 * - Fallback automático para heurística quando serviço offline
 * - Cache de respostas (configurable TTL)
 * - Health check
 */

// ============================================================
// Configuração
// ============================================================

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || '';
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 60_000; // 1 minuto

// Cache simples em memória
const cache = new Map<string, { data: any; expires: number }>();

// ============================================================
// Tipos
// ============================================================

export interface MLServiceHealth {
  status: string;
  models: {
    embedder: boolean;
    ner: boolean;
    ner_version?: string;
  };
  device: string;
}

export interface NERPrediction {
  token: string;
  category: string;
  confidence: number;
  label: string;
}

export interface NERResponse {
  tokens: NERPrediction[];
  model_version?: string;
  inference_time_ms?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
}

export interface ContextPrediction {
  term: string;
  predictions: { category: string; score: number }[];
  best_category: string;
  best_score: number;
}

// ============================================================
// Client Principal
// ============================================================

class MLServiceClient {
  private baseUrl: string;
  private _online: boolean | null = null;
  private _lastCheck: number = 0;

  constructor() {
    this.baseUrl = ML_SERVICE_URL;
  }

  /**
   * Verifica se o ML Service está disponível.
   * Resultado é cacheado por 30 segundos.
   */
  async isOnline(): Promise<boolean> {
    if (!this.baseUrl) return false;
    
    // Cache de 30s
    if (this._online !== null && Date.now() - this._lastCheck < 30_000) {
      return this._online;
    }

    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000)
      });
      this._online = res.ok;
    } catch {
      this._online = false;
    }
    this._lastCheck = Date.now();
    return this._online;
  }

  /**
   * Health check detalhado.
   */
  async health(): Promise<MLServiceHealth | null> {
    if (!this.baseUrl) return null;
    
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Classificação NER via ModernBERT.
   * Retorna null se o serviço estiver offline ou modelo não treinado.
   */
  async predictNER(text: string): Promise<NERResponse | null> {
    return this._cachedRequest<NERResponse>('ner', text, '/predict-ner', { text });
  }

  /**
   * Gera embedding semântico de 768d.
   * Retorna null se o serviço estiver offline.
   */
  async embed(text: string): Promise<EmbeddingResponse | null> {
    // Embeddings não são cacheados (muito grandes)
    return this._request<EmbeddingResponse>('/embed', { text });
  }

  /**
   * Batch embeddings.
   */
  async embedBatch(texts: string[]): Promise<{ embeddings: number[][]; dimensions: number } | null> {
    return this._request('/embed', { text: texts[0], texts });
  }

  /**
   * Classificação contextual.
   */
  async predictContext(text: string, obraContext?: any): Promise<ContextPrediction | null> {
    return this._cachedRequest<ContextPrediction>(
      'ctx', text, '/predict-context', 
      { text, obra_context: obraContext }
    );
  }

  /**
   * Dispara treinamento (requer auth).
   */
  async triggerTraining(datasetJsonl: string, config?: any): Promise<any | null> {
    if (!this.baseUrl) return null;
    
    try {
      const res = await fetch(`${this.baseUrl}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_SECRET || ''}`
        },
        body: JSON.stringify({
          dataset_jsonl: datasetJsonl,
          model_name: 'modernbert_ner',
          config
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Métricas do modelo.
   */
  async getMetrics(): Promise<any | null> {
    if (!this.baseUrl) return null;
    try {
      const res = await fetch(`${this.baseUrl}/metrics`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ============================================================
  // Internos
  // ============================================================

  private async _request<T>(endpoint: string, body: any): Promise<T | null> {
    if (!this.baseUrl) return null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = DEFAULT_TIMEOUT_MS * (attempt + 1);
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeout)
        });

        if (res.ok) {
          return await res.json() as T;
        }
        
        // 503 = modelo não carregado, não retry
        if (res.status === 503) return null;
        
      } catch {
        if (attempt < MAX_RETRIES) {
          // Exponential backoff
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }

    return null;
  }

  private async _cachedRequest<T>(
    prefix: string, 
    text: string, 
    endpoint: string, 
    body: any
  ): Promise<T | null> {
    const cacheKey = `${prefix}:${text}`;
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const result = await this._request<T>(endpoint, body);
    
    if (result) {
      cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
    }

    return result;
  }
}

// Singleton
export const mlClient = new MLServiceClient();
