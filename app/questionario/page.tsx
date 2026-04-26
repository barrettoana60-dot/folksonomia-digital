'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionarioPage() {
  const [formData, setFormData] = useState({
    familiaridade: 'Nunca visito museus',
    documentacao: 'Nunca ouvi falar',
    entendimento: ''
  });
  
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vHash = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_hash', vHash);
    
    router.push('/obras');
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center pt-32 px-6">
      
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl font-normal serif-title text-white tracking-wide">
          Questionário de Acesso
        </h1>
        <div className="h-[1px] w-12 bg-[#E85002] mx-auto" />
      </div>

      <div className="quiz-container">
        <div className="quiz-card glass-card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            
            <div className="space-y-8">
              <div>
                <label className="quiz-label uppercase tracking-widest text-[10px]">1. Qual é o seu nível de familiaridade com museus?</label>
                <select 
                  value={formData.familiaridade}
                  onChange={e => setFormData({...formData, familiaridade: e.target.value})}
                  className="quiz-select bg-black/40 border-white/10"
                >
                  <option>Nunca visito museus</option>
                  <option>Visito raramente</option>
                  <option>Visito ocasionalmente</option>
                  <option>Frequento regularmente</option>
                </select>
              </div>

              <div>
                <label className="quiz-label uppercase tracking-widest text-[10px]">2. Você já ouviu falar sobre documentação museológica?</label>
                <select 
                  value={formData.documentacao}
                  onChange={e => setFormData({...formData, documentacao: e.target.value})}
                  className="quiz-select bg-black/40 border-white/10"
                >
                  <option>Nunca ouvi falar</option>
                  <option>Já ouvi falar, mas não sei o que é</option>
                  <option>Tenho algum conhecimento</option>
                  <option>Tenho pleno conhecimento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="quiz-label uppercase tracking-widest text-[10px]">3. O que você entende por 'tags' ou etiquetas digitais aplicadas a acervo?</label>
              <textarea 
                value={formData.entendimento}
                onChange={e => setFormData({...formData, entendimento: e.target.value})}
                placeholder="Descreva sua compreensão sobre o conceito..."
                className="quiz-select flex-1 min-h-[160px] resize-none bg-black/40 border-white/10"
              />
            </div>

            <div className="md:col-span-2 flex justify-center pt-6">
              <button type="submit" className="liquid-button px-20">
                Acessar Plataforma
              </button>
            </div>

          </form>
        </div>
      </div>

    </main>
  );
}
