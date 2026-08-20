'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Brain, Network, Cpu, Activity, Share2, Layers, BookOpen, ExternalLink,
  Search, ShieldCheck, Download, Save, RefreshCw, ChevronRight, CheckCircle2,
  Sparkles, Hash, Info, Filter, ArrowRight, Database, Check, Copy, ArrowUpRight,
  FolderLock, Tag, Plus, Flame
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

  // ── Estados do Grafo Semântico ──
  const [nodes, setNodes] = useState<GraphMathNode[]>(() => {
    if (initialNodes && initialNodes.length > 0) return initialNodes;
    return [
      { id: "core", label: "Núcleo Folksonômico", x: 400, y: 215, size: 26, fill: "#E8490A", eixo: "NUCLEO", desc: "Centralizador semântico do acervo. Indexa manifestações populares e saberes de todas as regiões brasileiras.", type: "Núcleo do Acervo Semântico", hash: "SHA3:c8ed9901a72f3b01", familia: "sistema.nucleo.folksonomico", regiao: "Nacional", linksReais: [{ label: "IBRAM — Museus Federais", url: "https://www.gov.br/museus/pt-br" }, { label: "Tesauro CNFCP/IPHAN", url: "https://www.cnfcp.gov.br/interna.php?ID_Secao=69" }], acervos: ["IBRAM", "Brasiliana", "IPHAN", "Mapas da Cultura"], activation: 1.0, skosType: "ConceptScheme" },
      { id: "bumba_boi", label: "Bumba-meu-boi", x: 230, y: 110, size: 18, fill: "#1E3A8A", eixo: "FESTA", desc: "Festa popular do ciclo junino — Patrimônio Cultural Imaterial do Brasil (IPHAN/UNESCO). Complexo lúdico-dramático do Maranhão, Pará e Amazonas.", type: "Patrimônio Imaterial IPHAN", hash: "SHA3:bumba1e2f3a4b5c6d", familia: "festa.popular.ciclo_junino.nordeste", regiao: "Norte/Nordeste", linksReais: [{ label: "IPHAN — Dossiê Bumba-meu-boi", url: "https://www.iphan.gov.br" }, { label: "CNFCP — Folclore Brasileiro", url: "https://cnfcp.gov.br" }], acervos: ["Museu do Folclore Edison Carneiro", "IBRAM-MA"], activation: 0.85, skosType: "Concept", skosBroader: ["core"] },
      { id: "boi_bumba", label: "Boi-Bumbá de Parintins", x: 120, y: 150, size: 14, fill: "#1E3A8A", eixo: "FESTA", desc: "Expressão amazônica do auto do boi (Garantido e Caprichoso). Sincretismo entre tradições indígenas, afrodescendentes e lusas.", type: "Patrimônio Cultural do Brasil", hash: "SHA3:parintins7a8b9c", familia: "festa.popular.auto_do_boi.amazonia", regiao: "Norte", linksReais: [{ label: "Mapas da Cultura — Festival de Parintins", url: "https://mapas.cultura.gov.br" }], acervos: ["Secretaria de Cultura do Amazonas"], activation: 0.65, skosType: "Concept", skosBroader: ["bumba_boi"] },
      { id: "carranca", label: "Carranca do São Francisco", x: 220, y: 310, size: 17, fill: "#1A6B3A", eixo: "SABERES", desc: "Escultura antropomórfica de proa fluvial. Proteção mística ribeirinha e símbolo mor da arte escultórica popular brasileira.", type: "Arte Popular / Ofício Ribeirinho", hash: "SHA3:carran8c2f1a4e7b", familia: "saberes.escultura.fluvial.sao_francisco", regiao: "Nordeste (São Francisco)", linksReais: [{ label: "Museu Casa do Pontal — Carrancas", url: "https://casadopontal.org.br" }, { label: "Brasiliana — Acervo São Francisco", url: "https://brasiliana.museus.gov.br" }], acervos: ["Museu Casa do Pontal", "Museu do São Francisco"], activation: 0.78, skosType: "Concept", skosBroader: ["core"] },
      { id: "mestre_vitalino", label: "Mestre Vitalino & Alto do Moura", x: 330, y: 340, size: 16, fill: "#1A6B3A", eixo: "SABERES", desc: "Mestre da cerâmica figurativa de Caruaru (PE). Retratou o cotidiano, as festas e os tipos humanos do agreste pernambucano.", type: "Mestre de Notório Saber Cultural", hash: "SHA3:vitalino4e7b8a1c", familia: "saberes.ceramica.figurativa.caruaru", regiao: "Nordeste (Pernambuco)", linksReais: [{ label: "Casa Museu Mestre Vitalino", url: "https://caruaru.pe.gov.br" }, { label: "IPHAN — Cerâmica do Alto do Moura", url: "https://iphan.gov.br" }], acervos: ["Museu do Barro de Caruaru", "Museu do Homem do Nordeste"], activation: 0.72, skosType: "Concept", skosRelated: ["carranca"] },
      { id: "frevo", label: "Frevo Pernambucano", x: 570, y: 120, size: 16, fill: "#0891B2", eixo: "MUSICA", desc: "Música e dança acrobática — Patrimônio Cultural Imaterial da Humanidade (UNESCO 2012). Ritmo sincopado de marchas e dobrados urbanos.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:frevo8f29a1b3c4d5", familia: "musica.danca.carnaval.nordeste", regiao: "Nordeste (Recife/Olinda)", linksReais: [{ label: "UNESCO — Frevo Inscription", url: "https://ich.unesco.org" }, { label: "Paço do Frevo", url: "https://pacodofrevo.org.br" }], acervos: ["Paço do Frevo", "Museu da Cidade do Recife"], activation: 0.60, skosType: "Concept", skosBroader: ["core"] },
      { id: "capoeira", label: "Roda de Capoeira & Mestres de Ofício", x: 640, y: 220, size: 15, fill: "#0891B2", eixo: "MUSICA", desc: "Arte marcial, música, canto e dança afro-brasileira (UNESCO 2014). Símbolo de resistência e cosmologia de matriz africana.", type: "Patrimônio Imaterial UNESCO", hash: "SHA3:capoeira4f7a8b9c", familia: "musica.danca.luta.afro.nacional", regiao: "Nacional (Bahia)", linksReais: [{ label: "UNESCO — Capoeira Circle", url: "https://ich.unesco.org" }], acervos: ["Museu Afro Brasil", "IPHAN"], activation: 0.55, skosType: "Concept", skosBroader: ["core"] },
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

  // ── Seleção e Interação Direta ──
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('bumba_boi');
  const [newTagInput, setNewTagInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingLog, setThinkingLog] = useState<string | null>(null);
  const [filterEixo, setFilterEixo] = useState<string>('TODOS');
  const [articleCategoryFilter, setArticleCategoryFilter] = useState<string>('TODOS');
  const [isSimulatingPhysics, setIsSimulatingPhysics] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Calcular Métricas de Centralidade ──
  const centrality = useMemo(() => {
    return calculateCentralityMetrics(nodes, connections);
  }, [nodes, connections]);

  // ── Nó Selecionado ──
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[0] || null;
  }, [nodes, selectedNodeId]);

  // ── Executar Ativação Semântica Automática quando Nó é Selecionado ──
  const spreadingResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNodeId, initialEnergy: 1.0 }], {
      decay: 0.78,
      retention: 0.22,
      maxIterations: 8,
      normalize: true,
    });
  }, [nodes, connections, selectedNodeId]);

  const activeActivations = useMemo(() => {
    return spreadingResult?.nodeActivations || {};
  }, [spreadingResult]);

  // ── Famílias Similares do Nó Selecionado ──
  const similarFamilies = useMemo(() => {
    if (!selectedNode) return [];
    const prefix = (selectedNode.familia || '').split('.').slice(0, 2).join('.');
    return nodes.filter(n => n.id !== selectedNode.id && n.familia && n.familia.startsWith(prefix));
  }, [nodes, selectedNode]);

  // ── Artigos Relacionados ao Nó Selecionado + Artigos Fundacionais ──
  const activeArticles = useMemo(() => {
    if (!selectedNode) return CULTURAL_INTEROP_REFERENCES;
    const tagId = selectedNode.id;
    return CULTURAL_INTEROP_REFERENCES.filter(art => {
      if (articleCategoryFilter !== 'TODOS' && art.categoria !== articleCategoryFilter) return false;
      return true;
    });
  }, [selectedNode, articleCategoryFilter]);

  const articlesSpecificToNode = useMemo(() => {
    if (!selectedNode) return [];
    const tagId = selectedNode.id;
    return CULTURAL_INTEROP_REFERENCES.filter(art => art.tagAssociada && art.tagAssociada.includes(tagId));
  }, [selectedNode]);

  // ── Física de Força Dirigida (Grafo Semântico) ──
  useEffect(() => {
    if (!isSimulatingPhysics) return;
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const kRepulsion = 4200;
        const kSpring = 0.045;
        const centerGravity = 0.012;
        const cx = 400;
        const cy = 215;

        return prev.map((node) => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || 400)) * centerGravity;
          let fy = (cy - (node.y || 215)) * centerGravity;

          // Repulsão entre nós
          for (const other of prev) {
            if (other.id === node.id) continue;
            const dx = (node.x || 400) - (other.x || 400);
            const dy = (node.y || 215) - (other.y || 215);
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            const force = kRepulsion / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          // Atração pelas arestas conectadas
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
                const targetDist = 130;
                const springForce = (dist - targetDist) * kSpring * (edge.weight || 0.6);
                fx += (dx / dist) * springForce;
                fy += (dy / dist) * springForce;
              }
            }
          }

          const damping = 0.82;
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

  // ── Processar / Ingerir Nova Tag no Cofre Vivo ──
  const handleCorrelateNewTag = async (tagToProcess?: string) => {
    const rawTag = (tagToProcess || newTagInput).trim();
    if (!rawTag) return;

    setIsThinking(true);
    setThinkingLog(`Correlacionando "${rawTag}" nas bases federais e calculando sinapses...`);

    const cleanId = rawTag.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\s]/g, '');

    // Se já existe, apenas seleciona
    const existing = nodes.find(n => n.id === cleanId || n.label.toLowerCase() === rawTag.toLowerCase());
    if (existing) {
      setSelectedNodeId(existing.id);
      setIsThinking(false);
      setThinkingLog(`Manifestação "${existing.label}" recuperada no Cofre Semântico.`);
      setNewTagInput('');
      return;
    }

    try {
      if (onTriggerRAG) {
        await onTriggerRAG(rawTag);
      }

      // Determinar eixo semântico inferido
      let eixo = 'SABERES';
      let fill = '#1A6B3A';
      let familia = `saberes.manifestacao.${cleanId}`;

      const lower = rawTag.toLowerCase();
      if (lower.includes('boi') || lower.includes('festa') || lower.includes('junin') || lower.includes('bumba') || lower.includes('reis')) {
        eixo = 'FESTA';
        fill = '#1E3A8A';
        familia = `festa.popular.${cleanId}`;
      } else if (lower.includes('som') || lower.includes('dança') || lower.includes('musica') || lower.includes('frevo') || lower.includes('capoeira') || lower.includes('ritmo')) {
        eixo = 'MUSICA';
        fill = '#0891B2';
        familia = `musica.expressao.${cleanId}`;
      } else if (lower.includes('santo') || lower.includes('reza') || lower.includes('orixá') || lower.includes('terreiro') || lower.includes('crença')) {
        eixo = 'CRENCAS';
        fill = '#6D28D9';
        familia = `crencas.religiosidade.${cleanId}`;
      }

      const generatedHash = generateDeterministicHash({
        tag: rawTag,
        eixo,
        familia,
        timestamp: new Date().toISOString(),
      });

      const newNode: GraphMathNode = {
        id: cleanId,
        label: rawTag,
        x: 350 + (Math.random() - 0.5) * 120,
        y: 200 + (Math.random() - 0.5) * 120,
        size: 15,
        fill,
        eixo,
        familia,
        regiao: 'Brasil',
        desc: `Manifestação integrada ao Cofre Semântico Vivo. Informações aglomeradas via aprendizado progressivo e correlacionadas com as matrizes culturais do patrimônio.`,
        type: 'Manifestação Cultural / Cofre Vivo',
        hash: generatedHash,
        acervos: ['IBRAM', 'Brasiliana Museus', 'CNFCP/IPHAN', 'Mapas da Cultura'],
        linksReais: [
          { label: `Brasiliana Museus — Pesquisar "${rawTag}"`, url: `https://brasiliana.museus.gov.br/?s=${encodeURIComponent(rawTag)}` },
          { label: `CNFCP/IPHAN — Vocabulário Oficial`, url: `https://www.cnfcp.gov.br/interna.php?ID_Secao=69` },
          { label: `Mapas da Cultura — Agentes & Festas`, url: `https://mapas.cultura.gov.br/busca/` }
        ],
        activation: 0.90,
        skosType: 'Concept',
        skosBroader: ['core'],
      };

      // Adicionar novo nó e conectar ao núcleo e a um nó afim
      setNodes(prev => [...prev, newNode]);

      // Encontrar nó afim para conexão sináptica
      const siblingNode = nodes.find(n => n.eixo === eixo && n.id !== 'core') || nodes[0];
      const newEdge: GraphMathEdge = {
        from: siblingNode ? siblingNode.id : 'core',
        to: cleanId,
        weight: 0.78,
        discovered: true,
        mechanism: 'rag',
        eixoRel: eixo,
        skosRelation: 'skos:related',
      };

      setConnections(prev => [...prev, newEdge]);
      setSelectedNodeId(cleanId);
      setThinkingLog(`Tag "${rawTag}" consolidada no Cofre Semântico com hash ${generatedHash.slice(0, 12)}...`);
      setNewTagInput('');
    } catch (err) {
      console.error('Erro ao correlacionar tag:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // ── Arraste de Nós no Grafo ──
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

  // ── Eixos Semânticos ──
  const EIXO_COLORS: Record<string, { color: string; label: string }> = {
    'NUCLEO':     { color: '#E8490A', label: 'Núcleo do Acervo' },
    'FESTA':      { color: '#1E3A8A', label: 'Festas & Rituais' },
    'MUSICA':     { color: '#0891B2', label: 'Música & Expressão' },
    'SABERES':    { color: '#1A6B3A', label: 'Saberes & Ofícios' },
    'CRENCAS':    { color: '#6D28D9', label: 'Crenças & Religiosidade' },
    'PATRIMONIO': { color: '#E8A920', label: 'Dossiês & Tombamentos' },
  };

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── HEADER PRINCIPAL COM AS 3 ABAS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
            <Brain size={24} className="text-[#E8490A]" />
            Interoperabilidade Cultural — Grafo Semântico
          </h2>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 uppercase tracking-widest font-semibold">
            Cofre Semântico Vivo • Correlação de Famílias Culturais • CIDOC-CRM ISO 21127 • SKOS W3C
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
      {/* ABA 1: GRAFO SEMÂNTICO (COFRE SEMÂNTICO VIVO)                           */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'grafo' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* BARRA DE ENTRADA DO USUÁRIO — CORRELAÇÃO DINÂMICA NO COFRE VIVO */}
          <div className="glass-card p-4 border border-black/07 bg-gradient-to-r from-white/90 via-white/80 to-[#E8490A]/05 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E8490A] whitespace-nowrap">
                <FolderLock size={16} />
                <span>Cofre Semântico Vivo:</span>
              </div>
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCorrelateNewTag()}
                  placeholder="Digite uma tag ou manifestação para pensar e correlacionar (ex: Xaxado, Cordel, Maracatu, Samba de Roda)..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30 focus:border-[#E8490A]"
                />
              </div>
              <button
                onClick={() => handleCorrelateNewTag()}
                disabled={isThinking || !newTagInput.trim()}
                className="w-full md:w-auto px-4 py-2 bg-[#E8490A] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-[#c44000] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <Sparkles size={14} className={isThinking ? 'animate-spin' : ''} />
                {isThinking ? 'Processando...' : 'Pensar & Correlacionar'}
              </button>
            </div>

            {/* Status / Log de Ingestão */}
            {thinkingLog && (
              <div className="mt-2.5 pt-2 border-t border-black/05 flex items-center justify-between text-[11px] text-[#1A1A1A]/70 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {thinkingLog}
                </span>
                <span className="text-[9px] uppercase font-bold text-[#E8490A]">Cofre Atualizado</span>
              </div>
            )}
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
                      Grafo Semântico Interativo
                    </h3>
                    <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                      ({nodes.length} conceitos / {connections.length} sinapses)
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
                    </select>
                  </div>
                </div>

                {/* SVG DO GRAFO SEMÂNTICO */}
                <div className="relative w-full h-[450px] bg-[#0A0A08] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
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

                    {/* SINAPSES (Arestas Ponderadas) */}
                    {connections.map((conn, idx) => {
                      const fn = nodes.find(n => n.id === conn.from);
                      const tn = nodes.find(n => n.id === conn.to);
                      if (!fn || !tn) return null;

                      if (filterEixo !== 'TODOS' && fn.eixo !== filterEixo && tn.eixo !== filterEixo) {
                        return null;
                      }

                      const isHighlighted =
                        selectedNodeId && (fn.id === selectedNodeId || tn.id === selectedNodeId);
                      const w = conn.weight || 0.5;
                      const color = fn.fill || '#E8490A';

                      return (
                        <g key={`edge-${idx}`}>
                          <line
                            x1={fn.x}
                            y1={fn.y}
                            x2={tn.x}
                            y2={tn.y}
                            stroke={color}
                            strokeWidth={isHighlighted ? w * 3 + 1 : w * 2}
                            opacity={isHighlighted ? 0.85 : 0.25}
                            strokeDasharray={conn.discovered ? '4,4' : undefined}
                          />
                          {isHighlighted && (
                            <text
                              x={(fn.x! + tn.x!) / 2}
                              y={(fn.y! + tn.y!) / 2 - 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="8"
                              fontFamily="monospace"
                              className="pointer-events-none opacity-80"
                            >
                              {(w * 100).toFixed(0)}%
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* NÓS DO GRAFO */}
                    {nodes.map(node => {
                      if (filterEixo !== 'TODOS' && node.eixo !== filterEixo && node.id !== 'core') {
                        return null;
                      }

                      const isSel = node.id === selectedNodeId;
                      const act = activeActivations[node.id] || node.activation || 0.5;
                      const radius = isSel ? node.size! + 4 : node.size || 14;

                      return (
                        <g
                          key={node.id}
                          className="cursor-pointer"
                          onMouseDown={e => handleMouseDown(node.id, e)}
                          onClick={() => setSelectedNodeId(node.id)}
                        >
                          {/* Halo de Ativação / Certeza Residual */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius + 14 * act}
                            fill={node.fill}
                            opacity={isSel ? 0.35 : act * 0.15}
                            filter="url(#sem-halo)"
                            className="pointer-events-none transition-all duration-300"
                          />

                          {/* Núcleo do Conceito */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius}
                            fill={node.fill}
                            stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                            strokeWidth={isSel ? 2.5 : 1}
                            filter={isSel ? 'url(#sem-glow)' : undefined}
                            className="transition-all duration-200"
                          />

                          {/* Rótulo do Conceito */}
                          <text
                            x={node.x}
                            y={node.y! + radius + 15}
                            textAnchor="middle"
                            fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.7)'}
                            fontSize={isSel ? '10' : '8.5'}
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

            {/* COLUNA 3: Painel do Cofre Semântico Vivo & Detalhes da Tag */}
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

                  {/* Hash do Cofre / DNA Semântico */}
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
                    >
                      {copySuccess ? <Check size={10} /> : <Copy size={10} />}
                    </button>
                  </div>

                  {/* Descrição Curatorial */}
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
                        Família Cultural & Genealogia:
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
                        Conexões por Família Similar:
                      </p>
                      <div className="space-y-1">
                        {similarFamilies.slice(0, 3).map(sim => (
                          <button
                            key={sim.id}
                            onClick={() => setSelectedNodeId(sim.id)}
                            className="w-full text-left p-1.5 rounded-lg bg-black/[0.02] hover:bg-[#E8490A]/08 border border-black/04 transition-all flex items-center justify-between text-[10px]"
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
                        Acervos Federados que Custodiam:
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

                  {/* Atalho para Ver Artigos Desta Tag */}
                  <div className="pt-2 border-t border-black/08">
                    <button
                      onClick={() => setSubTab('artigos')}
                      className="w-full py-2 bg-black/[0.03] hover:bg-[#E8490A]/10 text-[#E8490A] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen size={13} />
                      <span>Ver Artigos Desta Tag ({articlesSpecificToNode.length > 0 ? articlesSpecificToNode.length : 'Gerais'})</span>
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
      {/* ABA 3: ARTIGOS & BIBLIOGRAFIA CIENTÍFICA                                 */}
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
                {selectedNode ? (
                  <span>Exibindo artigos correlacionados à tag ativa <strong className="text-[#E8490A]">"{selectedNode.label}"</strong> e literatura fundamental.</span>
                ) : (
                  <span>Bibliografia completa em CIDOC-CRM ISO 21127, Europeana EDM, SKOS W3C e RAG Multi-Hop.</span>
                )}
              </p>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['TODOS', 'Padrões de Interoperabilidade (CIDOC-CRM / EDM)', 'Camada Semântica & SKOS', 'Spreading Activation & RAG'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setArticleCategoryFilter(cat)}
                  className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-lg transition-all ${
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
              const isDirectlyAssociated = selectedNode && art.tagAssociada && art.tagAssociada.includes(selectedNode.id);

              return (
                <div
                  key={art.id}
                  className={`glass-card p-5 border transition-all space-y-3.5 flex flex-col justify-between ${
                    isDirectlyAssociated ? 'border-[#E8490A]/40 bg-[#E8490A]/02 shadow-sm' : 'border-black/07'
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
                      <strong className="text-[#1A1A1A]">Impacto no SFD:</strong> {art.aplicacaoNoSFD}
                    </div>

                    <a
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1E3A8A] hover:text-[#E8490A] transition-colors"
                    >
                      <span>Acessar Publicação / DOI</span>
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
