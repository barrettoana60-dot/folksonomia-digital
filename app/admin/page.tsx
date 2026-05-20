'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Tag as TagIcon, Database, BarChart3, Plus, Trash2, ExternalLink, 
  FileText, Download, Share2, TrendingUp, Clock, PieChart as PieIcon, 
  CheckCircle2, Settings, ChevronRight, ShieldCheck, Network, Globe, 
  Search, ArrowUpRight, X, AlertCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

import Logo from '@/components/Logo';

const tabs = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'obras', label: 'Gestão de Obras' },
  { id: 'tags', label: 'Análise de Tags' },
  { id: 'relatorios', label: 'Relatório Semântico' },
  { id: 'validacao', label: 'Sistema de Validação' },
  { id: 'ontologia', label: 'Ontologias' },
  { id: 'interoperabilidade', label: 'Conexões Globais' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('visao');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Real Analytics State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State for Nova Obra
  const [obraForm, setObraForm] = useState({ titulo: '', descricao: '', imagem_url: '', artista: '', ano: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Obras List State
  const [obrasList, setObrasList] = useState<any[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);

  // Modals UI State
  const [showOntologiaForm, setShowOntologiaForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Relatório Semântico State
  const [searchTag, setSearchTag] = useState('');
  const [semanticResult, setSemanticResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Análise de Tags State (ML)
  const [tagAnalysisResult, setTagAnalysisResult] = useState<any>(null);
  const [selectedTagForAnalysis, setSelectedTagForAnalysis] = useState<string | null>(null);
  const [isAnalyzingTag, setIsAnalyzingTag] = useState(false);

  // ML Service Health
  const [mlHealth, setMlHealth] = useState<any>(null);
  const [mlChecking, setMlChecking] = useState(true);

  const handleTagAnalysis = async (tagText: string) => {
    setSelectedTagForAnalysis(tagText);
    setIsAnalyzingTag(true);
    setTagAnalysisResult(null);
    try {
      const res = await fetch('/api/admin/tag-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagText })
      });
      const json = await res.json();
      if (json.success) setTagAnalysisResult(json.data);
    } catch (err) {
      console.error('Erro na análise de tag:', err);
    } finally {
      setIsAnalyzingTag(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchTag.trim()) return;
    setIsAnalyzing(true);
    setSemanticResult(null);
    try {
      const res = await fetch('/api/admin/relatorio-semantico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: searchTag })
      });
      const json = await res.json();
      if (json.success) setSemanticResult(json.data);
    } catch (err) {
      console.error('Erro na análise semântica:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar obras do Supabase
  const fetchObras = async () => {
    setObrasLoading(true);
    try {
      const res = await fetch('/api/admin/obras', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setObrasList(json.data || []);
    } catch (err) {
      console.error('Erro ao buscar obras:', err);
    } finally {
      setObrasLoading(false);
    }
  };

  const handleDeleteObra = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) return;
    try {
      const res = await fetch('/api/admin/obras', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setObrasList(prev => prev.filter(o => o.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Carregar dados na montagem E quando trocar de aba
  useEffect(() => {
    fetchDashboard();
    if (activeTab === 'obras') fetchObras();
  }, [activeTab]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Verificar saúde do ML Service
  useEffect(() => {
    const checkML = async () => {
      setMlChecking(true);
      try {
        const res = await fetch('/api/ml/status', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          setMlHealth(json);
        } else {
          setMlHealth(null);
        }
      } catch {
        setMlHealth(null);
      } finally {
        setMlChecking(false);
      }
    };
    checkML();
  }, []);

  const handleAddObra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obraForm)
      });
      if (res.ok) {
        setShowAddForm(false);
        setObraForm({ titulo: '', descricao: '', imagem_url: '', artista: '', ano: '' });
        setImagePreview(null);
        fetchObras();
        alert('Obra adicionada com sucesso!');
      } else {
        alert('Erro ao adicionar obra.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(resizedBase64);
          setObraForm({...obraForm, imagem_url: resizedBase64});
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const stats = [
    { label: 'Volume de Dados', value: dashboardData?.visaoGeral.totalDados || 0, icon: Database, color: '#E85002' },
    { label: 'Usuários Únicos', value: dashboardData?.visaoGeral.usuarios || 0, icon: Users, color: '#E85002' },
    { label: 'Tags Criadas', value: dashboardData?.visaoGeral.tags || 0, icon: TagIcon, color: '#E85002' },
    { label: 'Registros Validados', value: dashboardData?.visaoGeral.validados || 0, icon: ShieldCheck, color: '#00FF00' },
  ];

  // Estado do modal do grafo
  const [graphNodeSelected, setGraphNodeSelected] = useState<any>(null);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const addedNodes = new Set<string>();

    const recentTags = dashboardData?.relatorioSemantico?.recentTags || [];
    
    for (const tagObj of recentTags) {
      const tagName = tagObj.tag;
      if (!addedNodes.has(tagName)) {
        nodes.push({ id: tagName, group: 1, val: 20 });
        addedNodes.add(tagName);
      }
      // Conectar tag ao seu grupo (se não for "Outros")
      if (tagObj.grupo && tagObj.grupo !== 'Outros') {
        if (!addedNodes.has(tagObj.grupo)) {
          nodes.push({ id: tagObj.grupo, group: 2, val: 30 });
          addedNodes.add(tagObj.grupo);
        }
        links.push({ source: tagName, target: tagObj.grupo });
      }
    }

    // Conectar tags do mesmo grupo entre si
    const groupMap: Record<string, string[]> = {};
    for (const tagObj of recentTags) {
      const g = tagObj.grupo || 'Outros';
      if (g !== 'Outros') {
        if (!groupMap[g]) groupMap[g] = [];
        groupMap[g].push(tagObj.tag);
      }
    }
    for (const members of Object.values(groupMap)) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({ source: members[i], target: members[j] });
        }
      }
    }

    // Fallback se não houver dados
    if (nodes.length === 0) {
      nodes.push({ id: 'Aguardando dados...', group: 3, val: 10 });
    }

    return { nodes, links };
  }, [dashboardData]);

  const handleExportCSV = () => {
    const data = [['ID', 'Obra', 'Tag', 'Visitante', 'Data'], ['1', 'Guernica', 'Caos', 'Visitante #A2', '2026-04-26']];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'relatorio_folksonomia.csv'; 
    a.click();
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 print:pt-0">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
        
        {/* LOGO INSTITUCIONAL */}
        <div className="flex items-center gap-6 pb-6 border-b border-white/5 print:border-black/10 print:pb-10 print:mb-10">
          <Logo className="w-12 h-12 md:w-16 md:h-16" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter print:text-black">
              Sistema de Folksonomia Digital
            </h1>
            <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em] text-white/30 print:text-black/50">
              Gestão Semântica Institucional — NUGEP
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/5 print:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 md:px-8 py-3 rounded-xl text-[9px] md:text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'text-white/40 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {activeTab === 'visao' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
                {stats.map((s, i) => (
                  <div key={i} className="glass-card p-6 md:p-12 flex flex-col items-center text-center space-y-4 md:space-y-8">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                      <s.icon size={20} className="md:size-[28px]" style={{ color: s.color }} />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-2xl md:text-5xl font-normal serif-title text-white tracking-tight">{s.value}</p>
                      <p className="text-[7px] md:text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'obras' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Gestão de Obras</h2>
                    <button onClick={() => setShowAddForm(true)} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Obra</button>
                 </div>
                 
                 {showAddForm && (
                   <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-2xl relative animate-fade-in">
                       <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-2xl serif-title uppercase mb-6">Adicionar Nova Obra</h3>
                       <form onSubmit={handleAddObra} className="space-y-4">
                         <div>
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Título</label>
                           <input required value={obraForm.titulo} onChange={e => setObraForm({...obraForm, titulo: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Cálice Colonial" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Autor/Artista</label>
                             <input value={obraForm.artista} onChange={e => setObraForm({...obraForm, artista: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                           <div>
                             <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Ano</label>
                             <input value={obraForm.ano} onChange={e => setObraForm({...obraForm, ano: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                         </div>
                         <div>
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Descrição</label>
                           <textarea value={obraForm.descricao} onChange={e => setObraForm({...obraForm, descricao: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none"></textarea>
                         </div>
                         <div>
                            <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest mb-2 block">Foto da Obra</label>
                            <div 
                              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-[#E85002] bg-[#E85002]/10' : imagePreview ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleImageUpload(file);
                              }}
                              onClick={() => document.getElementById('obra-file-input')?.click()}
                            >
                              <input 
                                id="obra-file-input"
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file);
                                }}
                              />
                              {imagePreview ? (
                                <div className="space-y-3">
                                  <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg border border-white/10 object-contain" />
                                  <p className="text-[10px] text-green-400 uppercase tracking-widest font-bold">✓ Foto carregada — clique para trocar</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                  </div>
                                  <p className="text-white/40 text-xs">Arraste uma foto aqui ou clique para selecionar</p>
                                  <p className="text-white/20 text-[9px] uppercase tracking-widest">JPG, PNG, WebP</p>
                                </div>
                              )}
                            </div>
                          </div>
                         <button disabled={isSubmitting} type="submit" className="w-full liquid-button !bg-[#E85002] mt-4">
                           {isSubmitting ? 'Salvando...' : 'Salvar Obra no Supabase'}
                         </button>
                       </form>
                     </div>
                   </div>
                 )}

                 {/* GALERIA REAL DE OBRAS */}
                 {obrasLoading ? (
                   <div className="glass-card p-12 text-center">
                     <div className="w-8 h-8 border-2 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                     <p className="text-white/30 uppercase tracking-widest font-black text-xs">Carregando obras do Supabase...</p>
                   </div>
                 ) : obrasList.length === 0 ? (
                   <div className="glass-card p-12 text-center">
                     <Database size={48} className="mx-auto text-white/10 mb-6" />
                     <p className="text-white/30 uppercase tracking-widest font-black text-xs">Nenhuma obra cadastrada ainda. Clique em "+ Nova Obra" para começar.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {obrasList.map((obra) => (
                       <div key={obra.id} className="glass-card overflow-hidden group hover:border-[#E85002]/30 transition-all duration-300">
                         {obra.imagem_url ? (
                           <div className="h-48 overflow-hidden bg-black/30">
                             <img src={obra.imagem_url} alt={obra.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                         ) : (
                           <div className="h-48 bg-gradient-to-br from-[#E85002]/10 to-transparent flex items-center justify-center">
                             <Database size={48} className="text-white/10" />
                           </div>
                         )}
                         <div className="p-5 space-y-3">
                           <h3 className="text-lg font-bold serif-title uppercase tracking-wide leading-tight">{obra.titulo}</h3>
                           {obra.artista && <p className="text-[11px] text-[#E85002] font-bold uppercase tracking-widest">{obra.artista}</p>}
                           {obra.ano && <p className="text-[10px] text-white/40 uppercase tracking-widest">Ano: {obra.ano}</p>}
                           {obra.descricao && <p className="text-xs text-white/50 line-clamp-2">{obra.descricao}</p>}
                           <div className="flex items-center justify-between pt-3 border-t border-white/5">
                             <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
                               <TagIcon size={10} className="inline mr-1" />
                               {obra.total_tags || 0} tags
                             </span>
                             <div className="flex gap-2">
                               <button
                                 onClick={() => handleDeleteObra(obra.id)}
                                 className="text-white/20 hover:text-red-400 transition-colors p-1"
                                 title="Excluir obra"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                   <div>
                     <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Análise de Tags</h2>
                     <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mt-1">Motor ML: deduplicação, famílias temáticas, erros ortográficos, correlações inter-tags</p>
                   </div>
                   <button onClick={() => { setTagAnalysisResult(null); setSelectedTagForAnalysis(null); }} className="liquid-button !bg-white/5 text-[10px]">Limpar Análise</button>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Lista de tags recentes */}
                   <div className="glass-card p-8">
                     <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 mb-6">
                       <TagIcon className="text-[#E85002]" size={18} /> Tags no Sistema
                     </h3>
                     <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {dashboardData?.relatorioSemantico?.recentTags?.length > 0 ? (
                          dashboardData.relatorioSemantico.recentTags.map((tagObj: any, i: number) => (
                            <div key={tagObj.id || i} className={`p-4 rounded-lg border flex justify-between items-center cursor-pointer transition-all ${
                              selectedTagForAnalysis === tagObj.tag 
                                ? 'bg-[#E85002]/10 border-[#E85002]/40' 
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`} onClick={() => handleTagAnalysis(tagObj.tag)}>
                              <div>
                                <span className="text-[#E85002] font-serif italic text-lg">&quot;{tagObj.tag}&quot;</span>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mt-1">
                                  {tagObj.grupo !== 'Outros' ? tagObj.grupo : 'Clique para analisar'}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-white/30" />
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-white/40 text-[10px] uppercase tracking-widest border border-white/5 rounded-lg">
                            Nenhuma tag criada ainda
                          </div>
                        )}
                     </div>
                   </div>

                   {/* Resultado da análise ML da tag selecionada */}
                   <div className="space-y-4">
                     {isAnalyzingTag && (
                       <div className="glass-card p-12 text-center">
                         <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                         <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Analisando tag com motor ML...</p>
                       </div>
                     )}

                     {tagAnalysisResult && !isAnalyzingTag && (
                       <>
                         {/* Identidade da Tag */}
                         <div className="glass-card p-6 space-y-4">
                           <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                             <Network size={16} className="text-[#E85002]" /> Identidade Semântica
                           </h3>
                           <div className="flex items-center gap-3">
                             <span className="text-2xl font-serif italic text-[#E85002]">&quot;{tagAnalysisResult.tag}&quot;</span>
                             {tagAnalysisResult.family && (
                               <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] uppercase font-black tracking-widest text-purple-400">
                                 {tagAnalysisResult.family.name}
                               </span>
                             )}
                             {!tagAnalysisResult.family && (
                               <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase font-black tracking-widest text-white/40">
                                 Sem família detectada
                               </span>
                             )}
                           </div>
                           {tagAnalysisResult.family && (
                             <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                               <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-3">Membros desta família</p>
                               <div className="flex flex-wrap gap-2">
                                 {tagAnalysisResult.family.members.slice(0, 12).map((m: string, i: number) => (
                                   <span key={i} className={`px-2 py-1 rounded text-[10px] font-bold ${
                                     m.toLowerCase() === tagAnalysisResult.tag.toLowerCase() 
                                       ? 'bg-[#E85002]/20 text-[#E85002] border border-[#E85002]/30' 
                                       : 'bg-purple-500/10 text-purple-300'
                                   }`}>{m}</span>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Duplicatas e erros */}
                         {tagAnalysisResult.duplicates?.length > 0 && (
                           <div className="glass-card p-6 border border-red-500/20 space-y-3">
                             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                               <AlertCircle size={16} className="text-red-400" /> Duplicatas / Erros Detectados ({tagAnalysisResult.duplicates.length})
                             </h3>
                             {tagAnalysisResult.duplicates.map((d: any, i: number) => (
                               <div key={i} className="p-3 bg-red-500/5 rounded-lg flex items-center justify-between">
                                 <div>
                                   <span className="text-white/80 font-serif italic">&quot;{d.tag}&quot;</span>
                                   <span className="text-[9px] text-white/30 ml-2">({Math.round(d.score * 100)}% similar)</span>
                                 </div>
                                 <span className="text-[9px] text-red-400/80 italic max-w-[50%] text-right">{d.reason}</span>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Tags relacionadas */}
                         {tagAnalysisResult.siblings?.length > 0 && (
                           <div className="glass-card p-6 border border-blue-500/20 space-y-3">
                             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                               <Share2 size={16} className="text-blue-400" /> Tags Relacionadas ({tagAnalysisResult.siblings.length})
                             </h3>
                             {tagAnalysisResult.siblings.slice(0, 8).map((s: any, i: number) => (
                               <div key={i} className="p-3 bg-blue-500/5 rounded-lg flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <span className="text-white/80 font-serif italic">&quot;{s.tag}&quot;</span>
                                   <div className="flex items-center gap-1">
                                     <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                                       <div className="h-full bg-blue-400" style={{ width: `${s.score * 100}%` }} />
                                     </div>
                                     <span className="text-[8px] text-white/30 font-bold">{Math.round(s.score * 100)}%</span>
                                   </div>
                                 </div>
                                 <span className="text-[9px] text-blue-400/80 italic max-w-[45%] text-right">{s.reason}</span>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Sugestões do ML */}
                         {tagAnalysisResult.suggestions?.length > 0 && (
                           <div className="glass-card p-6 space-y-2">
                             <h3 className="text-sm font-bold uppercase tracking-widest mb-3">Sugestões do Cérebro</h3>
                             {tagAnalysisResult.suggestions.map((s: string, i: number) => (
                               <p key={i} className="text-[11px] text-white/60 leading-relaxed flex items-start gap-2">
                                 <span className="text-[#E85002] mt-0.5">→</span> {s}
                               </p>
                             ))}
                           </div>
                         )}

                         {/* Conexões Propagadas (A→B + B→C = A↔C) */}
                         {tagAnalysisResult.propagated?.length > 0 && (
                           <div className="glass-card p-6 border border-green-500/20 space-y-3">
                             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                               <TrendingUp size={16} className="text-green-400" /> Conexões Propagadas ({tagAnalysisResult.propagated.length})
                             </h3>
                             <p className="text-[9px] text-white/30 uppercase tracking-widest">Inferidas automaticamente: se A→B e B→C, então A↔C</p>
                             {tagAnalysisResult.propagated.map((p: any, i: number) => (
                               <div key={i} className="p-3 bg-green-500/5 rounded-lg">
                                 <div className="flex items-center justify-between">
                                   <span className="text-white/80 font-serif italic">&quot;{p.tag}&quot;</span>
                                   <span className="text-[9px] text-green-400/80 font-bold">{Math.round(p.score * 100)}% confiança</span>
                                 </div>
                                 <p className="text-[9px] text-white/40 italic mt-1">{p.reason}</p>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* DNA Semântico */}
                         {tagAnalysisResult.dna && (
                           <div className="glass-card p-6 space-y-4">
                             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                               <Database size={16} className="text-[#E85002]" /> DNA Semântico
                             </h3>
                             <div className="space-y-2">
                               {Object.entries(tagAnalysisResult.dna)
                                 .filter(([, val]) => (val as number) > 0)
                                 .sort(([, a], [, b]) => (b as number) - (a as number))
                                 .map(([key, val]) => {
                                   const labels: Record<string, string> = { period: 'Período', technique: 'Técnica', geography: 'Geografia', material: 'Material', theme: 'Temática', provenance: 'Proveniência', movement: 'Movimento' };
                                   return (
                                     <div key={key} className="flex items-center gap-3">
                                       <span className="text-[9px] uppercase tracking-widest text-white/40 w-24 text-right font-bold">{labels[key] || key}</span>
                                       <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
                                         <div className="h-full bg-gradient-to-r from-[#E85002] to-[#F16001] transition-all duration-700" style={{ width: `${(val as number) * 100}%` }} />
                                       </div>
                                       <span className="text-[9px] text-white/30 font-bold w-10">{Math.round((val as number) * 100)}%</span>
                                     </div>
                                   );
                                 })}
                             </div>
                           </div>
                         )}

                         {/* Rastro Neural (Tráfego de Informação) */}
                         {tagAnalysisResult.traces?.length > 0 && (
                           <div className="glass-card p-6 space-y-3">
                             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                               <Clock size={16} className="text-white/50" /> Rastro Neural ({tagAnalysisResult.totalTraces || tagAnalysisResult.traces.length} eventos)
                             </h3>
                             <p className="text-[9px] text-white/30 uppercase tracking-widest">De onde veio → Para onde vai</p>
                             <div className="space-y-2 max-h-48 overflow-y-auto">
                               {tagAnalysisResult.traces.slice(0, 10).map((t: any, i: number) => {
                                 const actionColors: Record<string, string> = {
                                   'INGESTAO': 'text-blue-400 bg-blue-500/10',
                                   'CORRELACAO': 'text-purple-400 bg-purple-500/10',
                                   'PROPAGACAO': 'text-green-400 bg-green-500/10',
                                   'APRENDIZADO': 'text-yellow-400 bg-yellow-500/10',
                                   'VALIDACAO': 'text-emerald-400 bg-emerald-500/10',
                                   'CONEXAO': 'text-[#E85002] bg-[#E85002]/10'
                                 };
                                 const colorClass = actionColors[t.action] || 'text-white/50 bg-white/5';
                                 return (
                                   <div key={t.id || i} className="flex items-center gap-2 text-[10px]">
                                     <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest ${colorClass}`}>{t.action}</span>
                                     <span className="text-white/30">{t.origin}</span>
                                     <span className="text-white/15">→</span>
                                     <span className="text-white/50">{t.destination}</span>
                                     <span className="text-white/15 ml-auto">{Math.round(t.confidence * 100)}%</span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         )}

                         {/* Botão para análise completa no Relatório Semântico */}
                         <button onClick={() => { setSearchTag(tagAnalysisResult.tag); setActiveTab('relatorios'); setTimeout(() => handleSemanticSearch(), 300); }} className="w-full liquid-button !bg-[#E85002] flex items-center justify-center gap-2">
                           <Globe size={16} /> Análise Completa (IBRAM/Tainacan + Tesauro CNFCP)
                         </button>
                       </>
                     )}

                     {!tagAnalysisResult && !isAnalyzingTag && (
                       <div className="glass-card p-12 text-center">
                         <TagIcon size={48} className="mx-auto text-white/10 mb-4" />
                         <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Clique em uma tag à esquerda para ver a análise ML completa</p>
                         <p className="text-white/20 text-[9px] uppercase tracking-widest mt-2">Família temática • Duplicatas • Erros ortográficos • Tags relacionadas</p>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Volume por grupo */}
                 <div className="glass-card p-8">
                   <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Volume por Grupo Temático</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {dashboardData?.relatorioSemantico?.topConceitos?.map((c: any, i: number) => {
                       const maxVal = Math.max(...(dashboardData?.relatorioSemantico?.topConceitos?.map((x: any) => x.valor) || [1]));
                       return (
                         <div key={i} className="space-y-2">
                           <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                             <span>{c.nome}</span>
                             <span className="text-white/40">{c.valor} tags</span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-[#E85002] transition-all duration-700" style={{ width: `${(c.valor / maxVal) * 100}%` }} />
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'relatorios' && (
              <div className="space-y-8 animate-fade-in print-section">
                {/* Estilos para impressão limpa — somente análise da tag */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    /* Reset geral */
                    body { background: white !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    
                    /* Esconder TUDO que não é a análise */
                    nav, header, footer, .print\\:hidden, [class*="print:hidden"] { display: none !important; }
                    
                    /* Sidebar e tabs */
                    aside, [role="navigation"], [role="tablist"] { display: none !important; }
                    
                    /* Cards com borda leve */
                    .glass-card { 
                      border: 1px solid #ddd !important; 
                      box-shadow: none !important; 
                      background: transparent !important; 
                      page-break-inside: avoid;
                      margin-bottom: 12px !important;
                    }
                    
                    /* Tipografia */
                    * { color: #222 !important; }
                    h1, h2, h3, h4 { color: #000 !important; font-weight: bold !important; }
                    .text-\\[\\#E85002\\] { color: #c44000 !important; font-weight: bold; }
                    .text-green-400, .text-green-500 { color: #16a34a !important; }
                    .text-blue-400, .text-blue-300 { color: #2563eb !important; }
                    .text-purple-400, .text-purple-300 { color: #7c3aed !important; }
                    .text-amber-400, .text-amber-300 { color: #d97706 !important; }
                    .text-red-400, .text-red-500 { color: #dc2626 !important; }
                    
                    /* Badges e tags coloridas */
                    .bg-\\[\\#E85002\\]\\/10, .bg-blue-500\\/10, .bg-green-500\\/10, .bg-purple-500\\/10, .bg-amber-500\\/10 { 
                      background: #f5f5f5 !important; 
                      border: 1px solid #ccc !important; 
                    }
                    
                    /* Prose e análise escrita */
                    .prose, .prose * { color: #222 !important; line-height: 1.8 !important; }
                    
                    /* Barras de progresso */
                    .bg-\\[\\#E85002\\] { background: #c44000 !important; }
                    
                    /* Cabeçalho do print */
                    .print-header { display: block !important; }
                    
                    /* Margens */
                    @page { margin: 1.5cm 2cm; }
                    
                    /* Largura */
                    .print-section { max-width: 100% !important; padding: 0 !important; }
                    .grid { display: block !important; }
                    .grid > * { margin-bottom: 16px !important; }
                  }
                `}} />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-normal serif-title uppercase tracking-widest">Relatório Semântico</h2>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mt-1">Análise profunda com cruzamento de dados — ModernBERT + RotatE + GAT</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => window.print()} className="liquid-button !bg-white/5 flex items-center gap-2 flex-1 md:flex-none justify-center hover:!bg-white/20 transition-all text-white">
                      <FileText size={16} /> Exportar PDF
                    </button>
                    <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
                      <Download size={16} /> CSV
                    </button>
                  </div>
                </div>

                {/* GRÁFICO TEMPORAL RESTAURADO */}
                <div className="glass-card p-8 md:p-12 space-y-8 print:hidden">
                  <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                    <TrendingUp className="text-[#E85002]" size={18} /> Fluxo Temporal de Tags (Últimos 7 dias)
                  </h3>
                  <div className="h-48 w-full flex items-end gap-3 border-b border-white/10 pb-2">
                    {dashboardData?.relatorioSemantico?.fluxoTemporal?.map((val: number, i: number) => {
                      const maxVal = Math.max(...(dashboardData?.relatorioSemantico?.fluxoTemporal || [1]), 1);
                      const percent = (val / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 bg-gradient-to-t from-[#E85002] to-[#F16001] rounded-t-lg relative group transition-all duration-500" style={{ height: `${percent}%` }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
                        </div>
                      )
                    }) || (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-bold uppercase tracking-widest">Carregando dados temporais...</div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                    <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                  </div>
                </div>

                {/* Cabeçalho institucional — só aparece no PDF */}
                <div className="print-header hidden mb-8" style={{display: 'none'}}>
                  <div style={{borderBottom: '2px solid #c44000', paddingBottom: '16px', marginBottom: '24px'}}>
                    <h1 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase'}}>Sistema de Folksonomia Digital 2.0</h1>
                    <p style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>Relatório Semântico — Gerado em {new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                    {semanticResult && !semanticResult.tagNaoExiste && (
                      <p style={{fontSize: '18px', fontWeight: 'bold', marginTop: '12px', color: '#c44000'}}>Tag analisada: &quot;{semanticResult.tag}&quot;</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE BUSCA SEMÂNTICA — escondida no print */}
                <div className="glass-card p-6 flex gap-4 items-center print:hidden">
                  <Search size={20} className="text-white/30" />
                  <input
                    value={searchTag}
                    onChange={e => setSearchTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
                    placeholder="Buscar tag para análise semântica profunda (ex: espada, liturgia, barroco, cubismo...)"
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-white/30"
                  />
                  <button onClick={handleSemanticSearch} disabled={isAnalyzing} className="liquid-button !bg-[#E85002] !px-8">
                    {isAnalyzing ? 'Analisando...' : 'Analisar'}
                  </button>
                </div>

                {/* DIAGRAMA DE FLUXO DO PIPELINE — escondido no print */}
                <div className="glass-card p-6 print:hidden">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Pipeline de Análise Semântica</p>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${
                      mlChecking ? 'border-white/10 text-white/20' :
                      mlHealth ? 'border-white/20 text-white/40' : 'border-white/10 text-white/20'
                    }`}>
                      {mlChecking ? '—' : mlHealth ? 'ML Service · online' : 'heuristic · fallback'}
                    </span>
                  </div>

                  {/* Fluxo horizontal: entrada → processamento → saída */}
                  <div className="overflow-x-auto">
                    <div className="flex items-start gap-0 min-w-[900px]">

                      {/* Nó 1: Entrada */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-36">
                        <div className="border border-white/20 rounded px-3 py-2 text-center w-full">
                          <p className="text-[10px] font-bold text-white/70">Usuário digita tag</p>
                          {semanticResult && !semanticResult.tagNaoExiste && (
                            <p className="text-[9px] text-[#E85002] mt-1 italic">"{semanticResult.tag}"</p>
                          )}
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex items-start pt-4 flex-shrink-0 w-8 justify-center">
                        <span className="text-white/20 text-xs">→</span>
                      </div>

                      {/* Nó 2: Next.js Pipeline */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-36">
                        <div className="border border-white/20 rounded px-3 py-2 text-center w-full">
                          <p className="text-[10px] font-bold text-white/70">Next.js Pipeline</p>
                          <p className="text-[9px] text-white/30 mt-1">Vercel Serverless</p>
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex items-start pt-4 flex-shrink-0 w-8 justify-center">
                        <span className="text-white/20 text-xs">→</span>
                      </div>

                      {/* Nó 3: Processamento paralelo (4 caixas verticais) */}
                      <div className="flex flex-col gap-2 flex-shrink-0 w-52">
                        {/* ML Service */}
                        <div className="border border-white/20 rounded px-3 py-2">
                          <p className="text-[9px] font-bold text-white/60">ML Service /predict-ner</p>
                          {semanticResult && !semanticResult.tagNaoExiste ? (
                            <p className="text-[9px] text-white/80 mt-1">
                              {mlHealth ? 'ModernBERT' : 'Heurística'}: {
                                semanticResult.tagAnalysis?.family?.name || 'classificando...'
                              }
                            </p>
                          ) : (
                            <p className="text-[9px] text-white/20 mt-1">{mlHealth ? 'modernbert_ner' : 'heuristic_fallback'}</p>
                          )}
                        </div>
                        {/* Tesauro CNFCP */}
                        <div className="border border-white/20 rounded px-3 py-2">
                          <p className="text-[9px] font-bold text-white/60">Tesauro CNFCP</p>
                          {semanticResult && !semanticResult.tagNaoExiste ? (
                            <p className="text-[9px] text-white/70 mt-1">
                              {semanticResult.tesauro?.termoEncontrado
                                ? `Termo mapeado — ${semanticResult.tesauro.termosExpandidos?.length || 0} expansão(ões)`
                                : 'termo não encontrado no tesauro'}
                            </p>
                          ) : (
                            <p className="text-[9px] text-white/20 mt-1">aguardando busca</p>
                          )}
                        </div>
                        {/* IBRAM */}
                        <div className="border border-white/20 rounded px-3 py-2">
                          <p className="text-[9px] font-bold text-white/60">Ibram / Tainacan</p>
                          {semanticResult && !semanticResult.tagNaoExiste ? (
                            <p className="text-[9px] text-white/70 mt-1">
                              {semanticResult.correlacoes?.ibram?.total > 0
                                ? `${semanticResult.correlacoes.ibram.total} registro(s): "${semanticResult.correlacoes.ibram.items?.[0]?.titulo?.slice(0,30) || ''}"`
                                : 'sem resultados'}
                            </p>
                          ) : (
                            <p className="text-[9px] text-white/20 mt-1">aguardando busca</p>
                          )}
                        </div>
                        {/* Brasiliana */}
                        <div className="border border-white/20 rounded px-3 py-2">
                          <p className="text-[9px] font-bold text-white/60">Brasiliana Museus</p>
                          {semanticResult && !semanticResult.tagNaoExiste ? (
                            <p className="text-[9px] text-white/70 mt-1">
                              {semanticResult.correlacoes?.brasiliana?.total > 0
                                ? `${semanticResult.correlacoes.brasiliana.total} registro(s): "${semanticResult.correlacoes.brasiliana.items?.[0]?.titulo?.slice(0,30) || ''}"`
                                : 'sem resultados'}
                            </p>
                          ) : (
                            <p className="text-[9px] text-white/20 mt-1">aguardando busca</p>
                          )}
                        </div>
                        {/* Memória Semântica */}
                        <div className="border border-white/20 rounded px-3 py-2">
                          <p className="text-[9px] font-bold text-white/60">Memória Semântica</p>
                          {semanticResult && !semanticResult.tagNaoExiste ? (
                            <p className="text-[9px] text-white/70 mt-1">
                              {semanticResult.knowledge?.previousCorrelations > 0
                                ? `validado antes: ${semanticResult.knowledge.previousCorrelations} correlação(ões)`
                                : 'primeira análise desta tag'}
                            </p>
                          ) : (
                            <p className="text-[9px] text-white/20 mt-1">aguardando busca</p>
                          )}
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex items-center self-center flex-shrink-0 w-8 justify-center" style={{marginTop: '-40px'}}>
                        <span className="text-white/20 text-xs">→</span>
                      </div>

                      {/* Nó 4: Motor de Confiança */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-44 self-center" style={{marginTop: '-40px'}}>
                        <div className="border border-white/20 rounded px-3 py-2 text-center w-full">
                          <p className="text-[10px] font-bold text-white/70">Motor de Confiança</p>
                          <p className="text-[9px] text-white/40 mt-1">Calibrado</p>
                          {semanticResult && !semanticResult.tagNaoExiste && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[9px] text-white/60">
                                confiança: {semanticResult.layers ? (
                                  `${semanticResult.layers.factual}F + ${semanticResult.layers.inferred}I + ${semanticResult.layers.validated}V`
                                ) : '—'}
                              </p>
                              <p className="text-[9px] text-white/50">
                                status: {semanticResult.profundidade === 'ALTA' ? 'hipotese_forte' : semanticResult.profundidade === 'MÉDIA' ? 'hipotese_parcial' : 'inconclusivo'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex items-center self-center flex-shrink-0 w-8 justify-center" style={{marginTop: '-40px'}}>
                        <span className="text-white/20 text-xs">→</span>
                      </div>

                      {/* Nó 5: Curador valida */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-36 self-center" style={{marginTop: '-40px'}}>
                        <div className="border border-white/20 rounded px-3 py-2 text-center w-full">
                          <p className="text-[10px] font-bold text-white/70">Curador valida</p>
                          <p className="text-[9px] text-white/30 mt-1">Sistema de Validação</p>
                        </div>
                      </div>

                      {/* Seta */}
                      <div className="flex items-center self-center flex-shrink-0 w-8 justify-center" style={{marginTop: '-40px'}}>
                        <span className="text-white/20 text-xs">→</span>
                      </div>

                      {/* Nó 6: Memória salva */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-40 self-center" style={{marginTop: '-40px'}}>
                        <div className="border border-white/20 rounded px-3 py-2 text-center w-full">
                          <p className="text-[10px] font-bold text-white/70">Memória salva</p>
                          <p className="text-[9px] text-white/30 mt-1">Dataset atualizado</p>
                          {semanticResult && !semanticResult.tagNaoExiste && (
                            <p className="text-[9px] text-white/50 mt-1">
                              {semanticResult.knowledge?.learningEvents > 0
                                ? `${semanticResult.knowledge.learningEvents} evento(s)`
                                : 'aguardando validação'}
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* RESULTADOS DA ANÁLISE */}
                {semanticResult && semanticResult.tagNaoExiste && (
                  <div className="glass-card p-12 text-center border-red-500/30 border">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tag não encontrada no sistema</h3>
                    <p className="text-white/50 text-sm max-w-lg mx-auto">A tag <span className="text-red-400 font-bold">&quot;{semanticResult.tag}&quot;</span> não foi criada por nenhum visitante. Crie a tag primeiro pela interface pública.</p>
                  </div>
                )}

                {semanticResult && !semanticResult.tagNaoExiste && (
                  <div className="space-y-6">
                    {/* Header + Profundidade + Camadas */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <h3 className="text-lg font-bold">Resultados para <span className="text-[#E85002] italic font-serif">&quot;{semanticResult.tag}&quot;</span></h3>
                      <div className="flex items-center gap-3">
                        {semanticResult.layers && (
                          <div className="flex gap-2">
                            <span className="px-2 py-1 rounded text-[8px] uppercase font-black tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">Factual: {semanticResult.layers.factual}</span>
                            <span className="px-2 py-1 rounded text-[8px] uppercase font-black tracking-widest bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20">Inferida: {semanticResult.layers.inferred}</span>
                            <span className="px-2 py-1 rounded text-[8px] uppercase font-black tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">Validada: {semanticResult.layers.validated}</span>
                          </div>
                        )}
                        <span className={`px-4 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border ${
                          semanticResult.profundidade === 'ALTA' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                          semanticResult.profundidade === 'MÉDIA' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' :
                          'text-red-500 border-red-500/30 bg-red-500/10'
                        }`}>Profundidade: {semanticResult.profundidade}</span>
                      </div>
                    </div>

                    {/* CORRELAÇÃO INTER-TAGS: duplicatas, erros, famílias */}
                    {semanticResult.tagAnalysis && (semanticResult.tagAnalysis.duplicates?.length > 0 || semanticResult.tagAnalysis.siblings?.length > 0 || semanticResult.tagAnalysis.family) && (
                      <div className="glass-card p-6 border border-purple-500/20 space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Network size={16} className="text-purple-400" /> Análise Inter-Tags (ML)
                        </h4>

                        {/* Duplicatas / Erros ortográficos */}
                        {semanticResult.tagAnalysis.duplicates?.length > 0 && (
                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
                            <p className="text-[10px] uppercase font-black tracking-widest text-red-400 mb-2">Tags Duplicatas / Variantes Detectadas</p>
                            <div className="space-y-2">
                              {semanticResult.tagAnalysis.duplicates.map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-white/80">&quot;{d.tag}&quot;</span>
                                  <span className="text-[9px] text-white/40 italic max-w-[60%] text-right">{d.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Família temática */}
                        {semanticResult.tagAnalysis.family && (
                          <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                            <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-2">Família: {semanticResult.tagAnalysis.family.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {semanticResult.tagAnalysis.family.members.slice(0, 10).map((m: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-[10px] font-bold">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Siblings semânticos */}
                        {semanticResult.tagAnalysis.siblings?.length > 0 && (
                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <p className="text-[10px] uppercase font-black tracking-widest text-blue-400 mb-2">Tags Semanticamente Próximas</p>
                            <div className="space-y-2">
                              {semanticResult.tagAnalysis.siblings.slice(0, 5).map((s: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-white/80">&quot;{s.tag}&quot; <span className="text-[9px] text-white/30">({Math.round(s.score * 100)}%)</span></span>
                                  <span className="text-[9px] text-white/40 italic max-w-[50%] text-right">{s.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sugestões */}
                        {semanticResult.tagAnalysis.suggestions?.length > 0 && (
                          <div className="space-y-1">
                            {semanticResult.tagAnalysis.suggestions.map((s: string, i: number) => (
                              <p key={i} className="text-[10px] text-white/50 italic">→ {s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cards das fontes COM correlações explicadas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['ibram', 'brasiliana', 'auxiliares'].map(fonte => {
                        const data = semanticResult.correlacoes?.[fonte] || { total: 0, items: [], correlations: [] };
                        const label = fonte === 'ibram' ? 'IBRAM / Tainacan' : fonte === 'brasiliana' ? 'Brasiliana Museus' : 'Fontes Auxiliares';
                        return (
                          <div key={fonte} className="glass-card p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-bold uppercase tracking-widest">{label}</h4>
                              <span className="text-[#E85002] font-bold text-lg">{data.total}</span>
                            </div>
                            {fonte === 'ibram' && data.museus?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {data.museus.map((m: string, mi: number) => (
                                  <span key={mi} className="px-2 py-0.5 bg-[#E85002]/10 text-[#E85002] text-[8px] font-bold uppercase rounded">{m}</span>
                                ))}
                              </div>
                            )}
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {data.items?.map((item: any, i: number) => {
                                const corr = data.correlations?.[i];
                                return (
                                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 space-y-2">
                                    <p className="text-sm font-bold leading-tight">{item.titulo}</p>
                                    {item.criador && item.criador !== 'Desconhecido' && <p className="text-[10px] text-[#E85002]">{item.criador}</p>}
                                    {item.museu && <p className="text-[10px] text-white/50">{item.museu} {item.localizacao ? `— ${item.localizacao}` : ''}</p>}
                                    {item.material && <p className="text-[10px] text-white/40">Material: {item.material}</p>}
                                    {item.tecnica && <p className="text-[10px] text-white/40">Técnica: {item.tecnica}</p>}
                                    {item.data && <p className="text-[10px] text-white/40">{item.data}{item.pais ? ` • ${item.pais}` : ''}</p>}
                                    {/* Razões da correlação */}
                                    {corr?.reasons?.length > 0 && (
                                      <div className="pt-2 border-t border-white/5 space-y-1">
                                        {corr.reasons.slice(0, 3).map((r: any, ri: number) => (
                                          <p key={ri} className="text-[9px] text-green-400/80">✓ {r.description}</p>
                                        ))}
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#E85002]" style={{ width: `${(corr.score || 0) * 100}%` }} />
                                          </div>
                                          <span className="text-[8px] text-white/40 font-bold">{Math.round((corr.score || 0) * 100)}%</span>
                                        </div>
                                      </div>
                                    )}
                                    {item.link && <a href={item.link} target="_blank" rel="noopener" className="text-[9px] text-[#E85002] underline block">Ver na fonte →</a>}
                                  </div>
                                );
                              })}
                              {data.total === 0 && <p className="text-white/30 text-xs">Sem resultados</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tesauro CNFCP */}
                    {semanticResult.tesauro?.contexto && (
                      <div className="glass-card p-6 border border-amber-500/20">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-amber-400" /> Tesauro CNFCP / IPHAN
                        </h4>
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                          <pre className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap font-sans">{semanticResult.tesauro.contexto}</pre>
                        </div>
                        {semanticResult.tesauro.termosExpandidos?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold mr-2">Expansão:</span>
                            {semanticResult.tesauro.termosExpandidos.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONEXÕES CRUZADAS ENTRE FONTES */}
                    {semanticResult.crossConnections?.length > 0 && (
                      <div className="glass-card p-6 border border-[#E85002]/20">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Share2 size={16} className="text-[#E85002]" /> Conexões Cruzadas Entre Fontes ({semanticResult.crossConnections.length})
                        </h4>
                        <div className="space-y-3">
                          {semanticResult.crossConnections.slice(0, 5).map((conn: any, i: number) => (
                            <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/5">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase rounded">{conn.sourceA}</span>
                                <span className="text-white/20">↔</span>
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-bold uppercase rounded">{conn.sourceB}</span>
                                <span className="text-[9px] text-white/30 ml-auto">{Math.round(conn.confidence * 100)}% confiança</span>
                              </div>
                              <p className="text-[11px] text-white/70 leading-relaxed">{conn.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags internas */}
                    {semanticResult.correlacoes.internas.total > 0 && (
                      <div className="glass-card p-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Tags internas correlacionadas ({semanticResult.correlacoes.internas.total})</h4>
                        <div className="flex flex-wrap gap-2">
                          {semanticResult.correlacoes.internas.items.map((t: any, i: number) => (
                            <span key={i} className="px-3 py-1 bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20 rounded-full text-[10px] uppercase font-bold">
                              {t.tag_original} → {t.grupo_tematico || 'Outros'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conhecimento acumulado */}
                    {semanticResult.knowledge && (semanticResult.knowledge.previousCorrelations > 0 || semanticResult.knowledge.learningEvents > 0) && (
                      <div className="glass-card p-6 border border-green-500/10">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                          <TrendingUp size={16} className="text-green-400" /> Conhecimento Acumulado
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <p className="text-2xl font-bold text-green-400">{semanticResult.knowledge.previousCorrelations}</p>
                            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Correlações Prévias</p>
                          </div>
                          <div className="text-center p-3 bg-white/5 rounded-lg">
                            <p className="text-2xl font-bold text-green-400">{semanticResult.knowledge.learningEvents}</p>
                            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Eventos de Aprendizado</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Análise escrita */}
                    <div className="glass-card p-8">
                      <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={16} className="text-[#E85002]" /> Análise Escrita (Gerada pelo Motor Semântico)
                      </h4>
                      <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed whitespace-pre-line">
                        {semanticResult.analiseEscrita}
                      </div>
                    </div>
                  </div>
                )}

                {!semanticResult && !isAnalyzing && (
                  <div className="glass-card p-16 text-center">
                    <Search size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Digite uma tag acima e clique em Analisar para ver o cruzamento de dados com IBRAM/Tainacan, Brasiliana e Tesauro CNFCP</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'validacao' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Sistema de Validação (Grafo Ativo)</h2>
                    <div className="flex gap-2">
                       <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-[#E85002] flex items-center gap-2"><Network size={14}/> Explorar Rede</span>
                    </div>
                 </div>
                 
                 {/* O GRAFO ATIVO MOVIDO PARA CÁ COMO PEDIDO NA ETAPA 4 */}
                 <div className="glass-card overflow-hidden h-[600px] relative border border-[#E85002]/30">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E85002]/10 via-transparent to-transparent opacity-50 z-0"></div>
                    <ForceGraph2D
                     graphData={graphData}
                     nodeLabel="id"
                     backgroundColor="transparent"
                     linkColor={() => 'rgba(255,255,255,0.1)'}
                     nodeRelSize={8}
                     nodeCanvasObject={(node: any, ctx, globalScale) => {
                       const label = node.id;
                       const fontSize = 14/globalScale;
                       ctx.font = `${fontSize}px Inter`;
                       
                       // Diferencia nó de Obra (1) e nó de Grupo Temático (2) e nó de Factual (3)
                       ctx.fillStyle = node.group === 1 ? '#ffffff' : node.group === 2 ? '#E85002' : '#aaaaaa';
                       ctx.beginPath(); 
                       ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false); 
                       ctx.fill();
                       
                       ctx.fillStyle = 'rgba(255,255,255,0.9)'; 
                       ctx.fillText(label, node.x + 10, node.y + (fontSize/3));
                     }}
                     onNodeClick={(node: any) => {
                       // Executar análise cerebral do nó clicado
                       handleTagAnalysis(node.id);
                       setGraphNodeSelected(node.id);
                     }}
                     width={1300}
                     height={600}
                   />
                 </div>

                 {/* Modal de Análise Neural do Nó Clicado */}
                 {graphNodeSelected && tagAnalysisResult && !isAnalyzingTag && (
                   <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setGraphNodeSelected(null)}>
                     <div className="glass-card p-8 w-full max-w-2xl relative animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                       <button onClick={() => setGraphNodeSelected(null)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-2xl serif-title uppercase mb-1">Análise Neural</h3>
                       <p className="text-[#E85002] font-bold font-serif italic text-lg mb-6">&quot;{graphNodeSelected}&quot;</p>
                       
                       {/* Família */}
                       {tagAnalysisResult.family && (
                         <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg mb-4">
                           <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-2">Família: {tagAnalysisResult.family.name}</p>
                           <div className="flex flex-wrap gap-2">
                             {tagAnalysisResult.family.members.slice(0, 10).map((m: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-[10px] font-bold">{m}</span>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Conexões */}
                       {(tagAnalysisResult.siblings?.length > 0 || tagAnalysisResult.duplicates?.length > 0) && (
                         <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4 space-y-2">
                           <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-2">Conexões ({tagAnalysisResult.totalRelated})</p>
                           {[...(tagAnalysisResult.duplicates || []), ...(tagAnalysisResult.siblings || [])].slice(0, 6).map((s: any, i: number) => (
                             <div key={i} className="flex items-center justify-between text-sm">
                               <span className="text-white/80 font-serif italic">&quot;{s.tag}&quot;</span>
                               <span className="text-[9px] text-white/40 italic">{s.reason}</span>
                             </div>
                           ))}
                         </div>
                       )}

                       {/* DNA */}
                       {tagAnalysisResult.dna && Object.values(tagAnalysisResult.dna).some((v: any) => v > 0) && (
                         <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4 space-y-2">
                           <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-2">DNA Semântico</p>
                           {Object.entries(tagAnalysisResult.dna).filter(([,v]) => (v as number) > 0).sort(([,a],[,b]) => (b as number) - (a as number)).map(([k,v]) => {
                             const labels: Record<string,string> = { period:'Período', technique:'Técnica', geography:'Geografia', material:'Material', theme:'Temática', movement:'Movimento', provenance:'Proveniência' };
                             return (
                               <div key={k} className="flex items-center gap-2">
                                 <span className="text-[9px] text-white/40 w-20 text-right uppercase font-bold">{labels[k]||k}</span>
                                 <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-[#E85002]" style={{ width: `${(v as number)*100}%` }} />
                                 </div>
                                 <span className="text-[8px] text-white/30 font-bold">{Math.round((v as number)*100)}%</span>
                               </div>
                             );
                           })}
                         </div>
                       )}

                       {/* Ações */}
                       <div className="flex gap-3 mt-4">
                         <button onClick={() => { setSearchTag(graphNodeSelected); setActiveTab('relatorios'); setGraphNodeSelected(null); setTimeout(() => handleSemanticSearch(), 300); }} className="flex-1 liquid-button !bg-[#E85002] text-[10px]">
                           Relatório Semântico Completo
                         </button>
                         <button onClick={() => { setActiveTab('tags'); setGraphNodeSelected(null); }} className="flex-1 liquid-button !bg-white/10 text-[10px]">
                           Ver na Análise de Tags
                         </button>
                       </div>
                     </div>
                   </div>
                 )}

                 {graphNodeSelected && isAnalyzingTag && (
                   <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="glass-card p-12 text-center">
                       <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Cérebro analisando &quot;{graphNodeSelected}&quot;...</p>
                     </div>
                   </div>
                 )}
              </div>
            )}

             {activeTab === 'ontologia' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Ontologias & Vocabulários</h2>
                    <button onClick={() => setShowOntologiaForm(true)} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Ontologia</button>
                 </div>

                 {/* MODAL NOVA ONTOLOGIA */}
                 {showOntologiaForm && (
                   <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-lg relative animate-fade-in">
                       <button onClick={() => setShowOntologiaForm(false)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-2xl serif-title uppercase mb-6">Mapear Nova Ontologia</h3>
                       <form onSubmit={(e) => { e.preventDefault(); alert('Ontologia mapeada com sucesso!'); setShowOntologiaForm(false); }} className="space-y-4">
                         <div>
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Nome da Ontologia / Padrão</label>
                           <input required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Dublin Core" />
                         </div>
                         <div>
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Provedor / Instituição</label>
                           <input required className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: DCMI" />
                         </div>
                         <div>
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">URL do Endpoint (SPARQL/API)</label>
                           <input type="url" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="https://..." />
                         </div>
                         <button type="submit" className="w-full liquid-button !bg-[#E85002] mt-4 flex justify-center items-center gap-2">
                           <Database size={16} /> Iniciar Mapeamento Neural
                         </button>
                       </form>
                     </div>
                   </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'CIDOC-CRM', provider: 'ICOM', terms: 'Conceitos Museais' },
                      { name: 'Tesauro CNFCP/IPHAN', provider: 'IPHAN', terms: 'Vocabulário Controlado' },
                      { name: 'Tainacan Core', provider: 'IBRAM', terms: 'Padrão Brasil' }
                    ].map((o, i) => (
                      <div key={i} className="glass-card p-8 space-y-6 hover:border-[#E85002]/40 group transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                           <Database className="w-8 h-8 opacity-50 text-[#E85002] group-hover:opacity-100 transition-opacity" />
                           <ArrowUpRight size={18} className="text-white/20 group-hover:text-[#E85002]" />
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-lg font-bold leading-tight">{o.name}</h3>
                           <p className="text-[9px] uppercase tracking-widest font-black text-white/30">{o.provider}</p>
                        </div>
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                           <span className="text-green-500">Mapeado no Banco</span>
                           <span className="text-white/40">{o.terms}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'interoperabilidade' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
                    <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Conexões Globais</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: 'Tesauro CNFCP', status: 'Online', delay: '0ms', region: 'BR' },
                      { name: 'IBRAM (Tainacan)', status: 'Online', delay: '210ms', region: 'BR' },
                      { name: 'Getty Museum API', status: 'Offline', delay: '-', region: 'US' },
                      { name: 'DBPedia Sparql', status: 'Online', delay: '89ms', region: 'Global' }
                    ].map((conn, i) => (
                      <div key={i} className="glass-card p-8 flex flex-col items-center gap-6 text-center group hover:bg-white/[0.04]">
                        <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border ${conn.status === 'Online' ? 'border-green-500/20' : 'border-red-500/20'}`}>
                           <Globe size={32} className={conn.status === 'Online' ? 'text-green-500' : 'text-red-500'} />
                           {conn.status === 'Online' && <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse" />}
                        </div>
                        <div>
                           <p className="font-bold text-lg">{conn.name}</p>
                           <p className="text-[9px] uppercase font-black tracking-widest text-white/30">{conn.region}</p>
                        </div>
                        <div className="text-[10px] uppercase font-black tracking-widest flex items-center justify-center gap-4 w-full pt-4 border-t border-white/5">
                           <span className={conn.status === 'Online' ? 'text-green-500' : 'text-red-500'}>{conn.status}</span>
                           <span className="text-white/20">|</span>
                           <span className="text-white/40">{conn.delay}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
