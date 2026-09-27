import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tag-visual
 *
 * Analisa visualmente uma obra via Gemini 1.5 Flash (fetch direto, sem SDK).
 * Recebe: { obra_id: string }
 * Retorna: descrição visual da imagem, coesão de cada tag com a imagem,
 *          tags sugeridas pelo modelo que ainda não foram aplicadas.
 */
export async function POST(req: NextRequest) {
  try {
    const { obra_id } = await req.json();
    if (!obra_id) {
      return NextResponse.json({ success: false, error: 'obra_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar dados da obra
    const { data: obra, error: obraErr } = await supabaseAdmin
      .from('obras')
      .select('id, titulo, artista, imagem_url, descricao')
      .eq('id', obra_id)
      .single();

    if (obraErr || !obra) {
      return NextResponse.json({ success: false, error: 'Obra não encontrada' }, { status: 404 });
    }

    if (!obra.imagem_url) {
      return NextResponse.json({ success: false, error: 'Esta obra não possui imagem cadastrada' }, { status: 422 });
    }

    // 2. Buscar tags aplicadas nesta obra
    const { data: tagsData } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, visitante_hash, grupo_tematico')
      .eq('obra_id', obra_id)
      .limit(200);

    const tagsAplicadas = [...new Set((tagsData || []).map(t => (t.tag_normalizada || t.tag_original || '').toLowerCase().trim()).filter(Boolean))];

    // 3. Buscar histórico de feedback de treinamento (calibração contínua)
    const { data: feedbackData } = await supabaseAdmin
      .from('eventos')
      .select('resumo')
      .eq('tipo_evento', 'treinamento_visual')
      .eq('entidade_id', obra_id)
      .limit(20);

    const feedbackHistorico = (feedbackData || []).map(e => e.resumo).filter(Boolean);

    // 4. Baixar a imagem como base64 para enviar ao Gemini
    let imageBase64 = '';
    let imageMimeType = 'image/jpeg';
    try {
      const imgRes = await fetch(obra.imagem_url, { signal: AbortSignal.timeout(10000) });
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      imageMimeType = contentType.split(';')[0].trim();
      const buffer = await imgRes.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    } catch (imgErr: any) {
      return NextResponse.json({ success: false, error: `Falha ao baixar imagem da obra: ${imgErr.message}` }, { status: 502 });
    }

    // 5. Montar prompt com contexto e feedback histórico
    const tagsListText = tagsAplicadas.length > 0
      ? tagsAplicadas.map(t => `"${t}"`).join(', ')
      : '(nenhuma tag aplicada ainda)';

    const feedbackText = feedbackHistorico.length > 0
      ? `\n\nHistórico de ajustes anteriores (use para calibrar):\n${feedbackHistorico.slice(0, 5).join('\n')}`
      : '';

    const prompt = `Você é um curador especializado em arte popular e cultura brasileira.

Analise esta imagem de obra cultural e responda em português brasileiro, de forma direta e objetiva.

Tags aplicadas pelos visitantes: ${tagsListText}${feedbackText}

Responda EXATAMENTE neste formato (mantenha os rótulos exatos):

CONTEXTO VISUAL:
[2 a 3 frases descrevendo o que a imagem mostra — elementos visuais, materiais, composição, contexto cultural]

COESÃO DAS TAGS:
[Para cada tag aplicada, uma linha no formato: "nome_da_tag" — [COERENTE/PARCIAL/SEM_RESPALDO] — [motivo em até 10 palavras]]

TAGS NÃO APLICADAS SUGERIDAS:
[3 a 5 tags relevantes que os visitantes não aplicaram, separadas por vírgula]

CONTEXTO CULTURAL:
[1 frase sobre o contexto histórico ou cultural da obra]`;

    // 6. Chamar Gemini 1.5 Flash via fetch (sem SDK)
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    if (!GEMINI_KEY) {
      // Sem chave — retorna análise heurística baseada nos dados disponíveis
      return NextResponse.json({
        success: true,
        data: {
          obra_id,
          titulo: obra.titulo,
          artista: obra.artista,
          imagem_url: obra.imagem_url,
          tags_aplicadas: tagsAplicadas,
          descricao_visual: `Obra com ${tagsAplicadas.length} tag(s) aplicadas por visitantes. Análise visual completa requer configuração da chave GEMINI_API_KEY no ambiente.`,
          coesao_tags: tagsAplicadas.map(t => ({ tag: t, status: 'PENDENTE', motivo: 'Chave Gemini não configurada' })),
          tags_sugeridas: [],
          contexto_cultural: obra.descricao || '',
          fonte: 'heuristica',
          feedback_historico: feedbackHistorico.length,
        },
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const geminiBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: imageMimeType,
              data: imageBase64,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
      signal: AbortSignal.timeout(25000),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ success: false, error: `Gemini API: ${geminiRes.status} — ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const geminiJson = await geminiRes.json();
    const rawText: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 7. Parsear resposta estruturada do Gemini
    const parse = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, 'i');
      const match = rawText.match(regex);
      return match ? match[1].trim() : '';
    };

    const contextoVisual = parse('CONTEXTO VISUAL');
    const coesaoRaw = parse('COESÃO DAS TAGS');
    const tagsNaoAplicadasRaw = parse('TAGS NÃO APLICADAS SUGERIDAS');
    const contextoCultural = parse('CONTEXTO CULTURAL');

    // Parsear linhas de coesão
    const coesaoTags = coesaoRaw
      .split('\n')
      .filter(l => l.trim())
      .map(l => {
        const match = l.match(/"?([^"—]+)"?\s*—\s*(COERENTE|PARCIAL|SEM_RESPALDO)\s*—?\s*(.*)/i);
        if (match) {
          return { tag: match[1].trim().toLowerCase(), status: match[2].toUpperCase(), motivo: match[3].trim() };
        }
        return null;
      })
      .filter(Boolean);

    const tagsSugeridas = tagsNaoAplicadasRaw
      .split(',')
      .map(t => t.replace(/["""]/g, '').trim().toLowerCase())
      .filter(t => t.length > 1 && !tagsAplicadas.includes(t))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        obra_id,
        titulo: obra.titulo,
        artista: obra.artista,
        imagem_url: obra.imagem_url,
        tags_aplicadas: tagsAplicadas,
        descricao_visual: contextoVisual,
        coesao_tags: coesaoTags,
        tags_sugeridas: tagsSugeridas,
        contexto_cultural: contextoCultural,
        fonte: 'gemini-1.5-flash',
        feedback_historico: feedbackHistorico.length,
        total_visitantes: new Set((tagsData || []).map(t => t.visitante_hash).filter(Boolean)).size,
      },
    });

  } catch (err: any) {
    console.error('Erro em tag-visual:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/tag-visual/feedback
 * Registra validação/rejeição de coesão de tag em eventos para treinamento contínuo
 */
export async function PUT(req: NextRequest) {
  try {
    const { obra_id, tag, status, usuario } = await req.json();
    if (!obra_id || !tag || !status) {
      return NextResponse.json({ success: false, error: 'obra_id, tag e status obrigatórios' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('eventos')
      .insert({
        tipo_evento: 'treinamento_visual',
        entidade_tipo: 'obra',
        entidade_id: obra_id,
        resumo: `tag "${tag}" ${status === 'validado' ? 'validada' : 'rejeitada'} para obra ${obra_id.slice(0, 8)} por ${usuario || 'admin'}`,
        origem: 'admin:tag-visual',
        criado_em: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
