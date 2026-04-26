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
    // Handle demo ID to avoid foreign key violations if the record doesn't exist
    const finalObraId = (obra_id === 'picasso-test' || !obra_id) ? null : obra_id;

    // Tentar inserir o núcleo semântico
    const { data: nucleo, error: nucleoError } = await supabaseAdmin
      .from('nucleos')
      .insert({
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
        obra_id: finalObraId,
        contexto: { themeGroup: semantics.themeGroup },
        metadados: { concepts: semantics.concepts, ontologies: semantics.ontologies }
      })
      .select()
      .single();

    if (nucleoError) {
      console.error('Nucleus insert error:', nucleoError);
      return NextResponse.json({ 
        error: `Erro no banco de dados: ${nucleoError.message}. Certifique-se de que o SQL de configuração foi executado no Supabase.` 
      }, { status: 500 });
    }

    // 3. Persist public tag and suggestions in parallel for speed
    const inserts = [
      supabaseAdmin.from('tags').insert({
        obra_id: finalObraId,
        nucleo_id: nucleo.id,
        tag_original: tag,
        tag_normalizada: dna.normalized,
        visitante_hash: visitante_hash || null,
        visitante_nome: visitante_nome || null,
        grupo_tematico: semantics.themeGroup || 'Outros',
        status: 'em análise'
      })
    ];

    if (semantics.concepts.length > 0) {
      const suggestions = semantics.concepts.map((concept: string) => ({
        nucleo_id: nucleo.id,
        tipo_sugestao: 'conceito_relacionado',
        sugestao: concept,
        score: semantics.indicators.confidence / 100,
        metodo: 'ontology_match + embedding_local',
        status: 'pendente'
      }));
      inserts.push(supabaseAdmin.from('ml_sugestoes').insert(suggestions));
    }

    // Aguardar inserções secundárias sem travar a resposta principal se possível
    // Mas para garantir consistência agora, vamos aguardar
    await Promise.all(inserts);

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
