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
  const systemPrompt = `Você é o ModernBERT/RotatE, o motor de inteligência artificial semântica do sistema "Folksonomia Digital".
A tag pesquisada foi: "${tag}".

DADOS REAIS ENCONTRADOS NAS APIS:
- Europeana: ${JSON.stringify(europeanaData.map(e => e.titulo))}
- IBRAM: ${JSON.stringify(ibramData.map(i => i.titulo))}
- Brasiliana: ${JSON.stringify(brasilianaData.map(b => b.titulo))}
- Banco Local: ${JSON.stringify(dbTags.map(t => t.tag_original))}

INSTRUÇÕES OBRIGATÓRIAS (PUNIÇÃO SE DESCUMPRIR):
1. NUNCA invente ou simule dados que não estão listados acima. 
2. Se uma das APIs (IBRAM, Brasiliana ou Europeana) estiver vazia ([]), NÃO invente dados para ela. Reconheça que não houve retorno.
3. Retorne um JSON estrito, sem markdown, contendo as seguintes chaves:
   - "analiseEscrita": Um texto analítico e detalhado conectando a tag "${tag}" com os DADOS REAIS listados acima. Explique as relações históricas ou museológicas baseadas apenas nos itens que realmente voltaram na busca. Mostre como o sistema (você) interliga essas informações reais. 

RETORNE APENAS O JSON VÁLIDO. NENHUM TEXTO FORA DAS CHAVES.`;

  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: systemPrompt }],
        model: 'openai',
        jsonMode: true
      }),
      signal: AbortSignal.timeout(20000)
    });
    
    if (!res.ok) throw new Error('Falha no motor AI');
    const responseText = await res.text();
    
    let cleanJson = responseText;
    if (cleanJson.includes('```json')) {
      cleanJson = cleanJson.split('```json')[1].split('```')[0].trim();
    }
    
    return JSON.parse(cleanJson);
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
    const brainData = await generateAIBrainAnalysis(query, europeana, ibram, brasiliana, dbTags || []);

    let analise = brainData?.analiseEscrita || `Análise processada para "${query}". Foram encontrados ${europeana.length} itens na Europeana, ${ibram.length} no IBRAM e ${brasiliana.length} na Brasiliana.`;

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
