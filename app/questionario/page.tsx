'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuestionarioPage() {
  const [familiaridade, setFamiliaridade] = useState('Nunca visito museus');
  const [conhecimento, setConhecimento] = useState('Nunca ouvi falar');
  const [entendimento, setEntendimento] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entendimento.trim()) return;

    // Salvar no localStorage para persistência da sessão do visitante
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_familiaridade', familiaridade);
    localStorage.setItem('visitante_conhecimento', conhecimento);
    localStorage.setItem('visitante_entendimento', entendimento);
    
    // Redirecionar para galeria de obras
    router.push('/obras');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#000814]">
      <div className="w-full max-w-5xl">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-normal text-white serif-title">Questionário de Acesso</h1>
        </div>

        <div className="glass-card p-10">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              
              {/* Coluna 1 */}
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-light text-white/90 mb-3">
                    1. Qual é o seu nível de familiaridade com museus?
                  </label>
                  <select 
                    value={familiaridade}
                    onChange={e => setFamiliaridade(e.target.value)}
                    className="liquid-select"
                  >
                    <option>Nunca visito museus</option>
                    <option>Visito raramente</option>
                    <option>Visito ocasionalmente</option>
                    <option>Visito com frequência</option>
                    <option>Sou profissional da área</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-light text-white/90 mb-3">
                    2. Você já ouviu falar sobre documentação museológica?
                  </label>
                  <select 
                    value={conhecimento}
                    onChange={e => setConhecimento(e.target.value)}
                    className="liquid-select"
                  >
                    <option>Nunca ouvi falar</option>
                    <option>Já ouvi falar vagamente</option>
                    <option>Conheço um pouco</option>
                    <option>Conheço bem</option>
                  </select>
                </div>
              </div>

              {/* Coluna 2 */}
              <div>
                <label className="block text-sm font-light text-white/90 mb-3">
                  3. O que você entende por 'tags' ou etiquetas digitais aplicadas a acervo?
                </label>
                <textarea 
                  rows={6}
                  value={entendimento}
                  onChange={e => setEntendimento(e.target.value)}
                  className="liquid-textarea h-[160px]"
                  placeholder="Descreva sua compreensão sobre o conceito..."
                />
              </div>

            </div>

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="liquid-button px-16 py-3 text-sm tracking-wide bg-[#1a1f2e] border-[#2a2f3e]"
              >
                Acessar Plataforma
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

