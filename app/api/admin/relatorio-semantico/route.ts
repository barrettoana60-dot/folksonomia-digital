import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent } from '@/lib/ml/event-bus';
import { buildCorrelationGraph } from '@/lib/ml/correlation-engine';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';

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
// IBRAM — Portal de Acervos Museológicos Federais (acervos.museus.gov.br)
// ============================================================
async function searchIBRAM(query: string): Promise<any[]> {
  const results: any[] = [];

  // 1. Portal principal de acervos do IBRAM (Tainacan)
  const endpoints = [
    `https://acervos.museus.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=5`,
    `https://museudoindio.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=3`,
    `https://museuimperial.museus.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=3`,
    `https://museuvitorino.museus.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=3`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'Accept': 'application/json', 'User-Agent': 'Folksonomia-Digital/2.0' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || data._embedded?.items || []);
      for (const item of items.slice(0, 4)) {
        const titulo = item.title?.rendered || item.title || item.name || '';
        if (!titulo) continue;
        results.push({
          titulo: titulo.replace(/<[^>]*>/g, '').trim(),
          descricao: (item.content?.rendered || item.description || '').replace(/<[^>]*>/g, '').substring(0, 250),
          criador: item.author_name || item._embedded?.author?.[0]?.name || 'Museu Federal',
          data: item.date ? new Date(item.date).getFullYear().toString() : '',
          link: item.link || item.url || item.guid?.rendered || '',
          museu: new URL(url).hostname.split('.')[0],
          fonte: 'IBRAM'
        });
      }
      if (results.length >= 5) break;
    } catch { continue; }
  }

  // 2. Fallback: busca na API pública do SIMUS/IBRAM via dados abertos
  if (results.length === 0) {
    try {
      const url = `https://dados.cultura.gov.br/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const packages = data?.result?.results || [];
        for (const pkg of packages.slice(0, 5)) {
          results.push({
            titulo: pkg.title || pkg.name || 'Sem título',
            descricao: (pkg.notes || '').substring(0, 250),
            criador: pkg.author || pkg.organization?.title || 'Ministério da Cultura',
            data: pkg.metadata_created ? new Date(pkg.metadata_created).getFullYear().toString() : '',
            link: `https://dados.cultura.gov.br/dataset/${pkg.name}`,
            museu: 'dados.cultura.gov.br',
            fonte: 'IBRAM'
          });
        }
      }
    } catch { /* silencioso */ }
  }

  return results.slice(0, 5);
}

// ============================================================
// Brasiliana Museus — Portal de acervos museológicos brasileiros
// ============================================================
async function searchBrasiliana(query: string): Promise<any[]> {
  const results: any[] = [];

  // 1. Brasiliana Museus via Tainacan (portal principal)
  try {
    const url = `https://brasiliana.museus.gov.br/wp-json/tainacan/v2/items?search=${encodeURIComponent(query)}&perpage=5`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Folksonomia-Digital/2.0' }
    });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      for (const item of items.slice(0, 5)) {
        const titulo = (item.title?.rendered || item.title || '').replace(/<[^>]*>/g, '').trim();
        if (!titulo) continue;
        results.push({
          titulo,
          descricao: (item.content?.rendered || '').replace(/<[^>]*>/g, '').substring(0, 250),
          criador: item.author_name || 'Brasiliana Museus',
          data: item.date ? new Date(item.date).getFullYear().toString() : '',
          link: item.link || '',
          fonte: 'Brasiliana Museus'
        });
      }
    }
  } catch { /* continua */ }

  // 2. Fallback: Biblioteca Nacional Digital (BNDigital) — acervo digitalizado
  if (results.length === 0) {
    try {
      const url = `https://bndigital.bn.gov.br/dspace/rest/items?search=${encodeURIComponent(query)}&limit=5&offset=0`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        for (const item of items.slice(0, 5)) {
          results.push({
            titulo: item.name || 'Sem título',
            descricao: (item.bitstreams?.[0]?.description || '').substring(0, 250),
            criador: 'Biblioteca Nacional',
            data: '',
            link: `https://bndigital.bn.gov.br/dspace/handle/${item.handle || ''}`,
            fonte: 'Brasiliana/BNDigital'
          });
        }
      }
    } catch { /* silencioso */ }
  }

  // 3. Segundo fallback: BNDigital via WordPress
  if (results.length === 0) {
    try {
      const url = `https://bndigital.bn.gov.br/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=5&_fields=id,title,excerpt,link,date`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data.slice(0, 5)) {
            results.push({
              titulo: (item.title?.rendered || 'Sem título').replace(/<[^>]*>/g, ''),
              descricao: (item.excerpt?.rendered || '').replace(/<[^>]*>/g, '').substring(0, 250),
              criador: 'Biblioteca Nacional',
              data: item.date ? new Date(item.date).getFullYear().toString() : '',
              link: item.link || '',
              fonte: 'Brasiliana/BNDigital'
            });
          }
        }
      }
    } catch { /* silencioso */ }
  }

  return results.slice(0, 5);
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
  dbTags: any[]
) {
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

    const [europeana, ibram, brasiliana] = await Promise.all([
      searchEuropeana(query),
      searchIBRAM(query),
      searchBrasiliana(query)
    ]);

    // Disparar eventos de ingestão
    if (europeana.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'europeana', payload: { source: 'europeana', query, items: europeana } });
    if (ibram.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'ibram', payload: { source: 'ibram', query, items: ibram } });
    if (brasiliana.length > 0) dispatchEvent({ tipo: 'INGESTAO', origem: 'bndigital', payload: { source: 'brasiliana', query, items: brasiliana } });

    // ================================================================
    // PASSO 5: Construir grafo de correlações com EXPLICAÇÕES
    // ================================================================
    const correlationGraph = buildCorrelationGraph(query, europeana, ibram, brasiliana);

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
    const brainText = await generateAIAnalysis(query, correlationGraph, tagCorrelation, previousCorrelations, dbTags);

    const totalExterno = europeana.length + ibram.length + brasiliana.length;
    const analise = brainText || 
      `A tag "${query}" existe no sistema com ${dbTags.length} registro(s). ` +
      `O motor encontrou ${europeana.length} correlação(ões) na Europeana, ${ibram.length} no IBRAM e ${brasiliana.length} na Brasiliana/BNDigital. ` +
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
            correlations: correlationGraph.correlations.filter((c: any) => c.source === 'Brasiliana' || c.source === 'Brasiliana/BNDigital')
          },
          ibram: { 
            total: ibram.length, 
            items: ibram,
            correlations: correlationGraph.correlations.filter((c: any) => c.source === 'IBRAM')
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
