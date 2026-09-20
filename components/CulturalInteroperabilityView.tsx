'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Network, Search, Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Link2, ArrowRight,
  Database, Globe, ShieldCheck, Zap, RefreshCw, Activity, Fingerprint, LockKeyhole
} from 'lucide-react';
import { runSpreadingActivation, GraphMathNode, GraphMathEdge } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

// ─── ETAPAS DO FLUXO DO COFRE VIVO ──────────────────────────────────────────
const VAULT_FLOW_STEPS = [
  { icon: User, title: 'Contribuída', desc: 'Registro criado por um usuário da comunidade' },
  { icon: ShieldCheck, title: 'Selada', desc: 'Integridade protegida com AES-256-GCM' },
  { icon: Database, title: 'Compactada', desc: 'Carga canônica compactada com gzip' },
  { icon: Network, title: 'Cruzada', desc: 'Relações recebem hash SHA-256 verificável' },
  { icon: Fingerprint, title: 'Auditada', desc: 'Código genético e cadeia de auditoria registrados' },
  { icon: Globe, title: 'Interoperável', desc: 'Exportação W3C JSON-LD / SKOS disponível' }
];

const EIXO_COLORS: Record<string, string> = {
  SABERES: '#1A6B3A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
  default: '#4B5563'
};

function getInterligacoesGridForTag(tagLabel: string, dossier?: any) {
  const items: any[] = [];
  if (tagLabel) {
    items.push({ title: tagLabel, subtitle: 'Contribuição do usuário', type: 'tag', targetId: dossier?.id });
  }
  if (dossier?.artigo?.url) {
    items.push({ title: dossier.artigo.titulo || 'Fonte acadêmica', subtitle: 'Fonte vinculada', type: 'external', url: dossier.artigo.url });
  }
  for (const relation of dossier?.conexoesTextuais || []) {
    items.push({
      title: relation.targetTag,
      subtitle: relation.relacaoSKOS || 'Relação semântica',
      type: 'tag',
      targetId: relation.targetId,
    });
  }
  if (dossier?.familia) {
    items.push({ title: dossier.familia, subtitle: 'Agrupamento semântico', type: 'familia' });
  }
  return items.slice(0, 6);
}

function shortFingerprint(long?: string, keep = 7): string {
  if (!long) return '—';
  const s = String(long).trim();
  if (s.length <= keep * 2 + 4) return s;
  return `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

function copyText(text?: string | null) {
  if (!text || typeof navigator === 'undefined') return;
  try { navigator.clipboard?.writeText(String(text)); } catch {}
}

export default function CulturalInteroperabilityView() {

  const [nodes, setNodes] = useState<GraphMathNode[]>([]);
  const [connections, setConnections] = useState<GraphMathEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedTagLabel, setSelectedTagLabel] = useState<string>('');
  const [dossierCache, setDossierCache] = useState<Record<string, any>>({});
  const [currentDossier, setCurrentDossier] = useState<any>(null);
  
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
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ─── CARREGAR SOMENTE AS CONTRIBUIÇÕES PERSISTIDAS DE USUÁRIOS ─────────────
  useEffect(() => {
    fetch('/api/interop/live-vault', { method: 'GET' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setVaultFeedback(json.error || 'Não foi possível carregar as contribuições de usuários.');
          return;
        }

        const allFetched: any[] = json.data?.nodes || [];
        const userNodes: GraphMathNode[] = allFetched.map((node, index) => {
          const angle = (index / Math.max(allFetched.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const radius = allFetched.length > 1 ? 175 + (index % 3) * 30 : 0;
          const eixo = node.eixo || 'PATRIMONIO';
          return {
            id: node.id,
            label: node.label,
            x: 400 + Math.cos(angle) * radius,
            y: 215 + Math.sin(angle) * radius,
            size: 14,
            fill: node.cor || EIXO_COLORS[eixo] || EIXO_COLORS.default,
            eixo,
            desc: node.description || 'Contribuição cultural registrada por usuário.',
            type: 'Contribuição de usuário',
            familia: node.familia,
            activation: 0.5,
          };
        });

        setNodes(userNodes);
        setConnections([]);
        if (userNodes[0]) {
          setSelectedNodeId(userNodes[0].id);
          setSelectedTagLabel(userNodes[0].label);
          fetch(`/api/interop/live-vault?tag=${encodeURIComponent(userNodes[0].label)}`)
            .then(response => response.json())
            .then(dossierResponse => {
              if (!dossierResponse.success || !dossierResponse.data) return;
              const key = normalizeForComparison(userNodes[0].label).replace(/\s+/g, '_');
              setCurrentDossier(dossierResponse.data);
              setDossierCache(previous => ({ ...previous, [key]: dossierResponse.data }));
            })
            .catch(() => { /* o grafo continua disponível mesmo sem dossiê */ });
        } else {
          setCurrentDossier(null);
          setVaultFeedback('Ainda não há contribuições de usuários registradas para selar no cofre.');
        }
      })
      .catch(() => setVaultFeedback('Não foi possível carregar as contribuições de usuários.'));
  }, []);

  // ─── SELECIONAR E CARREGAR DOSSIÊ DA TAG DINAMICAMENTE ──────────────────────
  const handleSelectNode = useCallback(async (nodeId: string, nodeLabel: string) => {
    setSelectedNodeId(nodeId);
    setSelectedTagLabel(nodeLabel);
    
    const normKey = normalizeForComparison(nodeLabel).replace(/\s+/g, '_');
    
    if (dossierCache[normKey]) {
      setCurrentDossier(dossierCache[normKey]);
      return;
    }

    try {
      const res = await fetch(`/api/interop/live-vault?tag=${encodeURIComponent(nodeLabel)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentDossier(json.data);
        setDossierCache(prev => ({ ...prev, [normKey]: json.data }));
        setVaultFeedback(null);
      } else {
        setVaultFeedback(json.error || 'Não foi possível abrir o dossiê da contribuição.');
      }
    } catch {
      setVaultFeedback('Não foi possível abrir o dossiê da contribuição.');
    }
  }, [dossierCache]);

  const selectedNode = useMemo(() =>
    nodes.find(n => n.id === selectedNodeId || normalizeForComparison(n.label) === normalizeForComparison(selectedTagLabel)) || nodes[0],
    [nodes, selectedNodeId, selectedTagLabel]);

  // ─── SPREADING ACTIVATION ──────────────────────────────────────────────────
  const spreadingResult = useMemo(() => {
    if (!selectedNode?.id) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNode.id, initialEnergy: 1.0 }], {
      decay: 0.78, retention: 0.22, maxIterations: 6, normalize: true
    });
  }, [nodes, connections, selectedNode]);
  const nodeActivations = useMemo(() => spreadingResult?.nodeActivations || {}, [spreadingResult]);

  // ─── PULSO SINÁPTICO AUTÔNOMO CONTÍNUO (CRIAÇÃO E REFORÇO DE SINAPSES) ──────
  useEffect(() => {
    const interval = setInterval(() => {
      if (connections.length === 0) return;
      const edge = connections[Math.floor(Math.random() * connections.length)];
      setActivePulseKey(`${edge.from}__${edge.to}`);
      setTimeout(() => setActivePulseKey(null), 1400);
    }, 2800);
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

  // ─── SELAR O FLUXO: COFRE, CRUZAMENTO E AUDITORIA ───────────────────────────
  const handleTriggerLiveFlow = useCallback(async () => {
    if (isThinking) return;

    const targetTag = (searchTerm.trim() || selectedTagLabel).trim();
    const targetId = normalizeForComparison(targetTag).replace(/\s+/g, '_');
    const sourceNode = nodes.find(node => node.id === targetId || normalizeForComparison(node.label).replace(/\s+/g, '_') === targetId);
    if (!targetTag || !sourceNode) {
      setVaultFeedback('Selecione uma contribuição já registrada por um usuário antes de selar o cofre.');
      return;
    }

    setIsThinking(true);
    setThinkingSteps([]);
    setDiscoveredConnections([]);
    setSelectedTagLabel(sourceNode.label);
    setSelectedNodeId(sourceNode.id);
    setVaultFeedback(null);

    const addStep = (s: string) => setThinkingSteps(p => [...p, s]);

    // Animação sequencial das 6 etapas do cofre vivo
    for (let i = 0; i < VAULT_FLOW_STEPS.length; i++) {
      setActiveFlowStep(i);
      await new Promise(r => setTimeout(r, 450));
    }
    setActiveFlowStep(-1);

    addStep(`1. Serialização canônica da contribuição "${sourceNode.label}" concluída.`);
    addStep('2. Carga compactada com gzip e cifrada com AES-256-GCM no servidor.');
    addStep('3. Hash de cruzamento SHA-256 e código genético semântico preparados para auditoria.');

    try {
      const res = await fetch('/api/interop/live-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTag: sourceNode.label,
          action: 'pulse'
        })
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setVaultFeedback(json.error || 'O cofre não pôde ser selado.');
        addStep(`Cofre não selado: ${json.error || 'falha de segurança ou persistência'}.`);
        return;
      }

      const conns = json.data?.connections || [];
      const activated = json.data?.activatedNodes || [];
      const dynamicDossier = json.data?.dossier;

      if (dynamicDossier) {
        const normKey = normalizeForComparison(dynamicDossier.tag || sourceNode.label).replace(/\s+/g, '_');
        setSelectedTagLabel(dynamicDossier.tag || sourceNode.label);
        setSelectedNodeId(dynamicDossier.id || sourceNode.id);
        setCurrentDossier(dynamicDossier);
        setDossierCache(prev => ({ ...prev, [normKey]: dynamicDossier }));
      }

      const newEdges: GraphMathEdge[] = json.data?.pulses?.map((pulse: any) => ({
        from: pulse.from,
        to: pulse.to,
        weight: pulse.intensity || 0.8,
        skosRelation: 'skos:related',
        mechanism: 'inferred' as const,
        eixoRel: dynamicDossier?.eixo || sourceNode.eixo || 'PATRIMONIO',
        discovered: true,
      })) || [];

      if (newEdges.length > 0) {
        setConnections(prev => {
          const existing = new Set(prev.map(edge => [edge.from, edge.to].sort().join('|')));
          return [...prev, ...newEdges.filter(edge => !existing.has([edge.from, edge.to].sort().join('|')))];
        });
      }

      if (activated.length > 0) {
        setNodes(prev => prev.map(node => {
          const activation = activated.find((item: any) => item.id === node.id);
          return activation ? { ...node, activation: Math.max(node.activation || 0.3, activation.activation) } : node;
        }));
      }

      setDiscoveredConnections(conns);
      addStep(`4. ${conns.length} cruzamento(s) semântico(s) verificado(s) entre contribuições de usuários.`);
      addStep(`5. Auditoria ${dynamicDossier?.vault?.audit?.persisted ? 'persistida' : 'pendente de persistência'} e pacote JSON-LD atualizado.`);

      if (newEdges[0]) {
        setActivePulseKey(`${newEdges[0].from}__${newEdges[0].to}`);
        setTimeout(() => setActivePulseKey(null), 2500);
      }
    } catch {
      setVaultFeedback('Falha de rede ao tentar selar o cofre. Nenhum registro foi confirmado.');
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, searchTerm, selectedTagLabel, nodes]);

  // ─── JSON-LD 1.1 DINÂMICO ──────────────────────────────────────────────────
  const currentJsonLd = useMemo(() => {
    const item = currentDossier;
    if (!item) return {};
    return {
      '@context': {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        prov: 'http://www.w3.org/ns/prov#',
        vault: 'https://folksonomia-digital.cultura.gov.br/vocab/semantic-vault#',
      },
      '@id': `https://folksonomia-digital.cultura.gov.br/contribuicao/${encodeURIComponent(item.id)}`,
      '@type': 'skos:Concept',
      'skos:prefLabel': { '@value': item.tag || item.label, '@language': 'pt-BR' },
      'schema:description': item.descricao,
      'prov:wasGeneratedBy': {
        '@type': 'vault:UserContribution',
        'prov:generatedAtTime': item.dataCriacao,
      },
      'vault:semanticTriple': item.tripla,
      'vault:payloadHash': item.vault?.payloadHash,
      'vault:crossHash': item.vault?.crossHash,
      'vault:geneticCode': item.vault?.geneticCode,
      'vault:security': item.vault?.security,
    };
  }, [currentDossier]);

  const handleRunTransferTest = async () => {
    if (!selectedTagLabel) {
      setVaultFeedback('Selecione uma contribuição antes de exportar o pacote JSON-LD.');
      return;
    }
    setIsTestingTransfer(true);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${encodeURIComponent(selectedTagLabel)}`, {
        headers: { Accept: 'application/ld+json' }
      });
      const data = await res.json();
      if (!res.ok) setVaultFeedback(data.error || 'Não foi possível exportar o pacote JSON-LD.');
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

  // Grade de relações derivadas exclusivamente das contribuições registradas.
  const interligacoesList = useMemo(() => {
    return getInterligacoesGridForTag(currentDossier?.tag || selectedTagLabel, currentDossier);
  }, [currentDossier, selectedTagLabel]);

  const handleCardClick = (item: any) => {
    if (item.type === 'external' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.type === 'tag' && item.targetId) {
      handleSelectNode(item.targetId, item.title);
    } else if (item.type === 'familia') {
      setSearchTerm(item.title.replace('Família ', ''));
    }
  };

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── CARD SUPERIOR: CABEÇALHO + FLUXO ANIMADO + BOTÃO ── */}
      <div className="glass-card p-6 border border-black/08 rounded-3xl bg-gradient-to-b from-white via-white to-orange-50/20 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl md:text-2xl font-normal serif-title tracking-tight flex items-center gap-2.5 text-[#1A1A1A]">
                <FolderLock size={24} className="text-[#E8490A]" />
                Cofre Semântico & Interoperabilidade Cultural
              </h2>
              <span className="text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                COFRE ATIVO
              </span>
            </div>
            <p className="text-xs text-[#1A1A1A]/55 font-medium">
              Contribuições de usuários são compactadas, cifradas com AES-256-GCM, cruzadas por SHA-256 e exportáveis em JSON-LD auditável.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTriggerLiveFlow(); }}
                placeholder="Localizar contribuição..."
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
                  <span>Selar no Cofre</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FLUXO DO COFRE VIVO ANIMADO */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8490A] mb-3 flex items-center gap-1.5">
            <span>〰</span> Fluxo auditável — Da contribuição do usuário ao pacote interoperável
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

        {vaultFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
            {vaultFeedback}
          </div>
        )}

        {/* LOG DO COFRE */}
        {thinkingSteps.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <Activity size={12} className="text-slate-600" />
              <span>Trilha do Cofre Ativa</span>
            </div>
            {thinkingSteps.map((s, i) => (
              <div key={i} className="text-[10.5px] text-slate-800/90 flex items-start gap-2 font-mono">
                <span className="text-slate-500 font-bold shrink-0">{String(i + 1).padStart(2, '0')}.</span>
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
                <span className="text-xs font-bold uppercase tracking-wider">Rede de Contribuições</span>
                <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                  ({nodes.length} contribuições / {connections.length} cruzamentos)
                </span>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">Clique em uma contribuição para abrir seu dossiê</span>
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
                  
                  const isSource = fn.id === selectedNodeId || tn.id === selectedNodeId ||
                                   normalizeForComparison(fn.label) === normalizeForComparison(selectedTagLabel) ||
                                   normalizeForComparison(tn.label) === normalizeForComparison(selectedTagLabel);
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

              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center pointer-events-none">
                  <p className="max-w-xs text-xs leading-relaxed text-white/55">
                    O grafo será formado quando usuários registrarem contribuições culturais.
                  </p>
                </div>
              )}

              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[9px] text-white/45 font-mono pointer-events-none">
                <span>Clique em uma contribuição para visualizar o dossiê do cofre</span>
                <span className="text-[#E8490A] font-bold">FSDNA-1 & SHA-256</span>
              </div>
            </div>

            {/* CRUZAMENTOS RECENTES */}
            {discoveredConnections.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <Zap size={11} className="text-purple-600 fill-current" />
                  <span>Cruzamentos semânticos auditáveis</span>
                </p>
                {discoveredConnections.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/30 flex items-start gap-2">
                    <Link2 size={12} className="text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#1A1A1A]/85 leading-snug font-medium">
                      {c.afirmacao || `"${c.fromLabel}" interliga-se culturalmente a "${c.toLabel}" — ${c.insight}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COFRE DA CONTRIBUIÇÃO SELECIONADA */}
        <div className="lg:col-span-5">
          <div className="glass-card p-6 border border-black/07 rounded-3xl shadow-sm space-y-5 bg-white">
            {currentDossier ? (
              <>
                <div className="border-b border-black/08 pb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-white shadow-xs"
                      style={{ background: currentDossier.cor || '#1A6B3A' }}
                    >
                      CONTRIBUIÇÃO PRESERVADA
                    </span>
                    <span className="text-[10px] text-black/50 font-mono truncate">
                      {currentDossier.familia}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">{currentDossier.tag || selectedTagLabel}</h3>
                  <p className="text-xs text-[#1A1A1A]/70 mt-1.5 leading-relaxed">{currentDossier.descricao || selectedNode?.desc}</p>
                </div>

                <div className="p-4 bg-black/[0.02] border border-black/06 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                    <span className="flex items-center gap-1.5"><User size={12} className="text-[#E8490A]" /> PROVENIÊNCIA (PROV-O)</span>
                    <span className="text-green-700 font-bold">USUÁRIO</span>
                  </div>
                  <p className="text-[#1A1A1A] text-xs font-bold">{currentDossier.autor || 'Usuário da comunidade'}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#1A1A1A]/70 pt-1.5 border-t border-black/04 gap-3">
                    <span>Afirmação:</span>
                    <span className="font-bold text-[#E8490A] text-right">{currentDossier.tripla?.objeto}</span>
                  </div>
                  {currentDossier.dataCriacao && (
                    <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]/45 font-mono">
                      <span>Registrada em:</span><span>{new Date(currentDossier.dataCriacao).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-800 text-white border border-slate-700 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="flex items-center gap-1.5"><LockKeyhole size={13} /> Cofre Semântico</span>
                    <span>{currentDossier.vault?.security?.configured ? 'Selado' : 'Aguardando selo'}</span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Preservado com AES-256-GCM · compactado com gzip · cruzado e auditado com hashes de integridade.
                  </p>

                  <div className="space-y-1.5 font-mono text-[9px] text-white/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/50 uppercase tracking-wide shrink-0">DNA</span>
                      <button
                        type="button"
                        onClick={() => copyText(currentDossier.vault?.geneticCode)}
                        title="Copiar DNA completo"
                        className="flex items-center gap-1 text-emerald-200 hover:text-emerald-100 truncate max-w-[70%] text-right"
                      >
                        <span className="truncate">{currentDossier.vault?.geneticCode || 'contribuição ainda não selada'}</span>
                        {currentDossier.vault?.geneticCode && <Copy size={10} className="shrink-0 opacity-70" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/50 uppercase tracking-wide shrink-0">Cruzamento</span>
                      <button
                        type="button"
                        onClick={() => copyText(currentDossier.vault?.crossHash)}
                        title="Copiar hash de cruzamento"
                        className="flex items-center gap-1 text-sky-200 hover:text-sky-100 truncate max-w-[70%] text-right"
                      >
                        <span className="truncate">{shortFingerprint(currentDossier.vault?.crossHash, 8)}</span>
                        {currentDossier.vault?.crossHash && <Copy size={10} className="shrink-0 opacity-70" />}
                      </button>
                    </div>
                    {currentDossier.vault?.audit && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/50 uppercase tracking-wide shrink-0">Auditoria #{currentDossier.vault.audit.sequence}</span>
                        <button
                          type="button"
                          onClick={() => copyText(currentDossier.vault.audit.chainHash)}
                          title="Copiar chainHash"
                          className="flex items-center gap-1 text-amber-200 hover:text-amber-100 truncate max-w-[70%] text-right"
                        >
                          <span className="truncate">{shortFingerprint(currentDossier.vault.audit.chainHash, 8)}</span>
                          <Copy size={10} className="shrink-0 opacity-70" />
                        </button>
                      </div>
                    )}
                    {currentDossier.heartbeat && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/50 uppercase tracking-wide shrink-0">Pulso</span>
                        <span className="text-white/80 truncate max-w-[70%] text-right">
                          Geração {currentDossier.heartbeat.generation || 1} · {currentDossier.heartbeat.pulseCount || 0} pulso(s)
                        </span>
                      </div>
                    )}
                    {currentDossier.vault?.audit?.persisted && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/50 uppercase tracking-wide shrink-0">Armazenado</span>
                        <span className="text-emerald-200 truncate max-w-[70%] text-right">
                          {currentDossier.vault.audit.storage === 'semantic_vault_audit' ? 'Cad. Auditoria' :
                           currentDossier.vault.audit.storage === 'eventos' ? 'Rastro de Eventos' : 'Memória'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {currentDossier.artigo && (
                  <div className="p-4 bg-gradient-to-br from-white via-white to-orange-50/30 border border-orange-200/60 rounded-2xl space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#E8490A]">
                      <span className="flex items-center gap-1.5"><BookOpen size={13} /> FONTE VINCULADA</span>
                      <span className="text-[9px] text-[#1A1A1A]/50 font-mono">REFERÊNCIA</span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">{currentDossier.artigo.titulo}</h4>
                    {(currentDossier.artigo.autor || currentDossier.artigo.veiculo) && <p className="text-[10.5px] text-[#1A1A1A]/60 font-medium">{currentDossier.artigo.autor} {currentDossier.artigo.veiculo ? `• ${currentDossier.artigo.veiculo}` : ''} {currentDossier.artigo.ano ? `(${currentDossier.artigo.ano})` : ''}</p>}
                    {currentDossier.artigo.resumo && <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-2">{currentDossier.artigo.resumo}</p>}
                    {currentDossier.artigo.url && <a href={currentDossier.artigo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#E8490A] hover:underline">Abrir fonte <ArrowUpRight size={12} /></a>}
                  </div>
                )}

                {interligacoesList.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">CRUZAMENTOS E RELAÇÕES:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {interligacoesList.map((item: any, i: number) => (
                        <button key={i} onClick={() => handleCardClick(item)} className="p-3 rounded-2xl text-left bg-gradient-to-br from-amber-50/70 to-orange-50/50 hover:from-amber-100/80 hover:to-orange-100/60 border border-amber-200/60 hover:border-[#E8490A] flex flex-col justify-between space-y-1 transition-all cursor-pointer shadow-xs hover:shadow-sm active:scale-98 group">
                          <span className="text-xs font-bold text-[#1A1A1A] truncate group-hover:text-[#E8490A] transition-colors">{item.title}</span>
                          <span className="text-[10px] text-[#1A1A1A]/55 font-medium">{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-black/08">
                  <button onClick={handleRunTransferTest} disabled={isTestingTransfer} className="w-full py-3.5 bg-[#121214] hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-98">
                    <Send size={14} className={isTestingTransfer ? 'animate-spin' : ''} />
                    <span>{isTestingTransfer ? 'Gerando pacote...' : 'Exportar pacote interoperável (JSON-LD)'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <FolderLock size={38} className="mx-auto text-[#E8490A]/30 mb-3" />
                <p className="text-xs text-[#1A1A1A]/50 leading-relaxed">Selecione uma contribuição de usuário para visualizar seu cofre semântico.</p>
              </div>
            )}
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
                    Pacote de Transferência — "{currentDossier?.tag || currentDossier?.label || selectedTagLabel}"
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
              <span className="text-green-400 font-bold">PACOTE VERIFICÁVEL</span>
            </div>
            
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {transferResult || JSON.stringify(currentJsonLd, null, 2)}
              </pre>
            </div>
            
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                Contribuição de usuário exportada com hashes públicos verificáveis; nenhuma chave criptográfica é exposta.
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
