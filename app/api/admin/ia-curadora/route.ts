import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent, getRecentEvents, getEventStats } from '@/lib/ml/event-bus';

export const dynamic = 'force-dynamic';

// ============================================================
// IA Curadora — Cérebro Generativo do Folksonomia Digital
// Chat inteligente com acesso a todo o banco de dados,
// barramento de eventos ML e APIs externas.
// ============================================================

async function getSystemContext() {
  // Carregar contexto real do banco
  const [
    { data: tags },
    { data: obras },
    { count: totalTags },
    { count: totalObras }
  ] = await Promise.all([
    supabaseAdmin.from('tags').select('tag_original, grupo_tematico, obra_id').order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('obras').select('titulo, artista, ano').limit(20),
    supabaseAdmin.from('tags').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('obras').select('*', { count: 'exact', head: true })
  ]);

  const eventStats = await getEventStats();
  const recentEvents = await getRecentEvents(10);

  return {
    tags: tags || [],
    obras: obras || [],
    totalTags: totalTags || 0,
    totalObras: totalObras || 0,
    eventStats,
    recentEvents
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

    // 1. Carregar contexto do banco
    const ctx = await getSystemContext();

    // 2. Registrar evento de CONSULTA no barramento
    await dispatchEvent({
      tipo: 'CONSULTA',
      origem: 'ia-curadora',
      payload: {
        query: messages[messages.length - 1]?.content || '',
        origem_consulta: 'chat_curador',
        contexto: 'ia_generativa'
      }
    });

    // 3. Construir system prompt com todo o contexto
    const systemPrompt = `Você é a IA Curadora do sistema Folksonomia Digital 2.0 — uma plataforma de gestão semântica institucional para museus brasileiros, desenvolvida pelo NUCEP.

VOCÊ TEM ACESSO AOS SEGUINTES DADOS REAIS DO SISTEMA (não invente nada que não esteja aqui):

BANCO DE DADOS:
- Total de obras catalogadas: ${ctx.totalObras}
- Total de tags criadas por visitantes: ${ctx.totalTags}
- Últimas tags: ${ctx.tags.slice(0, 15).map(t => `"${t.tag_original}" (grupo: ${t.grupo_tematico || 'não classificado'})`).join(', ')}
- Obras recentes: ${ctx.obras.slice(0, 10).map(o => `"${o.titulo}" de ${o.artista || 'autor desconhecido'} (${o.ano || '?'})`).join(', ')}

MOTORES DE ML ATIVOS:
1. ModernBERT (NER): Treinado com 180 amostras reais do vocabulário museal brasileiro. F1-Score: 0.764. Classifica tokens em: AUTORIA, TÉCNICA, DATA, GEO, MATERIAL, PROVENIÊNCIA, QUALIFICADOR.
2. RotatE (Knowledge Graph): Predição de relações no espaço complexo entre entidades do grafo.
3. GAT (Graph Attention Networks): Resolução de fronteiras fluidas e multi-membership em grupos temáticos.

BARRAMENTO DE EVENTOS:
- Total de eventos processados: ${ctx.eventStats.total}
- Eventos por tipo: ${JSON.stringify(ctx.eventStats.por_tipo)}
- Últimos eventos: ${ctx.recentEvents.slice(0, 5).map(e => `[${e.tipo}] ${e.origem} → ${e.status}`).join(' | ')}

APIS EXTERNAS CONECTADAS:
- Europeana (API v2) — funcional
- IBRAM (Tainacan, museus federais) — conectado
- BNDigital (Biblioteca Nacional) — conectado

INSTRUÇÕES:
1. Responda SEMPRE em português do Brasil.
2. Você TEM acesso real ao banco. Use os dados acima para fundamentar suas respostas.
3. Quando o curador perguntar sobre tags, obras ou conexões, analise os dados reais.
4. Mostre seu raciocínio quando fizer correlações complexas (pense em voz alta).
5. Se o curador pedir para fazer algo (ex: agrupar tags, sugerir conexões), explique passo a passo o que o sistema faria.
6. NUNCA invente dados que não existam no sistema. Se não souber, diga que não tem essa informação.
7. Você é parte do sistema — não é um assistente externo. Fale como se fosse o cérebro da plataforma.`;

    // 4. Enviar para Pollinations
    const aiResponse = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!aiResponse.ok) {
      throw new Error('Falha na comunicação com o motor de IA');
    }

    const raw = await aiResponse.text();
    let content = raw;
    
    // Parsear formato OpenAI
    try {
      const parsed = JSON.parse(raw);
      content = parsed?.choices?.[0]?.message?.content || raw;
    } catch {
      // Se não for JSON, usa texto bruto
    }

    return NextResponse.json({
      success: true,
      message: content,
      context: {
        totalTags: ctx.totalTags,
        totalObras: ctx.totalObras,
        eventosProcessados: ctx.eventStats.total
      }
    });
  } catch (error: any) {
    console.error('[IA Curadora] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: 'Erro interno no motor de IA. Tente novamente.'
    }, { status: 500 });
  }
}
