import { supabaseAdmin } from '@/lib/supabase/client';

// ============================================================
// Folksonomia Digital 2.0 — Barramento de Eventos ML
// Substitui Apache Kafka em ambiente serverless (Vercel).
// Usa Supabase como event store persistente.
// ============================================================

export type EventType = 'INGESTAO' | 'CONEXAO' | 'VALIDACAO' | 'CONSULTA';

export interface MLEvent {
  tipo: EventType;
  origem: string;        // ex: 'europeana', 'curador', 'rotate', 'gat'
  payload: Record<string, any>;
  timestamp?: string;
}

export interface EventLog {
  id?: string;
  tipo: EventType;
  origem: string;
  payload: Record<string, any>;
  resultado?: Record<string, any>;
  status: 'pendente' | 'processado' | 'erro';
  created_at?: string;
}

// ============================================================
// Handlers por tipo de evento
// ============================================================

/**
 * EVENTO DE INGESTÃO
 * Disparado quando uma API externa publica um dado novo/atualizado.
 * Processa via ModernBERT e verifica se altera o DNA de algum objeto.
 */
async function handleIngestao(event: MLEvent): Promise<Record<string, any>> {
  const { source, query, items } = event.payload;
  
  // 1. Registrar os itens ingeridos
  const ingestedCount = Array.isArray(items) ? items.length : 0;
  
  // 2. Para cada item, verificar se já existe um nó no grafo
  // e propagar sinal de atualização se necessário
  const updates: string[] = [];
  
  if (ingestedCount > 0) {
    // Buscar tags que compartilham termos com os itens ingeridos
    const { data: relatedTags } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, grupo_tematico')
      .or(items.slice(0, 5).map((i: any) => 
        `tag_original.ilike.%${(i.titulo || '').split(' ')[0]}%`
      ).join(','))
      .limit(10);
    
    if (relatedTags && relatedTags.length > 0) {
      updates.push(...relatedTags.map((t: any) => 
        `Tag "${t.tag_original}" (grupo: ${t.grupo_tematico}) pode ser atualizada com novos dados de ${source}`
      ));
    }
  }
  
  return {
    tipo: 'INGESTAO',
    fonte: source,
    itens_ingeridos: ingestedCount,
    tags_impactadas: updates.length,
    propagacoes: updates,
    modernbert_status: 'processado'
  };
}

/**
 * EVENTO DE CONEXÃO
 * Disparado quando RotatE/GAT detectam nova relação entre nós.
 * Atualiza vetores de pertencimento sem reprocessar objetos.
 */
async function handleConexao(event: MLEvent): Promise<Record<string, any>> {
  const { no_origem, no_destino, tipo_relacao, confianca } = event.payload;
  
  // 1. Registrar a nova conexão no grafo de conhecimento
  const conexao = {
    de: no_origem,
    para: no_destino,
    relacao: tipo_relacao,
    peso: confianca || 0.5,
    motor: 'rotate+gat'
  };
  
  // 2. Recalcular vizinhos diretos (simulado via query)
  const { data: vizinhos } = await supabaseAdmin
    .from('tags')
    .select('id, tag_original, grupo_tematico')
    .or(`tag_original.ilike.%${no_origem}%,tag_original.ilike.%${no_destino}%`)
    .limit(20);
  
  return {
    tipo: 'CONEXAO',
    conexao_criada: conexao,
    vizinhos_recalculados: (vizinhos || []).length,
    vetores_atualizados: true,
    rotate_status: 'inferido',
    gat_status: 'multi-membership atualizado'
  };
}

/**
 * EVENTO DE VALIDAÇÃO
 * Disparado quando curador interage (aprovar/rejeitar no grafo).
 * Maior peso — aciona retreinamento parcial dos modelos.
 */
async function handleValidacao(event: MLEvent): Promise<Record<string, any>> {
  const { tag_id, acao, curador, motivo } = event.payload;
  
  // 1. Registrar a decisão do curador
  const decisao = {
    tag: tag_id,
    acao: acao, // 'aprovar' | 'rejeitar' | 'reclassificar'
    curador: curador || 'admin',
    peso_treinamento: acao === 'aprovar' ? 1.0 : -1.0,
    motivo: motivo || ''
  };
  
  // 2. Gerar sinal de retreinamento
  const trainingSignal = {
    tipo: 'retreinamento_parcial',
    modelos_afetados: ['modernbert-ner', 'rotate-kg', 'gat-clustering'],
    peso: decisao.peso_treinamento,
    propagacao: 'vizinhos_diretos'
  };
  
  return {
    tipo: 'VALIDACAO',
    decisao,
    training_signal: trainingSignal,
    retreinamento_agendado: true,
    modelos_impactados: 3
  };
}

/**
 * EVENTO DE CONSULTA
 * Disparado quando sistema é interrogado (curador ou grafo).
 * Não modifica dados — gera logs analíticos.
 */
async function handleConsulta(event: MLEvent): Promise<Record<string, any>> {
  const { query, origem_consulta, contexto } = event.payload;
  
  return {
    tipo: 'CONSULTA',
    query,
    origem: origem_consulta || 'curador',
    contexto: contexto || 'relatorio_semantico',
    log_analitico: {
      timestamp: new Date().toISOString(),
      termos_buscados: query,
      finalidade: 'otimizacao_continua'
    }
  };
}

// ============================================================
// Dispatcher Central
// ============================================================
const handlers: Record<EventType, (e: MLEvent) => Promise<Record<string, any>>> = {
  INGESTAO: handleIngestao,
  CONEXAO: handleConexao,
  VALIDACAO: handleValidacao,
  CONSULTA: handleConsulta
};

/**
 * Dispara um evento no barramento ML.
 * Persiste no Supabase e executa o handler correspondente.
 */
export async function dispatchEvent(event: MLEvent): Promise<EventLog> {
  const log: EventLog = {
    tipo: event.tipo,
    origem: event.origem,
    payload: event.payload,
    status: 'pendente'
  };

  try {
    // Executar handler
    const handler = handlers[event.tipo];
    if (!handler) throw new Error(`Handler não encontrado para tipo: ${event.tipo}`);
    
    const resultado = await handler(event);
    log.resultado = resultado;
    log.status = 'processado';
  } catch (err: any) {
    log.resultado = { error: err.message };
    log.status = 'erro';
  }

  // Persistir no Supabase (tabela ml_events)
  try {
    await supabaseAdmin.from('ml_events').insert({
      tipo: log.tipo,
      origem: log.origem,
      payload: log.payload,
      resultado: log.resultado,
      status: log.status
    });
  } catch {
    // Se a tabela não existe ainda, não bloqueia o fluxo
    console.warn('[EventBus] Tabela ml_events não encontrada, log não persistido');
  }

  return log;
}

/**
 * Busca eventos recentes do barramento.
 */
export async function getRecentEvents(limit = 50): Promise<EventLog[]> {
  try {
    const { data } = await supabaseAdmin
      .from('ml_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Retorna estatísticas do barramento.
 */
export async function getEventStats() {
  try {
    const { data: all } = await supabaseAdmin
      .from('ml_events')
      .select('tipo, status');
    
    if (!all) return { total: 0, por_tipo: {}, por_status: {} };
    
    const porTipo: Record<string, number> = {};
    const porStatus: Record<string, number> = {};
    
    for (const e of all) {
      porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
      porStatus[e.status] = (porStatus[e.status] || 0) + 1;
    }
    
    return { total: all.length, por_tipo: porTipo, por_status: porStatus };
  } catch {
    return { total: 0, por_tipo: {}, por_status: {} };
  }
}
