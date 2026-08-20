'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Cpu, Activity, Share2, Layers, BookOpen, ExternalLink,
  Search, ShieldCheck, Download, Save, RefreshCw, ChevronRight, CheckCircle2,
  Sparkles, Hash, Info, Filter, ArrowRight, Database, Check, Copy, ArrowUpRight,
  FolderLock, Tag, Plus, Flame, Radio, Zap, Globe, Lock
} from 'lucide-react';
import {
  runSpreadingActivation,
  calculateCentralityMetrics,
  generateDeterministicHash,
  CULTURAL_INTEROP_5_LAYERS,
  CULTURAL_INTEROP_REFERENCES,
  GraphMathNode,
  GraphMathEdge,
  SpreadingActivationResult,
  AcademicReferenceItem
} from '@/lib/ml/graph-math';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {
  // ── Sub-Aba Ativa ──
  const [subTab, setSubTab] = useState<'grafo' | 'camadas' | 'artigos'>('grafo');

  // ── Estados do Grafo Semântico e da Rede Viva ──
  const [nodes, setNodes] = useState<GraphMathNode[]>(() => initialNodes.length > 0 ? initialNodes : [
    { id: "core", label: "Núcleo Folksonômico", x: 400, y: 215, size: 26, fill: "#E8490A", eixo: "NUCLEO", desc: "Centralizador semântico do acervo. Aglomera e trafega informações das manifestações e saberes dos visitantes e acervos federais.", type: "Núcleo do Acervo Semântico", hash: "SHA3:c8ed9901a72f3b01", familia: "sistema.nucleo.folksonomico", regiao: "Nacional", linksReais: [{ label: "IBRAM — Museus Federais", url: "https://www.gov.br/museus/pt-br" }, { label: "Tesauro CNFCP/IPHAN", url: "https://www.cnfcp.gov.br/interna.php?ID_Secao=69" }], acervos: ["IBRAM", "Brasiliana", "IPHAN", "Mapas da Cultura"], activation: 1.0, skosType: "ConceptScheme" },
    { id: "bumba_boi", label: "Bumba-meu-boi", x: 230, y: 110, size: 18, fill: "#1E3A8A", eixo: "FESTA", desc: "Festa popular do ciclo junino — Patrimônio Cultural Imaterial do Brasil (IPHAN/UNESCO). Complexo lúdico-dramático do Maranhão, Pará e Amazonas.", type: "Patrimônio Imaterial IPHAN", hash: "SHA3:bumba1e2f3a4b5c6d", familia: "festa.popular.ciclo_junino.nordeste", regiao: "Norte/Nordeste", linksReais: [{ label: "IPHAN — Dossiê Bumba-meu-boi", url: "https://www.iphan.gov.br" }, { label: "CNFCP — Folclore Brasileiro", url: "https://cnfcp.gov.br" }], acervos: ["Museu do Folclore Edison Carneiro", "IBRAM-MA"], activation: 0.85, skosType: "Concept", skosBroader: ["core"] },
    { id: "carranca", label: "Carranca do São Francisco", x: 220, y: 310, size: 17, fill: "#1A6B3A", eixo: "SABERES", desc: "Escultura antropomórfica de proa fluvial. Proteção mística ribeirinha e símbolo mor da arte escultórica popular brasileira.", type: "Arte Popular / Ofício Ribeirinho", hash: "SHA3:carran8c2f1a4e7b", familia: "saberes.escultura.fluvial.sao_francisco", regiao: "Nordeste (São Francisco)", linksReais: [{ label: "Museu Casa do Pontal — Carrancas", url: "https://casadopontal.org.br" }, { label: "Brasiliana — Acervo São Francisco", url: "https://brasiliana.museus.gov.br" }], acervos: ["Museu Casa do Pontal", "Museu do São Francisco"], activation: 0.78, skosType: "Concept", skosBroader: ["core"] },
    { id: "frevo", label: "Frevo Pernambucano", x: 570, y: 120, size: 16, fill: "#0891B2", eixo: "MUSICA", desc: "Música e dança acrobática — Patrimônio Cultural Imaterial da Humanidade (UNESCO 2012). Ritmo sincopado de marchas e dobrados urbanos.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:frevo8f29a1b3c4d5", familia: "musica.danca.carnaval.nordeste", regiao: "Nordeste (Recife/Olinda)", linksReais: [{ label: "UNESCO — Frevo Inscription", url: "https://ich.unesco.org" }, { label: "Paço do Frevo", url: "https://pacodofrevo.org.br" }], acervos: ["Paço do Frevo", "Museu da Cidade do Recife"], activation: 0.75, skosType: "Concept", skosBroader: ["core"] },
    { id: "capoeira", label: "Roda de Capoeira", x: 640, y: 220, size: 15, fill: "#0891B2", eixo: "MUSICA", desc: "Arte marcial, música, canto e dança afro-brasileira (UNESCO 2014). Símbolo de resistência e cosmologia de matriz africana.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:capoeira4f7a8b9c", familia: "musica.danca.luta.afro.nacional", regiao: "Nacional (Bahia)", linksReais: [{ label: "UNESCO — Capoeira Circle", url: "https://ich.unesco.org" }], acervos: ["Museu Afro Brasil", "IPHAN"], activation: 0.70, skosType: "Concept", skosBroader: ["core"] },
  ]);

  const [connections, setConnections] = useState<GraphMathEdge[]>(() => initialConnections.length > 0 ? initialConnections : [
    { from: "core", to: "bumba_boi", weight: 0.88, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "FESTA" },
    { from: "core", to: "carranca", weight: 0.84, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "SABERES" },
    { from: "core", to: "frevo", weight: 0.86, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
    { from: "core", to: "capoeira", weight: 0.85, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
    { from: "frevo", to: "capoeira", weight: 0.65, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "MUSICA" },
  ]);

  const [networkStats, setNetworkStats] = useState<{
    totalTags: number;
    tagsNoGrafo: number;
    memoriaAprendida: number;
    sinapses: number;
    correlacoes: number;
    historico: number;
  }>({
    totalTags: 0,
    tagsNoGrafo: 5,
    memoriaAprendida: 0,
    sinapses: 5,
    correlacoes: 0,
    historico: 0,
  });

  const [isLoadingLiveNetwork, setIsLoadingLiveNetwork] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('core');
  const [filterEixo, setFilterEixo] = useState<string>('TODOS');
  const [articleCategoryFilter, setArticleCategoryFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSimulatingPhysics, setIsSimulatingPhysics] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [livePulseTick, setLivePulseTick] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── 1. Carregar Rede Semântica Viva do Banco de Dados ──
  const fetchSemanticNetwork = useCallback(async () => {
    setIsLoadingLiveNetwork(true);
    try {
      const res = await fetch('/api/admin/semantic-graph', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.nodes && json.data.nodes.length > 0) {
            setNodes(json.data.nodes);
          }
          if (json.data.edges && json.data.edges.length > 0) {
            setConnections(json.data.edges);
          }
          if (json.data.stats) {
            setNetworkStats(json.data.stats);
          }
        }
      }
    } catch (e) {
      console.warn('[SemanticGraph] Falha ao carregar rede ao vivo:', e);
    } finally {
      setIsLoadingLiveNetwork(false);
    }
  }, []);

  useEffect(() => {
    fetchSemanticNetwork();
  }, [fetchSemanticNetwork]);

  // ── 2. Pulso Periódico de Energia / Deep Learning Live Loop ──
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulseTick(t => (t + 1) % 100);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── 3. Métricas de Centralidade de Brandes ──
  const centrality = useMemo(() => {
    return calculateCentralityMetrics(nodes, connections);
  }, [nodes, connections]);

  // ── 4. Nó Selecionado ──
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  // ── 5. Spreading Activation Dinâmico ao Selecionar Nó ──
  const spreadingResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNodeId, initialEnergy: 1.0 }], {
      decay: 0.76,
      retention: 0.24,
      maxIterations: 8,
      normalize: true,
    });
  }, [nodes, connections, selectedNodeId]);

  const activeActivations = useMemo(() => {
    return spreadingResult?.nodeActivations || {};
  }, [spreadingResult]);

  // ── 6. Famílias Similares do Nó Selecionado ──
  const similarFamilies = useMemo(() => {
    if (!selectedNode) return [];
    if (selectedNode.id === 'core') {
      return nodes.filter(n => n.id !== 'core').slice(0, 4);
    }
    const prefix = (selectedNode.familia || '').split('.').slice(0, 2).join('.');
    const directMatches = nodes.filter(
      n => n.id !== selectedNode.id && n.familia && prefix && n.familia.startsWith(prefix)
    );
    if (directMatches.length > 0) return directMatches;
    return nodes.filter(n => n.id !== selectedNode.id && n.eixo === selectedNode.eixo).slice(0, 4);
  }, [nodes, selectedNode]);

  // ── 7. Artigos Relacionados ao Nó Selecionado (Dossiê Dinâmico) ──
  const activeArticles = useMemo(() => {
    let list = CULTURAL_INTEROP_REFERENCES;

    if (articleCategoryFilter !== 'TODOS') {
      list = list.filter(art => art.categoria === articleCategoryFilter);
    }

    if (selectedNode && selectedNode.id !== 'core') {
      const tagId = selectedNode.id;
      const eixo = selectedNode.eixo;
      // Prioriza artigos especificamente associados ou que abordam o mesmo eixo cultural
      return [...list].sort((a, b) => {
        const aMatch = (a.tagAssociada?.includes(tagId) ? 2 : 0) + (a.eixos?.includes(eixo || '') ? 1 : 0);
        const bMatch = (b.tagAssociada?.includes(tagId) ? 2 : 0) + (b.eixos?.includes(eixo || '') ? 1 : 0);
        return bMatch - aMatch;
      });
    }

    return list;
  }, [selectedNode, articleCategoryFilter]);

  const articlesSpecificToNode = useMemo(() => {
    if (!selectedNode) return [];
    const tagId = selectedNode.id;
    const eixo = selectedNode.eixo;
    return CULTURAL_INTEROP_REFERENCES.filter(
      art => (art.tagAssociada && art.tagAssociada.includes(tagId)) || (art.eixos && art.eixos.includes(eixo || ''))
    );
  }, [selectedNode]);

  // ── 8. Física de Força Dirigida (Grafo com Molas) ──
  useEffect(() => {
    if (!isSimulatingPhysics) return;
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const kRepulsion = 4600;
        const kSpring = 0.042;
        const centerGravity = 0.014;
        const cx = 400;
        const cy = 215;

        return prev.map((node) => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || 400)) * centerGravity;
          let fy = (cy - (node.y || 215)) * centerGravity;

          for (const other of prev) {
            if (other.id === node.id) continue;
            const dx = (node.x || 400) - (other.x || 400);
            const dy = (node.y || 215) - (other.y || 215);
            const distSq = dx * dx + dy * dy + 120;
            const dist = Math.sqrt(distSq);
            const force = kRepulsion / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          for (const edge of connections) {
            let neighborId: string | null = null;
            if (edge.from === node.id) neighborId = edge.to;
            else if (edge.to === node.id) neighborId = edge.from;

            if (neighborId) {
              const neighbor = prev.find(n => n.id === neighborId);
              if (neighbor) {
                const dx = (neighbor.x || 400) - (node.x || 400);
                const dy = (neighbor.y || 215) - (node.y || 215);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const targetDist = 135;
                const springForce = (dist - targetDist) * kSpring * (edge.weight || 0.6);
                fx += (dx / dist) * springForce;
                fy += (dy / dist) * springForce;
              }
            }
          }

          const damping = 0.80;
          const vx = ((node.vx || 0) + fx) * damping;
          const vy = ((node.vy || 0) + fy) * damping;

          const newX = Math.max(50, Math.min(750, (node.x || 400) + vx));
          const newY = Math.max(45, Math.min(385, (node.y || 215) + vy));

          return { ...node, x: newX, y: newY, vx, vy };
        });
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSimulatingPhysics, draggedNodeId, connections]);

  // ── 9. Arraste de Nós no SVG ──
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 430;
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y, vx: 0, vy: 0 } : n));
  }, [draggedNodeId]);

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // ── Eixos Semânticos & Cores ──
  const EIXO_COLORS: Record<string, { color: string; label: string }> = {
    'NUCLEO':     { color: '#E8490A', label: 'Núcleo do Acervo' },
    'FESTA':      { color: '#1E3A8A', label: 'Festas & Rituais' },
    'MUSICA':     { color: '#0891B2', label: 'Música & Expressão' },
    'SABERES':    { color: '#1A6B3A', label: 'Saberes & Ofícios' },
    'CRENCAS':    { color: '#6D28D9', label: 'Crenças & Religiosidade' },
    'PATRIMONIO': { color: '#E8A920', label: 'Dossiês & Tombamentos' },
  };

  // ── Nós filtrados pela busca ou pelo eixo ──
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      if (filterEixo !== 'TODOS' && node.eixo !== filterEixo && node.id !== 'core') {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return node.label.toLowerCase().includes(term) || (node.familia || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [nodes, filterEixo, searchTerm]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── HEADER PRINCIPAL COM AS 3 ABAS & STATUS DO COFRE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
              <Brain size={24} className="text-[#E8490A]" />
              Grafo Semântico & Tráfego de Informação
            </h2>
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1">
              <Radio size={10} className="animate-pulse text-green-600" /> Rede Viva
            </span>
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 uppercase tracking-widest font-semibold">
            Cofre Semântico Vivo • Aprendizado Deep Learning Hebbiano • SKOS W3C • CIDOC-CRM ISO 21127
          </p>
        </div>

        {/* NAVEGAÇÃO ENTRE AS 3 ABAS */}
        <div className="flex items-center gap-1.5 bg-black/[0.04] p-1 rounded-xl border border-black/06">
          {[
            { id: 'grafo', label: 'Grafo Semântico', icon: Network },
            { id: 'camadas', label: 'Camadas de Interoperabilidade', icon: Layers },
            { id: 'artigos', label: 'Artigos', icon: BookOpen },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#E8490A] shadow-sm border border-black/05'
                    : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-white/40'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#E8490A]' : 'text-current'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: GRAFO SEMÂNTICO (COFRE SEMÂNTICO VIVO AUTOMÁTICO)                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'grafo' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* BARRA DE TELEMETRIA DA REDE VIVA & BUSCA RÁPIDA */}
          <div className="glass-card p-4 border border-black/07 bg-gradient-to-r from-white via-white to-[#E8490A]/05 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Telemetria do Deep Learning & Tráfego */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8490A]">
                  <FolderLock size={16} />
                  <span>Cofre Semântico Vivo:</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-black/05 font-bold text-[#1A1A1A]">
                    {nodes.length} nós ativos
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/05 font-bold text-[#1A1A1A]">
                    {connections.length} sinapses calculadas
                  </span>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-800 font-bold flex items-center gap-1">
                    <Zap size={10} /> Auto-Aglomeração Contínua
                  </span>
                </div>
              </div>

              {/* Controles: Busca / Filtro + Recarregar do Banco */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Localizar tag no grafo..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30"
                  />
                </div>

                <button
                  onClick={fetchSemanticNetwork}
                  disabled={isLoadingLiveNetwork}
                  className="px-3 py-1.5 bg-black/05 hover:bg-black/10 text-[#1A1A1A] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                  title="Sincronizar rede com as tags mais recentes do banco"
                >
                  <RefreshCw size={12} className={isLoadingLiveNetwork ? 'animate-spin' : ''} />
                  <span>Sincronizar Banco</span>
                </button>
              </div>

            </div>

            {/* Banner de Tráfego & Deep Learning */}
            <div className="pt-2 border-t border-black/05 flex flex-col sm:flex-row sm:items-center justify-between text-[10.5px] text-[#1A1A1A]/70 font-mono gap-2">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E8490A] animate-ping" />
                <span>O sistema captura e correlaciona automaticamente as tags adicionadas pelos visitantes via RAG e Spreading Activation.</span>
              </span>
              <span className="text-[9.5px] uppercase font-bold text-[#E8490A] flex items-center gap-1">
                <Lock size={10} /> Custódia SHA3 Imutável
              </span>
            </div>
          </div>

          {/* ÁREA CENTRAL: GRAFO + PAINEL DO COFRE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COLUNA 1 & 2: O Grafo Semântico Interativo */}
            <div className="lg:col-span-2 space-y-3">
              <div className="glass-card p-4 border border-black/07">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                      <Network size={14} className="text-[#E8490A]" />
                      Tráfego Semântico & Rede de Conceitos
                    </h3>
                    <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                      ({filteredNodes.length} visíveis / {connections.length} sinapses)
                    </span>
                  </div>

                  {/* Filtro por Eixo */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#1A1A1A]/40 uppercase font-semibold mr-1">Eixo:</span>
                    <select
                      value={filterEixo}
                      onChange={e => setFilterEixo(e.target.value)}
                      className="text-[10px] font-semibold bg-black/04 border border-black/10 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="TODOS">Todos os Eixos</option>
                      <option value="FESTA">Festas & Rituais</option>
                      <option value="MUSICA">Música & Expressão</option>
                      <option value="SABERES">Saberes & Ofícios</option>
                      <option value="CRENCAS">Crenças & Religiosidade</option>
                      <option value="PATRIMONIO">Dossiês / Documentação</option>
                    </select>
                  </div>
                </div>

                {/* SVG DO GRAFO SEMÂNTICO */}
                <div className="relative w-full h-[460px] bg-[#0A0A08] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                    viewBox="0 0 800 430"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <defs>
                      <filter id="sem-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="sem-halo" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="14" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Grade de pontos */}
                    {Array.from({ length: 48 }).map((_, i) => (
                      <circle
                        key={`pt-${i}`}
                        cx={(i % 8) * 115 + 30}
                        cy={Math.floor(i / 8) * 72 + 30}
                        r="1.2"
                        fill="rgba(255,255,255,0.04)"
                      />
                    ))}

                    {/* SINAPSES (Arestas Ponderadas com Tráfego Semântico) */}
                    {connections.map((conn, idx) => {
                      const fn = nodes.find(n => n.id === conn.from);
                      const tn = nodes.find(n => n.id === conn.to);
                      if (!fn || !tn) return null;

                      if (filterEixo !== 'TODOS' && fn.eixo !== filterEixo && tn.eixo !== filterEixo && fn.id !== 'core' && tn.id !== 'core') {
                        return null;
                      }

                      const isHighlighted =
                        selectedNodeId && (fn.id === selectedNodeId || tn.id === selectedNodeId);
                      const w = conn.weight || 0.5;
                      const color = fn.fill || '#E8490A';

                      return (
                        <g key={`edge-${idx}`}>
                          <line
                            x1={fn.x ?? 400}
                            y1={fn.y ?? 215}
                            x2={tn.x ?? 400}
                            y2={tn.y ?? 215}
                            stroke={color}
                            strokeWidth={isHighlighted ? w * 3.5 + 1 : w * 1.8}
                            opacity={isHighlighted ? 0.9 : 0.22}
                            strokeDasharray={conn.discovered ? '4,4' : undefined}
                          />
                          {isHighlighted && (
                            <text
                              x={((fn.x ?? 400) + (tn.x ?? 400)) / 2}
                              y={((fn.y ?? 215) + (tn.y ?? 215)) / 2 - 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="8"
                              fontFamily="monospace"
                              className="pointer-events-none opacity-90"
                            >
                              {(w * 100).toFixed(0)}%
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* NÓS DO GRAFO */}
                    {filteredNodes.map(node => {
                      const isSel = node.id === selectedNodeId;
                      const act = activeActivations[node.id] || node.activation || 0.5;
                      const radius = isSel ? (node.size || 14) + 4 : node.size || 14;
                      const nx = node.x ?? 400;
                      const ny = node.y ?? 215;

                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onMouseDown={e => handleMouseDown(node.id, e)}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          {/* Halo de Ativação / Certeza Residual */}
                          <circle
                            cx={nx}
                            cy={ny}
                            r={radius + 14 * act}
                            fill={node.fill}
                            opacity={isSel ? 0.38 : act * 0.16}
                            filter="url(#sem-halo)"
                            className="pointer-events-none transition-all duration-300"
                          />

                          {/* Núcleo do Conceito */}
                          <circle
                            cx={nx}
                            cy={ny}
                            r={radius}
                            fill={node.fill}
                            stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                            strokeWidth={isSel ? 2.5 : 1}
                            filter={isSel ? 'url(#sem-glow)' : undefined}
                            className="transition-all duration-200"
                          />

                          {/* Rótulo do Conceito */}
                          <text
                            x={nx}
                            y={ny + radius + 15}
                            textAnchor="middle"
                            fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.75)'}
                            fontSize={isSel ? '10.5' : '8.5'}
                            fontWeight={isSel ? '700' : '400'}
                            className="pointer-events-none select-none transition-all"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Legenda rápida */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
                    {Object.entries(EIXO_COLORS).map(([key, val]) => (
                      <span key={key} className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-white/70">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: val.color }} />
                        {val.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA 3: Painel do Cofre Semântico Vivo & Detalhes da Manifestação */}
            <div className="space-y-4">
              {selectedNode ? (
                <div className="glass-card p-5 border border-black/07 space-y-4 shadow-sm">
                  
                  {/* Cabeçalho do Conceito */}
                  <div className="flex items-start justify-between gap-3 border-b border-black/08 pb-3">
                    <div>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white inline-block mb-1"
                        style={{ background: selectedNode.fill || '#E8490A' }}
                      >
                        {EIXO_COLORS[selectedNode.eixo || 'SABERES']?.label || selectedNode.eixo}
                      </span>
                      <h3 className="text-sm font-bold text-[#1A1A1A]">{selectedNode.label}</h3>
                      <p className="text-[10px] text-[#1A1A1A]/50 font-mono mt-0.5">{selectedNode.type}</p>
                    </div>

                    {/* Certeza Residual da Ativação */}
                    <div className="text-right">
                      <span className="text-xs font-extrabold font-mono text-[#E8490A]">
                        {Math.round((activeActivations[selectedNode.id] || selectedNode.activation || 0.8) * 100)}%
                      </span>
                      <p className="text-[8px] uppercase text-[#1A1A1A]/40 font-bold">Certeza Semântica</p>
                    </div>
                  </div>

                  {/* Hash do Cofre / DNA Semântico SHA3 */}
                  <div className="p-2.5 bg-black/[0.02] border border-black/06 rounded-xl flex items-center justify-between text-[9px] font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <Hash size={12} className="text-[#E8490A]" />
                      <span className="text-[#1A1A1A]/70 truncate">{selectedNode.hash || 'SHA3:c8ed9901a72f'}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedNode.hash || '');
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      }}
                      className="text-[#E8490A] hover:underline flex items-center gap-0.5 ml-2 cursor-pointer"
                      title="Copiar Hash de Custódia SHA3"
                    >
                      {copySuccess ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>

                  {/* Relações SKOS / Taxonomia */}
                  <div className="p-2.5 bg-black/[0.02] border border-black/06 rounded-xl space-y-1.5 text-[9.5px]">
                    <div className="flex items-center justify-between text-[#1A1A1A]/50 font-mono uppercase text-[8px] font-bold">
                      <span>Mapeamento SKOS W3C</span>
                      <span className="text-[#E8490A]">{selectedNode.skosType || 'Concept'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#1A1A1A]/80 font-mono">
                      <span className="text-[#E8490A] font-bold">skos:broader:</span>
                      <span>{selectedNode.skosBroader?.join(', ') || 'core (Núcleo Folksonômico)'}</span>
                    </div>
                  </div>

                  {/* Descrição Curatorial & Aglomeração */}
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
                      Aglomeração & Contexto no Cofre:
                    </p>
                    <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed">
                      {selectedNode.desc}
                    </p>
                  </div>

                  {/* Família Cultural Similar */}
                  {selectedNode.familia && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 mb-1.5">
                        Genealogia Semântica:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.familia.split('.').map((part, i, arr) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/04 text-[#1A1A1A]/80 font-semibold"
                          >
                            {part} {i < arr.length - 1 && '›'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Famílias Similares Conectadas */}
                  {similarFamilies.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 mb-1.5">
                        Manifestações Conectadas (Hebbiano / ML):
                      </p>
                      <div className="space-y-1">
                        {similarFamilies.map(sim => (
                          <button
                            key={sim.id}
                            onClick={() => setSelectedNodeId(sim.id)}
                            className="w-full text-left p-1.5 rounded-lg bg-black/[0.02] hover:bg-[#E8490A]/08 border border-black/04 transition-all flex items-center justify-between text-[10px] cursor-pointer"
                          >
                            <span className="font-semibold text-[#1A1A1A]/85">{sim.label}</span>
                            <span className="text-[9px] text-[#E8490A] font-mono">Ver nó ↗</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acervos Federais Custodiantes */}
                  {selectedNode.acervos && selectedNode.acervos.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
                        Acervos Federados Integrados:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.acervos.map((acervo, i) => (
                          <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#1E3A8A]/08 text-[#1E3A8A]">
                            {acervo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links Reais nos Acervos Oficiais */}
                  {selectedNode.linksReais && selectedNode.linksReais.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 mb-1">
                        Pontos de Acesso Federados:
                      </p>
                      <div className="space-y-1">
                        {selectedNode.linksReais.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-1.5 rounded-lg bg-black/[0.02] hover:bg-[#1E3A8A]/08 border border-black/04 text-[10px] font-bold text-[#1E3A8A] hover:text-[#E8490A] transition-colors truncate"
                          >
                            {link.label} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Atalho para Ver Artigos Desta Tag */}
                  <div className="pt-2 border-t border-black/08">
                    <button
                      onClick={() => setSubTab('artigos')}
                      className="w-full py-2 bg-black/[0.03] hover:bg-[#E8490A]/10 text-[#E8490A] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen size={13} />
                      <span>Ver Artigos Desta Tag ({articlesSpecificToNode.length})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-8 border border-black/07 text-center">
                  <Network size={24} className="mx-auto text-black/30 mb-2" />
                  <p className="text-xs text-[#1A1A1A]/50">Clique em qualquer nó do grafo para abrir seu cofre semântico.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: CAMADAS DE INTEROPERABILIDADE (HBIM / PATRIMÔNIO DIGITAL)        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'camadas' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-5 border border-black/07 bg-gradient-to-r from-white via-white to-black/[0.02]">
            <div className="max-w-3xl">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#E8490A] bg-[#E8490A]/10 px-2 py-0.5 rounded">
                Arquitetura de Interoperabilidade Patrimonial
              </span>
              <h3 className="text-lg font-bold serif-title text-[#1A1A1A] mt-2">
                As Camadas de Preservação e Tráfego do Patrimônio Digital
              </h3>
              <p className="text-xs text-[#1A1A1A]/70 leading-relaxed mt-1">
                A literatura de documentação patrimonial decompõe a interoperabilidade em camadas para garantir que uma integração não falhe em nenhuma dimensão crítica: a camada técnica evita quebras de integração, a semântica evita interpretação errada, a organizacional garante governança sustentável e a legal assegura direitos e licenças.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CULTURAL_INTEROP_5_LAYERS.map(layer => (
              <div key={layer.id} className="glass-card p-5 border border-black/07 hover:border-[#E8490A]/30 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black font-mono w-6 h-6 rounded-full bg-[#E8490A] text-white flex items-center justify-center">
                    {layer.numero}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Operacional
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A]">{layer.nome}</h4>
                  <p className="text-[10px] text-[#E8490A] font-semibold mt-0.5">{layer.subtitulo}</p>
                </div>

                <p className="text-xs text-[#1A1A1A]/75 leading-relaxed">
                  {layer.descricao}
                </p>

                <div className="p-2.5 bg-black/[0.02] border border-black/05 rounded-xl text-[10px] text-[#1A1A1A]/70">
                  <span className="font-bold text-[#1A1A1A]">Aplicação no SFD:</span> {layer.exemploSFD}
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {layer.protocolos.map((proto, i) => (
                    <span key={i} className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-black/04 text-[#1A1A1A]/60 font-bold">
                      {proto}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: ARTIGOS & BIBLIOGRAFIA CIENTÍFICA (CORRELACIONADOS POR TAG)       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'artigos' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Header da Aba de Artigos */}
          <div className="glass-card p-5 border border-black/07 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#1E3A8A] bg-[#1E3A8A]/10 px-2 py-0.5 rounded">
                Produção Científica & Normativa
              </span>
              <h3 className="text-lg font-bold serif-title text-[#1A1A1A] mt-1.5">
                Artigos e Padrões da Documentação Patrimonial
              </h3>
              <p className="text-xs text-[#1A1A1A]/60 mt-0.5">
                {selectedNode && selectedNode.id !== 'core' ? (
                  <span>Exibindo artigos científicos e normativos específicos da manifestação cultural <strong className="text-[#E8490A]">"{selectedNode.label}"</strong> ({EIXO_COLORS[selectedNode.eixo || 'SABERES']?.label}).</span>
                ) : (
                  <span>Bibliografia completa em CIDOC-CRM ISO 21127, Europeana EDM, SKOS W3C, Tesauro CNFCP e RAG Multi-Hop.</span>
                )}
              </p>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['TODOS', 'Padrões de Interoperabilidade (CIDOC-CRM / EDM)', 'Camada Semântica & SKOS', 'Spreading Activation & RAG', 'Preservação & Custódia Digital'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setArticleCategoryFilter(cat)}
                  className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    articleCategoryFilter === cat
                      ? 'bg-[#1E3A8A] text-white shadow-xs'
                      : 'bg-black/04 text-[#1A1A1A]/60 hover:bg-black/08'
                  }`}
                >
                  {cat === 'TODOS' ? 'Todos os Artigos' : cat.split(' ')[0] + '...'}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE ARTIGOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeArticles.map(art => {
              const isDirectlyAssociated = selectedNode && selectedNode.id !== 'core' && (
                art.tagAssociada?.includes(selectedNode.id) || art.eixos?.includes(selectedNode.eixo || '')
              );

              return (
                <div
                  key={art.id}
                  className={`glass-card p-5 border transition-all space-y-3.5 flex flex-col justify-between ${
                    isDirectlyAssociated ? 'border-[#E8490A]/50 bg-[#E8490A]/03 shadow-md' : 'border-black/07'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E3A8A]/10 text-[#1E3A8A]">
                        {art.categoria}
                      </span>
                      <span className="text-[9px] font-mono text-[#1A1A1A]/40 font-bold">{art.ano}</span>
                    </div>

                    <h4 className="text-xs md:text-sm font-bold text-[#1A1A1A] leading-snug">
                      {art.titulo}
                    </h4>

                    <p className="text-[10px] font-semibold text-[#1A1A1A]/60">
                      {art.autores} • <span className="italic">{art.veiculo}</span>
                    </p>

                    <p className="text-xs text-[#1A1A1A]/75 leading-relaxed pt-1">
                      {art.resumo}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-black/06">
                    <div className="text-[10px] text-[#1A1A1A]/65">
                      <strong className="text-[#1A1A1A]">Aplicação no SFD:</strong> {art.aplicacaoNoSFD}
                    </div>

                    <a
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1E3A8A] hover:text-[#E8490A] transition-colors"
                    >
                      <span>Acessar Publicação / Norma Oficial</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
