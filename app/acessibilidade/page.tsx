'use client';

import { useState, useEffect } from 'react';
import { Eye, VolumeX, Sun, CheckCircle2, Type } from 'lucide-react';

export default function AcessibilidadePage() {
  const [activeTheme, setActiveTheme] = useState('escuro');
  const [fontSize, setFontSize] = useState(18);

  const applyTheme = (theme: string) => {
    setActiveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pref-theme', theme);
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      alert('Todas as audiodescrições foram interrompidas.');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('pref-theme') || 'escuro';
    applyTheme(savedTheme);
  }, []);

  const themes = [
    { id: 'escuro', label: 'Modo Escuro', desc: 'Padrão institucional' },
    { id: 'claro', label: 'Modo Claro', desc: 'Fundo claro para leitura' },
    { id: 'contraste', label: 'Alto Contraste', desc: 'Máxima visibilidade' },
  ];

  return (
    <main className="min-h-screen pt-32 pb-20 px-6 bg-black/20">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
            <Eye size={32} className="text-[#E85002]" />
          </div>
          <h1 className="text-4xl font-normal serif-title tracking-tight uppercase">Acessibilidade</h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">Personalize sua experiência de navegação no Sistema de Folksonomia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Audio Control */}
          <div className="glass-card p-8 space-y-6">
            <h2 className="text-lg font-normal serif-title flex items-center gap-3">
              <VolumeX size={20} className="text-[#E85002]" />
              Controle de Voz
            </h2>
            <p className="text-white/40 text-xs leading-relaxed italic">
              Interrompe imediatamente qualquer audiodescrição em andamento.
            </p>
            <button 
              onClick={stopAudio}
              className="liquid-button w-full"
            >
              Parar Todas as Vozes
            </button>
          </div>

          {/* Theme Control */}
          <div className="glass-card p-8 space-y-6">
            <h2 className="text-lg font-normal serif-title flex items-center gap-3">
              <Sun size={20} className="text-[#E85002]" />
              Preferência Visual
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${activeTheme === t.id ? 'border-[#E85002] bg-[#E85002]/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white">{t.label}</p>
                    <p className="text-[10px] text-white/30">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && <CheckCircle2 size={16} className="text-[#E85002]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Font Control */}
          <div className="glass-card p-8 md:col-span-2 space-y-8">
            <h2 className="text-lg font-normal serif-title flex items-center gap-3">
              <Type size={20} className="text-[#E85002]" />
              Escala Tipográfica
            </h2>
            <div className="flex items-center gap-6">
              <input
                type="range"
                min={14}
                max={32}
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E85002]"
              />
              <span className="text-xl font-bold w-12 text-center">{fontSize}px</span>
            </div>
            <div className="p-8 bg-black/40 rounded-xl border border-white/5">
              <p className="leading-relaxed font-light italic" style={{ fontSize: `${fontSize}px` }}>
                Este é um exemplo de como o texto do acervo será exibido para você.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
