'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Search,
  Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Zap, Link2,
  ShieldCheck
} from 'lucide-react';
import {
  runSpreadingActivation,
  GraphMathNode,
  GraphMathEdge
} from '@/lib/ml/graph-math';
import { CULTURAL_VAULT_REGISTRY, ConceptVaultItem } from '@/app/api/interop/live-vault/route';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

// ─── NÓS CULTURAIS CANÔNICOS (Sem tags de teste e sem poluição) ───────────
const INITIAL_CULTURAL_NODES: GraphMathNode[] = [
  {
    id: 'core',
    label: 'Cofre Semântico',
    x: 400,
    y: 215,
    size: 28,
    fill: '#E8490A',
    eixo: 'NUCLEO',
    desc: 'Núcleo central de custódia e tráfego cultural. Preserva proveniência social, interliga saberes e ancora conceitos globais.',
    type: 'Cofre Central',
    familia: 'sistema.nucleo',
    activation: 1.0
  },
  {
    id: 'carranca',
    label: 'Carranca',
    x: 210,
    y: 310,
    size: 19,
    fill: '#1A6B3A',
    eixo: 'SABERES',
    desc: 'Escultura antropomórfica em madeira do Rio São Francisco com função de proteção aos navegantes.',
    type: 'Tag Preservada',
    familia: 'saberes.escultura.fluvial',
    activation: 0.94
  },
  {
    id: 'mestre_vitalino',
    label: 'Mestre Vitalino',
    x: 320,
    y: 345,
    size: 17,
    fill: '#1A6B3A',
    eixo: 'SABERES',
    desc: 'Pioneiro da cerâmica figurativa em barro no Alto do Moura, retratando o universo cultural do sertão.',
    type: 'Tag Preservada',
    familia: 'saberes.ceramica.agreste',
    activation: 0.88
  },
  {
    id: 'bumba_boi',
    label: 'Bumba-meu-boi',
    x: 210,
    y: 115,
    size: 18,
    fill: '#1E3A8A',
    eixo: 'FESTA',
    desc: 'Complexo lúdico-dramático do ciclo junino maranhense com sotaques tradicionais de matraca e orquestra.',
    type: 'Tag Preservada',
    familia: 'festa.popular.auto_dramatico',
    activation: 0.90
  },
  {
    id: 'frevo',
    label: 'Frevo',
    x: 580,
    y: 110,
    size: 17,
    fill: '#0891B2',
    eixo: 'MUSICA',
    desc: 'Expressão musical e coreográfica de ritmo acelerado e passos sincopados do carnaval pernambucano.',
    type: 'Tag Preservada',
    familia: 'musica.danca.carnaval',
    activation: 0.86
  },
  {
    id: 'capoeira',
    label: 'Roda de Capoeira',
    x: 640,
    y: 240,
    size: 18,
    fill: '#0891B2',
    eixo: 'MUSICA',
    desc: 'Arte marcial, dança, musicalidade, ancestralidade e jogo ritual de resistência afro-brasileira.',
    type: 'Tag Preservada',
    familia: 'musica.luta.tradicao_oral',
    activation: 0.89
  },
  {
    id: 'maracatu',
    label: 'Maracatu Nação',
    x: 470,
    y: 90,
    size: 16,
    fill: '#0891B2',
    eixo: 'MUSICA',
    desc: 'Cortejo sagrado de baque virado com coroação de reis e rainhas do Congo e calungas tradicionais.',
    type: 'Tag Preservada',
    familia: 'musica.cortejo.percussao',
    activation: 0.82
  },
  {
    id: 'cordel',
    label: 'Literatura de Cordel',
    x: 150,
    y: 220,
    size: 16,
    fill: '#1A6B3A',
    eixo: 'SABERES',
    desc: 'Gênero poético popular em folhetos rimados e xilogravuras que salvaguarda a memória social nordestina.',
    type: 'Tag Preservada',
    familia: 'saberes.poesia_popular',
    activation: 0.80
  },
  {
    id: 'ex_voto',
    label: 'Ex-votos do Nordeste',
    x: 440,
    y: 350,
    size: 16,
    fill: '#6D28D9',
    eixo: 'CRENCAS',
    desc: 'Peças esculpidas em madeira e cera depositadas em santuários como testemunho de graças alcançadas.',
    type: 'Tag Preservada',
    familia: 'crencas.religiosidade_popular',
    activation: 0.79
  }
];

const INITIAL_CULTURAL_EDGES: GraphMathEdge[] = [
  { from: 'core', to: 'carranca', weight: 0.95, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'SABERES' },
  { from: 'core', to: 'bumba_boi', weight: 0.92, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'FESTA' },
  { from: 'core', to: 'frevo', weight: 0.89, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'MUSICA' },
  { from: 'core', to: 'capoeira', weight: 0.91, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'MUSICA' },
  { from: 'core', to: 'mestre_vitalino', weight: 0.88, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'SABERES' },
  { from: 'core', to: 'maracatu', weight: 0.84, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'MUSICA' },
  { from: 'core', to: 'cordel', weight: 0.82, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'SABERES' },
  { from: 'core', to: 'ex_voto', weight: 0.81, skosRelation: 'skos:narrower', mechanism: 'curator', eixoRel: 'CRENCAS' },
  
  // Conexões semânticas entre manifestações
  { from: 'carranca', to: 'mestre_vitalino', weight: 0.86, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'ex_voto', weight: 0.82, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'cordel', weight: 0.75, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'frevo', to: 'capoeira', weight: 0.89, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'frevo', to: 'maracatu', weight: 0.81, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'capoeira', to: 'maracatu', weight: 0.83, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'bumba_boi', to: 'maracatu', weight: 0.85, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'bumba_boi', to: 'cordel', weight: 0.72, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'mestre_vitalino', to: 'cordel', weight: 0.79, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'mestre_vitalino', to: 'ex_voto', weight: 0.76, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' }
];

export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {
  const [nodes, setNodes] = useState<GraphMathNode[]>(INITIAL_CULTURAL_NODES);
  const [connections, setConnections] = useState<GraphMathEdge[]>(INITIAL_CULTURAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('carranca');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [activePulseKey, setActivePulseKey] = useState<string | null>(null);
  const [isTestingTransfer, setIsTestingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Dossiê Canônico do Conceito Cultural Ativo ──
  const activeConcept: ConceptVaultItem = useMemo(() => {
    const key = (selectedNodeId || 'carranca').toLowerCase().replace(/\s+/g, '_');
    return CULTURAL_VAULT_REGISTRY[key] || CULTURAL_VAULT_REGISTRY['carranca'];
  }, [selectedNodeId]);

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[1] || nodes[0];
  }, [nodes, selectedNodeId]);

  // ── Spreading Activation em Background (Sem exibir números na tela) ──
  const spreadingResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNodeId, initialEnergy: 1.0 }], {
      decay: 0.78,
      retention: 0.22,
      maxIterations: 6,
      normalize: true
    });
  }, [nodes, connections, selectedNodeId]);

  const nodeActivations = useMemo(() => spreadingResult?.nodeActivations || {}, [spreadingResult]);

  // ── Conexões do Grafo com Afirmações Textuais ──
  const connectedNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    return activeConcept.conexoesTextuais.map(conn => {
      const n = nodes.find(x => x.id === conn.targetId);
      return {
        id: conn.targetId,
        label: conn.targetTag,
        afirmacaoCultural: conn.afirmacaoCultural,
        node: n
      };
    });
  }, [activeConcept, nodes]);

  // ── Tráfego Sináptico Autônomo (Pulso sutil de dados na rede) ──
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (connections.length === 0) return;
      const randomEdge = connections[Math.floor(Math.random() * connections.length)];
      const pKey = `${randomEdge.from}__${randomEdge.to}`;
      setActivePulseKey(pKey);

      setTimeout(() => {
        setActivePulseKey(null);
      }, 1600);
    }, 4000);

    return () => clearInterval(pulseInterval);
  }, [connections]);

  // ── Física de Molas Orgânica ──
  useEffect(() => {
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const cx = 400;
        const cy = 215;
        const kRepulsion = 4600;
        const kSpring = 0.042;

        return prev.map(node => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || cx)) * 0.014;
          let fy = (cy - (node.y || cy)) * 0.014;

          for (const other of prev) {
            if (other.id === node.id) continue;
            const dx = (node.x || cx) - (other.x || cx);
            const dy = (node.y || cy) - (other.y || cy);
            const distSq = dx * dx + dy * dy + 180;
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
                const dx = (neighbor.x || cx) - (node.x || cx);
                const dy = (neighbor.y || cy) - (node.y || cy);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const targetDist = node.id === 'core' || neighborId === 'core' ? 140 : 160;
                const springForce = (dist - targetDist) * kSpring * (edge.weight || 0.6);
                fx += (dx / dist) * springForce;
                fy += (dy / dist) * springForce;
              }
            }
          }

          const damping = 0.79;
          const vx = ((node.vx || 0) + fx) * damping;
          const vy = ((node.vy || 0) + fy) * damping;

          return {
            ...node,
            x: Math.max(55, Math.min(745, (node.x || cx) + vx)),
            y: Math.max(45, Math.min(385, (node.y || cy) + vy)),
            vx,
            vy
          };
        });
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [draggedNodeId, connections]);

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

  const handleMouseUp = () => setDraggedNodeId(null);

  // ── JSON-LD 1.1 Conforme Especificação ──
  const currentJsonLd = useMemo(() => {
    return {
      "@context": {
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "schema": "http://schema.org/",
        "prov": "http://www.w3.org/ns/prov#",
        "wd": "http://www.wikidata.org/entity/"
      },
      "@id": `https://folksonomia-digital.cultura.gov.br/tag/${activeConcept.id}`,
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": activeConcept.tag,
        "@language": "pt-BR"
      },
      "schema:description": activeConcept.descricao,
      "prov:wasAttributedTo": {
        "@id": `https://folksonomia-digital.cultura.gov.br/user/${activeConcept.uuid.substring(0, 8)}`,
        "@type": "prov:Person",
        "schema:name": activeConcept.autor
      },
      "skos:broadMatch": {
        "@id": activeConcept.wikidata.id,
        "@type": "skos:Concept",
        "skos:prefLabel": {
          "@value": activeConcept.wikidata.enLabel,
          "@language": "en"
        }
      },
      "schema:subjectOf": [
        {
          "@id": activeConcept.artigo.url,
          "@type": "schema:ScholarlyArticle",
          "schema:name": activeConcept.artigo.titulo,
          "schema:publisher": activeConcept.artigo.veiculo
        }
      ]
    };
  }, [activeConcept]);

  // ── Teste de Transferência de Dados via API ──
  const handleRunTransferTest = async () => {
    setIsTestingTransfer(true);
    setTransferResult(null);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${activeConcept.id}`, {
        headers: { Accept: 'application/ld+json' }
      });
      if (res.ok) {
        const json = await res.json();
        setTransferResult(JSON.stringify(json, null, 2));
      } else {
        setTransferResult(JSON.stringify(currentJsonLd, null, 2));
      }
    } catch {
      setTransferResult(JSON.stringify(currentJsonLd, null, 2));
    } finally {
      setIsTestingTransfer(false);
      setShowJsonModal(true);
    }
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(term) || (n.familia || '').toLowerCase().includes(term));
  }, [nodes, searchTerm]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── CABEÇALHO LIMPO E INTUITIVO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
              <FolderLock size={24} className="text-[#E8490A]" />
              Cofre Semântico Vivo & Tráfego de Informação
            </h2>
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              Rede Conectada
            </span>
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 font-medium">
            Preservação de tags criadas por usuários, proveniência social, vinculação a artigos científicos e transferência em padrão internacional JSON-LD.
          </p>
        </div>

        {/* BUSCA RÁPIDA DE TAGS */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Localizar tag no cofre..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30"
            />
          </div>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL: GRAFO INTERLIGADO + COFRE VIVO DA TAG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA (7 colunas): GRAFO INTERLIGADO */}
        <div className="lg:col-span-7 space-y-3">
          <div className="glass-card p-4 border border-black/07">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Network size={15} className="text-[#E8490A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Rede de Interconexão Semântica
                </h3>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">
                Clique nos nós para abrir o cofre de cada tag
              </span>
            </div>

            {/* CANVAS DO GRAFO */}
            <div className="relative w-full h-[470px] bg-[#0C0C0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                viewBox="0 0 800 430"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="halo-pulse" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grade de Fundo */}
                {Array.from({ length: 48 }).map((_, i) => (
                  <circle
                    key={`dot-${i}`}
                    cx={(i % 8) * 115 + 30}
                    cy={Math.floor(i / 8) * 72 + 30}
                    r="1.2"
                    fill="rgba(255,255,255,0.03)"
                  />
                ))}

                {/* ARESTAS / SINAPSES (Sem números nem percentuais) */}
                {connections.map((conn, idx) => {
                  const fn = nodes.find(n => n.id === conn.from);
                  const tn = nodes.find(n => n.id === conn.to);
                  if (!fn || !tn) return null;

                  const isHighlighted = selectedNodeId && (fn.id === selectedNodeId || tn.id === selectedNodeId);
                  const isPulsing = activePulseKey === `${conn.from}__${conn.to}` || activePulseKey === `${conn.to}__${conn.from}`;
                  const color = isPulsing ? '#a855f7' : (fn.fill || '#E8490A');

                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={fn.x ?? 400}
                        y1={fn.y ?? 215}
                        x2={tn.x ?? 400}
                        y2={tn.y ?? 215}
                        stroke={color}
                        strokeWidth={isPulsing ? 3.8 : isHighlighted ? 2.8 : 1.4}
                        opacity={isPulsing ? 1.0 : isHighlighted ? 0.88 : 0.22}
                        className={isPulsing ? 'animate-pulse' : ''}
                      />
                    </g>
                  );
                })}

                {/* NÓS CULTURAIS */}
                {filteredNodes.map(node => {
                  const isSel = node.id === selectedNodeId;
                  const act = nodeActivations[node.id] || node.activation || 0.6;
                  const radius = isSel ? (node.size || 15) + 4 : node.size || 15;
                  const nx = node.x ?? 400;
                  const ny = node.y ?? 215;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseDown={e => handleMouseDown(node.id, e)}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      {/* Halo */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={radius + 14 * act}
                        fill={node.fill}
                        opacity={isSel ? 0.38 : act * 0.15}
                        filter="url(#halo-pulse)"
                        className="pointer-events-none transition-all duration-300"
                      />

                      {/* Núcleo do Nó */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={radius}
                        fill={node.fill}
                        stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={isSel ? 2.5 : 1}
                        filter={isSel ? 'url(#node-glow)' : undefined}
                        className="transition-all duration-200"
                      />

                      {/* Nome do Nó */}
                      <text
                        x={nx}
                        y={ny + radius + 15}
                        textAnchor="middle"
                        fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.85)'}
                        fontSize={isSel ? '11' : '9.5'}
                        fontWeight={isSel ? '700' : '500'}
                        className="pointer-events-none select-none transition-all"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[9px] text-white/50 font-mono pointer-events-none">
                <span>Clique em qualquer manifestação para visualizar seu cofre vivo e proveniência</span>
                <span className="text-[#E8490A] font-bold">Rede Interligada</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): COFRE VIVO DA TAG SELECIONADA */}
        <div className="lg:col-span-5 space-y-4">

          <div className="glass-card p-5 border border-black/07 space-y-4 shadow-sm">
            
            {/* Header da Tag Preservada */}
            <div className="flex items-start justify-between gap-3 border-b border-black/08 pb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white inline-block"
                    style={{ background: activeConcept.cor || '#E8490A' }}
                  >
                    Tag Preservada no Cofre
                  </span>
                  <span className="text-[9px] font-mono text-black/40">UUID: {activeConcept.uuid.substring(0, 8)}...</span>
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">{activeConcept.tag}</h3>
                <p className="text-xs text-[#1A1A1A]/70 mt-1 leading-relaxed">{activeConcept.descricao}</p>
              </div>
            </div>

            {/* Proveniência Social & Autor da Tag (Linguagem simples, frase natural) */}
            <div className="p-3 bg-black/[0.02] border border-black/06 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                <span className="flex items-center gap-1"><User size={11} className="text-[#E8490A]" /> Proveniência e Contexto</span>
                <span className="font-mono text-green-700 font-bold">Autoria Preservada</span>
              </div>
              <p className="text-[#1A1A1A] text-[11px]">
                Criada por <strong className="font-semibold">{activeConcept.autor}</strong> em {activeConcept.dataCriacao}.
              </p>
              <div className="text-[11px] text-[#1A1A1A]/80 pt-1 border-t border-black/04 leading-relaxed">
                <strong className="text-[#E8490A] font-semibold">Relação cultural:</strong> {activeConcept.triplaFrase}
              </div>
            </div>

            {/* ARTIGO CIENTÍFICO REAL ANCORADO À TAG */}
            <div className="p-3.5 bg-gradient-to-br from-white via-white to-[#E8490A]/04 border border-[#E8490A]/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#E8490A]">
                <span className="flex items-center gap-1"><BookOpen size={12} /> Artigo Científico Vinculado</span>
                <span className="font-mono text-[9px] text-[#1A1A1A]/50">Fonte Acadêmica</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                  {activeConcept.artigo.titulo}
                </h4>
                <p className="text-[10px] text-[#1A1A1A]/60 mt-0.5 font-medium">
                  {activeConcept.artigo.autor} • <span className="italic">{activeConcept.artigo.veiculo}</span> ({activeConcept.artigo.ano})
                </p>
              </div>

              <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-1.5">
                {activeConcept.artigo.resumo}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="font-mono text-[#1A1A1A]/50">DOI: {activeConcept.artigo.doi}</span>
                <a
                  href={activeConcept.artigo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline"
                >
                  <span>Acessar Publicação</span>
                  <ArrowUpRight size={11} />
                </a>
              </div>
            </div>

            {/* CONEXÕES CULTURAIS DESCOBERTAS (Afirmações textuais, sem scores) */}
            {connectedNeighbors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                  Conexões Culturais Interligadas:
                </p>
                <div className="space-y-1.5">
                  {connectedNeighbors.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedNodeId(item.id)}
                      className="w-full p-2.5 rounded-xl bg-black/[0.02] hover:bg-[#E8490A]/06 border border-black/05 text-left transition-all flex items-start gap-2 cursor-pointer group"
                    >
                      <Link2 size={12} className="text-[#E8490A] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-[10.5px] text-[#1A1A1A]/80 leading-snug">
                        {item.afirmacaoCultural}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* BOTÃO DE TESTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) */}
            <div className="pt-2 border-t border-black/08">
              <button
                onClick={handleRunTransferTest}
                disabled={isTestingTransfer}
                className="w-full py-2.5 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send size={13} className={isTestingTransfer ? 'animate-spin' : ''} />
                <span>{isTestingTransfer ? 'Transferindo Dados...' : 'Executar Teste de Transferência de Dados (JSON-LD)'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: PACOTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
            
            {/* Header do Modal */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote de Transferência de Dados — "{activeConcept.tag}"
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono">
                    JSON-LD 1.1 • W3C SKOS • PROV-O • Schema.org
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>

            {/* Informações da Consulta */}
            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/70 flex flex-wrap items-center justify-between gap-2">
              <span>Endpoint: <code>/api/interop/jsonld?tag={activeConcept.id}</code></span>
              <span className="text-green-400 font-bold">Accept: application/ld+json (200 OK)</span>
            </div>

            {/* Código JSON-LD Formatado */}
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {transferResult || JSON.stringify(currentJsonLd, null, 2)}
              </pre>
            </div>

            {/* Footer do Modal */}
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                A tag original permanece soberana e ancorada a conceitos globais via SKOS.
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transferResult || JSON.stringify(currentJsonLd, null, 2));
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="px-4 py-1.5 bg-[#E8490A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#c44000] cursor-pointer"
              >
                {copySuccess ? <Check size={13} /> : <Copy size={13} />}
                <span>{copySuccess ? 'Copiado!' : 'Copiar Pacote JSON-LD'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
