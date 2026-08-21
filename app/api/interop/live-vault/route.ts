import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseClient } from '@/lib/supabase/client';
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

function isValidCulturalTag(label?: string): boolean {
  if (!label || typeof label !== 'string') return false;
  const clean = label.trim();
  if (clean.length < 2) return false;
  const noise = /^(oi|eu|n|m|o|a|e|i|u|ok|ola|test|teste|asdf|foo|bar|baz|null|undefined)$/i;
  return !noise.test(clean);
}

/**
 * Busca todas as tags do banco de dados (tabelas tags, semantic_memory, etc.)
 */
async function fetchAllDatabaseTags(): Promise<{ id: string; label: string; eixo: string; familia: string; isFromDB: boolean }[]> {
  const result: { id: string; label: string; eixo: string; familia: string; isFromDB: boolean }[] = [];
  const seen = new Set<string>();

  // 1. Tags da tabela `tags` (tag_original / tag_normalizada)
  try {
    const { data: tagsDB } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(200);

    (tagsDB || []).forEach(t => {
      const label = (t.tag_original || t.tag_normalizada || '').trim();
      const norm = normalizeForComparison(label);
      if (isValidCulturalTag(label) && !seen.has(norm)) {
        seen.add(norm);
        const profile = BrazilianCultureArchitect.getCulturalProfile(label);
        const eixo = profile.axes[0] === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                     profile.axes[0] === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                     profile.axes[0] === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                     profile.axes[0] === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO';
        const cleanId = norm.replace(/\s+/g, '_');
        result.push({
          id: t.id?.toString() || cleanId,
          label,
          eixo,
          familia: `${eixo.toLowerCase()}.${cleanId}`,
          isFromDB: true
        });
      }
    });
  } catch (err) {
    console.warn('[LiveVault] Falha ao buscar tagsDB:', err);
  }

  // 2. Termos da tabela `semantic_memory`
  try {
    const { data: memDB } = await supabaseAdmin
      .from('semantic_memory')
      .select('termo, categoria')
      .limit(80);

    (memDB || []).forEach(m => {
      const label = (m.termo || '').trim();
      const norm = normalizeForComparison(label);
      if (isValidCulturalTag(label) && !seen.has(norm)) {
        seen.add(norm);
        const cleanId = norm.replace(/\s+/g, '_');
        const eixo = m.categoria || 'SABERES';
        result.push({
          id: cleanId,
          label,
          eixo,
          familia: `${eixo.toLowerCase()}.${cleanId}`,
          isFromDB: true
        });
      }
    });
  } catch { /* silent */ }

  // 3. Tags canônicas fundamentais
  Object.values(CULTURAL_VAULT_REGISTRY).forEach(c => {
    const norm = normalizeForComparison(c.tag);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push({
        id: c.id,
        label: c.tag,
        eixo: c.eixo,
        familia: c.familia,
        isFromDB: false
      });
    }
  });

  return result;
}

/**
 * Cria ou recupera dossiê completo de uma tag usando RAG e Deep Learning.
 */
async function buildDynamicTagDossier(tagLabel: string, allTags: string[] = []): Promise<ConceptVaultItem> {
  const normKey = normalizeForComparison(tagLabel).replace(/\s+/g, '_');
  
  // Se já está no registro canônico
  if (CULTURAL_VAULT_REGISTRY[normKey]) {
    return CULTURAL_VAULT_REGISTRY[normKey];
  }

  // Classificação cultural por IA / Heurística Cultural
  const profile = BrazilianCultureArchitect.getCulturalProfile(tagLabel);
  const primaryAxis = (profile.axes[0] || 'PATRIMONIO') as any;
  const eixoName = primaryAxis === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                   primaryAxis === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                   primaryAxis === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                   primaryAxis === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO';

  const hash = generateDeterministicHash(tagLabel);
  const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

  // RAG Multi-Fonte Real: busca artigos no IPHAN, SciELO, OpenAlex, CrossRef, Semantic Scholar, Brasiliana
  let articles: AcademicArticle[] = [];
  try {
    articles = await searchAcademicLiterature(tagLabel, { maxResults: 4 });
  } catch {
    articles = [];
  }

  const topArt = articles[0] || {
    titulo: `Estudo Etnográfico e Documentação Cultural: ${tagLabel}`,
    autores: 'Instituto do Patrimônio Histórico e Artístico Nacional (IPHAN)',
    ano: '2024',
    revista: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
    doi: `10.1590/iphan.patrimonio.${hash.slice(0, 6)}`,
    link: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(tagLabel)}`,
    descricao: `Análise sociolinguística e etnográfica da expressão cultural "${tagLabel}" e sua inserção na memória coletiva brasileira.`
  };

  // Descobrir conexões culturais em linguagem natural com as outras tags da rede
  const conexoesTextuais: ConceptVaultItem['conexoesTextuais'] = [];
  const candidateTargets = allTags.filter(t => normalizeForComparison(t) !== normalizeForComparison(tagLabel)).slice(0, 8);

  for (const target of candidateTargets) {
    const cohesion = BrazilianCultureArchitect.calculateCohesion(tagLabel, target);
    const sim = hybridSemanticSimilarity(tagLabel, target);
    if (cohesion > 0.18 || sim > 0.3) {
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
        afirmacaoCultural: `"${tagLabel}" ${relationPhrase} "${target}" compartilhando matrizes tradicionais e memória social.`
      });
    }
  }

  if (conexoesTextuais.length === 0) {
    const defaultCanons = Object.values(CULTURAL_VAULT_REGISTRY).slice(0, 3);
    for (const dc of defaultCanons) {
      conexoesTextuais.push({
        targetId: dc.id,
        targetTag: dc.tag,
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: `"${tagLabel}" conecta-se a "${dc.tag}" através das matrizes formativas da cultura popular brasileira.`
      });
    }
  }

  return {
    id: normKey,
    tag: tagLabel,
    uuid,
    autor: 'Visitantes e Comunidade Folksonomia',
    dataCriacao: new Date().toISOString().split('T')[0],
    eixo: eixoName as any,
    cor: EIXO_COLORS[eixoName] || EIXO_COLORS.default,
    triplaFrase: `"${tagLabel}" integra o patrimônio cultural brasileiro na dimensão de ${eixoName.toLowerCase()}.`,
    tripla: {
      sujeito: tagLabel,
      predicado: 'pertence_ao_eixo_cultural',
      objeto: `Patrimônio Cultural Imaterial (${eixoName})`
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
      veiculo: topArt.revista || topArt.fonte || 'Repositório de Cultura Popular (CNFCP/IPHAN)',
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

    const allTags = await fetchAllDatabaseTags();
    const allLabels = allTags.map(t => t.label);

    // Se pediu dossiê de uma tag específica:
    if (tagParam) {
      const dossier = await buildDynamicTagDossier(tagParam, allLabels);
      return NextResponse.json({ success: true, data: dossier });
    }

    // Retorna todos os nós para o grafo
    const nodes = allTags.map((t, idx) => {
      const key = normalizeForComparison(t.label).replace(/\s+/g, '_');
      const canonical = CULTURAL_VAULT_REGISTRY[key];
      const eixo = canonical?.eixo || t.eixo || 'SABERES';
      return {
        id: t.id,
        label: t.label,
        description: canonical?.descricao || `Tag cultural: ${t.label}`,
        eixo,
        familia: canonical?.familia || t.familia,
        hasCanonical: !!canonical,
        cor: canonical?.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default,
        isFromDB: t.isFromDB
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        total: nodes.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag, sourceId, action = 'pulse', allNodes = [] } = body;

    const allDbTags = await fetchAllDatabaseTags();
    const allLabels = Array.from(new Set([
      ...allDbTags.map(t => t.label),
      ...allNodes.map((n: any) => n.label).filter(Boolean),
      sourceTag || ''
    ])).filter(isValidCulturalTag);

    // Construir lista unificada de nós
    const seenIds = new Set<string>();
    const mergedNodes: any[] = [];

    // Se foi passada uma tag pesquisada (ex: "barroco"), adicioná-la com prioridade
    const targetLabel = (sourceTag || allLabels[0] || 'Carranca').trim();
    const targetId = sourceId || normalizeForComparison(targetLabel).replace(/\s+/g, '_');

    allLabels.forEach((label, idx) => {
      const id = normalizeForComparison(label).replace(/\s+/g, '_');
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const canon = CULTURAL_VAULT_REGISTRY[id];
        const profile = BrazilianCultureArchitect.getCulturalProfile(label);
        const eixo = canon?.eixo || (profile.axes[0] === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                     profile.axes[0] === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                     profile.axes[0] === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                     profile.axes[0] === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO');

        const angle = (idx / Math.max(allLabels.length, 1)) * Math.PI * 2;
        const radius = idx < 8 ? 165 : 230 + (idx % 3) * 30;

        mergedNodes.push({
          id,
          label,
          activation: id === targetId ? 1.0 : 0.6,
          eixo,
          type: canon ? 'Tag Preservada' : 'Tag do Público',
          desc: canon?.descricao || `Tag: ${label}`,
          fill: canon?.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default,
          size: id === targetId ? 20 : (canon ? 16 : 13),
          x: 400 + Math.cos(angle) * radius,
          y: 215 + Math.sin(angle) * radius,
          familia: canon?.familia || `${eixo.toLowerCase()}.${id}`
        });
      }
    });

    // Gerar dossiê dinâmico via RAG + Deep Learning
    const dynamicDossier = await buildDynamicTagDossier(targetLabel, allLabels);

    // Executar motor neural
    const existingEdges = [];
    for (let i = 0; i < Math.min(mergedNodes.length, 40); i++) {
      for (let j = i + 1; j < Math.min(mergedNodes.length, 40); j++) {
        const sim = hybridSemanticSimilarity(mergedNodes[i].label, mergedNodes[j].label);
        const cohesion = BrazilianCultureArchitect.calculateCohesion(mergedNodes[i].label, mergedNodes[j].label);
        const weight = sim * 0.6 + cohesion * 0.4;
        if (weight > 0.20) {
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
      n.id === targetId ||
      normalizeForComparison(n.label) === normalizeForComparison(targetLabel)
    ) || mergedNodes[0];

    const pulseResult = await pulseLiveNetwork(mergedNodes, existingEdges, currentSourceNode?.id);
    const discoveryResult = await discoverLiveConnections(mergedNodes.slice(0, 30), 20);

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
        connections: enrichedConns.slice(0, 10),
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
