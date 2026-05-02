import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const { id, action, justificativa } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Missing ID or Action' }, { status: 400 });
    }

    const newStatus = action === 'validar' ? 'validado' : 'rejeitado';

    // 1. Atualizar o nucleo
    const { error: updateError } = await supabaseAdmin
      .from('nucleos')
      .update({ status_validacao: newStatus, atualizado_em: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    // 2. Registrar na tabela de validacoes (proveniencia)
    const { error: validacaoError } = await supabaseAdmin
      .from('validacoes')
      .insert({
        nucleo_id: id,
        decisao: newStatus,
        justificativa: justificativa || '',
        status_anterior: 'em_analise',
        status_novo: newStatus,
        validado_por: null // TODO: pegar ID do admin autenticado
      });

    if (validacaoError) throw validacaoError;

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Error validating nucleo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
