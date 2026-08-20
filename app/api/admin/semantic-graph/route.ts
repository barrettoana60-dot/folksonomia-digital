import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { generateDeterministicHash, runSpreadingActivation } from '@/lib/ml/graph-math';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison, detectTagFamily } from '@/lib/ml/tag-correlator';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { findTerm } from '@/lib/ml/thesaurus';

export const dynamic = 'force-dynamic';

// ─── Inferência de Eixo Cultural ────────────────────────────────────────────
function inferEixo(label: string): string {
  const l = label.toLowerCase();
  if (/\b(boi|festa|junin|bumba|reis|carnaval|maracatu|frevo|bloco|congada|reisado|marujada)\b/.test(l)) return 'FESTA';
  if (/\b(musica|dança|samba|forró|capoeira|baião|xaxado|coco|jongo|maculelê|toré|catira)\b/.test(l)) return 'MUSICA';
  if (/\b(candomblé|umbanda|terreiro|orixá|reza|benzedura|pajelança|jurema|santo|fé)\b/.test(l)) return 'CRENCAS';
  if (/\b(artesanato|cerâmica|renda|tecido|madeira|barro|ofício|bordado|escultura|carranca|vitalino)\b/.test(l)) return 'SABERES';
  if (/\b(patrimônio|registro|iphan|museu|acervo|tombamento|dossiê|unesco)\b/.test(l)) return 'PATRIMONIO';
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  if (profile.axes.length > 0) {
    const m: Record<string, string> = {
      FESTAS_CELEBRACOES: 'FESTA',
      MUSICA_DANCA_PERFORMANCE: 'MUSICA',
      SABERES_OFICIOS_MATERIAIS: 'SABERES',
      CRENCAS_RITOS: 'CRENCAS',
      TRADICAO_ORAL_COSMOLOGIAS: 'PATRIMONIO',
    };
    return m[profile.axes[0]] || 'SABERES';
  }
  return 'SABERES';
}

const EIXO_COLORS: Record<string, string> = {
  NUCLEO: '#E8490A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  SABERES: '#1A6B3A',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
};

const FAMILIA_MAP: Record<string, string> = {
  FESTA: 'festa.popular',
  MUSICA: 'musica.expressao',
  SABERES: 'saberes.oficios',
  CRENCAS: 'crencas.religiosidade',
  PATRIMONIO: 'patrimonio.institucional',
  NUCLEO: 'sistema.nucleo',
};

// ─── GET: Carregar estado completo da rede viva ─────────────────────────────
export async function GET() {
  try {
    // 1. Buscar todas as tags dos usuários
    const { data: tagsDB } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200);

    const tags = tagsDB || [];

    // 2. Buscar memória semântica aprendida
    const { data: memoriaDB } = await supabaseAdmin
      .from('semantic_memory')
      .select('termo, categoria, confianca, contextos')
      .eq('status', 'validado')
      .order('total_ocorrencias', { ascending: false })
      .limit(50);

    // 3. Buscar correlações aprendidas
    const { data: corrDB } = await supabaseAdmin
      .from('semantic_correlations')
      .select('tag_normalizada, external_title, correlation_score, layer')
      .order('correlation_score', { ascending: false })
      .limit(100);

    // 4. Buscar histórico de aprendizado para contexto
    const { data: historyDB } = await supabaseAdmin
      .from('tag_learning_history')
      .select('tag_normalizada, event_type, event_details, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    // ─── Nós Base do Grafo ───────────────────────────────────────────────
    const baseNodes = [
      {
        id: 'core', label: 'Núcleo Folksonômico', x: 400, y: 215, size: 26, fill: '#E8490A',
        eixo: 'NUCLEO', desc: 'Centralizador semântico do acervo. Indexa e trafega informações de todas as manifestações culturais do Brasil.',
        type: 'Núcleo do Acervo Semântico', hash: 'SHA3:c8ed9901a72f3b01',
        familia: 'sistema.nucleo.folksonomico', regiao: 'Nacional',
        acervos: ['IBRAM', 'Brasiliana', 'IPHAN', 'Mapas da Cultura', 'SALIC'],
        linksReais: [{ label: 'IBRAM — Museus Federais', url: 'https://www.gov.br/museus/pt-br' }],
        activation: 1.0, isFromDB: false,
      },
    ];

    const baseEdges: any[] = [];

    // ─── Construir nós das tags reais dos usuários ───────────────────────
    const seen = new Set<string>();
    const tagNodes: any[] = [];

    for (const tag of tags) {
      const norm = normalizeForComparison(tag.tag_original || '');
      if (!norm || seen.has(norm) || norm.length < 2) continue;
      seen.add(norm);

      const cleanId = norm.replace(/\s+/g, '_').substring(0, 40);
      if (cleanId === 'core') continue;

      const eixo = inferEixo(tag.tag_original || '');
      const fill = EIXO_COLORS[eixo] || '#888';
      const familia = `${FAMILIA_MAP[eixo] || 'saberes.manifestacao'}.${cleanId}`;

      const thesaurusTerm = findTerm(tag.tag_original || '');
      const desc = thesaurusTerm?.na
        ? thesaurusTerm.na
        : `Tag criada pelos visitantes do acervo. Manifestação correlacionada à família ${eixo.toLowerCase()}.`;

      const hash = generateDeterministicHash({ tag: tag.tag_original, eixo, id: tag.id });

      tagNodes.push({
        id: cleanId,
        label: tag.tag_original,
        x: 400 + Math.cos((tagNodes.length / Math.max(tags.length, 1)) * Math.PI * 2) * (130 + (tagNodes.length % 3) * 55),
        y: 215 + Math.sin((tagNodes.length / Math.max(tags.length, 1)) * Math.PI * 2) * (130 + (tagNodes.length % 3) * 55),
        size: 12 + Math.min(4, Math.floor(tagNodes.length / 10)),
        fill,
        eixo,
        familia,
        desc,
        type: `Tag do Visitante / ${eixo}`,
        hash,
        activation: 0.4 + Math.random() * 0.4,
        regiao: 'Brasil',
        acervos: ['Folksonomia Digital', 'IBRAM', 'Brasiliana Museus'],
        linksReais: [
          { label: `Pesquisar "${tag.tag_original}" no CNFCP`, url: `https://www.cnfcp.gov.br/interna.php?ID_Secao=69` },
          { label: `Pesquisar no Brasiliana Museus`, url: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(tag.tag_original || '')}` },
        ],
        isFromDB: true,
        createdAt: tag.criado_em,
        skosType: thesaurusTerm ? 'Concept' : 'Concept',
        skosBroader: ['core'],
      });

      // Aresta com o núcleo
      baseEdges.push({
        from: 'core',
        to: cleanId,
        weight: 0.65 + Math.random() * 0.25,
        discovered: true,
        mechanism: 'rag',
        eixoRel: eixo,
        skosRelation: 'skos:narrower',
      });
    }

    // ─── Nós da Memória Semântica Aprendida ──────────────────────────────
    const memoriaNodes: any[] = [];
    for (const mem of (memoriaDB || [])) {
      const norm = normalizeForComparison(mem.termo || '');
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      const cleanId = norm.replace(/\s+/g, '_').substring(0, 40);
      const eixo = inferEixo(mem.termo || '');
      memoriaNodes.push({
        id: cleanId,
        label: mem.termo,
        x: 400 + Math.cos((memoriaNodes.length / 8) * Math.PI * 2) * 80,
        y: 215 + Math.sin((memoriaNodes.length / 8) * Math.PI * 2) * 80,
        size: 10,
        fill: EIXO_COLORS[mem.categoria] || EIXO_COLORS[eixo] || '#888',
        eixo,
        desc: `Conceito aprendido via deep learning. Confiança: ${Math.round((mem.confianca || 0.5) * 100)}%.`,
        type: 'Conceito Aprendido (Memória Semântica)',
        hash: generateDeterministicHash({ termo: mem.termo }),
        activation: mem.confianca || 0.5,
        isFromDB: true,
        skosType: 'Concept',
        skosBroader: ['core'],
      });
      baseEdges.push({
        from: 'core',
        to: cleanId,
        weight: (mem.confianca || 0.5) * 0.85,
        discovered: true,
        mechanism: 'inferred',
        eixoRel: eixo,
        skosRelation: 'skos:related',
      });
    }

    // ─── Calcular Sinapses entre Tags (Deep Learning Heurístico) ─────────
    const allTagNodes = [...tagNodes, ...memoriaNodes];
    const sinapses: any[] = [];

    for (let i = 0; i < allTagNodes.length; i++) {
      for (let j = i + 1; j < allTagNodes.length; j++) {
        const a = allTagNodes[i];
        const b = allTagNodes[j];

        // Sinapses por eixo comum (coesão cultural)
        if (a.eixo === b.eixo) {
          const sim = hybridSemanticSimilarity(a.label, b.label);
          if (sim > 0.35) {
            sinapses.push({
              from: a.id,
              to: b.id,
              weight: sim * 0.75,
              discovered: true,
              mechanism: 'hebbian',
              eixoRel: a.eixo,
              skosRelation: 'skos:related',
            });
          }
        }

        // Sinapses por família similar (cohesion via BrazilianCultureArchitect)
        try {
          const cohesion = BrazilianCultureArchitect.calculateCohesion(a.label, b.label);
          if (cohesion > 0.45 && !sinapses.some(s => (s.from === a.id && s.to === b.id) || (s.from === b.id && s.to === a.id))) {
            sinapses.push({
              from: a.id,
              to: b.id,
              weight: cohesion * 0.8,
              discovered: true,
              mechanism: 'inferred',
              eixoRel: a.eixo,
              skosRelation: 'skos:closeMatch',
            });
          }
        } catch {}
      }
    }

    // ─── Spreading Activation para calcular ativações reais ─────────────
    const allNodes = [...baseNodes, ...allTagNodes];
    const allEdges = [...baseEdges, ...sinapses];

    let nodeActivations: Record<string, number> = {};
    try {
      const saResult = runSpreadingActivation(
        allNodes as any,
        allEdges,
        [{ id: 'core', initialEnergy: 1.0 }],
        { decay: 0.72, retention: 0.28, maxIterations: 6, normalize: true }
      );
      nodeActivations = saResult.nodeActivations;
    } catch {}

    // Atualizar ativações nos nós
    const nodesWithActivation = allNodes.map(n => ({
      ...n,
      activation: nodeActivations[n.id] ?? n.activation ?? 0.3,
    }));

    // ─── Estatísticas da Rede ─────────────────────────────────────────────
    const stats = {
      totalTags: tags.length,
      tagsNoGrafo: tagNodes.length,
      memoriaAprendida: memoriaNodes.length,
      sinapses: allEdges.length,
      correlacoes: (corrDB || []).length,
      historico: (historyDB || []).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        nodes: nodesWithActivation,
        edges: allEdges,
        stats,
        lastUpdated: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('[semantic-graph] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: RAG de tag específica + ingestão no grafo ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tag, action = 'ingest' } = body;

    if (action === 'ingest' && tag) {
      const norm = normalizeForComparison(tag);
      const cleanId = norm.replace(/\s+/g, '_').substring(0, 40);
      const eixo = inferEixo(tag);
      const fill = EIXO_COLORS[eixo] || '#888';
      const familia = `${FAMILIA_MAP[eixo] || 'saberes.manifestacao'}.${cleanId}`;
      const thesaurusTerm = findTerm(tag);
      const hash = generateDeterministicHash({ tag, eixo, ts: Date.now() });

      // Buscar tags similares no banco
      const { data: siblingsDB } = await supabaseAdmin
        .from('tags')
        .select('tag_original')
        .neq('tag_normalizada', norm)
        .limit(50);

      const siblings = (siblingsDB || [])
        .map((s: any) => ({
          tag: s.tag_original,
          score: hybridSemanticSimilarity(tag, s.tag_original),
        }))
        .filter((s: any) => s.score > 0.3)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      // Buscar correlações já aprendidas
      const { data: corrDB } = await supabaseAdmin
        .from('semantic_correlations')
        .select('external_title, correlation_score, layer')
        .eq('tag_normalizada', norm)
        .order('correlation_score', { ascending: false })
        .limit(5);

      // Persistir novo nó no banco
      try {
        await supabaseAdmin.from('cultural_network_nodes').upsert({
          node_id: cleanId,
          label: tag,
          eixo,
          node_type: `Tag / ${eixo}`,
          description: thesaurusTerm?.na || `Manifestação ${eixo.toLowerCase()} correlacionada pelo sistema.`,
          metadata: { fill, familia, hash, linksReais: [] },
          activation: 0.85,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'node_id' });

        await supabaseAdmin.from('cultural_network_edges').upsert({
          edge_id: `core__${cleanId}`,
          from_node: 'core',
          to_node: cleanId,
          weight: 0.82,
          mechanism: 'rag',
          discovered: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'edge_id' });

        // Sinapses com nós similares
        for (const sib of siblings) {
          const sibId = normalizeForComparison(sib.tag).replace(/\s+/g, '_').substring(0, 40);
          await supabaseAdmin.from('cultural_network_edges').upsert({
            edge_id: [cleanId, sibId].sort().join('__'),
            from_node: cleanId,
            to_node: sibId,
            weight: sib.score,
            mechanism: 'hebbian',
            discovered: true,
            metadata: { skosRelation: 'skos:related' },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'edge_id' });
        }

        // Registrar no histórico de aprendizado
        await supabaseAdmin.from('tag_learning_history').insert({
          tag_normalizada: norm,
          event_type: 'semantic_graph_ingest',
          event_details: {
            eixo, familia, hash,
            siblings_found: siblings.length,
            correlations_loaded: (corrDB || []).length,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.warn('[semantic-graph] Persist warning:', e);
      }

      return NextResponse.json({
        success: true,
        data: {
          node: {
            id: cleanId, label: tag, eixo, fill, familia,
            hash, activation: 0.85,
            desc: thesaurusTerm?.na || `Manifestação ${eixo.toLowerCase()} integrada ao cofre semântico.`,
            type: `Tag / ${eixo}`,
            skosType: 'Concept',
            skosBroader: ['core'],
            linksReais: [
              { label: `"${tag}" no CNFCP`, url: `https://www.cnfcp.gov.br/interna.php?ID_Secao=69` },
              { label: `Brasiliana Museus`, url: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(tag)}` },
            ],
          },
          siblings,
          correlations: corrDB || [],
          edgesAdded: 1 + siblings.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
