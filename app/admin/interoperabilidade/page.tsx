'use client';

import { useState } from 'react';
import { Database, Globe, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/UI';

export default function InteroperabilidadePage() {
  const sources = [
    { name: 'Tesauro CNFCP', status: 'online', coverage: 'Nacional', lastSync: 'local (estático)' },
    { name: 'IBRAM', status: 'online', coverage: 'Nacional', lastSync: '2 horas atrás' },
    { name: 'Brasiliana Museus', status: 'online', coverage: 'Nacional', lastSync: '1 dia atrás' },
    { name: 'Portal Brasileiro de Dados Abertos', status: 'online', coverage: 'Nacional', lastSync: '5 dias atrás' },
  ];

  return (
    <main className="min-h-screen pt-24 px-6">
      <div className="max-w-7xl mx-auto py-12">
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-normal">Interoperabilidade</h1>
          <p className="text-[#1A1A1A]/50 mt-2 text-sm">Conectores e fontes de dados abertos para validação semântica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {sources.map(s => (
            <GlassCard key={s.name} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-full bg-white/50 border border-black/10">
                  <Globe size={20} className="text-[#E8490A]" />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#E8490A]">
                  <div className="w-2 h-2 rounded-full bg-[#E8490A] animate-pulse" />
                  {s.status}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-normal serif-title">{s.name}</h3>
                <p className="text-[#1A1A1A]/30 text-xs mt-1">Sincronismo: {s.lastSync}</p>
              </div>
              <button className="w-full py-2 text-xs border border-black/10 hover:bg-black/5 transition-colors uppercase font-semibold tracking-wider rounded-lg">
                Reconectar
              </button>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="p-8">
          <h2 className="text-xl font-normal serif-title mb-6 flex items-center gap-3">
            <RefreshCcw size={24} className="text-[#1A1A1A]/50" /> Log de Sincronização
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-black/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded bg-white/30">
                    <CheckCircle2 size={16} className="text-[#E8490A]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#1A1A1A]/80 font-medium">Busca em IBRAM/Tainacan concluída para núcleo #4529</p>
                    <p className="text-[10px] text-[#1A1A1A]/35 uppercase tracking-wider font-semibold">Há 5 minutos • Sucesso</p>
                  </div>
                </div>
                <button className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors underline decoration-black/10">Ver Detalhes</button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </main>
  );
}