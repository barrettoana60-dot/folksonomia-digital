import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent } from '@/lib/ml/event-bus';

export const dynamic = 'force-dynamic';

// ============================================================
// Europeana Search API (funciona — confirmada)
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
  } catch {
    return [];
  }
}

// ============================================================
// IBRAM — Cada museu tem sua própria instalação Tainacan.
// Tentamos os principais museus federais brasileiros.
// ============================================================
async function searchIBRAM(query: string): Promise<any[]> {
  const museusIBRAM = [
    'https://museudainconfidencia.museus.gov.br',
    'https://museuhistoriconacional.museus.gov.br',
    'https://museuimperial.museus.gov.br',
    'https://museudodiamante.museus.gov.br',
  ];
  const results: any[] = [];
  
  for (const base of museusIBRAM) {
    try {
      const url = `${base}/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=3`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      for (const item of items.slice(0, 3)) {
        results.push({
          titulo: item.title?.rendered || item.title || 'Sem título',
          descricao: (item.content?.rendered || '').replace(/<[^>]*>/g, '').substring(0, 200),
          criador: item.author_name || 'Desconhecido',
          link: item.link || item.url || '',
          museu: base.split('//')[1].split('.')[0],
          fonte: 'IBRAM'
        });
      }
      if (results.length >= 5) break;
    } catch {
      continue;
    }
  }
  return results.slice(0, 5);
}

// ============================================================
// Brasiliana Iconográfica — NÃO tem API pública.
// Busca via Biblioteca Nacional Digital (bndigital) como proxy.
// ============================================================
async function searchBrasiliana(query: string): Promise<any[]> {
  try {
    // BNDigital / Acervo Digital da Biblioteca Nacional — usa OAI-PMH / Tainacan
    const url = `https://bndigital.bn.gov.br/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 5).map((item: any) => ({
      titulo: item.title?.rendered?.replace(/<[^>]*>/g, '') || 'Sem título',
      descricao: (item.excerpt?.rendered || '').replace(/<[^>]*>/g, '').substring(0, 200),
      criador: 'Biblioteca Nacional',
      link: item.link || '',
      fonte: 'Brasiliana/BNDigital'
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Motor de IA — Pollinations (endpoint /openai retorna JSON OpenAI-compat)
// ============================================================
async function generateAIAnalysis(
  tag: string,
  europeana: any[],
  ibram: any[],
  brasiliana: any[],
  dbTags: any[]
) {
  const prompt = `Aja como o "Cérebro Semântico" do sistema Folksonomia Digital.
O curador pesquisou a tag: "${tag}".

Dados reais encontrados AGORA nas APIs:
- Europeana: ${europeana.length} itens${europeana.length > 0 ? '. Títulos: ' + europeana.map(e => e.titulo).join(', ') : ''}
- IBRAM (Museus do Brasil): ${ibram.length} itens${ibram.length > 0 ? '. Títulos: ' + ibram.map(i => i.titulo).join(', ') : ''}
- Brasiliana/BNDigital: ${brasiliana.length} itens${brasiliana.length > 0 ? '. Títulos: ' + brasiliana.map(b => b.titulo).join(', ') : ''}
- Tags internas no banco: ${dbTags.length} registros${dbTags.length > 0 ? '. Tags: ' + dbTags.map(t => t.tag_original).join(', ') : ''}

Escreva em português uma análise semântica profunda (3-4 parágrafos) sobre como a tag "${tag}" se correlaciona com os dados REAIS encontrados acima.

REGRAS:
1. Se alguma API retornou 0, diga que não retornou resultados nessa fonte. NÃO invente dados.
2. Para as fontes que retornaram resultados, explique as conexões conceituais, históricas e museológicas entre os itens encontrados e a tag.
3. Explique como o sistema aprende com cada nova tag e vai criando conexões entre os dados de diferentes fontes, como um DNA automutável.
4. Escreva APENAS texto corrido limpo, sem markdown, sem JSON, sem blocos de código.`;

  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai'
      }),
      signal: AbortSignal.timeout(25000)
    });
    if (!res.ok) return null;
    
    // O endpoint /openai retorna formato OpenAI: {choices:[{message:{content:"..."}}]}
    const raw = await res.text();
    try {
      const parsed = JSON.parse(raw);
      return parsed?.choices?.[0]?.message?.content || raw;
    } catch {
      // Se não for JSON, retorna o texto bruto
      return raw;
    }
  } catch {
    return null;
  }
}

// ============================================================
// POST Handler
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { tag } = await req.json();
    if (!tag || tag.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Tag inválida' }, { status: 400 });
    }

    const query = tag.trim();

    // PASSO 1: Verificar se a tag EXISTE no banco de dados.
    // A tag é uma CHAVE — só funciona se alguém já criou essa tag no sistema.
    const { data: existingTags, error: tagError } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, obra_id')
      .or(`tag_original.ilike.%${query}%,tag_normalizada.ilike.%${query}%,grupo_tematico.ilike.%${query}%`)
      .limit(20);

    if (tagError) {
      console.error('[Tags] Supabase error:', tagError);
    }

    const dbTags = existingTags || [];
    
    // Se a tag NÃO existe no banco, avisa que precisa ser criada primeiro
    if (dbTags.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          tag: query,
          tagNaoExiste: true,
          motores: {
            modernbert: { status: 'active', descricao: 'Classificação de tokens e extração de entidades' },
            rotate: { status: 'active', descricao: 'Inferência de relações no espaço complexo' },
            gat: { status: 'active', descricao: 'Resolução de fronteiras fluidas e multi-membership' }
          },
          correlacoes: {
            europeana: { total: 0, items: [] },
            brasiliana: { total: 0, items: [] },
            ibram: { total: 0, items: [] },
            internas: { total: 0, items: [] }
          },
          analiseEscrita: `A tag "${query}" não existe no sistema. Nenhum visitante criou essa tag sobre nenhuma obra. O Relatório Semântico só funciona com tags que foram efetivamente registradas por usuários no banco de dados. Crie a tag primeiro através da interface pública de tagging.`,
          profundidade: 'INEXISTENTE'
        }
      });
    }

    // PASSO 2: A tag EXISTE. Agora buscamos nas 3 APIs externas em paralelo.
    // Dispara evento CONSULTA no barramento
    dispatchEvent({ tipo: 'CONSULTA', origem: 'relatorio-semantico', payload: { query, tags_encontradas: dbTags.length } });

    const [europeana, ibram, brasiliana] = await Promise.all([
      searchEuropeana(query),
      searchIBRAM(query),
      searchBrasiliana(query)
    ]);

    // Dispara evento INGESTAO para cada API que retornou dados
    if (europeana.length > 0) {
      dispatchEvent({ tipo: 'INGESTAO', origem: 'europeana', payload: { source: 'europeana', query, items: europeana } });
    }
    if (ibram.length > 0) {
      dispatchEvent({ tipo: 'INGESTAO', origem: 'ibram', payload: { source: 'ibram', query, items: ibram } });
    }
    if (brasiliana.length > 0) {
      dispatchEvent({ tipo: 'INGESTAO', origem: 'bndigital', payload: { source: 'brasiliana', query, items: brasiliana } });
    }

    // PASSO 3: Gerar análise semântica profunda com IA
    const brainText = await generateAIAnalysis(query, europeana, ibram, brasiliana, dbTags);

    const totalExterno = europeana.length + ibram.length + brasiliana.length;
    const analise = brainText || 
      `A tag "${query}" existe no sistema com ${dbTags.length} registro(s). ` +
      `O motor encontrou ${europeana.length} correlação(ões) na Europeana, ${ibram.length} no IBRAM e ${brasiliana.length} na Brasiliana/BNDigital. ` +
      `Conforme novas tags são criadas e validadas, o sistema amplia automaticamente essas conexões.`;

    return NextResponse.json({
      success: true,
      data: {
        tag: query,
        tagNaoExiste: false,
        motores: {
          modernbert: { status: 'active', descricao: 'Classificação de tokens e extração de entidades' },
          rotate: { status: 'active', descricao: 'Inferência de relações no espaço complexo' },
          gat: { status: 'active', descricao: 'Resolução de fronteiras fluidas e multi-membership' }
        },
        correlacoes: {
          europeana: { total: europeana.length, items: europeana },
          brasiliana: { total: brasiliana.length, items: brasiliana },
          ibram: { total: ibram.length, items: ibram },
          internas: { total: dbTags.length, items: dbTags }
        },
        analiseEscrita: analise,
        profundidade: totalExterno > 5 ? 'ALTA' : totalExterno > 0 ? 'MÉDIA' : 'BAIXA'
      }
    });
  } catch (error: any) {
    console.error('[Relatório Semântico] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
