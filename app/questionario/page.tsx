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
    
    const vHash = Math.random().toString(36).substring(2, 10);
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_hash', vHash);
    
    setTimeout(() => {
      router.push('/obras');
    }, 800);
  };

  return (
    <main className="min-h-screen flex flex-col items-center pt-24 pb-12 px-6">
      
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-2xl md:text-3xl font-light serif-title text-white tracking-normal">
          Questionário de Acesso
        </h1>
        <div className="h-[1px] w-12 bg-[#E85002] mx-auto opacity-40" />
      </div>

      <div className="w-full max-w-4xl">
        <div className="glass-card p-8 md:p-12">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="uppercase tracking-[0.12em] text-[11px] font-semibold text-white/45 block ml-1">
                  1. Familiaridade com Museus
                </label>
                <select 
                  value={formData.familiaridade}
                  onChange={e => setFormData({...formData, familiaridade: e.target.value})}
                  className="liquid-input w-full !bg-white/5 !border-white/10 text-white cursor-pointer"
                >
                  <option className="bg-black">Nunca visito museus</option>
                  <option className="bg-black">Visito raramente</option>
                  <option className="bg-black">Visito ocasionalmente</option>
                  <option className="bg-black">Frequento regularmente</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="uppercase tracking-[0.12em] text-[11px] font-semibold text-white/45 block ml-1">
                  2. Conhecimento em Documentação
                </label>
                <select 
                  value={formData.documentacao}
                  onChange={e => setFormData({...formData, documentacao: e.target.value})}
                  className="liquid-input w-full !bg-white/5 !border-white/10 text-white cursor-pointer"
                >
                  <option className="bg-black">Nunca ouvi falar</option>
                  <option className="bg-black">Já ouvi falar, mas não sei o que é</option>
                  <option className="bg-black">Tenho algum conhecimento</option>
                  <option className="bg-black">Tenho pleno conhecimento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <label className="uppercase tracking-[0.12em] text-[11px] font-semibold text-white/45 block ml-1">
                3. Entendimento sobre Tags Digitais
              </label>
              <textarea 
                value={formData.entendimento}
                onChange={e => setFormData({...formData, entendimento: e.target.value})}
                placeholder="Descreva sua compreensão..."
                className="liquid-input flex-1 min-h-[160px] resize-none w-full !bg-white/5 !border-white/10 text-white placeholder:text-white/20"
              />
            </div>

            <div className="md:col-span-2 flex justify-center pt-8">
              <button 
                type="submit" 
                disabled={loading}
                className="liquid-button !px-14 !py-4 !rounded-full !bg-white/5 hover:!bg-[#E85002]/15 hover:!border-[#E85002]/35 transition-all"
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
