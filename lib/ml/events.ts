/**
 * Folksonomia Digital 2.0 — Sistema de Eventos (Barramento)
 * 
 * Define os 4 tipos de eventos que trafegam pelo sistema:
 * - INGESTION: API externa publica dado novo/atualizado
 * - CONNECTION: RotatE/GAT detecta nova relação
 * - VALIDATION: Curador interage com o sistema
 * - QUERY: Sistema é interrogado (não modifica dados)
 * 
 * Implementação atual: fila em memória com persistência no Supabase.
 * Migração futura: Upstash Kafka quando o volume justificar.
 */

import type { 
  ClassifiedField, 
  DataSource, 
  InferenceMechanism, 
  MusealRelation 
} from './types';

// ============================================================
// Tipos de Eventos
// ============================================================

export type EventType = 'INGESTION' | 'CONNECTION' | 'VALIDATION' | 'QUERY';

export type EventPriority = 1 | 2 | 3 | 4;  // 1=máxima (validação), 4=mínima (consulta)

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: string;
  priority: EventPriority;
}

export interface IngestionEvent extends BaseEvent {
  type: 'INGESTION';
  priority: 2;
  payload: {
    source: DataSource;
    entityId: string;
    fields: ClassifiedField[];
    triggersReprocessing: boolean;  // true se altera DNA existente
  };
}

export interface ConnectionEvent extends BaseEvent {
  type: 'CONNECTION';
  priority: 3;
  payload: {
    mechanism: InferenceMechanism;
    head: string;
    tail: string;
    relation: MusealRelation;
    confidence: number;
    propagateToNeighbors: boolean;
  };
}

export interface ValidationEvent extends BaseEvent {
  type: 'VALIDATION';
  priority: 1;  // Maior peso — aciona retreinamento
  payload: {
    curatorId: string;
    inferenceId: string;
    action: 'approve' | 'reject';
    triggersRetraining: true;
    affectedModels: InferenceMechanism[];
    comment?: string;
  };
}

export interface QueryEvent extends BaseEvent {
  type: 'QUERY';
  priority: 4;
  payload: {
    queryType: 'curator_search' | 'graph_autocomplete' | 'gap_fill';
    query: string;
    resultsCount: number;
    latencyMs: number;
  };
}

export type FolksonomiaEvent = 
  | IngestionEvent 
  | ConnectionEvent 
  | ValidationEvent 
  | QueryEvent;

// ============================================================
// Event Dispatcher (Fila Local → Upstash Kafka futuro)
// ============================================================

type EventHandler = (event: FolksonomiaEvent) => Promise<void>;

class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private queue: FolksonomiaEvent[] = [];
  private processing = false;

  /**
   * Registra um handler para um tipo de evento
   */
  on(type: EventType, handler: EventHandler): void {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  /**
   * Emite um evento para o barramento.
   * Eventos são enfileirados e processados por prioridade.
   */
  async emit(event: FolksonomiaEvent): Promise<void> {
    this.queue.push(event);
    
    // Ordena por prioridade (1 = máxima)
    this.queue.sort((a, b) => a.priority - b.priority);

    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      const handlers = this.handlers.get(event.type) || [];

      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[EventBus] Error processing ${event.type}:`, err);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Retorna a contagem de eventos pendentes por tipo
   */
  getQueueStats(): Record<EventType, number> {
    const stats: Record<EventType, number> = {
      INGESTION: 0,
      CONNECTION: 0,
      VALIDATION: 0,
      QUERY: 0
    };
    
    for (const event of this.queue) {
      stats[event.type]++;
    }
    
    return stats;
  }
}

// Singleton global
export const eventBus = new EventBus();

// ============================================================
// Factory helpers para criar eventos com ID e timestamp
// ============================================================

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createIngestionEvent(
  payload: IngestionEvent['payload']
): IngestionEvent {
  return {
    id: generateEventId(),
    type: 'INGESTION',
    timestamp: new Date().toISOString(),
    priority: 2,
    payload
  };
}

export function createConnectionEvent(
  payload: ConnectionEvent['payload']
): ConnectionEvent {
  return {
    id: generateEventId(),
    type: 'CONNECTION',
    timestamp: new Date().toISOString(),
    priority: 3,
    payload
  };
}

export function createValidationEvent(
  payload: ValidationEvent['payload']
): ValidationEvent {
  return {
    id: generateEventId(),
    type: 'VALIDATION',
    timestamp: new Date().toISOString(),
    priority: 1,
    payload
  };
}

export function createQueryEvent(
  payload: QueryEvent['payload']
): QueryEvent {
  return {
    id: generateEventId(),
    type: 'QUERY',
    timestamp: new Date().toISOString(),
    priority: 4,
    payload
  };
}
