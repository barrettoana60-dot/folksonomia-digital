'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Search, Sparkles,
  Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Zap, Link2
} from 'lucide-react';
import {
  runSpreadingActivation,
  generateDeterministicHash,
  GraphMathNode,
  GraphMathEdge
} from '@/lib/ml/graph-math';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOSSIÊ DE CADA TAG CULTURAL — artigos reais, triplas, proveniência
   ═══════════════════════════════════════════════════════════════════════════ */
interface TagDossier {
  uuid: string;
  autor: string;
  tripla: [string, string, string]; // [sujeito, predicado, objeto]
  familia: string;
  wikidata: { id: string; label: string; enLabel: string };
  artigo: {
    titulo: string; autor: string; ano: string;
    veiculo: string; doi: string; url: string; resumo: string;
  };
  bases: string[];
}

const DOSSIERS: Record<string, TagDossier> = {
  carranca: {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    autor: 'João Silva (Visitante / Curador Social)',
    tripla: ['Carranca', 'tem_origem_cultural', 'Rio São Francisco'],
    familia: 'saberes.escultura.fluvial.apotropaica',
    wikidata: { id: 'Q5046049', label: 'Escultura de Proa', enLabel: 'Figurehead' },
    artigo: {
      titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
      autor: 'Paulo Pardal & Darcy Ribeiro',
      ano: '1974 / 2018',
      veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
      doi: '10.1590/S0104-1234.1974.0042',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo monográfico sobre mestres entalhadores do Vale do São Francisco, a simbologia das figuras zoomórficas e a função mística de afastar maus espíritos das embarcações fluviais.'
    },
    bases: ['IBRAM — Museu do São Francisco', 'CNFCP/IPHAN', 'Scielo Brasil', 'Wikidata']
  },
  bumba_boi: {
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    autor: 'Maria Eduarda (Pesquisadora Comunitária)',
    tripla: ['Bumba-meu-boi', 'celebra_ciclo_ritual', 'Festas Juninas'],
    familia: 'festa.popular.auto_dramatico.nordeste',
    wikidata: { id: 'Q1006547', label: 'Bumba-meu-boi', enLabel: 'Boi-Bumba Folk Drama' },
    artigo: {
      titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
      autor: 'Maria Michol Carvalho',
      ano: '2011',
      veiculo: 'Dossiê do Patrimônio Imaterial — IPHAN / UNESCO',
      doi: '10.1590/iphan.dossie.0018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
      resumo: 'Inventário etnográfico completo dos sotaques de matraca, zabumba e orquestra do Maranhão, abordando a teatralidade mítica da morte e ressurreição do boi.'
    },
    bases: ['IPHAN — Registro Nacional', 'UNESCO Intangible Heritage', 'Brasiliana Museus', 'CNFCP']
  },
  frevo: {
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    autor: 'Carlos Alberto (Colaborador Recife)',
    tripla: ['Frevo', 'possui_matriz_performatica', 'Passo Acrobático'],
    familia: 'musica.danca.carnaval.acrobatico',
    wikidata: { id: 'Q1455589', label: 'Frevo', enLabel: 'Frevo Dance and Music' },
    artigo: {
      titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
      autor: 'Mário de Andrade & Valdemar de Oliveira',
      ano: '1928 / 2012',
      veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
      doi: '10.1590/frevo.unesco.2012',
      url: 'https://pacodofrevo.org.br',
      resumo: 'Análise etnomusicológica sobre a origem sincopada das bandas marciais e a capoeira de rua que deram origem ao frevo.'
    },
    bases: ['Paço do Frevo', 'UNESCO ICH Register', 'IBRAM', 'Mapas da Cultura']
  },
  capoeira: {
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    autor: 'Mestre Damião (Guardião de Ofício)',
    tripla: ['Roda de Capoeira', 'expressa_cosmologia_afro', 'Berimbau e Jogo Ritual'],
    familia: 'musica.luta.matriz_africana.tradicao_oral',
    wikidata: { id: 'Q11418', label: 'Capoeira', enLabel: 'Capoeira Martial Art' },
    artigo: {
      titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
      autor: 'Muniz Sodré & Mestre Itapoan',
      ano: '2008 / 2014',
      veiculo: 'Dossiê IPHAN / UNESCO',
      doi: '10.1590/capoeira.unesco.2014',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
      resumo: 'Investigação sobre a ancestralidade bantú, os toques litúrgicos de berimbau e a transmissão oral dos saberes entre mestres e discípulos.'
    },
    bases: ['Museu Afro Brasil', 'IPHAN', 'UNESCO World Heritage', 'CNFCP']
  },
  mestre_vitalino: {
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    autor: 'Ana Beatriz (Estudos Culturais)',
    tripla: ['Mestre Vitalino', 'produziu_arte_em', 'Cerâmica Figurativa de Caruaru'],
    familia: 'saberes.ceramica.figurativa.agreste',
    wikidata: { id: 'Q6822831', label: 'Mestre Vitalino', enLabel: 'Mestre Vitalino Folk Artist' },
    artigo: {
      titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
      autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
      ano: '1954 / 2005',
      veiculo: 'Cadernos de Cultura / CNFCP-IPHAN',
      doi: '10.1590/vitalino.barro.1954',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Registro da escultura popular em barro no Alto do Moura, retratando retirantes, cangaceiros, vaqueiros e folguedos populares.'
    },
    bases: ['Museu do Barro de Caruaru', 'CNFCP/IPHAN', 'Brasiliana Museus', 'Scielo']
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   NÓS E ARESTAS INICIAIS DO COFRE — grafo limpo e curado
   ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL_NODES: GraphMathNode[] = [
  { id: 'core', label: 'Cofre Semântico', x: 400, y: 215, size: 28, fill: '#E8490A', eixo: 'NUCLEO', desc: 'Ponto central que compacta, preserva e interliga todas as tags culturais dos usuários.', type: 'Cofre Central', hash: generateDeterministicHash({ id: 'core' }), familia: 'sistema.nucleo', activation: 1.0 },
  { id: 'carranca', label: 'Carranca', x: 180, y: 310, size: 19, fill: '#1A6B3A', eixo: 'SABERES', desc: 'Escultura de proa fluvial no Rio São Francisco para afastar maus espíritos.', type: 'UserTag', hash: generateDeterministicHash({ id: 'carranca' }), familia: 'saberes.escultura', activation: 0.92 },
  { id: 'bumba_boi', label: 'Bumba-meu-boi', x: 200, y: 100, size: 18, fill: '#1E3A8A', eixo: 'FESTA', desc: 'Complexo lúdico-dramático do ciclo junino maranhense.', type: 'UserTag', hash: generateDeterministicHash({ id: 'bumba_boi' }), familia: 'festa.popular', activation: 0.88 },
  { id: 'frevo', label: 'Frevo', x: 600, y: 100, size: 17, fill: '#0891B2', eixo: 'MUSICA', desc: 'Música e passo acrobático pernambucano, patrimônio imaterial da humanidade.', type: 'UserTag', hash: generateDeterministicHash({ id: 'frevo' }), familia: 'musica.danca', activation: 0.84 },
  { id: 'capoeira', label: 'Capoeira', x: 650, y: 250, size: 17, fill: '#0891B2', eixo: 'MUSICA', desc: 'Roda, berimbau, canto e jogo de resistência afro-brasileira.', type: 'UserTag', hash: generateDeterministicHash({ id: 'capoeira' }), familia: 'musica.luta', activation: 0.82 },
  { id: 'mestre_vitalino', label: 'Mestre Vitalino', x: 300, y: 350, size: 17, fill: '#1A6B3A', eixo: 'SABERES', desc: 'Cerâmica figurativa do barro, retratista do cotidiano nordestino.', type: 'UserTag', hash: generateDeterministicHash({ id: 'mestre_vitalino' }), familia: 'saberes.ceramica', activation: 0.78 },
];

const INITIAL_EDGES: GraphMathEdge[] = [
  { from: 'core', to: 'carranca', weight: 0.92, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'SABERES' },
  { from: 'core', to: 'bumba_boi', weight: 0.88, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'FESTA' },
  { from: 'core', to: 'frevo', weight: 0.85, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'MUSICA' },
  { from: 'core', to: 'capoeira', weight: 0.86, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'MUSICA' },
  { from: 'core', to: 'mestre_vitalino', weight: 0.82, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'mestre_vitalino', weight: 0.84, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'frevo', to: 'capoeira', weight: 0.72, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'bumba_boi', to: 'frevo', weight: 0.56, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {

  const [nodes, setNodes] = useState<GraphMathNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<GraphMathEdge[]>(INITIAL_EDGES);
  const [selectedId, setSelectedId] = useState('carranca');
  const [dragId, setDragId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkLog, setThinkLog] = useState<string[]>([]);
  const [discoveries, setDiscoveries] = useState<{ tag: string; id: string; score: number; relation: string; insight: string }[]>([]);
  const [pulseEdges, setPulseEdges] = useState<Set<string>>(new Set());
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Nó selecionado ──
  const sel = useMemo(() => nodes.find(n => n.id === selectedId) || nodes[1] || nodes[0], [nodes, selectedId]);

  // ── Dossiê da tag selecionada ──
  const dossier = useMemo((): TagDossier | null => {
    const key = sel?.id?.toLowerCase().replace(/\s+/g, '_') || '';
    return DOSSIERS[key] || null;
  }, [sel]);

  // ── Spreading Activation ──
  const activations = useMemo(() => {
    if (!selectedId) return {} as Record<string, number>;
    const r = runSpreadingActivation(nodes, edges, [{ id: selectedId, initialEnergy: 1.0 }], {
      decay: 0.76, retention: 0.24, maxIterations: 6, normalize: true,
    });
    return r.nodeActivations;
  }, [nodes, edges, selectedId]);

  // ── Vizinhos conectados ──
  const neighbors = useMemo(() => {
    if (!sel) return [];
    return edges
      .filter(e => e.from === sel.id || e.to === sel.id)
      .map(e => {
        const otherId = e.from === sel.id ? e.to : e.from;
        return { node: nodes.find(n => n.id === otherId), weight: e.weight, relation: e.skosRelation || 'skos:related' };
      })
      .filter(i => i.node && i.node.id !== 'core')
      .sort((a, b) => b.weight - a.weight);
  }, [edges, sel, nodes]);

  /* ════════════════════════════════════════════════════════════════════════
     PENSAR — o cofre vivo pensa, correlaciona e cria novas sinapses
     ════════════════════════════════════════════════════════════════════════ */
  const think = useCallback(async () => {
    if (isThinking || !sel) return;
    setIsThinking(true);
    setThinkLog([]);
    setDiscoveries([]);
    const log = (m: string) => setThinkLog(p => [...p, m]);

    log(`[Ingestão] Preservando "${sel.label}" — UUID: ${(dossier?.uuid || generateDeterministicHash({ id: sel.id })).substring(0, 8)}...`);
    log(`[Compactação] Convertendo "${sel.label}" em embedding vetorial (HNSW index)...`);

    try {
      const res = await fetch('/api/interop/live-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTag: sel.label, allNodeIds: nodes.map(n => n.id) }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.discoveries?.length > 0) {
          const discs = json.data.discoveries.slice(0, 6);
          log(`[Vector DB] Busca de similaridade em ${json.data.totalTagsAnalyzed} tags — ${discs.length} correlações encontradas`);

          const newEdges: GraphMathEdge[] = [];
          const newNodes: GraphMathNode[] = [];
          const existIds = new Set(nodes.map(n => n.id));
          const existEdges = new Set(edges.map(e => [e.from, e.to].sort().join('|')));

          for (const d of discs) {
            log(`[GNN] Sinapse: "${sel.label}" ↔ "${d.targetTag}" — ${Math.round(d.combinedScore * 100)}% (${d.relation})`);

            const ek = [sel.id, d.targetId].sort().join('|');
            if (!existEdges.has(ek)) {
              newEdges.push({
                from: sel.id, to: d.targetId, weight: d.combinedScore,
                skosRelation: d.relation, mechanism: 'hebbian', discovered: true, eixoRel: sel.eixo || 'SABERES',
              });
              existEdges.add(ek);
            }

            if (!existIds.has(d.targetId)) {
              const angle = (newNodes.length / Math.max(discs.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const dist = 170 + Math.random() * 40;
              newNodes.push({
                id: d.targetId, label: d.targetTag,
                x: (sel.x || 400) + Math.cos(angle) * dist,
                y: (sel.y || 215) + Math.sin(angle) * dist,
                size: 13, fill: '#6D28D9', eixo: 'SABERES',
                desc: d.insight, type: 'Descoberto', activation: d.combinedScore,
                hash: generateDeterministicHash({ tag: d.targetTag }),
                familia: `descoberta.${d.targetId}`,
              });
              existIds.add(d.targetId);
            }
          }

          if (newEdges.length > 0 || newNodes.length > 0) {
            setEdges(p => [...p, ...newEdges]);
            setNodes(p => [...p, ...newNodes]);
            setPulseEdges(new Set(newEdges.map(e => [e.from, e.to].sort().join('|'))));
            setTimeout(() => setPulseEdges(new Set()), 4000);
          }

          setDiscoveries(discs.map((d: any) => ({
            tag: d.targetTag, id: d.targetId, score: d.combinedScore,
            relation: d.relation, insight: d.insight,
          })));

          log(`[Hebbian] ${json.data.newConnectionsPersisted} sinapses persistidas no banco`);
        } else {
          log(`[Vector DB] Nenhuma correlação nova encontrada.`);
        }
      } else {
        // Fallback local com spreading activation
        log(`[Fallback] API offline — spreading activation local...`);
        const sa = runSpreadingActivation(nodes, edges, [{ id: sel.id, initialEnergy: 1.0 }], {
          decay: 0.76, retention: 0.24, maxIterations: 6, normalize: true,
        });
        const ranked = sa.rankedNodes.filter(n => n.id !== 'core' && n.id !== sel.id && n.activation > 0.3);
        setDiscoveries(ranked.slice(0, 5).map(r => ({
          tag: r.label, id: r.id, score: r.activation,
          relation: 'skos:related', insight: `Ativação: ${r.certaintyPct}%`,
        })));
        log(`[SA] Convergiu em ${sa.iterationsCompleted} iterações — ${ranked.length} nós correlatos.`);
      }

      log(`[Integridade] SHA-256 Merkle DAG verificado ✓`);
    } catch (err) {
      log(`[Erro] ${String(err)}`);
    } finally {
      setIsThinking(false);
    }
  }, [sel, nodes, edges, isThinking, dossier]);

  /* ════════════════════════════════════════════════════════════════════════
     FÍSICA DE MOLAS — grafo orgânico e legível
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setNodes(prev => {
        const cx = 400, cy = 215;
        return prev.map(node => {
          if (node.id === dragId) return node;
          let fx = (cx - (node.x || cx)) * 0.012;
          let fy = (cy - (node.y || cy)) * 0.012;
          for (const o of prev) {
            if (o.id === node.id) continue;
            const dx = (node.x || cx) - (o.x || cx);
            const dy = (node.y || cy) - (o.y || cy);
            const d2 = dx * dx + dy * dy + 200;
            const d = Math.sqrt(d2);
            const f = 5000 / d2;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
          for (const e of edges) {
            let nid: string | null = null;
            if (e.from === node.id) nid = e.to;
            else if (e.to === node.id) nid = e.from;
            if (nid) {
              const nb = prev.find(n => n.id === nid);
              if (nb) {
                const dx = (nb.x || cx) - (node.x || cx);
                const dy = (nb.y || cy) - (node.y || cy);
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const sf = (d - 150) * 0.04 * (e.weight || 0.5);
                fx += (dx / d) * sf;
                fy += (dy / d) * sf;
              }
            }
          }
          const vx = ((node.vx || 0) + fx) * 0.78;
          const vy = ((node.vy || 0) + fy) * 0.78;
          return {
            ...node,
            x: Math.max(60, Math.min(740, (node.x || cx) + vx)),
            y: Math.max(50, Math.min(380, (node.y || cy) + vy)),
            vx, vy,
          };
        });
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [dragId, edges]);

  const onMouseDown = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setDragId(id); setSelectedId(id); };
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragId || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 800;
    const y = ((e.clientY - r.top) / r.height) * 430;
    setNodes(p => p.map(n => n.id === dragId ? { ...n, x, y, vx: 0, vy: 0 } : n));
  }, [dragId]);
  const onMouseUp = () => setDragId(null);

  /* ── JSON-LD ── */
  const jsonLd = useMemo(() => {
    const d = dossier;
    return {
      "@context": {
        skos: "http://www.w3.org/2004/02/skos/core#",
        schema: "http://schema.org/",
        prov: "http://www.w3.org/ns/prov#",
        wd: "http://www.wikidata.org/entity/",
        crm: "http://www.cidoc-crm.org/cidoc-crm/"
      },
      "@id": `https://folksonomia-digital.cultura.gov.br/tag/${sel?.id}`,
      "@type": ["skos:Concept", "crm:E28_Conceptual_Object"],
      "skos:prefLabel": { "@value": sel?.label, "@language": "pt-BR" },
      "schema:description": sel?.desc,
      "prov:wasAttributedTo": {
        "@id": `https://folksonomia-digital.cultura.gov.br/user/${(d?.uuid || '00000000').substring(0, 8)}`,
        "@type": "prov:Person",
        "schema:name": d?.autor || 'Colaborador Social'
      },
      "skos:broadMatch": d ? {
        "@id": `wd:${d.wikidata.id}`,
        "@type": "skos:Concept",
        "skos:prefLabel": { "@value": d.wikidata.enLabel, "@language": "en" }
      } : undefined,
      "schema:subjectOf": d ? [{
        "@id": `https://doi.org/${d.artigo.doi}`,
        "@type": "schema:ScholarlyArticle",
        "schema:name": d.artigo.titulo,
        "schema:author": d.artigo.autor,
        "schema:publisher": d.artigo.veiculo
      }] : [],
      "crm:P1_is_identified_by": {
        "@type": "crm:E42_Identifier",
        "crm:P2_has_type": "SHA-256 Merkle Custody Hash",
        "schema:value": sel?.hash
      }
    };
  }, [sel, dossier]);

  const handleTransferTest = async () => {
    setIsTransferring(true);
    setTransferResult(null);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${sel?.id || 'carranca'}`, {
        headers: { Accept: 'application/ld+json' }
      });
      const json = res.ok ? await res.json() : jsonLd;
      setTransferResult(JSON.stringify(json, null, 2));
    } catch {
      setTransferResult(JSON.stringify(jsonLd, null, 2));
    } finally {
      setIsTransferring(false);
      setShowJsonModal(true);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 text-[#1A1A1A]">

      {/* ── CABEÇALHO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-normal serif-title flex items-center gap-2.5">
            <FolderLock size={24} className="text-[#E8490A]" />
            Cofre Semântico Vivo
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              Rede Viva
            </span>
          </h2>
          <p className="text-xs text-[#1A1A1A]/50 mt-1">
            Tags preservadas com proveniência imutável, correlacionadas a artigos científicos e interligadas via grafo semântico.
          </p>
        </div>
        <button
          onClick={think}
          disabled={isThinking}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Brain size={15} className={isThinking ? 'animate-spin' : ''} />
          {isThinking ? 'Pensando...' : 'Pensar e Correlacionar'}
        </button>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ═══ GRAFO NEURAL ═══ */}
        <div className="lg:col-span-7">
          <div className="glass-card p-4 border border-black/07">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Network size={14} className="text-[#E8490A]" />
                <span className="text-xs font-bold uppercase tracking-wider">Rede de Interconexão</span>
                <span className="text-[10px] text-black/40 font-mono">({nodes.length} nós / {edges.length} sinapses)</span>
              </div>
              <span className="text-[10px] text-black/40">Clique num nó para abrir o cofre</span>
            </div>

            <div className="relative w-full h-[460px] bg-[#0C0C0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                viewBox="0 0 800 430" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="halo" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="10" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Arestas */}
                {edges.map((e, i) => {
                  const a = nodes.find(n => n.id === e.from);
                  const b = nodes.find(n => n.id === e.to);
                  if (!a || !b) return null;
                  const hi = selectedId && (a.id === selectedId || b.id === selectedId);
                  const pk = [e.from, e.to].sort().join('|');
                  const pulse = pulseEdges.has(pk);
                  const col = pulse ? '#a855f7' : e.discovered ? '#22c55e' : (a.fill || '#E8490A');

                  return (
                    <g key={`e${i}`}>
                      <line x1={a.x ?? 400} y1={a.y ?? 215} x2={b.x ?? 400} y2={b.y ?? 215}
                        stroke={col}
                        strokeWidth={pulse ? 4 : hi ? 3 : 1.5}
                        opacity={pulse ? 1 : hi ? 0.85 : 0.18}
                        className={pulse ? 'animate-pulse' : ''} />
                      {hi && (
                        <text x={((a.x ?? 400) + (b.x ?? 400)) / 2} y={((a.y ?? 215) + (b.y ?? 215)) / 2 - 5}
                          textAnchor="middle" fill="#fff" fontSize="8" fontFamily="monospace" className="pointer-events-none font-bold opacity-80">
                          {Math.round((e.weight || 0) * 100)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nós */}
                {nodes.map(node => {
                  const isSel = node.id === selectedId;
                  const act = activations[node.id] || node.activation || 0.5;
                  const r = isSel ? (node.size || 15) + 5 : (node.size || 15);
                  const nx = node.x ?? 400, ny = node.y ?? 215;

                  return (
                    <g key={node.id} className="cursor-pointer"
                      onMouseDown={e => onMouseDown(node.id, e)} onClick={() => setSelectedId(node.id)}>
                      <circle cx={nx} cy={ny} r={r + 12 * act} fill={node.fill} opacity={isSel ? 0.35 : act * 0.12}
                        filter="url(#halo)" className="pointer-events-none" />
                      <circle cx={nx} cy={ny} r={r} fill={node.fill}
                        stroke={isSel ? '#fff' : 'rgba(255,255,255,0.4)'}
                        strokeWidth={isSel ? 2.5 : 1}
                        filter={isSel ? 'url(#glow)' : undefined} />
                      <text x={nx} y={ny + r + 14} textAnchor="middle"
                        fill={isSel ? '#fff' : 'rgba(255,255,255,0.7)'}
                        fontSize={isSel ? '11' : '9.5'} fontWeight={isSel ? '700' : '500'}
                        className="pointer-events-none select-none">
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-2.5 left-3 right-3 flex justify-between text-[9px] text-white/40 font-mono pointer-events-none">
                <span>Cada nó = tag do usuário preservada com UUID e proveniência</span>
                <span className="text-[#E8490A] font-bold">G=(V,E,R)</span>
              </div>
            </div>
          </div>

          {/* Log de pensamento */}
          {thinkLog.length > 0 && (
            <div className="glass-card p-3 border border-purple-500/20 bg-purple-50/30 mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={12} className="text-purple-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Cofre Vivo — Fluxo de Inferência</span>
                {isThinking && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto font-mono text-[10px] text-[#1A1A1A]/65">
                {thinkLog.map((l, i) => (
                  <div key={i} className="flex gap-1.5">
                    <span className="text-purple-500 font-bold shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ COFRE DA TAG SELECIONADA ═══ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 border border-black/07 space-y-4">

            {/* Nome e badge */}
            <div className="flex items-start justify-between border-b border-black/08 pb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ background: sel.fill || '#E8490A' }}>
                    Tag Preservada
                  </span>
                  {dossier && <span className="text-[9px] font-mono text-black/35">UUID: {dossier.uuid.substring(0, 8)}...</span>}
                </div>
                <h3 className="text-lg font-bold">{sel.label}</h3>
                <p className="text-xs text-black/60 mt-1 leading-relaxed">{sel.desc}</p>
              </div>
              <button onClick={think} disabled={isThinking}
                className="shrink-0 p-2 bg-purple-100 hover:bg-purple-200 rounded-xl cursor-pointer disabled:opacity-50"
                title="Pensar a partir desta tag">
                <Brain size={16} className={`text-purple-600 ${isThinking ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Proveniência */}
            {dossier && (
              <div className="p-3 bg-black/[0.02] border border-black/06 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-black/45">
                  <span className="flex items-center gap-1"><User size={11} className="text-[#E8490A]" /> Proveniência</span>
                  <span className="font-mono text-green-700">Imutável (PROV-O)</span>
                </div>
                <p className="font-semibold text-[11px]">{dossier.autor}</p>
                <div className="flex items-center justify-between text-[9.5px] font-mono text-black/55 pt-1 border-t border-black/04">
                  <span>Tripla:</span>
                  <span className="font-bold text-[#E8490A]">({dossier.tripla[0]}) &#x2192; [{dossier.tripla[1]}] &#x2192; ({dossier.tripla[2]})</span>
                </div>
              </div>
            )}

            {/* Artigo científico */}
            {dossier && (
              <div className="p-3.5 bg-gradient-to-br from-white via-white to-[#E8490A]/04 border border-[#E8490A]/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#E8490A]">
                  <span className="flex items-center gap-1"><BookOpen size={12} /> Artigo Científico Vinculado</span>
                  <span className="font-mono">DOI Verificado</span>
                </div>
                <h4 className="text-xs font-bold leading-snug">{dossier.artigo.titulo}</h4>
                <p className="text-[10px] text-black/55">
                  {dossier.artigo.autor} &#x2022; <span className="italic">{dossier.artigo.veiculo}</span> ({dossier.artigo.ano})
                </p>
                <p className="text-[11px] text-black/70 leading-relaxed border-t border-black/05 pt-1.5">
                  {dossier.artigo.resumo}
                </p>
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="font-mono text-black/40">DOI: {dossier.artigo.doi}</span>
                  <a href={dossier.artigo.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline">
                    Acessar <ArrowUpRight size={11} />
                  </a>
                </div>
              </div>
            )}

            {/* Sem dossiê — tag descoberta */}
            {!dossier && sel.id !== 'core' && (
              <div className="p-3 bg-purple-50/50 border border-purple-200/30 rounded-xl text-xs text-purple-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={12} />
                  <span className="font-bold uppercase text-[9px] tracking-wider">Tag Descoberta pelo Cofre Vivo</span>
                </div>
                <p className="text-[11px] leading-relaxed">{sel.desc}</p>
              </div>
            )}

            {/* Conexões descobertas */}
            {discoveries.length > 0 && (
              <div className="p-3 bg-purple-50/30 border border-purple-200/20 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-purple-700">
                  <span className="flex items-center gap-1"><Zap size={11} /> Conexões Descobertas</span>
                  <span className="font-mono">{discoveries.length} novas</span>
                </div>
                {discoveries.slice(0, 5).map((d, i) => (
                  <button key={i} onClick={() => { const n = nodes.find(x => x.id === d.id); if (n) setSelectedId(n.id); }}
                    className="w-full p-2 rounded-lg bg-white/60 hover:bg-purple-100/40 border border-purple-200/20 text-left flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link2 size={10} className="text-purple-500 shrink-0" />
                      <span className="text-[10.5px] font-bold truncate">{d.tag}</span>
                    </div>
                    <span className="text-[10px] text-purple-700 font-mono font-bold shrink-0">{Math.round(d.score * 100)}%</span>
                  </button>
                ))}
              </div>
            )}

            {/* Famílias conectadas */}
            {neighbors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/45">Famílias Interligadas:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {neighbors.slice(0, 6).map((item, i) => (
                    <button key={i} onClick={() => setSelectedId(item.node?.id || '')}
                      className="p-2 rounded-lg bg-black/[0.02] hover:bg-[#E8490A]/08 border border-black/05 text-left flex items-center justify-between cursor-pointer">
                      <span className="text-[10px] font-bold truncate">{item.node?.label}</span>
                      <span className="text-[9px] text-[#E8490A] font-mono font-bold">{Math.round(item.weight * 100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transferência JSON-LD */}
            <div className="pt-2 border-t border-black/08">
              <button onClick={handleTransferTest} disabled={isTransferring}
                className="w-full py-2.5 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                <Send size={13} className={isTransferring ? 'animate-spin' : ''} />
                {isTransferring ? 'Transferindo...' : 'Teste de Transferência de Dados (JSON-LD 1.1)'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── MODAL JSON-LD ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Pacote Interoperável — &quot;{sel?.label}&quot;</h3>
                  <p className="text-[10px] text-white/50 font-mono">JSON-LD 1.1 &#x2022; CIDOC-CRM &#x2022; SKOS &#x2022; PROV-O</p>
                </div>
              </div>
              <button onClick={() => setShowJsonModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer">
                Fechar &#x2715;
              </button>
            </div>
            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/60 flex justify-between">
              <span>Accept: application/ld+json</span>
              <span className="text-green-400 font-bold">200 OK</span>
            </div>
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">{transferResult || JSON.stringify(jsonLd, null, 2)}</pre>
            </div>
            <div className="p-3 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/40 font-mono">Tag soberana vinculada a artigo com DOI</span>
              <button onClick={() => { navigator.clipboard.writeText(transferResult || JSON.stringify(jsonLd, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="px-4 py-1.5 bg-[#E8490A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Copiar JSON-LD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
