'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from '@/components/Logo';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const hasQuiz = localStorage.getItem('visitante_quiz_completado');
    if (hasQuiz) {
      router.push('/obras');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-[800px] text-center space-y-12">
        
        <div className="space-y-8">
          <Logo className="w-24 h-24 md:w-32 md:h-32 mx-auto" />
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-normal serif-title text-white tracking-[0.05em] uppercase leading-tight">
              Sistema de Folksonomia
            </h1>
            <p className="text-white/30 text-[10px] md:text-[12px] uppercase tracking-[0.6em] font-bold">
              Documentação Semântica Institucional
            </p>
          </div>
        </div>

        <div className="h-[1px] w-24 bg-[#E85002] mx-auto opacity-50" />

        <p className="text-white/40 text-sm md:text-lg leading-relaxed font-light italic max-w-lg mx-auto">
          Participe da construção coletiva do conhecimento institucional através de percepções e tags semânticas.
        </p>

        <div className="pt-8">
          <button 
            onClick={() => router.push('/questionario')}
            className="liquid-button !px-16 md:!px-24 !py-4 md:!py-6 !rounded-full !text-[11px] md:!text-[13px] !font-black !tracking-[0.3em] !bg-white/10 hover:!bg-[#E85002]/20 hover:!border-[#E85002]/40 transition-all shadow-2xl"
          >
            Acessar Sistema
          </button>
        </div>

      </div>
    </main>
  );
}
