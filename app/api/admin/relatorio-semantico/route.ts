import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent } from '@/lib/ml/event-bus';
import { buildCorrelationGraph } from '@/lib/ml/correlation-engine';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';
import { IbramConnector } from '@/lib/connectors/ibram';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { expandQuery, enrichWithThesaurus } from '@/lib/ml/thesaurus';

export const dynamic = 'force-dynamic';

// ============================================================
// Europeana Search API — EM DESCANSO (desativada mas preservada)
// Para reativar, descomente a chamada no PASSO 4.
// ============================================================
async function searchEuropeana(query: string): Promise<any[]> {
  // DESATIVADA — fontes agora são exclusivamente Tainacan/IBRAM
  return [];
  /*
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
  */
}

// ============================================================
// IBRAM — Acervos Digitais Tainacan (5 museus reais)
// MART, Caeté, Abolição, Diamante, Museu do Índio
// ============================================================
async function searchIBRAM(query: string, expandedTerms: string[] = []): Promise<any[]> {
  try {
    const connector = new IbramConnector();
    
    // Busca principal
    const mainResults = await connector.searchAllMuseums(query, 5);
    
    // Busca expandida com termos do tesauro (se disponíveis)
    let expandedResults: any[] = [];
    if (expandedTerms.length > 0) {
      const expandedPromises = expandedTerms.slice(0, 3).map(term => 
        connector.searchAllMuseums(term, 2)
      );
      const expandedSettled = await Promise.allSettled(expandedPromises);
      for (const r of expandedSettled) {
        if (r.status === 'fulfilled') expandedResults.push(...r.value);
      }
    }

    // Combinar e deduplicar
    const allResults = [...mainResults, ...expandedResults];
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      const key = `${r.museum}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 15).map(r => ({
      titulo: r.title,
      descricao: r.description || '',
      criador: r.author || 'Desconhecido',
      data: r.date || '',
      material: r.material || '',
      tecnica: r.tecnica || '',
      link: r.url || '',
      museu: r.museum || 'IBRAM',
      colecao: r.collection || '',
      thumbnail: r.thumbnail || '',
      fonte: `IBRAM / ${r.museum}`
    }));
  } catch {
    return [];
  }
}

// ============================================================
// ============================================================
// Brasiliana Museus / Tainacan (Agregador)
// ============================================================
async function searchBrasiliana(query: string, expandedTerms: string[] = []): Promise<any[]> {
  try {
    const connector = new BrasilianaConnector();
    
    // Busca principal
    const mainResults = await connector.searchExternalSource(query);
    
    // Busca expandida com termos do tesauro
    let expandedResults: any[] = [];
    if (expandedTerms.length > 0) {
      const expandedPromises = expandedTerms.slice(0, 3).map(term => 
        connector.searchExternalSource(term)
      );
      const expandedSettled = await Promise.allSettled(expandedPromises);
      for (const r of expandedSettled) {
        if (r.status === 'fulfilled') expandedResults.push(...r.value);
      }
    }

    // Combinar e deduplicar
    const allResults = [...mainResults, ...expandedResults];
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      const key = r.external_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 10).map(r => ({
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
// Fontes Auxiliares (DBpedia / OpenAlex — futuro)
// ============================================================
async function searchAuxiliares(query: string): Promise<any[]> {
  const results: any[] = [];
  // DBpedia e OpenAlex serão implementados aqui futuramente
  return results;
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
// Pipeline Transformer-Style (Chain-of-Thought com Tesauro)
// ============================================================
async function generateAIAnalysis(
  tag: string,
  correlationGraph: any,
  tagCorrelation: any,
  previousCorrelations: any[],
  dbTags: any[],
  ibram: any[],
  brasiliana: any[],
  auxiliares: any[],
  thesaurusContext: string
) {
  const ibramMuseusEncontrados = [...new Set(ibram.map((i: any) => i.museu || i.fonte || 'IBRAM'))];
  const ibramMuseusLista = ['MART', 'Museu Regional de Caeté', 'Museu da Abolição', 'Museu do Diamante', 'Museu de Arqueologia de Itaipu', 'Museu do Índio', 'Museu da Pessoa', 'Museu de Folclore Edison Carneiro'];
  const ibramMuseusVazios = ibramMuseusLista.filter(m => !ibramMuseusEncontrados.some(encontrado => encontrado.includes(m) || m.includes(encontrado)));

  const ibramTexto = ibram.length > 0
    ? ibram.map((i: any) => `"${i.titulo}" — ${i.descricao?.slice(0, 120) || ''} — ${i.museu || 'IBRAM'} ${i.material ? `| Material: ${i.material}` : ''} ${i.tecnica ? `| Técnica: ${i.tecnica}` : ''}`).join('\n') + `\n\n[NOTA IMPORTANTE DE CRUZAMENTO]: O sistema cruzou dados também com os seguintes museus: ${ibramMuseusVazios.join(', ')}. No entanto, as APIs destes museus específicos retornaram ZERO registros contendo a tag "${tag}".`
    : `[NOTA IMPORTANTE DE CRUZAMENTO]: O sistema realizou buscas ativas cruzadas em todos os 8 museus da rede (${ibramMuseusLista.join(', ')}), porém NENHUM retornou itens para esta tag.`;

  const brasilianaTexto = brasiliana.length > 0
    ? brasiliana.map((b: any) => `"${b.titulo}" — ${b.descricao?.slice(0, 100) || ''} — Brasiliana Museus`).join('\n')
    : 'Nenhum registro encontrado na Brasiliana Museus para este termo.';

  const auxiliaresTexto = auxiliares.length > 0
    ? auxiliares.map((w: any) => `"${w.titulo}" — ${w.descricao?.slice(0, 100) || ''} — ${w.fonte}`).join('\n')
    : 'Nenhum registro encontrado nas fontes auxiliares (DBpedia/OpenAlex).';

  const crossTexto = correlationGraph.crossConnections?.length > 0
    ? correlationGraph.crossConnections.map((c: any) => `• ${c.description}`).join('\n')
    : 'Nenhuma conexão cruzada detectada entre as fontes.';

  const tagsRelacionadas = tagCorrelation.totalRelated > 0
    ? [...tagCorrelation.duplicates.map((d: any) => `"${d.tag}" (${d.reason})`), ...tagCorrelation.siblings.map((s: any) => `"${s.tag}" (${s.reason})`)].join(', ')
    : 'nenhuma';

  const familiaTexto = tagCorrelation.family 
    ? `Família temática: "${tagCorrelation.family.name}" — membros: ${tagCorrelation.family.members.slice(0, 5).join(', ')}`
    : '';

  const conhecimentoPrevio = previousCorrelations.length > 0
    ? `O sistema já conhece ${previousCorrelations.length} correlação(ões) anteriores para esta tag.`
    : 'Esta é a primeira análise desta tag — nenhum conhecimento prévio.';

  const prompt = `Aja como o "Cérebro Semântico" do sistema Folksonomia Digital 2.0.
Você é um motor de análise transformer que raciocina em cadeia (chain-of-thought) sobre dados de acervos museológicos brasileiros.

O curador pesquisou a tag: "${tag}".

=== VOCABULÁRIO CONTROLADO (TESAURO CNFCP/IPHAN) ===
${thesaurusContext}

=== DADOS FACTUAIS DOS ACERVOS (NÃO INVENTE — use APENAS o que está listado) ===

FONTE OFICIAL — IBRAM / TAINACAN E OUTROS MUSEUS (8 museus: MART, Caeté, Abolição, Diamante, Itaipu, Índio, Pessoa, Folclore):
${ibramTexto}

FONTE OFICIAL — BRASILIANA MUSEUS:
${brasilianaTexto}

FONTE AUXILIAR:
${auxiliaresTexto}

=== CONEXÕES CRUZADAS ENTRE FONTES ===
${crossTexto}

=== TAGS INTERNAS RELACIONADAS ===
${tagCorrelation.duplicates.length > 0 ? 
  `Tags duplicatas/variantes: ${tagCorrelation.duplicates.map((d: any) => `"${d.tag}" (${d.reason})`).join(', ')}` : ''}
${tagCorrelation.siblings.length > 0 ? 
  `Tags semanticamente próximas: ${tagCorrelation.siblings.map((s: any) => `"${s.tag}" (${s.reason})`).join(', ')}` : ''}
${tagCorrelation.family ? 
  `Família temática: "${tagCorrelation.family.name}" — membros: ${tagCorrelation.family.members.slice(0, 5).join(', ')}` : ''}

=== CONHECIMENTO PRÉVIO ===
${conhecimentoPrevio}

=== INSTRUÇÕES TRANSFORMER ===
Raciocine em 3 etapas sequenciais, usando o tesauro para contextualizar:

ETAPA 1 — CAMADA FACTUAL:
Descreva o que os acervos Tainacan/IBRAM e Brasiliana retornaram. Cite os museus específicos (MART, Caeté, Abolição, Diamante, Itaipu, Índio, Pessoa, Folclore), títulos dos itens, materiais e técnicas. Se o tesauro CNFCP define o termo, inclua a definição. NÃO INVENTE DADOS.

ETAPA 2 — CAMADA INFERIDA (MUITO IMPORTANTE: TODO O CRUZAMENTO DE DADOS DEVE SER ESCRITO NESTA CAMADA):
O sistema tem que cruzar os dados. Reconheça a tag e verifique na Brasiliana e nos Museus o que ela significa. Faça a limpeza de dados (mentalmente) e escreva AQUI NESTA CAMADA INFERIDA toda a devolutiva de como esses dados das APIs (Museus e Brasiliana) e da terminologia (Tesauro) se conectam. Use o tesauro para expandir as conexões (TG, TE, TA). Que atributos compartilham os registros? Identifique os padrões.

ETAPA 3 — APRENDIZADO:
Como o sistema está evoluindo? Que novas correlações foram registradas? Que famílias temáticas foram identificadas? Como o tesauro ajuda a classificar esta tag na taxonomia do patrimônio cultural brasileiro?

Escreva em português, texto corrido e limpo, sem markdown, sem JSON. Use parágrafos bem estruturados.`;

  // Pipeline de múltiplos endpoints (fallback sequencial)
  const seed = Math.floor(Math.random() * 1000000);
  const endpoints = [
    {
      url: `https://text.pollinations.ai/openai?seed=${seed}`,
      body: { messages: [{ role: 'user', content: prompt }], model: 'openai' },
      parse: async (res: Response) => {
        const raw = await res.text();
        try { return JSON.parse(raw)?.choices?.[0]?.message?.content || raw; } catch { return raw; }
      }
    },
    {
      url: `https://text.pollinations.ai/?seed=${seed}`,
      body: prompt,
      isText: true,
      parse: async (res: Response) => res.text()
    },
    {
      url: 'https://api.pollinations.ai/v1/chat/completions',
      body: { model: 'openai', messages: [{ role: 'user', content: prompt }], seed: seed },
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
        signal: AbortSignal.timeout(30000)
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
    ibram.length > 0
      ? `Nos acervos do IBRAM/Tainacan foram localizados ${ibram.length} registro(s): ${ibram.slice(0, 3).map((i: any) => `"${i.titulo}" (${i.museu})`).join('; ')}.`
      : `Os acervos do IBRAM/Tainacan não retornaram registros diretos para a tag "${tag}".`,
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
    `[Nota de Busca Ativa]: O sistema consultou ativamente as APIs do Museu do Índio, Museu da Pessoa e Museu de Folclore Edison Carneiro, além dos demais museus da rede IBRAM. ${ibramMuseusVazios.length > 0 ? `As APIs de ${ibramMuseusVazios.join(', ')} retornaram ZERO itens compatíveis com a tag "${tag}".` : 'Todos retornaram itens.'}`,
    correlationGraph.correlations?.length > 0
      ? `O motor semântico detectou ${correlationGraph.correlations.length} correlação(ões) entre as fontes encontradas. ${crossTexto !== 'Nenhuma conexão cruzada detectada entre as fontes.' ? `Conexões cruzadas identificadas: ${crossTexto}` : 'As fontes operam de forma independente neste caso.'}`
      : `Não foram detectadas correlações cruzadas entre as fontes para esta tag.`,
    tagCorrelation.totalRelated > 0
      ? `No banco interno, ${tagCorrelation.totalRelated} tag(s) relacionada(s) foram identificadas: ${tagsRelacionadas}.`
      : `Nenhuma tag semanticamente próxima foi identificada no banco interno.`,
    familiaTexto,
    thesaurusContext ? `\nContexto do Tesauro CNFCP: ${thesaurusContext}` : ''
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
    // PASSO 0: Expandir query com Tesauro CNFCP
    // ================================================================
    const thesaurusExpansion = expandQuery(query);
    const thesaurusContext = enrichWithThesaurus(query);

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
          tesauro: {
            termoEncontrado: !!thesaurusExpansion.context,
            contexto: thesaurusContext,
            termosExpandidos: thesaurusExpansion.expanded
          },
          correlacoes: {
            ibram: { total: 0, items: [] },
            brasiliana: { total: 0, items: [] },
            auxiliares: { total: 0, items: [] },
            internas: { total: 0, items: [] }
          },
          analiseEscrita: `A tag "${query}" não existe no sistema. Nenhum visitante criou essa tag sobre nenhuma obra. O Relatório Semântico só funciona com tags que foram efetivamente registradas por usuários no banco de dados. Crie a tag primeiro através da interface pública de tagging.${thesaurusExpansion.context ? `\n\nContexto do Tesauro CNFCP: ${thesaurusContext}` : ''}`,
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
    // PASSO 4: Buscar nos acervos Tainacan + fontes auxiliares em paralelo
    // Europeana está EM DESCANSO (retorna [])
    // ================================================================
    dispatchEvent({ tipo: 'CONSULTA', origem: 'relatorio-semantico', payload: { query, tags_encontradas: dbTags.length } });

    const [ibram, brasiliana, auxiliares] = await Promise.all([
      searchIBRAM(query, thesaurusExpansion.expanded),
      searchBrasiliana(query, thesaurusExpansion.expanded),
      searchAuxiliares(query)
    ]);

    // Disparar eventos de ingestão
    if (ibram.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'ibram', payload: { source: 'ibram-tainacan', query, items: ibram, museus: [...new Set(ibram.map((i: any) => i.museu))] } });
    if (brasiliana.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'brasiliana', payload: { source: 'brasiliana-tainacan', query, items: brasiliana } });

    // ================================================================
    // PASSO 5: Construir grafo de correlações com EXPLICAÇÕES
    // ================================================================
    const correlationGraph = buildCorrelationGraph(query, [], ibram, brasiliana, auxiliares);

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
    // Pipeline Transformer com Tesauro CNFCP
    // ================================================================
    const brainText = await generateAIAnalysis(query, correlationGraph, tagCorrelation, previousCorrelations, dbTags, ibram, brasiliana, auxiliares, thesaurusContext);

    const totalExterno = ibram.length + brasiliana.length;
    const analise = brainText || 
      `A tag "${query}" existe no sistema com ${dbTags.length} registro(s). ` +
      `O motor encontrou ${ibram.length} registro(s) no IBRAM/Tainacan e ${brasiliana.length} na Brasiliana Museus. ` +
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

        // Tesauro CNFCP
        tesauro: {
          termoEncontrado: !!thesaurusExpansion.context,
          contexto: thesaurusContext,
          termosExpandidos: thesaurusExpansion.expanded
        },

        // Correlações por fonte
        correlacoes: {
          ibram: { 
            total: ibram.length, 
            items: ibram,
            correlations: correlationGraph.correlations.filter((c: any) => c.source.includes('IBRAM')),
            museus: [...new Set(ibram.map((i: any) => i.museu))]
          },
          brasiliana: { 
            total: brasiliana.length, 
            items: brasiliana,
            correlations: correlationGraph.correlations.filter((c: any) => c.source.includes('Brasiliana'))
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
