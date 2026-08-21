import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { discoverLiveConnections, pulseLiveNetwork } from '@/lib/ml/live-network-engine';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { CULTURAL_VAULT_REGISTRY } from './registry';

export { CULTURAL_VAULT_REGISTRY };
export type { ConceptVaultItem } from './registry';

export const dynamic = 'force-dynamic';

// ─── FILTRO DE TAGS VÁLIDAS (sem lixo de testes) ──────────────────────────
function isValidCulturalTag(label: string): boolean {
  if (!label || label.trim().length < 3) return false;
  const noise = /^(oi|eu|n|m|o|a|e|i|u|ok|ola|test|teste|asdf|foo|bar|baz|null|undefined|[0-9]+)$/i;
  return !noise.test(label.trim());
}

export async function GET(req: NextRequest) {
  try {
    // Buscar TODAS as tags do banco
    const { data: tagsRaw, error } = await supabase
      .from('tags')
      .select('id, label, description, eixo, familia, created_at')
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) throw error;

    // Filtrar lixo
    const tags = (tagsRaw || []).filter(t => isValidCulturalTag(t.label));

    // Enriquecer com dados canônicos quando disponível
    const nodes = tags.map(t => {
      const key = normalizeForComparison(t.label).replace(/\s+/g, '_');
      const canonical = CULTURAL_VAULT_REGISTRY[key];
      return {
        id: t.id?.toString() || key,
        label: t.label,
        description: canonical?.descricao || t.description || `Tag cultural: ${t.label}`,
        eixo: canonical?.eixo || t.eixo || 'SABERES',
        familia: canonical?.familia || t.familia || 'patrimonio.cultural',
        hasCanonical: !!canonical,
        canonical: canonical || null
      };
    });

    return NextResponse.json({ success: true, data: { nodes, total: nodes.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag, sourceId, action = 'pulse', allNodes = [] } = body;

    // Buscar tags do banco para correlacionar
    const { data: tagsRaw } = await supabase
      .from('tags')
      .select('id, label, description, eixo, familia')
      .limit(60);

    const allTagNodes = (tagsRaw || [])
      .filter(t => isValidCulturalTag(t.label))
      .map(t => ({
        id: t.id?.toString() || normalizeForComparison(t.label).replace(/\s+/g, '_'),
        label: t.label,
        activation: 0.5,
        eixo: t.eixo || 'SABERES',
        familia: t.familia || 'patrimonio.cultural'
      }));

    // Adicionar nós canônicos sempre (com campos obrigatórios do CulturalNetworkNode)
    const EIXO_COLORS: Record<string, string> = {
      SABERES: '#22c55e', FESTA: '#3b82f6', MUSICA: '#06b6d4',
      CRENCAS: '#a855f7', PATRIMONIO: '#f59e0b', default: '#6b7280'
    };
    const canonicalNodes = Object.values(CULTURAL_VAULT_REGISTRY).map((c, idx) => {
      const angle = (idx / 8) * Math.PI * 2;
      return {
        id: c.id, label: c.tag, activation: 0.7,
        eixo: c.eixo as any, type: 'Tag Preservada', desc: c.descricao,
        fill: EIXO_COLORS[c.eixo] || EIXO_COLORS.default, size: 17,
        x: 400 + Math.cos(angle) * 165, y: 215 + Math.sin(angle) * 165,
        familia: c.familia
      };
    });

    // Merge sem duplicatas (com campos obrigatórios)
    const seenIds = new Set<string>();
    const mergedNodes = [...canonicalNodes, ...allTagNodes.map((n, idx) => ({
      ...n, type: n.type || 'Tag do Público',
      desc: n.desc || `Tag: ${n.label}`,
      fill: EIXO_COLORS[n.eixo] || EIXO_COLORS.default,
      size: 13, x: 400 + Math.cos(idx * 0.7) * 240, y: 215 + Math.sin(idx * 0.7) * 240
    }))].filter(n => {
      if (seenIds.has(n.id)) return false;
      seenIds.add(n.id);
      return true;
    });

    if (action === 'discover') {
      // Descoberta completa via ensemble de modelos
      const result = await discoverLiveConnections(mergedNodes, 20);

      // Enriquecer descobertas com dados canônicos
      const enriched = result.connections.map(conn => {
        const keyFrom = normalizeForComparison(conn.fromLabel).replace(/\s+/g, '_');
        const keyTo = normalizeForComparison(conn.toLabel).replace(/\s+/g, '_');
        const canonFrom = CULTURAL_VAULT_REGISTRY[keyFrom];
        const canonTo = CULTURAL_VAULT_REGISTRY[keyTo];

        return {
          ...conn,
          fromArtigo: canonFrom?.artigo || null,
          toArtigo: canonTo?.artigo || null,
          fromWikidata: canonFrom?.wikidata || null,
          toWikidata: canonTo?.wikidata || null
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          connections: enriched,
          pulses: result.pulses,
          chains: result.chains,
          models: result.models,
          activatedNodes: result.activatedNodes,
          totalNodes: mergedNodes.length,
          action: 'discover'
        }
      });
    }

    // Pulso a partir de uma tag específica (DNA key)
    const sourceNode = mergedNodes.find(n =>
      n.id === sourceId ||
      normalizeForComparison(n.label) === normalizeForComparison(sourceTag || '')
    );

    if (!sourceNode) {
      return NextResponse.json({ success: false, error: 'Tag não encontrada' }, { status: 404 });
    }

    // Construir arestas existentes com similaridade
    const existingEdges = [];
    for (let i = 0; i < Math.min(mergedNodes.length, 30); i++) {
      for (let j = i + 1; j < Math.min(mergedNodes.length, 30); j++) {
        const sim = hybridSemanticSimilarity(mergedNodes[i].label, mergedNodes[j].label);
        const cohesion = BrazilianCultureArchitect.calculateCohesion(mergedNodes[i].label, mergedNodes[j].label);
        const weight = sim * 0.6 + cohesion * 0.4;
        if (weight > 0.25) {
          existingEdges.push({
            from: mergedNodes[i].id,
            to: mergedNodes[j].id,
            weight,
            mechanism: 'inferred' as const,
            discovered: false
          });
        }
      }
    }

    // Pulso vivo a partir da tag como DNA key
    const result = await pulseLiveNetwork(mergedNodes, existingEdges, sourceNode.id);

    // Enriquecer com dados do cofre canônico
    const canonKey = normalizeForComparison(sourceNode.label).replace(/\s+/g, '_');
    const canonData = CULTURAL_VAULT_REGISTRY[canonKey];

    // Correlacionar com artigos (se existir no registro canônico)
    const enrichedConnections = result.connections.map(conn => {
      const keyTo = normalizeForComparison(conn.toLabel).replace(/\s+/g, '_');
      const canonTo = CULTURAL_VAULT_REGISTRY[keyTo];
      return {
        ...conn,
        artigo: canonTo?.artigo || null,
        wikidata: canonTo?.wikidata || null,
        // Afirmação cultural em linguagem natural
        afirmacao: `${conn.fromLabel} ${conn.mechanism === 'hebbian' ? 'é reforçada por' : 'está relacionada a'} ${conn.toLabel}: ${conn.insight}`
      };
    });

    // Persistir novas conexões no banco
    if (enrichedConnections.length > 0) {
      const edgesToPersist = enrichedConnections.slice(0, 5).map(c => ({
        source_tag_id: sourceNode.id,
        target_tag_id: c.to,
        weight: c.weight,
        mechanism: c.mechanism,
        discovered_by: 'live-network-engine',
        metadata: { insight: c.insight, model: c.model }
      }));

      await supabase
        .from('cultural_network_edges')
        .upsert(edgesToPersist, { onConflict: 'source_tag_id,target_tag_id' })
        .select();
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceTag: sourceNode.label,
        sourceId: sourceNode.id,
        canonical: canonData || null,
        connections: enrichedConnections,
        pulses: result.pulses,
        chains: result.chains,
        models: result.models,
        activatedNodes: result.activatedNodes,
        totalNodes: mergedNodes.length,
        action: 'pulse'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
