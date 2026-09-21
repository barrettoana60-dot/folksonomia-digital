'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  Search,
  RotateCcw,
  AlertTriangle,
  Layers,
  GitCommit,
  Network,
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
  X,
  ShieldCheck,
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

interface AuditTagOption {
  id: string;
  label: string;
  status?: string;
  version?: number;
  eixo?: string;
  updated_at?: string;
}

interface IntegrityResult {
  status: 'INTEGRIDADE VERIFICADA' | 'INCONSISTÊNCIA DETECTADA';
  timestamp: string;
  totalEventsChecked: number;
  totalEntitiesChecked: number;
  totalSnapshotsChecked: number;
  chainHeight: number;
  merkleRoot: string;
  checks: Record<string, { passed: boolean; description: string; details?: string }>;
  inconsistencies: Array<{
    event_id?: string;
    entity_id?: string;
    version?: number;
    expected_digest?: string;
    calculated_digest?: string;
    previous_digest?: string;
    message: string;
  }>;
}

const TABS = [
  { id: 'eventos', label: 'Eventos de Auditoria', icon: Clock },
  { id: 'historia', label: 'História das Tags & Versões', icon: History },
  { id: 'contribuicoes', label: 'Contribuições de Usuários', icon: Layers },
  { id: 'relacoes', label: 'Relações Ontológicas', icon: Network },
  { id: 'fontes', label: 'Fontes Externas & Acervos', icon: Globe },
  { id: 'seguranca', label: 'Log de Segurança', icon: Lock },
  { id: 'integridade', label: 'Integridade', icon: ShieldCheck },
];

export default function AuditoriaPage() {
  const [activeTab, setActiveTab] = useState('eventos');

  // Estados dos Dados
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [contributions, setContributions] = useState<AuditContribution[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [relations, setRelations] = useState<AuditRelation[]>([]);
  const [sources, setSources] = useState<AuditSource[]>([]);
  const [merkleRoot, setMerkleRoot] = useState<string>('');
  const [tagOptions, setTagOptions] = useState<AuditTagOption[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);

  // Loadings
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [loadingIntegrity, setLoadingIntegrity] = useState(false);

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

  const loadTagOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auditoria/tags');
      const data = await res.json();
      if (Array.isArray(data?.tags)) setTagOptions(data.tags);
    } catch (err) {
      console.error('Falha ao carregar catálogo de tags:', err);
    }
  }, []);

  const verifyIntegrity = useCallback(async () => {
    setLoadingIntegrity(true);
    try {
      const res = await fetch('/api/admin/auditoria/verificar-integridade');
      const data = await res.json();
      if (data && data.status) setIntegrity(data);
    } catch (err) {
      console.error('Falha ao verificar integridade:', err);
    } finally {
      setLoadingIntegrity(false);
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
    loadMerkle();
    loadTagOptions();
    loadTagTimeline(selectedTagId);
    verifyIntegrity();
  }, [loadEvents, loadContributions, loadRelationsAndSources, loadSecurityLogs, loadMerkle, loadTagOptions, loadTagTimeline, verifyIntegrity, selectedTagId]);

  // Lista de tags únicas disponíveis para a timeline
  const uniqueEntities = useMemo(() => {
    const map = new Map<string, string>();
    tagOptions.forEach(tag => map.set(tag.id, tag.label));
    events.forEach(e => {
      const label = e.metadata?.label || e.entity_id;
      map.set(e.entity_id, label);
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [events, tagOptions]);

  useEffect(() => {
    if (!selectedTagId && uniqueEntities[0]) setSelectedTagId(uniqueEntities[0].id);
  }, [selectedTagId, uniqueEntities]);

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
        return 'bg-blue-50 text-[#0D3A85] border-blue-200';
      case 'contribution_added':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'match_found':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'relation_created':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'relation_validated':
        return 'bg-emerald-50 text-[#059669] border-emerald-200';
      case 'version_published':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'REVOKE':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ARCHIVE':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const humanizeActor = (actor: string) => {
    const labels: Record<string, string> = {
      adm_root: 'Administração central',
      adm_comite_cientifico: 'Comitê científico',
      usr_comunidade_01: 'Comunidade participante',
      usr_curador_institucional: 'Curadoria institucional',
      usr_pesquisador_nordeste: 'Pesquisa colaborativa',
      sys_interop_daemon: 'Sistema de interoperabilidade',
    };
    return labels[actor] || actor.replace(/^usr_|^adm_|^sys_/, '').replace(/_/g, ' ');
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
                loadMerkle();
                loadTagOptions();
                loadTagTimeline(selectedTagId);
                verifyIntegrity();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0D3A85] text-white hover:bg-[#0D3A85]/90 transition-all flex items-center gap-1.5 shadow-2xs"
              title="Sincronizar trilha de auditoria"
            >
              <RotateCcw size={13} /> Sincronizar Trilha
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
              {merkleRoot || 'Calculando raiz SHA-256...'}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Prova criptográfica em árvore binária para lotes
            </p>
          </div>

          {/* Card 4: Tags com Trilha Completa */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2">
            <div className="flex items-center justify-between text-[#1A1A1A]/50">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tags com Trilha Completa</span>
              <Layers size={16} className="text-[#E8490A]" />
            </div>
            <div className="text-3xl font-normal serif-title text-[#E8490A]">
              {uniqueEntities.length}
            </div>
            <p className="text-[11px] text-[#1A1A1A]/55">
              Entidades culturais catalogadas com proveniência total
            </p>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE ABAS SÓBRIA */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 border border-black/[0.08] shadow-2xs overflow-x-auto no-scrollbar">
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
                    placeholder="Buscar termo, hash, razão..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 focus:border-[#E8490A] focus:outline-none shadow-2xs"
                  />
                </div>

                {/* Filtro de Entidade (TODAS AS TAGS) */}
                <select
                  value={filterEntity}
                  onChange={e => setFilterEntity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] focus:border-[#E8490A] focus:outline-none shadow-2xs font-medium"
                >
                  <option value="">Todas as Tags ({uniqueEntities.length})</option>
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

        {/* ABA 2: HISTÓRIA DAS TAGS & VERSÕES (100% LIVRE DE CÓDIGO - COM TODAS AS 34 TAGS) */}
        {activeTab === 'historia' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Seletor de Entidade Cultural com TODAS AS 34 TAGS */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D3A85] text-white flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Linha Temporal da Identidade Cultural</h2>
                  <p className="text-xs text-[#1A1A1A]/60">Reconstituição narrativa da evolução histórica ({uniqueEntities.length} tags catalogadas)</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-[#1A1A1A]/70 uppercase tracking-wider">Selecione a Tag:</label>
                <select
                  value={selectedTagId}
                  onChange={e => setSelectedTagId(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-xl bg-white border border-black/15 text-[#1A1A1A] focus:border-[#E8490A] outline-none font-bold shadow-2xs max-w-xs"
                >
                  {uniqueEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.label}</option>
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
                {/* Linha Temporal Visual (5 colunas) - 100% SEM CÓDIGO */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-6">
                  <div className="border-b border-black/[0.08] pb-3">
                    <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                      Trilha de Proveniência Passo a Passo
                    </h3>
                    <p className="text-lg font-normal serif-title text-[#1A1A1A] mt-1">
                      {tagTimeline.events[0]?.metadata?.label || selectedTagId}
                    </p>
                    <span className="text-[11px] text-[#1A1A1A]/60">
                      Eixo: {tagTimeline.events[0]?.metadata?.eixo || 'Patrimônio Cultural'}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6">
                    <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#0D3A85] via-[#E8490A] to-[#059669]" />

                    {tagTimeline.events.map((ev: AuditEvent) => {
                      const isGenesis = ev.previous_version === 0;
                      const isPublished = ev.event_type.includes('publish') || ev.metadata?.status === 'PUBLISHED';

                      // Título humanizado de cada etapa
                      let stageTitle = 'Atualização Registrada';
                      if (ev.event_type === 'tag_created') stageTitle = '1. Tag Criada no Catálogo';
                      else if (ev.event_type === 'contribution_added') stageTitle = '2. Contribuição Comunitária Adicionada';
                      else if (ev.event_type === 'match_found') stageTitle = '3. Correspondência com Acervo Externo';
                      else if (ev.event_type === 'relation_created') stageTitle = '4. Vínculo Ontológico Estabelecido';
                      else if (ev.event_type === 'relation_validated') stageTitle = '5. Validação Colegiada do Comitê';
                      else if (ev.event_type === 'version_published') stageTitle = '6. Publicada na Interoperabilidade';

                      return (
                        <div key={ev.event_id} className="relative group">
                          <div
                            className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                              isPublished
                                ? 'border-[#059669] bg-[#059669]'
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
                              <span className="text-[10px] text-[#1A1A1A]/55 font-medium">
                                {new Date(ev.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-[#1A1A1A]">
                              {stageTitle}
                            </div>

                            <p className="text-[11px] text-[#1A1A1A]/75 leading-relaxed font-sans">
                              {ev.reason || 'Registro formal de evolução da identidade cultural.'}
                            </p>

                            <div className="pt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#1A1A1A]/55 border-t border-black/[0.05]">
                              <span>Responsável: <strong className="text-[#1A1A1A]">{humanizeActor(ev.actor_id)}</strong></span>
                              <span>Origem: <strong className="text-[#1A1A1A]">{ev.source.replace(/_/g, ' ')}</strong></span>
                            </div>

                            {ev.metadata?.target_entity && (
                              <div className="text-[10px] text-[#0D3A85] font-semibold">
                                Conectado com: {ev.metadata.target_entity.replace('tag_', '').replace(/_/g, ' ')}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-[#1A1A1A]/55">Situação registrada</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase">
                                {String(ev.metadata?.status || 'VALIDATED').replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comparador de Versões Lado a Lado (7 colunas) - 100% SEM CÓDIGO */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-6">
                  <div className="border-b border-black/[0.08] pb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-[#1A1A1A]/50 font-bold">
                        Comparador Canônico de Versões
                      </h3>
                      <p className="text-base font-normal serif-title text-[#1A1A1A] mt-0.5">
                        Evolução entre Versão Anterior e Versão Atual
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
                            SHA-256: {versionComparison.eventA.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-[#1A1A1A]/70">
                            Responsável: {versionComparison.eventA.actor_id} ({versionComparison.eventA.actor_role})
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
                            SHA-256: {versionComparison.eventB.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-emerald-800">
                            Responsável: {versionComparison.eventB.actor_id} ({versionComparison.eventB.actor_role})
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Comparação Narrativa (sem código) */}
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden text-xs bg-white shadow-2xs">
                        <table className="w-full text-left">
                          <thead className="bg-black/[0.03] text-[10px] uppercase tracking-wider text-[#1A1A1A]/60 font-bold border-b border-black/[0.08]">
                            <tr>
                              <th className="p-3">Atributo</th>
                              <th className="p-3">Versão {versionA}</th>
                              <th className="p-3">Versão {versionB}</th>
                              <th className="p-3">Situação da Alteração</th>
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
                              <td className="p-3 font-semibold text-[#1A1A1A]/60">Entidade Conectada</td>
                              <td className="p-3 text-[#1A1A1A]/40">
                                {versionComparison.eventA.metadata?.target_entity ? versionComparison.eventA.metadata.target_entity.replace('tag_', '') : 'Nenhuma'}
                              </td>
                              <td className="p-3 font-bold text-[#1A1A1A]">
                                {versionComparison.eventB.metadata?.target_entity ? versionComparison.eventB.metadata.target_entity.replace('tag_', '') : 'Nenhuma'}
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

        {/* ABA 3: CONTRIBUIÇÕES DE USUÁRIOS (SEÇÃO 8) */}
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
                {contributions.length} Contribuições Catalogadas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contributions.map(con => (
                <div key={con.contribution_id} className="p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-black/[0.08] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#E8490A] bg-[#E8490A]/10 px-2 py-0.5 rounded-lg border border-[#E8490A]/20">
                        {con.contribution_id}
                      </span>
                      <span className="font-bold text-sm text-[#1A1A1A]">{con.tag_label}</span>
                    </div>

                    <span className="text-[10px] font-mono text-[#059669] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Versão V{con.version}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.05] text-xs text-[#1A1A1A]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 block mb-1">Conteúdo Atual</span>
                    <p className="leading-relaxed font-sans">{con.content}</p>
                  </div>

                  {/* Trilha Histórica Versionada V1 -> V2 */}
                  {con.history && con.history.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 block">
                        Evolução Histórica da Contribuição
                      </span>

                      <div className="space-y-2">
                        {con.history.map((h, hIdx) => (
                          <div key={hIdx} className="p-2.5 rounded-xl bg-white border border-black/[0.06] text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]/60">
                              <span className="font-bold font-mono text-[#0D3A85]">Versão {h.version}</span>
                              <span>{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-[11px] text-[#1A1A1A]/80 italic">&ldquo;{h.content}&rdquo;</p>
                            <div className="text-[9px] font-mono text-[#1A1A1A]/45 truncate pt-0.5">
                              Autor: {h.actor_id} | SHA-256: {h.digest.slice(0, 20)}…
                            </div>
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

        {/* ABA 5: FONTES EXTERNAS & ACERVOS (SEÇÃO 7) */}
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

        {/* ABA DE INTEGRIDADE */}
        {activeTab === 'integridade' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <ShieldCheck size={17} className="text-[#059669]" /> Verificação de Integridade
                </h2>
                <p className="text-xs text-[#1A1A1A]/55 mt-0.5">
                  Confere a continuidade dos eventos, versões, relações, proveniência, snapshots e Merkle Root.
                </p>
              </div>
              <button
                onClick={verifyIntegrity}
                disabled={loadingIntegrity}
                className="px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <ShieldCheck size={14} /> {loadingIntegrity ? 'Verificando...' : 'Verificar integridade'}
              </button>
            </div>

            {integrity && (
              <>
                <div className={`p-5 rounded-2xl border shadow-2xs ${integrity.status === 'INTEGRIDADE VERIFICADA' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-center gap-3">
                    {integrity.status === 'INTEGRIDADE VERIFICADA' ? <CheckCircle2 size={24} className="text-[#059669]" /> : <AlertTriangle size={24} className="text-rose-600" />}
                    <div>
                      <h3 className="text-base font-bold">{integrity.status}</h3>
                      <p className="text-xs text-[#1A1A1A]/60">Última verificação: {new Date(integrity.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    ['Eventos conferidos', integrity.totalEventsChecked],
                    ['Entidades conferidas', integrity.totalEntitiesChecked],
                    ['Snapshots conferidos', integrity.totalSnapshotsChecked],
                    ['Altura da cadeia', integrity.chainHeight],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="p-4 rounded-2xl bg-white/80 border border-black/[0.08] shadow-2xs">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#1A1A1A]/50">{label}</p>
                      <p className="text-2xl serif-title mt-1 text-[#0D3A85]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-black/[0.08] bg-white/90 overflow-hidden shadow-2xs">
                  <div className="p-4 border-b border-black/[0.08]">
                    <h3 className="text-sm font-bold">Camadas verificadas</h3>
                  </div>
                  <div className="divide-y divide-black/[0.05]">
                    {Object.values(integrity.checks).map(check => (
                      <div key={check.description} className="p-4 flex items-start gap-3">
                        {check.passed ? <CheckCircle2 size={16} className="text-[#059669] mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />}
                        <div>
                          <p className="text-xs font-bold">{check.description}</p>
                          {check.details && <p className="text-[11px] text-[#1A1A1A]/55 mt-0.5">{check.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {integrity.inconsistencies.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
                    <div className="p-4 border-b border-rose-200">
                      <h3 className="text-sm font-bold text-rose-900">Inconsistências detectadas</h3>
                    </div>
                    <div className="divide-y divide-rose-200">
                      {integrity.inconsistencies.map((issue, index) => (
                        <div key={`${issue.event_id || issue.entity_id || 'issue'}-${index}`} className="p-4 text-xs text-rose-950">
                          <p className="font-bold">{issue.message}</p>
                          <p className="mt-1 text-[11px]">Evento: {issue.event_id || 'não informado'} · Entidade: {issue.entity_id || 'não informada'}{issue.version ? ` · Versão ${issue.version}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ABA 6: LOG DE SEGURANÇA (SEÇÃO 14) */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-black/[0.08] shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <Lock size={16} className="text-[#0D3A85]" /> Log de Segurança Operacional (Segregado)
                </h2>
                <p className="text-xs text-[#1A1A1A]/55 mt-0.5">
                  Registro isolado do log de negócio: autenticações, privilégios e acessos administrativos
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
                              {Object.entries(log.details || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Operação registrada'}
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

      </div>

      {/* MODAL DE INSPEÇÃO CRIPTOGRÁFICA DO EVENTO (AS 12 PERGUNTAS ESSENCIAIS - 100% LIVRE DE CÓDIGO) */}
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
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo do Modal - As 12 Respostas da Auditoria em Cards Estruturados */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 text-xs font-sans">
              <div className="p-5 rounded-2xl bg-white border border-black/[0.08] space-y-4 shadow-2xs">
                <div className="border-b border-black/[0.06] pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] font-mono">
                    Respostas da Auditoria (12 Dimensões de Verificabilidade)
                  </h4>
                  <span className="text-[10px] text-[#059669] font-bold font-mono">
                    SHA-256 HASH CHAIN
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
                    <div className="font-bold text-[#1A1A1A] truncate">{selectedEvent.metadata?.label || selectedEvent.entity_id}</div>
                    {selectedEvent.metadata?.target_entity && (
                      <span className="text-[10px] text-[#0D3A85] font-semibold block">→ {selectedEvent.metadata.target_entity.replace('tag_', '')}</span>
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
