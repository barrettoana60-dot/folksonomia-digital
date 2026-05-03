import { NextRequest, NextResponse } from 'next/server';
import { runSemanticPipeline } from '@/lib/ml/pipeline';
import { normalizeText } from '@/lib/core/normalize';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Aumentar tempo de execução no Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tag, obra_id, visitante_hash, visitante_nome } = body;

    if (!tag || !obra_id) {
      return NextResponse.json({ error: 'Tag e obra são obrigatórios.' }, { status: 400 });
    }

    const normalized = normalizeText(tag);

    // 1. Run the semantic pipeline
    // O pipeline já lida com o ID de teste internamente ou falha graciosamente
    const result = await runSemanticPipeline(tag, obra_id, '');
    const { dna, semantics } = result;

    // 2. Persist the nucleus (Célula) in Supabase
    // Handle demo ID to avoid foreign key violations
    const isTestId = (obra_id === 'picasso-test' || !obra_id);
    const finalObraId = isTestId ? null : obra_id;

    // Tentar inserir o núcleo semântico
    const nucleoPayload: any = {
      tipo: 'tag',
      conteudo_original: tag,
      conteudo_normalizado: dna.normalized,
      origem: 'interface_publica',
      assinatura_hash: dna.signature,
      embedding: dna.embedding,
      status_validacao: 'bruto',
      confianca: semantics.indicators.confidence,
      novidade: semantics.indicators.novelty,
      tensao: semantics.indicators.tension,
      ressonancia: semantics.indicators.resonance,
      contexto: { themeGroup: semantics.themeGroup },
      metadados: { concepts: semantics.concepts, ontologies: semantics.ontologies }
    };

    // Só incluir obra_id se não for null (evita FK constraint)
    if (finalObraId) {
      nucleoPayload.obra_id = finalObraId;
    }

    const { data: nucleo, error: nucleoError } = await supabaseAdmin
      .from('nucleos')
      .insert(nucleoPayload)
      .select()
      .single();

    if (nucleoError) {
      console.error('Nucleus insert error:', nucleoError);
      // Se falhou por FK, tentar sem obra_id
      if (nucleoError.message.includes('foreign key') || nucleoError.message.includes('violates')) {
        delete nucleoPayload.obra_id;
        const { data: nucleoRetry, error: retryError } = await supabaseAdmin
          .from('nucleos')
          .insert(nucleoPayload)
          .select()
          .single();
        if (retryError) {
          return NextResponse.json({ 
            error: `Erro no banco de dados: ${retryError.message}` 
          }, { status: 500 });
        }
        // Usar o resultado do retry
        Object.assign(nucleo || {}, nucleoRetry);
      } else {
        return NextResponse.json({ 
          error: `Erro no banco de dados: ${nucleoError.message}. Certifique-se de que o SQL de configuração foi executado no Supabase.` 
        }, { status: 500 });
      }
    }

    const nucleoId = nucleo?.id;
    if (!nucleoId) {
      return NextResponse.json({ error: 'Falha ao criar núcleo semântico.' }, { status: 500 });
    }

    // 3. Persist public tag — SEMPRE salva, com ou sem obra_id
    const tagPayload: any = {
      nucleo_id: nucleoId,
      tag_original: tag,
      tag_normalizada: dna.normalized,
      grupo_tematico: semantics.themeGroup || 'Outros',
      status: 'em análise'
    };

    // Só incluir obra_id se existir e não for teste
    if (finalObraId) {
      tagPayload.obra_id = finalObraId;
    }

    const { error: tagError } = await supabaseAdmin.from('tags').insert(tagPayload);
    if (tagError) {
      console.error('Tag insert error:', tagError);
      // Se falhou por FK, tentar sem obra_id
      if (tagError.message.includes('foreign key') || tagError.message.includes('violates')) {
        delete tagPayload.obra_id;
        const { error: tagRetry } = await supabaseAdmin.from('tags').insert(tagPayload);
        if (tagRetry) console.error('Tag retry also failed:', tagRetry);
      }
    }

    // 4. Sugestões ML
    if (semantics.concepts.length > 0) {
      const suggestions = semantics.concepts.map((concept: string) => ({
        nucleo_id: nucleoId,
        tipo_sugestao: 'conceito_relacionado',
        sugestao: concept,
        score: semantics.indicators.confidence / 100,
        metodo: 'ontology_match + embedding_local',
        status: 'pendente'
      }));
      await supabaseAdmin.from('ml_sugestoes').insert(suggestions).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Tag registrada com sucesso.',
      indicadores: {
        nivel_conexao: Math.round(semantics.indicators.confidence),
        nivel_novidade: Math.round(semantics.indicators.novelty),
        conceitos_sugeridos: semantics.concepts.length,
        fontes_conectadas: 1
      }
    });

  } catch (err: any) {
    console.error('API /api/ml/analisar-tag error:', err);
    return NextResponse.json({ 
      error: `Erro no processamento IA: ${err.message || 'Erro desconhecido'}. Verifique as variáveis de ambiente (SERVICE_ROLE_KEY) no Vercel.` 
    }, { status: 500 });
  }
}
