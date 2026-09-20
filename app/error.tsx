'use client';

import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#EEEBE3]">
      <div className="max-w-md w-full glass-card p-8 text-center space-y-6 border border-black/10 shadow-lg">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8490A]/10 text-[#E8490A] flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold serif-title text-[#1A1A1A]">
            Erro de Carregamento
          </h2>
          <p className="text-xs text-[#1A1A1A]/60">
            {error?.message || 'Ocorreu uma instabilidade temporária ao carregar este módulo.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#E8490A] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-[#c44000] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw size={14} />
            <span>Recarregar Módulo</span>
          </button>
          <Link
            href="/obras"
            className="px-5 py-2.5 bg-black/05 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black/10 flex items-center justify-center gap-2 transition-all"
          >
            <Home size={14} />
            <span>Ir para Obras</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
