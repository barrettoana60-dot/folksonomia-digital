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

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white selection:bg-[#E8490A]/30">
      {/* Barra de Navegação Superior */}
      <header className="border-b border-white/10 bg-[#121214]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
              title="Voltar ao Painel Administrativo"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-[#E8490A]" size={20} />
                <h1 className="text-lg font-semibold tracking-tight">Sistema de Auditoria</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#E8490A]/10 text-[#E8490A] border border-[#E8490A]/20">
                  Interoperabilidade Cultural
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                Trilha de proveniência verificável, Event Sourcing e encadeamento criptográfico contínuo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <span className="text-white/40">Altura da Cadeia:</span>
              <span className="text-[#00FF88] font-bold">{integrityReport?.chainHeight ?? events.length} blocos</span>
            </div>

            <button
              onClick={runIntegrityCheck}
              disabled={verifyingIntegrity}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all shadow-[0_0_15px_rgba(232,73,10,0.3)] disabled:opacity-50"
            >
              <RefreshCw size={13} className={verifyingIntegrity ? 'animate-spin' : ''} />
              {verifyingIntegrity ? 'Verificando...' : 'Verificar Integridade'}
            </button>
          </div>
        </div>

        {/* Abas do Painel */}
        <div className="max-w-[1400px] mx-auto px-6 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-1 border-t border-white/5 pt-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-[#E8490A] text-white bg-white/5'
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#E8490A]' : 'text-white/40'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* ════════ ABA 1: EVENTOS DE AUDITORIA ════════ */}
        {activeTab === 'eventos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra de Filtros */}
            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-[#E8490A]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Filtros da Trilha</span>
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
                    className="text-[11px] text-[#E8490A] hover:underline"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-3 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar resumo, digest, label..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-[#E8490A] focus:outline-none"
                  />
                </div>

                <select
                  value={filterEntity}
                  onChange={e => setFilterEntity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181B] border border-white/10 text-white focus:border-[#E8490A] focus:outline-none"
                >
                  <option value="">Todas as Entidades</option>
                  {uniqueEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.label} ({ent.id})</option>
                  ))}
                </select>

                <select
                  value={filterEventType}
                  onChange={e => setFilterEventType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#18181B] border border-white/10 text-white focus:border-[#E8490A] focus:outline-none"
                >
                  <option value="">Todos os Tipos de Evento</option>
                  <option value="tag_created">tag_created (Criação)</option>
                  <option value="contribution_added">contribution_added (Contribuição)</option>
                  <option value="match_found">match_found (Correspondência)</option>
                  <option value="relation_created">relation_created (Relação Criada)</option>
                  <option value="relation_validated">relation_validated (Validação)</option>
                  <option value="version_published">version_published (Publicação)</option>
                  <option value="REVOKE">REVOKE (Revogação)</option>
                  <option value="ARCHIVE">ARCHIVE (Arquivamento)</option>
                </select>

                <input
                  type="text"
                  value={filterActor}
                  onChange={e => setFilterActor(e.target.value)}
                  placeholder="Filtrar por Ator..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-[#E8490A] focus:outline-none"
                />

                <input
                  type="text"
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  placeholder="Filtrar por Origem/Fonte..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-[#E8490A] focus:outline-none"
                />
              </div>
            </div>

            {/* Tabela de Eventos */}
            <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Eventos Criptograficamente Encadeados</h2>
                  <p className="text-[11px] text-white/40">
                    Mostrando {filteredEvents.length} de {events.length} eventos registrados
                  </p>
                </div>
                <button
                  onClick={loadEvents}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  title="Recarregar eventos"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {loadingEvents ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-[#E8490A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-white/40">Carregando trilha de auditoria...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertTriangle size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-sm text-white/50">Nenhum evento localizado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                        <th className="p-3">Data / Hora (UTC)</th>
                        <th className="p-3">Evento</th>
                        <th className="p-3">Entidade</th>
                        <th className="p-3">Versão</th>
                        <th className="p-3">Ator / Papel</th>
                        <th className="p-3">Origem</th>
                        <th className="p-3 font-mono">Event Digest</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredEvents.map(ev => {
                        const isGenesis = ev.previous_event_digest === null;
                        return (
                          <tr key={ev.event_id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="p-3 text-white/70 whitespace-nowrap font-mono text-[11px]">
                              {new Date(ev.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#E8490A]/10 text-[#E8490A] border border-[#E8490A]/20">
                                {ev.event_type}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-white">
                                {ev.metadata?.label || ev.entity_id}
                              </div>
                              <div className="text-[10px] text-white/40 font-mono">{ev.entity_id}</div>
                            </td>
                            <td className="p-3 whitespace-nowrap font-mono text-white/80">
                              <span className="text-white/40">V{ev.previous_version}</span>
                              <span className="mx-1 text-[#E8490A]">→</span>
                              <span className="font-bold text-[#00FF88]">V{ev.new_version}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-white font-medium">{ev.actor_id}</div>
                              <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono uppercase">
                                {ev.actor_role}
                              </span>
                            </td>
                            <td className="p-3 text-white/70 text-[11px]">{ev.source}</td>
                            <td className="p-3 font-mono text-[11px] text-white/60">
                              <div className="flex items-center gap-1">
                                {isGenesis ? (
                                  <span className="text-[9px] px-1 bg-blue-500/20 text-blue-300 rounded font-sans">
                                    GÊNESE
                                  </span>
                                ) : (
                                  <GitCommit size={11} className="text-[#00FF88]" />
                                )}
                                <span>{ev.event_digest.substring(0, 18)}…</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setSelectedEvent(ev)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors text-[11px] font-medium border border-white/10"
                              >
                                Inspecionar
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
            {/* Seletor de Entidade */}
            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="text-[#E8490A]" size={20} />
                <div>
                  <h2 className="text-sm font-semibold text-white">Linha do Tempo da Identidade Cultural</h2>
                  <p className="text-xs text-white/40">Evolução passo a passo desde a gênese até a publicação</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-white/60">Selecionar Identidade:</label>
                <select
                  value={selectedTagId}
                  onChange={e => setSelectedTagId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#18181B] border border-white/10 text-white focus:border-[#E8490A] outline-none font-medium"
                >
                  {uniqueEntities.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.label} ({ent.id})</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingTimeline ? (
              <div className="p-16 text-center rounded-2xl bg-[#121214] border border-white/10">
                <div className="w-8 h-8 border-2 border-[#E8490A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-white/40">Carregando história da identidade...</p>
              </div>
            ) : !tagTimeline || !tagTimeline.events || tagTimeline.events.length === 0 ? (
              <div className="p-16 text-center rounded-2xl bg-[#121214] border border-white/10">
                <AlertTriangle size={32} className="mx-auto text-white/20 mb-3" />
                <p className="text-sm text-white/50">Nenhum evento registrado para esta entidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Linha Temporal Visual (5 colunas) */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-[#121214] border border-white/10 space-y-6">
                  <div className="border-b border-white/10 pb-3">
                    <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                      Trilha Cronológica de Evolução
                    </h3>
                    <p className="text-sm font-semibold text-white mt-1">
                      {tagTimeline.events[0]?.metadata?.label || selectedTagId}
                    </p>
                  </div>

                  <div className="relative pl-6 space-y-6">
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#E8490A] via-[#00A3FF] to-[#00FF88]" />

                    {tagTimeline.events.map((ev: AuditEvent, idx: number) => {
                      const isGenesis = ev.previous_version === 0;
                      const isPublished = ev.event_type.includes('publish') || ev.metadata?.status === 'PUBLISHED';
                      const isCurrent = idx === tagTimeline.events.length - 1;

                      return (
                        <div key={ev.event_id} className="relative group">
                          <div
                            className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 bg-[#121214] transition-all ${
                              isPublished
                                ? 'border-[#00FF88] bg-[#00FF88]/20 shadow-[0_0_8px_#00FF88]'
                                : isGenesis
                                ? 'border-blue-400 bg-blue-400/20'
                                : 'border-[#E8490A] bg-[#E8490A]/20'
                            }`}
                          />

                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-[#00FF88]">Versão {ev.new_version}</span>
                              <span className="text-[10px] text-white/40 font-mono">
                                {new Date(ev.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <span>{ev.event_type}</span>
                              {ev.metadata?.status && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono">
                                  {ev.metadata.status}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-white/60 leading-relaxed">
                              {ev.reason || 'Atualização de metadados da identidade computacional.'}
                            </p>

                            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-white/40 font-mono border-t border-white/5">
                              <span>Ator: {ev.actor_id} ({ev.actor_role})</span>
                              <span>Fonte: {ev.source}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comparador de Versões (7 colunas) */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121214] border border-white/10 space-y-6">
                  <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                        Comparador Canônico de Versões
                      </h3>
                      <p className="text-sm font-semibold text-white mt-1">
                        Análise de Alterações, Adições e Validações
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-white/40 font-mono">V_A:</span>
                        <select
                          value={versionA}
                          onChange={e => setVersionA(parseInt(e.target.value, 10))}
                          className="px-2 py-1 rounded bg-[#18181B] border border-white/10 text-white font-mono text-xs"
                        >
                          {tagTimeline.events.map((e: AuditEvent) => (
                            <option key={`a-${e.new_version}`} value={e.new_version}>
                              Versão {e.new_version}
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-[#E8490A] font-bold">VS</span>

                      <div className="flex items-center gap-1">
                        <span className="text-white/40 font-mono">V_B:</span>
                        <select
                          value={versionB}
                          onChange={e => setVersionB(parseInt(e.target.value, 10))}
                          className="px-2 py-1 rounded bg-[#18181B] border border-white/10 text-white font-mono text-xs"
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
                    <div className="space-y-4">
                      {/* Resumo Comparativo */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                          <div className="text-white/40 text-[10px] uppercase font-bold">Estado Versão {versionA}</div>
                          <div className="text-[#E8490A] font-semibold">{versionComparison.eventA.event_type}</div>
                          <div className="text-[10px] text-white/50 truncate">
                            Digest: {versionComparison.eventA.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-white/50">
                            Ator: {versionComparison.eventA.actor_id} ({versionComparison.eventA.actor_role})
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#00FF88]/5 border border-[#00FF88]/20 space-y-1">
                          <div className="text-[#00FF88] text-[10px] uppercase font-bold">Estado Versão {versionB}</div>
                          <div className="text-[#00FF88] font-semibold">{versionComparison.eventB.event_type}</div>
                          <div className="text-[10px] text-white/50 truncate">
                            Digest: {versionComparison.eventB.new_digest.slice(0, 24)}…
                          </div>
                          <div className="text-[10px] text-white/50">
                            Ator: {versionComparison.eventB.actor_id} ({versionComparison.eventB.actor_role})
                          </div>
                        </div>
                      </div>

                      {/* Tabela de Diff Detalhada */}
                      <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50 font-semibold border-b border-white/10">
                            <tr>
                              <th className="p-3">Atributo</th>
                              <th className="p-3">Versão {versionA}</th>
                              <th className="p-3">Versão {versionB}</th>
                              <th className="p-3">Status da Modificação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                            <tr>
                              <td className="p-3 text-white/50">Status Operacional</td>
                              <td className="p-3 text-white/80">{versionComparison.eventA.metadata?.status || 'RAW'}</td>
                              <td className="p-3 font-semibold text-[#00FF88]">
                                {versionComparison.eventB.metadata?.status || 'VALIDATED'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-sans">
                                  validado
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 text-white/50">Origem / Conector</td>
                              <td className="p-3 text-white/80">{versionComparison.eventA.source}</td>
                              <td className="p-3 font-semibold text-white">{versionComparison.eventB.source}</td>
                              <td className="p-3">
                                {versionComparison.eventA.source !== versionComparison.eventB.source ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-sans">
                                    alterado
                                  </span>
                                ) : (
                                  <span className="text-white/30 text-[10px] font-sans">inalterado</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 text-white/50">Digest de Estado</td>
                              <td className="p-3 truncate max-w-[150px] text-white/60">
                                {versionComparison.eventA.new_digest.slice(0, 16)}…
                              </td>
                              <td className="p-3 truncate max-w-[150px] text-[#00FF88]">
                                {versionComparison.eventB.new_digest.slice(0, 16)}…
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-300 font-sans">
                                  novo digest
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 text-white/50">Alvo Relacional</td>
                              <td className="p-3 text-white/40">
                                {versionComparison.eventA.metadata?.target_entity || '—'}
                              </td>
                              <td className="p-3 text-white font-semibold">
                                {versionComparison.eventB.metadata?.target_entity || '—'}
                              </td>
                              <td className="p-3">
                                {versionComparison.eventB.metadata?.target_entity && !versionComparison.eventA.metadata?.target_entity ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#00FF88]/20 text-[#00FF88] font-sans">
                                    adicionado
                                  </span>
                                ) : (
                                  <span className="text-white/30 text-[10px] font-sans">preservado</span>
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="p-3 text-white/50">Motivação Formal</td>
                              <td className="p-3 text-white/60 font-sans text-[11px]">
                                {versionComparison.eventA.reason || '—'}
                              </td>
                              <td className="p-3 text-white/90 font-sans text-[11px]">
                                {versionComparison.eventB.reason || '—'}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-sans">
                                  revisado
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40">Selecione duas versões para visualizar o comparador canônico.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ ABA 3: RELAÇÕES & FONTES ════════ */}
        {activeTab === 'relacoes_fontes' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Relações Auditadas */}
            <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Relações Ontológicas Auditadas</h2>
                  <p className="text-[11px] text-white/40">
                    Origem de cada vínculo relacional, confiança matemática e comprovação probatória
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-white/80">
                  {relations.length} Relações Registradas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                      <th className="p-3">Identidade Origem</th>
                      <th className="p-3">Relação (SKOS)</th>
                      <th className="p-3">Identidade Destino</th>
                      <th className="p-3">Fonte / Conector</th>
                      <th className="p-3">Confiança</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 font-mono">Digest da Relação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {relations.map(rel => (
                      <tr key={rel.relation_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3 font-semibold text-white font-mono text-[11px]">{rel.source_entity}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#E8490A]/10 text-[#E8490A] border border-[#E8490A]/20">
                            {rel.relation_type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-white font-mono text-[11px]">{rel.target_entity}</td>
                        <td className="p-3 text-white/70">{rel.source}</td>
                        <td className="p-3 font-mono font-bold text-[#00FF88]">
                          {Math.round(rel.confidence * 100)}%
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300">
                            {rel.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-white/60">
                          {rel.digest.slice(0, 20)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fontes Externas Preservadas */}
            <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Fontes Externas com Origem Preservada</h2>
                  <p className="text-[11px] text-white/40">
                    Diferenciação probatória entre contribuição de usuário, acervo institucional e conector do sistema
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-white/80">
                  {sources.length} Fontes Vinculadas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                      <th className="p-3">Acervo / Conector</th>
                      <th className="p-3">ID Externo</th>
                      <th className="p-3">URI Externa</th>
                      <th className="p-3">Método de Correspondência</th>
                      <th className="p-3">Versão Adaptador</th>
                      <th className="p-3 font-mono">Digest Resposta</th>
                      <th className="p-3">Recuperado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sources.map(src => (
                      <tr key={src.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3 font-semibold text-white">{src.source}</td>
                        <td className="p-3 font-mono text-[11px] text-white/80">{src.external_id || src.source_id}</td>
                        <td className="p-3">
                          {src.external_uri ? (
                            <a
                              href={src.external_uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#00A3FF] hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                            >
                              Link Externo <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-white/30 font-mono">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-white/70">{src.matching_method}</td>
                        <td className="p-3 font-mono text-white/60">v{src.adapter_version}</td>
                        <td className="p-3 font-mono text-[11px] text-white/60">{src.response_digest.slice(0, 18)}…</td>
                        <td className="p-3 text-white/50 font-mono text-[11px]">
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
            {/* Cartão de Status Geral */}
            <div
              className={`p-6 rounded-2xl border transition-all ${
                integrityReport?.status === 'INTEGRIDADE VERIFICADA'
                  ? 'bg-[#00FF88]/5 border-[#00FF88]/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {integrityReport?.status === 'INTEGRIDADE VERIFICADA' ? (
                    <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/20 border border-[#00FF88]/40 flex items-center justify-center text-[#00FF88]">
                      <ShieldCheck size={26} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <AlertTriangle size={26} />
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      {integrityReport?.status || 'Aguardando Verificação'}
                    </h2>
                    <p className="text-xs text-white/60 mt-1">
                      Verificação criptográfica contínua em 8 níveis segundo o modelo canônico de interoperabilidade
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-right font-mono">
                    <div className="text-[10px] uppercase text-white/40">Merkle Root Ativa</div>
                    <div className="text-xs font-bold text-[#00FF88]">
                      {integrityReport?.merkleRoot ? `${integrityReport.merkleRoot.slice(0, 24)}…` : '—'}
                    </div>
                  </div>

                  <button
                    onClick={runIntegrityCheck}
                    disabled={verifyingIntegrity}
                    className="px-5 py-3 rounded-xl text-xs font-semibold bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(232,73,10,0.3)] disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={verifyingIntegrity ? 'animate-spin' : ''} />
                    {verifyingIntegrity ? 'Executando Análise Criptográfica...' : 'Verificar Integridade Agora'}
                  </button>
                </div>
              </div>
            </div>

            {/* Grid dos 8 Testes de Integridade */}
            {integrityReport && integrityReport.checks && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(integrityReport.checks).map(([key, chk], idx) => {
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-2xl border transition-all ${
                        chk.passed
                          ? 'bg-[#121214] border-white/10 hover:border-white/20'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                              chk.passed
                                ? 'bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-white/40 block">{chk.code}</span>
                            <h3 className="text-xs font-semibold text-white mt-0.5">{chk.description}</h3>
                          </div>
                        </div>

                        {chk.passed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30">
                            Aprovado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                            Inconsistente
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-white/60 mt-3 pt-3 border-t border-white/5 leading-relaxed font-sans">
                        {chk.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Diagnóstico em caso de inconsistência */}
            {integrityReport && integrityReport.inconsistencies.length > 0 && (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>Diagnósticos de Adulteração ou Descontinuidade Detectados</span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {integrityReport.inconsistencies.map((inc, iIdx) => (
                    <div key={iIdx} className="p-3 rounded-xl bg-black/40 border border-red-500/20 space-y-1">
                      <div className="text-red-300 font-semibold">{inc.message}</div>
                      {inc.event_id && <div className="text-white/60 text-[11px]">Evento Afetado: {inc.event_id}</div>}
                      {inc.expected_digest && (
                        <div className="text-white/40 text-[11px]">Digest Esperado: {inc.expected_digest}</div>
                      )}
                      {inc.calculated_digest && (
                        <div className="text-red-400 text-[11px]">Digest Calculado: {inc.calculated_digest}</div>
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
            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Lock size={15} className="text-[#00A3FF]" /> Log de Segurança Operacional (Segregado)
                </h2>
                <p className="text-[11px] text-white/40">
                  Registro isolado de eventos de segurança: autenticação, privilégios, acessos à API e rotações
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-white/80">
                {securityLogs.length} Registros de Segurança
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden">
              {loadingSecurity ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-white/40">Carregando logs de segurança...</p>
                </div>
              ) : securityLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Lock size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-sm text-white/50">Nenhum evento de segurança registrado no período.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                        <th className="p-3">Data / Hora</th>
                        <th className="p-3">Tipo de Evento</th>
                        <th className="p-3">Ator / Função</th>
                        <th className="p-3">Endereço IP</th>
                        <th className="p-3">Detalhes</th>
                        <th className="p-3 font-mono">Digest Criptográfico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {securityLogs.map(log => {
                        const isFailed = log.event_type.includes('failed') || log.event_type.includes('failure');
                        return (
                          <tr key={log.log_id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="p-3 text-white/70 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  isFailed
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                }`}
                              >
                                {log.event_type}
                              </span>
                            </td>
                            <td className="p-3 font-sans">
                              <div className="font-semibold text-white">{log.actor_id}</div>
                              <span className="text-[9px] text-white/50 uppercase font-mono">{log.actor_role}</span>
                            </td>
                            <td className="p-3 text-white/70">{log.ip_address || '—'}</td>
                            <td className="p-3 font-sans text-white/60 max-w-[200px] truncate">
                              {JSON.stringify(log.details)}
                            </td>
                            <td className="p-3 text-white/50 truncate max-w-[150px]">{log.log_digest}</td>
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
            <div className="p-6 rounded-2xl bg-[#121214] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Download size={16} className="text-[#E8490A]" /> Pacotes de Exportação Auditados
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Exportação canônica em JSON-LD com emissão e registro de digest criptográfico SHA-256
                </p>
              </div>

              <button
                onClick={handleExportAuditedPackage}
                disabled={exporting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E8490A] text-white hover:bg-[#E8490A]/90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(232,73,10,0.3)] disabled:opacity-50"
              >
                <Download size={13} className={exporting ? 'animate-bounce' : ''} />
                {exporting ? 'Gerando Pacote...' : 'Exportar Pacote Canônico (JSON-LD)'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                  Histórico de Exportações Auditadas
                </h3>
              </div>

              {exportsList.length === 0 ? (
                <div className="p-12 text-center">
                  <Download size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-sm text-white/50">Nenhuma exportação realizada até o momento.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                        <th className="p-3">ID Exportação</th>
                        <th className="p-3">Data / Hora</th>
                        <th className="p-3">Ator Responsável</th>
                        <th className="p-3">Formato</th>
                        <th className="p-3">Qtd. Registros</th>
                        <th className="p-3 font-mono">Dataset Digest (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {exportsList.map(exp => (
                        <tr key={exp.export_id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-3 font-bold text-white">{exp.export_id}</td>
                          <td className="p-3 text-white/70">{new Date(exp.timestamp).toLocaleString('pt-BR')}</td>
                          <td className="p-3 font-sans">
                            <span className="text-white font-medium">{exp.actor_id}</span>
                            <span className="text-[9px] text-white/40 block font-mono">({exp.actor_role})</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white font-bold">
                              {exp.format}
                            </span>
                          </td>
                          <td className="p-3 text-[#00FF88] font-bold">{exp.record_count}</td>
                          <td className="p-3 text-white/60 truncate max-w-[200px]" title={exp.dataset_digest}>
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

      {/* ════════ MODAL DE INSPEÇÃO PROFUNDA DO EVENTO ════════ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/15 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8490A] font-semibold block">
                  Inspeção Criptográfica do Evento
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedEvent.event_id}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
              {/* Encadeamento Criptográfico (Hash Chain) */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 font-mono">
                    Encadeamento da Hash Chain
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedEvent.event_digest)}
                    className="flex items-center gap-1 text-[10px] text-[#E8490A] hover:underline"
                  >
                    {copiedDigest ? <Check size={11} /> : <Copy size={11} />}
                    {copiedDigest ? 'Copiado' : 'Copiar Event Digest'}
                  </button>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div>
                    <span className="text-white/40 block text-[10px]">Previous Event Digest:</span>
                    <span className="text-white/70 select-all break-all">
                      {selectedEvent.previous_event_digest || 'null (Gênese da Trilha)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Current Event Digest:</span>
                    <span className="text-[#00FF88] font-bold select-all break-all">
                      {selectedEvent.event_digest}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Payload Digest (RFC 8785):</span>
                    <span className="text-cyan-300 select-all break-all">{selectedEvent.payload_digest}</span>
                  </div>
                </div>
              </div>

              {/* Informações de Proveniência W3C PROV */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-white/40 block">Agente Responsável</span>
                  <div className="font-semibold text-white">{selectedEvent.actor_id}</div>
                  <span className="text-[10px] text-white/60 font-mono">Papel: {selectedEvent.actor_role}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-white/40 block">Atividade / Operação</span>
                  <div className="font-semibold text-[#E8490A]">{selectedEvent.event_type}</div>
                  <span className="text-[10px] text-white/60">Origem: {selectedEvent.source}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-white/40 block">Entidade Afetada</span>
                  <div className="font-semibold text-white">{selectedEvent.metadata?.label || selectedEvent.entity_id}</div>
                  <span className="text-[10px] text-[#00FF88] font-mono">Versão {selectedEvent.new_version}</span>
                </div>
              </div>

              {/* Payload Canônico em JSON */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 font-mono block mb-2">
                  Payload Canônico Completo (JSON Determinístico)
                </span>
                <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-white/80 font-mono text-[11px] overflow-x-auto select-all">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
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
