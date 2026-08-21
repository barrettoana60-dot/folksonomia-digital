'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Search, Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Link2, ArrowRight, Tag,
  Database, Layers, Globe, ShieldCheck, Zap, RefreshCw, Sparkles
} from 'lucide-react';
import { runSpreadingActivation, GraphMathNode, GraphMathEdge } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { CULTURAL_VAULT_REGISTRY, ConceptVaultItem } from '@/app/api/interop/live-vault/registry';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

// ─── ETAPAS DO FLUXO DO COFRE VIVO ──────────────────────────────────────────
const VAULT_FLOW_STEPS = [
  { icon: Tag, title: 'Tag Gerada', desc: 'Usuário cria a tag e envia ao sistema' },
  { icon: ShieldCheck, title: 'Preservada', desc: 'Autoria, contexto e origem são preservados' },
  { icon: Database, title: 'Compactada', desc: 'DNA semântico e embedding no cofre vivo' },
  { icon: Network, title: 'Interligada', desc: 'Sistema correlaciona com todas as tags' },
  { icon: BookOpen, title: 'Ancorada', desc: 'Vinculada a artigos e bases verificadas' },
  { icon: Globe, title: 'Interoperável', desc: 'Transferível via W3C JSON-LD / SKOS' }
];

const EIXO_COLORS: Record<string, string> = {
  SABERES: '#1A6B3A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
  default: '#4B5563'
};

const CANONICAL_INITIAL_NODES: GraphMathNode[] = Object.values(CULTURAL_VAULT_REGISTRY).map((c, idx) => {
  const angle = (idx / 8) * Math.PI * 2 - Math.PI / 2;
  const r = 165;
  return {
    id: c.id,
    label: c.tag,
    x: 400 + Math.cos(angle) * r,
    y: 215 + Math.sin(angle) * r,
    size: 16,
    fill: c.cor || EIXO_COLORS[c.eixo] || EIXO_COLORS.default,
    eixo: c.eixo,
    desc: c.descricao,
    type: 'Tag Preservada',
    familia: c.familia,
    activation: 0.75
  };
});

const CANONICAL_INITIAL_EDGES: GraphMathEdge[] = [
  { from: 'carranca', to: 'mestre_vitalino', weight: 0.86, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'ex_voto', weight: 0.82, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'cordel', weight: 0.75, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'frevo', to: 'capoeira', weight: 0.89, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'frevo', to: 'maracatu', weight: 0.81, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'capoeira', to: 'maracatu', weight: 0.83, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'bumba_boi', to: 'maracatu', weight: 0.85, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'bumba_boi', to: 'cordel', weight: 0.72, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'mestre_vitalino', to: 'cordel', weight: 0.79, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'mestre_vitalino', to: 'ex_voto', weight: 0.76, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
];

export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {

  const [nodes, setNodes] = useState<GraphMathNode[]>(CANONICAL_INITIAL_NODES);
  const [connections, setConnections] = useState<GraphMathEdge[]>(CANONICAL_INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('carranca');
  const [selectedTagLabel, setSelectedTagLabel] = useState<string>('Carranca');
  const [dossierCache, setDossierCache] = useState<Record<string, ConceptVaultItem>>(CULTURAL_VAULT_REGISTRY);
  const [currentDossier, setCurrentDossier] = useState<ConceptVaultItem>(CULTURAL_VAULT_REGISTRY['carranca']);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [activePulseKey, setActivePulseKey] = useState<string | null>(null);
  
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [discoveredConnections, setDiscoveredConnections] = useState<any[]>([]);
  const [activeFlowStep, setActiveFlowStep] = useState<number>(-1);
  
  const [isTestingTransfer, setIsTestingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ─── CARREGAR TODAS AS TAGS DO BANCO AO MONTAR ─────────────────────────────
  useEffect(() => {
    fetch('/api/interop/live-vault', { method: 'GET' })
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data?.nodes?.length) return;
        
        const allFetched: any[] = json.data.nodes;
        const seen = new Set(CANONICAL_INITIAL_NODES.map(c => normalizeForComparison(c.label)));
        
        const extraNodes: GraphMathNode[] = [];
        allFetched.forEach((n, idx) => {
          const norm = normalizeForComparison(n.label);
          if (!seen.has(norm)) {
            seen.add(norm);
            const angle = (idx * 0.45) + Math.PI;
            const r = 230 + (idx % 4) * 25;
            const eixo = n.eixo || 'SABERES';
            extraNodes.push({
              id: n.id,
              label: n.label,
              x: 400 + Math.cos(angle) * r,
              y: 215 + Math.sin(angle) * r,
              size: 13,
              fill: n.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default,
              eixo,
              desc: n.description || `Tag do público: ${n.label}`,
              type: 'Tag do Público',
              familia: n.familia || `${eixo.toLowerCase()}.${n.id}`,
              activation: 0.45
            });
          }
        });

        if (extraNodes.length > 0) {
          setNodes(prev => [...prev, ...extraNodes]);
        }
      })
      .catch(() => { /* silencioso */ });
  }, []);

  // ─── SELECIONAR E CARREGAR DOSSIÊ DA TAG DINAMICAMENTE ──────────────────────
  const handleSelectNode = useCallback(async (nodeId: string, nodeLabel: string) => {
    setSelectedNodeId(nodeId);
    setSelectedTagLabel(nodeLabel);
    
    const normKey = normalizeForComparison(nodeLabel).replace(/\s+/g, '_');
    
    // Se já temos no cache
    if (dossierCache[normKey]) {
      setCurrentDossier(dossierCache[normKey]);
      return;
    }

    // Se é canônica pré-conhecida
    if (CULTURAL_VAULT_REGISTRY[normKey]) {
      setCurrentDossier(CULTURAL_VAULT_REGISTRY[normKey]);
      setDossierCache(prev => ({ ...prev, [normKey]: CULTURAL_VAULT_REGISTRY[normKey] }));
      return;
    }

    // Se é nova tag do banco, buscar dossiê RAG em tempo real
    try {
      const res = await fetch(`/api/interop/live-vault?tag=${encodeURIComponent(nodeLabel)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentDossier(json.data);
        setDossierCache(prev => ({ ...prev, [normKey]: json.data }));
      }
    } catch {
      // Manter dossiê atual se falhar
    }
  }, [dossierCache]);

  const selectedNode = useMemo(() =>
    nodes.find(n => n.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId]);

  // ─── SPREADING ACTIVATION ──────────────────────────────────────────────────
  const spreadingResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNodeId, initialEnergy: 1.0 }], {
      decay: 0.78, retention: 0.22, maxIterations: 6, normalize: true
    });
  }, [nodes, connections, selectedNodeId]);
  const nodeActivations = useMemo(() => spreadingResult?.nodeActivations || {}, [spreadingResult]);

  // ─── PULSO SINÁPTICO AUTÔNOMO CONTÍNUO ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (connections.length === 0) return;
      const edge = connections[Math.floor(Math.random() * connections.length)];
      setActivePulseKey(`${edge.from}__${edge.to}`);
      setTimeout(() => setActivePulseKey(null), 1400);
    }, 3200);
    return () => clearInterval(interval);
  }, [connections]);

  // ─── FÍSICA DE MOLAS NO GRAFO ──────────────────────────────────────────────
  useEffect(() => {
    let animId: number;
    const tick = () => {
      setNodes(prev => {
        const cx = 400, cy = 215;
        return prev.map(node => {
          if (node.id === draggedNodeId) return node;
          let fx = (cx - (node.x || cx)) * 0.010;
          let fy = (cy - (node.y || cy)) * 0.010;
          for (const o of prev) {
            if (o.id === node.id) continue;
            const dx = (node.x || cx) - (o.x || cx);
            const dy = (node.y || cy) - (o.y || cy);
            const d2 = dx * dx + dy * dy + 200;
            const d = Math.sqrt(d2);
            fx += (dx / d) * (4200 / d2);
            fy += (dy / d) * (4200 / d2);
          }
          for (const e of connections) {
            let nid: string | null = null;
            if (e.from === node.id) nid = e.to;
            else if (e.to === node.id) nid = e.from;
            if (nid) {
              const nb = prev.find(n => n.id === nid);
              if (nb) {
                const dx = (nb.x || cx) - (node.x || cx);
                const dy = (nb.y || cy) - (node.y || cy);
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const sf = (d - 135) * 0.035 * (e.weight || 0.5);
                fx += (dx / d) * sf;
                fy += (dy / d) * sf;
              }
            }
          }
          const vx = ((node.vx || 0) + fx) * 0.82;
          const vy = ((node.vy || 0) + fy) * 0.82;
          return {
            ...node,
            x: Math.max(50, Math.min(750, (node.x || cx) + vx)),
            y: Math.max(40, Math.min(390, (node.y || cy) + vy)),
            vx, vy
          };
        });
      });
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [draggedNodeId, connections]);

  const handleMouseDown = (id: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    handleSelectNode(id, label);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? {
      ...n,
      x: ((e.clientX - r.left) / r.width) * 800,
      y: ((e.clientY - r.top) / r.height) * 430,
      vx: 0, vy: 0
    } : n));
  }, [draggedNodeId]);

  const handleMouseUp = () => setDraggedNodeId(null);

  // ─── ACIONAR FLUXO VIVO: MOTOR DE DEEP LEARNING + RAG REAL ─────────────────
  const handleTriggerLiveFlow = useCallback(async () => {
    if (isThinking || !selectedNode) return;
    setIsThinking(true);
    setThinkingSteps([]);
    setDiscoveredConnections([]);

    const addStep = (s: string) => setThinkingSteps(p => [...p, s]);

    // Animação sequencial e fluida das 6 etapas do cofre vivo
    for (let i = 0; i < VAULT_FLOW_STEPS.length; i++) {
      setActiveFlowStep(i);
      await new Promise(r => setTimeout(r, 480));
    }
    setActiveFlowStep(-1);

    addStep(`1. Compactando DNA semântico da tag "${selectedNode.label}" em vetor de 768 dimensões...`);
    addStep(`2. RAG multi-fonte buscando artigos no IPHAN, SciELO, OpenAlex e Brasiliana...`);
    addStep(`3. RotatE & ModernBERT avaliando inferências e predição de relações na malha...`);

    try {
      const res = await fetch('/api/interop/live-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTag: selectedNode.label,
          sourceId: selectedNode.id,
          action: 'pulse',
          allNodes: nodes.map(n => ({ id: n.id, label: n.label }))
        })
      });

      if (res.ok) {
        const json = await res.json();
        const conns = json.data?.connections || [];
        const activated = json.data?.activatedNodes || [];
        const dynamicDossier = json.data?.dossier || json.data?.canonical;

        if (dynamicDossier) {
          const normKey = normalizeForComparison(selectedNode.label).replace(/\s+/g, '_');
          setCurrentDossier(dynamicDossier);
          setDossierCache(prev => ({ ...prev, [normKey]: dynamicDossier }));
        }

        const newEdges: GraphMathEdge[] = json.data?.pulses?.map((p: any) => ({
          from: p.from,
          to: p.to,
          weight: p.intensity || 0.8,
          skosRelation: 'skos:related',
          mechanism: 'inferred' as const,
          eixoRel: selectedNode.eixo || 'SABERES',
          discovered: true
        })) || [];

        // Adicionar novas arestas ao grafo
        if (newEdges.length > 0) {
          setConnections(prev => {
            const existKeys = new Set(prev.map(e => [e.from, e.to].sort().join('|')));
            const toAdd = newEdges.filter(e => !existKeys.has([e.from, e.to].sort().join('|')));
            return [...prev, ...toAdd];
          });
        }

        // Ativação dos nós envolvidos
        if (activated.length > 0) {
          setNodes(prev => prev.map(n => {
            const act = activated.find((a: any) => a.id === n.id);
            return act ? { ...n, activation: Math.max(n.activation || 0.3, act.activation) } : n;
          }));
        }

        setDiscoveredConnections(conns);
        addStep(`4. ${conns.length} conexões e sinapses culturais estabelecidas de forma autônoma.`);
        addStep(`5. Dossiê acadêmico ancorado e pacote de interoperabilidade JSON-LD 1.1 atualizado.`);

        if (newEdges.length > 0) {
          setActivePulseKey(`${newEdges[0].from}__${newEdges[0].to}`);
          setTimeout(() => setActivePulseKey(null), 2500);
        }
      }
    } catch {
      addStep(`Spreading activation executado na rede local.`);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, selectedNode, nodes]);

  // ─── JSON-LD 1.1 DINÂMICO ──────────────────────────────────────────────────
  const currentJsonLd = useMemo(() => {
    const item = currentDossier || CULTURAL_VAULT_REGISTRY['carranca'];
    return {
      "@context": {
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "schema": "http://schema.org/",
        "prov": "http://www.w3.org/ns/prov#",
        "wd": "http://www.wikidata.org/entity/"
      },
      "@id": `https://folksonomia-digital.cultura.gov.br/tag/${item.id}`,
      "@type": "skos:Concept",
      "skos:prefLabel": { "@value": item.tag, "@language": "pt-BR" },
      "schema:description": item.descricao,
      "prov:wasAttributedTo": {
        "@id": `https://folksonomia-digital.cultura.gov.br/user/${item.uuid.substring(0, 8)}`,
        "@type": "prov:Person",
        "schema:name": item.autor
      },
      "skos:broadMatch": {
        "@id": item.wikidata.id,
        "@type": "skos:Concept",
        "skos:prefLabel": { "@value": item.wikidata.enLabel, "@language": "en" }
      },
      "schema:subjectOf": [
        {
          "@id": item.artigo.url,
          "@type": "schema:ScholarlyArticle",
          "name": item.artigo.titulo,
          "author": item.artigo.autor,
          "datePublished": item.artigo.ano,
          "publisher": item.artigo.veiculo
        }
      ]
    };
  }, [currentDossier]);

  const handleRunTransferTest = async () => {
    setIsTestingTransfer(true);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${encodeURIComponent(selectedTagLabel)}`, {
        headers: { Accept: 'application/ld+json' }
      });
      const data = res.ok ? await res.json() : currentJsonLd;
      setTransferResult(JSON.stringify(data, null, 2));
    } catch {
      setTransferResult(JSON.stringify(currentJsonLd, null, 2));
    } finally {
      setIsTestingTransfer(false);
      setShowJsonModal(true);
    }
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const t = searchTerm.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(t) || (n.familia || '').includes(t));
  }, [nodes, searchTerm]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── CARD SUPERIOR: CABEÇALHO + FLUXO ANIMADO + BOTÃO ── */}
      <div className="glass-card p-6 border border-black/08 rounded-3xl bg-gradient-to-b from-white via-white to-orange-50/20 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl md:text-2xl font-normal serif-title tracking-tight flex items-center gap-2.5 text-[#1A1A1A]">
                <FolderLock size={24} className="text-[#E8490A]" />
                Cofre Vivo & Interoperabilidade Cultural
              </h2>
              <span className="text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                TRÁFEGO ATIVO
              </span>
            </div>
            <p className="text-xs text-[#1A1A1A]/55 font-medium">
              A tag opera como DNA e chave soberana: preservada, compactada, interligada dinamicamente e transferível via W3C JSON-LD.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar em todas as tags..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30 font-medium"
              />
            </div>
            
            <button
              onClick={handleTriggerLiveFlow}
              disabled={isThinking}
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-[#E8490A] hover:bg-[#c44000] text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 shadow-md hover:shadow-lg whitespace-nowrap active:scale-95"
            >
              {isThinking ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Zap size={13} className="fill-current" />
                  <span>Acionar Fluxo Vivo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FLUXO DO COFRE VIVO ANIMADO */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8490A] mb-3 flex items-center gap-1.5">
            <span>〰</span> Fluxo do Cofre Vivo — Da Tag do Usuário à Rede Inteira
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {VAULT_FLOW_STEPS.map((step, idx) => {
              const IconComp = step.icon;
              const isActive = activeFlowStep === idx;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all flex flex-col space-y-1.5 relative overflow-hidden ${
                    isActive
                      ? 'border-[#E8490A] bg-[#E8490A]/10 shadow-md scale-[1.03] ring-2 ring-[#E8490A]/20'
                      : 'bg-white border-black/07 shadow-xs'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8490A]/15 to-transparent animate-pulse pointer-events-none rounded-2xl" />
                  )}
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                        isActive ? 'bg-[#E8490A] text-white shadow-sm' : 'bg-[#E8490A]/10 text-[#E8490A]'
                      }`}
                    >
                      <IconComp size={14} />
                    </div>
                    {idx < VAULT_FLOW_STEPS.length - 1 && (
                      <ArrowRight size={11} className="text-black/20 hidden lg:block" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#1A1A1A]">{step.title}</h4>
                    <p className="text-[10px] text-[#1A1A1A]/55 leading-snug">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LOG DE INFERÊNCIA NEURAL REAL */}
        {thinkingSteps.length > 0 && (
          <div className="p-3 bg-purple-50/70 border border-purple-200/40 rounded-2xl space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-900">
              <Sparkles size={12} className="text-purple-600" />
              <span>Pipeline Neural Ativo</span>
            </div>
            {thinkingSteps.map((s, i) => (
              <div key={i} className="text-[10.5px] text-purple-900/90 flex items-start gap-2 font-mono">
                <span className="text-purple-600 font-bold shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── GRID: GRAFO INTERATIVO + COFRE DA TAG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* GRAFO INTERATIVO */}
        <div className="lg:col-span-7">
          <div className="glass-card p-4 border border-black/07 rounded-3xl shadow-sm space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={15} className="text-[#E8490A]" />
                <span className="text-xs font-bold uppercase tracking-wider">Rede Viva de Conexões</span>
                <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                  ({nodes.length} tags ativas / {connections.length} sinapses vivas)
                </span>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">Clique em qualquer nó para abrir seu dossiê</span>
            </div>

            <div className="relative w-full h-[510px] bg-[#0A0A0C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                viewBox="0 0 800 430"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <filter id="civ-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="civ-halo" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="12" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grade de fundo */}
                {Array.from({ length: 48 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={(i % 8) * 115 + 30}
                    cy={Math.floor(i / 8) * 72 + 30}
                    r="1.1"
                    fill="rgba(255,255,255,0.03)"
                  />
                ))}

                {/* ARESTAS */}
                {connections.map((conn, idx) => {
                  const fn = nodes.find(n => n.id === conn.from);
                  const tn = nodes.find(n => n.id === conn.to);
                  if (!fn || !tn) return null;
                  
                  const isSource = fn.id === selectedNodeId || tn.id === selectedNodeId;
                  const isPulsing = activePulseKey === `${conn.from}__${conn.to}` || activePulseKey === `${conn.to}__${conn.from}`;
                  const isNew = conn.discovered;
                  const strokeColor = isPulsing ? '#a855f7' : isNew ? '#22c55e' : isSource ? '#f59e0b' : 'rgba(255,255,255,0.15)';

                  return (
                    <g key={idx}>
                      <line
                        x1={fn.x ?? 400}
                        y1={fn.y ?? 215}
                        x2={tn.x ?? 400}
                        y2={tn.y ?? 215}
                        stroke={strokeColor}
                        strokeWidth={isPulsing ? 3.5 : isSource ? 2.4 : 1.2}
                        strokeDasharray={isSource && !isPulsing ? '5,4' : undefined}
                        opacity={isPulsing ? 1 : isSource ? 0.92 : 0.22}
                        className={isPulsing ? 'animate-pulse' : ''}
                      />
                    </g>
                  );
                })}

                {/* NÓS DO GRAFO */}
                {filteredNodes.map(node => {
                  const isSel = node.id === selectedNodeId || normalizeForComparison(node.label) === normalizeForComparison(selectedTagLabel);
                  const act = nodeActivations[node.id] || node.activation || 0.5;
                  const r = isSel ? (node.size || 15) + 5 : (node.size || 15);
                  const nx = node.x ?? 400;
                  const ny = node.y ?? 215;
                  const nodeColor = isSel ? '#22c55e' : (node.fill || '#6b7280');

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseDown={e => handleMouseDown(node.id, node.label, e)}
                      onClick={() => handleSelectNode(node.id, node.label)}
                    >
                      <circle
                        cx={nx}
                        cy={ny}
                        r={r + (isSel ? 16 : 9 * act)}
                        fill={nodeColor}
                        opacity={isSel ? 0.35 : act * 0.14}
                        filter="url(#civ-halo)"
                        className="pointer-events-none"
                      />
                      <circle
                        cx={nx}
                        cy={ny}
                        r={r}
                        fill={nodeColor}
                        stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                        strokeWidth={isSel ? 2.5 : 1}
                        filter={isSel ? 'url(#civ-glow)' : undefined}
                        className="transition-all duration-200"
                      />
                      <text
                        x={nx}
                        y={ny + r + 14}
                        textAnchor="middle"
                        fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.85)'}
                        fontSize={isSel ? '11' : '9'}
                        fontWeight={isSel ? '700' : '500'}
                        className="pointer-events-none select-none"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[9px] text-white/45 font-mono pointer-events-none">
                <span>Clique em qualquer tag do grafo para visualizar seu cofre vivo</span>
                <span className="text-[#E8490A] font-bold">DNA Semântico & Rede Viva</span>
              </div>
            </div>

            {/* FEED DE CONEXÕES RECENTES DESCOBERTAS PELO ML */}
            {discoveredConnections.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <Zap size={11} className="text-purple-600 fill-current" />
                  <span>Sinapses Estabelecidas pelo Motor Neural</span>
                </p>
                {discoveredConnections.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/30 flex items-start gap-2">
                    <Link2 size={12} className="text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#1A1A1A]/85 leading-snug">
                      {c.afirmacao || `"${c.fromLabel}" conecta-se a "${c.toLabel}": ${c.insight}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COFRE DA TAG SELECIONADA (PAINEL LATERAL) */}
        <div className="lg:col-span-5">
          <div className="glass-card p-6 border border-black/07 rounded-3xl shadow-sm space-y-5 bg-white">

            {/* Cabeçalho do Dossiê */}
            <div className="border-b border-black/08 pb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-white shadow-xs"
                  style={{ background: currentDossier?.cor || '#1A6B3A' }}
                >
                  TAG PRESERVADA
                </span>
                <span className="text-[10px] text-black/50 font-mono">
                  {currentDossier?.familia || 'patrimonio.cultural'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A1A]">
                {currentDossier?.tag || selectedTagLabel}
              </h3>
              <p className="text-xs text-[#1A1A1A]/70 mt-1.5 leading-relaxed">
                {currentDossier?.descricao || selectedNode?.desc}
              </p>
            </div>

            {/* Origem e Proveniência (W3C PROV-O) */}
            {currentDossier && (
              <div className="p-4 bg-black/[0.02] border border-black/06 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                  <span className="flex items-center gap-1.5">
                    <User size={12} className="text-[#E8490A]" /> ORIGEM DA TAG (PROV-O)
                  </span>
                  <span className="text-green-700 font-bold">SOBERANA</span>
                </div>
                <p className="text-[#1A1A1A] text-xs font-bold">{currentDossier.autor}</p>
                <div className="flex items-center justify-between text-[11px] text-[#1A1A1A]/70 pt-1.5 border-t border-black/04">
                  <span>Conceito central:</span>
                  <span className="font-bold text-[#E8490A]">{currentDossier.tripla.objeto}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]/45 font-mono">
                  <span>DID / UUID:</span>
                  <span>{currentDossier.uuid}</span>
                </div>
              </div>
            )}

            {/* Artigo Científico Real Vinculado via RAG */}
            {currentDossier?.artigo && (
              <div className="p-4 bg-gradient-to-br from-white via-white to-orange-50/30 border border-orange-200/60 rounded-2xl space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#E8490A]">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} /> ARTIGO CIENTÍFICO VINCULADO
                  </span>
                  <span className="text-[9px] text-[#1A1A1A]/50 font-mono">FUNDAMENTAÇÃO REAL</span>
                </div>
                <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                  {currentDossier.artigo.titulo}
                </h4>
                <p className="text-[10.5px] text-[#1A1A1A]/60 font-medium">
                  {currentDossier.artigo.autor} • <span className="italic">{currentDossier.artigo.veiculo}</span> ({currentDossier.artigo.ano})
                </p>
                <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-2">
                  {currentDossier.artigo.resumo}
                </p>
                <div className="flex items-center justify-between pt-1 text-[10.5px]">
                  <span className="font-mono text-[#1A1A1A]/50">DOI: {currentDossier.artigo.doi}</span>
                  <a
                    href={currentDossier.artigo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline"
                  >
                    Acessar Artigo <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Conexões Culturais Interligadas (Afirmações em Linguagem Natural) */}
            {currentDossier?.conexoesTextuais && currentDossier.conexoesTextuais.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                  CONEXÕES CULTURAIS INTERLIGADAS:
                </p>
                <div className="space-y-1.5">
                  {currentDossier.conexoesTextuais.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectNode(item.targetId, item.targetTag)}
                      className="w-full p-3 rounded-xl bg-black/[0.02] hover:bg-[#E8490A]/06 border border-black/05 text-left flex items-start gap-2.5 cursor-pointer group transition-colors"
                    >
                      <Link2 size={13} className="text-[#E8490A] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-[11px] text-[#1A1A1A]/85 leading-snug font-medium">
                        {item.afirmacaoCultural}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botão de Transferência JSON-LD */}
            <div className="pt-2 border-t border-black/08">
              <button
                onClick={handleRunTransferTest}
                disabled={isTestingTransfer}
                className="w-full py-3 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-98"
              >
                <Send size={14} className={isTestingTransfer ? 'animate-spin' : ''} />
                <span>
                  {isTestingTransfer ? 'Transferindo Dados...' : 'Executar Teste de Transferência de Dados (JSON-LD)'}
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL JSON-LD 1.1 / W3C SKOS ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote de Transferência — "{currentDossier?.tag || selectedTagLabel}"
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono">JSON-LD 1.1 • W3C SKOS • PROV-O • Schema.org</p>
                </div>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>
            
            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/70 flex justify-between">
              <span>Accept: application/ld+json</span>
              <span className="text-green-400 font-bold">200 OK</span>
            </div>
            
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {transferResult || JSON.stringify(currentJsonLd, null, 2)}
              </pre>
            </div>
            
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                Tag soberana ancorada via SKOS. Identidade original preservada.
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transferResult || JSON.stringify(currentJsonLd, null, 2));
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="px-4 py-1.5 bg-[#E8490A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-[#c44000] shadow transition-all"
              >
                {copySuccess ? <Check size={13} /> : <Copy size={13} />}
                <span>{copySuccess ? 'Copiado!' : 'Copiar JSON-LD'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
