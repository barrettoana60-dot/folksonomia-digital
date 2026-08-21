'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, Check, Copy, Database, FileCode2,
  Fingerprint, Globe2, Layers3, Link2, Network, RefreshCw, Search, ShieldCheck, Sparkles, Tag,
} from 'lucide-react';

interface CulturalInteroperabilityViewProps {
  /** Props kept for the existing admin shell; the live endpoint is the source of truth. */
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

type NodeKind = 'tag' | 'work' | 'document' | 'family';
type GraphNode = {
  id: string; kind: NodeKind; label: string; description?: string; color: string; eixo?: string; family?: string;
  dna?: string; source?: string; url?: string; usageCount?: number; confidence?: number; metadata?: Record<string, unknown>;
};
type GraphEdge = {
  id: string; from: string; to: string; relation: string; explanation: string; confidence: number;
  layer: 'factual' | 'inferred' | 'validated'; mechanism: string; source?: string; discovered?: boolean;
};
type Dossier = {
  tag: string; dna: string; aliases: string[]; family: string; axes: string[]; occurrenceCount: number;
  provenance: { firstObservedAt?: string; tagRecords: number; works: number; nuclei: number; dataSources: string[] };
  relations: Array<GraphEdge & { target: Pick<GraphNode, 'id' | 'kind' | 'label' | 'url' | 'source'> }>;
  evidence: Array<Pick<GraphNode, 'id' | 'label' | 'description' | 'source' | 'url' | 'confidence'>>;
};
type NetworkPayload = { nodes: GraphNode[]; connections: GraphEdge[]; selectedId?: string; dossier?: Dossier; metrics?: Record<string, any> };

const KIND_LABEL: Record<NodeKind, string> = { tag: 'Tag', work: 'Obra', document: 'Documento', family: 'Família' };
const KIND_COLOR: Record<NodeKind, string> = { tag: '#22c55e', work: '#E8490A', document: '#C0841A', family: '#8B5CF6' };
const LAYERS = [
  { icon: Tag, title: 'Todas as tags', description: 'Cada forma enviada por usuários entra na malha e conserva as variações de escrita.' },
  { icon: Fingerprint, title: 'DNA rastreável', description: 'Cada conceito recebe um código estável, sem expor identificadores pessoais.' },
  { icon: Network, title: 'Relações explicáveis', description: 'Toda linha informa tipo, confiança, camada e evidência que a sustenta.' },
  { icon: Globe2, title: 'Interoperabilidade', description: 'Obras e fontes externas viram nós navegáveis e podem sair em JSON-LD/SKOS.' },
];

function formatDate(value?: string) {
  if (!value) return 'data não registrada';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

function layerLabel(layer: GraphEdge['layer']) {
  return layer === 'validated' ? 'validada' : layer === 'factual' ? 'factual' : 'inferida';
}

function shortText(value: string, max = 70) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }

export default function CulturalInteroperabilityView({ onTriggerRAG }: CulturalInteroperabilityViewProps) {
  const [network, setNetwork] = useState<NetworkPayload>({ nodes: [], connections: [] });
  const [selectedId, setSelectedId] = useState<string>();
  const [dossier, setDossier] = useState<Dossier>();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'focus' | 'all'>('focus');
  const [loading, setLoading] = useState(true);
  const [learning, setLearning] = useState(false);
  const [message, setMessage] = useState<string>();
  const [showJson, setShowJson] = useState(false);
  const [jsonLd, setJsonLd] = useState('');
  const [copied, setCopied] = useState(false);

  const loadNetwork = useCallback(async (tag?: string, preserveSelection = false) => {
    setLoading(true);
    try {
      const url = tag ? `/api/interop/live-vault?tag=${encodeURIComponent(tag)}` : '/api/interop/live-vault';
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Falha ao carregar a rede.');
      const next: NetworkPayload = payload.data;
      setNetwork(next);
      setDossier(next.dossier);
      setSelectedId(previous => preserveSelection && previous ? previous : next.selectedId || previous);
    } catch (error: any) {
      setMessage(error.message || 'Não foi possível carregar a rede cultural agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNetwork(); }, [loadNetwork]);

  const byId = useMemo(() => new Map(network.nodes.map(node => [node.id, node])), [network.nodes]);
  const selectedNode = selectedId ? byId.get(selectedId) : undefined;
  const tagNodes = useMemo(() => network.nodes.filter(node => node.kind === 'tag'), [network.nodes]);
  const searchedTags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return tagNodes;
    return tagNodes.filter(node => `${node.label} ${node.family || ''} ${node.dna || ''}`.toLocaleLowerCase('pt-BR').includes(query));
  }, [search, tagNodes]);

  const focusIds = useMemo(() => {
    if (view === 'all') return new Set([...searchedTags.map(node => node.id), ...network.nodes.filter(node => node.kind === 'family').map(node => node.id)]);
    if (!selectedId) return new Set(searchedTags.slice(0, 40).map(node => node.id));
    const incident = network.connections.filter(edge => edge.from === selectedId || edge.to === selectedId)
      .sort((a, b) => b.confidence - a.confidence).slice(0, 28);
    return new Set([selectedId, ...incident.flatMap(edge => [edge.from, edge.to])]);
  }, [network.connections, network.nodes, searchedTags, selectedId, view]);
  const visibleNodes = useMemo(() => network.nodes.filter(node => focusIds.has(node.id)), [focusIds, network.nodes]);
  const visibleEdges = useMemo(() => network.connections.filter(edge => focusIds.has(edge.from) && focusIds.has(edge.to)), [focusIds, network.connections]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (view === 'focus' && selectedId) {
      map.set(selectedId, { x: 500, y: 285 });
      const others = visibleNodes.filter(node => node.id !== selectedId);
      others.forEach((node, index) => {
        const angle = (index / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const radius = node.kind === 'family' ? 158 : node.kind === 'document' ? 215 : 190;
        map.set(node.id, { x: 500 + Math.cos(angle) * radius, y: 285 + Math.sin(angle) * radius * 0.7 });
      });
      return map;
    }
    const families = visibleNodes.filter(node => node.kind === 'family');
    families.forEach((node, index) => {
      const angle = (index / Math.max(families.length, 1)) * Math.PI * 2 - Math.PI / 2;
      map.set(node.id, { x: 500 + Math.cos(angle) * 145, y: 285 + Math.sin(angle) * 110 });
    });
    const tags = visibleNodes.filter(node => node.kind === 'tag');
    tags.forEach((node, index) => {
      const angle = (index / Math.max(tags.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 205 + (index % 4) * 40;
      map.set(node.id, { x: 500 + Math.cos(angle) * radius, y: 285 + Math.sin(angle) * radius * 0.63 });
    });
    return map;
  }, [selectedId, view, visibleNodes]);

  const selectNode = useCallback((node: GraphNode) => {
    setSelectedId(node.id);
    setMessage(undefined);
    if (node.kind === 'tag') {
      setDossier(undefined);
      void loadNetwork(node.label, true);
    } else setDossier(undefined);
  }, [loadNetwork]);

  const refreshAcervo = useCallback(() => {
    setMessage(undefined);
    void loadNetwork(selectedNode?.kind === 'tag' ? selectedNode.label : undefined, true);
  }, [loadNetwork, selectedNode]);

  const learnSelectedTag = useCallback(async () => {
    if (!selectedNode || selectedNode.kind !== 'tag' || learning) return;
    setLearning(true); setMessage(undefined);
    try {
      const rag = onTriggerRAG ? onTriggerRAG(selectedNode.label).catch(() => undefined) : Promise.resolve();
      const response = await fetch('/api/interop/live-vault', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: selectedNode.label }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Não foi possível enriquecer a tag.');
      setNetwork(payload.data); setDossier(payload.data.dossier); setSelectedId(payload.data.selectedId || selectedNode.id);
      await rag;
      // The semantic report can add RAG evidence after the connector response.
      await loadNetwork(selectedNode.label, true);
      setMessage(payload.data.message || 'A rede incorporou as evidências encontradas.');
    } catch (error: any) {
      setMessage(error.message || 'A atualização das conexões falhou.');
    } finally { setLearning(false); }
  }, [learning, loadNetwork, onTriggerRAG, selectedNode]);

  const openJsonLd = useCallback(async () => {
    if (!selectedNode || selectedNode.kind !== 'tag') return;
    try {
      const response = await fetch(`/api/interop/live-vault?tag=${encodeURIComponent(selectedNode.label)}`, { headers: { Accept: 'application/ld+json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível gerar JSON-LD.');
      setJsonLd(JSON.stringify(await response.json(), null, 2)); setShowJson(true);
    } catch (error: any) { setMessage(error.message || 'Não foi possível preparar a representação interoperável.'); }
  }, [selectedNode]);

  const metrics = network.metrics || {};
  const detailsTitle = dossier?.tag || selectedNode?.label || 'Selecione uma tag';

  return <div className="space-y-6 text-[#1A1A1A]">
    <section className="glass-card rounded-3xl border border-black/8 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 shadow-sm md:p-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2.5"><Network size={24} className="text-[#E8490A]" /><h2 className="serif-title text-xl tracking-tight md:text-2xl">Rede de Interoperabilidade Cultural</h2><span className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase text-green-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" /> leitura ao vivo</span></div>
          <p className="max-w-3xl text-xs font-medium leading-relaxed text-black/60">A malha é calculada diretamente das tags do acervo. Uma tag vira chave para suas obras, documentos, fontes e relações — sempre com proveniência e nível de confiança visíveis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><label className="relative min-w-[190px] flex-1"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Localizar em todas as tags" className="w-full rounded-xl border border-black/10 bg-white py-2 pl-8 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#E8490A]/30" /></label><button onClick={refreshAcervo} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold transition hover:border-[#E8490A]/40 disabled:opacity-60"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Atualizar acervo</button></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Tags únicas', metrics.distinctTags || 0], ['Ocorrências', metrics.tagOccurrences || 0], ['Obras ligadas', metrics.works || 0],
          ['Documentos', metrics.documents || 0], ['Famílias', metrics.families || 0], ['Relações', metrics.relations || 0],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-black/6 bg-white px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-black/45">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>)}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{LAYERS.map(item => { const Icon = item.icon; return <div key={item.title} className="rounded-2xl border border-black/6 bg-white/80 p-3"><Icon size={15} className="mb-1.5 text-[#E8490A]" /><p className="text-[11px] font-bold">{item.title}</p><p className="mt-1 text-[10px] leading-snug text-black/55">{item.description}</p></div>; })}</div>
      <p className="mt-3 text-[10px] text-black/45">Identidade da rede: {metrics.dnaMode === 'hmac' ? 'DNA opaco protegido por HMAC.' : 'Impressão determinística ativa — configure INTEROP_DNA_KEY para DNA HMAC opaco.'}</p>
      {message && <p className="mt-4 rounded-xl border border-[#E8490A]/15 bg-orange-50 px-3 py-2 text-xs font-medium text-[#9A3600]">{message}</p>}
    </section>

    <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <div className="glass-card rounded-3xl border border-black/7 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Activity size={15} className="text-[#E8490A]" /><span className="text-xs font-bold uppercase tracking-wider">Mapa de relações</span><span className="text-[10px] text-black/45">{view === 'all' ? `${searchedTags.length} tags mostradas` : `${visibleNodes.length} nós no foco`}</span></div><div className="flex rounded-lg border border-black/10 p-0.5 text-[10px] font-bold"><button onClick={() => setView('focus')} className={`rounded-md px-2 py-1 ${view === 'focus' ? 'bg-[#121214] text-white' : 'text-black/55'}`}>Foco</button><button onClick={() => setView('all')} className={`rounded-md px-2 py-1 ${view === 'all' ? 'bg-[#121214] text-white' : 'text-black/55'}`}>Todas</button></div></div>
          <div className="relative h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0C10] shadow-2xl">
            {loading ? <div className="flex h-full items-center justify-center text-xs font-bold text-white/60"><RefreshCw size={16} className="mr-2 animate-spin" /> Lendo todas as tags do acervo…</div> : visibleNodes.length === 0 ? <div className="flex h-full items-center justify-center px-8 text-center text-xs leading-relaxed text-white/60">Ainda não há tags válidas no acervo para formar a rede.</div> : <svg className="h-full w-full select-none" viewBox="0 0 1000 570" aria-label="Grafo de interoperabilidade cultural">
              <defs><filter id="network-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
              {Array.from({ length: 80 }).map((_, index) => <circle key={index} cx={(index % 10) * 105 + 25} cy={Math.floor(index / 10) * 75 + 24} r="1" fill="rgba(255,255,255,.035)" />)}
              {visibleEdges.map(edge => { const from = positions.get(edge.from); const to = positions.get(edge.to); if (!from || !to) return null; const related = edge.from === selectedId || edge.to === selectedId; return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.layer === 'validated' ? '#22c55e' : edge.layer === 'factual' ? '#E8490A' : '#A78BFA'} strokeWidth={related ? 2.2 : 1} opacity={related ? .9 : .3} strokeDasharray={edge.layer === 'inferred' ? '5 4' : undefined} />; })}
              {visibleNodes.map(node => { const position = positions.get(node.id); if (!position) return null; const selected = node.id === selectedId; const radius = node.kind === 'family' ? 19 : selected ? 17 : node.kind === 'tag' ? 10 : 12; const color = node.kind === 'tag' ? node.color : KIND_COLOR[node.kind]; const showLabel = selected || view === 'focus' || visibleNodes.length <= 20; return <g key={node.id} className="cursor-pointer" onClick={() => selectNode(node)}><circle cx={position.x} cy={position.y} r={radius + 7} fill={color} opacity={selected ? .35 : .12} filter="url(#network-glow)" /><circle cx={position.x} cy={position.y} r={radius} fill={color} stroke={selected ? '#fff' : 'rgba(255,255,255,.45)'} strokeWidth={selected ? 2.5 : 1} />{showLabel && <text x={position.x} y={position.y + radius + 13} textAnchor="middle" fill={selected ? '#fff' : 'rgba(255,255,255,.78)'} fontSize={selected ? '10' : '8.5'} fontWeight={selected ? '700' : '500'}>{shortText(node.label, 28)}</text>}</g>; })}
            </svg>}
            <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-between text-[9px] text-white/50"><span>Linha contínua: dado factual/validado · tracejada: inferência explicável.</span><span className="font-bold text-[#E8490A]">DNA cultural</span></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-black/55">{(Object.keys(KIND_LABEL) as NodeKind[]).map(kind => <span key={kind} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[kind] }} />{KIND_LABEL[kind]}</span>)}</div>
        </div>
      </div>

      <aside className="xl:col-span-5"><div className="glass-card space-y-4 rounded-3xl border border-black/7 bg-white p-5 shadow-sm md:p-6">
        <div className="border-b border-black/8 pb-4"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: selectedNode?.kind === 'tag' ? selectedNode.color : KIND_COLOR[selectedNode?.kind || 'tag'] }}>{selectedNode ? KIND_LABEL[selectedNode.kind] : 'Aguardando'}</span>{dossier?.family && <span className="text-[10px] text-black/50">{dossier.family}</span>}</div><h3 className="text-2xl font-bold">{detailsTitle}</h3><p className="mt-1.5 text-xs leading-relaxed text-black/65">{dossier ? `${dossier.occurrenceCount} ocorrência(s) da tag preservadas em uma identidade cultural única.` : selectedNode?.description || 'Escolha um nó do grafo ou pesquise uma tag para abrir seu percurso.'}</p></div>
        {dossier ? <>
          <div className="rounded-2xl border border-black/6 bg-black/[.025] p-4"><div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-black/50"><Fingerprint size={12} className="text-[#E8490A]" /> DNA da tag</span><span className="text-[9px] font-bold text-green-700">rastreável</span></div><p className="break-all font-mono text-[11px] font-bold text-[#9A3600]">{dossier.dna}</p><p className="mt-2 text-[10.5px] leading-relaxed text-black/60">Primeira ocorrência: {formatDate(dossier.provenance.firstObservedAt)} · {dossier.provenance.works} obra(s) · {dossier.provenance.nuclei} núcleo(s).</p></div>
          <div><p className="mb-2 text-[9.5px] font-bold uppercase tracking-wider text-black/50">Formas preservadas</p><div className="flex flex-wrap gap-1.5">{dossier.aliases.map(alias => <span key={alias} className="rounded-lg border border-black/8 bg-white px-2 py-1 text-[10px] font-medium">{alias}</span>)}</div></div>
          <div className="flex gap-2"><button onClick={learnSelectedTag} disabled={learning} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E8490A] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#C53E00] disabled:opacity-60"><Sparkles size={13} className={learning ? 'animate-pulse' : ''} />{learning ? 'Consultando fontes…' : 'Aprender conexões'}</button><button onClick={openJsonLd} className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 py-2.5 text-xs font-bold transition hover:border-[#E8490A]/40"><FileCode2 size={13} /> JSON-LD</button></div>
          <div><p className="mb-2 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-black/50"><Link2 size={12} /> Conexões ({dossier.relations.length})</p><div className="max-h-56 space-y-2 overflow-auto pr-1">{dossier.relations.length ? dossier.relations.map(relation => <button key={relation.id} onClick={() => { const target = byId.get(relation.target.id); if (target) selectNode(target); }} className="w-full rounded-xl border border-black/6 bg-black/[.02] p-3 text-left transition hover:border-[#E8490A]/35 hover:bg-orange-50/50"><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-bold">{relation.target.label}</span><span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-black/50">{layerLabel(relation.layer)} · {Math.round(relation.confidence * 100)}%</span></div><p className="mt-1 text-[10.5px] leading-relaxed text-black/65">{relation.explanation}</p><p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-[#B84000]">{relation.relation.replaceAll('_', ' ')}</p></button>) : <p className="rounded-xl bg-black/[.02] p-3 text-[11px] text-black/60">A rede ainda não possui relações verificáveis para esta tag.</p>}</div></div>
          <div><p className="mb-2 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-black/50"><BookOpen size={12} /> Documentos e acervos ({dossier.evidence.length})</p><div className="space-y-2">{dossier.evidence.slice(0, 4).map(item => <div key={item.id} className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold leading-snug">{item.label}</p><p className="mt-1 text-[9.5px] font-medium text-[#9A6300]">{item.source} · {Math.round((item.confidence || 0) * 100)}% de pertinência</p></div>{item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.label}`} className="text-[#B84000]"><ArrowUpRight size={14} /></a>}</div>{item.description && <p className="mt-1.5 text-[10px] leading-relaxed text-black/60">{shortText(item.description, 150)}</p>}</div>)}</div></div>
        </> : selectedNode ? <div className="rounded-2xl border border-black/6 bg-black/[.025] p-4"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50"><Database size={12} /> Nó conectado</p><p className="mt-2 text-xs leading-relaxed text-black/70">{selectedNode.description || 'Este nó compõe o percurso da tag selecionada.'}</p>{selectedNode.url && <a href={selectedNode.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#B84000] hover:underline">Abrir registro <ArrowUpRight size={13} /></a>}</div> : <div className="rounded-2xl border border-dashed border-black/15 p-5 text-center text-xs text-black/55">O dossiê aparece aqui quando você seleciona uma tag.</div>}
      </div></aside>
    </section>

    <section className="glass-card rounded-3xl border border-black/7 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Layers3 size={14} className="text-[#E8490A]" /> Índice completo de tags</p><p className="mt-1 text-[11px] text-black/55">Exibindo {searchedTags.length} de {tagNodes.length} tags. A busca e a rolagem alcançam a totalidade carregada.</p></div><ShieldCheck size={18} className="text-green-700" /></div><div className="max-h-[560px] overflow-auto pr-1"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{searchedTags.map(node => <button key={node.id} onClick={() => selectNode(node)} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${node.id === selectedId ? 'border-[#E8490A]/50 bg-orange-50/60' : 'border-black/7 hover:border-black/20'}`}><span className="min-w-0"><span className="block truncate text-xs font-bold">{node.label}</span><span className="mt-0.5 block truncate font-mono text-[9px] text-black/45">{node.dna}</span></span><span className="shrink-0 rounded-md px-1.5 py-1 text-[9px] font-bold text-white" style={{ background: node.color }}>{node.usageCount}</span></button>)}</div></div></section>

    {showJson && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#121214] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 bg-black/40 p-4"><div className="flex items-center gap-2"><FileCode2 size={18} className="text-[#E8490A]" /><div><h3 className="text-sm font-bold text-white">Representação interoperável</h3><p className="text-[10px] text-white/50">JSON-LD · SKOS · proveniência e confiança</p></div></div><button onClick={() => setShowJson(false)} className="rounded bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:text-white">Fechar ×</button></div><pre className="flex-1 overflow-auto bg-black/60 p-4 text-[11px] text-green-400">{jsonLd}</pre><div className="flex justify-end border-t border-white/10 bg-black/40 p-3.5"><button onClick={() => { navigator.clipboard.writeText(jsonLd); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="flex items-center gap-1.5 rounded-xl bg-[#E8490A] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#C53E00]">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiado!' : 'Copiar JSON-LD'}</button></div></div></div>}
  </div>;
}
