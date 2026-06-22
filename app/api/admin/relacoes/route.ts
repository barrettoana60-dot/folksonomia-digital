import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const localRelationsFilePath = path.join(process.cwd(), 'scratch', 'local_relations.json');

function readLocalRelations(): any[] {
  try {
    const dir = path.dirname(localRelationsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(localRelationsFilePath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(localRelationsFilePath, 'utf-8'));
  } catch (err) {
    console.error('Error reading local relations:', err);
    return [];
  }
}

function writeLocalRelations(relations: any[]) {
  try {
    const dir = path.dirname(localRelationsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localRelationsFilePath, JSON.stringify(relations, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local relations:', err);
  }
}

// Helper to generate a SHA-256 hash (Semantic DNA)
function generateSemanticDna(payload: any): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('hex');
}

/**
 * GET /api/admin/relacoes
 * List all knowledge relations in the database or fallback.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('relacoes')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar relações do Supabase, usando local:', error.message);
      return NextResponse.json(readLocalRelations());
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.warn('Erro genérico no Supabase, usando local:', error);
    return NextResponse.json(readLocalRelations());
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

    // 2. Fetch sibling tags or external results, wrapping in try/catch to absorb missing table errors
    let siblings: any[] = [];
    try {
      const sibRes = await supabaseAdmin
        .from('tags')
        .select('tag_original, tag_normalizada, grupo_tematico')
        .eq('obra_id', nOrigem.obra_id || nDestino.obra_id)
        .limit(10);
      siblings = sibRes.data || [];
    } catch {
      // Ignorar erro se tabela tags não existe
    }

    let externalResults: any[] = [];
    try {
      const extRes = await supabaseAdmin
        .from('resultados_externos')
        .select('fonte, titulo, url, match_score')
        .or(`nucleo_id.eq.${origem_id},nucleo_id.eq.${destino_id}`)
        .limit(5);
      externalResults = extRes.data || [];
    } catch {
      // Ignorar erro se tabela resultados_externos não existe
    }

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
      familyTags: siblings.map(t => t.tag_original),
      externalApis: externalResults.map(e => ({
        fonte: e.fonte || 'Desconhecida',
        titulo: e.titulo || 'Sem título',
        url: e.url || '',
        matchScore: e.match_score || 0.8
      })),
      bibliographies: [
        `Acervo Federal da Instituição NUGEP - Registro de Células: ${nOrigem.conteudo_original} -> ${nDestino.conteudo_original}`,
        `IPHAN/CNFCP Diretrizes Técnicas de Catalogação Semântica Cruzada`
      ]
    };

    const hashDna = generateSemanticDna(dnaPayload);

    // 4. Save relation in Supabase, fallback to local file if table is missing
    let savedRelation: any = null;
    try {
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
        console.warn('Erro ao inserir relação no Supabase, usando local:', error.message);
      } else {
        savedRelation = data;
      }
    } catch (e: any) {
      console.warn('Exceção ao inserir relação no Supabase, usando local:', e.message);
    }

    if (!savedRelation) {
      // Local fallback representation
      savedRelation = {
        id: crypto.randomUUID(),
        origem_id,
        destino_id,
        tipo_relacao,
        peso: peso || 0.8,
        metodo: metodo || 'ml',
        fonte: fonte || 'curador',
        status: 'validada',
        hash_dna: hashDna,
        metadados: dnaPayload,
        criado_em: new Date().toISOString()
      };
      const list = readLocalRelations();
      list.push(savedRelation);
      writeLocalRelations(list);
    }

    // 5. Audit log in events, ignore if events table is missing
    try {
      await supabaseAdmin.from('eventos').insert({
        entidade_tipo: 'relacao',
        entidade_id: savedRelation.id,
        tipo_evento: 'tag_criada',
        resumo: `Nova ligação criada entre "${nOrigem.conteudo_original}" e "${nDestino.conteudo_original}" com DNA Semântico registrado.`,
        hash_evento: hashDna,
        payload: dnaPayload
      });
    } catch {
      // Ignorar falha de eventos
    }

    return NextResponse.json({ success: true, relation: savedRelation });
  } catch (error: any) {
    console.error('Erro ao criar relação:', error);
    return NextResponse.json({ error: 'Erro ao criar relação', details: error.message }, { status: 500 });
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

    // Check if relation is local or remote
    const localList = readLocalRelations();
    const isLocal = localList.some(r => r.id === id);

    if (isLocal) {
      const newList = localList.filter(r => r.id !== id);
      writeLocalRelations(newList);
      return NextResponse.json({ success: true });
    }

    // Try deleting from Supabase
    try {
      const { error } = await supabaseAdmin
        .from('relacoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Erro ao excluir no Supabase, tentando local:', error.message);
        const newList = localList.filter(r => r.id !== id);
        writeLocalRelations(newList);
      }
    } catch (e: any) {
      console.warn('Exceção ao excluir no Supabase, tentando local:', e.message);
      const newList = localList.filter(r => r.id !== id);
      writeLocalRelations(newList);
    }

    // Audit log
    try {
      await supabaseAdmin.from('eventos').insert({
        entidade_tipo: 'relacao',
        entidade_id: id,
        tipo_evento: 'validacao_rejeitado',
        resumo: `Ligação ID ${id} excluída do grafo semântico pelo curador.`
      });
    } catch {
      // Ignorar falha de eventos
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir relação', details: error.message }, { status: 500 });
  }
}

