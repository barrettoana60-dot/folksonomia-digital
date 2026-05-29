import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { IbramConnector } from '@/lib/connectors/ibram';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { expandQuery, enrichWithThesaurus } from '@/lib/ml/thesaurus';
import { mlClient } from '@/lib/ml/ml-client';
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

      // C. Processamento de Embeddings Matemáticos (Transformers Local)
      const tagOutput = await extractor(tag, { pooling: 'mean', normalize: true });
      const tagVector = Array.from(tagOutput.data as Float32Array);

      let similaridadeTesauro = 0;
      let similaridadeTeoriaMedia = 0;
      const obrasComSimilaridade: any[] = [];
      let melhorSimilaridadeBD = 0;

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
      const todasAsObras = [...ibram, ...brasiliana];
      if (todasAsObras.length > 0) {
        for (const obra of todasAsObras) {
          const textToEmbed = `${obra.titulo} ${obra.descricao || ''} ${obra.material || ''} ${obra.tecnica || ''}`;
          const obraOutput = await extractor(textToEmbed.slice(0, 512), { pooling: 'mean', normalize: true });
          const obraVector = Array.from(obraOutput.data as Float32Array);
          obrasComSimilaridade.push(cosineSimilarity(tagVector, obraVector));
        }
        melhorSimilaridadeBD = Math.max(...obrasComSimilaridade);
      }

      // D. Cálculo da Certeza Cognitiva Real (IA Pura)
      let certezaCalculada = 20; // Base de incerteza inicial
      let logicaMatematica: string[] = [];

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

      if (certezaCalculada > 99) certezaCalculada = 99;
      if (certezaCalculada < 10) certezaCalculada = 10;
      certezaCalculada = Math.round(certezaCalculada);

      const resolvida = certezaCalculada >= 80;
      const pensamentoInterno = `Refinamento vetorial latente completo. Tag "${tag}". Similaridades computadas de forma matemática exata contra bases oficiais. Categoria inferida local: ${contextCategory}.`;
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

        results.push({ tag, status: 'pendente', certeza: certezaCalculada });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro no auto-treinamento:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
