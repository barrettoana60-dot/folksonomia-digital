'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Network, Search, Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Link2, ArrowRight,
  Database, Globe, ShieldCheck, Zap, RefreshCw, Activity, Fingerprint, LockKeyhole,
  GitBranch, Layers, Hash, Clock, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import { runSpreadingActivation, GraphMathNode, GraphMathEdge } from '@/lib/ml/graph-math';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';

// ─── ETAPAS DO FLUXO DE INTEROPERABILIDADE ───────────────────────────────────
const FLOW_STEPS = [
  { icon: User, title: 'Contribuida', desc: 'A comunidade registra a tag na rede cultural' },
  { icon: Fingerprint, title: 'Identificada', desc: 'Identidade computacional persistente gerada' },
  { icon: Network, title: 'Conectada', desc: 'Ligada a outras tags e contribuicoes da rede' },
  { icon: Globe, title: 'Expandida', desc: 'Correspondencias em Europeana, Wikidata, Tainacan e mais' },
  { icon: ShieldCheck, title: 'Auditada', desc: 'Curadoria humana confirma o registro antes da publicacao' },
  { icon: Database, title: 'Interoperavel', desc: 'Pacote JSON-LD pronto para troca entre acervos' }
];

const EIXO_COLORS: Record<string, string> = {
  SABERES: '#1A6B3A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
  default: '#4B5563'
};

const SOURCE_COLORS: Record<string, string> = {
  wikidata: '#006699',
  wikipedia: '#3366cc',
  europeana: '#003399',
  brasiliana: '#006400',
  ibram: '#8B0000',
  tainacan: '#5B2C6F',
  mapas_culturais: '#1A6B3A',
  dados_cultura: '#0891B2',
  external: '#4B5563',
};

function getInterligacoesGridForTag(tagLabel: string, dossier?: any) {
  const items: any[] = [];
  if (tagLabel) {
    items.push({ title: tagLabel, subtitle: 'Contribuicao do usuario', type: 'tag', targetId: dossier?.id });
  }
  if (dossier?.artigo?.url) {
    items.push({ title: dossier.artigo.titulo || 'Fonte academica', subtitle: 'Fonte vinculada', type: 'external', url: dossier.artigo.url });
  }
  for (const relation of dossier?.conexoesTextuais || []) {
    items.push({
      title: relation.targetTag || relation.targetLabel,
      subtitle: relation.relacaoSKOS || relation.relationType || 'Relacao cultural',
      type: 'tag',
      targetId: relation.targetId,
    });
  }
  if (dossier?.familia) {
    items.push({ title: dossier.familia, subtitle: 'Agrupamento cultural', type: 'familia' });
  }
  for (const acervo of dossier?.acervos || []) {
    items.push({
      title: acervo.title,
      subtitle: acervo.source,
      type: 'external',
      url: acervo.url,
    });
  }
  // Fontes da identidade da tag
  for (const src of dossier?.tagIdentity?.identitySources || []) {
    items.push({
      title: src.label,
      subtitle: src.connector,
      type: 'external',
      url: src.url,
    });
  }
  return items.slice(0, 8);
}

function shortDigest(long?: string, keep = 8): string {
  if (!long) return '—';
  const s = String(long).trim().replace(/^sha256:/, '');
  if (s.length <= keep * 2 + 4) return s;
  return `${s.slice(0, keep)}...${s.slice(-keep)}`;
}

function copyText(text?: string | null) {
  if (!text || typeof navigator === 'undefined') return;
  try { navigator.clipboard?.writeText(String(text)); } catch {}
}

// ─── PAINEL: CADEIA DE VERSOES ────────────────────────────────────────────────
function VersionChainPanel({ chain }: { chain: any[] }) {
  if (!chain || chain.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 flex items-center gap-1.5">
        <GitBranch size={11} />
        CADEIA DE VERSOES
      </p>
      <div className="space-y-1 max-h-32 overflow-auto">
        {chain.map((v: any, i: number) => (
          <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
            <span className="text-[#E8490A] font-bold shrink-0">v{v.version}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[#1A1A1A]/70 uppercase tracking-wide">{v.event_type || v.eventType}</span>
              {v.previous_digest && (
                <div className="text-[9px] text-[#1A1A1A]/35 truncate">
                  {shortDigest(v.previous_digest, 6)} → {shortDigest(v.current_digest, 6)}
                </div>
              )}
            </div>
            <span className="text-[9px] text-[#1A1A1A]/30 shrink-0">{v.actor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAINEL: REDE DE CONTRIBUICOES ────────────────────────────────────────────
function ContributionNetworkPanel({ contributions, tag }: { contributions: any[]; tag: string }) {
  if (!contributions || contributions.length === 0) return null;

  const typeLabels: Record<string, string> = {
    criacao: 'Criacao',
    relacao: 'Relacao',
    fonte: 'Fonte',
    revisao: 'Revisao',
    validacao: 'Validacao',
    exportacao: 'Exportacao',
  };

  const typeColors: Record<string, string> = {
    criacao: '#1A6B3A',
    relacao: '#1E3A8A',
    fonte: '#0891B2',
    revisao: '#E8A920',
    validacao: '#6D28D9',
    exportacao: '#E8490A',
  };

  return (
    <div className="space-y-2">
      <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 flex items-center gap-1.5">
        <Network size={11} />
        REDE DE CONTRIBUICOES ({contributions.length})
      </p>
      <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
        {contributions.slice(0, 10).map((c: any, i: number) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: typeColors[c.type] || '#4B5563' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-white"
                  style={{ background: typeColors[c.type] || '#4B5563' }}
                >
                  {typeLabels[c.type] || c.type}
                </span>
                <span className="text-[9px] text-[#1A1A1A]/40 font-mono">
                  {c.timestamp ? new Date(c.timestamp).toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              {c.content && (
                <p className="text-[10px] text-[#1A1A1A]/70 mt-0.5 leading-snug truncate">{c.content}</p>
              )}
              <div className="flex items-center gap-1 mt-0.5">
                {c.previousState && (
                  <span className="text-[8.5px] font-mono text-[#1A1A1A]/30">
                    {shortDigest(c.previousState, 5)} → {shortDigest(c.currentState, 5)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAINEL: IDENTIDADE DA TAG ────────────────────────────────────────────────
function TagIdentityPanel({ identity, tag }: { identity: any; tag: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!identity) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/40 flex items-center gap-1.5">
          <Hash size={11} />
          IDENTIDADE DA TAG
        </p>
        <p className="text-[10px] text-[#1A1A1A]/40 italic">
          Identidade ainda nao registrada. Use "Cruzar na rede" para ativar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-800 text-white border border-slate-700 rounded-2xl space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
          <Hash size={11} />
          IDENTIDADE COMPUTACIONAL
        </span>
        <span className="text-[9px] text-emerald-400 font-mono">v{identity.version}</span>
      </div>

      <div className="space-y-1.5 font-mono text-[9px] text-white/60">
        {/* TAG ID */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/50 uppercase tracking-wide shrink-0">Tag ID</span>
          <button
            type="button"
            onClick={() => copyText(identity.tagId)}
            className="flex items-center gap-1 text-emerald-200 hover:text-emerald-100 truncate max-w-[70%] text-right"
          >
            <span className="truncate text-[8.5px]">{identity.tagId}</span>
            <Copy size={9} className="shrink-0 opacity-70" />
          </button>
        </div>

        {/* DIGEST (impressao digital do estado) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/50 uppercase tracking-wide shrink-0">Digest</span>
          <button
            type="button"
            onClick={() => copyText(identity.digest)}
            title="Impressao digital SHA-256 do estado do registro"
            className="flex items-center gap-1 text-amber-200 hover:text-amber-100 truncate max-w-[70%] text-right"
          >
            <span className="truncate">{shortDigest(identity.digest, 8)}</span>
            <Copy size={9} className="shrink-0 opacity-70" />
          </button>
        </div>

        {/* VERSAO */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/50 uppercase tracking-wide shrink-0">Versao</span>
          <span className="text-white/80">
            {identity.version} {identity.updatedAt ? `· atualizado ${new Date(identity.updatedAt).toLocaleDateString('pt-BR')}` : ''}
          </span>
        </div>

        {/* FONTES DA IDENTIDADE */}
        {identity.identitySources?.length > 0 && (
          <div className="pt-1.5 border-t border-white/10">
            <button
              type="button"
              onClick={() => setExpanded(p => !p)}
              className="flex items-center gap-1 text-white/60 hover:text-white/80 transition-colors w-full"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span className="uppercase tracking-wide">{identity.identitySources.length} fonte(s) descoberta(s)</span>
            </button>
            {expanded && (
              <div className="mt-1.5 space-y-1">
                {identity.identitySources.slice(0, 6).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ background: SOURCE_COLORS[s.type] || '#4B5563' }}
                    />
                    <span className="text-white/50 uppercase shrink-0">{s.connector}</span>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-100 truncate">
                        {s.label.replace(/^[^:]+:\s*/, '')}
                      </a>
                    ) : (
                      <span className="text-white/40 truncate">{s.label.replace(/^[^:]+:\s*/, '')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CADEIA DE VERSOES (compacta) */}
      {identity.versionChain?.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[8.5px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
            <GitBranch size={9} />
            CADEIA DE VERSOES
          </p>
          <div className="space-y-0.5">
            {identity.versionChain.slice(0, 3).map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[8.5px]">
                <span className="text-[#E8490A] font-bold">v{v.version}</span>
                <span className="text-white/40 uppercase">{v.event_type || v.eventType}</span>
                {v.previous_digest && (
                  <span className="text-white/25 truncate">
                    {shortDigest(v.previous_digest, 4)} → {shortDigest(v.current_digest, 4)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const [humanAudit, setHumanAudit] = useState<{ pending: number; path: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'dossier' | 'identity' | 'contributions'>('dossier');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ─── CARREGAR CONTRIBUICOES REGISTRADAS ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/interop/live-vault', { method: 'GET' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) {
          setVaultFeedback(json.error || 'Nao foi possivel carregar as contribuicoes.');
          return;
        }

        if (json.data?.humanAudit) {
          setHumanAudit({
            pending: Number(json.data.humanAudit.pending || 0),
            path: json.data.humanAudit.path || '/admin/validacao',
          });
        }

        const allFetched: any[] = json.data?.nodes || [];
        const fetchedEdges: GraphMathEdge[] = (json.data?.edges || []).map((edge: any) => ({
          from: edge.from,
          to: edge.to,
          weight: edge.weight || 0.6,
          skosRelation: edge.skosRelation || 'skos:related',
          mechanism: 'inferred' as const,
          discovered: Boolean(edge.discovered),
        }));
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
            desc: node.description || 'Contribuicao cultural registrada por usuario.',
            type: 'Contribuicao de usuario',
            familia: node.familia,
            activation: 0.5,
          };
        });

        setNodes(userNodes);
        setConnections(fetchedEdges);
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
            .catch(() => {});
        } else {
          setCurrentDossier(null);
          setVaultFeedback('Ainda nao ha contribuicoes registradas na rede de interoperabilidade.');
        }
      })
      .catch(() => setVaultFeedback('Nao foi possivel carregar as contribuicoes.'));
  }, []);

  // ─── SELECIONAR E CARREGAR DOSSIE DA TAG ─────────────────────────────────────
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
        setVaultFeedback(json.error || 'Nao foi possivel abrir o registro da contribuicao.');
      }
    } catch {
      setVaultFeedback('Nao foi possivel abrir o registro da contribuicao.');
    }
  }, [dossierCache]);

  const selectedNode = useMemo(() =>
    nodes.find(n => n.id === selectedNodeId || normalizeForComparison(n.label) === normalizeForComparison(selectedTagLabel)) || nodes[0],
    [nodes, selectedNodeId, selectedTagLabel]);

  // ─── SPREADING ACTIVATION ────────────────────────────────────────────────────
  const spreadingResult = useMemo(() => {
    if (!selectedNode?.id) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNode.id, initialEnergy: 1.0 }], {
      decay: 0.78, retention: 0.22, maxIterations: 6, normalize: true
    });
  }, [nodes, connections, selectedNode]);
  const nodeActivations = useMemo(() => spreadingResult?.nodeActivations || {}, [spreadingResult]);

  // ─── PULSO AUTONOMO CONTINUO ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (connections.length === 0) return;
      const edge = connections[Math.floor(Math.random() * connections.length)];
      setActivePulseKey(`${edge.from}__${edge.to}`);
      setTimeout(() => setActivePulseKey(null), 1400);
    }, 2800);
    return () => clearInterval(interval);
  }, [connections]);

  // ─── FISICA DE MOLAS NO GRAFO ─────────────────────────────────────────────────
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

  // ─── CRUZAR NA REDE ───────────────────────────────────────────────────────────
  const handleTriggerLiveFlow = useCallback(async () => {
    if (isThinking) return;

    const targetTag = (searchTerm.trim() || selectedTagLabel).trim();
    const targetId = normalizeForComparison(targetTag).replace(/\s+/g, '_');
    const sourceNode = nodes.find(node => node.id === targetId || normalizeForComparison(node.label).replace(/\s+/g, '_') === targetId);
    if (!targetTag || !sourceNode) {
      setVaultFeedback('Selecione uma contribuicao ja registrada antes de cruzar a rede.');
      return;
    }

    setIsThinking(true);
    setThinkingSteps([]);
    setDiscoveredConnections([]);
    setSelectedTagLabel(sourceNode.label);
    setSelectedNodeId(sourceNode.id);
    setVaultFeedback(null);

    const addStep = (s: string) => setThinkingSteps(p => [...p, s]);

    for (let i = 0; i < FLOW_STEPS.length; i++) {
      setActiveFlowStep(i);
      await new Promise(r => setTimeout(r, 450));
    }
    setActiveFlowStep(-1);

    addStep(`1. Identidade da contribuicao "${sourceNode.label}" verificada.`);
    addStep('2. Busca de correspondencias em Europeana, Brasiliana, Wikidata, Wikipedia, Tainacan, IBRAM e Mapas Culturais.');
    addStep('3. Cruzamento interno entre contribuicoes e preparacao da auditoria.');

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
        setVaultFeedback(json.error || 'A rede nao pôde cruzar esta contribuicao.');
        addStep(`Cruzamento interrompido: ${json.error || 'falha de persistencia ou curadoria'}.`);
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
      addStep(`4. ${conns.length} ligacao(oes) cultural(is) identificada(s) entre contribuicoes da rede.`);
      addStep(`5. Auditoria ${dynamicDossier?.vault?.audit?.persisted ? 'registrada na cadeia de proveniencia' : 'aguardando curadoria'} e pacote JSON-LD atualizado.`);

      if (newEdges[0]) {
        setActivePulseKey(`${newEdges[0].from}__${newEdges[0].to}`);
        setTimeout(() => setActivePulseKey(null), 2500);
      }
    } catch {
      setVaultFeedback('Falha de rede ao cruzar contribuicoes. Nenhum registro foi confirmado.');
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, searchTerm, selectedTagLabel, nodes]);

  // ─── JSON-LD 1.1 DINAMICO ────────────────────────────────────────────────────
  const currentJsonLd = useMemo(() => {
    const item = currentDossier;
    if (!item) return {};
    return {
      '@context': {
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        prov: 'http://www.w3.org/ns/prov#',
        crm: 'http://www.cidoc-crm.org/cidoc-crm/',
        edm: 'http://www.europeana.eu/schemas/edm/',
        interop: 'https://folksonomia-digital.cultura.gov.br/vocab/interoperabilidade#',
      },
      '@id': `https://folksonomia-digital.cultura.gov.br/contribuicao/${encodeURIComponent(item.id)}`,
      '@type': ['skos:Concept', 'edm:ProvidedCHO'],
      'skos:prefLabel': { '@value': item.tag || item.label, '@language': 'pt-BR' },
      'schema:description': item.descricao,
      'prov:wasGeneratedBy': {
        '@type': 'interop:UserContribution',
        'prov:generatedAtTime': item.dataCriacao,
      },
      'interop:tagId': item.tagIdentity?.tagId,
      'interop:version': item.tagIdentity?.version,
      'interop:digest': item.tagIdentity?.digest,
      'interop:livingCode': item.vault?.geneticCode,
      'interop:payloadHash': item.vault?.payloadHash,
      'interop:crossHash': item.vault?.crossHash,
      'skos:relatedMatch': (item.acervos || []).map((acervo: any) => ({
        '@id': acervo.url,
        'skos:prefLabel': acervo.title,
        'schema:provider': acervo.source,
      })),
      'interop:identitySources': (item.tagIdentity?.identitySources || []).map((s: any) => ({
        '@type': s.type,
        'schema:provider': s.connector,
        '@id': s.url,
        'skos:prefLabel': s.label,
      })),
    };
  }, [currentDossier]);

  const handleRunTransferTest = async () => {
    if (!selectedTagLabel) {
      setVaultFeedback('Selecione uma contribuicao antes de exportar o pacote JSON-LD.');
      return;
    }
    setIsTestingTransfer(true);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${encodeURIComponent(selectedTagLabel)}`, {
        headers: { Accept: 'application/ld+json' }
      });
      const data = await res.json();
      if (!res.ok) setVaultFeedback(data.error || 'Nao foi possivel exportar o pacote JSON-LD.');
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

  const interligacoesList = useMemo(() => {
    return getInterligacoesGridForTag(currentDossier?.tag || selectedTagLabel, currentDossier);
  }, [currentDossier, selectedTagLabel]);

  const handleCardClick = (item: any) => {
    if (item.type === 'external' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.type === 'tag' && item.targetId) {
      handleSelectNode(item.targetId, item.title);
    } else if (item.type === 'familia') {
      setSearchTerm(item.title.replace('Familia ', ''));
    }
  };

  // Fontes externas para exibir: da identidade + acervos do dossie
  const allSources = useMemo(() => {
    const identitySources = (currentDossier?.tagIdentity?.identitySources || []).map((s: any) => ({
      ...s,
      title: s.label.replace(/^[^:]+:\s*/, ''),
      source: s.connector,
    }));
    const acervos = (currentDossier?.acervos || []).map((a: any) => ({
      ...a,
      title: a.title,
      source: a.source,
      type: 'institutional_acervo',
      connector: a.source,
      url: a.url,
    }));
    // Deduplicar por URL
    const seen = new Set<string>();
    return [...identitySources, ...acervos].filter(s => {
      const key = s.url || s.label || s.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [currentDossier]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* CABECALHO + FLUXO ANIMADO + BOTAO */}
      <div className="glass-card p-6 border border-black/08 rounded-3xl bg-gradient-to-b from-white via-white to-orange-50/20 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl md:text-2xl font-normal serif-title tracking-tight flex items-center gap-2.5 text-[#1A1A1A]">
                <Network size={24} className="text-[#E8490A]" />
                Interoperabilidade Cultural
              </h2>
              <span className="text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                REDE ATIVA
              </span>
            </div>
            <p className="text-xs text-[#1A1A1A]/55 font-medium">
              Repositorio vivo de interoperabilidade cultural: auditavel, rastreavel e interconectado.
              Cada tag e uma identidade computacional persistente que se expande nos acervos e na rede de contribuicoes.
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
                placeholder="Localizar contribuicao..."
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
                  <span>Cruzar na rede</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FLUXO ANIMADO */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8490A] mb-3 flex items-center gap-1.5">
            <span>—</span> Da tag-identidade a troca entre acervos — com auditoria humana
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {FLOW_STEPS.map((step, idx) => {
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
                    {idx < FLOW_STEPS.length - 1 && (
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

        {humanAudit && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-950 font-medium flex items-start justify-between gap-3">
            <p>
              Auditoria humana obrigatoria: curadores confirmam registros antes da publicacao definitiva.
              {humanAudit.pending > 0 ? ` ${humanAudit.pending} nucleo(s) aguardam validacao.` : ' Fila humana em dia.'}
            </p>
            <a
              href={humanAudit.path}
              className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-800 hover:underline"
            >
              Abrir curadoria
            </a>
          </div>
        )}

        {vaultFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
            {vaultFeedback}
          </div>
        )}

        {thinkingSteps.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <Activity size={12} className="text-slate-600" />
              <span>Rastro de ligacoes</span>
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

      {/* GRID: GRAFO + PAINEL LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* GRAFO INTERATIVO */}
        <div className="lg:col-span-7">
          <div className="glass-card p-4 border border-black/07 rounded-3xl shadow-sm space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={15} className="text-[#E8490A]" />
                <span className="text-xs font-bold uppercase tracking-wider">Rede de Contribuicoes</span>
                <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                  ({nodes.length} contribuicoes / {connections.length} cruzamentos)
                </span>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">Clique em uma contribuicao para abrir o registro</span>
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

                {/* NOS DO GRAFO */}
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
                    O grafo sera formado quando usuarios registrarem contribuicoes culturais.
                  </p>
                </div>
              )}

              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[9px] text-white/45 font-mono pointer-events-none">
                <span>Arraste os nos para explorar os cruzamentos da rede</span>
                <span className="text-[#E8490A] font-bold">SKOS · EDM · CIDOC-CRM</span>
              </div>
            </div>

            {/* CRUZAMENTOS RECENTES */}
            {discoveredConnections.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <Zap size={11} className="text-purple-600 fill-current" />
                  <span>Cruzamentos culturais auditaveis</span>
                </p>
                {discoveredConnections.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/30 flex items-start gap-2">
                    <Link2 size={12} className="text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#1A1A1A]/85 leading-snug font-medium">
                      {c.afirmacao || `"${c.fromLabel}" conecta-se culturalmente a "${c.toLabel}" — ${c.insight}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* LEGENDA DE FONTES */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {Object.entries(SOURCE_COLORS).filter(([k]) => k !== 'external').map(([key, color]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[9px] text-[#1A1A1A]/50 uppercase">{key.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PAINEL LATERAL: REGISTRO DA CONTRIBUICAO */}
        <div className="lg:col-span-5">
          <div className="glass-card p-6 border border-black/07 rounded-3xl shadow-sm space-y-5 bg-white">
            {currentDossier ? (
              <>
                {/* CABECALHO DO REGISTRO */}
                <div className="border-b border-black/08 pb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-white shadow-xs"
                      style={{ background: currentDossier.cor || '#1A6B3A' }}
                    >
                      REGISTRO PRESERVADO
                    </span>
                    <span className="text-[10px] text-black/50 font-mono truncate">
                      {currentDossier.familia}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">{currentDossier.tag || selectedTagLabel}</h3>
                  <p className="text-xs text-[#1A1A1A]/70 mt-1.5 leading-relaxed">{currentDossier.descricao || selectedNode?.desc}</p>
                </div>

                {/* TABS */}
                <div className="flex gap-1 p-1 bg-black/[0.03] rounded-2xl">
                  {([
                    { id: 'dossier', label: 'Registro', icon: BookOpen },
                    { id: 'identity', label: 'Identidade', icon: Hash },
                    { id: 'contributions', label: 'Contribuicoes', icon: Layers },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-white text-[#E8490A] shadow-sm'
                          : 'text-[#1A1A1A]/50 hover:text-[#1A1A1A]/80'
                      }`}
                    >
                      <tab.icon size={11} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB: DOSSIE */}
                {activeTab === 'dossier' && (
                  <div className="space-y-4">
                    {/* PROVENENCIA */}
                    <div className="p-4 bg-black/[0.02] border border-black/06 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                        <span className="flex items-center gap-1.5"><User size={12} className="text-[#E8490A]" /> PROVENENCIA (PROV-O)</span>
                        <span className="text-green-700 font-bold">USUARIO</span>
                      </div>
                      <p className="text-[#1A1A1A] text-xs font-bold">{currentDossier.autor || 'Usuario da comunidade'}</p>
                      <div className="flex items-center justify-between text-[11px] text-[#1A1A1A]/70 pt-1.5 border-t border-black/04 gap-3">
                        <span>Afirmacao:</span>
                        <span className="font-bold text-[#E8490A] text-right">{currentDossier.tripla?.objeto}</span>
                      </div>
                      {currentDossier.dataCriacao && (
                        <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]/45 font-mono">
                          <span>Registrada em:</span><span>{new Date(currentDossier.dataCriacao).toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    {/* PULSO / GERACAO */}
                    {currentDossier.heartbeat && (
                      <div className="flex items-center gap-3 p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[10.5px]">
                        <Activity size={13} className="text-emerald-600 shrink-0" />
                        <span className="text-emerald-800 font-medium">
                          Geracao {currentDossier.heartbeat.generation || 1} — {currentDossier.heartbeat.pulseCount || 0} pulso(s) — {currentDossier.heartbeat.connectionCount || 0} conexoes
                        </span>
                      </div>
                    )}

                    {/* FONTES EXTERNAS — TODAS AS FONTES CONSOLIDADAS */}
                    {allSources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 flex items-center gap-1.5">
                          <Globe size={11} />
                          CORRESPONDENCIAS EM FONTES EXTERNAS ({allSources.length})
                        </p>
                        <div className="space-y-1.5 max-h-48 overflow-auto pr-1">
                          {allSources.slice(0, 10).map((src: any, i: number) => (
                            <a
                              key={i}
                              href={src.url || '#'}
                              target={src.url ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="block p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 hover:border-sky-300 transition-colors group"
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <div
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ background: SOURCE_COLORS[src.type || 'external'] || '#4B5563' }}
                                />
                                <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: SOURCE_COLORS[src.type || 'external'] || '#4B5563' }}>
                                  {src.connector || src.source}
                                </p>
                                {src.url && <ExternalLink size={9} className="text-sky-400 ml-auto group-hover:text-sky-600" />}
                              </div>
                              <p className="text-xs font-bold text-[#1A1A1A] leading-snug truncate">
                                {src.title || src.label?.replace(/^[^:]+:\s*/, '')}
                              </p>
                              {src.skosRelation && (
                                <p className="text-[9px] text-[#1A1A1A]/40 font-mono mt-0.5">{src.skosRelation}</p>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* FONTE ACADEMICA */}
                    {currentDossier.artigo && (
                      <div className="p-4 bg-gradient-to-br from-white via-white to-orange-50/30 border border-orange-200/60 rounded-2xl space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-[#E8490A]">
                          <span className="flex items-center gap-1.5"><BookOpen size={13} /> REFERENCIA ACADEMICA</span>
                          <span className="text-[9px] text-[#1A1A1A]/50 font-mono">FONTE</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">{currentDossier.artigo.titulo}</h4>
                        {(currentDossier.artigo.autor || currentDossier.artigo.veiculo) && <p className="text-[10.5px] text-[#1A1A1A]/60 font-medium">{currentDossier.artigo.autor} {currentDossier.artigo.veiculo ? `• ${currentDossier.artigo.veiculo}` : ''} {currentDossier.artigo.ano ? `(${currentDossier.artigo.ano})` : ''}</p>}
                        {currentDossier.artigo.resumo && <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-2">{currentDossier.artigo.resumo}</p>}
                        {currentDossier.artigo.url && <a href={currentDossier.artigo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#E8490A] hover:underline">Abrir referencia <ArrowUpRight size={12} /></a>}
                      </div>
                    )}

                    {/* CRUZAMENTOS E ACERVOS */}
                    {interligacoesList.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">CONEXOES E ACERVOS:</p>
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
                  </div>
                )}

                {/* TAB: IDENTIDADE */}
                {activeTab === 'identity' && (
                  <div className="space-y-4">
                    <TagIdentityPanel identity={currentDossier.tagIdentity} tag={currentDossier.tag || selectedTagLabel} />

                    {/* CODIGO DE CRUZAMENTO */}
                    <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-800 text-white border border-slate-700 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-emerald-300">
                        <span className="flex items-center gap-1.5"><LockKeyhole size={13} /> CODIGO DE CRUZAMENTO</span>
                        <span>{currentDossier.vault?.security?.configured ? 'Rastreavel' : 'Em formacao'}</span>
                      </div>
                      <p className="text-[11px] text-white/70 leading-relaxed">
                        Identidade computacional da tag: impressao digital criptografica que permite auditoria independente sem expor dados.
                      </p>

                      <div className="space-y-1.5 font-mono text-[9px] text-white/60">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/50 uppercase tracking-wide shrink-0">Codigo</span>
                          <button type="button" onClick={() => copyText(currentDossier.vault?.geneticCode)} className="flex items-center gap-1 text-emerald-200 hover:text-emerald-100 truncate max-w-[70%] text-right">
                            <span className="truncate">{currentDossier.vault?.geneticCode || 'contribuicao ainda nao registrada'}</span>
                            {currentDossier.vault?.geneticCode && <Copy size={10} className="shrink-0 opacity-70" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/50 uppercase tracking-wide shrink-0">Cruzamento</span>
                          <button type="button" onClick={() => copyText(currentDossier.vault?.crossHash)} className="flex items-center gap-1 text-sky-200 hover:text-sky-100 truncate max-w-[70%] text-right">
                            <span className="truncate">{shortDigest(currentDossier.vault?.crossHash, 8)}</span>
                            {currentDossier.vault?.crossHash && <Copy size={10} className="shrink-0 opacity-70" />}
                          </button>
                        </div>
                        {currentDossier.vault?.audit && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white/50 uppercase tracking-wide shrink-0">Auditoria #{currentDossier.vault.audit.sequence}</span>
                            <button type="button" onClick={() => copyText(currentDossier.vault.audit.chainHash)} className="flex items-center gap-1 text-amber-200 hover:text-amber-100 truncate max-w-[70%] text-right">
                              <span className="truncate">{shortDigest(currentDossier.vault.audit.chainHash, 8)}</span>
                              <Copy size={10} className="shrink-0 opacity-70" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CADEIA DE VERSOES */}
                    {currentDossier.tagIdentity?.versionChain?.length > 0 && (
                      <div className="p-3 bg-black/[0.02] border border-black/06 rounded-2xl">
                        <VersionChainPanel chain={currentDossier.tagIdentity.versionChain} />
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: CONTRIBUICOES */}
                {activeTab === 'contributions' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-3 flex items-center gap-1.5">
                        <Layers size={11} />
                        MODELO DE CONTRIBUICOES
                      </p>
                      {/* Diagrama visual do modelo */}
                      <div className="font-mono text-[9px] text-[#1A1A1A]/60 space-y-0.5 border-l-2 border-[#E8490A]/30 pl-3">
                        <div className="font-bold text-[#1A1A1A]/80">CONTRIBUICAO</div>
                        <div className="pl-2">├── TAG ({currentDossier.tag})</div>
                        <div className="pl-2">├── OBJETO (obra vinculada)</div>
                        <div className="pl-2">├── FONTE (acervo externo)</div>
                        <div className="pl-2">├── CONTRIBUICAO ANTERIOR</div>
                        <div className="pl-2">└── VERSAO (digest)</div>
                      </div>
                    </div>

                    <ContributionNetworkPanel
                      contributions={currentDossier.tagIdentity?.contributions || []}
                      tag={currentDossier.tag || selectedTagLabel}
                    />

                    {/* RELACOES TEXTUAIS */}
                    {currentDossier.conexoesTextuais?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 flex items-center gap-1.5">
                          <Link2 size={11} />
                          RELACOES COM OUTRAS TAGS ({currentDossier.conexoesTextuais.length})
                        </p>
                        <div className="space-y-1.5">
                          {currentDossier.conexoesTextuais.slice(0, 6).map((rel: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/50 border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors" onClick={() => handleSelectNode(rel.targetId, rel.targetLabel || rel.targetTag)}>
                              <Link2 size={11} className="text-blue-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-[#1A1A1A] truncate">{rel.targetLabel || rel.targetTag}</span>
                                <span className="text-[9px] text-[#1A1A1A]/45 font-mono ml-2">{rel.relationType || rel.relacaoSKOS}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BOTAO EXPORTAR */}
                <div className="pt-2 border-t border-black/08">
                  <button onClick={handleRunTransferTest} disabled={isTestingTransfer} className="w-full py-3.5 bg-[#121214] hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-lg active:scale-98">
                    <Send size={14} className={isTestingTransfer ? 'animate-spin' : ''} />
                    <span>{isTestingTransfer ? 'Gerando pacote...' : 'Exportar pacote interoperavel (JSON-LD)'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <FolderLock size={38} className="mx-auto text-[#E8490A]/30 mb-3" />
                <p className="text-xs text-[#1A1A1A]/50 leading-relaxed">Selecione uma contribuicao de usuario para abrir o registro de interoperabilidade.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL JSON-LD */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote de Transferencia — "{currentDossier?.tag || currentDossier?.label || selectedTagLabel}"
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono">JSON-LD 1.1 · W3C SKOS · PROV-O · Schema.org</p>
                </div>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/70 flex justify-between">
              <span>Accept: application/ld+json</span>
              <span className="text-green-400 font-bold">PACOTE VERIFICAVEL</span>
            </div>

            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {transferResult || JSON.stringify(currentJsonLd, null, 2)}
              </pre>
            </div>

            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                Contribuicao exportada com hashes publicos verificaveis; nenhuma chave criptografica e exposta.
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
