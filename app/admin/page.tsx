'use client';

import { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { 
  Activity, Tag, Users, BookOpen, BarChart3, 
  Search, Link as LinkIcon, ClipboardList, Settings, 
  CheckCircle, Network, Download 
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Visão Geral');
  const [stats, setStats] = useState({
    totalTags: 0,
    tagsUnicas: 0,
    participantes: 1,
    obras: 3,
    media: 0.0
  });

  const tabs = [
    'Visão Geral', 'Análise de Tags', 'Conexões de Tags', 
    'Usuários & Questionário', 'Ontologias', 'Validação & Auditoria', 
    'Grafo & Open Data', 'Obras', 'Exportar'
  ];

  return (
    <main className="min-h-screen bg-[#000814] text-white font-sans">
      
      {/* Header Info */}
      <div className="pt-10 pb-6 text-center">
        <p className="text-sm font-light text-white/60">Bem-vindo, <span className="font-bold text-white">nugep</span></p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-[95%] mx-auto mb-10">
        <div className="glass-card flex flex-wrap items-center justify-between px-2 py-2 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[95%] mx-auto space-y-10">
        
        <div>
          <h2 className="text-2xl font-bold mb-8 tracking-tight">Métricas Gerais do Sistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Total de Tags</p>
              <h3 className="text-5xl font-light text-blue-200">{stats.totalTags}</h3>
              <p className="text-[10px] text-white/30 uppercase">registros</p>
            </div>

            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Tags Únicas</p>
              <h3 className="text-5xl font-light text-purple-200">{stats.tagsUnicas}</h3>
              <p className="text-[10px] text-white/30 uppercase">—</p>
            </div>

            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Participantes</p>
              <h3 className="text-5xl font-light text-green-200">{stats.participantes}</h3>
              <p className="text-[10px] text-white/30 uppercase">usuários ativos</p>
            </div>

            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Obras Cadastradas</p>
              <h3 className="text-5xl font-light text-yellow-200">{stats.obras}</h3>
              <p className="text-[10px] text-white/30 uppercase">0 com tags</p>
            </div>

            <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Média Tags/Usuário</p>
              <h3 className="text-5xl font-light text-blue-300">{stats.media.toFixed(1)}</h3>
              <p className="text-[10px] text-white/30 uppercase">por participante</p>
            </div>

          </div>
        </div>

        {/* Dynamic content placeholder based on activeTab */}
        <div className="pt-10 border-t border-white/5">
          <p className="text-center text-white/20 uppercase tracking-[0.3em] text-xs">Exibindo: {activeTab}</p>
        </div>

      </div>
    </main>
  );
}

