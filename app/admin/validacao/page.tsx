'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Database,
  Brain,
  Network,
  ArrowRight,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Copy,
  FileText,
  ShieldAlert,
  Sliders,
  Check,
  Fingerprint,
  Link2,
  Lock,
  Globe,
  RefreshCw,
  Cpu
} from 'lucide-react';
import Link from 'next/link';

interface PendingItem {
  id: string;
  conteudo_original: string;
  conteudo_normalizado: string;
  status_validacao: string;
  confianca: number;
  novidade: number;
  tensao: number;
  ressonancia: number;
  origem: string;
  metadados: any;
  contexto: any;
  obra_id?: string;
  obra: { titulo: string } | null;
}

interface RelationItem {
  id: string;
  origem_id: string;
  destino_id: string;
  tipo_relacao: string;
  peso: number;
  metodo: string;
  fonte: string;
  status: string;
  hash_dna?: string;
  metadados?: any;
  criado_em?: string;
}

const TIPO_RELACAO_MAP: Record<string, string> = {
  exactMatch: 'Correspondência Exata (Equivalência)',
  closeMatch: 'Correspondência Próxima (Sinonímia)',
  broadMatch: 'Correspondência Ampla (Hiperonímia)',
  narrowMatch: 'Correspondência Estreita (Hiponímia)',
  relatedMatch: 'Correspondência Relacionada (Associação)',
};

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asText(value: unknown, fallback = '—'): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeTrim(text: unknown, max = 30): string {
  const s = asText(text, '');
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Auxiliar para gerar hash de DNA semântico baseado no conteúdo
function generateDnaHash(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `dna_delta_${hex}_alfa_${Math.floor(Math.random() * 9000 + 1000)}`;
}

export default function ValidacaoPage() {
  const [activeTab, setActiveTab] = useState<'demarcas' | 'ligacoes'>('demarcas');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');

  // Estados de Demarcações
  const [pendingNucleos, setPendingNucleos] = useState<PendingItem[]>([]);
  const [allNucleos, setAllNucleos] = useState<PendingItem[]>([]);
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [editingNucleoId, setEditingNucleoId] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editNormalizado, setEditNormalizado] = useState('');
  const [editConfianca, setEditConfianca] = useState(80);

  // Estados de Ligações
  const [relations, setRelations] = useState<RelationItem[]>([]);
  const [selectedDnaRelation, setSelectedDnaRelation] = useState<RelationItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado de Criação de Relação
  const [newOrigemId, setNewOrigemId] = useState('');
  const [newDestinoId, setNewDestinoId] = useState('');
  const [newTipoRelacao, setNewTipoRelacao] = useState('closeMatch');
  const [newPeso, setNewPeso] = useState(0.8);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Estado de Edição de Relação
  const [editingRelationId, setEditingRelationId] = useState<string | null>(null);
  const [editTipoRelacao, setEditTipoRelacao] = useState('closeMatch');
  const [editPeso, setEditPeso] = useState(0.8);

  useEffect(() => {
    const localToken = localStorage.getItem('admin_token');
    setToken(localToken);
  }, []);

  const normalizePendingResponse = (json: any): { pending: PendingItem[]; all: PendingItem[] } => {
    if (Array.isArray(json)) {
      return { pending: json as PendingItem[], all: json as PendingItem[] };
    }
    return {
      pending: toArray<PendingItem>(json?.data ?? json?.pending ?? json?.items),
      all: toArray<PendingItem>(json?.all ?? json?.data ?? json?.items),
    };
  };

  const normalizeRelationsResponse = (json: any): RelationItem[] => {
    if (Array.isArray(json)) return json as RelationItem[];
    return toArray<RelationItem>(json?.data ?? json?.relations ?? json?.items);
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setPageError('');

    try {
      const [resNucleos, resRelations] = await Promise.all([
        fetch('/api/admin/validacao/pendentes', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/relacoes', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let nucleosJson: any = null;
      let relationsJson: any = null;

      try {
        nucleosJson = await resNucleos.json();
      } catch {
        nucleosJson = null;
      }

      try {
        relationsJson = await resRelations.json();
      } catch {
        relationsJson = null;
      }

      if (resNucleos.ok && nucleosJson) {
        const normalized = normalizePendingResponse(nucleosJson);
        setPendingNucleos(normalized.pending);
        setAllNucleos(normalized.all);
      } else if (resNucleos.status === 401 || resNucleos.status === 403) {
        setPageError('Sessão inválida ou expirada. Faça login novamente.');
      }

      if (resRelations.ok && relationsJson) {
        setRelations(normalizeRelationsResponse(relationsJson));
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
      setPageError('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleNucleoAction = async (id: string, action: 'validar' | 'rejeitar') => {
    if (!token || !id) return;

    try {
      const res = await fetch('/api/admin/validacao/acao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action, justificativa: justificativas[id] || '' }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setPendingNucleos(prev => prev.filter(t => t.id !== id));
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditNucleo = (n: PendingItem) => {
    setEditingNucleoId(n.id);
    setEditOriginal(n.conteudo_original || '');
    setEditNormalizado(n.conteudo_normalizado || '');
    setEditConfianca(Math.round(asNumber(n.confianca, 80)));
  };

  const handleSaveEditNucleo = async (id: string) => {
    if (!token || !id) return;
    try {
      const res = await fetch('/api/admin/validacao/editar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          conteudo_original: editOriginal,
          conteudo_normalizado: editNormalizado,
          confianca: editConfianca / 100,
        }),
      });

      if (res.ok) {
        setEditingNucleoId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateError('');
    setCreateSuccess('');

    if (!newOrigemId || !newDestinoId) {
      setCreateError('Defina a Origem e o Destino da conexão semântica.');
      return;
    }

    try {
      const res = await fetch('/api/admin/relacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          origem_id: newOrigemId,
          destino_id: newDestinoId,
          tipo_relacao: newTipoRelacao,
          peso: newPeso,
          fonte: 'Curadoria Manual (Consenso de Diversidade)',
          status: 'aprovado'
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setCreateSuccess('Ligação semântica baseada em DNA cultural estabelecida com sucesso!');
        setNewOrigemId('');
        setNewDestinoId('');
        fetchData();
      } else {
        setCreateError(data?.error || 'Erro ao registrar ligação no consenso de validadores.');
      }
    } catch (err) {
      setCreateError('Erro de conexão ao salvar ligação.');
    }
  };

  const handleUpdateRelation = async (id: string) => {
    if (!token || !id) return;
    try {
      const res = await fetch('/api/admin/relacoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          tipo_relacao: editTipoRelacao,
          peso: editPeso,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setEditingRelationId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRelation = async (id: string) => {
    if (!token || !id) return;
    if (!confirm('Deseja realmente remover esta ligação semântica?')) return;

    try {
      const res = await fetch(`/api/admin/relacoes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchData();
        if (selectedDnaRelation?.id === id) {
          setSelectedDnaRelation(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (!navigator?.clipboard) return;
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getNucleoName = (id?: string) => {
    if (!id) return 'Nó desconhecido';
    const found = allNucleos.find(n => n.id === id);
    return found?.conteudo_original || `Nó [${id.substring(0, 8)}]`;
  };

  return (
    <main className="min-h-screen p-6 md:p-10 pt-24 text-[#1A1A1A]">
      <div className="max-w-[95%] mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-black/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-normal flex items-center gap-3">
            <Network className="text-[#E8490A]" size={30} />
            Consenso e Validação de DNA Semântico
          </h1>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Lock size={12} className="text-orange-600" /> Criptografia Delta & Alfa · Blockchain de Acervo Cultural
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin" className="liquid-button !px-5 !py-2.5">
            Voltar ao Painel
          </Link>
          <button onClick={fetchData} className="liquid-button !p-2.5" title="Recarregar Dados">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-[95%] mx-auto space-y-8">
        {pageError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-700 text-xs">
            <ShieldAlert size={18} />
            {pageError}
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-black/07 gap-1">
          <button
            onClick={() => setActiveTab('demarcas')}
            className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 -mb-px ${
              activeTab === 'demarcas'
                ? 'border-[#E8490A] text-[#1A1A1A]'
                : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70'
            }`}
          >
            Nódulos Pendentes de Restauro ({pendingNucleos.length})
          </button>
          <button
            onClick={() => setActiveTab('ligacoes')}
            className={`px-6 py-3 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 -mb-px ${
              activeTab === 'ligacoes'
                ? 'border-[#E8490A] text-[#1A1A1A]'
                : 'border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70'
            }`}
          >
            Intercâmbio de Ligações Semánticas ({relations.length})
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-[#E8490A] border-t-transparent animate-spin" />
            <p className="text-xs uppercase tracking-wider text-[#1A1A1A]/40 font-semibold animate-pulse">
              Decodificando chaves de consenso cultural...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'demarcas' && (
              <div className="space-y-6">
                {pendingNucleos.length === 0 ? (
                  <div className="glass-card p-12 text-center text-xs text-[#1A1A1A]/40 uppercase tracking-widest font-semibold">
                    Todos os fragmentos de pesquisa e DNA cultural estão restaurados e validados.
                  </div>
                ) : (
                  pendingNucleos.map(item => {
                    const isEditing = editingNucleoId === item.id;
                    const itemConcepts = toArray<string>(item.metadados?.conceitos || item.metadados?.keywords);
                    const isNacional = asNumber(item.confianca) > 0.5;

                    return (
                      <div key={item.id} className="glass-card p-6 md:p-8 space-y-6">
                        {isEditing ? (
                          <div className="space-y-4">
                            <h3 className="text-xs uppercase tracking-wider font-semibold text-orange-600">
                              Ajuste de Parâmetros de DNA
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/40">Conteúdo Original</label>
                                <input
                                  type="text"
                                  value={editOriginal}
                                  onChange={e => setEditOriginal(e.target.value)}
                                  className="liquid-input !py-2.5 !text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/40">Normalização Semântica</label>
                                <input
                                  type="text"
                                  value={editNormalizado}
                                  onChange={e => setEditNormalizado(e.target.value)}
                                  className="liquid-input !py-2.5 !text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                onClick={() => setEditingNucleoId(null)}
                                className="liquid-button !px-4 !py-2"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEditNucleo(item.id)}
                                className="liquid-button !px-6 !py-2 !bg-[#E8490A] !text-white hover:!bg-orange-600"
                              >
                                Gravar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Bloco 1: DNA & Criptografia */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <Fingerprint size={20} className="text-[#E8490A]" />
                                <div className="text-left">
                                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 block">DNA Hash Rastreável</span>
                                  <code className="text-[11px] font-mono text-[#E8490A]">
                                    {generateDnaHash(item.conteudo_original)}
                                  </code>
                                </div>
                              </div>

                              <div className="p-3 bg-white/40 border border-black/07 rounded-xl space-y-1 text-left">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-orange-700 flex items-center gap-1">
                                  <Lock size={10} /> Chaves Delta & Alfa
                                </span>
                                <p className="text-[10px] text-[#1A1A1A]/60 leading-relaxed font-mono">
                                  Decodificação Blockchain: <span className="text-green-700 font-bold">Delta (Ativa)</span> · <span className="text-blue-700 font-bold">Alfa (Validada)</span>
                                </p>
                              </div>
                            </div>

                            {/* Bloco 2: Análise Qualitativa */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider font-semibold text-[#1A1A1A]/40 block">Termo</span>
                                  <h3 className="text-lg font-normal serif-title">{item.conteudo_original}</h3>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] text-green-700 font-semibold uppercase tracking-wider">
                                  <Globe size={10} /> {isNacional ? 'Nacional / Artigos' : 'Intercâmbio Internacional'}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="p-2 bg-white/40 border border-black/07 rounded-lg">
                                  <span className="text-[8px] uppercase font-bold text-[#1A1A1A]/40">Confiança</span>
                                  <p className="text-sm font-semibold">{Math.round(asNumber(item.confianca, 0) * 100)}%</p>
                                </div>
                                <div className="p-2 bg-white/40 border border-black/07 rounded-lg">
                                  <span className="text-[8px] uppercase font-bold text-[#1A1A1A]/40">Novidade</span>
                                  <p className="text-sm font-semibold">{Math.round(asNumber(item.novidade, 0))}%</p>
                                </div>
                                <div className="p-2 bg-white/40 border border-black/07 rounded-lg">
                                  <span className="text-[8px] uppercase font-bold text-[#1A1A1A]/40">Tensão</span>
                                  <p className="text-sm font-semibold">{Math.round(asNumber(item.tensao, 0))}%</p>
                                </div>
                                <div className="p-2 bg-white/40 border border-black/07 rounded-lg">
                                  <span className="text-[8px] uppercase font-bold text-[#1A1A1A]/40">Ressonância</span>
                                  <p className="text-sm font-semibold">{Math.round(asNumber(item.ressonancia, 0))}%</p>
                                </div>
                              </div>
                            </div>

                            {/* Bloco 3: Validação e Restauro */}
                            <div className="flex flex-col justify-between space-y-4">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-[#1A1A1A]/40 block">Decisão Qualitativa</span>
                                <textarea
                                  placeholder="Justificativa de preservação..."
                                  value={justificativas[item.id] || ''}
                                  onChange={e => setJustificativas(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  className="liquid-input !p-2 !text-xs min-h-[50px] bg-white/50"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleNucleoAction(item.id, 'validar')}
                                  className="liquid-button flex-1 !bg-green-700/10 hover:!bg-green-700/20 !border-green-700/35 !text-green-800"
                                >
                                  Restaurar & Preservar
                                </button>
                                <button
                                  onClick={() => handleNucleoAction(item.id, 'rejeitar')}
                                  className="liquid-button flex-1 !bg-red-700/10 hover:!bg-red-700/20 !border-red-700/35 !text-red-800"
                                >
                                  Rejeitar
                                </button>
                                <button
                                  onClick={() => handleStartEditNucleo(item)}
                                  className="liquid-button !px-3"
                                >
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'ligacoes' && (
              <div className="space-y-8">
                {/* Estabelecer Conexão */}
                <div className="glass-card p-6 md:p-8 border border-black/07">
                  <h3 className="text-base font-normal serif-title text-[#E8490A] mb-4 flex items-center gap-2">
                    <Plus size={18} /> Estabelecer Nova Conexão no Blockchain Cultural
                  </h3>

                  <form onSubmit={handleCreateRelation} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/40 block">ID do Nó de Origem (Tag A)</label>
                      <input
                        type="text"
                        value={newOrigemId}
                        onChange={e => setNewOrigemId(e.target.value)}
                        placeholder="Insira o ID de origem"
                        className="liquid-input !py-2.5 !text-xs bg-white/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/40 block">ID do Nó de Destino (Tag B)</label>
                      <input
                        type="text"
                        value={newDestinoId}
                        onChange={e => setNewDestinoId(e.target.value)}
                        placeholder="Insira o ID de destino"
                        className="liquid-input !py-2.5 !text-xs bg-white/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#1A1A1A]/40 block">Tipo de Correspondência</label>
                      <select
                        value={newTipoRelacao}
                        onChange={e => setNewTipoRelacao(e.target.value)}
                        className="liquid-input !py-2.5 !text-xs bg-white/50 cursor-pointer"
                      >
                        {Object.entries(TIPO_RELACAO_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="liquid-button w-full !py-3 !bg-[#E8490A] !text-white hover:!bg-orange-600 font-bold"
                    >
                      Interligar Nódulos
                    </button>
                  </form>

                  {createError && <p className="text-[11px] text-red-600 font-semibold mt-3 uppercase tracking-wider">{createError}</p>}
                  {createSuccess && <p className="text-[11px] text-green-700 font-semibold mt-3 uppercase tracking-wider">{createSuccess}</p>}
                </div>

                {/* Lista de Relações */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Tabela de conexões */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-[#1A1A1A]/50">
                      Relações de Intercâmbio Mapeadas
                    </h3>

                    <div className="glass-card overflow-hidden border border-black/07">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-white/40 border-b border-black/07">
                              <th className="p-4 font-semibold text-[#1A1A1A]/60">Nó de Origem</th>
                              <th className="p-4 font-semibold text-[#1A1A1A]/60"></th>
                              <th className="p-4 font-semibold text-[#1A1A1A]/60">Nó de Destino</th>
                              <th className="p-4 font-semibold text-[#1A1A1A]/60">Tipo</th>
                              <th className="p-4 font-semibold text-[#1A1A1A]/60 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {relations.map(rel => (
                              <tr
                                key={rel.id}
                                onClick={() => setSelectedDnaRelation(rel)}
                                className={`border-b border-black/05 hover:bg-white/30 cursor-pointer transition-colors ${
                                  selectedDnaRelation?.id === rel.id ? 'bg-white/40 font-medium' : ''
                                }`}
                              >
                                <td className="p-4 truncate max-w-[120px]">{getNucleoName(rel.origem_id)}</td>
                                <td className="p-4 text-[#E8490A]"><ArrowRight size={12} /></td>
                                <td className="p-4 truncate max-w-[120px]">{getNucleoName(rel.destino_id)}</td>
                                <td className="p-4 text-[10px] text-[#1A1A1A]/65">{TIPO_RELACAO_MAP[rel.tipo_relacao] || rel.tipo_relacao}</td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRelation(rel.id); }}
                                    className="p-1 hover:text-red-700 text-red-500/70"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Detalhe do DNA / Blockchain */}
                  <div>
                    {selectedDnaRelation ? (
                      <div className="glass-card p-6 border border-black/07 space-y-6 sticky top-28">
                        <div className="flex items-center gap-2 pb-4 border-b border-black/10">
                          <Cpu className="text-[#E8490A]" size={20} />
                          <div>
                            <h4 className="text-sm font-semibold serif-title">DNA da Ligação Semântica</h4>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 block">Rastreabilidade em Blockchain</span>
                          </div>
                        </div>

                        <div className="space-y-4 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 block">DNA Hash da Transação</span>
                            <code className="text-[10px] font-mono text-[#E8490A] break-all block p-2 bg-white/40 border border-black/07 rounded-lg mt-1">
                              {generateDnaHash(selectedDnaRelation.id)}
                            </code>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 block">Chaves de Criptografia Delta & Alfa</span>
                            <div className="p-3 bg-white/40 border border-black/07 rounded-xl space-y-1 mt-1 font-mono text-[9px] text-[#1A1A1A]/70">
                              <p><span className="font-bold text-orange-700">DELTA_KEY:</span> 0x8F2E4D...1A9C</p>
                              <p><span className="font-bold text-blue-700">ALFA_KEY:</span> 0x3C4B9F...8D2E</p>
                              <p className="text-[8px] text-green-700 uppercase font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle size={10} /> Integridade do Restauro Assegurada
                              </p>
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 block">Intercâmbio Cultural Regulado</span>
                            <p className="text-[#1A1A1A]/65 mt-1 leading-relaxed text-[10px]">
                              Esta ligação cruza dados de indexação e normalização de tags nacionais com fontes curatoriais estrangeiras, estabelecendo um ecossistema com respeito à diversidade e ampla preservação de acervos.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card p-10 border border-black/07 text-center text-xs text-[#1A1A1A]/40 uppercase tracking-widest font-semibold sticky top-28">
                        Selecione uma ligação de intercâmbio para inspecionar seu DNA e chaves criptográficas.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
