'use client';

import { useState } from 'react';
import { Globe, RefreshCcw, CheckCircle2 } from 'lucide-react';

// ── GlassCard inline ────────────────────────────────────────────────────────
function GlassCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
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
                  <Globe size={20} className="text-[#E8490A]" />
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
            <RefreshCcw size={24} className="text-black/50" />
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
                    <CheckCircle2 size={16} className="text-[#E8490A]" />
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
