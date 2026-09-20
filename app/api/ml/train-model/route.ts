/**
 * API Route: /api/ml/train-model
 * 
 * Dispara treinamento do ModernBERT via ML Service externo (Render).
 * NÃO executa Python localmente (incompatível com Vercel).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/core/auth-guard';
import { collectTrainingData, exportToHuggingFace } from '@/lib/ml/training-data-collector';
import { supabaseAdmin } from '@/lib/supabase/client';
import { ML_SERVICE_URL } from '@/lib/core/env';

export async function POST(req: NextRequest) {
  // Requer autenticação admin
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const mlServiceUrl = ML_SERVICE_URL;

    // 1. Gerar dados de treinamento (Europeana + IBRAM)
    console.log('[TrainModelAPI] Coletando dados para treinamento...');
    const result = await collectTrainingData(50, 20);
    
    // 2. Registrar training run no banco
    const { data: runRecord } = await supabaseAdmin
      .from('training_runs')
      .insert({
        nome_modelo: 'modernbert_ner',
        status: 'iniciado',
        dataset_exemplos: result.samples.length,
        dataset_split: { train: 80, eval: 20 },
        disparado_por: 'api'
      })
      .select()
      .single();

    // 3. Salvar exemplos no banco para persistência
    try {
      for (const sample of result.samples.slice(0, 100)) {
        await supabaseAdmin.from('semantic_training_examples').insert({
          texto: sample.text,
          tokens: sample.tokens.map(t => t.token),
          labels: sample.tokens.map(t => t.label),
          contexto: sample.contexto || {},
          fonte: sample.source,
          fonte_id: sample.id,
          qualidade: 'auto'
        });
      }
    } catch (err) {
      console.warn('[TrainModelAPI] Falha ao persistir exemplos:', err);
    }

    // 4. Enviar para ML Service (se disponível)
    if (mlServiceUrl) {
      try {
        const jsonlData = exportToHuggingFace(result.samples);
        
        const trainRes = await fetch(`${mlServiceUrl}/train`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ADMIN_SECRET || ''}`
          },
          body: JSON.stringify({
            dataset_jsonl: jsonlData,
            model_name: 'modernbert_ner',
            run_id: runRecord?.id,
            config: {
              epochs: 5,
              batch_size: 8,
              learning_rate: 3e-5
            }
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (trainRes.ok) {
          const trainData = await trainRes.json();
          
          // Atualizar status do run
          if (runRecord?.id) {
            await supabaseAdmin
              .from('training_runs')
              .update({ status: 'treinando' })
              .eq('id', runRecord.id);
          }

          return NextResponse.json({
            success: true,
            message: 'Treinamento enviado ao ML Service (Render)',
            method: 'ml_service',
            stats: result.stats,
            run_id: runRecord?.id,
            ml_response: trainData
          });
        } else {
          console.warn('[TrainModelAPI] ML Service rejeitou:', trainRes.status);
        }
      } catch (err) {
        console.warn('[TrainModelAPI] ML Service indisponível:', err);
      }
    }

    // 5. Fallback: salvar dataset localmente para treinamento manual
    const jsonlData = exportToHuggingFace(result.samples);
    
    // Atualizar status
    if (runRecord?.id) {
      await supabaseAdmin
        .from('training_runs')
        .update({ 
          status: 'dataset_pronto',
          metricas_treino: { 
            message: 'Dataset gerado. ML Service offline. Treine manualmente via Colab.',
            dataset_size: result.samples.length
          }
        })
        .eq('id', runRecord.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset gerado. ML Service offline — treine via Google Colab.',
      method: 'dataset_only',
      stats: result.stats,
      run_id: runRecord?.id,
      dataset_preview: jsonlData.split('\n').slice(0, 3)
    });
  } catch (err) {
    console.error('[TrainModelAPI] Error:', err);
    return NextResponse.json({ error: 'Erro no disparo do treinamento' }, { status: 500 });
  }
}
