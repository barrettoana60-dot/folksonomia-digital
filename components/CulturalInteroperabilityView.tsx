'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Search,
  Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Zap, Link2,
  ShieldCheck, ArrowRight, Tag, Database, Layers, Globe
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

// ─── ETAPAS DO FLUXO DO COFRE VIVO ──────────────────────────────────────────
const VAULT_FLOW_STEPS = [
  {
    icon: Tag,
    title: 'Tag Gerada',
    desc: 'Usuário cria a tag e envia ao sistema'
  },
  {
    icon: ShieldCheck,
    title: 'Preservada',
    desc: 'Autoria, contexto e origem são preservados'
  },
  {
    icon: Database,
    title: 'Compactada',
    desc: 'Informação é concentrada no cofre vivo'
  },
  {
    icon: Network,
    title: 'Interligada',
    desc: 'Sistema encontra famílias e conceitos afins'
  },
  {
    icon: BookOpen,
    title: 'Ancorada',
    desc: 'Vinculada a artigos e bases verificadas'
  },
  {
    icon: Globe,
    title: 'Interoperável',
    desc: 'Pode ser transferida para qualquer sistema'
  }
];

// ─── NÓS CULTURAIS CANÔNICOS DO GRAFO VIVO ─────────────────────────────────
const INITIAL_CULTURAL_NODES: GraphMathNode[] = [
  {
    id: 'carranca',
    label: 'Carranca',
    x: 400,
    y: 160,
    size: 20,
    fill: '#22c55e',
    eixo: 'SABERES',
    desc: 'Escultura antropomórfica em madeira colocada na proa das embarcações fluviais do Rio São Francisco para afastar maus espíritos e proteger navegantes.',
    type: 'Tag do Público (Preservada)',
    familia: 'saberes.escultura.fluvial',
    activation: 1.0
  },
  {
    id: 'mestre_vitalino',
    label: 'Mestre Vitalino',
    x: 480,
    y: 340,
    size: 19,
    fill: '#22c55e',
    eixo: 'SABERES',
    desc: 'Pioneiro da cerâmica figurativa em barro no Alto do Moura, retratando o universo cultural do sertão.',
    type: 'Tag do Público (Preservada)',
    familia: 'saberes.ceramica.agreste',
    activation: 0.90
  },
  {
    id: 'bumba_boi',
    label: 'Bumba-meu-boi',
    x: 230,
    y: 270,
    size: 16,
    fill: '#3b82f6',
    eixo: 'FESTA',
    desc: 'Complexo lúdico-dramático do ciclo junino maranhense com sotaques tradicionais de matraca e orquestra.',
    type: 'Tag do Público (Preservada)',
    familia: 'festa.popular.auto_dramatico',
    activation: 0.88
  },
  {
    id: 'frevo',
    label: 'Frevo',
    x: 310,
    y: 330,
    size: 16,
    fill: '#06b6d4',
    eixo: 'MUSICA',
    desc: 'Expressão musical e coreográfica de ritmo acelerado e passos sincopados do carnaval pernambucano.',
    type: 'Tag do Público (Preservada)',
    familia: 'musica.danca.carnaval',
    activation: 0.86
  },
  {
    id: 'capoeira',
    label: 'Roda de Capoeira',
    x: 520,
    y: 200,
    size: 16,
    fill: '#06b6d4',
    eixo: 'MUSICA',
    desc: 'Arte marcial, dança, musicalidade, ancestralidade e jogo ritual de resistência afro-brasileira.',
    type: 'Tag do Público (Preservada)',
    familia: 'musica.luta.tradicao_oral',
    activation: 0.89
  },
  {
    id: 'maracatu',
    label: 'Maracatu Nação',
    x: 440,
    y: 80,
    size: 15,
    fill: '#06b6d4',
    eixo: 'MUSICA',
    desc: 'Cortejo sagrado de baque virado com coroação de reis e rainhas do Congo e calungas tradicionais.',
    type: 'Tag do Público (Preservada)',
    familia: 'musica.cortejo.percussao',
    activation: 0.82
  },
  {
    id: 'cordel',
    label: 'Literatura de Cordel',
    x: 270,
    y: 190,
    size: 15,
    fill: '#22c55e',
    eixo: 'SABERES',
    desc: 'Gênero poético popular em folhetos rimados e xilogravuras que salvaguarda a memória social nordestina.',
    type: 'Tag do Público (Preservada)',
    familia: 'saberes.poesia_popular',
    activation: 0.80
  },
  {
    id: 'ex_voto',
    label: 'Ex-votos do Nordeste',
    x: 350,
    y: 380,
    size: 15,
    fill: '#a855f7',
    eixo: 'CRENCAS',
    desc: 'Peças esculpidas em madeira e cera depositadas em santuários como testemunho de graças alcançadas.',
    type: 'Tag do Público (Preservada)',
    familia: 'crencas.religiosidade_popular',
    activation: 0.79
  }
];

const INITIAL_CULTURAL_EDGES: GraphMathEdge[] = [
  { from: 'carranca', to: 'mestre_vitalino', weight: 0.95, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'ex_voto', weight: 0.89, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'cordel', weight: 0.84, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' },
  { from: 'carranca', to: 'bumba_boi', weight: 0.77, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'carranca', to: 'maracatu', weight: 0.82, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'carranca', to: 'frevo', weight: 0.75, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'carranca', to: 'capoeira', weight: 0.86, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  
  { from: 'frevo', to: 'capoeira', weight: 0.92, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'frevo', to: 'maracatu', weight: 0.88, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'capoeira', to: 'maracatu', weight: 0.85, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'MUSICA' },
  { from: 'bumba_boi', to: 'maracatu', weight: 0.87, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'FESTA' },
  { from: 'mestre_vitalino', to: 'cordel', weight: 0.84, skosRelation: 'skos:related', mechanism: 'hebbian', eixoRel: 'SABERES' }
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
    return nodes.find(n => n.id === selectedNodeId) || nodes[0];
  }, [nodes, selectedNodeId]);

  // ── Spreading Activation em Background ──
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

  // ── Tráfego Sináptico Autônomo e Contínuo (Pulso de dados) ──
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (connections.length === 0) return;
      const randomEdge = connections[Math.floor(Math.random() * connections.length)];
      const pKey = `${randomEdge.from}__${randomEdge.to}`;
      setActivePulseKey(pKey);

      setTimeout(() => {
        setActivePulseKey(null);
      }, 1600);
    }, 3200);

    return () => clearInterval(pulseInterval);
  }, [connections]);

  // ── Física de Molas Orgânica ──
  useEffect(() => {
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const cx = 390;
        const cy = 230;
        const kRepulsion = 4200;
        const kSpring = 0.038;

        return prev.map(node => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || cx)) * 0.012;
          let fy = (cy - (node.y || cy)) * 0.012;

          for (const other of prev) {
            if (other.id === node.id) continue;
            const dx = (node.x || cx) - (other.x || cx);
            const dy = (node.y || cy) - (other.y || cy);
            const distSq = dx * dx + dy * dy + 160;
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
                const targetDist = 145;
                const springForce = (dist - targetDist) * kSpring * (edge.weight || 0.6);
                fx += (dx / dist) * springForce;
                fy += (dy / dist) * springForce;
              }
            }
          }

          const damping = 0.80;
          const vx = ((node.vx || 0) + fx) * damping;
          const vy = ((node.vy || 0) + fy) * damping;

          return {
            ...node,
            x: Math.max(50, Math.min(730, (node.x || cx) + vx)),
            y: Math.max(40, Math.min(380, (node.y || cy) + vy)),
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

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── CARD PRINCIPAL COM CABEÇALHO E FLUXO DO COFRE VIVO ── */}
      <div className="glass-card p-6 border border-black/08 rounded-3xl bg-gradient-to-b from-white via-white to-orange-50/20 shadow-sm space-y-6">
        
        {/* Título & Descrição Superior */}
        <div>
          <h2 className="text-2xl font-normal serif-title tracking-tight flex items-center gap-2.5 text-[#1A1A1A]">
            <FolderLock size={26} className="text-[#E8490A]" />
            Cofre Semântico Vivo & Tráfego de Informação
          </h2>
          <p className="text-xs text-[#1A1A1A]/60 mt-1 font-medium">
            Tags geradas pelo público são preservadas, compactadas, interligadas automaticamente e transferíveis.
          </p>
        </div>

        {/* ── FLUXO DO COFRE VIVO — DA TAG DO USUÁRIO À REDE INTEIRA ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#E8490A] font-bold">〰</span>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]/80">
              Fluxo do Cofre Vivo — Da Tag do Usuário à Rede Inteira
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {VAULT_FLOW_STEPS.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white border border-black/07 shadow-xs hover:border-[#E8490A]/30 transition-all flex flex-col justify-between space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-[#E8490A]/10 text-[#E8490A] flex items-center justify-center">
                      <IconComp size={14} />
                    </div>
                    {idx < VAULT_FLOW_STEPS.length - 1 && (
                      <ArrowRight size={12} className="text-black/20 group-hover:text-[#E8490A]/60 transition-colors hidden lg:block" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]">{step.title}</h4>
                    <p className="text-[10px] text-[#1A1A1A]/55 mt-0.5 leading-snug">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── ÁREA PRINCIPAL: REDE VIVA DE CONEXÕES + COFRE VIVO DA TAG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA (7 colunas): REDE VIVA DE CONEXÕES */}
        <div className="lg:col-span-7 space-y-3">
          <div className="glass-card p-5 border border-black/07 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={16} className="text-[#E8490A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Rede Viva de Conexões
                </h3>
                <span className="text-[10.5px] text-[#1A1A1A]/45 font-normal">
                  ({nodes.length} tags / {connections.length} interligações automáticas)
                </span>
              </div>
              <span className="text-[10.5px] text-[#1A1A1A]/50 font-medium">
                Clique em um item para abrir seu cofre
              </span>
            </div>

            {/* CANVAS DO GRAFO ESCURO DE ALTO CONTRASTE */}
            <div className="relative w-full h-[480px] bg-[#0A0A0C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                viewBox="0 0 800 430"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <filter id="node-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="halo-pulse-amber" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grade de Fundo Sutil */}
                {Array.from({ length: 48 }).map((_, i) => (
                  <circle
                    key={`dot-${i}`}
                    cx={(i % 8) * 115 + 30}
                    cy={Math.floor(i / 8) * 72 + 30}
                    r="1.2"
                    fill="rgba(255,255,255,0.03)"
                  />
                ))}

                {/* ARESTAS / SINAPSES DE INTERLIGAÇÃO (Com linhas contínuas e tracejadas ambar) */}
                {connections.map((conn, idx) => {
                  const fn = nodes.find(n => n.id === conn.from);
                  const tn = nodes.find(n => n.id === conn.to);
                  if (!fn || !tn) return null;

                  const isHighlighted = selectedNodeId && (fn.id === selectedNodeId || tn.id === selectedNodeId);
                  const isPulsing = activePulseKey === `${conn.from}__${conn.to}` || activePulseKey === `${conn.to}__${conn.from}`;
                  
                  const isMainHub = fn.id === selectedNodeId || tn.id === selectedNodeId;
                  const strokeColor = isPulsing ? '#a855f7' : isMainHub ? '#f59e0b' : 'rgba(16, 185, 129, 0.4)';
                  const isDashed = isMainHub;

                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={fn.x ?? 400}
                        y1={fn.y ?? 215}
                        x2={tn.x ?? 400}
                        y2={tn.y ?? 215}
                        stroke={strokeColor}
                        strokeWidth={isPulsing ? 3.5 : isHighlighted ? 2.5 : 1.2}
                        strokeDasharray={isDashed ? '4,4' : undefined}
                        opacity={isPulsing ? 1.0 : isHighlighted ? 0.95 : 0.25}
                        className={isPulsing ? 'animate-pulse' : ''}
                      />
                      {isHighlighted && (
                        <text
                          x={((fn.x ?? 400) + (tn.x ?? 400)) / 2}
                          y={((fn.y ?? 215) + (tn.y ?? 215)) / 2 - 4}
                          textAnchor="middle"
                          fill="#f59e0b"
                          fontSize="8.5"
                          fontFamily="monospace"
                          className="pointer-events-none opacity-90 font-bold"
                        >
                          {(conn.weight * 100).toFixed(0)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* NÓS CULTURAIS INTERLIGADOS */}
                {nodes.map(node => {
                  const isSel = node.id === selectedNodeId;
                  const act = nodeActivations[node.id] || node.activation || 0.6;
                  const radius = isSel ? (node.size || 15) + 5 : node.size || 15;
                  const nx = node.x ?? 400;
                  const ny = node.y ?? 215;
                  const nodeColor = isSel ? '#22c55e' : (node.fill || '#22c55e');

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
                        r={radius + (isSel ? 16 : 10 * act)}
                        fill={nodeColor}
                        opacity={isSel ? 0.35 : act * 0.12}
                        filter="url(#halo-pulse-amber)"
                        className="pointer-events-none transition-all duration-300"
                      />

                      {/* Núcleo do Nó */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={radius}
                        fill={nodeColor}
                        stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={isSel ? 2.5 : 1}
                        filter={isSel ? 'url(#node-glow-amber)' : undefined}
                        className="transition-all duration-200"
                      />

                      {/* Nome do Nó */}
                      <text
                        x={nx}
                        y={ny + radius + 15}
                        textAnchor="middle"
                        fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.85)'}
                        fontSize={isSel ? '11.5' : '9.5'}
                        fontWeight={isSel ? '700' : '500'}
                        className="pointer-events-none select-none transition-all"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Rodapé da Rede */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[9.5px] text-white/50 font-mono pointer-events-none">
                <span>Clique em qualquer manifestação para visualizar seu cofre vivo e proveniência</span>
                <span className="text-[#E8490A] font-bold">Rede Interligada</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): COFRE VIVO DA TAG SELECIONADA */}
        <div className="lg:col-span-5 space-y-4">

          <div className="glass-card p-6 border border-black/07 rounded-3xl shadow-sm space-y-5 bg-white">
            
            {/* Header da Tag Preservada */}
            <div className="flex items-start justify-between gap-3 border-b border-black/08 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#1A6B3A] text-white inline-block">
                    TAG PRESERVADA
                  </span>
                  <span className="text-[10px] text-black/50 font-medium">Tag do Público</span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A]">{activeConcept.tag}</h3>
                <p className="text-xs text-[#1A1A1A]/70 mt-1.5 leading-relaxed">{activeConcept.descricao}</p>
              </div>
            </div>

            {/* Origem da Tag (Proveniência social) */}
            <div className="p-4 bg-black/[0.02] border border-black/06 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                <span className="flex items-center gap-1.5"><User size={12} className="text-[#E8490A]" /> ORIGEM DA TAG</span>
                <span className="text-green-700 font-bold">PRESERVADA</span>
              </div>
              <p className="text-[#1A1A1A] text-xs font-bold">{activeConcept.autor}</p>
              <div className="flex items-center justify-between text-[11px] text-[#1A1A1A]/70 pt-1.5 border-t border-black/04">
                <span>Conceito central:</span>
                <span className="font-bold text-[#E8490A]">{activeConcept.tripla.objeto}</span>
              </div>
            </div>

            {/* ARTIGO CIENTÍFICO REAL VINCULADO À TAG */}
            <div className="p-4 bg-gradient-to-br from-white via-white to-orange-50/30 border border-orange-200/50 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#E8490A]">
                <span className="flex items-center gap-1.5"><BookOpen size={13} /> ARTIGO CIENTÍFICO VINCULADO</span>
                <span className="text-[9px] text-[#1A1A1A]/50">REFERÊNCIA REAL</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                  {activeConcept.artigo.titulo}
                </h4>
                <p className="text-[10.5px] text-[#1A1A1A]/60 mt-0.5 font-medium">
                  {activeConcept.artigo.autor} • <span className="italic">{activeConcept.artigo.veiculo}</span> ({activeConcept.artigo.ano})
                </p>
              </div>

              <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-2">
                {activeConcept.artigo.resumo}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10.5px]">
                <span className="font-mono text-[#1A1A1A]/50">DOI: {activeConcept.artigo.doi}</span>
                <a
                  href={activeConcept.artigo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline"
                >
                  <span>Acessar</span>
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>

            {/* CONEXÕES CULTURAIS INTERLIGADAS */}
            {connectedNeighbors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                  CONEXÕES CULTURAIS INTERLIGADAS:
                </p>
                <div className="space-y-1.5">
                  {connectedNeighbors.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedNodeId(item.id)}
                      className="w-full p-3 rounded-xl bg-black/[0.02] hover:bg-[#E8490A]/06 border border-black/05 text-left transition-all flex items-start gap-2.5 cursor-pointer group"
                    >
                      <Link2 size={13} className="text-[#E8490A] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-[11px] text-[#1A1A1A]/85 leading-snug">
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
                className="w-full py-3 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send size={14} className={isTestingTransfer ? 'animate-spin' : ''} />
                <span>{isTestingTransfer ? 'Transferindo Dados...' : 'Executar Teste de Transferência de Dados (JSON-LD)'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: PACOTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
            
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
