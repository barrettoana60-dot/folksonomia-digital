'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="max-w-[500px] w-full text-center space-y-12">
        
        <div className="space-y-6">
          <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] mx-auto shadow-2xl">
            <div className="w-4 h-4 rounded-full bg-[#E85002] shadow-[0_0_20px_#E85002]" />
          </div>
          <h1 className="text-4xl font-normal serif-title text-white tracking-wide uppercase">
            Sistema de Folksonomia
          </h1>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] font-bold">
            Catalogação e Enriquecimento Semântico
          </p>
        </div>

        <div className="h-[1px] w-16 bg-[#E85002]/30 mx-auto" />

        <p className="text-white/30 text-sm leading-relaxed font-light italic max-w-sm mx-auto">
          Participe da construção coletiva do conhecimento institucional através de percepções e tags semânticas.
        </p>

        <button 
          onClick={() => router.push('/questionario')}
          className="liquid-button px-20 py-4 !rounded-2xl text-[12px] font-bold tracking-[0.2em] w-full max-w-[300px] hover:!bg-[#E85002] hover:!text-white"
        >
          Acessar Sistema
        </button>

      </div>
    </main>
  );
}
