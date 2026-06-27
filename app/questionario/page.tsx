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

  const labelClass = "uppercase tracking-[0.13em] text-[11px] font-semibold text-[#1A1A1A]/45 block ml-1 mb-2";

  return (
    <main className="min-h-screen flex flex-col items-center pt-28 pb-14 px-6">

      {/* Cabeçalho */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-2xl md:text-3xl font-normal serif-title text-[#1A1A1A] tracking-tight">
          Questionário de Acesso
        </h1>
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px w-10 bg-[#1A1A1A]/10" />
          <div className="w-2 h-2 rounded-full" style={{ background: '#E8490A' }} />
          <div className="h-px w-10 bg-[#1A1A1A]/10" />
        </div>
        <p className="text-[#1A1A1A]/45 text-sm max-w-sm mx-auto">
          Ajude-nos a entender seu perfil para personalizar sua experiência.
        </p>
      </div>

      <div className="w-full max-w-4xl animate-slide-up">
        <div className="glass-card p-8 md:p-12">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

            <div className="space-y-8">
              <div>
                <label className={labelClass}>1. Familiaridade com Museus</label>
                <select
                  id="select-familiaridade"
                  value={formData.familiaridade}
                  onChange={e => setFormData({ ...formData, familiaridade: e.target.value })}
                  className="liquid-input w-full cursor-pointer"
                  style={{ appearance: 'none' }}
                >
                  <option>Nunca visito museus</option>
                  <option>Visito raramente</option>
                  <option>Visito ocasionalmente</option>
                  <option>Frequento regularmente</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>2. Conhecimento em Documentação</label>
                <select
                  id="select-documentacao"
                  value={formData.documentacao}
                  onChange={e => setFormData({ ...formData, documentacao: e.target.value })}
                  className="liquid-input w-full cursor-pointer"
                  style={{ appearance: 'none' }}
                >
                  <option>Nunca ouvi falar</option>
                  <option>Já ouvi falar, mas não sei o que é</option>
                  <option>Tenho algum conhecimento</option>
                  <option>Tenho pleno conhecimento</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>3. Entendimento sobre Tags Digitais</label>
              <textarea
                id="textarea-entendimento"
                value={formData.entendimento}
                onChange={e => setFormData({ ...formData, entendimento: e.target.value })}
                placeholder="Descreva sua compreensão..."
                className="liquid-input flex-1 min-h-[160px] resize-none w-full"
              />
            </div>

            <div className="md:col-span-2 flex justify-center pt-6">
              <button
                id="btn-acessar-plataforma"
                type="submit"
                disabled={loading}
                className="liquid-button !px-14 !py-4 !rounded-full !text-[11px] !font-semibold !tracking-[0.15em] shadow-lg"
                style={{
                  background: loading ? 'rgba(255,255,255,0.40)' : 'rgba(255,255,255,0.70)',
                  borderColor: 'rgba(0,0,0,0.12)',
                }}
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
