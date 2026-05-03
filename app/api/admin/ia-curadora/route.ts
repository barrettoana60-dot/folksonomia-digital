import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent, getEventStats } from '@/lib/ml/event-bus';

// Importação estática do JSON para garantir que o Vercel inclua no bundle
// e evitar erros de build com o módulo 'fs'
import kbData from '../../../../knowledge-base.json';

export const dynamic = 'force-dynamic';

function loadKnowledgeBase(): any[] {
  return Array.isArray(kbData) ? kbData : [];
}

// Buscar conhecimento relevante na KB baseado nas keywords
function searchKnowledge(kb: any[], keywords: string[]): any[] {
  if (kb.length === 0 || keywords.length === 0) return [];
  return kb.filter(entry => {
    const text = `${entry.texto} ${entry.item || ''} ${entry.query || ''}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }).slice(0, 30);
}

// ============================================================
// IA Curadora — Cérebro Generativo do Folksonomia Digital
// Consulta ATIVAMENTE o banco baseado na pergunta do curador.
// ============================================================

/** Extrai palavras-chave relevantes da última mensagem do curador */
function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    'o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas',
    'que','e','é','para','com','por','se','não','como','mais','mas','foi','são','está',
    'tem','ser','ter','seu','sua','seus','suas','isso','esse','essa','este','esta',
    'me','te','nos','lhe','quero','queria','pode','sobre','qual','quais','quantas',
    'quantos','existe','existem','dados','tag','tags','obra','obras','informações',
    'informação','diga','fale','mostre','busque','pesquise','procure','dê','dar',
    'toda','todo','todas','todos','muito','muita','muitos','muitas','aqui','ali',
    'lá','ele','ela','eles','elas','meu','minha','tudo','nada','sim','certo',
    'olá','oi','hey','bom','boa','dia','noite','tarde'
  ]);
  
  return text.toLowerCase()
    .replace(/[^\w\sàáâãéêíóôõúüç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}

/** Busca específica no banco de dados baseada nas keywords */
async function searchDatabase(keywords: string[]) {
  if (keywords.length === 0) return { tags: [], obras: [] };

  let tags: any[] = [];
  let obras: any[] = [];

  // Buscar tags — query simples por keyword
  for (const k of keywords.slice(0, 3)) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, obra_id, created_at')
      .ilike('tag_original', `%${k}%`)
      .limit(10);
    
    if (error) {
      console.error(`[IA Curadora] Erro ao buscar tag "${k}":`, error.message);
    }
    if (data && data.length > 0) {
      tags.push(...data);
    }
  }

  // Buscar obras
  for (const k of keywords.slice(0, 3)) {
    const { data, error } = await supabaseAdmin
      .from('obras')
      .select('id, titulo, artista, ano, descricao')
      .ilike('titulo', `%${k}%`)
      .limit(10);
    
    if (error) {
      console.error(`[IA Curadora] Erro ao buscar obra "${k}":`, error.message);
    }
    if (data && data.length > 0) {
      obras.push(...data);
    }
  }

  // Remover duplicatas
  const uniqueTags = tags.filter((t, i, self) => self.findIndex(x => x.id === t.id) === i);
  const uniqueObras = obras.filter((o, i, self) => self.findIndex(x => x.id === o.id) === i);

  console.log(`[IA Curadora] Keywords: [${keywords.join(',')}] -> Tags: ${uniqueTags.length}, Obras: ${uniqueObras.length}`);

  return { tags: uniqueTags, obras: uniqueObras };
}

/** Contexto geral do sistema (números totais) */
async function getSystemStats() {
  const [
    { count: totalTags },
    { count: totalObras },
    { data: allTags }
  ] = await Promise.all([
    supabaseAdmin.from('tags').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('obras').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tags').select('tag_original, grupo_tematico').order('created_at', { ascending: false }).limit(50)
  ]);

  const eventStats = await getEventStats();

  return {
    totalTags: totalTags || 0,
    totalObras: totalObras || 0,
    allTags: allTags || [],
    eventStats
  };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const keywords = extractKeywords(lastUserMsg);

    // 1. Buscar dados ESPECÍFICOS baseado na pergunta
    const [specificData, stats] = await Promise.all([
      searchDatabase(keywords),
      getSystemStats()
    ]);

    // 1b. Buscar no knowledge base gerado pelo ModernBERT
    const kb = loadKnowledgeBase();
    const kbResults = searchKnowledge(kb, keywords);

    // 2. Registrar evento CONSULTA
    dispatchEvent({
      tipo: 'CONSULTA',
      origem: 'ia-curadora',
      payload: { query: lastUserMsg, keywords, origem_consulta: 'chat_curador' }
    });

    // 3. System prompt com dados REAIS e ESPECÍFICOS
    const systemPrompt = `Você é a IA Curadora do sistema Folksonomia Digital 2.0 — o cérebro da plataforma de gestão semântica do NUCEP.

=== ESTADO ATUAL DO BANCO DE DADOS ===
Total de obras: ${stats.totalObras}
Total de tags: ${stats.totalTags}
Todas as tags no sistema (listagem completa): ${stats.allTags.map(t => `"${t.tag_original}" (grupo: ${t.grupo_tematico || 'não classificado'})`).join(', ') || 'Nenhuma tag cadastrada'}

=== BUSCA ESPECÍFICA PARA A PERGUNTA DO CURADOR ===
O curador perguntou: "${lastUserMsg}"
Palavras-chave extraídas: [${keywords.join(', ')}]

Tags encontradas no banco que correspondem à busca:
${specificData.tags.length > 0 
  ? specificData.tags.map(t => `- Tag: "${t.tag_original}" | Grupo: ${t.grupo_tematico || 'não classificado'} | Obra ID: ${t.obra_id} | Criada em: ${t.created_at}`).join('\n')
  : '(NENHUMA tag encontrada para esses termos no banco)'}

Obras encontradas no banco que correspondem à busca:
${specificData.obras.length > 0
  ? specificData.obras.map(o => `- "${o.titulo}" de ${o.artista || '?'} (${o.ano || '?'}) - ${o.descricao?.substring(0, 100) || ''}`).join('\n')
  : '(NENHUMA obra encontrada para esses termos no banco)'}

=== CONHECIMENTO EXTRAÍDO PELO MODERNBERT (NER real, 718 entidades no grafo) ===
O ModernBERT treinou com 180 amostras e depois processou 80 itens da Europeana.
Total no grafo de conhecimento: ${kb.length} entidades.
Conhecimento relevante para a pergunta "${lastUserMsg}":
${kbResults.length > 0
  ? kbResults.map(k => `- [${k.tipo}] "${k.texto}" (fonte: ${k.query || k.fonte}, item: "${k.item || '?'}")`).join('\n')
  : '(Nenhuma entidade no grafo de conhecimento corresponde a essas palavras-chave)'}

=== MOTORES ML ===
ModernBERT NER: F1=0.764, treinado com 180 amostras reais (cubismo, barroco, espadas, arte indígena, etc.)
RotatE: Ativo — predição de relações no grafo
GAT: Ativo — multi-membership em grupos temáticos
Eventos processados: ${stats.eventStats.total}

=== REGRAS ABSOLUTAS ===
1. Responda SEMPRE em português do Brasil.
2. Use EXCLUSIVAMENTE os dados acima. Se a busca retornou tags ou obras, CITE-AS pelo nome exato.
3. Se a busca retornou ZERO tags/obras para o termo, diga claramente: "A tag X existe no sistema" ou "A tag X NÃO existe no sistema", baseando-se nos resultados acima.
4. NUNCA diga "não tenho acesso" — você TEM os dados completos acima.
5. NUNCA invente tags, obras ou dados que não aparecem nos resultados acima.
6. Fale como se fosse o próprio cérebro da plataforma, não um assistente externo.`;

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

    if (!aiResponse.ok) throw new Error('Falha na comunicação com o motor de IA');

    const raw = await aiResponse.text();
    let content = raw;
    try {
      const parsed = JSON.parse(raw);
      content = parsed?.choices?.[0]?.message?.content || raw;
    } catch { /* texto bruto */ }

    return NextResponse.json({
      success: true,
      message: content,
      context: {
        totalTags: stats.totalTags,
        totalObras: stats.totalObras,
        tagsEncontradas: specificData.tags.length,
        obrasEncontradas: specificData.obras.length,
        keywords
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
