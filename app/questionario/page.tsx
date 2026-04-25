'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ArrowRight } from 'lucide-react';

export default function QuestionarioPage() {
  const [nome, setNome] = useState('');
  const [area, setArea] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !area.trim()) return;

    // Simulate saving visitor session
    localStorage.setItem('visitante_nome', nome);
    localStorage.setItem('visitante_area', area);
    
    // Redirect to gallery
    router.push('/obras');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-5 rounded-full bg-orange-500/10 mb-6 border border-orange-500/20 shadow-[0_0_15px_rgba(255,100,0,0.2)]">
            <ClipboardList size={40} className="text-orange-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Bem-vindo(a) à Plataforma</h1>
          <p className="text-white/50 mt-3 text-sm leading-relaxed">
            Antes de acessar o acervo e contribuir com a teia semântica, precisamos conhecer um pouco mais sobre o seu perfil de pesquisa.
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                className="liquid-input w-full px-4 py-3 text-sm placeholder:text-white/30"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Área de Pesquisa ou Interesse</label>
              <input
                type="text"
                value={area}
                onChange={e => setArea(e.target.value)}
                required
                className="liquid-input w-full px-4 py-3 text-sm placeholder:text-white/30"
                placeholder="Ex: História da Arte, Design, Museologia..."
              />
            </div>

            <button
              type="submit"
              className="liquid-button w-full py-4 text-sm font-bold mt-4 flex items-center justify-center gap-2 group"
            >
              Acessar Acervo
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
