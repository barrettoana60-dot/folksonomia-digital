'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário já completou o quiz
    const hasCompletedQuiz = localStorage.getItem('visitante_quiz_completado');
    if (hasCompletedQuiz) {
      router.push('/obras');
    } else {
      router.push('/questionario');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#000814]">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-light text-white/50 serif-title animate-pulse">Carregando Sistema Folksonomia...</h1>
      </div>
    </main>
  );
}
