'use client';

import { useState, useMemo } from 'react';
import { 
  Users, 
  Tag as TagIcon, 
  Database, 
  BarChart3, 
  Plus, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Download,
  Share2,
  TrendingUp,
  Clock,
  PieChart as PieIcon,
  CheckCircle2,
  Settings,
  ChevronRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const tabs = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'obras', label: 'Gestão de Obras' },
  { id: 'tags', label: 'Gestão de Percepções' },
  { id: 'relatorios', label: 'Relatórios & BI' },
  { id: 'validacao', label: 'Sistema de Validação' },
  { id: 'ontologia', label: 'Vocabulários' },
  { id: 'interoperabilidade', label: 'Conexões Externas' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('visao');
  const [showAddForm, setShowAddForm] = useState(false);

  const stats = [
    { label: 'Obras no Sistema', value: '42', icon: Database, color: '#E85002' },
    { label: 'Visitantes Ativos', value: '1.2k', icon: Users, color: '#E85002' },
    { label: 'Percepções Registradas', value: '3,840', icon: TagIcon, color: '#E85002' },
    { label: 'Aguardando Curadoria', value: '156', icon: Clock, color: '#C10801' },
  ];

  // Mock data for the network graph
  const graphData = useMemo(() => {
    const nodes = [
      { id: 'Solidão', val: 20 }, { id: 'Melancolia', val: 15 }, { id: 'Guerra', val: 25 },
      { id: 'Paz', val: 12 }, { id: 'Esperança', val: 18 }, { id: 'Caos', val: 22 },
      { id: 'Fragmento', val: 14 }, { id: 'Cubismo', val: 16 }
    ];
    const links = [
      { source: 'Solidão', target: 'Melancolia' },
      { source: 'Guerra', target: 'Caos' },
      { source: 'Guerra', target: 'Fragmento' },
      { source: 'Caos', target: 'Cubismo' },
      { source: 'Esperança', target: 'Paz' },
      { source: 'Melancolia', target: 'Fragmento' }
    ];
    return { nodes, links };
  }, []);

  const handleExportCSV = () => {
    const data = [
      ['ID', 'Obra', 'Tag', 'Visitante', 'Data'],
      ['1', 'Guernica', 'Caos', 'Visitante #A2', '2026-04-26'],
      ['2', 'Guernica', 'Dor', 'Visitante #B5', '2026-04-26']
    ];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio_folksonomia.csv';
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 md:px-8 print:pt-0">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
        
        {/* Header with Logo for Print */}
        <div className="hidden print:flex items-center justify-between border-b pb-8 mb-8 border-black/10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-[#E85002] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-black/40" />
             </div>
             <div>
                <h1 className="text-2xl font-bold uppercase tracking-tight">Sistema de Folksonomia Digital</h1>
                <p className="text-[10px] uppercase font-black tracking-widest text-black/40">Relatório Institucional — NUGEP</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-xs font-bold">{new Date().toLocaleDateString()}</p>
             <p className="text-[10px] text-black/40 uppercase">Acesso Autorizado: Admin</p>
          </div>
        </div>

        {/* Tab Navigation (Hidden in Print) */}
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

        {activeTab === 'relatorios' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
              <h2 className="text-2xl md:text-3xl font-normal serif-title uppercase tracking-widest">Business Intelligence</h2>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={handleExportPDF} className="liquid-button !bg-white/5 flex items-center gap-2 flex-1 md:flex-none justify-center">
                  <FileText size={16} /> PDF
                </button>
                <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
                  <Download size={16} /> Planilha
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Análise Temporal */}
              <div className="lg:col-span-2 glass-card p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4">
                  <TrendingUp className="text-[#E85002]" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Fluxo Temporal de Percepções</h3>
                </div>
                <div className="h-64 w-full flex items-end gap-2 md:gap-4 border-b border-white/10 pb-2">
                  {[45, 60, 30, 85, 50, 100, 75].map((val, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-[#E85002] to-[#F16001] rounded-t-lg transition-all hover:brightness-125 relative group" style={{ height: `${val}%` }}>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[10px] font-bold px-2 py-1 rounded">
                        {val * 10}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                  <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
              </div>

              {/* Top Tags */}
              <div className="glass-card p-8 md:p-12 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-widest">Tags em Destaque</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Solidão', count: 142, color: '#E85002' },
                    { label: 'Guerra', count: 98, color: '#C10801' },
                    { label: 'Esperança', count: 86, color: '#D9C3AB' },
                    { label: 'Fragmento', count: 74, color: '#F16001' },
                  ].map((tag, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                        <span>{tag.label}</span>
                        <span className="text-white/40">{tag.count}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-current transition-all duration-1000" style={{ width: `${(tag.count / 142) * 100}%`, color: tag.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlação Semântica (Rede) */}
              <div className="lg:col-span-3 glass-card p-8 md:p-12 space-y-8 overflow-hidden h-[600px] relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Share2 className="text-[#E85002]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Mapa de Correlação Semântica (Clusterização)</h3>
                  </div>
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Llama 3.3 Graph Visualization</p>
                </div>
                <div className="absolute inset-0 pt-24">
                   <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="id"
                    nodeAutoColorBy="group"
                    backgroundColor="transparent"
                    linkColor={() => '#ffffff20'}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                      const label = node.id;
                      const fontSize = 12/globalScale;
                      ctx.font = `${fontSize}px Arial`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = '#E85002';
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                      ctx.fill();
                      ctx.fillStyle = 'rgba(255,255,255,0.7)';
                      ctx.fillText(label, node.x, node.y + 10);
                    }}
                    width={1300}
                    height={500}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... Rest of existing tabs (obras, tags, etc.) ... */}
        {activeTab === 'obras' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-2xl md:text-3xl font-normal serif-title uppercase tracking-widest">Acervo</h2>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="liquid-button !bg-[#E85002] !text-white !border-none !rounded-full flex items-center gap-3 w-full md:w-auto justify-center"
              >
                <Plus size={16} /> Adicionar Obra
              </button>
            </div>
            {/* Form logic remains same */}
            <div className="space-y-4 md:space-y-6">
               <div className="glass-card p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 group">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full md:w-auto text-center md:text-left">
                    <div className="relative w-full md:w-48 h-40 md:h-28 rounded-xl overflow-hidden border border-white/10">
                      <img src="https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight">Guernica</h3>
                      <p className="text-white/40 text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1 md:mt-2">Pablo Picasso — 1937</p>
                    </div>
                  </div>
                  <button className="liquid-button !bg-red-500/10 !text-red-400 !border-red-500/20 px-8 py-3 !rounded-full text-[10px] uppercase font-bold w-full md:w-auto">
                    Remover
                  </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-normal serif-title uppercase tracking-widest text-center md:text-left">Percepções</h2>
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-white/5 border-b border-white/10 text-[9px] md:text-[10px] uppercase tracking-widest font-black text-white/50">
                  <tr>
                    <th className="px-6 md:px-10 py-6">Visitante</th>
                    <th className="px-6 md:px-10 py-6">Tag</th>
                    <th className="px-6 md:px-10 py-6">Ressonância</th>
                    <th className="px-6 md:px-10 py-6">Status</th>
                    <th className="px-6 md:px-10 py-6">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { user: 'Visitante #A2', tag: 'Mamãe', score: '98%', status: 'Vinculado' },
                    { user: 'Visitante #B5', tag: 'Solidão', score: '45%', status: 'Em Análise' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 md:px-10 py-6 md:py-8 font-bold text-white/60">{row.user}</td>
                      <td className="px-6 md:px-10 py-6 md:py-8 serif-title text-base md:text-lg">{row.tag}</td>
                      <td className="px-6 md:px-10 py-6 md:py-8"><span className="text-[#E85002] font-mono font-bold">{row.score}</span></td>
                      <td className="px-6 md:px-10 py-6 md:py-8"><span className="px-3 py-1 rounded-full bg-white/5 text-[8px] md:text-[9px] font-black uppercase border border-white/10">{row.status}</span></td>
                      <td className="px-6 md:px-10 py-6 md:py-8">
                        <button className="liquid-button !py-2 !px-4 !text-[8px] md:!text-[9px] !rounded-lg">Validar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
