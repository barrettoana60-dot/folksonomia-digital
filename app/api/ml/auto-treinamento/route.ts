import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { IbramConnector } from '@/lib/connectors/ibram';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { expandQuery, enrichWithThesaurus, findTerm } from '@/lib/ml/thesaurus';
import { mlClient } from '@/lib/ml/ml-client';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';
import { buildCorrelationGraph } from '@/lib/ml/correlation-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================
// Métodos de Busca e Similaridade Matemática
// ============================================================
async function searchIBRAM(query: string, expandedTerms: string[] = []): Promise<any[]> {
  try {
    const connector = new IbramConnector();
    const mainResults = await connector.searchAllMuseums(query, 4);
    
    let expandedResults: any[] = [];
    if (expandedTerms.length > 0) {
      const expandedPromises = expandedTerms.slice(0, 2).map(term => 
        connector.searchAllMuseums(term, 2)
      );
      const expandedSettled = await Promise.allSettled(expandedPromises);
      for (const r of expandedSettled) {
        if (r.status === 'fulfilled') expandedResults.push(...r.value);
      }
    }
    const allResults = [...mainResults, ...expandedResults];
    const seen = new Set<string>();
    return allResults.filter(r => {
      const key = `${r.museum}-${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  } catch {
    return [];
  }
}

async function searchBrasiliana(query: string, expandedTerms: string[] = []): Promise<any[]> {
  try {
    const connector = new BrasilianaConnector();
    const mainResults = await connector.searchExternalSource(query);
    return mainResults.slice(0, 8);
  } catch {
    return [];
  }
}

async function searchBrasilianaTeoria(query: string): Promise<any[]> {
  try {
    const connector = new BrasilianaConnector();
    const results = await connector.searchTheoreticalText(query);
    return results.slice(0, 4);
  } catch {
    return [];
  }
}

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

// ============================================================
// POST Route - Chamada via Cron/Schedule para auto-reflexão
// ============================================================
export async function POST(req: NextRequest) {
  try {
    // 1. Buscar até 5 tags pendentes de aprendizado
    const { data: queue, error: queueError } = await supabaseAdmin
      .from('ml_training_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (queueError || !queue) {
      return NextResponse.json({ success: false, error: 'Erro ao acessar fila de treinamento' }, { status: 500 });
    }

    if (queue.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma tag pendente de treinamento.' });
    }

    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const results = [];

    // 2. Iterar sobre as tags para processamento vetorial real
    for (const item of queue) {
      const tag = item.tag;
      const tagNorm = tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();

      // Marcar provisoriamente como learning para evitar execução dupla
      await supabaseAdmin.from('ml_training_queue').update({ status: 'learning' }).eq('id', item.id);

      // A. Coletar evidências empíricas e teóricas das APIs oficiais
      const thesaurusExpansion = expandQuery(tag);
      const thesaurusContext = enrichWithThesaurus(tag);

      const [ibram, brasiliana, brasilianaTeoria] = await Promise.all([
        searchIBRAM(tag, thesaurusExpansion.expanded),
        searchBrasiliana(tag, thesaurusExpansion.expanded),
        searchBrasilianaTeoria(tag)
      ]);

      const { data: allTagsRaw } = await supabaseAdmin.from('tags').select('tag_original').limit(300);
      const dbTags = allTagsRaw || [];

      // B. Obter dados de ML local do FastAPI se disponível
      let mlOnline = false;
      let nerTokens = 0;
      let contextCategory = 'TEMA';

      try {
        mlOnline = await mlClient.isOnline();
        if (mlOnline) {
          const [ner, ctx] = await Promise.all([
            mlClient.predictNER(tag),
            mlClient.predictContext(tag)
          ]);
          if (ner && ner.tokens) nerTokens = ner.tokens.filter((t: any) => t.category !== 'O').length;
          if (ctx) contextCategory = ctx.best_category;
        }
      } catch (err) {
        console.warn(`[Auto-Treinamento] ML-Service offline para tag "${tag}"`);
      }

      // A. Pré-calcular similaridades heurísticas caso a IA local (Xenova) falhe ou como base de fallback
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
          const score = hybridSemanticSimilarity(tag, `${obra.titulo} ${obra.descricao || ''} ${obra.material || ''} ${obra.tecnica || ''}`);
          obrasComSimilaridade.push(score);
        }
        melhorSimilaridadeBD = Math.max(...obrasComSimilaridade);
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

      let certezaCalculada = 20; // Base de incerteza inicial
      let logicaMatematica: string[] = [];

      try {
        // C. Processamento de Embeddings Matemáticos (Transformers Local)
        const tagOutput = await extractor(tag, { pooling: 'mean', normalize: true });
        const tagVector = Array.from(tagOutput.data as Float32Array);

        // C1. Proximidade com o Tesauro CNFCP
        if (thesaurusContext) {
          const tesOutput = await extractor(thesaurusContext, { pooling: 'mean', normalize: true });
          const tesVector = Array.from(tesOutput.data as Float32Array);
          similaridadeTesauro = cosineSimilarity(tagVector, tesVector);
        }

        // C2. Proximidade com Literatura Acadêmica
        if (brasilianaTeoria.length > 0) {
          const similaridadesTeoria: number[] = [];
          for (const art of brasilianaTeoria) {
            const textToEmbed = `${art.titulo} ${art.descricao || ''}`;
            const artOutput = await extractor(textToEmbed.slice(0, 512), { pooling: 'mean', normalize: true });
            const artVector = Array.from(artOutput.data as Float32Array);
            similaridadesTeoria.push(cosineSimilarity(tagVector, artVector));
          }
          similaridadeTeoriaMedia = similaridadesTeoria.reduce((a, b) => a + b, 0) / similaridadesTeoria.length;
        }

        // C3. Proximidade com Obras Empíricas
        if (todasAsObras.length > 0) {
          obrasComSimilaridade.length = 0;
          for (const obra of todasAsObras) {
            const textToEmbed = `${obra.titulo} ${obra.descricao || ''} ${obra.material || ''} ${obra.tecnica || ''}`;
            const obraOutput = await extractor(textToEmbed.slice(0, 512), { pooling: 'mean', normalize: true });
            const obraVector = Array.from(obraOutput.data as Float32Array);
            obrasComSimilaridade.push(cosineSimilarity(tagVector, obraVector));
          }
          melhorSimilaridadeBD = Math.max(...obrasComSimilaridade);
        }

        if (similaridadeTesauro > 0) {
          const contri = similaridadeTesauro * 35;
          certezaCalculada += contri;
          logicaMatematica.push(`Tesauro: ${(similaridadeTesauro * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
        }
        if (similaridadeTeoriaMedia > 0) {
          const contri = similaridadeTeoriaMedia * 25;
          certezaCalculada += contri;
          logicaMatematica.push(`Teoria: ${(similaridadeTeoriaMedia * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
        }
        if (obrasComSimilaridade.length > 0) {
          const contri = Math.min(30, melhorSimilaridadeBD * 30);
          certezaCalculada += contri;
          logicaMatematica.push(`Empírico: ${(melhorSimilaridadeBD * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
        }

      } catch (err) {
        console.error("[Auto-Treinamento] Falha no extractor local, executando Fallback Heurístico:", err);
        certezaCalculada = 20; // reset
        logicaMatematica.push("Fallback Heurístico Semântico");

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
          const topSim = obrasComSimilaridade[0];
          const contri = Math.min(30, topSim * 30);
          certezaCalculada += contri;
          logicaMatematica.push(`HeurísticaEmpírico: ${(topSim * 100).toFixed(1)}% (+${contri.toFixed(1)})`);
        }
      }

      if (certezaCalculada > 99) certezaCalculada = 99;
      if (certezaCalculada < 10) certezaCalculada = 10;

      // Auto-ingestão na memória semântica se o termo estiver no tesauro e não catalogado na memória
      if (termoTesauro) {
        certezaCalculada = 95; // Validação definitiva automática
        try {
          const { data: memoExistente } = await supabaseAdmin
            .from('semantic_memory')
            .select('id')
            .eq('termo_normalizado', tagNorm)
            .maybeSingle();
          
          if (!memoExistente) {
            let embeddingVector: number[] = new Array(768).fill(0);
            try {
              const output = await extractor(tag, { pooling: 'mean', normalize: true });
              embeddingVector = Array.from(output.data as Float32Array);
            } catch {}

            await supabaseAdmin.from('semantic_memory').insert({
              termo: tag,
              termo_normalizado: tagNorm,
              significado: termoTesauro.na || '',
              categoria: tag === 'barroco' || termoTesauro.te?.includes('barroco') ? 'PERIODO' : 'TEMA',
              contextos: termoTesauro.ta || [],
              embedding: embeddingVector,
              confianca: 0.95,
              status: 'validado',
              total_ocorrencias: 1,
              modelo_versao: 'thesaurus_ingestion'
            });
          }
        } catch {}
      }
      certezaCalculada = Math.round(certezaCalculada);

      // Meta de excelência cognitiva: 95%. Entre 50-94%: aprendizado em curso.
      const resolvida = certezaCalculada >= 95;
      const emAprendizado = certezaCalculada >= 50 && certezaCalculada < 95;
      
      let definicaoConceito = '';
      if (termoTesauro && termoTesauro.na) {
        definicaoConceito = ` Definido no Tesauro: "${termoTesauro.na}".`;
      }
      
      const pensamentoInterno = `Refinamento vetorial completo para a tag "${tag}". Categoria inferida: ${contextCategory}.${definicaoConceito} Status: ${resolvida ? 'Excelência atingida (95%+)' : emAprendizado ? 'Em aprendizado (50-94%)' : 'Imparcial (< 50%)'}`;
      const conexoesVetor = logicaMatematica.join(' | ');

      // E. Persistir resultados de aprendizado
      if (resolvida) {
        await supabaseAdmin.from('tag_learning_history').insert({
          tag_normalizada: tagNorm,
          event_type: 'auto_training_success',
          event_details: { 
            certeza: certezaCalculada, 
            pensamento: pensamentoInterno,
            conexao: conexoesVetor,
            ner_tokens: nerTokens
          }
        });

        await supabaseAdmin.from('ml_training_queue').update({
          certeza_atual: certezaCalculada,
          ultimo_pensamento: pensamentoInterno,
          tentativas: item.tentativas + 1,
          status: 'resolved',
          updated_at: new Date().toISOString()
        }).eq('id', item.id);

        results.push({ tag, status: 'resolvido', certeza: certezaCalculada });
      } else {
        await supabaseAdmin.from('tag_learning_history').insert({
          tag_normalizada: tagNorm,
          event_type: 'auto_training_partial',
          event_details: { 
            certeza: certezaCalculada, 
            pensamento: pensamentoInterno,
            conexao: conexoesVetor
          }
        });

        await supabaseAdmin.from('ml_training_queue').update({
          certeza_atual: certezaCalculada,
          ultimo_pensamento: pensamentoInterno,
          tentativas: item.tentativas + 1,
          status: 'pending', // Devolve para pending
          updated_at: new Date().toISOString()
        }).eq('id', item.id);

        results.push({ tag, status: 'pendente', certeza: certezaCalculada, emAprendizado });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro no auto-treinamento:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
