import { NextRequest, NextResponse } from 'next/server';
import { runSemanticPipeline } from '@/lib/ml/pipeline';
import { normalizeText } from '@/lib/core/normalize';
import { supabaseAdmin } from '@/lib/supabase/client';
import { EuropeanaConnector } from '@/lib/connectors/europeana';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tag, obra_id, visitante_hash, visitante_nome } = body;

    if (!tag || !obra_id) {
      return NextResponse.json({ error: 'Tag e obra são obrigatórios.' }, { status: 400 });
    }

    const normalized = normalizeText(tag);

    // 1. Run the full semantic pipeline (embedding + ontology matching + scoring)
    const { cell, semantics } = await runSemanticPipeline(tag, obra_id, '');

    // 2. Persist the nucleus (Célula) in Supabase
    const { data: nucleo, error: nucleoError } = await supabaseAdmin
      .from('nucleos')
      .insert({
        tipo: 'tag',
        conteudo_original: tag,
        conteudo_normalizado: normalized,
        origem: 'interface_publica',
        assinatura_hash: cell.signature,
        embedding: cell.embedding,
        status_validacao: 'bruto',
        confianca: semantics.confidence,
        novidade: semantics.novelty,
        tensao: semantics.tension,
        ressonancia: semantics.resonance,
        obra_id,
        contexto: { encryptedPayload: cell.encryptedPayload },
        metadados: { concepts: semantics.concepts }
      })
      .select()
      .single();

    if (nucleoError) {
      console.error('Nucleus insert error:', nucleoError);
      return NextResponse.json({ error: 'Erro interno ao registrar a contribuição.' }, { status: 500 });
    }

    // 3. Persist the public tag record
    await supabaseAdmin.from('tags').insert({
      obra_id,
      nucleo_id: nucleo.id,
      tag_original: tag,
      tag_normalizada: normalized,
      visitante_hash: visitante_hash || null,
      visitante_nome: visitante_nome || null,
      grupo_tematico: semantics.concepts[0] || 'Outros',
      status: 'em análise'
    });

    // 4. Save ML suggestions (concepts as suggestions)
    if (semantics.concepts.length > 0) {
      const suggestions = semantics.concepts.map((concept: string) => ({
        nucleo_id: nucleo.id,
        tipo_sugestao: 'conceito_relacionado',
        sugestao: concept,
        score: semantics.confidence / 100,
        metodo: 'ontology_match + embedding_local',
        status: 'pendente'
      }));
      await supabaseAdmin.from('ml_sugestoes').insert(suggestions);
    }

    // 5. Record the ML execution log
    await supabaseAdmin.from('ml_execucoes').insert({
      nucleo_id: nucleo.id,
      tipo_execucao: 'pipeline_semantico_completo',
      resumo: `Tag "${tag}" processada. ${semantics.concepts.length} conceitos sugeridos.`,
      status: 'concluido',
      metricas: {
        confianca: semantics.confidence,
        novidade: semantics.novelty,
        tensao: semantics.tension,
        ressonancia: semantics.resonance,
        concepts: semantics.concepts
      }
    });

    // 6. Async: Search external sources (don't block the response)
    (async () => {
      try {
        const europeana = new EuropeanaConnector();
        const extResults = await europeana.searchExternalSource(normalized);
        if (extResults.length > 0) {
          await supabaseAdmin.from('resultados_externos').insert(
            extResults.map(r => ({
              nucleo_id: nucleo.id,
              fonte: r.source,
              external_id: r.external_id,
              titulo: r.title,
              descricao: r.description,
              url: r.url,
              rights: r.rights,
              provider: r.provider,
              match_score: r.match_score,
              tipo_relacao: r.relation_type,
              status: 'sugerido',
              dados: r.raw
            }))
          );
        }
      } catch (extErr) {
        console.warn('External source search failed silently:', extErr);
      }
    })();

    // 7. Register provenance event
    await supabaseAdmin.from('eventos').insert({
      entidade_tipo: 'nucleo',
      entidade_id: nucleo.id,
      tipo_evento: 'tag_criada',
      resumo: `Tag "${tag}" registrada pelo visitante e processada pelo motor semântico.`,
      hash_evento: cell.signature
    });

    // Return user-friendly response (no raw data)
    return NextResponse.json({
      success: true,
      message: 'Tag registrada com sucesso. Essa contribuição será analisada pela equipe e poderá ampliar as leituras da obra.',
      indicadores: {
        nivel_conexao: Math.round(semantics.confidence),
        nivel_novidade: Math.round(semantics.novelty),
        conceitos_sugeridos: semantics.concepts.length,
        fontes_conectadas: 1
      }
    });

  } catch (err) {
    console.error('API /api/ml/analisar-tag error:', err);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar a contribuição.' }, { status: 500 });
  }
}
