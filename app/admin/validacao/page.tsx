'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Database, Brain, Network,
  ArrowRight, Layers, Plus, Trash2, Edit3, Copy, FileText,
  ChevronDown, ChevronUp, ShieldAlert, Sliders, Check
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
  exactMatch: 'Correspondência Exata',
  closeMatch: 'Correspondência Próxima',
  broadMatch: 'Correspondência Ampla',
  narrowMatch: 'Correspondência Estreita',
  relatedMatch: 'Correspondência Relacionada'
};

export default function ValidacaoPage() {
  const [activeTab, setActiveTab] = useState<'demarcas' | 'ligacoes'>('demarcas');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

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

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Buscar núcleos pendentes e todos os núcleos
      const resNucleos = await fetch('/api/admin/validacao/pendentes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataNucleos = await resNucleos.json();
      if (dataNucleos.success) {
        setPendingNucleos(dataNucleos.data || []);
        setAllNucleos(dataNucleos.all || []);
      }

      // 2. Buscar relações (ligações)
      const resRelations = await fetch('/api/admin/relacoes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRelations.ok) {
        const dataRelations = await resRelations.json();
        setRelations(dataRelations || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel curatorial:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Ações de Demarcações (Núcleos)
  const handleNucleoAction = async (id: string, action: 'validar' | 'rejeitar') => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/validacao/acao', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, action, justificativa: justificativas[id] || '' })
      });
      const json = await res.json();
      if (json.success) {
        setPendingNucleos(prev => prev.filter(t => t.id !== id));
        fetchData(); // Atualiza a lista completa
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditNucleo = (n: PendingItem) => {
    setEditingNucleoId(n.id);
    setEditOriginal(n.conteudo_original);
    setEditNormalizado(n.conteudo_normalizado || '');
    setEditConfianca(Math.round(n.confianca || 80));
  };

  const handleSaveEditNucleo = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/validacao/acao', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          id, 
          action: 'editar', 
          conteudo_original: editOriginal,
          conteudo_normalizado: editNormalizado,
          confianca: editConfianca
        })
      });
      const json = await res.json();
      if (json.success) {
        setEditingNucleoId(null);
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao salvar ajustes da demarcação:', err);
    }
  };

  // Ações de Ligações (Relações)
  const handleCreateRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateError('');
    setCreateSuccess('');

    if (!newOrigemId || !newDestinoId) {
      setCreateError('Selecione ambos os núcleos de origem e destino.');
      return;
    }
    if (newOrigemId === newDestinoId) {
      setCreateError('Não é permitido criar ligações reflexivas (origem e destino iguais).');
      return;
    }

    try {
      const res = await fetch('/api/admin/relacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          origem_id: newOrigemId,
          destino_id: newDestinoId,
          tipo_relacao: newTipoRelacao,
          peso: newPeso,
          metodo: 'ml',
          fonte: 'curador'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreateSuccess('Ligação semântica estabelecida com DNA gerado e indexado!');
        setNewOrigemId('');
        setNewDestinoId('');
        fetchData();
      } else {
        setCreateError(data.error || 'Erro ao estabelecer ligação');
      }
    } catch (err) {
      console.error(err);
      setCreateError('Erro de conexão ao criar ligação.');
    }
  };

  const handleStartEditRelation = (r: RelationItem) => {
    setEditingRelationId(r.id);
    setEditTipoRelacao(r.tipo_relacao);
    setEditPeso(r.peso);
  };

  const handleSaveEditRelation = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/relacoes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id,
          tipo_relacao: editTipoRelacao,
          peso: editPeso
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingRelationId(null);
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao ajustar ligação:', err);
    }
  };

  const handleDeleteRelation = async (id: string) => {
    if (!token) return;
    if (!confirm('Deseja realmente remover esta ligação semântica?')) return;
    try {
      const res = await fetch(`/api/admin/relacoes?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        if (selectedDnaRelation?.id === id) {
          setSelectedDnaRelation(null);
        }
      }
    } catch (err) {
      console.error('Erro ao remover ligação:', err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper para obter nome do núcleo
  const getNucleoName = (id: string) => {
    const found = allNucleos.find(n => n.id === id);
    return found ? found.conteudo_original : `Nó [${id.substring(0, 8)}]`;
  };

  return (
    <main className="min-h-screen bg-[#000000] text-white p-6 md:p-10 pt-24">
      
      {/* Top Title Bar */}
      <div className="max-w-[95%] mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-normal flex items-center gap-3">
            <Network className="text-[#E85002]" size={30} />
            Curadoria & Validação Ativa
          </h1>
          <p className="text-white/35 text-[11px] uppercase tracking-wider font-semibold mt-2">
            Ajustes finos nas demarcações e ligações de Folksonomia — NUGEP
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="liquid-button text-[11px] py-2.5 px-6 font-semibold tracking-wider !bg-white/5 hover:!bg-white/10 !border-white/10">
            Voltar ao Início
          </Link>
          <Link href="/admin/grafo" className="liquid-button text-[11px] py-2.5 px-6 font-semibold tracking-wider !bg-[#E85002] hover:!bg-[#F16001] !text-black">
            Visualizar Grafo
          </Link>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="max-w-[95%] mx-auto mb-8 flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('demarcas')}
          className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'demarcas' 
              ? 'border-[#E85002] text-[#E85002] bg-white/[0.02]' 
              : 'border-transparent text-white/45 hover:text-white/70'
          }`}
        >
          <Layers size={14} /> Demarcações Semânticas ({pendingNucleos.length})
        </button>
        <button
          onClick={() => setActiveTab('ligacoes')}
          className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'ligacoes' 
              ? 'border-[#E85002] text-[#E85002] bg-white/[0.02]' 
              : 'border-transparent text-white/45 hover:text-white/70'
          }`}
        >
          <Sliders size={14} /> Ligações & Conexões ({relations.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="max-w-[95%] mx-auto">
        
        {loading ? (
          <div className="text-center py-20 text-white/30 text-xs tracking-widest uppercase flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
            Carregando painel de curadoria ativa...
          </div>
        ) : (
          <>
            {/* 1. ABA DE DEMARCAÇÕES */}
            {activeTab === 'demarcas' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Fila de Demarcações Pendentes</h2>
                    <p className="text-[11px] text-white/35 mt-1">Ajuste os dados antes de validar ou descarte termos que não condizem com o acervo.</p>
                  </div>
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold uppercase">
                    {pendingNucleos.length} pendentes
                  </div>
                </div>

                {pendingNucleos.length === 0 ? (
                  <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl text-white/30 text-sm uppercase tracking-wider">
                    Não há demarcações aguardando curadoria ativa no momento.
                  </div>
                ) : (
                  pendingNucleos.map(item => (
                    <div key={item.id} className="glass-card p-8 md:p-10 border border-white/5 rounded-3xl hover:border-white/10 transition-all">
                      {editingNucleoId === item.id ? (
                        /* MODO EDIÇÃO / AJUSTE */
                        <div className="space-y-6">
                          <div className="border-b border-white/10 pb-4 flex justify-between items-center">
                            <span className="text-[10px] uppercase text-[#E85002] font-semibold tracking-wider">Ajuste Fino de Demarcação</span>
                            <span className="text-[9px] text-white/30 uppercase font-mono">ID: {item.id}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] text-white/40 uppercase font-semibold">Conteúdo Original (Tag Extraída)</label>
                              <input
                                type="text"
                                value={editOriginal}
                                onChange={(e) => setEditOriginal(e.target.value)}
                                className="liquid-input w-full text-white bg-black/40 border-white/10"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] text-white/40 uppercase font-semibold">Forma Normalizada</label>
                              <input
                                type="text"
                                value={editNormalizado}
                                onChange={(e) => setEditNormalizado(e.target.value)}
                                className="liquid-input w-full text-white bg-black/40 border-white/10"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="space-y-2">
                              <label className="text-[10px] text-white/40 uppercase font-semibold block">Confiança Inicial: {editConfianca}%</label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={editConfianca}
                                onChange={(e) => setEditConfianca(Number(e.target.value))}
                                className="w-full accent-[#E85002]"
                              />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                              <button
                                onClick={() => setEditingNucleoId(null)}
                                className="px-4 py-2 border border-white/10 rounded-xl text-xs hover:bg-white/5"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEditNucleo(item.id)}
                                className="px-5 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-xl text-xs hover:bg-green-500/30"
                              >
                                Salvar Ajustes
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* MODO VISUALIZAÇÃO E AÇÃO */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                          {/* Coluna 1: Dados Originais */}
                          <div className="space-y-6">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-white/35 font-mono block mb-1">ID: {item.id.substring(0, 8)}</span>
                              <h3 className="text-2xl font-normal serif-title text-[#F16001]">{item.conteudo_original}</h3>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/45 block mb-1.5">Forma Normalizada</label>
                              <p className="text-sm font-light text-white/80">{item.conteudo_normalizado || 'Aguardando normalização...'}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/45 block mb-1.5">Obra Associada</label>
                              <p className="text-xs font-semibold text-blue-300">
                                {item.obra?.titulo || 'Desconhecida'}
                              </p>
                            </div>
                          </div>

                          {/* Coluna 2: Indicadores IA */}
                          <div className="space-y-6">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/45 block mb-1">Métricas Cognitivas do Motor ML</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <span className="text-[9px] text-white/35 uppercase font-semibold">Confiança</span>
                                <p className="text-lg font-light text-orange-400 mt-1">{Math.round(item.confianca ?? 0)}%</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <span className="text-[9px] text-white/35 uppercase font-semibold">Novidade</span>
                                <p className="text-lg font-light text-blue-400 mt-1">{Math.round(item.novidade ?? 0)}%</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <span className="text-[9px] text-white/35 uppercase font-semibold">Tensão</span>
                                <p className="text-lg font-light text-yellow-400 mt-1">{Math.round(item.tensao ?? 0)}%</p>
                              </div>
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                                <span className="text-[9px] text-white/35 uppercase font-semibold">Ressonância</span>
                                <p className="text-lg font-light text-purple-400 mt-1">{Math.round(item.ressonancia ?? 0)}%</p>
                              </div>
                            </div>

                            {item.metadados?.concepts && item.metadados.concepts.length > 0 && (
                              <div>
                                <span className="text-[10px] text-white/40 uppercase block mb-1.5">Conceitos Inferidos</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.metadados.concepts.slice(0, 4).map((c: string) => (
                                    <span key={c} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-300 font-medium">{c}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Coluna 3: Ação Curatorial */}
                          <div className="flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/45 block">Proveniência de Origem</label>
                              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-medium tracking-wider w-max">
                                <Database size={10} /> {item.origem || 'Folksonomia_Crawler'}
                              </div>
                              
                              <textarea 
                                placeholder="Insira uma justificativa de validação..."
                                value={justificativas[item.id] || ''}
                                onChange={(e) => setJustificativas(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="liquid-input w-full bg-white/5 border-white/10 rounded-xl px-4 py-2.5 text-xs placeholder:text-white/20 min-h-[60px]"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                              <button 
                                onClick={() => handleNucleoAction(item.id, 'validar')}
                                className="liquid-button flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold !py-3 !bg-orange-500/20 !border-orange-500/40 hover:!bg-orange-500/35"
                              >
                                <CheckCircle size={13} /> Validar
                              </button>
                              <button 
                                onClick={() => handleNucleoAction(item.id, 'rejeitar')}
                                className="liquid-button flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold !py-3 !bg-red-500/10 !border-red-500/20 text-red-400 hover:!bg-red-500/25"
                              >
                                <XCircle size={13} /> Rejeitar
                              </button>
                              <button 
                                onClick={() => handleStartEditNucleo(item)}
                                className="liquid-button flex-shrink-0 flex items-center justify-center gap-1.5 text-xs font-semibold !py-3 !px-3 !bg-white/5 !border-white/10 hover:!bg-white/10"
                                title="Ajustar Parâmetros"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. ABA DE LIGAÇÕES & CONEXÕES */}
            {activeTab === 'ligacoes' && (
              <div className="space-y-8">
                
                {/* Painel de Estabelecer Nova Relação */}
                <div className="glass-card p-8 border border-white/5 rounded-3xl">
                  <h3 className="text-base font-normal serif-title text-[#E85002] mb-6 flex items-center gap-2">
                    <Plus size={18} /> Estabelecer Nova Ligação Semântica
                  </h3>

                  <form onSubmit={handleCreateRelation} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-white/40 font-semibold ml-1">Nó de Origem</label>
                      <select
                        value={newOrigemId}
                        onChange={(e) => setNewOrigemId(e.target.value)}
                        className="liquid-input w-full !bg-[#0f0f11] !border-white/10 text-xs"
                      >
                        <option value="">Selecione...</option>
                        {allNucleos.map(n => (
                          <option key={n.id} value={n.id}>
                            {n.conteudo_original.substring(0, 30)} ({n.conteudo_normalizado || 'Sem Norm'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-white/40 font-semibold ml-1">Nó de Destino</label>
                      <select
                        value={newDestinoId}
                        onChange={(e) => setNewDestinoId(e.target.value)}
                        className="liquid-input w-full !bg-[#0f0f11] !border-white/10 text-xs"
                      >
                        <option value="">Selecione...</option>
                        {allNucleos.map(n => (
                          <option key={n.id} value={n.id}>
                            {n.conteudo_original.substring(0, 30)} ({n.conteudo_normalizado || 'Sem Norm'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-white/40 font-semibold ml-1">Tipo de Relação</label>
                      <select
                        value={newTipoRelacao}
                        onChange={(e) => setNewTipoRelacao(e.target.value)}
                        className="liquid-input w-full !bg-[#0f0f11] !border-white/10 text-xs"
                      >
                        {Object.entries(TIPO_RELACAO_MAP).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-white/40 font-semibold ml-1">Peso Semântico ({newPeso})</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={newPeso}
                          onChange={(e) => setNewPeso(Number(e.target.value))}
                          className="w-full accent-[#E85002]"
                        />
                        <button
                          type="submit"
                          className="liquid-button !bg-[#E85002] hover:!bg-[#F16001] !text-black font-semibold !py-2.5 !px-4 text-xs !rounded-xl"
                        >
                          Conectar
                        </button>
                      </div>
                    </div>
                  </form>

                  {createError && <p className="text-red-400 text-[10px] uppercase tracking-wider font-semibold mt-4 ml-1 flex items-center gap-1.5"><ShieldAlert size={12} /> {createError}</p>}
                  {createSuccess && <p className="text-green-400 text-[10px] uppercase tracking-wider font-semibold mt-4 ml-1 flex items-center gap-1.5"><Check size={12} /> {createSuccess}</p>}
                </div>

                {/* Lista de Conexões Ativas no Grafo */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Ligações Ativas no Grafo Semântico</h2>
                      <p className="text-[11px] text-white/35 mt-1">Exiba o DNA Semântico imutável (hash SHA-256) e analise as correspondências e referências bibliográficas.</p>
                    </div>
                    <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold uppercase">
                      {relations.length} conexões
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {relations.map(rel => (
                      <div key={rel.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                        {editingRelationId === rel.id ? (
                          /* MODO EDIÇÃO / AJUSTE DE LIGAÇÃO */
                          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase text-white/40 font-semibold">Ajustar Tipo de Relação</label>
                                <select
                                  value={editTipoRelacao}
                                  onChange={(e) => setEditTipoRelacao(e.target.value)}
                                  className="liquid-input w-full !bg-[#0f0f11] !border-white/10 text-xs"
                                >
                                  {Object.entries(TIPO_RELACAO_MAP).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase text-white/40 font-semibold">Ajustar Peso ({editPeso})</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={editPeso}
                                  onChange={(e) => setEditPeso(Number(e.target.value))}
                                  className="w-full accent-[#E85002] mt-2.5"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingRelationId(null)}
                                className="px-3 py-2 border border-white/10 rounded-xl text-xs hover:bg-white/5"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEditRelation(rel.id)}
                                className="px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 rounded-xl text-xs hover:bg-green-500/30"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* MODO LISTAGEM */
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                  {getNucleoName(rel.origem_id)}
                                </span>
                                <ArrowRight size={14} className="text-[#E85002]" />
                                <span className="text-white/45 text-[10px] uppercase font-mono bg-[#E85002]/10 border border-[#E85002]/20 px-2 py-0.5 rounded">
                                  {TIPO_RELACAO_MAP[rel.tipo_relacao] || rel.tipo_relacao}
                                </span>
                                <ArrowRight size={14} className="text-[#E85002]" />
                                <span className="font-semibold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                  {getNucleoName(rel.destino_id)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-white/35">
                                <span className="uppercase tracking-wider">Peso: <strong className="text-orange-400">{rel.peso}</strong></span>
                                <span>•</span>
                                <span className="uppercase tracking-wider">Método: <strong className="text-blue-300">{rel.metodo || 'ML'}</strong></span>
                                <span>•</span>
                                <span className="uppercase tracking-wider">Fonte: <strong className="text-purple-300">{rel.fonte || 'Curador'}</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {rel.hash_dna && (
                                <button
                                  onClick={() => setSelectedDnaRelation(selectedDnaRelation?.id === rel.id ? null : rel)}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    selectedDnaRelation?.id === rel.id 
                                      ? 'bg-[#E85002]/20 border-[#E85002]/40 text-[#E85002]'
                                      : 'bg-white/5 border-white/10 text-white/55 hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  <FileText size={11} /> DNA Semântico
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEditRelation(rel)}
                                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white"
                                title="Ajustar Conexão"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteRelation(rel.id)}
                                className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                title="Excluir Conexão"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Detalhes do DNA Semântico Expandido */}
                        {selectedDnaRelation?.id === rel.id && rel.hash_dna && (
                          <div className="mt-5 pt-5 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            
                            {/* DNA DNA-Header Hash */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase tracking-wider text-[#E85002] font-semibold">DNA Semântico SHA-256 (Imutável)</span>
                                <p className="text-[11px] font-mono text-white/70 select-all break-all">{rel.hash_dna}</p>
                              </div>
                              <button
                                onClick={() => copyToClipboard(rel.hash_dna || '', rel.id)}
                                className="liquid-button text-[10px] !py-1.5 !px-3 font-medium flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border-white/10 flex-shrink-0"
                              >
                                {copiedId === rel.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                                {copiedId === rel.id ? 'Copiado!' : 'Copiar Hash'}
                              </button>
                            </div>

                            {/* Detalhes do metadados */}
                            {rel.metadados ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                                  <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-semibold flex items-center gap-1.5">
                                    <Brain size={12} /> Contexto e Co-Ocorrências
                                  </h4>
                                  <div>
                                    <span className="text-[9px] text-white/35 block mb-1">Tags da Mesma Família / Obra</span>
                                    {rel.metadados.familyTags && rel.metadados.familyTags.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {rel.metadados.familyTags.slice(0, 6).map((t: string) => (
                                          <span key={t} className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] text-white/60">{t}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] italic text-white/20">Nenhuma tag co-adjacente associada.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-3 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                                  <h4 className="text-[10px] uppercase tracking-wider text-white/44 font-semibold flex items-center gap-1.5">
                                    <Database size={12} /> Integração APIs de Acervos Nacionais
                                  </h4>
                                  <div className="space-y-2">
                                    <span className="text-[9px] text-white/35 block">Bases de Dados Registradas</span>
                                    {rel.metadados.externalApis && rel.metadados.externalApis.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {rel.metadados.externalApis.slice(0, 3).map((api: any, index: number) => (
                                          <div key={index} className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                                            <div className="text-[10px] truncate max-w-[70%]">
                                              <span className="text-[#E85002] font-semibold">[{api.fonte}]</span> {api.titulo}
                                            </div>
                                            {api.url ? (
                                              <a href={api.url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 hover:underline">Acessar</a>
                                            ) : (
                                              <span className="text-[9px] text-white/25">Sem URL</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] italic text-white/20">Sem referências externas salvas no DNA.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="md:col-span-2 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                                  <span className="text-[9px] text-white/35 block mb-1">Referência Bibliográfica & Regulamentação</span>
                                  {rel.metadados.bibliographies && rel.metadados.bibliographies.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-1 text-[10px] text-white/50">
                                      {rel.metadados.bibliographies.map((bib: string, idx: number) => (
                                        <li key={idx} className="truncate">{bib}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[10px] text-white/20 italic">Sem bibliografia declarada.</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-white/35 italic">Sem metadados adicionais no DNA.</p>
                            )}

                          </div>
                        )}
                      </div>
                    ))}
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
