import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      familiaridade = '',
      documentacao = '',
      entendimento = '',
      faixa_etaria = '',
      visitante_hash: clientHash,
    } = body;

    // Gerar ou validar hash único e persistente do visitante
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ua = req.headers.get('user-agent') || '';
    
    // Hash determinístico se cliente não enviar um
    const vHash = (clientHash && typeof clientHash === 'string' && clientHash.length >= 6)
      ? clientHash.trim()
      : crypto.createHash('sha256').update(`${ip}:${ua}:${Date.now()}`).digest('hex').slice(0, 16);

    const pseudonimo = `Visitante_${vHash.slice(0, 6)}`;

    // 1. Registrar ou atualizar visitante na tabela visitantes
    let visitanteId: string | null = null;
    let visitanteFallback = false;
    try {
      const { data: existing } = await supabaseAdmin
        .from('visitantes')
        .select('id, nome_publico, pseudonimo')
        .eq('visitante_hash', vHash)
        .maybeSingle();

      if (existing) {
        visitanteId = existing.id;
      } else {
        const { data: novoVisitante, error: vErr } = await supabaseAdmin
          .from('visitantes')
          .insert({
            visitante_hash: vHash,
            nome_publico: null,
            pseudonimo,
            criado_em: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (vErr) {
          console.warn('[Questionario] Erro ao inserir visitante:', vErr.message);
          const tableMissing = vErr.code === 'PGRST205' || /visitantes|schema cache|relation .* does not exist/i.test(vErr.message);
          if (tableMissing) {
            visitanteFallback = true;
          }
        } else if (novoVisitante) {
          visitanteId = novoVisitante.id;
        }
      }
    } catch (vCatch) {
      console.warn('[Questionario] Falha ao operar tabela visitantes:', vCatch);
      const message = vCatch instanceof Error ? vCatch.message : 'Falha ao salvar visitante';
      if (/visitantes|schema cache|relation .* does not exist/i.test(message)) {
        visitanteFallback = true;
      }
    }

    // 2. Registrar respostas na tabela questionarios
    let questionarioFallback = false;
    try {
      const { error: qErr } = await supabaseAdmin
        .from('questionarios')
        .insert({
          visitante_id: visitanteId,
          faixa_etaria: faixa_etaria || null,
          familiaridade_arte: familiaridade || null,
          vinculo_museu: documentacao || null,
          respostas: {
            familiaridade,
            documentacao,
            entendimento,
            ip_origem: ip !== 'unknown' ? ip.slice(0, 7) + '...' : 'anon',
            submetido_em: new Date().toISOString(),
          },
          criado_em: new Date().toISOString(),
        });

      if (qErr) {
        console.warn('[Questionario] Erro ao inserir questionario:', qErr.message);
        const tableMissing = qErr.code === 'PGRST205' || /questionarios|schema cache|relation .* does not exist/i.test(qErr.message);
        if (tableMissing) {
          questionarioFallback = true;
        }
      }
    } catch (qCatch) {
      console.warn('[Questionario] Falha ao operar tabela questionarios:', qCatch);
      const message = qCatch instanceof Error ? qCatch.message : 'Falha ao salvar questionário';
      if (/questionarios|schema cache|relation .* does not exist/i.test(message)) {
        questionarioFallback = true;
      }
    }

    // Gerar UUID determinístico a partir do vHash para a coluna entidade_id (UUID) da tabela eventos
    const vHashHex = crypto.createHash('sha256').update(vHash).digest('hex');
    const visitorUuid = `${vHashHex.slice(0, 8)}-${vHashHex.slice(8, 12)}-4${vHashHex.slice(13, 16)}-a${vHashHex.slice(17, 20)}-${vHashHex.slice(20, 32)}`;
    const finalVisitanteId = visitanteId || visitorUuid;

    // 3. Registrar evento de proveniência garantindo contagem institucional.
    // Também funciona como fallback persistente enquanto a migration de questionarios
    // ainda não foi aplicada no projeto Supabase de produção.
    const eventPayload = {
        entidade_tipo: 'visitante',
        entidade_id: finalVisitanteId,
        tipo_evento: 'questionario_completado',
        resumo: `Questionário de primeiro acesso respondido por ${pseudonimo} (${vHash}) - Familiaridade: ${familiaridade || 'Registrado'}`,
        payload: {
          visitante_hash: vHash,
          visitante_id: visitanteId,
          familiaridade,
          documentacao,
          entendimento,
          submetido_em: new Date().toISOString(),
          armazenamento: questionarioFallback || visitanteFallback ? 'eventos_fallback' : 'questionarios',
        },
        hash_evento: crypto.createHash('sha256').update(`${vHash}:${Date.now()}`).digest('hex'),
        criado_em: new Date().toISOString(),
      };

    try {
      let { error: evtErr } = await supabaseAdmin.from('eventos').insert(eventPayload);
      if (evtErr) {
        console.warn('[Questionario] Tentativa completa falhou:', evtErr.message);
        const { payload: _payload, ...legacyEventPayload } = eventPayload;
        const retry = await supabaseAdmin.from('eventos').insert(legacyEventPayload);
        evtErr = retry.error;
      }
      if (evtErr) {
        console.error('[Questionario] Falha definitiva ao registrar resposta:', evtErr.message);
        return NextResponse.json(
          { success: false, error: `Não foi possível registrar sua resposta: ${evtErr.message}` },
          { status: 503 },
        );
      }
    } catch (eCatch) {
      console.error('[Questionario] Falha ao registrar evento:', eCatch);
      return NextResponse.json(
        { success: false, error: 'Não foi possível registrar sua resposta no banco de dados.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      visitante_hash: vHash,
      visitante_id: finalVisitanteId,
      pseudonimo,
    });
  } catch (err: any) {
    console.error('[Questionario API] Erro ao registrar respostas:', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro ao processar questionário.' }, { status: 500 });
  }
}
