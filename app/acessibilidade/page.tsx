'use client';

import { useState, useEffect } from 'react';
import { Eye, VolumeX, Sun, CheckCircle2, Type } from 'lucide-react';

export default function AcessibilidadePage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('escuro');
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    // Aplicar tema e fonte ao carregar
    const savedTheme = localStorage.getItem('theme') || 'escuro';
    const savedFontSize = parseInt(localStorage.getItem('fontSize') || '16');
    
    setActiveTheme(savedTheme);
    setFontSize(savedFontSize);
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.style.fontSize = savedFontSize + 'px';
  }, []);

  const changeTheme = (theme: string) => {
    setActiveTheme(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  };

  const changeFontSize = (size: number) => {
    setFontSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.style.fontSize = size + 'px';
      localStorage.setItem('fontSize', size.toString());
    }
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      // Feedback visual momentâneo
      setAudioEnabled(false);
      setTimeout(() => setAudioEnabled(true), 1500);
    }
  };


  const themes = [
    { id: 'escuro', label: 'Modo Escuro', desc: 'Fundo preto, texto branco' },
    { id: 'claro', label: 'Modo Claro', desc: 'Fundo cinza claro, texto escuro' },
    { id: 'contraste', label: 'Alto Contraste', desc: 'Preto e Amarelo institucional' },
  ];

  return (
    <main className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-normal">Acessibilidade</h1>
          <p className="text-white/50 max-w-md mx-auto text-sm">Personalize sua experiência de navegação no Sistema de Folksonomia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Theme Control */}
          <div className="glass-card p-10 space-y-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center gap-3 text-[#10B981]">
              <Sun size={16} />
              Preferência Visual
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => changeTheme(t.id)}
                  className={`flex items-center justify-between p-4 !rounded-xl !bg-transparent border transition-all ${activeTheme === t.id ? 'border-[#10B981]' : 'border-white/5'}`}
                >
                  <div className="text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-wider">{t.label}</p>
                    <p className="text-[10px] opacity-40">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && <CheckCircle2 size={16} className="text-[#10B981]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Audio & Font */}
          <div className="glass-card p-10 space-y-8">
            <div className="space-y-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center gap-3 text-[#10B981]">
                <VolumeX size={16} />
                Controle de Voz
              </h2>
              <button 
                onClick={stopAudio}
                className={`liquid-button w-full transition-all ${!audioEnabled ? '!bg-red-500/20 !border-red-500/50' : '!bg-white/5'}`}
              >
                {!audioEnabled ? 'Áudio Interrompido' : 'Interromper Audiodescrição'}
              </button>
              <p className="text-[10px] opacity-50 italic text-center">Cessa imediatamente qualquer narração em andamento.</p>

            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center gap-3 text-[#10B981]">
                <Type size={16} />
                Tamanho da Fonte
              </h2>
              <input
                type="range"
                min={12}
                max={24}
                value={fontSize}
                onChange={e => changeFontSize(parseInt(e.target.value))}
                className="w-full accent-[#10B981]"
              />
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <p style={{ fontSize: `${fontSize}px` }}>Exemplo de visualização tipográfica. (Tamanho: {fontSize}px)</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
