import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { nucleo_id, decisao, justificativa, valor_corrigido } = await req.json();

    // Map decision to status
    const statusMap: Record<string, string> = {
      validado: 'validado',
      rejeitado: 'rejeitado',
      revisado: 'revisado',
      publicado: 'publicado',
      fundido: 'fundido'
    };

    const novoStatus = statusMap[decisao] || 'revisado';

    // 1. Get current status
    const { data: nucleo } = await supabaseAdmin
      .from('nucleos')
      .select('status_validacao, conteudo_original')
      .eq('id', nucleo_id)
      .single();

    // 2. Persist validation decision
    await supabaseAdmin.from('validacoes').insert({
      nucleo_id,
      decisao,
      justificativa: justificativa || '',
      status_anterior: nucleo?.status_validacao,
      status_novo: novoStatus
    });

    // 3. Update nucleus status
    await supabaseAdmin
      .from('nucleos')
      .update({ status_validacao: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', nucleo_id);

    // 4. Update tag status too
    await supabaseAdmin
      .from('tags')
      .update({ status: novoStatus === 'publicado' ? 'publicado' : novoStatus })
      .eq('nucleo_id', nucleo_id);

    // 5. Save human feedback for ML learning
    await supabaseAdmin.from('feedback_ml').insert({
      nucleo_id,
      tipo_feedback: 'validacao_humana',
      decisao_humana: decisao,
      valor_original: nucleo?.conteudo_original,
      valor_corrigido: valor_corrigido || null,
      justificativa: justificativa || null
    });

    // 6. Register event
    await supabaseAdmin.from('eventos').insert({
      entidade_tipo: 'nucleo',
      entidade_id: nucleo_id,
      tipo_evento: `validacao_${decisao}`,
      resumo: `Registro marcado como "${decisao}" pelo curador.`,
      payload: { decisao, justificativa }
    });

    return NextResponse.json({ success: true, message: `Contribuição ${decisao} com sucesso.` });
  } catch (err) {
    console.error('Feedback error:', err);
    return NextResponse.json({ error: 'Erro ao registrar feedback.' }, { status: 500 });
  }
}
