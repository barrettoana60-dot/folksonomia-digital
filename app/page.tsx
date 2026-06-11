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

  // Registrar visita ao sistema (conta visitantes únicos)
  useEffect(() => {
    try {
      const hash = localStorage.getItem('visitante_hash') || '';
      fetch('/api/track-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagina: '/', hash })
      });
    } catch { /* silencioso */ }
  }, []);


  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-[800px] text-center space-y-12">
        
        <div className="space-y-8">
          <Logo className="w-20 h-20 md:w-28 md:h-28 mx-auto" />
          
          <div className="space-y-4">
            <h1 className="text-2xl md:text-4xl font-light serif-title text-white tracking-wide leading-tight">
              Sistema de Folksonomia
            </h1>
            <p className="text-white/30 text-xs uppercase tracking-[0.25em] font-semibold">
              Documentação Semântica Institucional
            </p>
          </div>
        </div>

        <div className="h-[1px] w-16 bg-[#E85002] mx-auto opacity-40" />

        <p className="text-white/50 text-sm md:text-base leading-relaxed font-light max-w-md mx-auto">
          Participe da construção coletiva do conhecimento institucional através de percepções e tags semânticas.
        </p>

        <div className="pt-6">
          <button 
            onClick={() => router.push('/questionario')}
            className="liquid-button !px-12 md:!px-16 !py-4 md:!py-5 !rounded-full !text-xs !font-medium !tracking-[0.12em] !bg-white/5 hover:!bg-[#E85002]/15 hover:!border-[#E85002]/35 transition-all shadow-xl"
          >
            Acessar Sistema
          </button>
        </div>

      </div>
    </main>
  );
}
