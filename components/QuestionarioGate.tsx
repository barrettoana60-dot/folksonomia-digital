'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionarioGate() {
  const router = useRouter();

  useEffect(() => {
    try {
      const quizFeito = localStorage.getItem('visitante_quiz_completado');
      if (quizFeito !== 'true') {
        router.replace('/questionario');
      }
    } catch {
      router.replace('/questionario');
    }
  }, [router]);

  return null;
}
