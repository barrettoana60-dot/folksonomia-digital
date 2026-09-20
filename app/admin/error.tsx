'use client';

import React from 'react';
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#EEEBE3]">
      <div className="max-w-lg w-full glass-card p-8 space-y-6 border border-black/10 shadow-xl">
        <div className="flex items-center gap-3 border-b border-black/08 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8490A]/10 text-[#E8490A] flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A]">
              Painel Administrativo — Recuperação
            </h2>
            <p className="text-[10px] uppercase font-bold text-[#E8490A] tracking-wider">
              Módulo Semântico em Reinicialização
            </p>
          </div>
        </div>

        <div className="p-4 bg-red-500/05 border border-red-500/15 rounded-xl text-xs text-red-900 font-mono overflow-auto max-h-40">
          {error?.message || 'Falha na renderização de dados do dashboard.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-2.5 bg-[#E8490A] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-[#c44000] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw size={14} />
            <span>Recarregar Painel</span>
          </button>
          <Link
            href="/admin"
            className="px-4 py-2.5 bg-black/05 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black/10 flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
