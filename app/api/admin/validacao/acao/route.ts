import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { encryptPayloadAlpha, encryptPayloadDelta, generateSignature } from '@/lib/core/crypto';

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
    list.push({ ...data, persisted_at: new Date().toISOString() });
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar validação local:', err);
  }
}

function buildInteroperabilityDnaPayload(nucleo: any, body: any, newStatus: string, previousHash: string | null) {
  const now = new Date().toISOString();
  const relatedTags = nucleo.tags || [];
  const externalSources = nucleo.externalResults || [];

  return {
    version: '1.0',
    tipo: 'interoperability_dna',
    nucleo_id: nucleo.id,
    original: body.conteudo_original ?? nucleo.conteudo_original,
    normalizado: body.conteudo_normalizado ?? nucleo.conteudo_normalizado,
    status_anterior: nucleo.status_validacao,
    status_novo: newStatus,
    interoperability_action: body.action,
    justificativa: body.justificativa || '',
    confianca: body.confianca ?? nucleo.confianca,
    metadados: body.metadados ?? nucleo.metadados,
    contexto: nucleo.contexto || {},
    related_tags: relatedTags,
    external_sources: externalSources,
    ledger_sequence: (currentLedgerLength(nucleo) + 1),
    previous_hash: previousHash,
    cultural_locale: nucleo.origem || 'global',
    timestamp: now,
    ledger_checksum: generateSignature({ id: nucleo.id, newStatus, timestamp: now, previousHash })
  };
}

function currentLedgerLength(nucleo: any): number {
  return Array.isArray(nucleo.metadados?.validation_chain) ? nucleo.metadados.validation_chain.length : 0;
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

    const { data: currentNucleo, error: fetchError } = await supabaseAdmin
      .from('nucleos')
      .select('*, metadados, contexto')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }
    if (!currentNucleo) {
      return NextResponse.json({ success: false, error: 'Núcleo não encontrado' }, { status: 404 });
    }

    // Ação 1: Ajustar (editar) demarcação
    if (action === 'editar') {
      const updatedMetadados = {
        ...(currentNucleo.metadados || {}),
        validation_chain: [
          ...((currentNucleo.metadados?.validation_chain as any[]) || []),
          {
            type: 'edit',
            original: conteudo_original ?? currentNucleo.conteudo_original,
            normalized: conteudo_normalizado ?? currentNucleo.conteudo_normalizado,
            confianca: confianca ?? currentNucleo.confianca,
            updated_at: new Date().toISOString()
          }
        ]
      };

      const signature = generateSignature({
        id,
        conteudo_original: conteudo_original ?? currentNucleo.conteudo_original,
        conteudo_normalizado: conteudo_normalizado ?? currentNucleo.conteudo_normalizado,
        confianca: confianca ?? currentNucleo.confianca,
        timestamp: new Date().toISOString(),
        mode: 'edit'
      });

      const updateData: any = {
        atualizado_em: new Date().toISOString(),
        assinatura_hash: signature,
        metadados: updatedMetadados
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

      try {
        await supabaseAdmin.from('eventos').insert({
          entidade_tipo: 'nucleo',
          entidade_id: id,
          tipo_evento: 'tag_editada',
          resumo: `Demarcação semântica (ID: ${id}) foi ajustada pelo curador.`,
          payload: {
            action: 'editar',
            signature,
            encrypted_delta: encryptPayloadDelta({ id, action: 'editar', conteudo_original, conteudo_normalizado, confianca, metadados }),
            encrypted_alfa: encryptPayloadAlpha({ id, action: 'editar', conteudo_original, conteudo_normalizado, confianca, metadados })
          },
          hash_evento: signature,
          hash_anterior: currentNucleo.assinatura_hash || null
        });
      } catch { /* ignore */ }

      return NextResponse.json({ success: true, message: 'Demarcação ajustada com sucesso', signature });
    }

    // Ação 2: Validar ou Rejeitar demarcação
    const newStatus = action === 'validar' ? 'validado' : 'rejeitado';
    const previousHash = currentNucleo.assinatura_hash || null;

    const { data: relatedTags = [] } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, grupo_tematico')
      .eq('nucleo_id', id)
      .limit(8);

    const { data: externalResults = [] } = await supabaseAdmin
      .from('resultados_externos')
      .select('fonte, titulo, url, provider, match_score')
      .eq('nucleo_id', id)
      .limit(8);

    const dnaPayload = buildInteroperabilityDnaPayload(
      {
        ...currentNucleo,
        tags: relatedTags,
        externalResults
      },
      body,
      newStatus,
      previousHash
    );

    const validationHash = generateSignature(dnaPayload);

    const updatedMetadados = {
      ...(currentNucleo.metadados || {}),
      validation_chain: [
        ...((currentNucleo.metadados?.validation_chain as any[]) || []),
        {
          hash: validationHash,
          status_anterior: currentNucleo.status_validacao,
          status_novo: newStatus,
          timestamp: dnaPayload.timestamp,
          source: 'validacao_dna'
        }
      ]
    };

    const { error: updateError } = await supabaseAdmin
      .from('nucleos')
      .update({
        status_validacao: newStatus,
        atualizado_em: new Date().toISOString(),
        assinatura_hash: validationHash,
        metadados: updatedMetadados
      })
      .eq('id', id);

    if (updateError) throw updateError;

    try {
      const { error: validacaoError } = await supabaseAdmin
        .from('validacoes')
        .insert({
          nucleo_id: id,
          decisao: newStatus,
          justificativa: justificativa || '',
          status_anterior: currentNucleo.status_validacao,
          status_novo: newStatus,
          validado_por: null
        });

      if (validacaoError) {
        console.warn('Tabela validacoes não existe. Salvando localmente:', validacaoError.message);
        saveValidationLocally({ id, newStatus, justificativa, validationHash, dnaPayload });
      }
    } catch (e: any) {
      console.warn('Erro ao inserir validação no Supabase, usando fallback local:', e.message);
      saveValidationLocally({ id, newStatus, justificativa, validationHash, dnaPayload });
    }

    try {
      await supabaseAdmin.from('eventos').insert({
        entidade_tipo: 'nucleo',
        entidade_id: id,
        tipo_evento: `interoperability_${newStatus}`,
        resumo: `Núcleo ${id} foi ${newStatus} no registro de intercâmbio cultural.`,
        payload: {
          interoperabilityPayload: dnaPayload,
          encrypted_delta: encryptPayloadDelta(dnaPayload),
          encrypted_alfa: encryptPayloadAlpha(dnaPayload),
          audit: {
            related_tags: relatedTags,
            external_sources: externalSources,
            cultural_locale: dnaPayload.cultural_locale,
            ledger_sequence: dnaPayload.ledger_sequence
          }
        },
        hash_evento: validationHash,
        hash_anterior: previousHash
      });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, status: newStatus, validationHash });
  } catch (error: any) {
    console.error('Error validating nucleo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
