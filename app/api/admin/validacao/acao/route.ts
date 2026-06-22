import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const EXPECTED_TOKENS = [
  crypto.createHash('sha256').update('nugep123-nugep-curator-salt-2026').digest('hex'),
  crypto.createHash('sha256').update('nugep 123-nugep-curator-salt-2026').digest('hex')
];

function checkAuthToken(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  return EXPECTED_TOKENS.includes(token);
}

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
    if (!checkAuthToken(req)) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, justificativa, conteudo_original, conteudo_normalizado, confianca, metadados } = body;

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Faltando ID ou Ação' }, { status: 400 });
    }

    // Ação 1: Ajustar (editar) demarcação
    if (action === 'editar') {
      const updateData: any = {
        atualizado_em: new Date().toISOString()
      };

      if (conteudo_original !== undefined) updateData.conteudo_original = conteudo_original;
      if (conteudo_normalizado !== undefined) updateData.conteudo_normalizado = conteudo_normalizado;
      if (confianca !== undefined) updateData.confianca = confianca;
      if (metadados !== undefined) updateData.metadados = metadados;

      const { error: updateError } = await supabaseAdmin
        .from('nucleos')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Event log
      try {
        await supabaseAdmin.from('eventos').insert({
          entidade_tipo: 'nucleo',
          entidade_id: id,
          tipo_evento: 'tag_editada',
          resumo: `Demarcação semântica (ID: ${id}) foi ajustada pelo curador.`
        });
      } catch { /* ignore */ }

      return NextResponse.json({ success: true, message: 'Demarcação ajustada com sucesso' });
    }

    // Ação 2: Validar ou Rejeitar demarcação
    const newStatus = action === 'validar' ? 'validado' : 'rejeitado';

    // Atualizar o status do núcleo
    const { error: updateError } = await supabaseAdmin
      .from('nucleos')
      .update({ status_validacao: newStatus, atualizado_em: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    // Registrar na tabela de validacoes (proveniencia)
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
