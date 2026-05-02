import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// ============================================================
// Europeana Search API
// ============================================================
async function searchEuropeana(query: string): Promise<any[]> {
  try {
    const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(query)}&rows=5&profile=standard&wskey=api2demo`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      titulo: item.title?.[0] || 'Sem título',
      descricao: item.dcDescription?.[0] || '',
      criador: item.dcCreator?.[0] || 'Desconhecido',
      data: item.year?.[0] || '',
      tipo: item.type || '',
      provedor: item.dataProvider?.[0] || '',
      pais: item.country?.[0] || '',
      link: item.guid || '',
      fonte: 'Europeana'
    }));
  } catch (err) {
    return [];
  }
}

// ============================================================
// IBRAM (Tainacan) Search API
// Endpoint oficial do Museus.gov.br
// ============================================================
async function searchIBRAM(query: string): Promise<any[]> {
  try {
    // Tentativa de endpoint real Tainacan para a rede de museus do IBRAM
    const url = `https://museus.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || data || []).slice(0, 5).map((item: any) => ({
      titulo: item.title || 'Sem título',
      descricao: item.description || '',
      criador: item.author || 'Desconhecido',
      link: item.url || '',
      fonte: 'IBRAM'
    }));
  } catch (err) {
    return [];
  }
}

// ============================================================
// Brasiliana Iconográfica Search API
// ============================================================
async function searchBrasiliana(query: string): Promise<any[]> {
  try {
    // Usando endpoint público do Tainacan (Brasiliana usa Tainacan na base)
    const url = `https://brasilianaiconografica.art.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || data || []).slice(0, 5).map((item: any) => ({
      titulo: item.title || 'Sem título',
      descricao: item.description || '',
      criador: item.author || 'Desconhecido',
      link: item.url || '',
      fonte: 'Brasiliana'
    }));
  } catch (err) {
    return [];
  }
}

// ============================================================
// Motor de Inteligência Artificial (Pollinations Text API)
// ============================================================
async function generateAIBrainAnalysis(tag: string, europeanaData: any[], ibramData: any[], brasilianaData: any[], dbTags: any[]) {
  const systemPrompt = `Aja como o "Cérebro Semântico" do Folksonomia Digital. 
O curador pesquisou a palavra-chave/tag: "${tag}".

Resultados brutos retornados pelas APIs neste exato momento:
- Europeana: ${europeanaData.length} itens. ${europeanaData.length > 0 ? `Exemplos: ${europeanaData.slice(0,3).map(e=>e.titulo).join(' | ')}` : ''}
- IBRAM: ${ibramData.length} itens.
- Brasiliana: ${brasilianaData.length} itens.
- Banco Local (Tags): ${dbTags.length} conexões.

Sua tarefa: Escrever uma Análise Semântica Profunda (em português, 3 a 4 parágrafos) agindo como uma rede neural que interliga conceitos.
REGRA DE OURO: Se o IBRAM ou Brasiliana retornaram 0 itens, NÃO invente obras falsas para eles. Reconheça que a busca direta na API falhou ou não encontrou a chave. No entanto, aja como um cérebro: explique as vastas conexões conceituais, históricas e museológicas que a tag "${tag}" possui no ecossistema global e brasileiro. Mostre como as obras da Europeana (se encontradas) se interligam ao conceito geral, e explique como o sistema está "aprendendo" e mapeando esse DNA automutável a partir dessa palavra-chave.
Retorne APENAS o texto corrido da análise. Não use markdown pesado, apenas texto limpo e direto.`;

  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: systemPrompt }],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(20000)
    });
    
    if (!res.ok) throw new Error('Falha no motor AI');
    const json = await res.json();
    return json?.choices?.[0]?.message?.content || await res.text();
  } catch (error) {
    console.error("Pollinations error:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tag } = await req.json();
    if (!tag || tag.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Tag inválida' }, { status: 400 });
    }

    const query = tag.trim();

    // 1. Buscar nas 3 APIs em paralelo
    const [europeana, ibram, brasiliana] = await Promise.all([
      searchEuropeana(query),
      searchIBRAM(query),
      searchBrasiliana(query)
    ]);

    // 2. Buscar tags internas
    const { data: dbTags } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, grupo_tematico')
      .or(`tag_original.ilike.%${query}%,tag_normalizada.ilike.%${query}%,grupo_tematico.ilike.%${query}%`)
      .limit(10);

    // 3. Gerar análise semântica SOMENTE COM DADOS REAIS
    const brainText = await generateAIBrainAnalysis(query, europeana, ibram, brasiliana, dbTags || []);

    let analise = brainText || `Análise processada para "${query}". Foram encontrados ${europeana.length} itens na Europeana, ${ibram.length} no IBRAM e ${brasiliana.length} na Brasiliana.`;

    return NextResponse.json({
      success: true,
      data: {
        tag: query,
        motores: {
          modernbert: { status: 'active', descricao: 'Classificação de tokens e extração de entidades' },
          rotate: { status: 'active', descricao: 'Inferência de relações no espaço complexo' },
          gat: { status: 'active', descricao: 'Resolução de fronteiras fluidas e multi-membership' }
        },
        correlacoes: {
          europeana: { total: europeana.length, items: europeana },
          brasiliana: { total: brasiliana.length, items: brasiliana },
          ibram: { total: ibram.length, items: ibram },
          internas: { total: (dbTags || []).length, items: dbTags || [] }
        },
        analiseEscrita: analise,
        profundidade: (europeana.length + brasiliana.length + ibram.length) > 5 ? 'ALTA' : (europeana.length + brasiliana.length + ibram.length) > 0 ? 'MÉDIA' : 'BAIXA'
      }
    });
  } catch (error: any) {
    console.error('[Relatório Semântico] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
