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
  ChevronRight,
  ShieldCheck,
  Network,
  Globe,
  Search
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const tabs = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'obras', label: 'Gestão de Obras' },
  { id: 'tags', label: 'Gestão de Percepções' },
  { id: 'relatorios', label: 'Relatórios & BI' },
  { id: 'validacao', label: 'Sistema de Validação' },
  { id: 'ontologia', label: 'Ontologias' },
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

  const graphData = useMemo(() => ({
    nodes: [
      { id: 'Solidão', val: 20 }, { id: 'Melancolia', val: 15 }, { id: 'Guerra', val: 25 },
      { id: 'Paz', val: 12 }, { id: 'Esperança', val: 18 }, { id: 'Caos', val: 22 },
      { id: 'Fragmento', val: 14 }, { id: 'Cubismo', val: 16 }
    ],
    links: [
      { source: 'Solidão', target: 'Melancolia' }, { source: 'Guerra', target: 'Caos' },
      { source: 'Guerra', target: 'Fragmento' }, { source: 'Caos', target: 'Cubismo' },
      { source: 'Esperança', target: 'Paz' }, { source: 'Melancolia', target: 'Fragmento' }
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
        
        {/* LOGO INSTITUCIONAL (Visível no Print) */}
        <div className="hidden print:flex items-center gap-6 border-b border-black/10 pb-10 mb-10">
          <div className="w-16 h-16 rounded-full bg-[#E85002] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-black/30" />
          </div>
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tighter">Sistema de Folksonomia Digital</h1>
            <p className="text-xs uppercase font-black tracking-[0.3em] text-black/50">Relatório de Gestão Semântica — NUGEP</p>
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
                  ? 'bg-white/10 text-white border border-white/30' 
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
                <button onClick={() => window.print()} className="liquid-button !bg-white/5 flex items-center gap-2 flex-1 md:flex-none justify-center">
                  <FileText size={16} /> PDF
                </button>
                <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
                  <Download size={16} /> Planilha
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-8 md:p-12 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <TrendingUp className="text-[#E85002]" size={18} /> Fluxo Temporal de Percepções
                </h3>
                <div className="h-64 w-full flex items-end gap-3 border-b border-white/10 pb-2">
                  {[45, 60, 30, 85, 50, 100, 75].map((val, i) => (
                    <div key={i} className="flex-1 bg-[#E85002] rounded-t-lg relative group" style={{ height: `${val}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-black text-white/30 uppercase">
                  <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
              </div>

              <div className="glass-card p-8 md:p-12 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-widest">Top Tags</h3>
                <div className="space-y-6">
                  {['Solidão', 'Guerra', 'Paz', 'Caos'].map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase"><span>{t}</span><span className="text-white/40">{100 - i * 15}</span></div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E85002]" style={{ width: `${100 - i * 15}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 glass-card p-8 md:p-12 space-y-8 overflow-hidden h-[500px] relative">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <Network className="text-[#E85002]" size={18} /> Mapa de Correlação Semântica
                </h3>
                <div className="absolute inset-0 pt-20">
                   <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="id"
                    backgroundColor="transparent"
                    linkColor={() => '#ffffff20'}
                    nodeCanvasObject={(node: any, ctx) => {
                      ctx.fillStyle = '#E85002';
                      ctx.beginPath(); ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false); ctx.fill();
                      ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.fillText(node.id, node.x, node.y + 12);
                    }}
                    width={1300}
                    height={400}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validacao' && (
          <div className="space-y-8 animate-fade-in">
             <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Sistema de Validação</h2>
             <div className="glass-card p-12 text-center space-y-6">
                <ShieldCheck size={64} className="mx-auto text-[#E85002] opacity-50" />
                <p className="text-white/50 max-w-md mx-auto">Nenhuma percepção pendente de validação crítica no momento. Todas as tags foram processadas pelo motor Llama 3.3.</p>
             </div>
          </div>
        )}

        {activeTab === 'ontologia' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Ontologias Institucionais</h2>
                <button className="liquid-button !bg-[#E85002]">Nova Ontologia</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['AAT - Getty', 'EuroVoc', 'NUGEP Core', 'UNESCO Thesaurus'].map((o, i) => (
                  <div key={i} className="glass-card p-8 space-y-4 hover:border-[#E85002]/40 transition-all">
                    <h3 className="text-lg font-bold">{o}</h3>
                    <p className="text-xs text-white/40 leading-relaxed uppercase tracking-wider font-bold">Vocabulário controlado para indexação semântica e interoperabilidade.</p>
                    <div className="flex gap-2">
                       <span className="px-3 py-1 bg-white/5 rounded text-[9px] uppercase font-black tracking-widest">Ativo</span>
                       <span className="px-3 py-1 bg-white/5 rounded text-[9px] uppercase font-black tracking-widest text-[#E85002]">Linked Data</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'interoperabilidade' && (
          <div className="space-y-8 animate-fade-in">
             <h2 className="text-3xl font-normal serif-title uppercase tracking-widest text-center">Conexões Externas (Open Data)</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Europeana', status: 'Online', delay: '124ms' },
                  { name: 'IBRAM', status: 'Online', delay: '210ms' },
                  { name: 'Getty Museum', status: 'Offline', delay: '-' },
                  { name: 'DBPedia', status: 'Online', delay: '89ms' }
                ].map((conn, i) => (
                  <div key={i} className="glass-card p-8 flex flex-col items-center gap-4 text-center">
                    <Globe size={32} className={conn.status === 'Online' ? 'text-green-500' : 'text-red-500'} />
                    <p className="font-bold">{conn.name}</p>
                    <div className="text-[10px] uppercase font-black tracking-widest flex gap-2">
                       <span className={conn.status === 'Online' ? 'text-green-500' : 'text-red-500'}>{conn.status}</span>
                       <span className="text-white/20">|</span>
                       <span className="text-white/40">{conn.delay}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'obras' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Gestão de Obras</h2>
                <button onClick={() => setShowAddForm(!showAddForm)} className="liquid-button !bg-[#E85002]">Adicionar Obra</button>
             </div>
             <div className="glass-card p-12 text-center text-white/30 uppercase tracking-widest font-black text-xs">Carregando acervo institucional...</div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-8 animate-fade-in">
             <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Gestão de Percepções</h2>
             <div className="glass-card overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-black text-white/40 tracking-widest">
                    <tr><th className="px-10 py-6">Visitante</th><th className="px-10 py-6">Tag</th><th className="px-10 py-6">Status</th><th className="px-10 py-6">Ação</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {['#A2', '#B5', '#C1', '#D4'].map((v, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-all">
                        <td className="px-10 py-8 font-bold">Visitante {v}</td>
                        <td className="px-10 py-8 serif-title text-lg">Percepção Simulada {i}</td>
                        <td className="px-10 py-8"><span className="px-3 py-1 bg-white/5 rounded text-[9px] uppercase font-black tracking-widest">Processado</span></td>
                        <td className="px-10 py-8"><button className="liquid-button !py-2 !px-4 !text-[10px]">Ver DNA</button></td>
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
