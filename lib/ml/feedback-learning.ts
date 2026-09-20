/**
 * Folksonomia Digital 2.0 — Motor de Aprendizado por Feedback Curatorial
 * 
 * Processa validações/rejeições de curadores e:
 * 1. Atualiza a camada validada da tag
 * 2. Emite eventos de validação (prioridade máxima)
 * 3. Registra sinais de treinamento para retreinamento dos modelos
 * 4. Persiste observações curatoriais do Map Graph
 */

import { supabaseAdmin as supabase } from '@/lib/supabase/client';
import { eventBus, createValidationEvent } from './events';
import { cognitiveNN } from './cognitive-nn';
import type { 
  CuratorObservation, 
  CuratorAction, 
  TrainingSignal,
  InferenceMechanism 
} from './types';

// ============================================================
// Validação Curatorial
// ============================================================

/**
 * Processa o feedback de um curador sobre uma inferência.
 * Este é o evento de MAIOR PESO no sistema — aciona retreinamento parcial.
 */
export async function processHumanFeedback(
  inferenceId: string,
  curatorId: string,
  action: 'approve' | 'reject',
  affectedModels: InferenceMechanism[] = ['heuristic'],
  comment?: string
) {
  // 1. Persistir no banco
  const { error } = await supabase
    .from('feedback_ml')
    .insert({
      nucleo_id: inferenceId,
      usuario_id: curatorId,
      acao: action,
      comentario: comment,
      impacto: action === 'approve' ? 1 : -1,
      criado_em: new Date().toISOString()
    });

  if (error) {
    console.warn('[Feedback] Database insert failed:', error);
  }

  // 2. Emitir evento de validação (prioridade 1 — máxima)
  await eventBus.emit(createValidationEvent({
    curatorId,
    inferenceId,
    action,
    triggersRetraining: true,
    affectedModels,
    comment
  }));

  // 3. Aprendizado Neural Online (Backpropagation)
  try {
    // Buscar fatores originais do núcleo
    const { data: nucleo } = await supabase
      .from('nucleos')
      .select('metadados')
      .eq('id', inferenceId)
      .single();

    if (nucleo?.metadados?.factors) {
      const inputVec = cognitiveNN.factorsToVector(nucleo.metadados.factors);
      const target = action === 'approve' ? 1.0 : 0.0;
      
      // Ajustar fatores de validação/rejeição humana na hora do treino
      if (action === 'approve') {
        nucleo.metadados.factors.humanValidations = (nucleo.metadados.factors.humanValidations || 0) + 1;
      } else {
        nucleo.metadados.factors.humanRejections = (nucleo.metadados.factors.humanRejections || 0) + 1;
      }
      
      const newVec = cognitiveNN.factorsToVector(nucleo.metadados.factors);
      
      // Rodar um passo de gradiente descendente
      const errorMargin = await cognitiveNN.trainStep(newVec, target);
      console.log(`[CognitiveNN] Treino online concluído para tag. Margem de erro: ${(errorMargin * 100).toFixed(2)}%`);
    }
  } catch (err) {
    console.warn('[Feedback] Falha no aprendizado cognitivo online:', err);
  }

  // 4. Atualizar confiança do núcleo
  const newConfidence = action === 'approve' ? 0.95 : 0.1;
  const newStatus = action === 'approve' ? 'validado' : 'rejeitado';

  await supabase
    .from('nucleos')
    .update({ 
      status_validacao: newStatus,
      confianca: newConfidence
    })
    .eq('id', inferenceId);

  // 5. Aprendizado Hebbiano (Hebbian learning) de Co-ocorrência
  if (action === 'approve') {
    try {
      const { data: currentNucleo } = await supabase
        .from('nucleos')
        .select('id, obra_id, conteudo_normalizado, tipo')
        .eq('id', inferenceId)
        .single();

      if (currentNucleo && currentNucleo.obra_id) {
        const { data: siblingNucleos } = await supabase
          .from('nucleos')
          .select('id, conteudo_normalizado, tipo')
          .eq('obra_id', currentNucleo.obra_id)
          .eq('status_validacao', 'validado')
          .neq('id', currentNucleo.id);

        if (siblingNucleos && siblingNucleos.length > 0) {
          for (const sib of siblingNucleos) {
            // Verificar se a relação já existe bidirecionalmente
            const { data: existingRel } = await supabase
              .from('relacoes')
              .select('id, peso')
              .or(`and(origem_id.eq.${currentNucleo.id},destino_id.eq.${sib.id}),and(origem_id.eq.${sib.id},destino_id.eq.${currentNucleo.id})`)
              .limit(1);

            let newWeight = 0.5;
            if (existingRel && existingRel.length > 0) {
              newWeight = Math.min(1.0, Number(existingRel[0].peso || 0.5) + 0.1);
              await supabase
                .from('relacoes')
                .update({
                  peso: newWeight,
                  metodo: 'hebbian_learning',
                  status: 'validada',
                  criado_em: new Date().toISOString()
                })
                .eq('id', existingRel[0].id);
            } else {
              await supabase
                .from('relacoes')
                .insert({
                  origem_id: currentNucleo.id,
                  destino_id: sib.id,
                  origem_tipo: currentNucleo.tipo,
                  destino_tipo: sib.tipo,
                  tipo_relacao: 'co_occurrence',
                  peso: newWeight,
                  metodo: 'hebbian_learning',
                  status: 'validada',
                  fonte: 'curador_validation'
                });
            }

            // Gravar log de Hebbian learning em tag_learning_history
            await supabase.from('tag_learning_history').insert([
              {
                tag_normalizada: currentNucleo.conteudo_normalizado,
                event_type: 'hebbian_reinforcement',
                event_details: {
                  action: 'reinforce',
                  target_tag: sib.conteudo_normalizado,
                  obra_id: currentNucleo.obra_id,
                  new_weight: newWeight,
                  timestamp: new Date().toISOString()
                }
              },
              {
                tag_normalizada: sib.conteudo_normalizado,
                event_type: 'hebbian_reinforcement',
                event_details: {
                  action: 'reinforce',
                  target_tag: currentNucleo.conteudo_normalizado,
                  obra_id: currentNucleo.obra_id,
                  new_weight: newWeight,
                  timestamp: new Date().toISOString()
                }
              }
            ]);
          }
        }
      }
    } catch (err) {
      console.warn('[HebbianLearning] Erro no aprendizado sináptico:', err);
    }
  }

  return { 
    success: true,
    action,
    newConfidence,
    eventEmitted: true
  };
}

// ============================================================
// Observações Curatoriais (Map Graph)
// ============================================================

/**
 * Registra uma observação feita pelo curador no Map Graph.
 * O grafo visual não é apenas output — é INPUT de treinamento.
 */
export async function recordCuratorObservation(
  curatorId: string,
  observedNodes: string[],
  observedPattern: string,
  action: CuratorAction,
  trainingSignal: TrainingSignal
): Promise<CuratorObservation> {
  const observation: CuratorObservation = {
    id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    curatorId,
    timestamp: new Date().toISOString(),
    observedNodes,
    observedPattern,
    action,
    trainingSignal
  };

  // Persistir no banco
  const { error } = await supabase
    .from('curator_observations')
    .insert({
      curator_id: curatorId,
      observed_nodes: observedNodes,
      observed_pattern: observedPattern,
      action,
      positive_pairs: trainingSignal.positivePairs || [],
      negative_pairs: trainingSignal.negativePairs || [],
      new_relation: trainingSignal.newRelation || null,
      processed: false
    });

  if (error) {
    console.warn('[CuratorObservation] Database insert failed:', error);
  }

  // Emitir evento de validação para cada par positivo/negativo
  if (trainingSignal.positivePairs) {
    for (const [head, tail] of trainingSignal.positivePairs) {
      await eventBus.emit(createValidationEvent({
        curatorId,
        inferenceId: `${head}__${tail}`,
        action: 'approve',
        triggersRetraining: true,
        affectedModels: ['rotate', 'gat']
      }));
    }
  }

  if (trainingSignal.negativePairs) {
    for (const [head, tail] of trainingSignal.negativePairs) {
      await eventBus.emit(createValidationEvent({
        curatorId,
        inferenceId: `${head}__${tail}`,
        action: 'reject',
        triggersRetraining: true,
        affectedModels: ['rotate', 'gat']
      }));
    }
  }

  return observation;
}

// ============================================================
// Coleta de Sinais de Treinamento Pendentes
// ============================================================

/**
 * Coleta observações curatoriais não processadas para retreinamento.
 * Chamado pelo pipeline de retreinamento parcial.
 */
export async function collectPendingTrainingSignals(): Promise<{
  positives: [string, string][];
  negatives: [string, string][];
  newRelations: { head: string; relation: string; tail: string }[];
}> {
  const positives: [string, string][] = [];
  const negatives: [string, string][] = [];
  const newRelations: { head: string; relation: string; tail: string }[] = [];

  const { data, error } = await supabase
    .from('curator_observations')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error || !data) return { positives, negatives, newRelations };

  for (const obs of data) {
    if (obs.positive_pairs) {
      positives.push(...obs.positive_pairs);
    }
    if (obs.negative_pairs) {
      negatives.push(...obs.negative_pairs);
    }
    if (obs.new_relation) {
      newRelations.push(obs.new_relation);
    }
  }

  // Marcar como processadas
  const ids = data.map(d => d.id);
  if (ids.length > 0) {
    await supabase
      .from('curator_observations')
      .update({ processed: true })
      .in('id', ids);
  }

  return { positives, negatives, newRelations };
}
