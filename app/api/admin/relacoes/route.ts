import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Helper to generate a SHA-256 hash (Semantic DNA)
function generateSemanticDna(payload: any): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('hex');
}

/**
 * GET /api/admin/relacoes
 * List all knowledge relations in the database.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('relacoes')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar relações' }, { status: 500 });
  }
}

/**
 * POST /api/admin/relacoes
 * Create a new connection between two semantic nuclei and generate its unique Semantic DNA.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { origem_id, destino_id, tipo_relacao, peso, metodo, fonte } = body;

    if (!origem_id || !destino_id || !tipo_relacao) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // 1. Fetch details of both nuclei to compile the DNA payload
    const [origemRes, destinoRes] = await Promise.all([
      supabaseAdmin.from('nucleos').select('*').eq('id', origem_id).maybeSingle(),
      supabaseAdmin.from('nucleos').select('*').eq('id', destino_id).maybeSingle()
    ]);

    if (!origemRes.data || !destinoRes.data) {
      return NextResponse.json({ error: 'Um ou ambos os núcleos não existem' }, { status: 404 });
    }

    const nOrigem = origemRes.data;
    const nDestino = destinoRes.data;

    // 2. Fetch sibling tags of the same family or category matching external APIs
    const { data: siblings } = await supabaseAdmin
      .from('tags')
      .select('tag_original, tag_normalizada, grupo_tematico')
      .eq('obra_id', nOrigem.obra_id || nDestino.obra_id)
      .limit(10);

    const { data: externalResults } = await supabaseAdmin
      .from('resultados_externos')
      .select('fonte, titulo, url, match_score')
      .or(`nucleo_id.eq.${origem_id},nucleo_id.eq.${destino_id}`)
      .limit(5);

    // 3. Assemble Semantic DNA parameters
    const dnaPayload = {
      timestamp: new Date().toISOString(),
      origem: {
        id: nOrigem.id,
        conteudo: nOrigem.conteudo_original,
        tipo: nOrigem.tipo,
        status: nOrigem.status_validacao
      },
      destino: {
        id: nDestino.id,
        conteudo: nDestino.conteudo_original,
        tipo: nDestino.tipo,
        status: nDestino.status_validacao
      },
      relacao: {
        tipo: tipo_relacao,
        peso: peso || 0.8
      },
      familyTags: (siblings || []).map(t => t.tag_original),
      externalApis: (externalResults || []).map(e => ({
        fonte: e.fonte,
        titulo: e.titulo,
        url: e.url,
        matchScore: e.match_score
      })),
      bibliographies: [
        `Acervo Federal da Instituição NUGEP - Registro de Células: ${nOrigem.conteudo_original} -> ${nDestino.conteudo_original}`,
        `IPHAN/CNFCP Diretrizes Técnicas de Catalogação Semântica Cruzada`
      ]
    };

    const hashDna = generateSemanticDna(dnaPayload);

    // 4. Save relation with hash_dna and metadados in Supabase
    const { data, error } = await supabaseAdmin
      .from('relacoes')
      .insert({
        origem_id,
        destino_id,
        tipo_relacao,
        peso: peso || 0.8,
        metodo: metodo || 'ml',
        fonte: fonte || 'curador',
        status: 'validada',
        hash_dna: hashDna,
        metadados: dnaPayload
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Audit log in events (provenance)
    await supabaseAdmin.from('eventos').insert({
      entidade_tipo: 'relacao',
      entidade_id: data.id,
      tipo_evento: 'tag_criada',
      resumo: `Nova ligação criada entre "${nOrigem.conteudo_original}" e "${nDestino.conteudo_original}" com DNA Semântico registrado.`,
      hash_evento: hashDna,
      payload: dnaPayload
    });

    return NextResponse.json({ success: true, relation: data });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar relação' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/relacoes
 * Remove a semantic relation and log the audited trace.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Get details of the relation before deletion for audit logging
    const { data: relation } = await supabaseAdmin
      .from('relacoes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!relation) {
      return NextResponse.json({ error: 'Relação não encontrada' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('relacoes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabaseAdmin.from('eventos').insert({
      entidade_tipo: 'relacao',
      entidade_id: id,
      tipo_evento: 'validacao_rejeitado',
      resumo: `Ligação ID ${id} excluída da teia semântica pelo curador.`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir relação' }, { status: 500 });
  }
}
