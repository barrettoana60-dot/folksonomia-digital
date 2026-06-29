'use client';

import { useState, ReactNode } from 'react';

// ── GlassCard inline ────────────────────────────────────────────────────────
function GlassCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

// ── Dados ───────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: 'Tesauro CNFCP',                   lastSync: 'local (estático)' },
  { name: 'IBRAM',                            lastSync: '2 horas atrás'   },
  { name: 'Brasiliana Museus',               lastSync: '1 dia atrás'     },
  { name: 'Portal Brasileiro de Dados Abertos', lastSync: '5 dias atrás' },
];

const LOGS = [
  { id: 1, msg: 'Busca em IBRAM/Tainacan concluída para núcleo #4529', time: 'Há 5 minutos'  },
  { id: 2, msg: 'Sincronização com Brasiliana Museus finalizada',        time: 'Há 18 minutos' },
  { id: 3, msg: 'Validação semântica no Portal de Dados Abertos concluída', time: 'Há 1 hora' },
];

// ── Página ──────────────────────────────────────────────────────────────────
export default function InteroperabilidadePage() {
  const [reconnecting, setReconnecting] = useState<number | null>(null);

  function handleReconectar(i: number) {
    setReconnecting(i);
    setTimeout(() => setReconnecting(null), 1500);
  }

  return (
    <main className="min-h-screen pt-24 px-6">
      <div className="max-w-7xl mx-auto py-12">

        {/* Cabeçalho */}
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-normal tracking-normal">
            Interoperabilidade
          </h1>
          <p className="text-black/50 mt-2 text-sm">
            Conectores e fontes de dados abertos para validação semântica.
          </p>
        </div>

        {/* Cards de fontes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {SOURCES.map((s, i) => (
            <GlassCard key={s.name} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-full bg-white/50 border border-black/10">
                  {/* Ícone Globe em SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E8490A]"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#E8490A]">
                  <span className="w-2 h-2 rounded-full bg-[#E8490A] animate-pulse inline-block" />
                  online
                </div>
              </div>

              <div>
                <h3 className="text-base font-normal">{s.name}</h3>
                <p className="text-black/30 text-xs mt-1">Sincronismo: {s.lastSync}</p>
              </div>

              <button
                onClick={() => handleReconectar(i)}
                disabled={reconnecting === i}
                className="w-full py-2 text-xs border border-black/10 hover:bg-black/5 transition-colors uppercase font-semibold tracking-wider rounded-lg disabled:opacity-50"
              >
                {reconnecting === i ? 'Reconectando…' : 'Reconectar'}
              </button>
            </GlassCard>
          ))}
        </div>

        {/* Log de sincronização */}
        <GlassCard className="p-8">
          <h2 className="text-xl font-normal mb-6 flex items-center gap-3">
            {/* Ícone RefreshCcw em SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/50"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Log de Sincronização
          </h2>

          <div className="space-y-4">
            {LOGS.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-4 border-b border-black/5 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded bg-white/30 shrink-0">
                    {/* Ícone CheckCircle em SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E8490A]"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                    <p className="text-sm text-black/80 font-medium">{log.msg}</p>
                    <p className="text-[10px] text-black/35 uppercase tracking-wider font-semibold">
                      {log.time} • Sucesso
                    </p>
                  </div>
                </div>
                <button className="text-xs text-black/40 hover:text-black transition-colors underline decoration-black/10 ml-4 shrink-0">
                  Ver Detalhes
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </main>
  );
}
