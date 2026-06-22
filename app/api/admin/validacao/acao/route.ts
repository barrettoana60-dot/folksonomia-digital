import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

function saveValidationLocally(data: any) {
  try {
    const dir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, 'local_validations.json');
    let list: any[] = [];
    if (fs.existsSync(filePath)) {
      list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    list.push({ ...data, timestamp: new Date().toISOString() });
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar validação local:', err);
  }
}

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
    try {
      const { error: validacaoError } = await supabaseAdmin
        .from('validacoes')
        .insert({
          nucleo_id: id,
          decisao: newStatus,
          justificativa: justificativa || '',
          status_anterior: 'em_analise',
          status_novo: newStatus,
          validado_por: null
        });

      if (validacaoError) {
        console.warn('Tabela validacoes não existe. Salvando localmente:', validacaoError.message);
        saveValidationLocally({ id, newStatus, justificativa });
      }
    } catch (e: any) {
      console.warn('Erro ao inserir validação no Supabase, usando fallback local:', e.message);
      saveValidationLocally({ id, newStatus, justificativa });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Error validating nucleo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

