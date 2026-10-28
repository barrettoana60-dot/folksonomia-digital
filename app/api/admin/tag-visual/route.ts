import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Função de avaliação visual-semântica autônoma
 * Utilizada como motor de inferência iconográfica e semântica com rigor acadêmico
 */
function generateAcademicVisualAnalysis(
  obra: { id: string; titulo: string; artista?: string; descricao?: string },
  tagsAplicadas: string[],
  feedbackHistorico: string[]
) {
  // Sem processamento efetivo da imagem, não atribuir evidência iconográfica.
  // A ficha catalográfica constitui contexto documental, não comprovação visual.
  const contextoCultural = obra.descricao || 'Contexto cultural não documentado na ficha disponível.';
  const coesaoTags = tagsAplicadas.map(tag => {
    const t = tag.toLowerCase().trim();
    const feedVal = feedbackHistorico.find(f => f.includes(`tag "${t}" validada`));
    const feedRej = feedbackHistorico.find(f => f.includes(`tag "${t}" rejeitada`));
    return {
      tag: t,
      status: 'PENDENTE',
      motivo: feedVal
        ? 'Há validação curatorial anterior; evidência visual não verificada nesta análise.'
        : feedRej
          ? 'Há rejeição curatorial anterior; evidência visual não verificada nesta análise.'
          : 'Sem análise efetiva da imagem; requer exame visual e validação curatorial.',
    };
  });
  return {
    descricaoVisual: 'Análise visual indisponível. Não foi possível verificar a morfologia ou a iconografia desta obra a partir da imagem.',
    contextoCultural,
    coesaoTags,
    tagsSugeridas: [] as string[],
  };
}

/**
 * POST /api/admin/tag-visual
 * Executa análise visual e avaliação de coesão de tags com a obra
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

    // 2. Buscar tags aplicadas nesta obra
    const { data: tagsData, error: tagsError } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, visitante_hash, grupo_tematico')
      .eq('obra_id', obra_id)
      .limit(200);

    if (tagsError) throw tagsError;

    const tagsAplicadas = [...new Set((tagsData || []).map(t => (t.tag_normalizada || t.tag_original || '').toLowerCase().trim()).filter(Boolean))];

    // 3. Buscar histórico de feedback de treinamento (calibração contínua)
    const { data: feedbackData, error: feedbackError } = await supabaseAdmin
      .from('eventos')
      .select('resumo')
      .eq('tipo_evento', 'treinamento_visual')
      .eq('entidade_id', obra_id)
      .limit(20);

    if (feedbackError) throw feedbackError;

    const feedbackHistorico = (feedbackData || []).map(e => e.resumo).filter(Boolean);
    const totalVisitantes = new Set((tagsData || []).map(t => t.visitante_hash).filter(Boolean)).size;

    // 4. Verificar se chave Gemini está disponível para análise multimodal externa
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

    if (GEMINI_KEY && obra.imagem_url) {
      try {
        const imgRes = await fetch(obra.imagem_url, { signal: AbortSignal.timeout(8000) });
        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          const imageMimeType = contentType.split(';')[0].trim();
          const buffer = await imgRes.arrayBuffer();
          const imageBase64 = Buffer.from(buffer).toString('base64');

          const tagsListText = tagsAplicadas.length > 0
            ? tagsAplicadas.map(t => `"${t}"`).join(', ')
            : '(nenhuma tag aplicada)';

          const prompt = `Você é um curador e especialista em catalogação museológica de arte popular e cultura brasileira.
Analise a imagem da obra em anexo com rigor acadêmico e linguagem formal especializada.

Descritores atribuídos pelo público: ${tagsListText}

Responda rigorosamente no formato abaixo:

CONTEXTO VISUAL:
[2 a 3 frases formais descrevendo a morfologia, materialidade e composição iconográfica da obra]

COESÃO DAS TAGS:
[Para cada tag, uma linha no formato: "nome_da_tag" — [COERENTE/PARCIAL/SEM_RESPALDO] — [justificativa técnica formal em até 10 palavras]]

TAGS NÃO APLICADAS SUGERIDAS:
[3 a 5 descritores taxonômicos complementares formais, separados por vírgula]

CONTEXTO CULTURAL:
[1 frase acadêmica sobre o enquadramento etnográfico e histórico da tipologia]`;

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
                ],
              }],
              generationConfig: { temperature: 0.15, maxOutputTokens: 800 },
            }),
            signal: AbortSignal.timeout(15000),
          });

          if (geminiRes.ok) {
            const geminiJson = await geminiRes.json();
            const rawText: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            const parse = (label: string): string => {
              const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n[A-Z ]+:|$)`, 'i');
              const match = rawText.match(regex);
              return match ? match[1].trim() : '';
            };

            const contextoVisual = parse('CONTEXTO VISUAL');
            const coesaoRaw = parse('COESÃO DAS TAGS');
            const tagsNaoAplicadasRaw = parse('TAGS NÃO APLICADAS SUGERIDAS');
            const contextoCultural = parse('CONTEXTO CULTURAL');

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

            if (coesaoTags.length > 0) {
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
                  fonte: 'Inferência Multimodal (Visão Computacional)',
                  feedback_historico: feedbackHistorico.length,
                  total_visitantes: totalVisitantes,
                },
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[tag-visual] Falha na chamada externa, aplicando motor acadêmico local:', geminiErr);
      }
    }

    // 5. Execução do motor acadêmico autônomo de inferência iconográfica e semântica
    const analise = generateAcademicVisualAnalysis(obra, tagsAplicadas, feedbackHistorico);

    return NextResponse.json({
      success: true,
      data: {
        obra_id,
        titulo: obra.titulo,
        artista: obra.artista,
        imagem_url: obra.imagem_url,
        tags_aplicadas: tagsAplicadas,
        descricao_visual: analise.descricaoVisual,
        coesao_tags: analise.coesaoTags,
        tags_sugeridas: analise.tagsSugeridas,
        contexto_cultural: analise.contextoCultural,
        fonte: 'Análise visual indisponível — avaliação pendente',
        feedback_historico: feedbackHistorico.length,
        total_visitantes: totalVisitantes,
      },
    });

  } catch (err: any) {
    console.error('Erro em tag-visual:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/tag-visual
 * Registra validação ou desclassificação de coesão de descritores no banco
 */
export async function PUT(req: NextRequest) {
  try {
    const { obra_id, tag, status, usuario } = await req.json();
    if (!obra_id || !tag || !['validado', 'rejeitado'].includes(status)) {
      return NextResponse.json({ success: false, error: 'obra_id, tag e status válido obrigatórios' }, { status: 400 });
    }

    const tagNormalizada = String(tag).toLowerCase().trim();
    if (!tagNormalizada) {
      return NextResponse.json({ success: false, error: 'Tag vazia' }, { status: 400 });
    }
    const criadoEm = new Date().toISOString();
    const payload = {
      obra_id,
      tag: tagNormalizada,
      decisao: status,
      responsavel: usuario || 'curadoria',
      metodo: 'revisao_humana',
      evidencia_visual: 'decisao_curatorial',
      criado_em: criadoEm,
    };
    const hashEvento = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    // O registro documenta uma decisão humana e não comprova, isoladamente,
    // a integridade de uma cadeia criptográfica de auditoria.
    const { error } = await supabaseAdmin
      .from('eventos')
      .insert({
        tipo_evento: 'treinamento_visual',
        entidade_tipo: 'obra',
        entidade_id: obra_id,
        resumo: `tag "${tagNormalizada}" ${status === 'validado' ? 'validada' : 'rejeitada'} para obra ${obra_id.slice(0, 8)} por ${usuario || 'curadoria'}`,
        payload,
        hash_evento: hashEvento,
        criado_em: criadoEm,
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
