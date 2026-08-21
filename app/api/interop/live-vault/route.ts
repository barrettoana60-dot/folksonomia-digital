import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { discoverLiveConnections, pulseLiveNetwork } from '@/lib/ml/live-network-engine';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { generateDeterministicHash } from '@/lib/ml/graph-math';
import { searchAcademicLiterature } from '@/lib/ml/academic-search';
import { HAS_HIERARCHICAL_STORE, hasValidateAssociation } from '@/lib/ml/has-engine';
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
  const clean = label.trim().toLowerCase();
  if (clean.length < 3) return false;
  
  // Rejeitar ruídos de teste e termos fora de escopo
  const noise = /(^|\s)(oi|eu|m|o|test|teste|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;
  if (noise.test(clean)) return false;
  if (/^[0-9]+$/.test(clean)) return false;

  return true;
}

/**
 * Busca todas as tags reais do banco de dados (tabelas tags, semantic_memory, etc.)
 */
async function fetchAllDatabaseTags(): Promise<{ id: string; label: string; eixo: string; familia: string; isFromDB: boolean }[]> {
  const result: { id: string; label: string; eixo: string; familia: string; isFromDB: boolean }[] = [];
  const seen = new Set<string>();

  // 1. Tags do registro HAS
  Object.values(HAS_HIERARCHICAL_STORE).forEach(h => {
    if (!isValidCulturalTag(h.label)) return;
    const norm = normalizeForComparison(h.label);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push({
        id: h.id,
        label: h.label,
        eixo: h.eixo,
        familia: h.dossie?.familiaCultural || `Família ${h.eixo}`,
        isFromDB: false
      });
    }
  });

  // 2. Tags da tabela `tags` (filtradas)
  try {
    const { data: tagsDB } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false });

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
          familia: `Família ${eixo.toLowerCase()}.${cleanId}`,
          isFromDB: true
        });
      }
    });
  } catch (err) {
    console.warn('[LiveVault] Falha ao buscar tagsDB:', err);
  }

  return result;
}

/**
 * Cria ou recupera dossiê completo de uma tag usando HAS, RAG, Tainacan e Brasiliana.
 */
async function buildDynamicTagDossier(tagLabel: string, allTags: string[] = []): Promise<any> {
  const normKey = normalizeForComparison(tagLabel).replace(/\s+/g, '_');
  
  // 1. Tenta recuperar do HAS (Hierarchical Associative Store)
  const hasNode = HAS_HIERARCHICAL_STORE[normKey];
  const canonical = CULTURAL_VAULT_REGISTRY[normKey];

  const profile = BrazilianCultureArchitect.getCulturalProfile(tagLabel);
  const primaryAxis = hasNode?.eixo || canonical?.eixo || (profile.axes[0] === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                     profile.axes[0] === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                     profile.axes[0] === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                     profile.axes[0] === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO');

  const familiaNome = hasNode?.dossie?.familiaCultural || canonical?.familia || `Família ${primaryAxis.toLowerCase()}.${normKey}`;
  const hash = generateDeterministicHash(tagLabel);
  const uuid = canonical?.uuid || `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

  // Artigo e ancoragens. Uma fonte sem DOI verificável nunca recebe DOI inventado.
  let topArt = hasNode?.dossie?.artigo || canonical?.artigo;
  let artigoStatus: 'ilustrativo' | 'pendente_verificacao' | 'sem_fonte' = topArt ? 'ilustrativo' : 'sem_fonte';
  if (!topArt) {
    try {
      const articles = await searchAcademicLiterature(tagLabel, { maxResults: 3 });
      if (articles.length > 0) {
        const article = articles[0];
        topArt = {
          titulo: article.titulo,
          autor: article.autores || 'Autoria não informada',
          ano: article.ano || 'Data não informada',
          veiculo: article.revista || 'Veículo não informado',
          doi: article.doi || '',
          url: article.link || '',
          resumo: article.descricao || 'Resumo não disponibilizado pela fonte.'
        };
        artigoStatus = article.doi ? 'pendente_verificacao' : 'sem_fonte';
      }
    } catch { /* fallback */ }
  }

  // Conexões HAS estruturadas
  const conexoesTextuais: any[] = [];
  const associates = hasNode?.associates || (canonical?.conexoesTextuais?.map(c => c.targetId) || []);

  associates.forEach(targetId => {
    const targetNode = HAS_HIERARCHICAL_STORE[targetId] || CULTURAL_VAULT_REGISTRY[targetId];
    if (targetNode) {
      const targetLabel = (targetNode as any).label || (targetNode as any).tag || targetId;
      conexoesTextuais.push({
        targetId,
        targetTag: targetLabel,
        relacaoSKOS: 'skos:related',
        afirmacaoCultural: `"${tagLabel}" interliga-se a "${targetLabel}" através do compartilhamento de matrizes tradicionais e saberes populares.`
      });
    }
  });

  if (conexoesTextuais.length === 0) {
    allTags.filter(candidate => candidate !== tagLabel && isValidCulturalTag(candidate)).forEach(candidate => {
      const validation = hasValidateAssociation(tagLabel, candidate);
      const cohesion = BrazilianCultureArchitect.calculateCohesion(tagLabel, candidate);
      if ((validation.valid || cohesion >= 0.7) && conexoesTextuais.length < 4) {
        conexoesTextuais.push({
          targetId: normalizeForComparison(candidate).replace(/\s+/g, '_'),
          targetTag: candidate,
          relacaoSKOS: 'skos:related',
          afirmacaoCultural: `"${tagLabel}" está relacionada a "${candidate}" por referências culturais compatíveis na rede.`
        });
      }
    });
  }

  const wikidataUrl = hasNode?.dossie?.wikidata?.uri || canonical?.wikidata?.uri;
  const scieloUrl = topArt?.doi ? (topArt.doi.startsWith('http') ? topArt.doi : `https://doi.org/${topArt.doi}`) : topArt?.url;
  const brasilianaUrl = hasNode?.dossie?.brasiliana?.url;
  const tainacanUrl = hasNode?.dossie?.tainacan?.endpoint;

  const interligacoesGrid = [
    ...(wikidataUrl ? [{ title: 'Wikidata', subtitle: 'Base de Dados', type: 'external', url: wikidataUrl }] : []),
    { title: tagLabel, subtitle: 'Tag do Público', type: 'tag', targetId: normKey },
    ...(scieloUrl ? [{ title: 'Artigo vinculado', subtitle: 'Artigo Científico', type: 'external', url: scieloUrl }] : []),
    { title: familiaNome, subtitle: 'Família Cultural', type: 'familia' },
    ...conexoesTextuais.slice(0, 4).map(connection => ({ title: connection.targetTag, subtitle: 'Tag relacionada', type: 'tag', targetId: connection.targetId })),
    ...(brasilianaUrl ? [{ title: 'Brasiliana Museus', subtitle: 'Acervo Digital', type: 'external', url: brasilianaUrl }] : []),
    ...(tainacanUrl ? [{ title: 'Tainacan', subtitle: 'Repositório Cultural', type: 'external', url: tainacanUrl }] : [])
  ];

  return {
    id: normKey,
    tag: tagLabel,
    uuid,
    autor: canonical?.autor || 'Autoria não informada',
    dataCriacao: canonical?.dataCriacao || 'Data preservada',
    eixo: primaryAxis as any,
    cor: canonical?.cor || EIXO_COLORS[primaryAxis] || EIXO_COLORS.default,
    triplaFrase: canonical?.triplaFrase || `"${tagLabel}" tem origem cultural no patrimônio imaterial brasileiro.`,
    tripla: canonical?.tripla || {
      sujeito: tagLabel,
      predicado: 'tem_origem_cultural',
      objeto: primaryAxis === 'SABERES' ? 'Artesanato & Saber Popular' : 'Cultura Tradicional Brasileira'
    },
    familia: familiaNome,
    descricao: hasNode?.dossie?.artigo?.resumo || canonical?.descricao || `Expressão cultural brasileira salvaguardada no cofre semântico vivo sob a dimensão de ${primaryAxis.toLowerCase()}.`,
    wikidata: hasNode?.dossie?.wikidata || canonical?.wikidata,
    artigo: topArt,
    artigoStatus,
    conexoesTextuais,
    interligacoesGrid
  };
}

function buildJsonLd(dossier: any) {
  const article = dossier.artigoStatus === 'verificado' && dossier.artigo ? [{
    '@id': dossier.artigo.url || `https://doi.org/${dossier.artigo.doi}`,
    '@type': 'schema:ScholarlyArticle',
    'schema:name': dossier.artigo.titulo,
    'schema:publisher': dossier.artigo.veiculo
  }] : [];
  const payload: Record<string, any> = {
    '@context': {
      skos: 'http://www.w3.org/2004/02/skos/core#',
      schema: 'http://schema.org/',
      prov: 'http://www.w3.org/ns/prov#',
      wd: 'http://www.wikidata.org/entity/'
    },
    '@id': `https://folksonomia-digital.cultura.gov.br/tag/${dossier.id}`,
    '@type': 'skos:Concept',
    'skos:prefLabel': { '@value': dossier.tag, '@language': 'pt-BR' },
    'schema:description': dossier.descricao,
    'prov:wasAttributedTo': {
      '@id': `https://folksonomia-digital.cultura.gov.br/user/${dossier.uuid?.substring(0, 8) || 'preservado'}`,
      '@type': 'prov:Person',
      'schema:name': dossier.autor || 'Autoria não informada'
    },
    'schema:subjectOf': article
  };
  if (dossier.wikidata?.id || dossier.wikidata?.uri) {
    payload['skos:broadMatch'] = {
      '@id': dossier.wikidata.uri || `wd:${dossier.wikidata.id}`,
      '@type': 'skos:Concept',
      'skos:prefLabel': { '@value': dossier.wikidata.enLabel || dossier.wikidata.label, '@language': 'en' }
    };
  }
  return payload;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tagParam = searchParams.get('tag');

    const allTags = await fetchAllDatabaseTags();
    const allLabels = allTags.map(t => t.label);

    if (tagParam) {
      if (!isValidCulturalTag(tagParam)) {
        return NextResponse.json({ success: false, error: 'Tag indisponível para exibição pública.' }, { status: 404 });
      }
      const dossier = await buildDynamicTagDossier(tagParam, allLabels);
      if (req.headers.get('accept')?.includes('application/ld+json')) {
        return NextResponse.json(buildJsonLd(dossier), {
          headers: {
            'Content-Type': 'application/ld+json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60'
          }
        });
      }
      return NextResponse.json({ success: true, data: dossier });
    }

    const nodes = allTags.map((t, idx) => {
      const key = normalizeForComparison(t.label).replace(/\s+/g, '_');
      const canonical = CULTURAL_VAULT_REGISTRY[key];
      const hasNode = HAS_HIERARCHICAL_STORE[key];
      const eixo = hasNode?.eixo || canonical?.eixo || t.eixo || 'SABERES';
      return {
        id: t.id,
        label: t.label,
        description: canonical?.descricao || `Tag cultural: ${t.label}`,
        eixo,
        familia: canonical?.familia || t.familia,
        hasCanonical: !!(canonical || hasNode),
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

    const targetLabel = (isValidCulturalTag(sourceTag) ? sourceTag : allLabels[0] || 'Carranca').trim();
    const targetId = sourceId || normalizeForComparison(targetLabel).replace(/\s+/g, '_');

    // Construir nós válidos do grafo
    const seenIds = new Set<string>();
    const mergedNodes: any[] = [];

    allLabels.forEach((label, idx) => {
      const id = normalizeForComparison(label).replace(/\s+/g, '_');
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const canon = CULTURAL_VAULT_REGISTRY[id];
        const hasNode = HAS_HIERARCHICAL_STORE[id];
        const profile = BrazilianCultureArchitect.getCulturalProfile(label);
        const eixo = hasNode?.eixo || canon?.eixo || (profile.axes[0] === 'FESTAS_CELEBRACOES' ? 'FESTA' :
                     profile.axes[0] === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' :
                     profile.axes[0] === 'SABERES_OFICIOS_MATERIAIS' ? 'SABERES' :
                     profile.axes[0] === 'CRENCAS_RITOS' ? 'CRENCAS' : 'PATRIMONIO');

        const angle = (idx / Math.max(allLabels.length, 1)) * Math.PI * 2;
        const radius = idx < 8 ? 165 : 220 + (idx % 3) * 30;

        mergedNodes.push({
          id,
          label,
          activation: id === targetId ? 1.0 : 0.6,
          eixo,
          type: (canon || hasNode) ? 'Tag Preservada' : 'Tag do Público',
          desc: canon?.descricao || `Tag: ${label}`,
          fill: canon?.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default,
          size: id === targetId ? 20 : (canon ? 16 : 13),
          x: 400 + Math.cos(angle) * radius,
          y: 215 + Math.sin(angle) * radius,
          familia: canon?.familia || `${eixo.toLowerCase()}.${id}`
        });
      }
    });

    // Dossiê dinâmico completo com ancoragens RAG, Tainacan e Brasiliana
    const dynamicDossier = await buildDynamicTagDossier(targetLabel, allLabels);

    // Conexões estritas validadas pelo HAS e BrazilianCultureArchitect
    const existingEdges = [];
    for (let i = 0; i < mergedNodes.length; i++) {
      for (let j = i + 1; j < mergedNodes.length; j++) {
        const hasVal = hasValidateAssociation(mergedNodes[i].label, mergedNodes[j].label);
        const cohesion = BrazilianCultureArchitect.calculateCohesion(mergedNodes[i].label, mergedNodes[j].label);
        
        if (hasVal.valid || cohesion >= 0.7) {
          const sim = hybridSemanticSimilarity(mergedNodes[i].label, mergedNodes[j].label);
          existingEdges.push({
            from: mergedNodes[i].id,
            to: mergedNodes[j].id,
            weight: 0.80 + sim * 0.18,
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
    const discoveryResult = await discoverLiveConnections(mergedNodes, 12);

    // Filtrar apenas conexões culturais válidas pelo HAS
    const allDiscovered = [...pulseResult.connections, ...discoveryResult.connections].filter(c => {
      if (!isValidCulturalTag(c.fromLabel) || !isValidCulturalTag(c.toLabel)) return false;
      const val = hasValidateAssociation(c.fromLabel, c.toLabel);
      const coh = BrazilianCultureArchitect.calculateCohesion(c.fromLabel, c.toLabel);
      return val.valid || coh >= 0.5;
    });

    const enrichedConns = allDiscovered.map(conn => ({
      ...conn,
      afirmacao: `"${conn.fromLabel}" interliga-se culturalmente a "${conn.toLabel}" — ${conn.insight}`
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
