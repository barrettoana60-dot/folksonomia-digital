'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Copy, FileCode2, FolderLock, Globe, Link2, Network, RefreshCw, Search, Send, ShieldCheck, Sparkles, Tag, User } from 'lucide-react';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { CULTURAL_VAULT_REGISTRY } from '@/app/api/interop/live-vault/registry';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

type VaultNode = { id: string; label: string; eixo?: string; familia?: string; cor?: string; descricao?: string; usageCount?: number; x: number; y: number };
type VaultConnection = { from: string; to: string; afirmacao?: string; discovered?: boolean };

const COLORS: Record<string, string> = { SABERES: '#1A6B3A', FESTA: '#1E3A8A', MUSICA: '#0891B2', CRENCAS: '#6D28D9', PATRIMONIO: '#E8A920', default: '#4B5563' };
const NOISE = /(^|\s)(oi|eu|m|o|teste?|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;
const keyOf = (value: string) => normalizeForComparison(value).replace(/\s+/g, '_');
const isPublicTag = (value?: string) => !!value && value.trim().length >= 3 && !NOISE.test(value.trim()) && !/^\d+$/.test(value.trim());

function defaultNodes(): VaultNode[] {
  const items = Object.values(CULTURAL_VAULT_REGISTRY).filter(item => isPublicTag(item.tag));
  return items.map((item, index) => {
    const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
    return { id: item.id, label: item.tag, eixo: item.eixo, familia: item.familia, cor: item.cor, descricao: item.descricao, x: 400 + Math.cos(angle) * 165, y: 215 + Math.sin(angle) * 145 };
  });
}

function defaultConnections(): VaultConnection[] {
  const known = new Set(Object.values(CULTURAL_VAULT_REGISTRY).map(item => item.id));
  const added = new Set<string>();
  const connections: VaultConnection[] = [];
  Object.values(CULTURAL_VAULT_REGISTRY).forEach(item => item.conexoesTextuais.forEach(connection => {
    const pair = [item.id, connection.targetId].sort().join('|');
    if (known.has(connection.targetId) && !added.has(pair)) {
      added.add(pair);
      connections.push({ from: item.id, to: connection.targetId, afirmacao: connection.afirmacaoCultural });
    }
  }));
  return connections;
}

const LAYERS = [
  { icon: Tag, title: '1. Ingestão e proveniência', desc: 'A tag original, sua autoria, data e contexto são preservados.' },
  { icon: ShieldCheck, title: '2. Cofre vivo', desc: 'Cada tag mantém uma identidade persistente e não é substituída.' },
  { icon: Network, title: '3. Correlação cultural', desc: 'Relações culturais são atualizadas quando novas evidências entram.' },
  { icon: Globe, title: '4. Interoperabilidade', desc: 'A identidade e os vínculos podem circular em JSON-LD com SKOS.' }
];

export default function CulturalInteroperabilityView({ initialNodes = [], initialConnections = [] }: CulturalInteroperabilityViewProps) {
  const [nodes, setNodes] = useState<VaultNode[]>(defaultNodes);
  const [connections, setConnections] = useState<VaultConnection[]>([...defaultConnections(), ...initialConnections]);
  const [selectedId, setSelectedId] = useState('carranca');
  const [dossier, setDossier] = useState<any>({ ...CULTURAL_VAULT_REGISTRY.carranca, artigoStatus: 'ilustrativo' });
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activity, setActivity] = useState<string[]>([]);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonLd, setJsonLd] = useState('');
  const [copied, setCopied] = useState(false);
  const refreshRef = useRef<(() => void) | null>(null);

  const applyNodes = useCallback((items: any[]) => {
    const valid = items.filter(item => isPublicTag(item.label));
    setNodes(old => {
      const previous = new Map(old.map(node => [keyOf(node.label), node]));
      return valid.map((item, index) => {
        const existing = previous.get(keyOf(item.label));
        const angle = (index / Math.max(valid.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const radius = index < 8 ? 165 : 220 + (index % 3) * 24;
        return { id: item.id?.toString() || keyOf(item.label), label: item.label, eixo: item.eixo, familia: item.familia, cor: item.cor || COLORS[item.eixo] || COLORS.default, descricao: item.description, usageCount: item.usageCount, x: existing?.x ?? 400 + Math.cos(angle) * radius, y: existing?.y ?? 215 + Math.sin(angle) * radius };
      });
    });
  }, []);

  useEffect(() => {
    const validParentNodes = initialNodes.filter(item => isPublicTag(item.label));
    if (validParentNodes.length) applyNodes(validParentNodes);
    fetch('/api/interop/live-vault').then(response => response.ok ? response.json() : null).then(payload => {
      if (payload?.success && Array.isArray(payload.data?.nodes)) {
        applyNodes(payload.data.nodes);
        if (Array.isArray(payload.data.connections)) {
          setConnections(current => {
            const known = new Set(current.map(connection => [connection.from, connection.to].sort().join('|')));
            const incoming = payload.data.connections
              .filter((connection: any) => connection.from && connection.to)
              .map((connection: any) => ({
                from: connection.from,
                to: connection.to,
                afirmacao: connection.afirmacao,
                discovered: connection.discovered
              }))
              .filter((connection: VaultConnection) => {
                const key = [connection.from, connection.to].sort().join('|');
                if (known.has(key)) return false;
                known.add(key);
                return true;
              });
            return [...current, ...incoming];
          });
        }
      }
    }).catch(() => setMessage('Não foi possível atualizar a rede neste momento.'));
  }, [applyNodes, initialNodes]);

  useEffect(() => {
    if (!connections.length) return;
    const pulse = () => {
      const connection = connections[Math.floor(Math.random() * connections.length)];
      setActiveConnection(`${connection.from}|${connection.to}`);
      window.setTimeout(() => setActiveConnection(null), 1400);
    };
    pulse();
    const timer = window.setInterval(pulse, 2800);
    return () => window.clearInterval(timer);
  }, [connections]);

  const selectedNode = useMemo(() => nodes.find(node => node.id === selectedId) || nodes[0], [nodes, selectedId]);
  const visibleNodes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return term ? nodes.filter(node => `${node.label} ${node.familia || ''}`.toLocaleLowerCase('pt-BR').includes(term)) : nodes;
  }, [nodes, search]);

  const selectNode = useCallback(async (node: VaultNode) => {
    setSelectedId(node.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/interop/live-vault?tag=${encodeURIComponent(node.label)}`);
      const payload = await response.json();
      if (payload.success && payload.data) setDossier(payload.data);
    } catch {
      setMessage('O dossiê foi preservado, mas não pôde ser atualizado agora.');
    }
  }, []);

  const refreshConnections = useCallback(async () => {
    if (!selectedNode || isRefreshing) return;
    setIsRefreshing(true);
    setMessage(null);
    setActivity(['Lendo a proveniência preservada.', 'Observando relações culturais já registradas.']);
    try {
      const response = await fetch('/api/interop/live-vault', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceTag: selectedNode.label, sourceId: selectedNode.id, allNodes: nodes.map(node => ({ id: node.id, label: node.label })) }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error('update failed');
      const next: VaultConnection[] = (payload.data?.connections || []).filter((connection: any) => isPublicTag(connection.fromLabel) && isPublicTag(connection.toLabel)).map((connection: any) => ({
        from: nodes.find(node => keyOf(node.label) === keyOf(connection.fromLabel))?.id || connection.from,
        to: nodes.find(node => keyOf(node.label) === keyOf(connection.toLabel))?.id || connection.to,
        afirmacao: connection.afirmacao,
        discovered: true
      }));
      setConnections(old => {
        const current = new Set(old.map(connection => [connection.from, connection.to].sort().join('|')));
        return [...old, ...next.filter(connection => !current.has([connection.from, connection.to].sort().join('|')))];
      });
      if (payload.data?.dossier) setDossier(payload.data.dossier);
      setActivity(['A proveniência da tag foi preservada.', next.length ? `${next.length} novas relações culturais foram incorporadas à rede.` : 'Nenhuma nova relação cultural validada foi encontrada agora.', 'O dossiê e a representação interoperável foram atualizados.']);
    } catch {
      setActivity([]);
      setMessage('Não foi possível atualizar as conexões agora. Tente novamente em instantes.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, nodes, selectedNode]);

  useEffect(() => {
    refreshRef.current = refreshConnections;
  }, [refreshConnections]);

  // O cofre observa a rede continuamente; o botão apenas permite antecipar a atualização.
  useEffect(() => {
    if (!nodes.length) return;
    const firstRun = window.setTimeout(() => refreshRef.current?.(), 3000);
    const interval = window.setInterval(() => refreshRef.current?.(), 120000);
    return () => {
      window.clearTimeout(firstRun);
      window.clearInterval(interval);
    };
  }, [nodes.length, selectedId]);

  const openJsonLd = useCallback(async () => {
    const tag = dossier?.tag || selectedNode?.label || 'carranca';
    try {
      const response = await fetch(`/api/interop/live-vault?tag=${encodeURIComponent(tag)}`, { headers: { Accept: 'application/ld+json' } });
      if (!response.ok) throw new Error('jsonld failed');
      setJsonLd(JSON.stringify(await response.json(), null, 2));
      setShowJson(true);
    } catch {
      setMessage('Não foi possível preparar a representação interoperável desta tag.');
    }
  }, [dossier?.tag, selectedNode?.label]);

  const article = dossier?.artigo;
  const verifiedArticle = dossier?.artigoStatus === 'verificado';
  const culturalConnections = dossier?.conexoesTextuais || [];
  const externalEvidence = dossier?.externalEvidence || [];

  return <div className="space-y-6 text-[#1A1A1A]">
    <section className="glass-card rounded-3xl border border-black/8 bg-gradient-to-br from-white via-white to-orange-50/40 p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div><div className="mb-1 flex items-center gap-2.5"><FolderLock size={24} className="text-[#E8490A]" /><h2 className="serif-title text-xl tracking-tight md:text-2xl">Cofre Vivo & Interoperabilidade Cultural</h2><span className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase text-green-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" /> Rede ativa</span></div><p className="max-w-3xl text-xs font-medium leading-relaxed text-black/55">Cada tag é uma chave cultural viva: sua forma original é preservada e seus vínculos podem crescer com a rede.</p></div>
        <div className="flex items-center gap-2.5"><label className="relative w-48"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar em todas as tags" className="w-full rounded-xl border border-black/10 bg-white py-2 pl-8 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#E8490A]/30" /></label><button onClick={refreshConnections} disabled={isRefreshing || !selectedNode} className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl bg-[#E8490A] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#c44000] disabled:opacity-60"><RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />{isRefreshing ? 'Atualizando…' : 'Atualizar conexões'}</button></div>
      </div>
      <div className="mt-5"><p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#E8490A]">DNA vivo da tag — quatro camadas</p><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{LAYERS.map((layer, index) => { const Icon = layer.icon; return <div key={layer.title} className="relative rounded-2xl border border-black/7 bg-white p-3 shadow-xs"><Icon size={16} className="mb-2 text-[#E8490A]" /><h3 className="text-[11px] font-bold">{layer.title}</h3><p className="mt-1 text-[10px] leading-snug text-black/55">{layer.desc}</p>{index < LAYERS.length - 1 && <span className="absolute right-3 top-3 hidden text-black/20 xl:block">→</span>}</div>; })}</div></div>
      {activity.length > 0 && <div className="mt-4 rounded-2xl border border-[#E8490A]/15 bg-orange-50/60 p-3"><p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b93b00]"><Sparkles size={12} /> Movimento do cofre</p><div className="space-y-1 text-[11px] text-black/70">{activity.map(item => <p key={item}>• {item}</p>)}</div></div>}
      {message && <p className="mt-3 text-xs font-medium text-[#b93b00]">{message}</p>}
    </section>

    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7"><div className="glass-card rounded-3xl border border-black/7 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Network size={15} className="text-[#E8490A]" /><span className="text-xs font-bold uppercase tracking-wider">Rede viva de conexões</span><span className="text-[10px] text-black/40">{nodes.length} tags preservadas</span></div><span className="text-[10px] font-medium text-black/50">Selecione uma tag para abrir seu dossiê</span></div><div className="relative h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0C] shadow-2xl"><svg className="h-full w-full select-none" viewBox="0 0 800 430" aria-label="Rede de relações culturais"><defs><filter id="vault-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>{Array.from({ length: 48 }).map((_, index) => <circle key={index} cx={(index % 8) * 115 + 30} cy={Math.floor(index / 8) * 72 + 30} r="1.1" fill="rgba(255,255,255,0.035)" />)}{connections.map((connection, index) => { const from = nodes.find(node => node.id === connection.from); const to = nodes.find(node => node.id === connection.to); if (!from || !to) return null; const selected = from.id === selectedId || to.id === selectedId; const pulsing = activeConnection === `${connection.from}|${connection.to}`; return <line key={`${connection.from}-${connection.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={pulsing ? '#f59e0b' : selected ? '#22c55e' : 'rgba(255,255,255,0.18)'} strokeWidth={pulsing ? 3 : selected ? 2 : 1.1} opacity={pulsing ? 1 : selected ? .9 : .35} strokeDasharray={connection.discovered ? '5 4' : undefined} className={pulsing ? 'animate-pulse' : ''} />; })}{visibleNodes.map(node => { const selected = node.id === selectedId; const radius = selected ? 20 : 14; const color = selected ? '#22c55e' : node.cor || COLORS.default; return <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node)}><circle cx={node.x} cy={node.y} r={radius + 9} fill={color} opacity={selected ? .32 : .14} filter="url(#vault-glow)" /><circle cx={node.x} cy={node.y} r={radius} fill={color} stroke={selected ? '#fff' : 'rgba(255,255,255,.4)'} strokeWidth={selected ? 2.5 : 1} /><text x={node.x} y={node.y + radius + 14} textAnchor="middle" fill={selected ? '#fff' : 'rgba(255,255,255,.85)'} fontSize={selected ? '11' : '9'} fontWeight={selected ? '700' : '500'}>{node.label}</text></g>; })}</svg><div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-between text-[9px] text-white/45"><span>Linhas mostram relações culturais; o pulso acompanha o fluxo vivo.</span><span className="font-bold text-[#E8490A]">DNA cultural</span></div></div></div></div>
      <aside className="lg:col-span-5"><div className="glass-card space-y-5 rounded-3xl border border-black/7 bg-white p-6 shadow-sm"><div className="border-b border-black/8 pb-4"><div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="rounded-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: dossier?.cor || '#1A6B3A' }}>Tag preservada</span><span className="text-[10px] text-black/45">{dossier?.familia}</span></div><h3 className="text-2xl font-bold">{dossier?.tag || selectedNode?.label}</h3><p className="mt-1.5 text-xs leading-relaxed text-black/70">{dossier?.descricao || selectedNode?.descricao}</p></div>
        <div className="space-y-2 rounded-2xl border border-black/6 bg-black/[.02] p-4 text-xs"><div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-black/50"><span className="flex items-center gap-1.5"><User size={12} className="text-[#E8490A]" /> Origem da tag</span><span className="text-green-700">Preservada</span></div><p className="font-bold">Criada por {dossier?.autor || 'Comunidade'}</p><p className="border-t border-black/5 pt-2 text-black/65">Em {dossier?.dataCriacao || 'data preservada'}, a tag foi registrada como: {dossier?.triplaFrase || `${dossier?.tag} relaciona-se culturalmente a ${dossier?.tripla?.objeto}.`}</p><p className="text-[10px] text-black/45">Identificador persistente: {dossier?.uuid || 'em preservação'}</p></div>
        {article ? <div className="space-y-2.5 rounded-2xl border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/40 p-4"><div className="flex items-center justify-between gap-2 text-[9.5px] font-bold uppercase tracking-wider text-[#E8490A]"><span className="flex items-center gap-1.5"><BookOpen size={13} /> Artigo vinculado</span><span className={verifiedArticle ? 'text-green-700' : 'text-amber-700'}>{verifiedArticle ? 'Fonte verificada' : 'Dado ilustrativo — verificar'}</span></div><h4 className="text-xs font-bold leading-snug">{article.titulo}</h4><p className="text-[10.5px] font-medium text-black/60">{article.autor} • <span className="italic">{article.veiculo}</span> ({article.ano})</p><p className="border-t border-black/5 pt-2 text-[11px] leading-relaxed text-black/80">{article.resumo}</p><div className="flex items-center justify-between gap-3 pt-1 text-[10.5px]"><span className="font-mono text-black/50">{article.doi ? `DOI: ${article.doi}` : 'Sem DOI confirmado'}</span>{article.url && <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 font-bold text-[#E8490A] hover:underline">Abrir fonte <ArrowUpRight size={12} /></a>}</div></div> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Ainda não há artigo verificável vinculado a esta tag.</div>}
        {externalEvidence.length > 0 && <div className="space-y-2 rounded-2xl border border-cyan-200/60 bg-cyan-50/40 p-4"><div className="flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-cyan-800"><span className="flex items-center gap-1.5"><Globe size={13} /> Anexos interoperáveis</span><span>{externalEvidence.length} registros reais</span></div><div className="space-y-1.5">{externalEvidence.slice(0, 6).map((item: any) => <a key={item.external_id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-cyan-900/10 bg-white/70 p-2 text-[10.5px] hover:border-cyan-700/40"><span className="min-w-0"><strong className="mr-1 text-cyan-800">{item.source}</strong><span className="text-black/75">{item.title}</span></span><ArrowUpRight size={12} className="shrink-0 text-cyan-800" /></a>)}</div></div>}
        <div><p className="mb-2.5 text-[9.5px] font-bold uppercase tracking-wider text-black/50">Conexões culturais descobertas</p><div className="space-y-2">{culturalConnections.length ? culturalConnections.map((connection: any) => <button key={`${connection.targetId}-${connection.afirmacaoCultural}`} onClick={() => { const node = nodes.find(item => item.id === connection.targetId); if (node) selectNode(node); }} className="flex w-full items-start gap-2 rounded-xl border border-black/6 bg-black/[.02] p-3 text-left transition hover:border-[#E8490A]/40 hover:bg-orange-50/40"><Link2 size={13} className="mt-0.5 shrink-0 text-[#E8490A]" /><span className="text-[11px] leading-relaxed text-black/80">{connection.afirmacaoCultural}</span></button>) : <p className="rounded-xl bg-black/[.02] p-3 text-[11px] text-black/60">Esta tag ainda aguarda relações culturais validadas.</p>}</div></div>
        <button onClick={openJsonLd} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#121214] py-3.5 text-xs font-bold text-white transition hover:bg-black"><Send size={14} /> Ver representação interoperável</button>
      </div></aside>
    </section>
    {showJson && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121214] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 bg-black/40 p-4"><div className="flex items-center gap-2"><FileCode2 size={18} className="text-[#E8490A]" /><div><h3 className="text-sm font-bold text-white">Representação da tag</h3><p className="text-[10px] text-white/50">JSON-LD · SKOS · proveniência preservada</p></div></div><button onClick={() => setShowJson(false)} className="rounded bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:text-white">Fechar ×</button></div><div className="border-b border-white/5 bg-black/30 p-3 text-[10.5px] font-mono text-white/70">Accept: application/ld+json <span className="ml-3 font-bold text-green-400">200 OK</span></div><pre className="flex-1 overflow-auto bg-black/60 p-4 text-[11px] text-green-400">{jsonLd}</pre><div className="flex items-center justify-end border-t border-white/10 bg-black/40 p-3.5"><button onClick={() => { navigator.clipboard.writeText(jsonLd); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 rounded-xl bg-[#E8490A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#c44000]">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiado!' : 'Copiar JSON-LD'}</button></div></div></div>}
  </div>;
}
