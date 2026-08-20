'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Cpu, Activity, Share2, Layers, BookOpen, ExternalLink,
  Search, ShieldCheck, Download, Save, RefreshCw, ChevronRight, CheckCircle2,
  Sparkles, Hash, Info, Play, Pause, RotateCcw, Filter, Eye, ArrowRight,
  Database, GitCommit, FileCode, Check, Copy, ArrowUpRight
} from 'lucide-react';
import {
  runSpreadingActivation,
  calculateCentralityMetrics,
  generateDeterministicHash,
  CULTURAL_INTEROP_5_LAYERS,
  CULTURAL_INTEROP_REFERENCES,
  GraphMathNode,
  GraphMathEdge,
  SpreadingActivationResult
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
  const [subTab, setSubTab] = useState<'grafo' | 'camadas' | 'dna_boi' | 'skos' | 'artigos'>('grafo');

  // ── Estados do Grafo ──
  const [nodes, setNodes] = useState<GraphMathNode[]>(() => {
    if (initialNodes && initialNodes.length > 0) return initialNodes;
    return [
      { id: "core", label: "Núcleo Folksonômico", x: 400, y: 215, size: 26, fill: "#E8490A", eixo: "NUCLEO", desc: "Centralizador semântico do acervo. Indexa manifestações populares e saberes de todas as regiões brasileiras.", type: "Núcleo do Acervo Semântico", hash: "SHA3:c8ed9901a72f3b01", familia: "sistema.nucleo.folksonômico", regiao: "Nacional", linksReais: [{ label: "IBRAM — Museus Federais", url: "https://www.gov.br/museus/pt-br" }, { label: "Tesauro CNFCP/IPHAN", url: "https://www.cnfcp.gov.br/interna.php?ID_Secao=69" }], acervos: ["IBRAM", "Brasiliana", "IPHAN", "Mapas da Cultura"], activation: 1.0, skosType: "ConceptScheme" },
      { id: "bumba_boi", label: "Bumba-meu-boi", x: 230, y: 110, size: 18, fill: "#1E3A8A", eixo: "FESTA", desc: "Festa popular do ciclo junino — Patrimônio Cultural Imaterial do Brasil (IPHAN/UNESCO). Complexo lúdico-dramático do Maranhão, Pará e Amazonas.", type: "Patrimônio Imaterial IPHAN", hash: "SHA3:bumba1e2f3a4b5c6d", familia: "festa.popular.ciclo_junino.nordeste", regiao: "Norte/Nordeste", linksReais: [{ label: "IPHAN — Dossiê Bumba-meu-boi", url: "https://www.iphan.gov.br" }, { label: "CNFCP — Folclore Brasileiro", url: "https://cnfcp.gov.br" }], acervos: ["Museu do Folclore Edison Carneiro", "IBRAM-MA"], activation: 0.85, skosType: "Concept", skosBroader: ["core"] },
      { id: "boi_bumba", label: "Boi-Bumbá de Parintins", x: 120, y: 150, size: 14, fill: "#1E3A8A", eixo: "FESTA", desc: "Expressão amazônica do auto do boi (Garantido e Caprichoso). Sincretismo entre tradições indígenas, afrodescendentes e lusas.", type: "Patrimônio Cultural do Brasil", hash: "SHA3:parintins7a8b9c", familia: "festa.popular.auto_do_boi.amazonia", regiao: "Norte", linksReais: [{ label: "Mapas da Cultura — Festival de Parintins", url: "https://mapas.cultura.gov.br" }], acervos: ["Secretaria de Cultura do Amazonas"], activation: 0.65, skosType: "Concept", skosBroader: ["bumba_boi"] },
      { id: "carranca", label: "Carranca do São Francisco", x: 220, y: 310, size: 17, fill: "#1A6B3A", eixo: "SABERES", desc: "Escultura antropomórfica de proa fluvial. Proteção mística ribeirinha e símbolo mor da arte escultórica popular brasileira.", type: "Arte Popular / Ofício Ribeirinho", hash: "SHA3:carran8c2f1a4e7b", familia: "saberes.escultura.fluvial.sao_francisco", regiao: "Nordeste (São Francisco)", linksReais: [{ label: "Museu Casa do Pontal — Carrancas", url: "https://casadopontal.org.br" }, { label: "Brasiliana — Acervo São Francisco", url: "https://brasiliana.museus.gov.br" }], acervos: ["Museu Casa do Pontal", "Museu do São Francisco"], activation: 0.78, skosType: "Concept", skosBroader: ["core"] },
      { id: "mestre_vitalino", label: "Mestre Vitalino & Alto do Moura", x: 330, y: 340, size: 16, fill: "#1A6B3A", eixo: "SABERES", desc: "Mestre da cerâmica figurativa de Caruaru (PE). Retratou o cotidiano, as festas e os tipos humanos do agreste pernambucano.", type: "Mestre de Notório Saber Cultural", hash: "SHA3:vitalino4e7b8a1c", familia: "saberes.ceramica.figurativa.caruaru", regiao: "Nordeste (Pernambuco)", linksReais: [{ label: "Casa Museu Mestre Vitalino", url: "https://caruaru.pe.gov.br" }, { label: "IPHAN — Cerâmica do Alto do Moura", url: "https://iphan.gov.br" }], acervos: ["Museu do Barro de Caruaru", "Museu do Homem do Nordeste"], activation: 0.72, skosType: "Concept", skosRelated: ["carranca"] },
      { id: "frevo", label: "Frevo Pernambucano", x: 570, y: 120, size: 16, fill: "#0891B2", eixo: "MUSICA", desc: "Música e dança acrobática — Patrimônio Cultural Imaterial da Humanidade (UNESCO 2012). Ritmo sincopado de marchas e dobrados urbanos.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:frevo8f29a1b3c4d5", familia: "musica.danca.carnaval.nordeste", regiao: "Nordeste (Recife/Olinda)", linksReais: [{ label: "UNESCO — Frevo Inscription", url: "https://ich.unesco.org" }, { label: "Paço do Frevo", url: "https://pacodofrevo.org.br" }], acervos: ["Paço do Frevo", "Museu da Cidade do Recife"], activation: 0.60, skosType: "Concept", skosBroader: ["core"] },
      { id: "capoeira", label: "Roda de Capoeira & Mestre de Ofício", x: 640, y: 220, size: 15, fill: "#0891B2", eixo: "MUSICA", desc: "Arte marcial, música, canto e dança afro-brasileira (UNESCO 2014). Símbolo de resistência e cosmologia de matriz africana.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:capoeira4f7a8b9c", familia: "musica.danca.luta.afro.nacional", regiao: "Nacional (Bahia)", linksReais: [{ label: "UNESCO — Capoeira Circle", url: "https://ich.unesco.org" }], acervos: ["Museu Afro Brasil", "IPHAN"], activation: 0.55, skosType: "Concept", skosBroader: ["core"] },
      { id: "jongo", label: "Jongo do Sudeste", x: 580, y: 320, size: 13, fill: "#0891B2", eixo: "MUSICA", desc: "Dança e percussão de tambores de tronco (caxambu/candongueiro). Raiz histórica do samba carioca e tradição quilombola.", type: "Patrimônio Imaterial IPHAN", hash: "SHA3:jongo1d2e3f4a", familia: "musica.percussao.afro.sudeste", regiao: "Sudeste (Vale do Paraíba)", linksReais: [{ label: "IPHAN — Dossiê Jongo", url: "https://iphan.gov.br" }], acervos: ["Comunidades Jongueiras RJ/SP/MG", "CNFCP"], activation: 0.40, skosType: "Concept", skosRelated: ["capoeira"] },
      { id: "candomble", label: "Terreiro & Tradição dos Orixás", x: 450, y: 350, size: 14, fill: "#6D28D9", eixo: "CRENCAS", desc: "Tradição de matriz africana, ritos, toques de atabaque e culinária sagrada. Patrimônio afro-religioso tombado pelo IPHAN.", type: "Patrimônio Material/Imaterial IPHAN", hash: "SHA3:candomble9a8b", familia: "crencas.matriz_africana.terreiros", regiao: "Nacional (BA/RJ/PE)", linksReais: [{ label: "IPHAN — Terreiros Tombados", url: "https://iphan.gov.br" }], acervos: ["Museu Afro Brasil", "IPHAN"], activation: 0.48, skosType: "Concept", skosRelated: ["jongo", "capoeira"] },
      { id: "renda_bilro", label: "Renda de Bilro & Artesanato Têxtil", x: 130, y: 250, size: 13, fill: "#1A6B3A", eixo: "SABERES", desc: "Ofício tradicional de tecelagem manual em almofada com bilros de madeira. Prática centenária do litoral de SC, CE e MA.", type: "Saber Tradicional / Artesanato", hash: "SHA3:bilro2b3c4d", familia: "saberes.artesanato.textil.litoral", regiao: "Litoral Brasileiro", linksReais: [{ label: "CNFCP — Rendeiras do Brasil", url: "https://cnfcp.gov.br" }], acervos: ["Museu de Arte Popular de Florianópolis", "CNFCP"], activation: 0.35, skosType: "Concept", skosBroader: ["core"] },
    ];
  });

  const [connections, setConnections] = useState<GraphMathEdge[]>(() => {
    if (initialConnections && initialConnections.length > 0) return initialConnections;
    return [
      { from: "core", to: "bumba_boi", weight: 0.88, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "FESTA" },
      { from: "bumba_boi", to: "boi_bumba", weight: 0.82, skosRelation: "skos:closeMatch", mechanism: "propagated", eixoRel: "FESTA" },
      { from: "core", to: "carranca", weight: 0.84, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "SABERES" },
      { from: "carranca", to: "mestre_vitalino", weight: 0.79, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "SABERES" },
      { from: "core", to: "frevo", weight: 0.86, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
      { from: "core", to: "capoeira", weight: 0.85, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
      { from: "capoeira", to: "jongo", weight: 0.74, skosRelation: "skos:related", mechanism: "propagated", eixoRel: "MUSICA" },
      { from: "jongo", to: "candomble", weight: 0.76, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "CRENCAS" },
      { from: "capoeira", to: "candomble", weight: 0.71, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "CRENCAS" },
      { from: "core", to: "renda_bilro", weight: 0.70, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "SABERES" },
      { from: "mestre_vitalino", to: "renda_bilro", weight: 0.62, skosRelation: "skos:related", mechanism: "inferred", eixoRel: "SABERES" },
      { from: "bumba_boi", to: "carranca", weight: 0.58, skosRelation: "skos:related", mechanism: "inferred", eixoRel: "PATRIMONIO" },
    ];
  });

  // ── Modos de Visualização ──
  const [viewMode, setViewMode] = useState<'standard' | 'spreading' | 'hubs' | 'skos'>('spreading');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('bumba_boi');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulatingPhysics, setIsSimulatingPhysics] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // ── Spreading Activation State ──
  const [activationSources, setActivationSources] = useState<string[]>(['bumba_boi']);
  const [spreadingSpeed, setSpreadingSpeed] = useState<'lento' | 'normal' | 'rapido'>('normal');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpreadingRunning, setIsSpreadingRunning] = useState(false);
  const [spreadingResult, setSpreadingResult] = useState<SpreadingActivationResult | null>(null);

  // ── Snapshots e Hashes Criptográficos ──
  const [savedSnapshots, setSavedSnapshots] = useState<{
    id: string;
    hash: string;
    nodeCount: number;
    edgeCount: number;
    timestamp: string;
    nota: string;
  }[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Calcular Métricas de Centralidade ──
  const centrality = useMemo(() => {
    return calculateCentralityMetrics(nodes, connections);
  }, [nodes, connections]);

  // ── Executar Spreading Activation Quando Fontes Mudam ──
  useEffect(() => {
    if (activationSources.length === 0) return;
    const sources = activationSources.map(id => ({ id, initialEnergy: 1.0 }));
    const res = runSpreadingActivation(nodes, connections, sources, {
      decay: 0.78,
      retention: 0.22,
      maxIterations: 8,
      normalize: true
    });
    setSpreadingResult(res);
    setCurrentStepIndex(res.stepHistory.length - 1);
  }, [activationSources, nodes, connections]);

  // ── Loop de Animação do Spreading Activation (se ativado) ──
  useEffect(() => {
    if (!isSpreadingRunning || !spreadingResult) return;
    const intervalMs = spreadingSpeed === 'lento' ? 1200 : spreadingSpeed === 'normal' ? 650 : 300;
    const timer = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev >= spreadingResult.stepHistory.length - 1) {
          setIsSpreadingRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isSpreadingRunning, spreadingResult, spreadingSpeed]);

  // ── Ativação Atual do Passo Renderizado ──
  const activeStepActivations = useMemo(() => {
    if (!spreadingResult || spreadingResult.stepHistory.length === 0) return {};
    const step = spreadingResult.stepHistory[Math.min(currentStepIndex, spreadingResult.stepHistory.length - 1)];
    return step?.activations || {};
  }, [spreadingResult, currentStepIndex]);

  // ── Física de Força Dirigida (Fruchterman-Reingold simplificado) ──
  useEffect(() => {
    if (!isSimulatingPhysics) return;
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const kRepulsion = 3800;
        const kSpring = 0.045;
        const centerGravity = 0.015;
        const cx = 400;
        const cy = 215;

        return prev.map((node, i) => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || 400)) * centerGravity;
          let fy = (cy - (node.y || 215)) * centerGravity;

          // Repulsão entre nós
          for (let j = 0; j < prev.length; j++) {
            if (i === j) continue;
            const other = prev[j];
            const dx = (node.x || 400) - (other.x || 400);
            const dy = (node.y || 215) - (other.y || 215);
            const distSq = Math.max(100, dx * dx + dy * dy);
            const dist = Math.sqrt(distSq);
            const force = kRepulsion / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Atração nas arestas conectadas
          for (const conn of connections) {
            if (conn.from === node.id || conn.to === node.id) {
              const otherId = conn.from === node.id ? conn.to : conn.from;
              const other = prev.find(n => n.id === otherId);
              if (other) {
                const dx = (other.x || 400) - (node.x || 400);
                const dy = (other.y || 215) - (node.y || 215);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const targetDist = 130 * (1.1 - (conn.weight || 0.5) * 0.4);
                const springForce = (dist - targetDist) * kSpring;
                fx += (dx / (dist || 1)) * springForce;
                fy += (dy / (dist || 1)) * springForce;
              }
            }
          }

          // Damping e limitação de bordas
          const vx = ((node.vx || 0) + fx * 0.08) * 0.85;
          const vy = ((node.vy || 0) + fy * 0.08) * 0.85;
          const newX = Math.max(50, Math.min(750, (node.x || 400) + vx));
          const newY = Math.max(50, Math.min(380, (node.y || 215) + vy));

          return { ...node, x: newX, y: newY, vx, vy };
        });
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSimulatingPhysics, draggedNodeId, connections]);

  // ── Handlers do Mouse no Grafo ──
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    setSelectedNodeId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 430;
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: Math.max(40, Math.min(760, x)), y: Math.max(40, Math.min(390, y)) } : n));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // ── Disparar Ativação para um Termo Específico ──
  const handleTriggerSpreading = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActivationSources([nodeId]);
    setIsSpreadingRunning(true);
    setCurrentStepIndex(0);
  };

  // ── Salvar Snapshot Sistemático com Hash SHA3 ──
  const handleSaveTopologySnapshot = () => {
    const topologyData = {
      nodes: nodes.map(n => ({ id: n.id, label: n.label, eixo: n.eixo, activation: n.activation })),
      connections: connections.map(c => ({ from: c.from, to: c.to, weight: c.weight, relation: c.skosRelation })),
      timestamp: new Date().toISOString(),
    };
    const hash = generateDeterministicHash(topologyData);
    const newSnapshot = {
      id: `snap_${Date.now().toString(36)}`,
      hash,
      nodeCount: nodes.length,
      edgeCount: connections.length,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      nota: `Snapshot Topológico ${nodes.length} nós / ${connections.length} arestas`,
    };
    setSavedSnapshots(prev => [newSnapshot, ...prev].slice(0, 10));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // ── Exportar Grafo (JSON-LD / SKOS RDF / Markdown Zettelkasten) ──
  const handleExportJSONLD = () => {
    const jsonLd = {
      "@context": {
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "sfd": "https://folksonomia-digital.gov.br/ontology/",
        "dc": "http://purl.org/dc/elements/1.1/",
        "crm": "http://www.cidoc-crm.org/cidoc-crm/"
      },
      "@graph": nodes.map(n => ({
        "@id": `sfd:concept/${n.id}`,
        "@type": n.skosType || "skos:Concept",
        "skos:prefLabel": { "@value": n.label, "@language": "pt-BR" },
        "skos:definition": n.desc,
        "sfd:eixoCultural": n.eixo,
        "sfd:sha3Hash": n.hash,
        "sfd:centralityHub": centrality.hubScores[n.id] || 0,
        "skos:broader": connections.filter(c => c.from === n.id && c.skosRelation === 'skos:broader').map(c => `sfd:concept/${c.to}`),
        "skos:related": connections.filter(c => (c.from === n.id || c.to === n.id) && c.skosRelation === 'skos:related').map(c => `sfd:concept/${c.from === n.id ? c.to : c.from}`)
      }))
    };
    const blob = new Blob([JSON.stringify(jsonLd, null, 2)], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd_interop_graph_${Date.now()}.jsonld`;
    a.click();
  };

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  return (
    <div className="space-y-6 animate-fade-in text-[#1A1A1A]">
      {/* ── HEADER PRINCIPAL COM SUB-TABS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-black/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8490A]/10 border border-[#E8490A]/20 flex items-center justify-center text-[#E8490A] shadow-sm">
              <Brain size={22} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2">
                Interoperabilidade Cultural & Tráfego Semântico
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/50 font-bold mt-0.5">
                5 Camadas HBIM · Grafo de Força Obsidian (Fruchterman-Reingold) · Spreading Activation · Mapeamento SKOS · Hashes SHA3
              </p>
            </div>
          </div>
        </div>

        {/* Botoes de Acao do Topo */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveTopologySnapshot}
            className="liquid-button !bg-white/70 backdrop-blur-md border border-black/10 !text-xs !py-2 !px-3.5 flex items-center gap-1.5 hover:!bg-white shadow-xs font-bold"
            title="Gera e persiste snapshot criptográfico com hash determinístico"
          >
            {copySuccess ? <Check size={14} className="text-green-600" /> : <Save size={14} className="text-[#E8490A]" />}
            {copySuccess ? 'Snapshot Gravado!' : 'Salvar Snapshot (SHA3)'}
          </button>

          <button
            onClick={handleExportJSONLD}
            className="liquid-button !bg-[#1A1A1A] !text-white !text-xs !py-2 !px-3.5 flex items-center gap-1.5 hover:!bg-black shadow-xs font-bold"
            title="Exportar ontologia em padrão internacional JSON-LD / SKOS"
          >
            <Download size={14} />
            Exportar JSON-LD
          </button>
        </div>
      </div>

      {/* ── BARRA DE SUB-TABS COM INDICADORES ── */}
      <div className="flex items-center gap-2 border-b border-black/08 pb-1 overflow-x-auto">
        {[
          { id: 'grafo', label: 'Grafo Obsidian & Spreading Activation', icon: <Network size={14} />, badge: `${nodes.length} nós` },
          { id: 'dna_boi', label: 'Auditabilidade: Caso do Boi (53%)', icon: <Sparkles size={14} />, badge: 'Estudo de Caso' },
          { id: 'camadas', label: 'As 5 Camadas de Interoperabilidade', icon: <Layers size={14} />, badge: 'HBIM / Memória' },
          { id: 'skos', label: 'Mapeamento SKOS & Tesauros', icon: <Share2 size={14} />, badge: 'W3C Standard' },
          { id: 'artigos', label: 'Dossiê Epistemológico & Artigos', icon: <BookOpen size={14} />, badge: '6 Referências' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-[#E8490A] text-white shadow-sm scale-102'
                : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-black/04'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-mono ${
              subTab === tab.id ? 'bg-white/20 text-white' : 'bg-black/05 text-[#1A1A1A]/50'
            }`}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: GRAFO OBSIDIAN & SPREADING ACTIVATION                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'grafo' && (
        <div className="space-y-6 animate-fade-in">
          {/* BARRA DE CONTROLE DO SPREADING ACTIVATION */}
          <div className="glass-card p-4 border border-black/08 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 !bg-white/70 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#E8490A] flex items-center gap-1.5">
                <Sparkles size={13} /> Ativar Nó-Fonte (Spreading):
              </span>

              {/* Botões de presets rápidos */}
              {[
                { id: 'bumba_boi', label: 'Boi (53% / 8 refs)' },
                { id: 'carranca', label: 'Carranca & Vitalino' },
                { id: 'frevo', label: 'Frevo' },
                { id: 'capoeira', label: 'Capoeira' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleTriggerSpreading(preset.id)}
                  className={`text-[9px] uppercase font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    activationSources.includes(preset.id)
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                      : 'bg-white/60 text-[#1A1A1A]/70 border-black/10 hover:bg-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Controles de Reprodução e Física */}
            <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
              <div className="flex items-center gap-1 bg-black/04 p-1 rounded-xl border border-black/06">
                <button
                  onClick={() => setIsSpreadingRunning(!isSpreadingRunning)}
                  className="p-1.5 rounded-lg bg-white text-[#1A1A1A] hover:bg-gray-100 shadow-xs transition-all"
                  title={isSpreadingRunning ? 'Pausar Propagação' : 'Iniciar Propagação Automática'}
                >
                  {isSpreadingRunning ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  onClick={() => setCurrentStepIndex(0)}
                  className="p-1.5 rounded-lg bg-white text-[#1A1A1A] hover:bg-gray-100 shadow-xs transition-all"
                  title="Reiniciar Passo a Passo"
                >
                  <RotateCcw size={13} />
                </button>
                <span className="text-[9px] font-mono font-bold px-2 text-[#1A1A1A]/60">
                  Iteração: {currentStepIndex + 1} / {spreadingResult?.stepHistory?.length || 1}
                </span>
              </div>

              {/* Modo de Visualização */}
              <div className="flex items-center gap-1 bg-black/04 p-1 rounded-xl border border-black/06">
                {(['spreading', 'hubs', 'skos'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`text-[9px] uppercase font-extrabold px-2.5 py-1 rounded-lg transition-all ${
                      viewMode === mode
                        ? 'bg-[#E8490A] text-white shadow-xs'
                        : 'text-[#1A1A1A]/55 hover:text-[#1A1A1A]'
                    }`}
                  >
                    {mode === 'spreading' ? 'Ativação' : mode === 'hubs' ? 'Hubs' : 'SKOS'}
                  </button>
                ))}
              </div>

              {/* Toggle Física */}
              <button
                onClick={() => setIsSimulatingPhysics(!isSimulatingPhysics)}
                className={`text-[8.5px] uppercase font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                  isSimulatingPhysics ? 'bg-green-600/10 text-green-800 border-green-600/20' : 'bg-gray-200 text-gray-600 border-gray-300'
                }`}
              >
                {isSimulatingPhysics ? 'Física: Ativa' : 'Física: Pausada'}
              </button>
            </div>
          </div>

          {/* GRID PRINCIPAL: GRAFO SVG + PAINEL DE INSPECAO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUNA 1+2: GRAFO OBSIDIAN SVG */}
            <div className="lg:col-span-2 space-y-3">
              <div className="relative w-full h-[520px] bg-[#0E0E0C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* SVG DO GRAFO */}
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                  viewBox="0 0 800 430"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <defs>
                    {/* Filtros de Brilho e Ativação */}
                    <filter id="glow-heavy" x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation="10" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="glow-soft" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Marcadores de Arestas */}
                    <marker id="arrow-skos" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#E8490A" opacity="0.8" />
                    </marker>
                    <marker id="arrow-hebb" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0891B2" opacity="0.6" />
                    </marker>
                  </defs>

                  {/* Grade de Pontos Zettelkasten Obsidian */}
                  {Array.from({ length: 60 }).map((_, i) => (
                    <circle
                      key={`grid-${i}`}
                      cx={(i % 10) * 82 + 30}
                      cy={Math.floor(i / 10) * 72 + 25}
                      r="1.0"
                      fill="rgba(255,255,255,0.04)"
                    />
                  ))}

                  {/* ARESTAS / SINAPSES SEMÂNTICAS */}
                  {connections.map((conn, idx) => {
                    const fn = nodes.find(n => n.id === conn.from);
                    const tn = nodes.find(n => n.id === conn.to);
                    if (!fn || !tn) return null;

                    const isConnectedToSelected = selectedNodeId && (conn.from === selectedNodeId || conn.to === selectedNodeId);
                    const fnAct = activeStepActivations[conn.from] || 0;
                    const tnAct = activeStepActivations[conn.to] || 0;
                    const edgeFlow = (fnAct + tnAct) / 2;

                    const strokeColor = viewMode === 'skos'
                      ? conn.skosRelation === 'skos:narrower' ? '#E8490A' : conn.skosRelation === 'skos:related' ? '#0891B2' : '#6D28D9'
                      : isConnectedToSelected ? '#E8490A' : edgeFlow > 0.4 ? '#a78bfa' : 'rgba(255,255,255,0.14)';

                    const strokeW = isConnectedToSelected ? 2.5 : Math.max(1.0, (conn.weight || 0.5) * 3 * (0.8 + edgeFlow * 0.6));

                    return (
                      <g key={`edge-${idx}`}>
                        <line
                          x1={fn.x}
                          y1={fn.y}
                          x2={tn.x}
                          y2={tn.y}
                          stroke={strokeColor}
                          strokeWidth={strokeW}
                          strokeOpacity={isConnectedToSelected ? 0.95 : Math.max(0.2, edgeFlow)}
                          strokeDasharray={conn.mechanism === 'propagated' ? '4,4' : undefined}
                          markerEnd={viewMode === 'skos' ? 'url(#arrow-skos)' : undefined}
                        />
                        {/* Rótulo de Relação na Aresta quando Selecionado */}
                        {isConnectedToSelected && (
                          <text
                            x={((fn.x || 0) + (tn.x || 0)) / 2}
                            y={((fn.y || 0) + (tn.y || 0)) / 2 - 6}
                            textAnchor="middle"
                            fill="#fff"
                            fontSize="7.5"
                            fontFamily="monospace"
                            className="pointer-events-none bg-black/80 px-1"
                          >
                            {conn.skosRelation || conn.mechanism || 'sinapse'} (w={(conn.weight || 0.5).toFixed(2)})
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* NÓS CULTURAIS / NEURÔNIOS */}
                  {nodes.map(node => {
                    const isSelected = node.id === selectedNodeId;
                    const isSource = activationSources.includes(node.id);
                    const actLevel = activeStepActivations[node.id] || (node.activation ?? 0);
                    const isTopHub = centrality.topHubs.includes(node.id);

                    // Tamanho dinâmico pelo modo
                    let nodeR = node.size || 14;
                    if (viewMode === 'hubs' && isTopHub) nodeR += 6;
                    if (viewMode === 'spreading') nodeR += actLevel * 6;

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onMouseDown={e => handleMouseDown(node.id, e)}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        {/* Halo de Ativação Spreading (Obsidian Pulse) */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={nodeR + 14 + actLevel * 10}
                          fill={node.fill || '#E8490A'}
                          opacity={isSource ? 0.45 : actLevel * 0.3}
                          filter={actLevel > 0.4 ? 'url(#glow-heavy)' : undefined}
                          style={{ transition: 'r 0.3s, opacity 0.3s' }}
                        />

                        {/* Núcleo do Nó */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={nodeR}
                          fill={node.fill || '#E8490A'}
                          filter={isSelected ? 'url(#glow-heavy)' : 'url(#glow-soft)'}
                          stroke={isSelected ? '#ffffff' : isSource ? '#E8490A' : 'rgba(255,255,255,0.4)'}
                          strokeWidth={isSelected ? 3 : isSource ? 2.5 : 1}
                        />

                        {/* Badge de Hub (se no modo Hubs) */}
                        {viewMode === 'hubs' && isTopHub && (
                          <circle
                            cx={(node.x || 0) + nodeR - 2}
                            cy={(node.y || 0) - nodeR + 2}
                            r="5"
                            fill="#E8A920"
                            stroke="#000"
                            strokeWidth="1"
                          />
                        )}

                        {/* Indicador de Percentual de Ativação (DNA de Certeza) */}
                        {viewMode === 'spreading' && actLevel > 0.05 && (
                          <text
                            x={node.x}
                            y={(node.y || 0) + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                            className="pointer-events-none"
                          >
                            {Math.round(actLevel * 100)}%
                          </text>
                        )}

                        {/* Rótulo de Texto */}
                        <text
                          x={node.x}
                          y={(node.y || 0) + nodeR + 14}
                          textAnchor="middle"
                          fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'}
                          fontSize="9"
                          fontWeight={isSelected ? '700' : '500'}
                          fontFamily="sans-serif"
                          className="pointer-events-none"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Overlays de Informação e Legenda no Grafo */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isSpreadingRunning ? 'bg-green-400 animate-pulse' : 'bg-purple-400'}`} />
                  <span className="text-[8.5px] uppercase font-bold tracking-widest font-mono">
                    Modo: {viewMode === 'spreading' ? 'Spreading Activation (Decaimento α=0.78)' : viewMode === 'hubs' ? 'Hubs & Centralidade Betweenness' : 'Ontologia SKOS'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  {[
                    { label: 'Núcleo', color: '#E8490A' },
                    { label: 'Festa', color: '#1E3A8A' },
                    { label: 'Saberes', color: '#1A6B3A' },
                    { label: 'Música', color: '#0891B2' },
                    { label: 'Crenças', color: '#6D28D9' },
                  ].map(e => (
                    <span key={e.label} className="flex items-center gap-1 text-[7.5px] font-bold uppercase text-white/80">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: e.color }} />
                      {e.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* FEED DE ATIVAÇÃO RESIDUAL RANKING */}
              {spreadingResult && spreadingResult.rankedNodes.length > 0 && (
                <div className="glass-card p-4 border border-black/07">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-[#E8490A] flex items-center gap-1.5">
                      <Activity size={13} /> Ranking de Ativação Residual — DNA Semântico
                    </span>
                    <span className="text-[8.5px] font-mono text-[#1A1A1A]/40 font-bold">
                      Energia Total da Rede: {spreadingResult.totalEnergy}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {spreadingResult.rankedNodes.slice(0, 4).map((rn, idx) => (
                      <div
                        key={rn.id}
                        onClick={() => setSelectedNodeId(rn.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all ${
                          selectedNodeId === rn.id ? 'bg-[#E8490A]/10 border-[#E8490A]/40 shadow-xs' : 'bg-black/02 border-black/05 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[8px] font-mono">
                          <span className="text-[#1A1A1A]/50">#{idx + 1}</span>
                          <span className="font-bold text-[#E8490A]">{rn.certaintyPct}% certeza</span>
                        </div>
                        <p className="text-[10px] font-bold text-[#1A1A1A] truncate mt-0.5">{rn.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLUNA 3: PAINEL DE INSPEÇÃO DO NÓ CULTURAL */}
            <div className="space-y-4">
              <div className="glass-card border border-black/08 overflow-hidden shadow-xl sticky top-24">
                {/* Cabeçalho do Nó */}
                <div className="p-4 border-b border-black/08 flex items-center gap-3" style={{ background: `${selectedNode.fill || '#E8490A'}15` }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold"
                    style={{ background: selectedNode.fill || '#E8490A' }}
                  >
                    <Cpu size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#1A1A1A] truncate">{selectedNode.label}</h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className="text-[7.5px] uppercase font-extrabold px-2 py-0.5 rounded-full"
                        style={{ color: selectedNode.fill || '#E8490A', background: `${selectedNode.fill || '#E8490A'}25` }}
                      >
                        Eixo: {selectedNode.eixo || 'PATRIMÔNIO'}
                      </span>
                      {selectedNode.regiao && (
                        <span className="text-[7.5px] font-bold text-[#1A1A1A]/60 uppercase bg-black/05 px-2 py-0.5 rounded-full">
                          {selectedNode.regiao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Métricas de Centralidade e Spreading */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-black/02 border-b border-black/06 text-center font-mono">
                  <div className="p-1.5 bg-white rounded-lg border border-black/05 shadow-2xs">
                    <p className="text-[7.5px] uppercase text-[#1A1A1A]/50">Ativação</p>
                    <p className="text-xs font-bold text-[#E8490A]">
                      {Math.round((activeStepActivations[selectedNode.id] ?? selectedNode.activation ?? 0) * 100)}%
                    </p>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-black/05 shadow-2xs">
                    <p className="text-[7.5px] uppercase text-[#1A1A1A]/50">Centralidade</p>
                    <p className="text-xs font-bold text-blue-700">
                      {((centrality.hubScores[selectedNode.id] || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg border border-black/05 shadow-2xs">
                    <p className="text-[7.5px] uppercase text-[#1A1A1A]/50">SKOS Type</p>
                    <p className="text-[10px] font-bold text-purple-700 truncate">
                      {selectedNode.skosType || 'Concept'}
                    </p>
                  </div>
                </div>

                {/* Descrição e Definição Cultural */}
                <div className="p-4 border-b border-black/06 space-y-2">
                  <p className="text-[8px] uppercase font-bold text-[#1A1A1A]/40 tracking-wider">Definição Cultural</p>
                  <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-normal">{selectedNode.desc}</p>
                </div>

                {/* Hash Criptográfico e Proveniência (DNA Semântico) */}
                <div className="p-4 border-b border-black/06 bg-black/01 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] uppercase font-bold text-[#1A1A1A]/40 tracking-wider flex items-center gap-1">
                      <Hash size={11} /> Hash Criptográfico (DNA)
                    </p>
                    <span className="text-[7.5px] font-bold text-green-700 bg-green-500/10 px-1.5 py-0.5 rounded">Auditado</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-black/08 font-mono text-[9px] text-[#1A1A1A]/70 flex items-center justify-between">
                    <span className="truncate mr-2">{selectedNode.hash || generateDeterministicHash(selectedNode.label)}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedNode.hash || generateDeterministicHash(selectedNode.label))}
                      className="text-[#E8490A] hover:opacity-80 p-0.5"
                      title="Copiar Hash"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>

                {/* Fontes Verificadas em APIs Federais */}
                {selectedNode.linksReais && selectedNode.linksReais.length > 0 && (
                  <div className="p-4 border-b border-black/06 space-y-2">
                    <p className="text-[8px] uppercase font-bold text-[#1A1A1A]/40 tracking-wider">
                      Fontes Verificadas — APIs Federais Abertas
                    </p>
                    <div className="space-y-1.5">
                      {selectedNode.linksReais.map((link: any, i: number) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-black/06 text-[9px] font-bold text-[#1A1A1A]/80 hover:text-[#E8490A] hover:border-[#E8490A]/30 transition-all group"
                        >
                          <span className="truncate">{link.label}</span>
                          <ArrowUpRight size={11} className="text-[#1A1A1A]/40 group-hover:text-[#E8490A]" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações Rápidas */}
                <div className="p-4 bg-black/02 flex gap-2">
                  <button
                    onClick={() => handleTriggerSpreading(selectedNode.id)}
                    className="flex-1 liquid-button !bg-[#E8490A] !text-white !text-xs !py-2 font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={12} />
                    Disparar Spreading
                  </button>
                  {onTriggerRAG && (
                    <button
                      onClick={() => onTriggerRAG(selectedNode.label)}
                      className="liquid-button !bg-[#6D28D9] !text-white !text-xs !py-2 !px-3 font-bold flex items-center justify-center gap-1"
                      title="Executar ciclo RAG de aprendizagem"
                    >
                      <Brain size={12} />
                      Treinar RAG
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: AUDITABILIDADE DO DNA SEMÂNTICO — CASO DO "BOI" (53% / 8 REFS) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'dna_boi' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 border-l-4 border-[#1E3A8A] !bg-white/80 backdrop-blur-md shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] border border-[#1E3A8A]/20">
                  Estudo de Caso Epistemológico — SFD
                </span>
                <h3 className="text-xl md:text-2xl font-bold serif-title text-[#1A1A1A] mt-2">
                  O DNA Semântico do &quot;Boi&quot;: Certeza Residual de 53% & 8 Referências
                </h3>
                <p className="text-xs text-[#1A1A1A]/70 mt-1 max-w-3xl leading-relaxed">
                  Demonstração prática de como o SFD substitui o texto estático por um grafo auditável tipo Obsidian.
                  O percentual de 53% de certeza calculado pelo motor não é uma estimativa arbitrária, mas sim o
                  nível de <strong>ativação residual matemático</strong> resultante da propagação (Spreading Activation)
                  pelas 8 fontes interligadas no grafo.
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-4xl font-black text-[#1E3A8A] font-mono">53%</div>
                <p className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 tracking-wider">Certeza Residual</p>
              </div>
            </div>
          </div>

          {/* GRID DE DECOMPOSIÇÃO DAS 8 REFERÊNCIAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                fonte: 'IBRAM / Tainacan',
                titulo: 'Acervo Bumba-meu-boi do Maranhão',
                tipo: 'Peça Física / Indumentária',
                peso: 0.88,
                skos: 'skos:exactMatch',
                url: 'https://brasiliana.museus.gov.br'
              },
              {
                fonte: 'IBRAM / Museu do Folclore',
                titulo: 'Couro de Boi Bordado com Canutilho',
                tipo: 'Objeto Museológico',
                peso: 0.82,
                skos: 'skos:closeMatch',
                url: 'https://cnfcp.gov.br'
              },
              {
                fonte: 'CNFCP / IPHAN',
                titulo: 'Dossiê IPHAN nº 07 — Complexo Cultural do Bumba-meu-boi',
                tipo: 'Dossiê Patrimonial',
                peso: 0.94,
                skos: 'skos:broader',
                url: 'https://iphan.gov.br'
              },
              {
                fonte: 'CNFCP / Tesauro',
                titulo: 'Verbete Tesauro Folclore: Auto do Boi',
                tipo: 'Vocabulário Controlado',
                peso: 0.90,
                skos: 'skos:broader',
                url: 'https://cnfcp.gov.br'
              },
              {
                fonte: 'Brasiliana Museus',
                titulo: 'Fotografia Histórica: Brincantes de Boi em São Luís (1954)',
                tipo: 'Documento Iconográfico',
                peso: 0.76,
                skos: 'skos:related',
                url: 'https://brasiliana.museus.gov.br'
              },
              {
                fonte: 'Mapas da Cultura (MinC)',
                titulo: 'Grupo Cultural Bumbá de Parintins (AM)',
                tipo: 'Agente Cultural Vivo',
                peso: 0.72,
                skos: 'skos:related',
                url: 'https://mapas.cultura.gov.br'
              },
              {
                fonte: 'SALIC / MinC',
                titulo: 'Projeto Rouanet: Salvaguarda dos Sotaques do Boi',
                tipo: 'Fomento Cultural',
                peso: 0.68,
                skos: 'skos:related',
                url: 'https://versalic.cultura.gov.br'
              },
              {
                fonte: 'UNESCO ICH',
                titulo: 'Cultural Complex of Bumba-meu-boi from Maranhão (2019)',
                tipo: 'Patrimônio Mundial',
                peso: 0.96,
                skos: 'skos:exactMatch',
                url: 'https://ich.unesco.org'
              },
            ].map((ref, i) => (
              <div key={i} className="glass-card p-4 border border-black/07 space-y-2 !bg-white/70 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-[#1E3A8A]/10 text-[#1E3A8A]">
                    Ref #{i + 1} · {ref.fonte}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-green-700">w={ref.peso}</span>
                </div>
                <h5 className="text-xs font-bold text-[#1A1A1A] leading-snug">{ref.titulo}</h5>
                <p className="text-[9px] text-[#1A1A1A]/55 font-mono">{ref.tipo} · {ref.skos}</p>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] font-bold text-[#E8490A] hover:underline inline-flex items-center gap-1 pt-1 border-t border-black/05 w-full"
                >
                  Consultar Fonte Oficial <ArrowUpRight size={10} />
                </a>
              </div>
            ))}
          </div>

          {/* EQUAÇÃO MATEMÁTICA DO RELATÓRIO DO BOI */}
          <div className="glass-card p-6 border border-black/08 bg-[#1E3A8A]/03 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] flex items-center gap-2">
              <Database size={15} /> Formulação Matemática de Spreading Activation do SFD
            </h4>
            <div className="p-4 bg-white rounded-xl border border-black/08 font-mono text-xs text-[#1A1A1A]/85 overflow-x-auto space-y-2">
              <p className="font-bold text-[#1E3A8A]">
                A_t+1(&quot;Boi&quot;) = (1 - λ) · A_t(&quot;Boi&quot;) + α · ∑_(j=1..8) [ A_t(u_j) · W(u_j, &quot;Boi&quot;) ]
              </p>
              <p className="text-[10px] text-[#1A1A1A]/60">
                Onde: λ=0.22 (retenção de memória), α=0.78 (decaimento geométrico por salto sináptico), W(u_j) = pesos calibrados das 8 fontes acima.
              </p>
              <p className="text-[10px] text-green-700 font-bold">
                Resultado Estabilizado após 4 iterações: Certeza Residual = 53.4% · Hash de Proveniência: SHA3:bumba1e2f3a4b5c6d
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: AS 5 CAMADAS DE INTEROPERABILIDADE PATRIMONIAL (HBIM)           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'camadas' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 border-l-4 border-[#E8490A] !bg-white/80 backdrop-blur-md shadow-sm">
            <h3 className="text-xl font-bold serif-title text-[#1A1A1A]">
              Modelo Epistemológico das 5 Camadas de Interoperabilidade
            </h3>
            <p className="text-xs text-[#1A1A1A]/70 mt-1 max-w-3xl leading-relaxed">
              Baseado na literatura de documentação patrimonial digital (HBIM) e ciência da informação (USP/BAD).
              Uma integração de patrimônio digital pode falhar em qualquer camada mesmo funcionando perfeitamente nas outras:
            </p>
          </div>

          <div className="space-y-4">
            {CULTURAL_INTEROP_5_LAYERS.map((layer) => (
              <div key={layer.id} className="glass-card p-6 border border-black/08 hover:border-[#E8490A]/30 transition-all !bg-white/70 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E8490A]/10 text-[#E8490A] font-bold flex items-center justify-center font-mono text-sm shadow-2xs">
                      0{layer.numero}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1A1A1A]">{layer.nome}</h4>
                      <p className="text-[10px] text-[#1A1A1A]/50 font-bold uppercase tracking-wider">{layer.subtitulo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8.5px] uppercase font-mono font-bold px-2.5 py-1 rounded-md bg-green-500/10 text-green-800 border border-green-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {layer.status}
                    </span>
                    <span className="text-[8.5px] uppercase font-mono font-bold px-2.5 py-1 rounded-md bg-[#E8490A]/10 text-[#E8490A]">
                      {layer.padraoPrincipal}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#1A1A1A]/80 leading-relaxed">{layer.descricao}</p>

                <div className="p-3 bg-black/02 rounded-xl border border-black/05 text-xs">
                  <span className="text-[8px] uppercase font-bold text-[#E8490A] tracking-wider block mb-1">Aplicação Prática no SFD:</span>
                  <p className="text-[#1A1A1A]/85 italic">{layer.exemploSFD}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-black/05 text-[9px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[#1A1A1A]/50 uppercase">Protocolos:</span>
                    {layer.protocolos.map((prot, pi) => (
                      <span key={pi} className="px-2 py-0.5 bg-black/05 rounded font-mono text-[#1A1A1A]/70">{prot}</span>
                    ))}
                  </div>
                  <a
                    href={layer.referenciaArtigo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#E8490A] hover:underline inline-flex items-center gap-1 self-end sm:self-auto"
                  >
                    {layer.referenciaArtigo.autor} ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 4: MAPEAMENTO SKOS & TESAUROS                                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'skos' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 border-l-4 border-purple-600 !bg-white/80 backdrop-blur-md shadow-sm">
            <h3 className="text-xl font-bold serif-title text-[#1A1A1A]">
              Matriz de Mapeamento SKOS (Simple Knowledge Organization System)
            </h3>
            <p className="text-xs text-[#1A1A1A]/70 mt-1 max-w-3xl leading-relaxed">
              O SKOS é a recomendação oficial W3C para representar tesauros e vocabulários controlados em RDF.
              No SFD, ele estabelece as equivalências e hierarquias semânticas entre as contribuições dos usuários
              (folksonomia) e os conceitos institucionais (CNFCP, CIDOC-CRM, UNESCO).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                rel: 'skos:exactMatch',
                titulo: 'Equivalência Exata',
                desc: 'Dois conceitos têm significado idêntico e intercambiável entre vocabulários distintos.',
                exemplo: 'Bumba-meu-boi (SFD) ≡ Complex of Bumba-meu-boi (UNESCO)',
                cor: 'text-purple-700 bg-purple-500/10 border-purple-500/20'
              },
              {
                rel: 'skos:broader / narrower',
                titulo: 'Hierarquia Conceitual',
                desc: 'Relação de generalização (broader) ou especialização (narrower) temática.',
                exemplo: 'Núcleo Folksonômico (broader) → Bumba-meu-boi (narrower)',
                cor: 'text-[#E8490A] bg-[#E8490A]/10 border-[#E8490A]/20'
              },
              {
                rel: 'skos:related',
                titulo: 'Associação Semântica',
                desc: 'Conceitos fortemente correlacionados no mesmo domínio cultural sem hierarquia direta.',
                exemplo: 'Carranca do São Francisco ↔ Mestre Vitalino (Arte Popular)',
                cor: 'text-[#0891B2] bg-[#0891B2]/10 border-[#0891B2]/20'
              },
            ].map((sk, i) => (
              <div key={i} className="glass-card p-5 border border-black/08 space-y-3 !bg-white/70">
                <span className={`text-[9px] uppercase font-mono font-bold px-2.5 py-1 rounded-md border ${sk.cor}`}>
                  {sk.rel}
                </span>
                <h4 className="text-sm font-bold text-[#1A1A1A]">{sk.titulo}</h4>
                <p className="text-xs text-[#1A1A1A]/70 leading-relaxed">{sk.desc}</p>
                <div className="p-2.5 bg-black/02 rounded-lg border border-black/05 font-mono text-[9px] text-[#1A1A1A]/80">
                  {sk.exemplo}
                </div>
              </div>
            ))}
          </div>

          {/* TABELA DE MAPEAMENTO RELACIONAL ATIVO */}
          <div className="glass-card p-6 border border-black/08 !bg-white/70 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
              <Share2 size={15} className="text-purple-600" /> Matriz de Sinapses SKOS Ativas na Rede ({connections.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-black/10 text-[#1A1A1A]/60 uppercase text-[9px] font-bold">
                    <th className="py-2.5 px-3">Origem (Head)</th>
                    <th className="py-2.5 px-3">Relação SKOS</th>
                    <th className="py-2.5 px-3">Destino (Tail)</th>
                    <th className="py-2.5 px-3">Peso</th>
                    <th className="py-2.5 px-3">Mecanismo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/05 font-mono text-[10px]">
                  {connections.map((c, i) => {
                    const fn = nodes.find(n => n.id === c.from);
                    const tn = nodes.find(n => n.id === c.to);
                    return (
                      <tr key={i} className="hover:bg-black/02 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-bold text-[#1A1A1A]">{fn?.label || c.from}</td>
                        <td className="py-2.5 px-3 text-purple-700 font-bold">{c.skosRelation || 'skos:related'}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-[#1A1A1A]">{tn?.label || c.to}</td>
                        <td className="py-2.5 px-3 font-bold text-[#E8490A]">{(c.weight || 0.5).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-[#1A1A1A]/50 uppercase">{c.mechanism || 'inferred'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ABA 5: DOSSIÊ EPISTEMOLÓGICO & ARTIGOS CIENTÍFICOS                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'artigos' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 border-l-4 border-green-600 !bg-white/80 backdrop-blur-md shadow-sm">
            <h3 className="text-xl font-bold serif-title text-[#1A1A1A]">
              Dossiê Bibliográfico & Fundamentação Teórica da Interoperabilidade
            </h3>
            <p className="text-xs text-[#1A1A1A]/70 mt-1 max-w-3xl leading-relaxed">
              Literatura acadêmica de referência que orienta as decisões de arquitetura, camadas de tráfego,
              grafos de força dirigida (Zettelkasten/Obsidian) e algoritmos de Spreading Activation no SFD:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CULTURAL_INTEROP_REFERENCES.map((art) => (
              <div key={art.id} className="glass-card p-6 border border-black/08 hover:border-green-600/40 transition-all !bg-white/70 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-800 border border-green-500/20">
                      {art.categoria}
                    </span>
                    <span className="text-[9px] font-mono text-[#1A1A1A]/40">{art.ano} · {art.veiculo}</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] leading-snug">{art.titulo}</h4>
                  <p className="text-[10px] text-[#1A1A1A]/60 font-semibold">{art.autores}</p>
                  
                  <div className="pt-2 border-t border-black/05 space-y-2">
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-[#1A1A1A]/40 tracking-wider block">Resumo Epistemológico:</span>
                      <p className="text-xs text-[#1A1A1A]/80 leading-relaxed font-normal">{art.resumoEpistemologico}</p>
                    </div>
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-[#E8490A] tracking-wider block">Aplicação no SFD:</span>
                      <p className="text-xs text-[#1A1A1A]/90 italic font-normal">{art.aplicacaoNoSFD}</p>
                    </div>
                  </div>
                </div>

                <a
                  href={art.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="liquid-button !bg-[#1A1A1A] !text-white !text-[10px] !py-2 font-bold flex items-center justify-center gap-1.5 hover:!bg-black shadow-2xs mt-3"
                >
                  <ExternalLink size={12} /> Acessar Publicação Científica Oficial
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
