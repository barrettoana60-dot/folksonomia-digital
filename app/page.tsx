'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="max-w-[600px] text-center space-y-12">
        
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5 mx-auto">
            <div className="w-3 h-3 rounded-full bg-[#E85002]" />
          </div>
          <h1 className="text-4xl font-normal serif-title text-white tracking-wide uppercase">
            Sistema de Folksonomia
          </h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-medium">
            Acervo e Documentação Museológica
          </p>
        </div>

        <div className="h-[1px] w-20 bg-[#E85002] mx-auto" />

        <p className="text-white/40 text-sm leading-relaxed font-light italic max-w-sm mx-auto">
          Plataforma para catalogação colaborativa e enriquecimento semântico do acervo institucional.
        </p>

        <button 
          onClick={() => router.push('/questionario')}
          className="liquid-button px-16 py-4 !rounded-lg text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          Iniciar Acesso
        </button>

      </div>
    </main>
  );
}
