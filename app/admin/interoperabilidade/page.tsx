'use client';

import { useState } from 'react';
import { Database, Globe, RefreshCcw, CheckCircle2 } from 'lucide-react';

export default function InteroperabilidadePage() {
  const sources = [
    { name: 'Tesauro CNFCP', status: 'online', coverage: 'Nacional', lastSync: 'local (estático)' },
    { name: 'IBRAM', status: 'online', coverage: 'Nacional', lastSync: '2 horas atrás' },
    { name: 'Brasiliana Museus', status: 'online', coverage: 'Nacional', lastSync: '1 dia atrás' },
    { name: 'Portal Brasileiro de Dados Abertos', status: 'online', coverage: 'Nacional', lastSync: '5 dias atrás' },
  ];

  return (
    <main className="min-h-screen pt-24 px-6 bg-[#000000]">
      <div className="max-w-7xl mx-auto py-12">
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-normal text-white serif-title tracking-normal">Interoperabilidade</h1>
          <p className="text-white/50 mt-2 text-sm">Conectores e fontes de dados abertos para validação semântica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {sources.map(s => (
            <div key={s.name} className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-full bg-white/5 border border-white/10">
                  <Globe size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  {s.status}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-normal text-white serif-title">{s.name}</h3>
                <p className="text-white/30 text-xs mt-1">Sincronismo: {s.lastSync}</p>
              </div>
              <button className="w-full py-2 text-xs border border-white/10 hover:bg-white/5 transition-colors uppercase font-semibold tracking-wider">
                Reconectar
              </button>
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-normal text-white serif-title mb-6 flex items-center gap-3">
            <RefreshCcw size={24} className="text-white/50" /> Log de Sincronização
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded bg-white/5">
                    <CheckCircle2 size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/80 font-medium">Busca em IBRAM/Tainacan concluída para núcleo #4529</p>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Há 5 minutos • Sucesso</p>
                  </div>
                </div>
                <button className="text-xs text-white/40 hover:text-white transition-colors underline decoration-white/10">Ver Detalhes</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
