'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionarioPage() {
  const [formData, setFormData] = useState({
    familiaridade: 'Nunca visito museus',
    documentacao: 'Nunca ouvi falar',
    entendimento: ''
  });
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Salvar estado e hash anônimo
    const vHash = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_hash', vHash);
    
    // Pequeno delay para percepção de processamento
    setTimeout(() => {
      router.push('/obras');
    }, 800);
  };

  return (
    <main className="min-h-screen flex flex-col items-center pt-24 px-6">
      
      <div className="text-center space-y-4 mb-16">
        <h1 className="text-4xl font-normal serif-title text-white tracking-wide">
          Questionário de Acesso
        </h1>
        <div className="h-[1px] w-12 bg-[#E85002] mx-auto opacity-40" />
      </div>

      <div className="quiz-container">
        <div className="quiz-card glass-card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            
            <div className="space-y-10">
              <div>
                <label className="quiz-label uppercase tracking-widest text-[10px] font-black opacity-40">1. Familiaridade com Museus</label>
                <select 
                  value={formData.familiaridade}
                  onChange={e => setFormData({...formData, familiaridade: e.target.value})}
                  className="quiz-select w-full"
                >
                  <option>Nunca visito museus</option>
                  <option>Visito raramente</option>
                  <option>Visito ocasionalmente</option>
                  <option>Frequento regularmente</option>
                </select>
              </div>

              <div>
                <label className="quiz-label uppercase tracking-widest text-[10px] font-black opacity-40">2. Conhecimento em Documentação</label>
                <select 
                  value={formData.documentacao}
                  onChange={e => setFormData({...formData, documentacao: e.target.value})}
                  className="quiz-select w-full"
                >
                  <option>Nunca ouvi falar</option>
                  <option>Já ouvi falar, mas não sei o que é</option>
                  <option>Tenho algum conhecimento</option>
                  <option>Tenho pleno conhecimento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="quiz-label uppercase tracking-widest text-[10px] font-black opacity-40">3. Entendimento sobre Tags Digitais</label>
              <textarea 
                value={formData.entendimento}
                onChange={e => setFormData({...formData, entendimento: e.target.value})}
                placeholder="Descreva sua compreensão..."
                className="quiz-select flex-1 min-h-[160px] resize-none w-full"
              />
            </div>

            <div className="md:col-span-2 flex justify-center pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="liquid-button !px-16 !py-5 !rounded-full !bg-white/10"
              >
                {loading ? 'PROCESSANDO...' : 'ACESSAR PLATAFORMA'}
              </button>
            </div>

          </form>
        </div>
      </div>

    </main>
  );
}
