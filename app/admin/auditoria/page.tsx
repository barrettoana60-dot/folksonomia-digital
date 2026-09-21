'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  RotateCcw,
  AlertTriangle,
  FileText,
  Layers,
  GitCommit,
  Network,
  Download,
  ExternalLink,
  ArrowLeft,
  Filter,
  Lock,
  History,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Share2,
} from 'lucide-react';

interface AuditEvent {
  event_id: string;
  entity_id: string;
  entity_type: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  timestamp: string;
  previous_version: number;
  new_version: number;
  previous_digest: string | null;
  new_digest: string;
  payload_digest: string;
  previous_event_digest: string | null;
  event_digest: string;
  source: string;
  reason?: string;
  metadata: Record<string, any>;
}

interface AuditContribution {
  contribution_id: string;
  actor_id: string;
  actor_role: string;
  tag_id: string;
  tag_label: string;
  object_id?: string;
  content: string;
  created_at: string;
  version: number;
  previous_version?: number;
  previous_digest?: string | null;
  digest: string;
  source: string;
  status: string;
  history?: Array<{
    version: number;
    content: string;
    timestamp: string;
    digest: string;
    actor_id: string;
    reason?: string;
  }>;
}

interface SecurityLog {
  log_id: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  timestamp: string;
  log_digest: string;
}

interface AuditExport {
  export_id: string;
  actor_id: string;
  actor_role: string;
  format: string;
  record_count: number;
  dataset_digest: string;
  filter_criteria?: Record<string, any>;
  timestamp: string;
}

interface AuditRelation {
  relation_id: string;
  source_entity: string;
  target_entity: string;
  relation_type: string;
  created_by: string;
  status: string;
  confidence: number;
  source: string;
  digest: string;
  evidence?: string;
  created_at: string;
  updated_at: string;
}

interface AuditSource {
  id: string;
  source: string;
  source_id?: string;
  external_id?: string;
  external_uri?: string;
  retrieved_at: string;
  adapter_version: string;
  response_digest: string;
  matching_method: string;
  confidence: number;
  raw_metadata?: Record<string, any>;
  created_at: string;
}

const TABS = [
  { id: 'eventos', label: 'Eventos de Auditoria', icon: Clock },
  { id: 'historia', label: 'História & Versões', icon: History },
  { id: 'contribuicoes', label: 'Contribuições Auditadas', icon: Layers },
  { id: 'relacoes', label: 'Relações Ontológicas', icon: Network },
  { id: 'fontes', label: 'Fontes Externas', icon: Globe },
  { id: 'proveniencia', label: 'Proveniência W3C PROV', icon: Share2 },
  { id: 'seguranca', label: 'Log de Segurança', icon: Lock },
  { id: 'exportacoes', label: 'Exportações Auditadas', icon: Download },
];

export default function AuditoriaPage() {
  const [activeTab, setActiveTab] = useState('eventos');

  // Estados dos Dados
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [contributions, setContributions] = useState<AuditContribution[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [exportsList, setExportsList] = useState<AuditExport[]>([]);
  const [relations, setRelations] = useState<AuditRelation[]>([]);
  const [sources, setSources] = useState<AuditSource[]>([]);
  const [merkleRoot, setMerkleRoot] = useState<string>('');

  // Loadings
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtros de Eventos
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Modal de Detalhe do Evento
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedPayloadDigest, setCopiedPayloadDigest] = useState(false);
  const [copiedPrevDigest, setCopiedPrevDigest] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedRoot, setCopiedRoot] = useState(false);

  // História e Comparador de Versões
  const [selectedTagId, setSelectedTagId] = useState('tag_cultura_popular');
  const [versionA, setVersionA] = useState<number>(1);
  const [versionB, setVersionB] = useState<number>(6);
  const [tagTimeline, setTagTimeline] = useState<any>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Carregar dados de eventos
  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/auditoria/eventos');
      const data = await res.json();
      if (data && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Falha ao carregar eventos:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Carregar contribuições auditadas
  const loadContributions = useCallback(async () => {
    setLoadingContributions(true);
    try {
      const res = await fetch('/api/admin/auditoria/contribuicoes');
      const data = await res.json();
      if (Array.isArray(data)) {
        setContributions(data);
      }
    } catch (err) {
      console.error('Falha ao carregar contribuições:', err);
    } finally {
      setLoadingContributions(false);
    }
  }, []);

  // Carregar logs de segurança
  const loadSecurityLogs = useCallback(async () => {
    setLoadingSecurity(true);
    try {
      const res = await fetch('/api/admin/auditoria/seguranca');
      const data = await res.json();
      if (Array.isArray(data)) setSecurityLogs(data);
    } catch (err) {
      console.error('Falha ao carregar logs de segurança:', err);
    } finally {
      setLoadingSecurity(false);
    }
  }, []);

  // Carregar relações e fontes
  const loadRelationsAndSources = useCallback(async () => {
    try {
      const [resRel, resSrc] = await Promise.all([
        fetch('/api/admin/auditoria/relacoes'),
        fetch('/api/admin/auditoria/fontes'),
      ]);
      const dataRel = await resRel.json();
      const dataSrc = await resSrc.json();
      if (Array.isArray(dataRel)) setRelations(dataRel);
      if (Array.isArray(dataSrc)) setSources(dataSrc);
    } catch (err) {
      console.error('Falha ao carregar relações/fontes:', err);
    }
  }, []);

  // Carregar exportações
  const loadExports = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auditoria/exportar');
      const data = await res.json();
      if (Array.isArray(data)) setExportsList(data);
    } catch (err) {
      console.error('Falha ao carregar exportações:', err);
    }
  }, []);

  // Carregar Merkle Root
  const loadMerkle = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auditoria/merkle-root');
      const data = await res.json();
      if (data && data.merkleRoot) {
        setMerkleRoot(data.merkleRoot);
      }
    } catch (err) {
      console.error('Falha ao carregar merkle root:', err);
    }
  }, []);

  // Carregar linha do tempo de tag
  const loadTagTimeline = useCallback(async (tagId: string) => {
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/admin/auditoria/entidade/${encodeURIComponent(tagId)}`);
      const data = await res.json();
      setTagTimeline(data);
      if (data && data.events && data.events.length > 0) {
        const sorted = [...data.events].sort((a: any, b: any) => a.new_version - b.new_version);
        setVersionA(sorted[0].new_version);
        setVersionB(sorted[sorted.length - 1].new_version);
      }
    } catch (err) {
      console.error('Falha ao carregar timeline da tag:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  // Carregamento inicial de todos os dados
  useEffect(() => {
    loadEvents();
    loadContributions();
    loadRelationsAndSources();
    loadSecurityLogs();
    loadExports();
    loadMerkle();
    loadTagTimeline(selectedTagId);
  }, [loadEvents, loadContributions, loadRelationsAndSources, loadSecurityLogs, loadExports, loadMerkle, loadTagTimeline, selectedTagId]);

  // Lista de tags únicas disponíveis para a timeline
  const uniqueEntities = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      const label = e.metadata?.label || e.entity_id;
      map.set(e.entity_id, label);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [events]);

  // Filtro de eventos
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterEntity && e.entity_id !== filterEntity) return false;
      if (filterActor && !e.actor_id.toLowerCase().includes(filterActor.toLowerCase())) return false;
      if (filterEventType && e.event_type !== filterEventType) return false;
      if (filterSource && !e.source.toLowerCase().includes(filterSource.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = e.metadata?.label?.toLowerCase().includes(q);
        const matchesEntity = e.entity_id.toLowerCase().includes(q);
        const matchesEvent = e.event_type.toLowerCase().includes(q);
        const matchesDigest = e.event_digest.toLowerCase().includes(q);
        const matchesReason = e.reason?.toLowerCase().includes(q);
        if (!matchesLabel && !matchesEntity && !matchesEvent && !matchesDigest && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [events, filterEntity, filterActor, filterEventType, filterSource, searchQuery]);

  // Comparação de versões selecionadas para a tag
  const versionComparison = useMemo(() => {
    if (!tagTimeline || !tagTimeline.events) return null;
    const eventA = tagTimeline.events.find((e: any) => e.new_version === versionA);
    const eventB = tagTimeline.events.find((e: any) => e.new_version === versionB);
    return { eventA, eventB };
  }, [tagTimeline, versionA, versionB]);

  // Executar exportação auditada
  const handleExportAuditedPackage = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/auditoria/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: 'adm_painel_auditoria',
          actor_role: 'ADMIN',
          format: 'JSON-LD',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: 'application/ld+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auditoria_cultural_${data.export_id}.jsonld`;
        a.click();
        URL.revokeObjectURL(url);
        loadExports();
        loadSecurityLogs();
      }
    } catch (err) {
      console.error('Erro na exportação:', err);
    } finally {
      setExporting(false);
    }
  };

  const copyText = (text: string, setter: (val: boolean) => void) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const getEventBadgeStyle = (type: string) => {
    switch (type) {
      case 'tag_created':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contribution_added':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'match_found':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'relation_created':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'relation_validated':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'version_published':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'REVOKE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ARCHIVE':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <main className="min-h-screen pt-28 md:pt-32 pb-24 px-4 md:px-10 bg-[#EEEBE3] text-[#1A1A1A] antialiased">
      <div className="max-w-[1440px] mx-auto space-y-8">

        {/* CABEÇALHO INSTITUCIONAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8490A] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(232,73,10,0.25)]">
                <GitCommit size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-tight text-[#1A1A1A]">
                  Sistema de Auditoria
                </h1>
                <p className="text-xs text-[#1A1A1A]/60 mt-0.5 font-medium uppercase tracking-wider">
                  Trilha de Proveniência Verificável, Event Sourcing e Criptografia SHA-256 (256-bit)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-[#1A1A1A] border border-black/10 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft size={14} /> Voltar ao Painel
            </Link>

            <button
              onClick={() => {
                loadEvents();
                loadContributions();
                loadRelationsAndSources();
                loadSecurityLogs();
                loadExports();
                loadMerkle();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-[#1A1A1A] border border-black/10 transition-all flex items-center gap-1.5 shadow-2xs"
              title="Recarregar dados"
            >
              <RotateCcw size={13} /> Sincronizar
            </button>

            <button
              onClick={handleExportAuditedPackage}
              disabled={exporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-1.5 shadow-[0_4px_16px_rgba(232,73,10,0.25)] disabled:opacity-50"
            >
              <Download size={13} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Exportando...' : 'Exportar JSON-LD'}
            </button>
          </div>
        </div>

        {/* CARDS EXECUTIVOS DE STATUS & KPIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {/* Card 1: Total Eventos */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total de Eventos</span>
              <Clock size={16} className="text-[#0D3A85]" />
            </div>
            <div className="text-3xl font-normal serif-title text-[#1A1A1A]">
              {events.length}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Registros imutáveis com fingerprint SHA-256 (256-bit)
            </p>
          </div>

          {/* Card 2: Altura da Cadeia */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Altura da Hash Chain</span>
              <GitCommit size={16} className="text-[#059669]" />
            </div>
            <div className="text-3xl font-normal serif-title text-[#059669]">
              {events.length} <span className="text-sm font-sans font-medium text-[#1A1A1A]/50">elos</span>
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55 font-mono">
              previous_event_digest → event_digest contínuo
            </p>
          </div>

          {/* Card 3: Merkle Root */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Merkle Root Determinística</span>
              <button
                onClick={() => merkleRoot && copyText(merkleRoot, setCopiedRoot)}
                className="text-[10px] text-[#E8490A] hover:underline font-bold flex items-center gap-1"
                title="Copiar Hash Raiz"
              >
                {copiedRoot ? <Check size={12} /> : <Copy size={12} />}
                {copiedRoot ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="text-xs font-mono font-bold text-[#0D3A85] truncate bg-black/[0.03] p-2 rounded-xl border border-black/[0.06]">
              {merkleRoot || 'sha256:7f9a2b...'}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Prova criptográfica em árvore binária para lotes
            </p>
          </div>

          {/* Card 4: Contribuições & Vínculos */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Contribuições Preservadas</span>
              <Layers size={16} className="text-[#E8490A]" />
            </div>
            <div className="text-3xl font-normal serif-title text-[#E8490A]">
              {contributions.length}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Identidade própria con_ com versionamento histórico
            </p>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-black/[0.08] shadow-2xs overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#E8490A] text-white shadow-[0_4px_16px_rgba(232,73,10,0.25)]'
                      : 'text-[#1A1A1A]/70 hover:bg-black/[0.04] hover:text-[#1A1A1A]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-[#1A1A1A]/40'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ABA 1: EVENTOS DE AUDITORIA */}
        {activeTab === 'eventos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra de Filtros */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-[#E8490A]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Filtros da Trilha de Proveniência
                  </span>
                </div>
                {(searchQuery || filterEntity || filterActor || filterEventType || filterSource) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterEntity('');
                      setFilterActor('');
                      setFilterEventType('');
                      setFilterSource('');
                    }}
                    className="text-xs font-bold text-[#E8490A] hover:underline"
                  >
                    Limpar Todos os Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {/* Busca Textual */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3 text-[#1A1A1A]/35" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar termo, hash, razão..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#E8490A] focus:outline-none shadow-2xs"
                  />
                </div>

                {/* Filtro de Entidade */}
                <select
                  value={filterEntity}
                  onChange={e => setFilterEntity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] focus:border-[#E8490A] focus:outline-none shadow-2xs font-medium"
                >
                  <option value="">Todas as Entidades</option>
                  {uniqueEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.label}</option>
                  ))}
                </select>

                {/* Filtro de Tipo de Evento */}
                <select
                  value={filterEventType}
                  onChange={e => setFilterEventType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] focus:border-[#E8490A] focus:outline-none shadow-2xs font-medium"
                >
                  <option value="">Todos os Tipos de Evento</option>
                  <option value="tag_created">tag_created (Criação)</option>
                  <option value="contribution_added">contribution_added (Contribuição)</option>
                  <option value="match_found">match_found (Correspondência)</option>
                  <option value="relation_created">relation_created (Relação)</option>
                  <option value="relation_validated">relation_validated (Validação)</option>
                  <option value="version_published">version_published (Publicação)</option>
                  <option value="REVOKE">REVOKE (Revogação)</option>
                  <option value="ARCHIVE">ARCHIVE (Arquivamento)</option>
                </select>

                {/* Filtro por Ator */}
                <input
                  type="text"
                  value={filterActor}
                  onChange={e => setFilterActor(e.target.value)}
                  placeholder="Ator (ex: usr_, adm_)..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#E8490A] focus:outline-none shadow-2xs"
                />

                {/* Filtro por Origem */}
                <input
                  type="text"
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  placeholder="Origem (Brasiliana, Europeana...)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#E8490A] focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* Tabela de Eventos */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-black/[0.08] flex items-center justify-between bg-black/[0.02]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Eventos Encadeados Criptograficamente (SHA-256)</h2>
                  <p className="text-xs text-[#1A1A1A]/55">
                    Mostrando {filteredEvents.length} de {events.length} eventos consolidados
                  </p>
                </div>
                <button
                  onClick={loadEvents}
                  className="p-2 rounded-xl bg-white hover:bg-black/[0.04] text-[#1A1A1A]/70 border border-black/10 transition-colors shadow-2xs"
                  title="Recarregar eventos"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {loadingEvents ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-2 border-[#E8490A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#1A1A1A]/50">Carregando trilha de auditoria...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-16 text-center">
                  <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
                  <p className="text-sm text-[#1A1A1A]/60">Nenhum evento corresponde aos critérios filtrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-black/[0.03] border-b border-black/[0.08] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                        <th className="p-3.5">Data / Hora</th>
                        <th className="p-3.5">Evento</th>
                        <th className="p-3.5">Entidade Cultural</th>
                        <th className="p-3.5">Versão</th>
                        <th className="p-3.5">Ator / Papel</th>
                        <th className="p-3.5">Origem</th>
                        <th className="p-3.5 font-mono">Event Digest (SHA-256)</th>
                        <th className="p-3.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05]">
                      {filteredEvents.map(ev => {
                        const isGenesis = ev.previous_event_digest === null;
                        const badgeStyle = getEventBadgeStyle(ev.event_type);
                        return (
                          <tr key={ev.event_id} className="hover:bg-black/[0.02] transition-colors group">
                            <td className="p-3.5 text-[#1A1A1A]/80 whitespace-nowrap font-mono text-[11px]">
                              {new Date(ev.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyle}`}>
                                {ev.event_type}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-[#1A1A1A]">
                                {ev.metadata?.label || ev.entity_id}
                              </div>
                              <div className="text-[10px] text-[#1A1A1A]/40 font-mono">{ev.entity_id}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono">
                              <span className="text-[#1A1A1A]/40 font-medium">V{ev.previous_version}</span>
                              <span className="mx-1 text-[#E8490A] font-bold">→</span>
                              <span className="font-bold text-[#059669]">V{ev.new_version}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="text-[#1A1A1A] font-medium">{ev.actor_id}</div>
                              <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-black/[0.06] text-[#1A1A1A]/70 font-mono uppercase font-bold">
                                {ev.actor_role}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#1A1A1A]/70 font-medium">{ev.source}</td>
                            <td className="p-3.5 font-mono text-[11px]">
                              <div className="flex items-center gap-1 text-[#1A1A1A]/70">
                                {isGenesis ? (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md font-sans font-bold">
                                    GÊNESE
                                  </span>
                                ) : (
                                  <GitCommit size={12} className="text-[#059669] shrink-0" />
                                )}
                                <span className="truncate max-w-[140px] font-bold">{ev.event_digest.slice(0, 16)}…</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setSelectedEvent(ev)}
                                className="px-3 py-1.5 rounded-xl bg-white hover:bg-black/[0.05] text-[#1A1A1A] font-semibold text-[11px] border border-black/10 transition-all shadow-2xs inline-flex items-center gap-1.5"
                              >
                                <Eye size={12} className="text-[#E8490A]" /> Inspecionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: HISTÓRIA & VERSÕES */}
        {activeTab === 'historia' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra Seletora de Entidade */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D3A85] text-white flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Linha Temporal da Identidade Cultural</h2>
                  <p className="text-xs text-[#1A1A1A]/60">Reconstituição passo a passo da evolução e integridade</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-[#1A1A1A]/70 uppercase tracking-wider">Identidade:</label>
                <select
                  value={selectedTagId}
                  onChange={e => setSelectedTagId(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] focus:border-[#E8490A] outline-none font-bold shadow-2xs"
                >
                  {uniqueEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.label} ({ent.id})</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingTimeline ? (
              <div className="p-20 text-center rounded-2xl bg-white/80 border border-black/[0.08]">
                <div className="w-8 h-8 border-2 border-[#E8490A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[#1A1A1A]/50">Carregando história da identidade cultural...</p>
              </div>
            ) : !tagTimeline || !tagTimeline.events || tagTimeline.events.length === 0 ? (
              <div className="p-20 text-center rounded-2xl bg-white/80 border border-black/[0.08]">
                <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
                <p className="text-sm text-[#1A1A1A]/60">Nenhum evento registrado para esta entidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Linha Temporal Visual (5 colunas) */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-6">
                  <div className="border-b border-black/[0.08] pb-3">
                    <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                      Trilha de Proveniência Passo a Passo
                    </h3>
                    <p className="text-base font-normal serif-title text-[#1A1A1A] mt-1">
                      {tagTimeline.events[0]?.metadata?.label || selectedTagId}
                    </p>
                  </div>

                  <div className="relative pl-6 space-y-6">
                    <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#0D3A85] via-[#E8490A] to-[#059669]" />

                    {tagTimeline.events.map((ev: AuditEvent) => {
                      const isGenesis = ev.previous_version === 0;
                      const isPublished = ev.event_type.includes('publish') || ev.metadata?.status === 'PUBLISHED';

                      return (
                        <div key={ev.event_id} className="relative group">
                          <div
                            className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                              isPublished
                                ? 'border-[#059669] bg-[#059669] shadow-[0_0_8px_rgba(5,150,105,0.4)]'
                                : isGenesis
                                ? 'border-[#0D3A85] bg-[#0D3A85]'
                                : 'border-[#E8490A] bg-[#E8490A]'
                            }`}
                          />

                          <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs hover:border-[#E8490A]/40 transition-all space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Versão {ev.new_version}
                              </span>
                              <span className="text-[10px] text-[#1A1A1A]/45 font-mono">
                                {new Date(ev.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-[#1A1A1A] flex items-center gap-2">
                              <span>{ev.event_type}</span>
                              {ev.metadata?.status && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/[0.06] text-[#1A1A1A]/70 font-mono uppercase font-bold">
                                  {ev.metadata.status}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[#1A1A1A]/70 leading-relaxed font-sans">
                              {ev.reason || 'Atualização dos atributos estruturados da identidade.'}
                            </p>

                            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#1A1A1A]/50 font-mono border-t border-black/[0.05]">
                              <span>Ator: {ev.actor_id} ({ev.actor_role})</span>
                              <span>Fonte: {ev.source}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comparador de Versões Lado a Lado (7 colunas) */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-6">
                  <div className="border-b border-black/[0.08] pb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                        Comparador Canônico de Versões
                      </h3>
                      <p className="text-base font-normal serif-title text-[#1A1A1A] mt-0.5">
                        Diferenças entre Versão Anterior e Versão Atual
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#1A1A1A]/50 font-bold">V_A:</span>
                        <select
                          value={versionA}
                          onChange={e => setVersionA(parseInt(e.target.value, 10))}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-black/15 text-[#1A1A1A] font-mono text-xs font-bold"
                        >
                          {tagTimeline.events.map((e: AuditEvent) => (
                            <option key={`a-${e.new_version}`} value={e.new_version}>
                              Versão {e.new_version}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-[#E8490A] font-black">VS</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[#1A1A1A]/50 font-bold">V_B:</span>
                        <select
                          value={versionB}
                          onChange={e => setVersionB(parseInt(e.target.value, 10))}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-black/15 text-[#1A1A1A] font-mono text-xs font-bold"
                        >
                          {tagTimeline.events.map((e: AuditEvent) => (
                            <option key={`b-${e.new_version}`} value={e.new_version}>
                              Versão {e.new_version}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {versionComparison && versionComparison.eventA && versionComparison.eventB ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-xl bg-[#0D3A85]/5 border border-[#0D3A85]/20 space-y-1.5">
                          <div className="text-[#0D3A85] text-[10px] uppercase font-bold tracking-wider">
                            Estado na Versão {versionA}
                          </div>
                          <div className="text-sm font-bold text-[#1A1A1A]">
                            {versionComparison.eventA.event_type}
                          </div>
                          <div className="text-[10px] text-[#1A1A1A]/60 font-mono truncate">
                            Digest: {versionComparison.eventA.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-[#1A1A1A]/60">
                            Ator: {versionComparison.eventA.actor_id} ({versionComparison.eventA.actor_role})
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1.5">
                          <div className="text-emerald-800 text-[10px] uppercase font-bold tracking-wider">
                            Estado na Versão {versionB}
                          </div>
                          <div className="text-sm font-bold text-emerald-950">
                            {versionComparison.eventB.event_type}
                          </div>
                          <div className="text-[10px] text-emerald-800 font-mono truncate">
                            Digest: {versionComparison.eventB.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-emerald-800">
                            Ator: {versionComparison.eventB.actor_id} ({versionComparison.eventB.actor_role})
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Diff Detalhada */}
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden text-xs bg-white shadow-2xs">
                        <table className="w-full text-left">
                          <thead className="bg-black/[0.03] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold border-b border-black/[0.08]">
                            <tr>
                              <th className="p-3">Atributo</th>
                              <th className="p-3">Versão {versionA}</th>
                              <th className="p-3">Versão {versionB}</th>
                              <th className="p-3">Status da Modificação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.05] text-[11px]">
                            <tr>
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Status Operacional</td>
                              <td className="p-3 text-[#1A1A1A]/80 font-mono">{versionComparison.eventA.metadata?.status || 'RAW'}</td>
                              <td className="p-3 font-bold text-[#059669] font-mono">
                                {versionComparison.eventB.metadata?.status || 'VALIDATED'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  validado
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Origem / Conector</td>
                              <td className="p-3 text-[#1A1A1A]/80">{versionComparison.eventA.source}</td>
                              <td className="p-3 font-bold text-[#1A1A1A]">{versionComparison.eventB.source}</td>
                              <td className="p-3">
                                {versionComparison.eventA.source !== versionComparison.eventB.source ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    alterado
                                  </span>
                                ) : (
                                  <span className="text-[#1A1A1A]/40 text-[10px]">inalterado</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Digest do Estado (SHA-256)</td>
                              <td className="p-3 truncate max-w-[150px] font-mono text-[#1A1A1A]/60">
                                {versionComparison.eventA.new_digest.slice(0, 16)}…
                              </td>
                              <td className="p-3 truncate max-w-[150px] font-mono font-bold text-[#059669]">
                                {versionComparison.eventB.new_digest.slice(0, 16)}…
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  novo digest
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Entidade Relacionada</td>
                              <td className="p-3 text-[#1A1A1A]/40 font-mono">
                                {versionComparison.eventA.metadata?.target_entity || '—'}
                              </td>
                              <td className="p-3 font-bold text-[#1A1A1A] font-mono">
                                {versionComparison.eventB.metadata?.target_entity || '—'}
                              </td>
                              <td className="p-3">
                                {versionComparison.eventB.metadata?.target_entity && !versionComparison.eventA.metadata?.target_entity ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    adicionado
                                  </span>
                                ) : (
                                  <span className="text-[#1A1A1A]/40 text-[10px]">preservado</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Motivação Formal</td>
                              <td className="p-3 text-[#1A1A1A]/60 leading-tight">
                                {versionComparison.eventA.reason || '—'}
                              </td>
                              <td className="p-3 text-[#1A1A1A] font-medium leading-tight">
                                {versionComparison.eventB.reason || '—'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  revisado
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#1A1A1A]/50">Selecione duas versões para calcular a comparação canônica.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: CONTRIBUIÇÕES AUDITADAS (SEÇÃO 8) */}
        {activeTab === 'contribuicoes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A]">Auditoria de Contribuições com Identidade Própria</h2>
                <p className="text-xs text-[#1A1A1A]/60 mt-0.5">
                  Cada contribuição possui ID exclusivo (con_...), histórico versionado (V1 → Correção → V2) e hash SHA-256
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/[0.05] text-[#1A1A1A]">
                {contributions.length} Contribuições Rastreadas
              </span>
            </div>

            <div className="space-y-4">
              {contributions.map(con => (
                <div key={con.contribution_id} className="p-6 rounded-2xl bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#E8490A] bg-[#E8490A]/10 px-2.5 py-1 rounded-lg border border-[#E8490A]/20">
                        {con.contribution_id}
                      </span>
                      <span className="font-bold text-sm text-[#1A1A1A]">{con.tag_label}</span>
                      <span className="text-[10px] font-mono text-[#059669] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Versão Atual: V{con.version}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-[#1A1A1A]/60">
                      Digest Atual: <span className="font-bold text-[#1A1A1A]">{con.digest.slice(0, 20)}…</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/[0.02] border border-black/[0.05] text-xs text-[#1A1A1A]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 block mb-1">Conteúdo Atual</span>
                    <p className="leading-relaxed font-sans">{con.content}</p>
                  </div>

                  {/* Trilha Histórica Versionada V1 -> V2 */}
                  {con.history && con.history.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 block">
                        Trilha de Evolução da Contribuição (Histórico Imutável)
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {con.history.map((h, hIdx) => (
                          <div key={hIdx} className="p-3 rounded-xl bg-white border border-black/[0.08] space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold font-mono text-[#0D3A85]">Versão {h.version}</span>
                              <span className="text-[10px] text-[#1A1A1A]/50 font-mono">
                                {new Date(h.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-xs text-[#1A1A1A]/80 italic">&ldquo;{h.content}&rdquo;</p>
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#1A1A1A]/50 font-mono border-t border-black/[0.04]">
                              <span>Ator: {h.actor_id}</span>
                              <span>Digest: {h.digest.slice(0, 14)}…</span>
                            </div>
                            {h.reason && (
                              <div className="text-[10px] text-[#059669] font-medium">Motivo: {h.reason}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 4: RELAÇÕES ONTOLÓGICAS (SEÇÃO 6) */}
        {activeTab === 'relacoes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-black/[0.08] flex items-center justify-between bg-black/[0.02]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Relações Ontológicas Auditadas</h2>
                  <p className="text-xs text-[#1A1A1A]/55">
                    Origem de cada vínculo, nível de confiança matemática, fonte e digest SHA-256
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/[0.05] text-[#1A1A1A]">
                  {relations.length} Relações Preservadas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/[0.03] border-b border-black/[0.08] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                      <th className="p-3.5">Identidade Origem</th>
                      <th className="p-3.5">Relação (SKOS)</th>
                      <th className="p-3.5">Identidade Destino</th>
                      <th className="p-3.5">Fonte / Conector</th>
                      <th className="p-3.5">Confiança</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 font-mono">Digest da Relação (SHA-256)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {relations.map(rel => (
                      <tr key={rel.relation_id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="p-3.5 font-bold text-[#1A1A1A] font-mono text-[11px]">{rel.source_entity}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E8490A]/10 text-[#E8490A] border border-[#E8490A]/20">
                            {rel.relation_type}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-[#1A1A1A] font-mono text-[11px]">{rel.target_entity}</td>
                        <td className="p-3.5 text-[#1A1A1A]/70 font-medium">{rel.source}</td>
                        <td className="p-3.5 font-mono font-bold text-[#059669]">
                          {Math.round(rel.confidence * 100)}%
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            {rel.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-[#1A1A1A]/60">
                          {rel.digest.slice(0, 20)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: FONTES EXTERNAS (SEÇÃO 7) */}
        {activeTab === 'fontes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-black/[0.08] flex items-center justify-between bg-black/[0.02]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Fontes Externas com Origem Preservada</h2>
                  <p className="text-xs text-[#1A1A1A]/55">
                    Diferenciação probatória entre usuário, acervo institucional e adaptadores de rede
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/[0.05] text-[#1A1A1A]">
                  {sources.length} Acervos Conectados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/[0.03] border-b border-black/[0.08] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                      <th className="p-3.5">Acervo / Conector</th>
                      <th className="p-3.5">ID Externo</th>
                      <th className="p-3.5">URI Externa</th>
                      <th className="p-3.5">Método de Correspondência</th>
                      <th className="p-3.5">Versão Adaptador</th>
                      <th className="p-3.5 font-mono">Response Digest (SHA-256)</th>
                      <th className="p-3.5">Data Recuperação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05]">
                    {sources.map(src => (
                      <tr key={src.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="p-3.5 font-bold text-[#1A1A1A]">{src.source}</td>
                        <td className="p-3.5 font-mono text-[11px] text-[#1A1A1A]/80">{src.external_id || src.source_id}</td>
                        <td className="p-3.5">
                          {src.external_uri ? (
                            <a
                              href={src.external_uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0D3A85] hover:underline inline-flex items-center gap-1 font-mono text-[11px] font-bold"
                            >
                              Abrir Registro <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-[#1A1A1A]/30 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-[#1A1A1A]/70">{src.matching_method}</td>
                        <td className="p-3.5 font-mono text-[#1A1A1A]/60">v{src.adapter_version}</td>
                        <td className="p-3.5 font-mono text-[11px] text-[#1A1A1A]/60">{src.response_digest.slice(0, 18)}…</td>
                        <td className="p-3.5 text-[#1A1A1A]/60 font-mono text-[11px]">
                          {new Date(src.retrieved_at).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 6: PROVENIÊNCIA W3C PROV (SEÇÃO 9 & 19) */}
        {activeTab === 'proveniencia' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-4">
              <div className="border-b border-black/[0.06] pb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8490A] font-bold block">
                  Modelo Conceitual W3C PROV & Princípio Fundamental
                </span>
                <h2 className="text-xl font-normal serif-title text-[#1A1A1A] mt-1">
                  &ldquo;Como esta informação chegou ao estado em que está agora?&rdquo;
                </h2>
                <p className="text-xs text-[#1A1A1A]/60 mt-1">
                  O sistema percorre a trilha ontológica contínua interligando atores, fontes, atividades e estados criptográficos.
                </p>
              </div>

              {/* Diagrama de Trilha */}
              <div className="p-5 rounded-2xl bg-[#0D3A85]/5 border border-[#0D3A85]/15 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#0D3A85] block font-mono">
                  Fluxo Contínuo de Reconstituição de Estado
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A]">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800">ESTADO ATUAL</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800">VERSÃO</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800">EVENTO</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">CONTRIBUIÇÃO</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800">AGENTE</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-800">FONTE</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800">RELAÇÃO</span>
                  <span className="text-[#E8490A]">→</span>
                  <span className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800">ESTADO ANTERIOR</span>
                </div>
              </div>

              {/* Tríade W3C PROV Explicada */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs space-y-2">
                  <div className="text-[10px] uppercase font-mono font-bold text-[#0D3A85]">1. Agente (W3C Agent)</div>
                  <div className="font-bold text-sm text-[#1A1A1A]">Quem realizou a ação</div>
                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed">
                    Identifica a pessoa física ou agente de software autônomo (pesquisador, curador institucional, cidadão ou rotina de interoperabilidade).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs space-y-2">
                  <div className="text-[10px] uppercase font-mono font-bold text-[#E8490A]">2. Atividade (W3C Activity)</div>
                  <div className="font-bold text-sm text-[#1A1A1A]">Operação realizada</div>
                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed">
                    A transformação executada (tag_created, match_found, relation_validated, version_published) com carimbo de tempo inviolável.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-black/[0.08] shadow-2xs space-y-2">
                  <div className="text-[10px] uppercase font-mono font-bold text-[#059669]">3. Entidade (W3C Entity)</div>
                  <div className="font-bold text-sm text-[#1A1A1A]">O que foi gerado</div>
                  <p className="text-xs text-[#1A1A1A]/70 leading-relaxed">
                    O artefato cultural, tag ou relação ontológica com fingerprint SHA-256 e versão estrita resultante da atividade.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 7: LOG DE SEGURANÇA (SEÇÃO 14) */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Lock size={16} className="text-[#0D3A85]" /> Log de Segurança Operacional (Segregado)
                </h2>
                <p className="text-xs text-[#1A1A1A]/55 mt-0.5">
                  Registro isolado do log de negócio: autenticações, privilégios, exportações e acessos de chaves
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/[0.05] text-[#1A1A1A]">
                {securityLogs.length} Registros Operacionais
              </span>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs">
              {loadingSecurity ? (
                <div className="p-16 text-center">
                  <div className="w-8 h-8 border-2 border-[#0D3A85] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-[#1A1A1A]/50">Carregando logs de segurança...</p>
                </div>
              ) : securityLogs.length === 0 ? (
                <div className="p-16 text-center">
                  <Lock size={32} className="mx-auto text-[#1A1A1A]/20 mb-3" />
                  <p className="text-sm text-[#1A1A1A]/50">Nenhum evento de segurança registrado no período.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-black/[0.03] border-b border-black/[0.08] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                        <th className="p-3.5">Data / Hora</th>
                        <th className="p-3.5">Tipo de Evento</th>
                        <th className="p-3.5">Ator / Função</th>
                        <th className="p-3.5">Endereço IP</th>
                        <th className="p-3.5">Detalhes da Operação</th>
                        <th className="p-3.5 font-mono">Digest de Segurança (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] font-mono text-[11px]">
                      {securityLogs.map(log => {
                        const isFailed = log.event_type.includes('failed') || log.event_type.includes('failure');
                        return (
                          <tr key={log.log_id} className="hover:bg-black/[0.02] transition-colors">
                            <td className="p-3.5 text-[#1A1A1A]/80 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  isFailed
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {log.event_type}
                              </span>
                            </td>
                            <td className="p-3.5 font-sans">
                              <div className="font-bold text-[#1A1A1A]">{log.actor_id}</div>
                              <span className="text-[9px] text-[#1A1A1A]/50 uppercase font-mono font-bold">{log.actor_role}</span>
                            </td>
                            <td className="p-3.5 text-[#1A1A1A]/80">{log.ip_address || '—'}</td>
                            <td className="p-3.5 font-sans text-[#1A1A1A]/70 max-w-[240px] truncate">
                              {JSON.stringify(log.details)}
                            </td>
                            <td className="p-3.5 text-[#1A1A1A]/50 truncate max-w-[150px]">{log.log_digest}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 8: EXPORTAÇÕES AUDITADAS (SEÇÃO 16) */}
        {activeTab === 'exportacoes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Download size={16} className="text-[#E8490A]" /> Pacotes de Exportação Auditados
                </h2>
                <p className="text-xs text-[#1A1A1A]/60 mt-1">
                  Exportação canônica em JSON-LD com emissão de dataset digest SHA-256 e registro em Security Log
                </p>
              </div>

              <button
                onClick={handleExportAuditedPackage}
                disabled={exporting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(232,73,10,0.25)] disabled:opacity-50"
              >
                <Download size={13} className={exporting ? 'animate-bounce' : ''} />
                {exporting ? 'Gerando Pacote...' : 'Exportar Pacote Canônico (JSON-LD)'}
              </button>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-black/[0.08] bg-black/[0.02]">
                <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                  Histórico de Pacotes Exportados
                </h3>
              </div>

              {exportsList.length === 0 ? (
                <div className="p-16 text-center">
                  <Download size={32} className="mx-auto text-[#1A1A1A]/20 mb-3" />
                  <p className="text-sm text-[#1A1A1A]/50">Nenhuma exportação auditada registrada até o momento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-black/[0.03] border-b border-black/[0.08] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold">
                        <th className="p-3.5">ID Exportação</th>
                        <th className="p-3.5">Data / Hora</th>
                        <th className="p-3.5">Ator Responsável</th>
                        <th className="p-3.5">Formato</th>
                        <th className="p-3.5">Qtd. Registros</th>
                        <th className="p-3.5 font-mono">Dataset Digest (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] font-mono text-[11px]">
                      {exportsList.map(exp => (
                        <tr key={exp.export_id} className="hover:bg-black/[0.02] transition-colors">
                          <td className="p-3.5 font-bold text-[#1A1A1A]">{exp.export_id}</td>
                          <td className="p-3.5 text-[#1A1A1A]/80">{new Date(exp.timestamp).toLocaleString('pt-BR')}</td>
                          <td className="p-3.5 font-sans">
                            <span className="text-[#1A1A1A] font-bold">{exp.actor_id}</span>
                            <span className="text-[9px] text-[#1A1A1A]/50 block font-mono font-bold">({exp.actor_role})</span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-black/[0.06] text-[#1A1A1A] font-bold">
                              {exp.format}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#059669] font-bold">{exp.record_count}</td>
                          <td className="p-3.5 text-[#1A1A1A]/70 truncate max-w-[200px]" title={exp.dataset_digest}>
                            {exp.dataset_digest}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE INSPEÇÃO CRIPTOGRÁFICA DO EVENTO (AS 12 PERGUNTAS ESSENCIAIS) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF9F5] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-black/15 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header do Modal */}
            <div className="p-5 md:p-6 border-b border-black/[0.08] flex items-center justify-between bg-white">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8490A] font-bold block">
                  Trilha de Proveniência Verificável — Inspeção Criptográfica
                </span>
                <h3 className="text-xl font-normal serif-title text-[#1A1A1A] mt-0.5 flex items-center gap-2">
                  <span>{selectedEvent.event_id}</span>
                  <span className="text-xs font-mono font-bold bg-[#E8490A]/10 text-[#E8490A] px-2.5 py-0.5 rounded-full border border-[#E8490A]/20">
                    {selectedEvent.event_type}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/10 text-[#1A1A1A] flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 text-xs font-sans">
              {/* AS 12 RESPOSTAS DA AUDITORIA */}
              <div className="p-5 rounded-2xl bg-white border border-black/[0.08] space-y-4 shadow-2xs">
                <div className="border-b border-black/[0.06] pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] font-mono">
                    Respostas da Auditoria (12 Dimensões de Verificabilidade)
                  </h4>
                  <span className="text-[10px] text-[#059669] font-bold font-mono">
                    PADRÃO PROV + RFC 8785
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* 1. Quem realizou a ação */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">1. Quem Realizou a Ação</span>
                    <div className="font-bold text-[#1A1A1A]">{selectedEvent.actor_id}</div>
                    <span className="text-[10px] text-[#1A1A1A]/60 font-mono">Papel: {selectedEvent.actor_role}</span>
                  </div>

                  {/* 2. O que foi alterado */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">2. O Que Foi Alterado</span>
                    <div className="font-bold text-[#1A1A1A]">{selectedEvent.metadata?.label || selectedEvent.entity_id}</div>
                    <span className="text-[10px] text-[#1A1A1A]/60 font-mono">Tipo: {selectedEvent.entity_type}</span>
                  </div>

                  {/* 3. Quando ocorreu */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">3. Quando Ocorreu</span>
                    <div className="font-bold text-[#1A1A1A]">{new Date(selectedEvent.timestamp).toLocaleString('pt-BR')}</div>
                    <span className="text-[10px] text-[#1A1A1A]/50 font-mono truncate block">{selectedEvent.timestamp}</span>
                  </div>

                  {/* 4. Estado anterior */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">4. Estado Anterior</span>
                    <div className="font-bold font-mono text-[#0D3A85]">Versão {selectedEvent.previous_version}</div>
                    <span className="text-[10px] text-[#1A1A1A]/50 font-mono truncate block">
                      Digest: {selectedEvent.previous_digest ? selectedEvent.previous_digest.slice(0, 16) + '…' : 'Gênese (null)'}
                    </span>
                  </div>

                  {/* 5. Novo estado */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">5. Novo Estado</span>
                    <div className="font-bold font-mono text-[#059669]">Versão {selectedEvent.new_version}</div>
                    <span className="text-[10px] text-[#059669] font-mono truncate block">
                      Digest: {selectedEvent.new_digest.slice(0, 16)}…
                    </span>
                  </div>

                  {/* 6. Origem da informação */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">6. Origem da Informação</span>
                    <div className="font-bold text-[#1A1A1A]">{selectedEvent.source}</div>
                    <span className="text-[10px] text-[#1A1A1A]/60">Proveniência institucional</span>
                  </div>

                  {/* 7. Operação que produziu */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">7. Operação / Motivação</span>
                    <div className="font-bold text-[#E8490A]">{selectedEvent.event_type}</div>
                    <p className="text-[10px] text-[#1A1A1A]/70 line-clamp-2">{selectedEvent.reason || 'Alteração estruturada de atributos.'}</p>
                  </div>

                  {/* 8. Versão criada */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">8. Versão Criada</span>
                    <div className="font-bold text-[#059669]">V{selectedEvent.new_version}</div>
                    <span className="text-[10px] text-[#1A1A1A]/60 font-mono">Incremento monotônico</span>
                  </div>

                  {/* 9. Digest anterior */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">9. Digest Anterior (Hash Chain)</span>
                    <div className="font-mono text-[10px] text-[#1A1A1A]/80 truncate">
                      {selectedEvent.previous_event_digest ? selectedEvent.previous_event_digest.slice(0, 18) + '…' : 'Gênese (null)'}
                    </div>
                    <span className="text-[10px] text-[#1A1A1A]/50">Elo predecessor</span>
                  </div>

                  {/* 10. Novo digest */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">10. Novo Digest (Event Digest)</span>
                    <div className="font-mono text-[10px] text-[#059669] font-bold truncate">
                      {selectedEvent.event_digest.slice(0, 18)}…
                    </div>
                    <span className="text-[10px] text-[#1A1A1A]/50">SHA-256 canônico</span>
                  </div>

                  {/* 11. Entidades afetadas */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">11. Entidades Afetadas</span>
                    <div className="font-bold text-[#1A1A1A] truncate">{selectedEvent.entity_id}</div>
                    {selectedEvent.metadata?.target_entity && (
                      <span className="text-[10px] text-[#E8490A] font-mono block">→ {selectedEvent.metadata.target_entity}</span>
                    )}
                  </div>

                  {/* 12. Validação / Situação */}
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.06] space-y-1">
                    <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase font-mono block">12. Situação Formal</span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800">
                      {selectedEvent.metadata?.status || 'VALIDATED'}
                    </span>
                    <span className="text-[10px] text-[#1A1A1A]/50 block">Auditado e imutável</span>
                  </div>
                </div>
              </div>

              {/* Encadeamento Criptográfico (Hash Chain) */}
              <div className="p-5 rounded-2xl bg-white border border-black/[0.08] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/60 font-mono">
                    Encadeamento da Hash Chain (SHA-256 256-bit)
                  </span>
                  <button
                    onClick={() => copyText(selectedEvent.event_digest, setCopiedDigest)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#E8490A] hover:underline"
                  >
                    {copiedDigest ? <Check size={12} /> : <Copy size={12} />}
                    {copiedDigest ? 'Copiado!' : 'Copiar Event Digest'}
                  </button>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-black/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-[9px] font-bold uppercase">Previous Event Digest:</span>
                      <span className="text-[#1A1A1A]/80 select-all break-all">
                        {selectedEvent.previous_event_digest || 'null (Gênese da Trilha de Proveniência)'}
                      </span>
                    </div>
                    {selectedEvent.previous_event_digest && (
                      <button
                        onClick={() => copyText(selectedEvent.previous_event_digest!, setCopiedPrevDigest)}
                        className="text-[10px] text-[#1A1A1A]/60 hover:text-[#E8490A] ml-2 shrink-0"
                      >
                        {copiedPrevDigest ? 'OK' : 'Copiar'}
                      </button>
                    )}
                  </div>

                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-300">
                    <span className="text-emerald-800 block text-[9px] font-bold uppercase">Current Event Digest (Hash deste Elo):</span>
                    <span className="text-emerald-900 font-bold select-all break-all">
                      {selectedEvent.event_digest}
                    </span>
                  </div>

                  <div className="bg-[#FAF9F5] p-2.5 rounded-xl border border-black/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-[#1A1A1A]/40 block text-[9px] font-bold uppercase">RFC 8785 Payload Digest:</span>
                      <span className="text-[#0D3A85] select-all break-all font-bold">{selectedEvent.payload_digest}</span>
                    </div>
                    <button
                      onClick={() => copyText(selectedEvent.payload_digest, setCopiedPayloadDigest)}
                      className="text-[10px] text-[#1A1A1A]/60 hover:text-[#E8490A] ml-2 shrink-0"
                    >
                      {copiedPayloadDigest ? 'OK' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payload Canônico em JSON com fundo claro e alto contraste */}
              <div className="p-5 rounded-2xl bg-white border border-black/[0.08] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/60 font-mono block">
                    Payload Canônico Completo (JSON Determinístico RFC 8785)
                  </span>
                  <button
                    onClick={() => copyText(JSON.stringify(selectedEvent, null, 2), setCopiedJson)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#E8490A] hover:underline"
                  >
                    {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                    {copiedJson ? 'Copiado!' : 'Copiar JSON Completo'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#FAF9F5] border border-black/15 text-[#1A1A1A] font-mono text-[11px] overflow-x-auto select-all max-h-56 shadow-inner leading-relaxed">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-black/[0.08] bg-white flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2.5 rounded-xl bg-[#E8490A] text-white text-xs font-bold transition-all shadow-xs hover:bg-[#E8490A]/90"
              >
                Fechar Inspeção
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
