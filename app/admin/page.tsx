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

  useEffect(() => {
    async function fetchDashboard() {
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
    }
    fetchDashboard();
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

  const stats = [
    { label: 'Volume de Dados', value: dashboardData?.visaoGeral.totalDados || 0, icon: Database, color: '#E85002' },
    { label: 'Usuários Únicos', value: dashboardData?.visaoGeral.usuarios || 0, icon: Users, color: '#E85002' },
    { label: 'Tags Criadas', value: dashboardData?.visaoGeral.tags || 0, icon: TagIcon, color: '#E85002' },
    { label: 'Registros Validados', value: dashboardData?.visaoGeral.validados || 0, icon: ShieldCheck, color: '#00FF00' },
  ];

  const graphData = useMemo(() => ({
    nodes: [
      { id: 'Cálice Colonial', group: 1, val: 20 }, 
      { id: 'Liturgia', group: 2, val: 30 }, 
      { id: 'Jesuítico', group: 2, val: 25 },
      { id: 'Ouro', group: 3, val: 15 }, 
      { id: 'Cruz Processional', group: 1, val: 18 }
    ],
    links: [
      { source: 'Cálice Colonial', target: 'Liturgia' }, 
      { source: 'Cálice Colonial', target: 'Jesuítico' },
      { source: 'Cruz Processional', target: 'Liturgia' }, 
      { source: 'Cálice Colonial', target: 'Ouro' }
    ]
  }), []);

  const handleExportCSV = () => {
    const data = [['ID', 'Obra', 'Tag', 'Visitante', 'Data'], ['1', 'Guernica', 'Caos', 'Visitante #A2', '2026-04-26']];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio_folksonomia.csv'; a.click();
  };

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 print:pt-0">
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
                           <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest">URL da Imagem</label>
                           <input value={obraForm.imagem_url} onChange={e => setObraForm({...obraForm, imagem_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="https://..." />
                         </div>
                         <button disabled={isSubmitting} type="submit" className="w-full liquid-button !bg-[#E85002] mt-4">
                           {isSubmitting ? 'Salvando...' : 'Salvar Obra no Supabase'}
                         </button>
                       </form>
                     </div>
                   </div>
                 )}

                 <div className="glass-card p-12 text-center">
                    <Database size={48} className="mx-auto text-white/10 mb-6" />
                    <p className="text-white/30 uppercase tracking-widest font-black text-xs">Exibição de galeria de obras (conectado via API)...</p>
                 </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                   <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Análise de Tags</h2>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="glass-card p-8">
                     <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 mb-6">
                       <TagIcon className="text-[#E85002]" size={18} /> Correlações Recentes
                     </h3>
                     <div className="space-y-4">
                       {/* Simulação de correlação requerida pelo usuário */}
                       <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                         <div>
                           <div className="flex items-center gap-2">
                             <span className="text-[#E85002] font-serif italic text-lg">"meu deus"</span>
                             <span className="text-white/40 text-xs font-mono">≈</span>
                             <span className="text-[#E85002] font-serif italic text-lg">"deus lindo"</span>
                           </div>
                           <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mt-1">Agrupado como: Admiração Religiosa</p>
                         </div>
                         <button className="px-3 py-1 bg-white/10 rounded text-[9px] uppercase font-bold">Ver Grupo</button>
                       </div>
                       
                       <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                         <div>
                           <div className="flex items-center gap-2">
                             <span className="text-[#E85002] font-serif italic text-lg">"sofrimento"</span>
                             <span className="text-white/40 text-xs font-mono">≈</span>
                             <span className="text-[#E85002] font-serif italic text-lg">"grito de dor mudo"</span>
                           </div>
                           <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mt-1">Agrupado como: Angústia</p>
                         </div>
                         <button className="px-3 py-1 bg-white/10 rounded text-[9px] uppercase font-bold">Ver Grupo</button>
                       </div>
                     </div>
                   </div>
                   
                   <div className="glass-card p-8">
                     <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Volume por Grupo Temático</h3>
                     <div className="space-y-4">
                       {dashboardData?.relatorioSemantico?.topConceitos?.map((c: any, i: number) => (
                         <div key={i} className="space-y-2">
                           <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                             <span>{c.nome}</span>
                             <span className="text-white/40">{c.valor} tags</span>
                           </div>
                           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-[#E85002]" style={{ width: `${Math.min((c.valor / 100) * 100, 100)}%` }} />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'relatorios' && (
              <RelatorioSemanticoTab dashboardData={dashboardData} handleExportCSV={handleExportCSV} />
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
                       alert(`[Ação do Curador via Grafo] - Modal de validação abriria aqui para o nó: ${node.id}`);
                     }}
                     width={1300}
                     height={600}
                   />
                 </div>
              </div>
            )}

            {activeTab === 'ontologia' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Ontologias & Vocabulários</h2>
                    <button onClick={() => alert('Modal para adicionar Ontologia')} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Ontologia</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'CIDOC-CRM', provider: 'ICOM', terms: 'Conceitos Museais' },
                      { name: 'Europeana Data Model (EDM)', provider: 'Europeana', terms: 'Agregador Europeu' },
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
                      { name: 'Europeana API', status: 'Online', delay: '124ms', region: 'EU' },
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
    </main>
  );
}

// ============================================================
// Componente: Relatório Semântico (Motor de Análise Profunda)
// ============================================================

function RelatorioSemanticoTab({ dashboardData, handleExportCSV }: { dashboardData: any; handleExportCSV: () => void }) {
  const [searchTag, setSearchTag] = useState('');
  const [analiseData, setAnaliseData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalise, setSelectedAnalise] = useState<any>(null);

  const runAnalise = async (query?: string) => {
    setIsAnalyzing(true);
    setSelectedAnalise(null);
    try {
      const params = query ? `?tag=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/admin/relatorio-semantico${params}`);
      const json = await res.json();
      if (json.success) {
        setAnaliseData(json.data);
        if (json.data.analises.length > 0) {
          setSelectedAnalise(json.data.analises[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao analisar:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => { runAnalise(); }, []);

  const sourceColors: Record<string, string> = {
    europeana: '#4A90D9',
    ibram: '#27AE60',
    brasiliana: '#E67E22'
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-normal serif-title uppercase tracking-widest">Relatório Semântico</h2>
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mt-1">Análise profunda com cruzamento de dados — ModernBERT + RotatE + GAT</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => window.print()} className="liquid-button !bg-white/5 flex items-center gap-2 flex-1 md:flex-none justify-center">
            <FileText size={16} /> PDF
          </button>
          <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-6 flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchTag}
            onChange={e => setSearchTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runAnalise(searchTag)}
            placeholder="Buscar tag para análise semântica profunda (ex: espada, liturgia, barroco...)"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-sm focus:border-[#E85002] outline-none placeholder:text-white/20"
          />
        </div>
        <button onClick={() => runAnalise(searchTag)} disabled={isAnalyzing} className="liquid-button !bg-[#E85002] px-8">
          {isAnalyzing ? 'Analisando...' : 'Analisar'}
        </button>
      </div>

      {/* ML Models Status */}
      {analiseData?.metaAnalise && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analiseData.metaAnalise.modelosUtilizados.map((m: any, i: number) => (
            <div key={i} className="glass-card p-6 flex items-center gap-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-bold">{m.nome}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{m.funcao}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Cruzando dados com Europeana, IBRAM e Brasiliana...</p>
        </div>
      )}

      {!isAnalyzing && analiseData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Tag List */}
          <div className="glass-card p-6 space-y-4 max-h-[700px] overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              Tags Analisadas ({analiseData.analises.length})
            </h3>
            {analiseData.analises.map((a: any, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedAnalise(a)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedAnalise === a 
                    ? 'bg-[#E85002]/10 border-[#E85002]/40' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <p className="font-serif italic text-lg text-[#E85002]">"{a.tag.original}"</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mt-1">{a.tag.obra}</p>
                <div className="flex gap-2 mt-2">
                  {a.dnaSemantico.fontesDeCruzamento.map((f: string) => (
                    <span key={f} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase" style={{ backgroundColor: `${sourceColors[f.toLowerCase()] || '#666'}20`, color: sourceColors[f.toLowerCase()] || '#666' }}>
                      {f}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] font-bold mt-2 text-white/30">{a.conexoes.total} conexões detectadas</p>
              </button>
            ))}
          </div>

          {/* Right: Deep Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAnalise ? (
              <>
                {/* DNA Header */}
                <div className="glass-card p-8 border-l-4 border-[#E85002]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-serif italic">"{selectedAnalise.tag.original}"</h3>
                      <p className="text-sm text-white/50 mt-1">Obra: <span className="text-white/80">{selectedAnalise.tag.obra}</span></p>
                      {selectedAnalise.tag.grupo && (
                        <p className="text-sm text-white/50">Grupo Temático: <span className="text-[#E85002]">{selectedAnalise.tag.grupo}</span></p>
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                      selectedAnalise.dnaSemantico.profundidade === 'alta' ? 'bg-green-500/10 text-green-500 border border-green-500/30' :
                      selectedAnalise.dnaSemantico.profundidade === 'média' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30' :
                      'bg-red-500/10 text-red-500 border border-red-500/30'
                    }`}>
                      Profundidade: {selectedAnalise.dnaSemantico.profundidade}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Palavras-chave extraídas:</span>
                    {selectedAnalise.keywords.map((kw: string) => (
                      <span key={kw} className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono">{kw}</span>
                    ))}
                  </div>
                </div>

                {/* Conexões por Fonte */}
                {['europeana', 'ibram', 'brasiliana'].map(source => {
                  const hits = selectedAnalise.conexoes[source];
                  if (!hits || hits.length === 0) return null;
                  const color = sourceColors[source];
                  const label = source === 'europeana' ? 'Europeana' : source === 'ibram' ? 'IBRAM' : 'Brasiliana';
                  
                  return (
                    <div key={source} className="glass-card p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <h4 className="text-sm font-bold uppercase tracking-widest">{label}</h4>
                        <span className="text-[10px] text-white/30 font-bold">{hits.length} resultado(s)</span>
                      </div>
                      
                      {hits.map((hit: any, j: number) => (
                        <div key={j} className="border border-white/10 rounded-lg p-5 space-y-3 bg-white/[0.02]">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-lg">{hit.titulo}</p>
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                {hit.tipo} · {hit.periodo} · {hit.colecao || hit.acervo || ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold" style={{ color }}>{Math.round(hit.relevancia * 100)}%</p>
                              <p className="text-[9px] text-white/30 uppercase font-bold">Relevância</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            {hit.palavrasCorrelacionadas.map((p: string) => (
                              <span key={p} className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ backgroundColor: `${color}20`, color }}>
                                {p}
                              </span>
                            ))}
                          </div>
                          
                          {/* ANÁLISE ESCRITA DETALHADA */}
                          <div className="bg-white/5 rounded-lg p-4 border-l-2 mt-2" style={{ borderColor: color }}>
                            <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-2">Análise Semântica (ModernBERT + RotatE)</p>
                            <p className="text-sm text-white/70 leading-relaxed font-serif italic">{hit.analise}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* DNA Evolution Note */}
                <div className="glass-card p-6 border border-[#E85002]/20 bg-[#E85002]/5">
                  <div className="flex items-start gap-4">
                    <Network size={24} className="text-[#E85002] mt-1 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#E85002] mb-2">DNA Semântico em Evolução</p>
                      <p className="text-sm text-white/60 leading-relaxed">{selectedAnalise.dnaSemantico.evolucao}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-20 text-center">
                <Search size={48} className="mx-auto text-white/10 mb-6" />
                <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Selecione uma tag ou busque para ver a análise semântica profunda</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
