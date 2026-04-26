'use client';

import { useState } from 'react';
import { 
  Database, Users, Tag, Clock, CheckCircle2, 
  Settings, Globe, ShieldCheck, Plus, Trash2, Link as LinkIcon
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('visao');
  const [showAddForm, setShowAddForm] = useState(false);

  const stats = [
    { label: 'Obras no Sistema', value: '5', icon: Database, color: '#E85002' },
    { label: 'Visitantes Ativos', value: '3', icon: Users, color: '#E85002' },
    { label: 'Percepções Registradas', value: '12', icon: Tag, color: '#E85002' },
    { label: 'Aguardando Curadoria', value: '4', icon: Clock, color: '#C10801' },
    { label: 'Núcleos Consolidados', value: '8', icon: CheckCircle2, color: '#E85002' },
    { label: 'Vocabulários', value: '12', icon: Settings, color: '#E85002' },
    { label: 'Conexões Open Data', value: '6', icon: Globe, color: '#E85002' },
    { label: 'Integridade da Rede', value: '100%', icon: ShieldCheck, color: '#E85002' },
  ];

  const tabs = [
    { id: 'visao', label: 'Visão Geral' },
    { id: 'obras', label: 'Gestão de Obras' },
    { id: 'tags', label: 'Gestão de Percepções' },
    { id: 'validacao', label: 'Sistema de Validação' },
    { id: 'ontologias', label: 'Vocabulários' },
    { id: 'interoperabilidade', label: 'Conexões Externas' },
  ];

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
        
        {/* Header Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/5">
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

            {showAddForm && (
              <div className="glass-card p-6 md:p-10 border-[#E85002]/30 space-y-6 md:space-y-8 animate-fade-in">
                <h3 className="text-[10px] md:text-sm font-bold uppercase tracking-widest">Novo Registro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <input type="text" placeholder="Título da Obra" className="liquid-input w-full" />
                  <input type="text" placeholder="Artista" className="liquid-input w-full" />
                  <input type="text" placeholder="Ano" className="liquid-input w-full" />
                  <input type="text" placeholder="URL da Imagem" className="liquid-input w-full" />
                  <textarea placeholder="Descrição Institucional" className="liquid-input w-full md:col-span-2 h-24 md:h-32" />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <button className="liquid-button !bg-white !text-black font-bold">Salvar Obra</button>
                  <button onClick={() => setShowAddForm(false)} className="liquid-button !bg-transparent border-white/10">Cancelar</button>
                </div>
              </div>
            )}
            
            <div className="space-y-4 md:space-y-6">
              {[
                { id: 1, titulo: 'Guernica', artista: 'Pablo Picasso', ano: '1937', img: 'https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg' },
                { id: 2, titulo: 'A Noite Estrelada', artista: 'Vincent van Gogh', ano: '1889', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' }
              ].map(obra => (
                <div key={obra.id} className="glass-card p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-white/20 transition-all">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full md:w-auto text-center md:text-left">
                    <div className="relative w-full md:w-48 h-40 md:h-28 rounded-xl overflow-hidden border border-white/10">
                      <img src={obra.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight">{obra.titulo}</h3>
                      <p className="text-white/40 text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] mt-1 md:mt-2">{obra.artista} — {obra.ano}</p>
                    </div>
                  </div>
                  <button className="liquid-button !bg-red-500/10 !text-red-400 !border-red-500/20 px-8 py-3 !rounded-full text-[10px] uppercase font-bold hover:!bg-red-500/20 w-full md:w-auto">
                    Remover
                  </button>
                </div>
              ))}
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


        {activeTab === 'interoperabilidade' && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-normal serif-title uppercase tracking-widest">Conexões Globais (Open Data)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {['Europeana', 'IBRAM', 'Wikidata', 'Getty Vocabularies', 'Biblioteca Nacional', 'Tainacan Network'].map(source => (
                <div key={source} className="glass-card p-10 flex flex-col items-center justify-center space-y-6 text-center border-white/5 group hover:border-[#E85002]/40 transition-all">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <Globe size={32} className="text-[#E85002]/60 group-hover:text-[#E85002] transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold">{source}</h3>
                  <div className="px-4 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase">Sincronizado</div>
                  <button className="liquid-button !py-2 !px-6 !text-[9px] !rounded-full !bg-white/5">Ver Conexões</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing modules re-integrated */}
        {activeTab === 'validacao' && (
          <div className="space-y-8 animate-fade-in">
             <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-normal serif-title uppercase tracking-wider">Motor Semântico de Validação</h2>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Núcleo Informacional • Llama 3.3 & DNA Semântico</p>
              </div>
              <button className="liquid-button !bg-[#E85002] !text-white text-[10px] !rounded-full">Processar Redes</button>
            </div>
            <div className="glass-card p-12 text-center py-32">
              <ShieldCheck className="mx-auto text-[#E85002] mb-8" size={64} />
              <p className="text-white/40 uppercase tracking-[0.4em] text-xs font-black">Sistema de Validação Multicamada Ativo</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
