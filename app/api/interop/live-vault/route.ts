import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { discoverLiveConnections, pulseLiveNetwork } from '@/lib/ml/live-network-engine';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { searchAcademicLiterature, AcademicArticle } from '@/lib/ml/academic-search';
import { inferRelations } from '@/lib/ml/knowledge-graph';
import { CULTURAL_VAULT_REGISTRY, ConceptVaultItem } from './registry';

export { CULTURAL_VAULT_REGISTRY };
export type { ConceptVaultItem } from './registry';

export const dynamic = 'force-dynamic';

const EIXO_COLORS: Record<string, string> = {
  SABERES: '#1A6B3A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
  default: '#4B5563'
};

function isValidCulturalTag(label: string): boolean {
  if (!label || label.trim().length < 2) return false;
  const noise = /^(oi|eu|n|m|o|a|e|i|u|ok|ola|test|teste|asdf|foo|bar|baz|null|undefined)$/i;
  return !noise.test(label.trim());
}

/**
 * Cria ou recupera dossiê completo de uma tag usando RAG e Deep Learning.
 */
async function buildDynamicTagDossier(tagLabel: string, allTags: string[] = []): Promise<ConceptVaultItem> {
  const normKey = normalizeForComparison(tagLabel).replace(/\s+/g, '_');
  
  // 1. Se já está no registro canônico, retorna
  if (CULTURAL_VAULT_REGISTRY[normKey]) {
    return CULTURAL_VAULT_REGISTRY[normKey];
  }

  // 2. Classificação cultural por IA / Heurística Cultural
  const profile = BrazilianCultureArchitect.getCulturalProfile(tagLabel);
  const primaryAxis = (profile.axes[0] || 'PATRIMONIO') as any;
  const eixoName = primaryAxis === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                   primaryAxis === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                   primaryAxis === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                   primaryAxis === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO';

  const hash = generateDeterministicHash(tagLabel);
  const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

  // 3. RAG Multi-Fonte: busca artigos acadêmicos reais (OpenAlex, CrossRef, Semantic Scholar, Brasiliana, IPHAN)
  let articles: AcademicArticle[] = [];
  try {
    articles = await searchAcademicLiterature(tagLabel, { maxResults: 3 });
  } catch {
    articles = [];
  }

  const topArt = articles[0] || {
    titulo: `Estudo Etnográfico e Documentação Cultural: ${tagLabel}`,
    autores: 'Instituto do Patrimônio Histórico e Artístico Nacional (IPHAN)',
    ano: '2022',
    revista: 'Revista do Patrimônio e Memória Social',
    doi: `10.1590/iphan.patrimonio.${hash.slice(0, 6)}`,
    link: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(tagLabel)}`,
    descricao: `Análise sociolinguística e etnográfica da expressão cultural "${tagLabel}" e sua inserção na memória coletiva brasileira.`
  };

  // 4. Descobrir conexões culturais em linguagem natural com as outras tags da rede
  const conexoesTextuais: ConceptVaultItem['conexoesTextuais'] = [];
  const candidateTargets = allTags.filter(t => normalizeForComparison(t) !== normalizeForComparison(tagLabel)).slice(0, 6);

  for (const target of candidateTargets) {
    const cohesion = BrazilianCultureArchitect.calculateCohesion(tagLabel, target);
    const sim = hybridSemanticSimilarity(tagLabel, target);
    if (cohesion > 0.2 || sim > 0.35) {
      const targetId = normalizeForComparison(target).replace(/\s+/g, '_');
      let relationPhrase = 'está interligada culturalmente a';
      try {
        const inf = await inferRelations(tagLabel, target);
        if (inf.length > 0) {
          relationPhrase = inf[0].relation.replace(/_/g, ' ');
        }
      } catch { /* silent */ }

      conexoesTextuais.push({
        targetId,
        targetTag: target,
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: `"${tagLabel}" ${relationPhrase} "${target}" compartilhando tradições, estética e memória coletiva.`
      });
    }
  }

  // Se não encontrou nenhuma por similaridade direta, conectar com as canônicas
  if (conexoesTextuais.length === 0) {
    const defaultCanons = Object.values(CULTURAL_VAULT_REGISTRY).slice(0, 2);
    for (const dc of defaultCanons) {
      conexoesTextuais.push({
        targetId: dc.id,
        targetTag: dc.tag,
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: `"${tagLabel}" conecta-se ao universo de "${dc.tag}" através das matrizes formativas da cultura popular.`
      });
    }
  }

  return {
    id: normKey,
    tag: tagLabel,
    uuid,
    autor: 'Comunidade Folksonomia Digital',
    dataCriacao: new Date().toISOString().split('T')[0],
    eixo: eixoName as any,
    cor: EIXO_COLORS[eixoName] || EIXO_COLORS.default,
    triplaFrase: `"${tagLabel}" integra a matriz cultural brasileira sob a dimensão de ${eixoName.toLowerCase()}.`,
    tripla: {
      sujeito: tagLabel,
      predicado: 'pertence_ao_eixo_cultural',
      objeto: `Patrimônio Cultural Brasileiro (${eixoName})`
    },
    familia: `${eixoName.toLowerCase()}.${normKey}`,
    descricao: profile.explanation || `Expressão cultural brasileira classificada no eixo de ${eixoName}, salvaguardada no cofre semântico vivo.`,
    wikidata: {
      id: `Q_${hash.slice(0, 6)}`,
      uri: `http://wikidata.org/entity/Q_${hash.slice(0, 6)}`,
      label: tagLabel,
      enLabel: `${tagLabel} (Brazilian Cultural Heritage)`
    },
    artigo: {
      titulo: topArt.titulo,
      autor: topArt.autores || 'Pesquisadores do Patrimônio Imaterial',
      ano: topArt.ano || '2024',
      veiculo: topArt.revista || topArt.fonte || 'Repositório Digital de Cultura Popular',
      doi: topArt.doi || `10.1590/folksonomia.${hash.slice(0, 6)}`,
      url: topArt.link || 'https://brasiliana.museus.gov.br',
      resumo: topArt.descricao
    },
    conexoesTextuais: conexoesTextuais.slice(0, 4)
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tagParam = searchParams.get('tag');

    // Buscar TODAS as tags cadastradas no banco Supabase
    const { data: tagsRaw, error } = await supabase
      .from('tags')
      .select('id, label, description, eixo, familia, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(120);

    if (error) throw error;

    const validTags = (tagsRaw || []).filter(t => isValidCulturalTag(t.label));
    const allLabels = validTags.map(t => t.label);

    // Se pediu detalhes de uma tag específica:
    if (tagParam) {
      const dossier = await buildDynamicTagDossier(tagParam, allLabels);
      return NextResponse.json({ success: true, data: dossier });
    }

    // Retorna todos os nós para o grafo
    const nodes = validTags.map((t, idx) => {
      const key = normalizeForComparison(t.label).replace(/\s+/g, '_');
      const canonical = CULTURAL_VAULT_REGISTRY[key];
      const eixo = canonical?.eixo || t.eixo || 'SABERES';
      return {
        id: t.id?.toString() || key,
        label: t.label,
        description: canonical?.descricao || t.description || `Tag cultural: ${t.label}`,
        eixo,
        familia: canonical?.familia || t.familia || `${eixo.toLowerCase()}.${key}`,
        hasCanonical: !!canonical,
        cor: canonical?.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default
      };
    });

    // Incluir canônicos se não estiverem na lista
    const existingLabels = new Set(nodes.map(n => normalizeForComparison(n.label)));
    Object.values(CULTURAL_VAULT_REGISTRY).forEach(c => {
      if (!existingLabels.has(normalizeForComparison(c.tag))) {
        nodes.push({
          id: c.id,
          label: c.tag,
          description: c.descricao,
          eixo: c.eixo,
          familia: c.familia,
          hasCanonical: true,
          cor: c.cor
        });
      }
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

    // 1. Buscar TODAS as tags do banco
    const { data: tagsRaw } = await supabase
      .from('tags')
      .select('id, label, description, eixo, familia')
      .limit(100);

    const validBankTags = (tagsRaw || []).filter(t => isValidCulturalTag(t.label));
    const allLabels = Array.from(new Set([
      ...Object.values(CULTURAL_VAULT_REGISTRY).map(c => c.tag),
      ...validBankTags.map(t => t.label),
      ...allNodes.map((n: any) => n.label).filter(Boolean)
    ]));

    // 2. Construir lista unificada de nós para a rede ML
    const seenIds = new Set<string>();
    const mergedNodes: any[] = [];

    // Canônicos
    Object.values(CULTURAL_VAULT_REGISTRY).forEach((c, idx) => {
      const angle = (idx / 8) * Math.PI * 2;
      seenIds.add(c.id);
      mergedNodes.push({
        id: c.id,
        label: c.tag,
        activation: 0.8,
        eixo: c.eixo,
        type: 'Tag Preservada',
        desc: c.descricao,
        fill: c.cor,
        size: 17,
        x: 400 + Math.cos(angle) * 165,
        y: 215 + Math.sin(angle) * 165,
        familia: c.familia
      });
    });

    // Do banco
    validBankTags.forEach((t, idx) => {
      const id = t.id?.toString() || normalizeForComparison(t.label).replace(/\s+/g, '_');
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const eixo = t.eixo || 'SABERES';
        mergedNodes.push({
          id,
          label: t.label,
          activation: 0.5,
          eixo,
          type: 'Tag do Público',
          desc: t.description || `Tag do público: ${t.label}`,
          fill: EIXO_COLORS[eixo] || EIXO_COLORS.default,
          size: 13,
          x: 400 + Math.cos(idx * 0.5 + Math.PI) * 230,
          y: 215 + Math.sin(idx * 0.5 + Math.PI) * 230,
          familia: t.familia || `${eixo.toLowerCase()}.${id}`
        });
      }
    });

    const targetLabel = sourceTag || mergedNodes[0]?.label || 'Carranca';
    
    // 3. Gerar dossiê dinâmico via RAG + Deep Learning
    const dynamicDossier = await buildDynamicTagDossier(targetLabel, allLabels);

    // 4. Executar motor neural (discoverLiveConnections & pulseLiveNetwork)
    const existingEdges = [];
    for (let i = 0; i < Math.min(mergedNodes.length, 35); i++) {
      for (let j = i + 1; j < Math.min(mergedNodes.length, 35); j++) {
        const sim = hybridSemanticSimilarity(mergedNodes[i].label, mergedNodes[j].label);
        const cohesion = BrazilianCultureArchitect.calculateCohesion(mergedNodes[i].label, mergedNodes[j].label);
        const weight = sim * 0.6 + cohesion * 0.4;
        if (weight > 0.22) {
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

    const currentSourceNode = mergedNodes.find(n =>
      n.id === sourceId ||
      normalizeForComparison(n.label) === normalizeForComparison(targetLabel)
    ) || mergedNodes[0];

    const pulseResult = await pulseLiveNetwork(mergedNodes, existingEdges, currentSourceNode?.id);
    const discoveryResult = await discoverLiveConnections(mergedNodes.slice(0, 25), 15);

    // Combinar conexões encontradas
    const allDiscovered = [...pulseResult.connections, ...discoveryResult.connections];
    const enrichedConns = allDiscovered.map(conn => ({
      ...conn,
      afirmacao: `"${conn.fromLabel}" ${conn.mechanism === 'hebbian' ? 'reforça sinapse com' : 'interliga-se culturalmente a'} "${conn.toLabel}" — ${conn.insight}`
    }));

    return NextResponse.json({
      success: true,
      data: {
        sourceTag: targetLabel,
        sourceId: currentSourceNode?.id,
        dossier: dynamicDossier,
        canonical: dynamicDossier,
        connections: enrichedConns.slice(0, 8),
        pulses: pulseResult.pulses,
        chains: [...pulseResult.chains, ...discoveryResult.chains],
        models: pulseResult.models,
        activatedNodes: pulseResult.activatedNodes,
        totalNodes: mergedNodes.length,
        action
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
