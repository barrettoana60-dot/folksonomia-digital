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
      <div className="max-w-[720px] text-center space-y-10">

        {/* Logo + título */}
        <div className="space-y-7">
          <div className="flex justify-center animate-float">
            <Logo className="w-20 h-20 md:w-24 md:h-24" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-[2.6rem] font-normal serif-title text-[#1A1A1A] tracking-tight leading-tight">
              Folksonomia Digital
            </h1>
            <p className="text-[#1A1A1A]/40 text-[11px] uppercase tracking-[0.28em] font-semibold">
              NUGEP — Documentação Semântica
            </p>
          </div>
        </div>

        {/* Divisor */}
        <div className="flex items-center gap-4 max-w-xs mx-auto">
          <div className="flex-1 h-px bg-[#1A1A1A]/10" />
          <div className="w-2 h-2 rounded-full" style={{ background: '#E8490A' }} />
          <div className="flex-1 h-px bg-[#1A1A1A]/10" />
        </div>

        {/* Descrição */}
        <p className="text-[#1A1A1A]/55 text-sm md:text-base leading-relaxed font-light max-w-md mx-auto">
          Participe da construção coletiva do conhecimento institucional
          através de percepções e tags semânticas sobre o acervo.
        </p>

        {/* CTA */}
        <div className="pt-2">
          <button
            id="btn-acessar-sistema"
            onClick={() => router.push('/questionario')}
            className="liquid-button !px-14 md:!px-20 !py-4 md:!py-5 !rounded-full !text-[11px] !font-semibold !tracking-[0.15em] hover:scale-105 active:scale-95 transition-all"
          >
            Acessar Sistema
          </button>
        </div>

        {/* Cores decorativas pequenas */}
        <div className="flex justify-center gap-2 pt-4">
          {['#1E3A8A','#E8490A','#1A6B3A','#C0252B','#E8A920'].map((c) => (
            <div key={c} className="w-2 h-2 rounded-full opacity-60" style={{ background: c }} />
          ))}
        </div>

      </div>
    </main>
  );
}
