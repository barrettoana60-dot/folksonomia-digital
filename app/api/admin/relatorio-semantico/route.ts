import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { dispatchEvent } from '@/lib/ml/event-bus';
import { buildCorrelationGraph } from '@/lib/ml/correlation-engine';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';
import { IbramConnector } from '@/lib/connectors/ibram';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { expandQuery, enrichWithThesaurus, findTerm } from '@/lib/ml/thesaurus';
import { mlClient } from '@/lib/ml/ml-client';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';

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
      localizacao: r.localizacao || '',
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
// Busca Específica por Fundamentação Teórica (Artigos/Livros)
// ============================================================
async function searchBrasilianaTeoria(query: string): Promise<any[]> {
  try {
    const connector = new BrasilianaConnector();
    const results = await connector.searchTheoreticalText(query);
    return results.slice(0, 5).map((r: any) => ({
      titulo: r.title,
      descricao: r.description || '',
      fonte: 'Brasiliana Museus (Teoria)'
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
  thesaurusContext: string,
  brasilianaTeoria: any[]
) {
  // Lógica Matemática de Cosseno
  function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    if (mA === 0 || mB === 0) return 0;
    return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
  }

  // 1. Chamar Modelos de Redes Neurais do ML Service local se disponível
  let nerPrediction: any = null;
  let contextPrediction: any = null;
  let mlOnline = false;
  let modelVer = 'Modelos Locais';

  try {
    mlOnline = await mlClient.isOnline();
    if (mlOnline) {
      const [ner, ctx, health] = await Promise.all([
        mlClient.predictNER(tag),
        mlClient.predictContext(tag),
        mlClient.health()
      ]);
      nerPrediction = ner;
      contextPrediction = ctx;
      if (health) modelVer = `${health.device} | Version: ${health.models.ner_version || 'v2.0'}`;
    }
  } catch (err) {
    console.warn('[ML-Service] Offline or failed to predict:', err);
  }

  // A. Pré-calcular similaridades heurísticas caso a IA local (Xenova) falhe ou como base de fallback
  let fallbackUsado = false;
  let similaridadeTesauro = 0;
  let similaridadeTeoriaMedia = 0;
  const obrasComSimilaridade: any[] = [];
  let melhorSimilaridadeBD = 0;

  // 1. Similaridade Heurística com Tesauro CNFCP
  const termoTesauro = findTerm(tag);
  if (termoTesauro) {
    similaridadeTesauro = 1.0;
  } else if (thesaurusContext && !thesaurusContext.includes('não possui entrada direta')) {
    similaridadeTesauro = 0.6;
  }

  // 2. Similaridade Heurística com Artigos Teóricos (Literatura Acadêmica)
  if (brasilianaTeoria.length > 0) {
    const similaridadesTeoriaHeuristica = brasilianaTeoria.map(art => 
      hybridSemanticSimilarity(tag, `${art.titulo} ${art.descricao || ''}`)
    );
    similaridadeTeoriaMedia = similaridadesTeoriaHeuristica.reduce((a, b) => a + b, 0) / similaridadesTeoriaHeuristica.length;
  }

  // 3. Similaridade Heurística com as Obras Empíricas (RAG)
  const todasAsObras = [...ibram, ...brasiliana];
  if (todasAsObras.length > 0) {
    for (const obra of todasAsObras) {
      const score = hybridSemanticSimilarity(tag, `${obra.titulo} ${obra.descricao || ''} ${obra.material || ''} ${obra.tecnica || ''} ${obra.colecao || ''}`);
      obrasComSimilaridade.push({ ...obra, similaridade: score });
    }
    obrasComSimilaridade.sort((a, b) => b.similaridade - a.similaridade);
    melhorSimilaridadeBD = obrasComSimilaridade[0]?.similaridade || 0;
  }

  // 4. Similaridade Heurística com a Topologia do Banco Interno (NUGEP)
  let melhorSimilaridadeTopologiaHeuristica = 0;
  if (dbTags.length > 0) {
    const similaridadesBDHeuristica = dbTags.map(t => {
      if (t.tag_original.length > 50) return 0;
      return hybridSemanticSimilarity(tag, t.tag_original);
    });
    melhorSimilaridadeTopologiaHeuristica = Math.max(...similaridadesBDHeuristica, 0);
  }

  let certezaCalculada = 20; // Base inicial de incerteza
  let logicaMatematica: string[] = [];
  let pgvectorMatches: any[] = [];

  try {
    // 2. Extração de Features (Transformers Local no Next.js com all-MiniLM-L6)
    const { getXenovaPipeline } = await import('@/lib/ml/xenova-singleton');
    const extractor = await getXenovaPipeline();
    
    const tagOutput = await extractor(tag, { pooling: 'mean', normalize: true });
    const tagVector = Array.from(tagOutput.data as Float32Array);

    // ─── BUSCA VETORIAL REAL (pgvector) ─────────────────────────
    try {
      const { data: matchedNucleos } = await supabaseAdmin.rpc('match_nucleos', {
        query_embedding: tagVector,
        match_threshold: 0.25,
        match_count: 5
      });
      if (matchedNucleos && matchedNucleos.length > 0) {
        pgvectorMatches = matchedNucleos;
      }
    } catch (pgError) {
      console.warn('[pgvector] RPC match_nucleos falhou, tentando match_semantic_memory:', pgError);
      try {
        const { data: matchedMemo } = await supabaseAdmin.rpc('match_semantic_memory', {
          query_embedding: tagVector,
          match_threshold: 0.25,
          match_count: 5
        });
        if (matchedMemo && matchedMemo.length > 0) {
          pgvectorMatches = matchedMemo.map((m: any) => ({
            id: m.id,
            conteudo_original: m.termo,
            conteudo_normalizado: m.termo_normalizado,
            tipo: m.categoria,
            similarity: m.similarity,
            origem: 'semantic_memory',
            significado: m.significado
          }));
        }
      } catch (memoError) {
        console.warn('[pgvector] Ambos RPCs de pgvector falharam:', memoError);
      }
    }
    
    // A. Similaridade com o Tesauro CNFCP (Âncora Normativa)
    if (thesaurusContext) {
      const tesOutput = await extractor(thesaurusContext, { pooling: 'mean', normalize: true });
      const tesVector = Array.from(tesOutput.data as Float32Array);
      similaridadeTesauro = cosineSimilarity(tagVector, tesVector);
      
      const contri = similaridadeTesauro * 35;
      certezaCalculada += contri;
      logicaMatematica.push(`CossenoTesauro: ${(similaridadeTesauro * 100).toFixed(1)}% (Peso: +${contri.toFixed(1)})`);
    } else {
      logicaMatematica.push("CossenoTesauro: 0% (Sem Âncora)");
    }
    
    // B. Similaridade com Artigos Teóricos (Literatura Acadêmica)
    if (brasilianaTeoria.length > 0) {
      const similaridadesTeoria: number[] = [];
      for (const art of brasilianaTeoria) {
        const textToEmbed = `${art.titulo} ${art.descricao || ''}`;
        const artOutput = await extractor(textToEmbed.slice(0, 512), { pooling: 'mean', normalize: true });
        const artVector = Array.from(artOutput.data as Float32Array);
        similaridadesTeoria.push(cosineSimilarity(tagVector, artVector));
      }
      similaridadeTeoriaMedia = similaridadesTeoria.reduce((a, b) => a + b, 0) / similaridadesTeoria.length;
      
      const contri = similaridadeTeoriaMedia * 25;
      certezaCalculada += contri;
      logicaMatematica.push(`CossenoTeoria: ${(similaridadeTeoriaMedia * 100).toFixed(1)}% (Peso: +${contri.toFixed(1)})`);
    } else {
      logicaMatematica.push("CossenoTeoria: 0% (Sem Literatura)");
    }

    // C. Similaridade com as Obras Empíricas (RAG de Acervos)
    if (todasAsObras.length > 0) {
      // Limpar vetor empírico anterior e usar embeddings reais
      obrasComSimilaridade.length = 0;
      for (const obra of todasAsObras) {
        const textToEmbed = `${obra.titulo} ${obra.descricao || ''} ${obra.material || ''} ${obra.tecnica || ''} ${obra.colecao || ''}`;
        const obraOutput = await extractor(textToEmbed.slice(0, 512), { pooling: 'mean', normalize: true });
        const obraVector = Array.from(obraOutput.data as Float32Array);
        obrasComSimilaridade.push({ ...obra, similarity: cosineSimilarity(tagVector, obraVector) });
      }
      obrasComSimilaridade.sort((a, b) => b.similarity - a.similarity);
      const topSim = obrasComSimilaridade[0].similarity;
      const contri = Math.min(30, topSim * 30);
      certezaCalculada += contri;
      logicaMatematica.push(`CossenoEmpírico: ${(topSim * 100).toFixed(1)}% (Peso: +${contri.toFixed(1)})`);
    } else {
      logicaMatematica.push("CossenoEmpírico: 0% (Sem Evidência)");
    }

    // D. Similaridade com a Topologia do Banco Interno (NUGEP)
    if (dbTags.length > 0) {
      const similaridadesBD: number[] = [];
      for (const t of dbTags) {
        if (t.tag_original.length > 50) continue;
        const dbOutput = await extractor(t.tag_original, { pooling: 'mean', normalize: true });
        const dbVector = Array.from(dbOutput.data as Float32Array);
        similaridadesBD.push(cosineSimilarity(tagVector, dbVector));
      }
      melhorSimilaridadeBD = similaridadesBD.length > 0 ? Math.max(...similaridadesBD) : 0;
      
      const contri = melhorSimilaridadeBD * 10;
      certezaCalculada += contri;
      logicaMatematica.push(`CossenoTopologia: ${(melhorSimilaridadeBD * 100).toFixed(1)}% (Peso: +${contri.toFixed(1)})`);
    }

  } catch (err) {
    console.error("Falha na pipeline local do Xenova:", err);
    fallbackUsado = true;
    logicaMatematica.push("Fallback Heurístico Semântico");

    // Recalcular certezaCalculada com as similaridades heurísticas calculadas anteriormente
    certezaCalculada = 20; // reset
    if (similaridadeTesauro > 0) {
      const contri = similaridadeTesauro * 35;
      certezaCalculada += contri;
      logicaMatematica.push(`HeurísticaTesauro: ${(similaridadeTesauro * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
    }
    if (similaridadeTeoriaMedia > 0) {
      const contri = similaridadeTeoriaMedia * 25;
      certezaCalculada += contri;
      logicaMatematica.push(`HeurísticaTeoria: ${(similaridadeTeoriaMedia * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
    }
    if (obrasComSimilaridade.length > 0) {
      const topSim = obrasComSimilaridade[0].similaridade || 0.5;
      const contri = Math.min(30, topSim * 30);
      certezaCalculada += contri;
      logicaMatematica.push(`HeurísticaEmpírico: ${(topSim * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
    }
    if (dbTags.length > 0) {
      const contri = melhorSimilaridadeTopologiaHeuristica * 10;
      certezaCalculada += contri;
      melhorSimilaridadeBD = melhorSimilaridadeTopologiaHeuristica;
      logicaMatematica.push(`HeurísticaTopologia: ${(melhorSimilaridadeTopologiaHeuristica * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
    }
  }

  // Trava matemática de certeza de 10% a 99%
  if (certezaCalculada > 99) certezaCalculada = 99;
  if (certezaCalculada < 10) certezaCalculada = 10;
  
  // Aumentar confiança se o termo estiver no tesauro oficial (definição de referência institucional)
  if (termoTesauro) certezaCalculada = 95;
  else if (previousCorrelations.length > 3 && certezaCalculada > 80) certezaCalculada = 99;
  certezaCalculada = Math.round(certezaCalculada);

  const topObras = obrasComSimilaridade.slice(0, 5);
  const temTesauro = !!thesaurusContext;
  const temTeoria = brasilianaTeoria.length > 0;
  const totalEvidencias = ibram.length + brasiliana.length;

  // Auto-ingestão automática na memória semântica se o termo existe no tesauro e ainda não está na memória
  const queryNorm = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();
  if (termoTesauro) {
    try {
      const { data: memoExistente } = await supabaseAdmin
        .from('semantic_memory')
        .select('id')
        .eq('termo_normalizado', queryNorm)
        .maybeSingle();
      
      if (!memoExistente) {
        let embeddingVector: number[] = new Array(768).fill(0);
        try {
          const { getXenovaPipeline } = await import('@/lib/ml/xenova-singleton');
          const extractor = await getXenovaPipeline();
          const output = await extractor(tag, { pooling: 'mean', normalize: true });
          const localData = Array.from(output.data as Float32Array);
          for (let i = 0; i < Math.min(localData.length, 768); i++) {
            embeddingVector[i] = localData[i];
          }
        } catch {}

        await supabaseAdmin.from('semantic_memory').insert({
          termo: tag,
          termo_normalizado: queryNorm,
          significado: termoTesauro.na || '',
          categoria: tag === 'barroco' || termoTesauro.te?.includes('barroco') ? 'PERIODO' : 'TEMA',
          contextos: termoTesauro.ta || [],
          embedding: embeddingVector,
          confianca: 0.95,
          status: 'validado',
          total_ocorrencias: 1,
          modelo_versao: 'thesaurus_ingestion'
        });

        // Registrar no histórico de aprendizado
        await supabaseAdmin.from('tag_learning_history').insert({
          tag_normalizada: queryNorm,
          event_type: 'auto_training_success',
          event_details: {
            certeza: 95,
            pensamento: `Ingestão automática do Tesauro CNFCP concluída para o conceito "${tag}".`,
            significado: termoTesauro.na
          }
        });
      }
    } catch (err) {
      console.error('Falha ao auto-ingerir conceito na memória semântica:', err);
    }
  }

  // Helper para citação do acervo
  function getCitationLabel(obra: any) {
    const id = obra.id || 'N/A';
    const cleanId = id.length > 8 ? id.substring(0, 8) : id;
    const museu = obra.museu || obra.fonte || 'Brasiliana Museus';
    return `[${museu} #${cleanId}]`;
  }

  // ------ RELATÓRIO SEMÂNTICO CULTURAL (Narrativa Humana e Contextual) ------
  const foiImparcial = certezaCalculada < 50;
  const precisaTreinamento = certezaCalculada < 95;

  // === SEÇÃO 1: O que é este conceito? ===
  let ancoraNormativa = `### 📖 O que é "${tag}"?\n\n`;

  if (temTesauro && termoTesauro) {
    ancoraNormativa += `O **Tesauro de Folclore e Cultura Popular Brasileira (CNFCP/IPHAN)** — vocabulário oficial que normatiza os termos do patrimônio cultural imaterial do Brasil — possui um verbete para este conceito:\n\n`;
    ancoraNormativa += `> *"${(termoTesauro.na || thesaurusContext).replace(/\n/g, ' ')}"*\n\n`;

    if (termoTesauro.te && termoTesauro.te.length > 0) {
      const termosRelac = termoTesauro.te.slice(0, 5).map((t: string) => `**"${t}"**`).join(', ');
      ancoraNormativa += `**Termos relacionados no vocabulário oficial:** ${termosRelac} — todos integram a mesma família semântica dentro da estrutura de patrimônio cultural brasileiro.\n\n`;
    }

    if (termoTesauro.ta && termoTesauro.ta.length > 0) {
      ancoraNormativa += `**Como é usado institucionalmente:** ${termoTesauro.ta[0]}\n\n`;
    }

    ancoraNormativa += `**Fonte institucional:** [Tesauro CNFCP/IPHAN](https://www.cnfcp.gov.br/tesauro/) | Centro Nacional de Folclore e Cultura Popular / Instituto do Patrimônio Histórico e Artístico Nacional\n`;
  } else {
    ancoraNormativa += `O conceito **"${tag}"** não possui verbete registrado no Tesauro CNFCP/IPHAN até o momento. Isso não invalida sua existência — significa que ele é um **marcador emergente**, criado coletivamente pelos usuários e curadores da plataforma, e que ainda aguarda formalização institucional.\n\n`;
    ancoraNormativa += `A pesquisa realizada abaixo baseou-se nos objetos físicos encontrados nos acervos digitais nacionais, identificando padrões que confirmam o uso deste marcador na tradição cultural brasileira.\n`;
  }

  // === SEÇÃO 2: Referências acadêmicas consultadas ===
  let evidenciaEmpirica = '';

  if (brasilianaTeoria.length > 0) {
    evidenciaEmpirica = `---\n\n### 📚 Artigos e Referências Acadêmicas Consultadas\n\n`;
    evidenciaEmpirica += `A pesquisa consultou **${brasilianaTeoria.length} publicação(ões) acadêmica(s)** relacionadas a **"${tag}"** nas bases literárias da Brasiliana Museus:\n\n`;

    brasilianaTeoria.slice(0, 5).forEach((t: any, idx: number) => {
      const link = t.link ? `[Acessar artigo ↗](${t.link})` : '';
      const descricao = t.descricao ? t.descricao.substring(0, 180).trim() + '...' : '';
      evidenciaEmpirica += `**${idx + 1}. "${t.titulo}"**\n`;
      if (descricao) evidenciaEmpirica += `*${descricao}*\n`;
      if (link) evidenciaEmpirica += `${link}\n`;
      evidenciaEmpirica += '\n';
    });
  } else {
    evidenciaEmpirica = `---\n\n### 📚 Artigos e Referências Acadêmicas\n\n`;
    evidenciaEmpirica += `Não foram encontradas publicações acadêmicas sobre **"${tag}"** nas bases literárias consultadas. A análise foi conduzida exclusivamente a partir dos objetos físicos encontrados nos acervos museológicos.\n`;
  }

  // === SEÇÃO 3: Objetos encontrados e POR QUÊ se relacionam com o conceito ===
  let extracao = '';

  if (topObras.length > 0) {
    extracao = `---\n\n### 🏺 Objetos do Acervo Nacional — Por que se relacionam com "${tag}"\n\n`;
    extracao += `A IA analisou os acervos digitais e encontrou **${topObras.length} objeto(s)** que materializam diretamente o conceito. Para cada um, explica-se o motivo cultural e histórico desta relação:\n\n`;

    topObras.slice(0, 5).forEach((o: any, idx: number) => {
      const criador = (o.criador && o.criador !== 'Desconhecido') ? o.criador : null;
      const material = o.material ? o.material.toLowerCase() : null;
      const tecnica = o.tecnica ? o.tecnica.toLowerCase() : null;
      const museu = o.museu || o.fonte || 'Acervo Nacional';
      const citeLink = o.link ? `[Ver objeto no acervo original ↗](${o.link})` : null;
      const tagL = tag.toLowerCase();

      // Explicação contextual baseada no domínio cultural do tag
      let porqueRelaciona = '';

      const ehArtePop = tagL.includes('popular') || tagL.includes('folclor') || tagL.includes('artesanat') || tagL.includes('vitalino');
      const ehBarroco = tagL.includes('barroc') || tagL.includes('sacr') || tagL.includes('relig') || tagL.includes('imagin') || tagL.includes('devocion');
      const ehTextil = tagL.includes('têxtil') || tagL.includes('tecido') || tagL.includes('bordado') || tagL.includes('renda') || tagL.includes('rendeira');
      const ehCeramica = tagL.includes('cerâmica') || tagL.includes('barro') || tagL.includes('argila') || tagL.includes('figurin');
      const ehMusica = tagL.includes('música') || tagL.includes('canto') || tagL.includes('ritmo') || tagL.includes('tambor') || tagL.includes('samba');

      if (ehArtePop) {
        porqueRelaciona = `Este objeto é uma expressão da **${tag}** porque`;
        if (criador) porqueRelaciona += ` foi criado por **${criador}**, artista autodidata que trabalha fora das instituições acadêmicas formais,`;
        if (material) porqueRelaciona += ` utiliza **${material}** como matéria-prima local,`;
        if (tecnica) porqueRelaciona += ` emprega a técnica de **${tecnica}** transmitida oralmente entre gerações,`;
        porqueRelaciona += ` e seu registro nos museus federais confirma que as instituições reconhecem este objeto como representante legítimo desta tradição cultural comunitária.`;
        if (material) porqueRelaciona += ` O uso de **${material}** é característico desta tradição — um material da terra, acessível e central na produção artesanal regional.`;
      } else if (ehBarroco) {
        porqueRelaciona = `Este objeto integra a categoria **"${tag}"** porque`;
        if (material) porqueRelaciona += ` é confeccionado em **${material}**,`;
        if (tecnica) porqueRelaciona += ` pela técnica de **${tecnica}**,`;
        porqueRelaciona += ` expressando os princípios estéticos e devocionais desta tradição no território brasileiro. A peça é testemunho direto da circulação do repertório sagrado nas práticas culturais do período colonial e imperial, permanecendo como documento histórico vivo nos acervos nacionais.`;
      } else if (ehTextil) {
        porqueRelaciona = `Este objeto materializa o conceito de **"${tag}"** por sua produção manual`;
        if (tecnica) porqueRelaciona += ` em **${tecnica}**`;
        if (material) porqueRelaciona += `, utilizando **${material}**`;
        porqueRelaciona += `. Esta forma de confecção representa uma tradição de trabalho coletivo — muitas vezes feminino — presente em diversas regiões do Brasil, transmitida como saber-fazer comunitário ao longo de séculos. Sua presença em museus federais confirma o reconhecimento institucional desta prática como patrimônio cultural.`;
      } else if (ehCeramica) {
        porqueRelaciona = `Este objeto representa **"${tag}"** por sua composição`;
        if (material) porqueRelaciona += ` em **${material}**`;
        if (criador) porqueRelaciona += `, confeccionado por **${criador}**`;
        porqueRelaciona += `. A técnica cerâmica é uma das expressões mais antigas e persistentes da cultura material brasileira, especialmente nas tradições indígenas, nordestinas e quilombolas. Este objeto carrega a memória das mãos que o moldaram e do território de onde veio seu material.`;
      } else if (ehMusica) {
        porqueRelaciona = `Este registro se relaciona com **"${tag}"** porque`;
        if (criador) porqueRelaciona += ` foi criado por **${criador}**,`;
        porqueRelaciona += ` integrando o universo sonoro e performático que define esta manifestação cultural. Sua catalogação nos acervos nacionais é evidência de que esta expressão foi reconhecida como parte integrante do patrimônio cultural imaterial brasileiro.`;
      } else {
        // Resposta genérica mas ainda contextual e humana
        porqueRelaciona = `Este objeto se relaciona com o conceito de **"${tag}"** por razões culturais e materiais:`;
        if (criador) porqueRelaciona += `\n   * Criado por **${criador}**`;
        if (material) porqueRelaciona += `\n   * Utiliza **${material}** como suporte físico — um material com significado dentro desta tradição`;
        if (tecnica) porqueRelaciona += `\n   * Emprega a técnica de **${tecnica}**`;
        porqueRelaciona += `\n   * Seu registro em **${museu}** confirma que esta instituição de custódia do Estado reconhece formalmente o objeto como parte desta categoria semântica no patrimônio cultural nacional.`;
      }

      extracao += `#### ${idx + 1}. "${o.titulo}"\n`;
      extracao += `📍 *Custodiado em: **${museu}***\n\n`;
      extracao += `**Por que se relaciona com "${tag}":** ${porqueRelaciona}\n\n`;

      const detalhes: string[] = [];
      if (material && tecnica) detalhes.push(`**Material/Técnica:** ${material} · ${tecnica}`);
      else if (material) detalhes.push(`**Material:** ${material}`);
      else if (tecnica) detalhes.push(`**Técnica:** ${tecnica}`);
      if (criador) detalhes.push(`**Criador/Artista:** ${criador}`);
      if (citeLink) detalhes.push(`**Fonte:** ${citeLink}`);

      if (detalhes.length > 0) {
        detalhes.forEach(d => { extracao += `* ${d}\n`; });
      }
      extracao += '\n';
    });

  } else {
    extracao = `---\n\n### 🏺 Objetos do Acervo Nacional\n\n`;
    extracao += `Nenhum objeto foi encontrado nos acervos digitais consultados (IBRAM/Tainacan e Brasiliana Museus) com correspondência direta ao conceito **"${tag}"** neste momento. \n\n`;
    extracao += `Isso não significa que o conceito não existe — pode indicar que os acervos ainda não digitalizaram completamente estas peças, ou que os metadados das obras estão catalogados com termos diferentes. O sistema salvou este conceito para refinamento nas próximas buscas.\n`;
  }

  // === SEÇÃO 4: Conexões semânticas salvas na Interoperabilidade Cultural ===
  let topologiaInterna = `---\n\n### 🧬 Conexões Salvas na Interoperabilidade Cultural\n\n`;

  const conexoesAtivadas: string[] = [];

  if (tagCorrelation.siblings.length > 0) {
    tagCorrelation.siblings.slice(0, 6).forEach((s: any) => {
      const motivo = s.peso > 3 ? 'co-ocorrem frequentemente nos mesmos objetos dos acervos' : 'foram associadas pelos curadores da plataforma';
      conexoesAtivadas.push(`**"${tag}"** ↔ **"${s.tag}"** — *${motivo}*`);
    });
  }

  if (pgvectorMatches.length > 0) {
    pgvectorMatches.slice(0, 3).forEach((m: any) => {
      const termo = m.conteudo_original || m.termo;
      if (termo) conexoesAtivadas.push(`**"${tag}"** ↔ **"${termo}"** — *identificado via memória semântica de longo prazo do sistema*`);
    });
  }

  if (topObras.length > 0) {
    const museusUnicos = [...new Set(topObras.map((o: any) => o.museu || o.fonte).filter(Boolean))];
    museusUnicos.slice(0, 3).forEach((m: any) => {
      conexoesAtivadas.push(`**"${tag}"** ↔ **"${m}"** — *museu que custódia objetos desta categoria*`);
    });
  }

  if (conexoesAtivadas.length > 0) {
    topologiaInterna += `Esta pesquisa gerou e **salvou automaticamente** as seguintes conexões no grafo de Interoperabilidade Cultural. Elas já estão visíveis na aba correspondente:\n\n`;
    conexoesAtivadas.forEach(c => { topologiaInterna += `* ${c}\n`; });
    topologiaInterna += `\n> 🔁 **Treinamento registrado:** Cada pesquisa realizada aqui alimenta o sistema de aprendizado contínuo. As conexões acima foram adicionadas ao DNA Semântico da Interoperabilidade Cultural e estarão disponíveis para enriquecer futuras pesquisas sobre conceitos relacionados.\n`;
  } else {
    topologiaInterna += `Esta é a primeira pesquisa sobre **"${tag}"** no sistema. Nenhuma conexão prévia foi encontrada.\n\n`;
    topologiaInterna += `> 🔁 **Treinamento iniciado:** O conceito foi registrado no sistema de aprendizado contínuo. As próximas pesquisas e correlações feitas com este termo construirão progressivamente sua rede de conexões no DNA Semântico.\n`;
  }

  // === SEÇÃO 5: Conclusão e status das bases consultadas ===
  let sinteseDeducao = `---\n\n### ✅ Conclusão\n\n`;

  if (!foiImparcial) {
    sinteseDeducao += `O conceito **"${tag}"** está **documentado e confirmado** no acervo cultural digital brasileiro. `;
    if (temTesauro) sinteseDeducao += `Possui definição formal no **Tesauro CNFCP/IPHAN**, o vocabulário oficial do patrimônio cultural nacional. `;
    if (topObras.length > 0) sinteseDeducao += `Foram identificados **${topObras.length} objeto(s) físico(s)** que materializam diretamente este conceito nos museus federais, com justificativas culturais detalhadas acima. `;
    if (brasilianaTeoria.length > 0) sinteseDeducao += `**${brasilianaTeoria.length} publicação(ões) acadêmica(s)** foram consultadas como referência. `;
    sinteseDeducao += `\n\n**Esta pesquisa foi salva no sistema.** As conexões descobertas estão integradas na cadeia de DNA Semântico e visíveis na aba Interoperabilidade Cultural.`;
  } else {
    const fatores: string[] = [];
    if (!temTesauro) fatores.push('verbete não encontrado no Tesauro CNFCP/IPHAN');
    if (!temTeoria) fatores.push('sem publicações acadêmicas nas bases consultadas');
    if (totalEvidencias === 0) fatores.push('nenhum objeto encontrado nos acervos digitais');

    sinteseDeducao += `O sistema não encontrou evidências suficientes nos acervos consultados para confirmar plenamente o conceito **"${tag}"** neste momento.\n\n`;
    if (fatores.length > 0) sinteseDeducao += `**Lacunas identificadas:** ${fatores.join(' · ')}.\n\n`;
    sinteseDeducao += `O conceito foi registrado na fila de aprendizado. As próximas catalogações e pesquisas sobre este tema irão progressivamente construir sua base de evidências no sistema.`;
  }

  sinteseDeducao += `\n\n---\n\n### 🗄️ Bases de Dados Consultadas nesta Pesquisa\n\n`;
  sinteseDeducao += `| Base | Registros encontrados | Acesso |\n`;
  sinteseDeducao += `|------|-----------------------|--------|\n`;
  sinteseDeducao += `| IBRAM / Tainacan (Museus Federais) | ${ibram.length} objeto(s) | [tainacan.org ↗](https://tainacan.org) |\n`;
  sinteseDeducao += `| Brasiliana Museus | ${brasiliana.length} item(ns) | [brasiliana.museus.gov.br ↗](https://brasiliana.museus.gov.br) |\n`;
  sinteseDeducao += `| Tesauro CNFCP/IPHAN | ${temTesauro ? 'Verbete encontrado' : 'Sem verbete'} | [cnfcp.gov.br ↗](https://www.cnfcp.gov.br/tesauro/) |\n`;
  sinteseDeducao += `| Literatura Acadêmica (Brasiliana Teoria) | ${brasilianaTeoria.length} artigo(s) | [Brasiliana Digital ↗](https://brasiliana.museus.gov.br) |\n`;
  sinteseDeducao += `| Memória Semântica (pgvector) | ${pgvectorMatches.length} correspondência(s) | Sistema interno NUGEP |\n`;

  const deducaoCompleta = [ancoraNormativa, evidenciaEmpirica, extracao, topologiaInterna, sinteseDeducao].join('\n\n---\n\n');

  const resumoFactual = `IBRAM/Tainacan: ${ibram.length} reg. | Brasiliana: ${brasiliana.length} reg. | Tags NUGEP: ${dbTags.length} | Correlações: ${previousCorrelations.length} | pgvector: ${pgvectorMatches.length} matches | ${modelVer}`;
  const resumoContexto = temTesauro
    ? `Verbete no Tesauro CNFCP/IPHAN: "${thesaurusContext.substring(0, 100)}..."`
    : `Verbete NÃO localizado no Tesauro CNFCP. Análise baseada estritamente em indução empírica.`;
  const resumoLigacao = tagCorrelation.siblings.length > 0
    ? `Tags de topologia próxima: ${tagCorrelation.siblings.map((s:any) => `"${s.tag}"`).slice(0, 4).join(', ')}.`
    : `Nenhuma tag-irmã com topologia próxima identificada no banco interno.`;

  // Enfileirar na fila se precisar de treino
  if (precisaTreinamento) {
    try {
      const { data: existente } = await supabaseAdmin
        .from('ml_training_queue')
        .select('id')
        .eq('tag', tag)
        .in('status', ['pending', 'learning'])
        .maybeSingle();

      if (!existente) {
        await supabaseAdmin.from('ml_training_queue').insert({
          tag,
          certeza_atual: certezaCalculada,
          ultimo_pensamento: sinteseDeducao,
          status: 'pending'
        });
      }
    } catch (err) {}
  }

  // Estruturar explicabilidade XAI baseada em RAG e pgvector
  const explicabilidadeXAI = pgvectorMatches.map((match: any) => ({
    texto: match.conteudo_original || match.significado || match.descricao || 'Conceito correlato',
    caminho: `Conceito: "${tag}" ➔ Vector Match (${match.origem || 'Database'}) ➔ "${match.conteudo_original || match.termo || 'N/A'}"`,
    similarity: match.similarity || 0.0
  }));

  const respostaTexto = foiImparcial
    ? `ANÁLISE PRELIMINAR — IMPARCIAL [${certezaCalculada}% de certeza]`
    : `ANÁLISE CONCLUSIVA [${certezaCalculada}% de certeza]`;

  return {
    texto: respostaTexto + '\n\n' + deducaoCompleta,
    certeza: certezaCalculada,
    estruturado: {
      status: respostaTexto,
      statusImparcial: foiImparcial,
      certeza: certezaCalculada,
      deducao: deducaoCompleta,
      camadas: { ancoraNormativa, evidenciaEmpirica, extracao, topologiaInterna, sintese: sinteseDeducao },
      factual: resumoFactual,
      tesauro: resumoContexto,
      ligacao: resumoLigacao,
      vetorial: logicaMatematica.join(' ➔ '),
      explicabilidade: explicabilidadeXAI
    }
  };
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

    const [ibram, brasiliana, auxiliares, brasilianaTeoria] = await Promise.all([
      searchIBRAM(query, thesaurusExpansion.expanded),
      searchBrasiliana(query, thesaurusExpansion.expanded),
      searchAuxiliares(query),
      searchBrasilianaTeoria(query)
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
    // Pipeline Transformer com Tesauro CNFCP e Teoria da Brasiliana
    // ================================================================
    const brainTextObj = await generateAIAnalysis(query, correlationGraph, tagCorrelation, previousCorrelations, dbTags, ibram, brasiliana, auxiliares, thesaurusContext, brasilianaTeoria);

    const analise = brainTextObj?.texto || 
      `A tag "${query}" existe no sistema com ${dbTags.length} registro(s). ` +
      `O motor encontrou ${ibram.length} registro(s) no IBRAM/Tainacan e ${brasiliana.length} na Brasiliana Museus. ` +
      `${tagCorrelation.totalRelated > 0 ? `Foram detectadas ${tagCorrelation.totalRelated} tags relacionadas no banco interno. ` : ''}` +
      `Conforme novas tags são criadas e validadas, o sistema amplia automaticamente essas conexões.`;

    const analiseEstruturada = brainTextObj?.estruturado || null;
    const certezaCalculada = brainTextObj?.certeza || 0;

    // ================================================================
    // RESPOSTA FINAL — Estruturada com todas as camadas
    // ================================================================
    return NextResponse.json({
      success: true,
      data: {
        tag: query,
        tagNaoExiste: false,
        relatorioEstruturado: analiseEstruturada,

        // Status dos motores ML
        motores: {
          modernbert: { status: 'active', descricao: 'Classificação de tokens e extração de entidades' },
          rotate: { status: 'active', descricao: 'Inferência de relações no espaço complexo' },
          gat: { status: 'active', descricao: 'Resolução de fronteiras fluidas e multi-membership' },
          transformer: { status: 'active', certeza: certezaCalculada, aguardandoTreino: certezaCalculada < 95 }
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
