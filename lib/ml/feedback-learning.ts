import { supabaseAdmin as supabase } from '@/lib/supabase/client';

/**
 * Registra o feedback humano (validação curatorial) e ajusta o peso do sistema.
 * No futuro, isso pode atualizar centroides de clusters ou pesos de similaridade.
 */
export async function processHumanFeedback(
  nucleoId: string, 
  userId: string, 
  action: 'approve' | 'reject' | 'merge',
  comment?: string
) {
  // 1. Salvar na tabela de feedback_ml conforme solicitado
  const { error } = await supabase
    .from('feedback_ml')
    .insert({
      nucleo_id: nucleoId,
      usuario_id: userId,
      acao: action,
      comentario: comment,
      impacto: action === 'approve' ? 1 : -1,
      criado_em: new Date().toISOString()
    });

  if (error) throw error;

  // 2. Atualizar o status do núcleo para refletir o aprendizado
  await supabase
    .from('nucleos')
    .update({ 
      status_validacao: action === 'approve' ? 'validado' : 'rejeitado',
      confianca: action === 'approve' ? 0.95 : 0.1 // Aumenta/Diminui confiança após humano intervir
    })
    .eq('id', nucleoId);

  return { success: true };
}
