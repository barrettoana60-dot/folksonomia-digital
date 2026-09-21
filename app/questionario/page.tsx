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
  const [statusMsg, setStatusMsg] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('Registrando seu acesso e perfil cultural...');

    try {
      // Obter ou gerar hash do visitante
      let vHash = localStorage.getItem('visitante_hash');
      if (!vHash) {
        vHash = Math.random().toString(36).substring(2, 10);
        localStorage.setItem('visitante_hash', vHash);
      }

      const res = await fetch('/api/questionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familiaridade: formData.familiaridade,
          documentacao: formData.documentacao,
          entendimento: formData.entendimento.trim(),
          visitante_hash: vHash,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Não foi possível salvar suas respostas.');
      }

      const finalHash = data.visitante_hash || vHash;
      const finalNome = data.pseudonimo || `Visitante_${finalHash.slice(0, 6)}`;

      localStorage.setItem('visitante_quiz_completado', 'true');
      localStorage.setItem('visitante_hash', finalHash);
      localStorage.setItem('visitante_nome', finalNome);
      if (data.visitante_id) {
        localStorage.setItem('visitante_id', data.visitante_id);
      }

      setStatusMsg(`Perfil confirmado: ${finalNome}. Redirecionando...`);
      setTimeout(() => {
        router.push('/obras');
      }, 600);
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : 'Não foi possível salvar suas respostas. Tente novamente.');
      setLoading(false);
    }
  };

  const labelClass = "uppercase tracking-[0.13em] text-[11px] font-semibold text-[#1A1A1A]/45 block ml-1 mb-2";

  return (
    <main className="min-h-screen flex flex-col items-center px-6 pb-16 pt-32 md:pt-36">

      {/* Cabeçalho */}
      <div className="text-center space-y-3 mb-8">
        <h1 className="text-2xl md:text-3xl font-normal serif-title text-[#1A1A1A] tracking-tight">
          Questionário de Acesso e Registro de Usuário
        </h1>
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px w-10 bg-[#1A1A1A]/10" />
          <div className="w-2 h-2 rounded-full" style={{ background: '#E8490A' }} />
          <div className="h-px w-10 bg-[#1A1A1A]/10" />
        </div>
        <p className="text-[#1A1A1A]/55 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
          Ajude-nos a registrar sua participação e entender sua relação com os acervos culturais para conectar suas contribuições.
        </p>
      </div>

      <div className="w-full max-w-4xl animate-slide-up">
        <div className="glass-card p-8 md:p-12">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">

            <div className="space-y-6">
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
                <label className={labelClass}>2. Nível de conhecimento sobre Documentação em Museus</label>
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

            <div className="flex flex-col justify-between">
              <div>
                <label className={labelClass}>3. Como compreende Taxonomias Sociais para acervos</label>
                <textarea
                  id="textarea-entendimento"
                  value={formData.entendimento}
                  onChange={e => setFormData({ ...formData, entendimento: e.target.value })}
                  placeholder="Descreva como você compreende as taxonomias sociais e as conexões culturais em acervos..."
                  className="liquid-input flex-1 min-h-[160px] resize-none w-full"
                />
              </div>

              {statusMsg && (
                <p className="text-xs font-semibold text-[#E8490A] mt-3 animate-fade-in text-center md:text-left">
                  {statusMsg}
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-center pt-6">
              <button
                id="btn-acessar-plataforma"
                type="submit"
                disabled={loading}
                className="liquid-button !px-14 !py-4 !rounded-full !text-[11px] !font-semibold !tracking-[0.15em] shadow-lg !bg-[#E8490A] !text-white hover:!bg-[#c44000] active:scale-95 transition-all cursor-pointer"
              >
                {loading ? 'REGISTRANDO...' : 'REGISTRAR & ACESSAR PLATAFORMA'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </main>
  );
}
