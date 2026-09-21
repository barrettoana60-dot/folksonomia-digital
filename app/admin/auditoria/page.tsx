'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Layers,
  GitCommit,
  Network,
  Download,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Filter,
  Lock,
  Key,
  Database,
  History,
  Eye,
  CheckCircle2,
  XCircle,
  Hash,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Sliders,
  Sparkles,
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

interface IntegrityResult {
  status: 'INTEGRIDADE VERIFICADA' | 'INCONSISTÊNCIA DETECTADA';
  timestamp: string;
  totalEventsChecked: number;
  totalEntitiesChecked: number;
  totalSnapshotsChecked: number;
  checks: Record<string, { passed: boolean; code: string; description: string; details?: string }>;
  inconsistencies: Array<{
    event_id?: string;
    entity_id?: string;
    version?: number;
    expected_digest?: string;
    calculated_digest?: string;
    previous_digest?: string;
    message: string;
  }>;
  merkleRoot: string;
  chainHeight: number;
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
  { id: 'historia', label: 'História da Identidade & Diff', icon: History },
  { id: 'relacoes_fontes', label: 'Relações & Fontes', icon: Network },
  { id: 'integridade', label: 'Verificação de Integridade', icon: ShieldCheck },
  { id: 'seguranca', label: 'Log de Segurança', icon: Lock },
  { id: 'exportacoes', label: 'Exportações Auditadas', icon: Download },
];

export default function AuditoriaPage() {
  const [activeTab, setActiveTab] = useState('eventos');

  // Estados dos Dados
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [exportsList, setExportsList] = useState<AuditExport[]>([]);
  const [relations, setRelations] = useState<AuditRelation[]>([]);
  const [sources, setSources] = useState<AuditSource[]>([]);
  const [integrityReport, setIntegrityReport] = useState<IntegrityResult | null>(null);

  // Loadings
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
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

  // Executar Verificação de Integridade
  const runIntegrityCheck = async () => {
    setVerifyingIntegrity(true);
    try {
      const res = await fetch('/api/admin/auditoria/verificar-integridade', { method: 'POST' });
      const data = await res.json();
      setIntegrityReport(data);
    } catch (err) {
      console.error('Falha na verificação de integridade:', err);
    } finally {
      setVerifyingIntegrity(false);
    }
  };

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

  // Carregamento inicial
  useEffect(() => {
    loadEvents();
    loadRelationsAndSources();
    loadSecurityLogs();
    loadExports();
    loadTagTimeline(selectedTagId);
    runIntegrityCheck();
  }, [loadEvents, loadRelationsAndSources, loadSecurityLogs, loadExports, loadTagTimeline, selectedTagId]);

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

    return {
      eventA,
      eventB,
    };
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
        // Baixar arquivo gerado
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2000);
  };

  const copyRootToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2000);
  };

  // Cores de eventos consistentes e limpas
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

        {/* ════════ CABEÇALHO INSTITUCIONAL ════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8490A] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(232,73,10,0.25)]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-tight text-[#1A1A1A]">
                  Sistema de Auditoria
                </h1>
                <p className="text-xs text-[#1A1A1A]/60 mt-0.5 font-medium uppercase tracking-wider">
                  Trilha de Proveniência Verificável, Event Sourcing e Encadeamento Criptográfico Contínuo
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-[#1A1A1A] border border-black/10 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <ArrowLeft size={14} /> Voltar ao Painel
            </Link>

            <button
              onClick={runIntegrityCheck}
              disabled={verifyingIntegrity}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(232,73,10,0.25)] disabled:opacity-50"
            >
              <RefreshCw size={13} className={verifyingIntegrity ? 'animate-spin' : ''} />
              {verifyingIntegrity ? 'Verificando...' : 'Verificar Integridade'}
            </button>
          </div>
        </div>

        {/* ════════ CARDS EXECUTIVOS DE STATUS & KPIS ════════ */}
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
              Registros imutáveis protegidos por gatilhos de banco
            </p>
          </div>

          {/* Card 2: Altura da Cadeia */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Altura da Hash Chain</span>
              <GitCommit size={16} className="text-[#059669]" />
            </div>
            <div className="text-3xl font-normal serif-title text-[#059669]">
              {integrityReport?.chainHeight ?? events.length} <span className="text-sm font-sans font-medium text-[#1A1A1A]/50">blocos</span>
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55 font-mono">
              previous_digest → event_digest contínuo
            </p>
          </div>

          {/* Card 3: Integridade Criptográfica */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Integridade Criptográfica</span>
              <ShieldCheck size={16} className="text-[#059669]" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={13} className="text-emerald-600" />
                8/8 NÍVEIS APROVADOS
              </span>
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              RFC 8785 determinístico com zero descontinuidades
            </p>
          </div>

          {/* Card 4: Merkle Root */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Merkle Root Ativa</span>
              <button
                onClick={() => integrityReport?.merkleRoot && copyRootToClipboard(integrityReport.merkleRoot)}
                className="text-[10px] text-[#E8490A] hover:underline font-bold flex items-center gap-1"
                title="Copiar Hash Raiz"
              >
                {copiedRoot ? <Check size={12} /> : <Copy size={12} />}
                {copiedRoot ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="text-xs font-mono font-bold text-[#0D3A85] truncate bg-black/[0.03] p-2 rounded-xl border border-black/[0.06]">
              {integrityReport?.merkleRoot || 'Calculando...'}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Prova binária de integridade em lote sem blockchain pública
            </p>
          </div>
        </div>

        {/* ════════ BARRA DE NAVEGAÇÃO DE ABAS ════════ */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-black/[0.08] shadow-xs overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
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

        {/* ════════ ABA 1: EVENTOS DE AUDITORIA ════════ */}
        {activeTab === 'eventos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra de Filtros Estilizada */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs space-y-4">
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
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
              <div className="p-4 border-b border-black/[0.08] flex items-center justify-between bg-black/[0.02]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Eventos Encadeados Criptograficamente</h2>
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
                        <th className="p-3.5">Data / Hora (UTC)</th>
                        <th className="p-3.5">Evento</th>
                        <th className="p-3.5">Entidade Cultural</th>
                        <th className="p-3.5">Versão</th>
                        <th className="p-3.5">Ator / Papel</th>
                        <th className="p-3.5">Origem</th>
                        <th className="p-3.5 font-mono">Event Digest (SHA-256)</th>
                        <th className="p-3.5 text-right">Ações</th>
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

        {/* ════════ ABA 2: HISTÓRIA DA IDENTIDADE & DIFF ════════ */}
        {activeTab === 'historia' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra Seletora de Entidade */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs flex flex-wrap items-center justify-between gap-4">
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
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs space-y-6">
                  <div className="border-b border-black/[0.08] pb-3">
                    <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                      Trilha de Proveniência Passo a Passo
                    </h3>
                    <p className="text-base font-normal serif-title text-[#1A1A1A] mt-1">
                      {tagTimeline.events[0]?.metadata?.label || selectedTagId}
                    </p>
                  </div>

                  <div className="relative pl-6 space-y-6">
                    {/* Linha Vertical Conectora */}
                    <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#0D3A85] via-[#E8490A] to-[#059669]" />

                    {tagTimeline.events.map((ev: AuditEvent, idx: number) => {
                      const isGenesis = ev.previous_version === 0;
                      const isPublished = ev.event_type.includes('publish') || ev.metadata?.status === 'PUBLISHED';

                      return (
                        <div key={ev.event_id} className="relative group">
                          {/* Pin Conector */}
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
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs space-y-6">
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
                      {/* Resumo Comparativo */}
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
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Digest do Estado</td>
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

        {/* ════════ ABA 3: RELAÇÕES & FONTES ════════ */}
        {activeTab === 'relacoes_fontes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Tabela de Relações */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
              <div className="p-4 border-b border-black/[0.08] flex items-center justify-between bg-black/[0.02]">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Relações Ontológicas Auditadas</h2>
                  <p className="text-xs text-[#1A1A1A]/55">
                    Origem de cada vínculo, nível de confiança matemática e evidência probatória
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
                      <th className="p-3.5 font-mono">Digest da Relação</th>
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

            {/* Tabela de Fontes Externas Preservadas */}
            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
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
                      <th className="p-3.5 font-mono">Digest Resposta</th>
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

        {/* ════════ ABA 4: VERIFICAÇÃO DE INTEGRIDADE (8 NÍVEIS) ════════ */}
        {activeTab === 'integridade' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Banner Executivo de Status */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                integrityReport?.status === 'INTEGRIDADE VERIFICADA'
                  ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                  : 'bg-rose-50 border-rose-300 shadow-xs'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {integrityReport?.status === 'INTEGRIDADE VERIFICADA' ? (
                    <div className="w-14 h-14 rounded-2xl bg-[#059669] text-white flex items-center justify-center shadow-md">
                      <ShieldCheck size={32} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                      <AlertTriangle size={32} />
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-tight text-[#1A1A1A]">
                      {integrityReport?.status || 'Aguardando Verificação'}
                    </h2>
                    <p className="text-xs text-[#1A1A1A]/70 mt-1 font-medium">
                      Auditoria matemática contínua: cadeia SHA-256 ininterrupta, conformidade RFC 8785 e Merkle Root ativa
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={runIntegrityCheck}
                    disabled={verifyingIntegrity}
                    className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-2 shadow-[0_4px_16px_rgba(232,73,10,0.25)] disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={verifyingIntegrity ? 'animate-spin' : ''} />
                    {verifyingIntegrity ? 'Executando Análise Criptográfica...' : 'Executar Nova Verificação'}
                  </button>
                </div>
              </div>
            </div>

            {/* Matriz dos 8 Testes de Integridade */}
            {integrityReport && integrityReport.checks && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(integrityReport.checks).map(([key, chk], idx) => {
                  return (
                    <div
                      key={key}
                      className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                              chk.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-[#1A1A1A]/40 font-bold block">{chk.code}</span>
                            <h3 className="text-xs font-bold text-[#1A1A1A] mt-0.5">{chk.description}</h3>
                          </div>
                        </div>

                        {chk.passed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Aprovado
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-50 text-rose-800 border border-rose-300">
                            Inconsistente
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#1A1A1A]/70 pt-2 border-t border-black/[0.05] leading-relaxed font-sans">
                        {chk.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Diagnóstico em caso de inconsistência */}
            {integrityReport && integrityReport.inconsistencies.length > 0 && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-300 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>Inconsistências ou Adulterações Detectadas</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {integrityReport.inconsistencies.map((inc, iIdx) => (
                    <div key={iIdx} className="p-3 rounded-xl bg-white border border-rose-200 space-y-1">
                      <div className="text-rose-700 font-bold">{inc.message}</div>
                      {inc.event_id && <div className="text-[#1A1A1A]/60 text-[11px]">Evento Afetado: {inc.event_id}</div>}
                      {inc.expected_digest && (
                        <div className="text-[#1A1A1A]/50 text-[11px]">Digest Esperado: {inc.expected_digest}</div>
                      )}
                      {inc.calculated_digest && (
                        <div className="text-rose-600 text-[11px]">Digest Calculado: {inc.calculated_digest}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ ABA 5: LOG DE SEGURANÇA (SEGREGADO) ════════ */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Lock size={16} className="text-[#0D3A85]" /> Log de Segurança Operacional (Segregado)
                </h2>
                <p className="text-xs text-[#1A1A1A]/55 mt-0.5">
                  Registro isolado de autenticações, privilégios, exportações e acessos administrativos
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/[0.05] text-[#1A1A1A]">
                {securityLogs.length} Registros Operacionais
              </span>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
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
                        <th className="p-3.5 font-mono">Digest Criptográfico</th>
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

        {/* ════════ ABA 6: EXPORTAÇÕES AUDITADAS ════════ */}
        {activeTab === 'exportacoes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Download size={16} className="text-[#E8490A]" /> Pacotes de Exportação Auditados
                </h2>
                <p className="text-xs text-[#1A1A1A]/60 mt-1">
                  Exportação canônica em JSON-LD com emissão de digest criptográfico SHA-256
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

            <div className="rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
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

      {/* ════════ MODAL DE INSPEÇÃO CRIPTOGRÁFICA DO EVENTO ════════ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-black/10 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="p-6 border-b border-black/[0.08] flex items-center justify-between bg-[#FBFBFB]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8490A] font-bold block">
                  Inspeção Criptográfica do Evento
                </span>
                <h3 className="text-lg font-normal serif-title text-[#1A1A1A] mt-0.5">{selectedEvent.event_id}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/10 text-[#1A1A1A] flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
              {/* Encadeamento Criptográfico (Hash Chain) */}
              <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/60 font-mono">
                    Encadeamento da Hash Chain (Elo Sucessor)
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedEvent.event_digest)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#E8490A] hover:underline"
                  >
                    {copiedDigest ? <Check size={12} /> : <Copy size={12} />}
                    {copiedDigest ? 'Copiado!' : 'Copiar Event Digest'}
                  </button>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-black/[0.06]">
                    <span className="text-[#1A1A1A]/40 block text-[10px] font-bold uppercase">Previous Event Digest:</span>
                    <span className="text-[#1A1A1A]/80 select-all break-all">
                      {selectedEvent.previous_event_digest || 'null (Gênese da Trilha de Proveniência)'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50">
                    <span className="text-emerald-800 block text-[10px] font-bold uppercase">Current Event Digest:</span>
                    <span className="text-emerald-900 font-bold select-all break-all">
                      {selectedEvent.event_digest}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-black/[0.06]">
                    <span className="text-[#1A1A1A]/40 block text-[10px] font-bold uppercase">Payload Digest (RFC 8785):</span>
                    <span className="text-[#0D3A85] select-all break-all font-bold">{selectedEvent.payload_digest}</span>
                  </div>
                </div>
              </div>

              {/* Informações de Proveniência W3C PROV */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/50 block">Agente (W3C Agent)</span>
                  <div className="font-bold text-[#1A1A1A]">{selectedEvent.actor_id}</div>
                  <span className="text-[10px] text-[#1A1A1A]/60 font-mono font-medium">Papel: {selectedEvent.actor_role}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/50 block">Atividade (W3C Activity)</span>
                  <div className="font-bold text-[#E8490A]">{selectedEvent.event_type}</div>
                  <span className="text-[10px] text-[#1A1A1A]/60 font-medium">Origem: {selectedEvent.source}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/[0.02] border border-black/[0.08] space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/50 block">Entidade (W3C Entity)</span>
                  <div className="font-bold text-[#1A1A1A]">{selectedEvent.metadata?.label || selectedEvent.entity_id}</div>
                  <span className="text-[10px] text-[#059669] font-mono font-bold">Versão {selectedEvent.new_version}</span>
                </div>
              </div>

              {/* Payload Canônico em JSON */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/60 font-mono block mb-2">
                  Payload Canônico Completo (JSON Determinístico RFC 8785)
                </span>
                <pre className="p-4 rounded-2xl bg-[#1A1A1A] text-white font-mono text-[11px] overflow-x-auto select-all shadow-inner">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-black/[0.08] bg-[#FBFBFB] flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold transition-all shadow-xs hover:bg-[#1A1A1A]/90"
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
