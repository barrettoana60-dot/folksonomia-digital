'use client';

import { useState, useEffect } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { 
  Activity, Tag, Users, BookOpen, BarChart3, 
  Search, Link as LinkIcon, ClipboardList, Settings, 
  CheckCircle, Network, Download, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState({
    obras: 5,
    participantes: 1,
    tags: 0,
    emAnalise: 0,
    validadas: 0,
    publicadas: 0,
    ontologias: 12,
    fontes: 6,
    conexoes: 0,
    eventos: 0
  });

  const metrics = [
    { label: 'Total de Obras', value: stats.obras, icon: BookOpen, color: '#E85002' },
    { label: 'Participantes', value: stats.participantes, icon: Users, color: '#F16001' },
    { label: 'Total de Tags', value: stats.tags, icon: Tag, color: '#D9C3AB' },
    { label: 'Tags em Análise', value: stats.emAnalise, icon: Activity, color: '#C10801' },
    { label: 'Tags Validadas', value: stats.validadas, icon: CheckCircle, color: '#F9F9F9' },
    { label: 'Ontologias', value: stats.ontologias, icon: Settings, color: '#A7A7A7' },
    { label: 'Fontes Externas', value: stats.fontes, icon: LinkIcon, color: '#646464' },
    { label: 'Eventos Registrados', value: stats.eventos, icon: ShieldCheck, color: '#333333' }
  ];

  const adminTabs = [
    { label: 'Visão Geral', href: '/admin' },
    { label: 'Gestão de Obras', href: '/admin/obras' },
    { label: 'Gestão de Tags', href: '/admin/tags' },
    { label: 'Validação', href: '/admin/validacao' },
    { label: 'Ontologias', href: '/admin/ontologias' },
    { label: 'Interoperabilidade', href: '/admin/interoperabilidade' },
    { label: 'Trilha de Validação', href: '/admin/eventos' },
    { label: 'Relatórios', href: '/admin/relatorios' }
  ];

  return (
    <main className="min-h-screen bg-black text-white p-10 pt-24">
      
      {/* Header Admin */}
      <div className="max-w-[95%] mx-auto mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-normal serif-title tracking-tight">Área Administrativa</h1>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2">Sistema Folksonomia Digital • Gestão Institucional</p>
        </div>
        <div className="flex gap-4">
          <button className="liquid-button text-xs py-3">
            Recalcular Núcleos
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="max-w-[95%] mx-auto mb-12 border-b border-white/10 flex gap-2 overflow-x-auto no-scrollbar">
        {adminTabs.map(tab => (
          <Link 
            key={tab.label} 
            href={tab.href}
            className={`admin-tab ${tab.label === 'Visão Geral' ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Grid de Métricas */}
      <div className="max-w-[95%] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-12">
        {metrics.map(m => (
          <div key={m.label} className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-white/5 border border-white/5">
              <m.icon size={24} style={{ color: m.color }} />
            </div>
            <div>
              <h3 className="text-4xl font-light">{m.value}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Atividade Recente (Simulada) */}
      <div className="max-w-[95%] mx-auto">
        <div className="glass-card p-10">
          <h2 className="text-xl font-normal serif-title mb-8 flex items-center gap-3">
            <Activity size={24} className="text-[#E85002]" />
            Atividade de Machine Learning
          </h2>
          <div className="space-y-4 text-sm text-white/50">
            <p className="flex items-center gap-3 py-3 border-b border-white/5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Núcleo semântico criado para tag "mamãe" • Confiança 85% • Ressonância Alta
            </p>
            <p className="flex items-center gap-3 py-3 border-b border-white/5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Sugerida relação broader entre "mãe" e "maternidade" via Open Data
            </p>
            <p className="flex items-center gap-3 py-3 border-b border-white/5 text-white/30 italic">
              Aguardando validação humana para ajuste de pesos...
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
