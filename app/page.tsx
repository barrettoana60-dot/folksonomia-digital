'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-[600px] text-center space-y-12">
        
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-xl mx-auto mb-6">
            <div className="w-4 h-4 rounded-full bg-[#E85002] shadow-[0_0_20px_rgba(232,80,2,0.6)]" />
          </div>
          <h1 className="text-5xl font-normal serif-title text-white tracking-tight uppercase leading-tight">
            Sistema de <br/> Folksonomia
          </h1>
          <p className="text-white/20 text-[11px] uppercase tracking-[0.5em] font-bold mt-4">
            Documentação Colaborativa
          </p>
        </div>

        <div className="h-[1px] w-12 bg-[#E85002] mx-auto my-12" />

        <p className="text-white/40 text-sm leading-relaxed font-light italic max-w-xs mx-auto">
          Enriquecimento semântico e curadoria participativa de acervos institucionais.
        </p>

        <button 
          onClick={() => router.push('/questionario')}
          className="liquid-button px-20 py-5 !rounded-2xl text-[12px] font-bold uppercase tracking-[0.3em] !bg-white/10 hover:!bg-white/20 border-white/20"
        >
          Acessar Sistema
        </button>


      </div>
    </main>
  );
}
