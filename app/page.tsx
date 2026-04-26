'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-[800px] text-center space-y-16">
        
        <div className="space-y-6">
          <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-xl mx-auto shadow-[0_0_40px_rgba(232,80,2,0.2)]">
            <div className="w-4 h-4 rounded-full bg-[#E85002] shadow-[0_0_20px_rgba(232,80,2,0.8)]" />
          </div>
          <h1 className="text-5xl md:text-6xl font-normal serif-title text-white tracking-[0.05em] uppercase">
            Sistema de Folksonomia
          </h1>
          <p className="text-white/30 text-[11px] uppercase tracking-[0.6em] font-bold">
            Documentação Semântica Institucional
          </p>
        </div>

        <div className="h-[1px] w-24 bg-[#E85002] mx-auto opacity-50" />

        <p className="text-white/40 text-base leading-relaxed font-light italic max-w-md mx-auto">
          Participe da construção coletiva do conhecimento institucional através de percepções e tags semânticas.
        </p>

        <div className="pt-8">
          <button 
            onClick={() => router.push('/questionario')}
            className="liquid-button !px-20 !py-5 !rounded-full !text-[12px] !font-black !tracking-[0.3em] !bg-white/10"
          >
            Acessar Sistema
          </button>
        </div>

      </div>
    </main>
  );
}
