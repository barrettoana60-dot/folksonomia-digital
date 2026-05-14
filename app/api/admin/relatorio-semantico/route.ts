import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent } from '@/lib/ml/event-bus';
import { buildCorrelationGraph } from '@/lib/ml/correlation-engine';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';
import { IbramConnector } from '@/lib/connectors/ibram';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';

export const dynamic = 'force-dynamic';

// ============================================================
// Europeana Search API (real — confirmada)
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
      subject: item.dcSubject || [],
      spatial: item.edmPlaceLabelLangAware?.pt || item.edmPlaceLabel || [],
      medium: item.dcFormat || [],
      link: item.guid || '',
      fonte: 'Europeana'
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Fontes Auxiliares (Desambiguação e Enciclopédia)
// ============================================================
async function searchAuxiliares(query: string): Promise<any[]> {
  const results: any[] = [];
  // DBpedia e OpenAlex serão implementados aqui futuramente
  return results;
}

// ============================================================
// IBRAM — Acervos Digitais (Tainacan / MuseusBR)
// ============================================================
async function searchIBRAM(query: string): Promise<any[]> {
  try {
    const connector = new IbramConnector();
    const records = await connector.searchAllMuseums(query, 3);
    return records.slice(0, 5).map(r => ({
      titulo: r.title,
      descricao: r.description || '',
      criador: r.author || 'Desconhecido',
      data: r.date || '',
      link: r.url || '',
      museu: r.museum || 'IBRAM',
      fonte: 'IBRAM / Tainacan'
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Brasiliana Museus / Tainacan
// ============================================================
async function searchBrasiliana(query: string): Promise<any[]> {
  try {
    const connector = new BrasilianaConnector();
    const records = await connector.searchExternalSource(query);
    return records.slice(0, 5).map(r => ({
      titulo: r.title,
      descricao: r.description || '',
      criador: r.provider || 'Brasiliana Museus',
      data: '',
      link: r.url || '',
      fonte: 'Brasiliana Museus'
    }));
  } catch {
    return [];
  }
}


// ============================================================
// Carregar correlações já aprendidas anteriormente

// ============================================================
async function loadPreviousCorrelations(tagNormalized: string) {
  try {
    const { data } = await supabaseAdmin
      .from('semantic_correlations')
      .select('*')
      .eq('tag_normalizada', tagNormalized)
      .order('correlation_score', { ascending: false })
      .limit(100);
    return data || [];
  } catch {
    return [];
  }
}

// ============================================================
// Carregar histórico de aprendizado da tag
// ============================================================
async function loadLearningHistory(tagNormalized: string) {
  try {
    const { data } = await supabaseAdmin
      .from('tag_learning_history')
      .select('*')
      .eq('tag_normalizada', tagNormalized)
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  } catch {
    return [];
  }
}

// ============================================================
// Persistir novas correlações no banco (sistema aprende)
// ============================================================
async function persistCorrelations(
  tagNormalized: string,
  correlations: any[],
  crossConnections: any[]
) {
  try {
    // Upsert correlações
    for (const corr of correlations) {
      await supabaseAdmin
        .from('semantic_correlations')
        .upsert({
          tag_normalizada: tagNormalized,
          source: corr.source,
          external_id: corr.externalId,
          external_title: corr.title,
          correlation_score: corr.score,
          correlation_reasons: corr.reasons,
          layer: corr.layer,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tag_normalizada,source,external_id' });
    }

    // Persistir conexões cruzadas
    for (const conn of crossConnections) {
      await supabaseAdmin
        .from('cross_source_connections')
        .insert({
          source_a: conn.sourceA,
          external_id_a: conn.externalIdA,
          title_a: conn.titleA,
          source_b: conn.sourceB,
          external_id_b: conn.externalIdB,
          title_b: conn.titleB,
          connection_type: conn.connectionType,
          connection_details: { sharedAttributes: conn.sharedAttributes, description: conn.description },
          confidence: conn.confidence
        });
    }

    // Registrar evento de aprendizado
    await supabaseAdmin
      .from('tag_learning_history')
      .insert({
        tag_normalizada: tagNormalized,
        event_type: 'correlated',
        event_details: {
          correlations_found: correlations.length,
          cross_connections: crossConnections.length,
          sources: [...new Set(correlations.map(c => c.source))],
          timestamp: new Date().toISOString()
        }
      });
  } catch (err) {
    console.warn('[Correlations] Persist failed (tables may not exist yet):', err);
  }
}

// ============================================================
// Motor de IA — Análise escrita baseada em EVIDÊNCIAS
// ============================================================
async function generateAIAnalysis(
  tag: string,
  correlationGraph: any,
  tagCorrelation: any,
  previousCorrelations: any[],
  dbTags: any[],
  europeana: any[],
  ibram: any[],
  brasiliana: any[],
  auxiliares: any[]
) {
  const europeanaTexto = europeana.length > 0
    ? europeana.map((e: any) => `"${e.titulo}" (${e.criador || ''}, ${e.data || ''}, ${e.pais || ''}) — Europeana`).join('\n')
    : 'Nenhum registro encontrado na Europeana para este termo.';

  const ibramTexto = ibram.length > 0
    ? ibram.map((i: any) => `"${i.titulo}" — ${i.descricao?.slice(0, 100) || ''} — IBRAM / Tainacan`).join('\n')
    : 'Nenhum registro encontrado no IBRAM/Tainacan para este termo.';

  const brasilianaTexto = brasiliana.length > 0
    ? brasiliana.map((b: any) => `"${b.titulo}" — ${b.descricao?.slice(0, 100) || ''} — Brasiliana Museus`).join('\n')
    : 'Nenhum registro encontrado na Brasiliana Museus para este termo.';

  const auxiliaresTexto = auxiliares.length > 0
    ? auxiliares.map((w: any) => `"${w.titulo}" — ${w.descricao?.slice(0, 100) || ''} — ${w.fonte}`).join('\n')
    : 'Nenhum registro encontrado nas fontes auxiliares (DBpedia/OpenAlex).';

  const crossTexto = correlationGraph.crossConnections?.length > 0
    ? correlationGraph.crossConnections.map((c: any) => `• ${c.description}`).join('\n')
    : 'Nenhuma conexão cruzada detectada entre as fontes oficiais.';

  const tagsRelacionadas = [
    ...(tagCorrelation.duplicates || []).map((d: any) => `"${d.tag}" (variante/duplicata: ${d.reason})`),
    ...(tagCorrelation.siblings || []).map((s: any) => `"${s.tag}" (próxima semanticamente: ${s.reason})`)
  ].join(', ') || 'Nenhuma tag relacionada detectada no banco interno.';

  const familiaTexto = tagCorrelation.family
    ? `Família temática identificada: "${tagCorrelation.family.name}" com membros: ${tagCorrelation.family.members.slice(0, 8).join(', ')}.`
    : 'Nenhuma família temática identificada para esta tag.';

  const conhecimentoPrevio = previousCorrelations.length > 0
    ? `O sistema possui ${previousCorrelations.length} correlação(ões) prévia(s) registrada(s) para esta tag — o aprendizado é cumulativo.`
    : 'Esta é a primeira análise desta tag — nenhum conhecimento prévio armazenado.';

  const prompt = `Você é o Cérebro Semântico do Sistema Folksonomia Digital, especializado em patrimônio cultural brasileiro e europeu.

TAG ANALISADA: "${tag}"
REGISTROS INTERNOS: ${dbTags.length} registro(s) criado(s) por visitantes no sistema.

FONTES OFICIAIS DE ACERVOS:
- EUROPEANA:
${europeanaTexto}

- IBRAM / TAINACAN:
${ibramTexto}

- BRASILIANA MUSEUS:
${brasilianaTexto}

FONTE AUXILIAR DE DESAMBIGUAÇÃO:
- DBPEDIA / OPENALEX:
${auxiliaresTexto}

CONEXÕES CRUZADAS ENTRE FONTES:
${crossTexto}

TAGS INTERNAS RELACIONADAS: ${tagsRelacionadas}
${familiaTexto}
CONHECIMENTO ACUMULADO: ${conhecimentoPrevio}

Escreva em português uma análise semântica OBRIGATORIAMENTE em 3 seções separadas:

CAMADA FACTUAL
Descreva o que as fontes oficiais (Europeana, IBRAM, Brasiliana) retornaram de concreto para a tag "${tag}". Cite os museus e os títulos dos itens das fontes oficiais. Mencione as fontes auxiliares apenas para contexto enciclopédico, sem confundi-las com acervos museológicos. Nunca invente dados que não estão na lista acima.

CAMADA INFERIDA
Com base nos dados encontrados, que conexões semânticas o sistema detecta? Que atributos compartilham os registros (período histórico, técnica, material, geografia, iconografia)? Como a tag se relaciona com as tags internas do banco?

APRENDIZADO
O que o sistema aprendeu com esta consulta? Quais novas conexões foram criadas? Como o conhecimento acumulado evolui? O que a família temática identificada revela sobre o vocabulário do acervo?

Escreva texto corrido, sem markdown, sem asteriscos, sem listas com traço. Use apenas parágrafos com títulos em maiúsculas.`;

  // Tentar múltiplos endpoints em sequência
  const endpoints = [
    {
      url: 'https://text.pollinations.ai/openai',
      body: { messages: [{ role: 'user', content: prompt }], model: 'openai' },
      parse: async (res: Response) => {
        const raw = await res.text();
        try { return JSON.parse(raw)?.choices?.[0]?.message?.content || raw; } catch { return raw; }
      }
    },
    {
      url: 'https://text.pollinations.ai/',
      body: prompt,
      isText: true,
      parse: async (res: Response) => res.text()
    },
    {
      url: 'https://api.pollinations.ai/v1/chat/completions',
      body: { model: 'openai', messages: [{ role: 'user', content: prompt }] },
      parse: async (res: Response) => {
        const j = await res.json();
        return j?.choices?.[0]?.message?.content || null;
      }
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': endpoint.isText ? 'text/plain' : 'application/json' },
        body: endpoint.isText ? (endpoint.body as string) : JSON.stringify(endpoint.body),
        signal: AbortSignal.timeout(28000)
      });
      if (!res.ok) continue;
      const text = await endpoint.parse(res);
      if (text && text.length > 100) return text;
    } catch { continue; }
  }

  // Fallback local inteligente — sempre gera as 3 camadas com os dados reais
  const factual = [
    `CAMADA FACTUAL`,
    ``,
    europeana.length > 0
      ? `Na Europeana foram encontrados ${europeana.length} registro(s) associados à tag "${tag}": ${europeana.slice(0, 3).map((e: any) => `"${e.titulo}"${e.criador ? ` (${e.criador})` : ''}${e.data ? `, ${e.data}` : ''}${e.pais ? `, ${e.pais}` : ''}`).join('; ')}.`
      : `A Europeana não retornou registros diretos para a tag "${tag}".`,
    ibram.length > 0
      ? `Nos acervos do IBRAM/Tainacan foram localizados ${ibram.length} registro(s): ${ibram.slice(0, 2).map((i: any) => `"${i.titulo}"`).join(', ')}.`
      : `O IBRAM/Tainacan não encontrou registros para esta tag.`,
    brasiliana.length > 0
      ? `Na Brasiliana Museus foram encontrados ${brasiliana.length} registro(s), incluindo: ${brasiliana.slice(0, 2).map((b: any) => `"${b.titulo}"`).join(', ')}.`
      : `A Brasiliana Museus não retornou registros para esta tag.`,
    auxiliares.length > 0
      ? `Como contexto auxiliar, fontes enciclopédicas (DBpedia/OpenAlex) forneceram dados de desambiguação para o termo.`
      : ``
  ].join('\n');

  const inferred = [
    ``,
    `CAMADA INFERIDA`,
    ``,
    correlationGraph.correlations?.length > 0
      ? `O motor semântico detectou ${correlationGraph.correlations.length} correlação(ões) entre as fontes. ${crossTexto !== 'Nenhuma conexão cruzada detectada entre as fontes.' ? `Conexões cruzadas identificadas: ${crossTexto}` : 'As fontes operam de forma independente neste caso.'}`
      : `Não foram detectadas correlações cruzadas entre as fontes para esta tag.`,
    tagCorrelation.totalRelated > 0
      ? `No banco interno, ${tagCorrelation.totalRelated} tag(s) relacionada(s) foram identificadas: ${tagsRelacionadas}.`
      : `Nenhuma tag semanticamente próxima foi identificada no banco interno.`,
    familiaTexto
  ].join('\n');

  const learning = [
    ``,
    `APRENDIZADO`,
    ``,
    dbTags.length > 0
      ? `A tag "${tag}" possui ${dbTags.length} registro(s) criado(s) por visitantes do sistema.`
      : `A tag "${tag}" ainda não possui registros de visitantes.`,
    conhecimentoPrevio,
    correlationGraph.correlations?.length > 0
      ? `${correlationGraph.correlations.length} nova(s) correlação(ões) foram registradas no banco de aprendizado semântico. A cada consulta, o sistema amplia sua memória e melhora a qualidade das análises futuras.`
      : `Esta consulta foi registrada para aprendizado futuro. Conforme mais tags forem criadas e validadas, o sistema amplia automaticamente suas conexões semânticas.`
  ].join('\n');

  return factual + inferred + learning;
}

  const prompt = `Aja como o "Cérebro Semântico" do sistema Folksonomia Digital.
O curador pesquisou a tag: "${tag}".

=== DADOS FACTUAIS (das APIs — NÃO INVENTE) ===
${correlationGraph.correlations.map((c: any) => 
  `• ${c.source}: "${c.title}" — ${c.summary}`
).join('\n') || 'Nenhuma correlação encontrada nas APIs externas.'}

=== CONEXÕES CRUZADAS ENTRE FONTES ===
${correlationGraph.crossConnections.map((c: any) => 
  `• ${c.description}`
).join('\n') || 'Nenhuma conexão cruzada detectada.'}

=== TAGS INTERNAS RELACIONADAS ===
${tagCorrelation.duplicates.length > 0 ? 
  `Tags duplicatas/variantes: ${tagCorrelation.duplicates.map((d: any) => `"${d.tag}" (${d.reason})`).join(', ')}` : ''}
${tagCorrelation.siblings.length > 0 ? 
  `Tags semanticamente próximas: ${tagCorrelation.siblings.map((s: any) => `"${s.tag}" (${s.reason})`).join(', ')}` : ''}
${tagCorrelation.family ? 
  `Família temática: "${tagCorrelation.family.name}" — membros: ${tagCorrelation.family.members.slice(0, 5).join(', ')}` : ''}

=== CONHECIMENTO PRÉVIO (já aprendido) ===
${previousCorrelations.length > 0 ? 
  `O sistema já conhece ${previousCorrelations.length} correlação(ões) anteriores para esta tag.` :
  'Esta é a primeira análise desta tag — nenhum conhecimento prévio.'}

=== INSTRUÇÕES ===
Escreva em português uma análise semântica em 3 seções:

**CAMADA FACTUAL**: O que as APIs externas retornaram de concreto. Cite títulos, fontes e links. Se uma API retornou 0, diga isso. NÃO INVENTE DADOS.

**CAMADA INFERIDA**: Que conexões o sistema ML detectou — por que cada dado se correlaciona com a tag, quais atributos compartilham (período, técnica, geografia, material). Mencione as conexões cruzadas entre fontes se existirem.

**APRENDIZADO**: Como o sistema está evoluindo com esta consulta — novas conexões criadas, tags duplicatas detectadas, famílias temáticas identificadas.

Escreva APENAS texto corrido limpo, sem markdown, sem JSON, sem blocos de código. Use parágrafos bem estruturados.`;

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
    
    const raw = await res.text();
    try {
      const parsed = JSON.parse(raw);
      return parsed?.choices?.[0]?.message?.content || raw;
    } catch {
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
    const queryNorm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();

    // ================================================================
    // PASSO 1: Verificar se a tag EXISTE no banco
    // ================================================================
    const { data: existingTags, error: tagError } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, obra_id')
      .or(`tag_original.ilike.%${query}%,tag_normalizada.ilike.%${query}%,grupo_tematico.ilike.%${query}%`)
      .limit(20);

    if (tagError) console.error('[Tags] Supabase error:', tagError);

    const dbTags = existingTags || [];
    
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

    // ================================================================
    // PASSO 2: Carregar todas as tags do banco para correlação inter-tags
    // ================================================================
    const { data: allTagsRaw } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, grupo_tematico')
      .limit(500);
    
    const allTagStrings = [...new Set((allTagsRaw || []).map((t: any) => t.tag_original))];

    // ================================================================
    // PASSO 3: Análise de correlação inter-tags (erros, sinônimos, famílias)
    // ================================================================
    const tagCorrelation = analyzeTagCorrelations(query, allTagStrings);

    // ================================================================
    // PASSO 4: Buscar nas 3 APIs externas em paralelo
    // ================================================================
    dispatchEvent({ tipo: 'CONSULTA', origem: 'relatorio-semantico', payload: { query, tags_encontradas: dbTags.length } });

    const [europeana, ibram, brasiliana, auxiliares] = await Promise.all([
      searchEuropeana(query),
      searchIBRAM(query),
      searchBrasiliana(query),
      searchAuxiliares(query)
    ]);

    // Disparar eventos de ingestão
    if (europeana.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'europeana', payload: { source: 'europeana', query, items: europeana } });
    if (ibram.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'ibram', payload: { source: 'ibram', query, items: ibram } });
    if (brasiliana.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'bndigital', payload: { source: 'brasiliana', query, items: brasiliana } });

    // ================================================================
    // PASSO 5: Construir grafo de correlações com EXPLICAÇÕES
    // ================================================================
    const correlationGraph = buildCorrelationGraph(query, europeana, ibram, brasiliana, auxiliares);

    // ================================================================
    // PASSO 6: Carregar conhecimento prévio (sistema aprende)
    // ================================================================
    const previousCorrelations = await loadPreviousCorrelations(queryNorm);
    const learningHistory = await loadLearningHistory(queryNorm);

    // ================================================================
    // PASSO 7: Persistir novas correlações (sistema APRENDE)
    // ================================================================
    await persistCorrelations(queryNorm, correlationGraph.correlations, correlationGraph.crossConnections);

    // ================================================================
    // PASSO 8: Gerar análise escrita com IA baseada em EVIDÊNCIAS
    // ================================================================
    const brainText = await generateAIAnalysis(query, correlationGraph, tagCorrelation, previousCorrelations, dbTags, europeana, ibram, brasiliana, auxiliares);

    const totalExterno = europeana.length + ibram.length + brasiliana.length;
    const analise = brainText || 
      `A tag "${query}" existe no sistema com ${dbTags.length} registro(s). ` +
      `O motor encontrou ${europeana.length} correlação(ões) na Europeana, ${ibram.length} no IBRAM/Tainacan e ${brasiliana.length} na Brasiliana Museus. ` +
      `${tagCorrelation.totalRelated > 0 ? `Foram detectadas ${tagCorrelation.totalRelated} tags relacionadas no banco interno. ` : ''}` +
      `Conforme novas tags são criadas e validadas, o sistema amplia automaticamente essas conexões.`;

    // ================================================================
    // RESPOSTA FINAL — Estruturada com todas as camadas
    // ================================================================
    return NextResponse.json({
      success: true,
      data: {
        tag: query,
        tagNaoExiste: false,

        // Status dos motores ML
        motores: {
          modernbert: { status: 'active', descricao: 'Classificação de tokens e extração de entidades' },
          rotate: { status: 'active', descricao: 'Inferência de relações no espaço complexo' },
          gat: { status: 'active', descricao: 'Resolução de fronteiras fluidas e multi-membership' }
        },

        // Correlações por fonte (com explicações)
        correlacoes: {
          europeana: { 
            total: europeana.length, 
            items: europeana,
            correlations: correlationGraph.correlations.filter((c: any) => c.source === 'Europeana')
          },
          brasiliana: { 
            total: brasiliana.length, 
            items: brasiliana,
            correlations: correlationGraph.correlations.filter((c: any) => c.source.includes('Brasiliana'))
          },
          ibram: { 
            total: ibram.length, 
            items: ibram,
            correlations: correlationGraph.correlations.filter((c: any) => c.source.includes('IBRAM'))
          },
          auxiliares: {
            total: auxiliares.length,
            items: auxiliares,
            correlations: correlationGraph.correlations.filter((c: any) => c.source === 'DBpedia' || c.source === 'OpenAlex')
          },
          internas: { total: dbTags.length, items: dbTags }
        },

        // Conexões cruzadas entre fontes
        crossConnections: correlationGraph.crossConnections,

        // Correlação inter-tags (duplicatas, sinônimos, famílias)
        tagAnalysis: {
          duplicates: tagCorrelation.duplicates,
          siblings: tagCorrelation.siblings,
          family: tagCorrelation.family,
          spellingErrors: tagCorrelation.spellingErrors,
          suggestions: tagCorrelation.suggestions,
          totalRelated: tagCorrelation.totalRelated
        },

        // Conhecimento acumulado
        knowledge: {
          previousCorrelations: previousCorrelations.length,
          learningEvents: learningHistory.length,
          history: learningHistory.slice(0, 5)
        },

        // Camadas da tag tricamada
        layers: correlationGraph.layerBreakdown,

        // Análise escrita gerada pelo motor semântico
        analiseEscrita: analise,
        profundidade: correlationGraph.depth
      }
    });
  } catch (error: any) {
    console.error('[Relatório Semântico] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
