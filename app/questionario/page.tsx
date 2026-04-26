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
    
    // Salvar estado e hash anônimo
    const vHash = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_hash', vHash);
    
    router.push('/obras');
  };

  return (
    <main className="min-h-screen flex flex-col items-center pt-20 pb-20 px-6">

      
      <h1 className="text-3xl font-normal serif-title text-white mb-16">
        Questionário de Acesso
      </h1>

      <div className="quiz-container">
        <div className="quiz-card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            
            <div className="space-y-8">
              <div>
                <label className="quiz-label">1. Qual é o seu nível de familiaridade com museus?</label>
                <select 
                  value={formData.familiaridade}
                  onChange={e => setFormData({...formData, familiaridade: e.target.value})}
                  className="quiz-select"
                >
                  <option>Nunca visito museus</option>
                  <option>Visito raramente</option>
                  <option>Visito ocasionalmente</option>
                  <option>Frequento regularmente</option>
                </select>
              </div>

              <div>
                <label className="quiz-label">2. Você já ouviu falar sobre documentação museológica?</label>
                <select 
                  value={formData.documentacao}
                  onChange={e => setFormData({...formData, documentacao: e.target.value})}
                  className="quiz-select"
                >
                  <option>Nunca ouvi falar</option>
                  <option>Já ouvi falar, mas não sei o que é</option>
                  <option>Tenho algum conhecimento</option>
                  <option>Tenho pleno conhecimento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="quiz-label">3. O que você entende por 'tags' ou etiquetas digitais aplicadas a acervo?</label>
              <textarea 
                value={formData.entendimento}
                onChange={e => setFormData({...formData, entendimento: e.target.value})}
                placeholder="Descreva sua compreensão sobre o conceito..."
                className="quiz-select flex-1 min-h-[160px] resize-none"
              />
            </div>

            <div className="md:col-span-2 flex justify-center">
              <button type="submit" className="quiz-button">
                Acessar Plataforma
              </button>
            </div>

          </form>
        </div>
      </div>

    </main>
  );
}
