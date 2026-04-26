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
  Search,
  ArrowUpRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Unified SVG Logo Component (Minimalist & Modern)
const InstitutionalLogo = ({ className = "w-10 h-10" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <text 
        x="50%" 
        y="65%" 
        textAnchor="middle" 
        fill="#E85002" 
        style={{ fontFamily: "'Times New Roman', serif", fontSize: '80px', fontWeight: 'normal' }}
      >
        f
      </text>
    </svg>
  </div>
);




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
    { label: 'Visitantes Ativos', value: '1,248', icon: Users, color: '#E85002' },
    { label: 'Percepções Registradas', value: '3,840', icon: TagIcon, color: '#E85002' },
    { label: 'Aguardando Curadoria', value: '156', icon: Clock, color: '#C10801' },
  ];

  const graphData = useMemo(() => ({
    nodes: [
      { id: 'Solidão', val: 25 }, { id: 'Melancolia', val: 18 }, { id: 'Guerra', val: 30 },
      { id: 'Paz', val: 15 }, { id: 'Esperança', val: 20 }, { id: 'Caos', val: 28 },
      { id: 'Fragmento', val: 16 }, { id: 'Cubismo', val: 22 }, { id: 'Luta', val: 12 },
      { id: 'Pânico', val: 14 }
    ],
    links: [
      { source: 'Solidão', target: 'Melancolia' }, { source: 'Guerra', target: 'Caos' },
      { source: 'Guerra', target: 'Fragmento' }, { source: 'Caos', target: 'Cubismo' },
      { source: 'Esperança', target: 'Paz' }, { source: 'Melancolia', target: 'Fragmento' },
      { source: 'Guerra', target: 'Luta' }, { source: 'Caos', target: 'Pânico' }
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
        
        {/* LOGO INSTITUCIONAL (Visível no Print e UI) */}
        <div className="flex items-center gap-6 pb-6 border-b border-white/5 print:border-black/10 print:pb-10 print:mb-10">
          <InstitutionalLogo className="w-12 h-12 md:w-16 md:h-16" />
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
                  <FileText size={16} /> Exportar PDF
                </button>
                <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
                  <Download size={16} /> Planilha Excel
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
                    <div key={i} className="flex-1 bg-gradient-to-t from-[#E85002] to-[#F16001] rounded-t-lg relative group" style={{ height: `${val}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-black text-white/30 uppercase tracking-widest">
                  <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
              </div>

              <div className="glass-card p-8 md:p-12 space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-widest">Principais Conceitos</h3>
                <div className="space-y-6">
                  {['Solidão', 'Guerra', 'Paz', 'Caos', 'Esperança'].map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                        <span>{t}</span>
                        <span className="text-white/40">{100 - i * 12}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#E85002] transition-all duration-1000" style={{ width: `${100 - i * 12}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 glass-card p-8 md:p-12 space-y-8 overflow-hidden h-[550px] relative">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 relative z-10">
                  <Network className="text-[#E85002]" size={18} /> Mapa de Correlação Semântica
                </h3>
                <div className="absolute inset-0 pt-20">
                   <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="id"
                    backgroundColor="transparent"
                    linkColor={() => 'rgba(255,255,255,0.1)'}
                    nodeCanvasObject={(node: any, ctx) => {
                      ctx.fillStyle = '#E85002';
                      ctx.beginPath(); ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false); ctx.fill();
                      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '10px Inter'; ctx.fillText(node.id, node.x, node.y + 14);
                    }}
                    width={1300}
                    height={450}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'validacao' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Sistema de Validação</h2>
                <div className="flex gap-2">
                   <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-widest">Fila: 156 pendentes</span>
                </div>
             </div>
             <div className="glass-card p-4 md:p-8 overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-black text-white/40 tracking-widest">
                    <tr>
                      <th className="px-6 py-6">Percepção Original</th>
                      <th className="px-6 py-6"> डीएनए DNA Semântico</th>
                      <th className="px-6 py-6">Confiança IA</th>
                      <th className="px-6 py-6">Ações Curador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { original: 'Grito de dor mudo', dna: 'trauma; angústia; pânico', conf: '94%' },
                      { original: 'Esperança no amanhã', dna: 'futuro; luz; otimismo', conf: '88%' },
                      { original: 'Caos geométrico', dna: 'abstração; desordem; cubismo', conf: '91%' }
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-all">
                        <td className="px-6 py-8 italic font-serif text-lg">"{row.original}"</td>
                        <td className="px-6 py-8">
                           <div className="flex gap-2">
                              {row.dna.split('; ').map(t => <span key={t} className="px-3 py-1 bg-[#E85002]/10 text-[#E85002] rounded-full text-[9px] uppercase font-black">{t}</span>)}
                           </div>
                        </td>
                        <td className="px-6 py-8 font-mono text-[#E85002] font-bold">{row.conf}</td>
                        <td className="px-6 py-8">
                           <div className="flex gap-3">
                              <button className="px-4 py-2 bg-white/10 rounded-lg text-[9px] uppercase font-bold hover:bg-white/20 transition-all">Validar</button>
                              <button className="px-4 py-2 border border-white/5 rounded-lg text-[9px] uppercase font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">Descartar</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'ontologia' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Ontologias & Vocabulários</h2>
                <button className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Ontologia</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'AAT - Art & Architecture Thesaurus', provider: 'Getty Research', terms: '350k' },
                  { name: 'UNESCO Thesaurus', provider: 'UNESCO', terms: '7k' },
                  { name: 'Iconclass', provider: 'Iconclass', terms: '28k' },
                  { name: 'NUGEP Internal Core', provider: 'Institucional', terms: '4.2k' }
                ].map((o, i) => (
                  <div key={i} className="glass-card p-8 space-y-6 hover:border-[#E85002]/40 group transition-all cursor-pointer">
                    <div className="flex justify-between items-start">
                       <InstitutionalLogo className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                       <ArrowUpRight size={18} className="text-white/20 group-hover:text-[#E85002]" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-lg font-bold leading-tight">{o.name}</h3>
                       <p className="text-[9px] uppercase tracking-widest font-black text-white/30">{o.provider}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-black tracking-widest">
                       <span className="text-green-500">Conectado via SPARQL</span>
                       <span className="text-white/40">{o.terms} termos</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'interoperabilidade' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Conexões Globais (Open Data)</h2>
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Monitoramento de interoperabilidade em tempo real com fontes de dados culturais externos.</p>
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

        {/* Previous modules (Obras and Tags) preserved with updated styles */}
        {activeTab === 'obras' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Gestão de Acervo</h2>
                <button onClick={() => setShowAddForm(!showAddForm)} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Obra</button>
             </div>
             <div className="glass-card p-12 text-center">
                <Search size={48} className="mx-auto text-white/10 mb-6" />
                <p className="text-white/30 uppercase tracking-widest font-black text-xs">Acessando banco de dados Supabase...</p>
             </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-8 animate-fade-in">
             <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Curadoria de Percepções</h2>
             <div className="glass-card overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-black text-white/40 tracking-widest">
                    <tr><th className="px-10 py-6">Visitante</th><th className="px-10 py-6">Percepção</th><th className="px-10 py-6">Status Semântico</th><th className="px-10 py-6">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {['#A2', '#B5', '#C1', '#D4'].map((v, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-all">
                        <td className="px-10 py-8 font-bold">Participante {v}</td>
                        <td className="px-10 py-8 serif-title text-xl">"A geometria do medo"</td>
                        <td className="px-10 py-8"><span className="px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-[9px] uppercase font-black tracking-widest border border-green-500/20">Vinculado</span></td>
                        <td className="px-10 py-8"><button className="liquid-button !py-2 !px-4 !text-[10px]">Ver Detalhes</button></td>
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
