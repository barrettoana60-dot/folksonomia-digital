'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';

export default function QuestionarioPage() {
  const [formData, setFormData] = useState({
    nome: '',
    faixa_etaria: '',
    localidade: '',
    vinculo_museu: 'Nenhum',
    ja_visitou: 'Sim',
    familiaridade_arte: 'Média',
    acessibilidade: '',
    aceite: false
  });
  
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aceite) return;

    // Gerar hash anônimo simples para o visitante
    const vHash = Math.random().toString(36).substring(2, 15);
    
    // Salvar no localStorage
    localStorage.setItem('visitante_quiz_completado', 'true');
    localStorage.setItem('visitante_hash', vHash);
    localStorage.setItem('visitante_nome', formData.nome || 'Visitante Anônimo');
    
    // Redirecionar para galeria de obras
    router.push('/obras');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#000000]">
      <div className="w-full max-w-4xl space-y-10">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-normal serif-title text-white">Questionário de Participação</h1>
          <p className="text-light-gray max-w-2xl mx-auto font-light">
            Sua contribuição é fundamental para o enriquecimento semântico do nosso acervo. 
            Os dados coletados são utilizados apenas para fins de pesquisa institucional.
          </p>
        </div>

        <div className="glass-card p-10">
          <form onSubmit={handleSubmit} className="space-y-12">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Informações Básicas */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Nome ou Pseudônimo (Opcional)</label>
                  <input 
                    type="text" 
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                    placeholder="Como deseja ser chamado?"
                    className="liquid-input w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 focus:border-[#E85002] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Faixa Etária</label>
                  <select 
                    value={formData.faixa_etaria}
                    onChange={e => setFormData({...formData, faixa_etaria: e.target.value})}
                    required
                    className="liquid-input w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 focus:border-[#E85002] outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="sub18">Menor de 18 anos</option>
                    <option value="18-30">18 a 30 anos</option>
                    <option value="31-50">31 a 50 anos</option>
                    <option value="51plus">Acima de 51 anos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Cidade / Bairro (Opcional)</label>
                  <input 
                    type="text" 
                    value={formData.localidade}
                    onChange={e => setFormData({...formData, localidade: e.target.value})}
                    className="liquid-input w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 focus:border-[#E85002] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Perfil de Visitante */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Vínculo com Museus</label>
                  <select 
                    value={formData.vinculo_museu}
                    onChange={e => setFormData({...formData, vinculo_museu: e.target.value})}
                    className="liquid-input w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 focus:border-[#E85002] outline-none transition-all"
                  >
                    <option>Nenhum</option>
                    <option>Estudante</option>
                    <option>Pesquisador</option>
                    <option>Profissional de Museus</option>
                    <option>Artista</option>
                    <option>Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Já visitou este museu ou exposição antes?</label>
                  <div className="flex gap-4">
                    {['Sim', 'Não'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({...formData, ja_visitou: opt})}
                        className={`flex-1 py-3 rounded-xl border transition-all text-sm font-bold ${formData.ja_visitou === opt ? 'bg-[#E85002] border-[#E85002] text-white' : 'border-white/10 bg-white/5 text-white/50'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Familiaridade com o Acervo</label>
                  <div className="flex gap-2">
                    {['Baixa', 'Média', 'Alta'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({...formData, familiaridade_arte: opt})}
                        className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold ${formData.familiaridade_arte === opt ? 'bg-[#E85002] border-[#E85002] text-white' : 'border-white/10 bg-white/5 text-white/50'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Acessibilidade */}
            <div className="border-t border-white/5 pt-10">
              <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Necessidades de Acessibilidade (Opcional)</label>
              <textarea 
                value={formData.acessibilidade}
                onChange={e => setFormData({...formData, acessibilidade: e.target.value})}
                rows={3}
                placeholder="Ex: Audiodescrição, Libras, Fonte Ampliada..."
                className="liquid-input w-full bg-black/40 border-white/10 rounded-xl px-4 py-3 focus:border-[#E85002] outline-none transition-all"
              />
            </div>

            {/* Aceite e Envio */}
            <div className="flex flex-col items-center gap-8 pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.aceite}
                  onChange={e => setFormData({...formData, aceite: e.target.checked})}
                  className="w-5 h-5 rounded border-white/20 bg-black/40 text-[#E85002] focus:ring-[#E85002] accent-[#E85002]"
                />
                <span className="text-sm text-white/50 group-hover:text-white transition-colors">
                  Aceito participar da catalogação colaborativa e autorizo o uso anônimo dos dados.
                </span>
              </label>

              <button
                type="submit"
                disabled={!formData.aceite}
                className="liquid-button px-20 py-4 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ClipboardCheck className="mr-2" size={20} />
                Iniciar Participação
              </button>
            </div>

          </form>
        </div>

        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            Privacidade e Integridade Institucional
          </p>
        </div>
      </div>
    </main>
  );
}
