'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const quizFeito = localStorage.getItem('visitante_quiz_completado');
      if (quizFeito === 'true') {
        router.replace('/obras');
      } else {
        router.replace('/questionario');
      }
    } catch {
      router.replace('/questionario');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-[#E8490A] border-t-transparent animate-spin" />
        <p className="text-[#1A1A1A]/40 text-sm tracking-widest uppercase font-sans">
          Carregando...
        </p>
      </div>
    </main>
  );
}
