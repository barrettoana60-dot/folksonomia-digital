'use client';

import { useState, useEffect } from 'react';
import { Eye, VolumeX, Sun, CheckCircle2, Type } from 'lucide-react';

export default function AcessibilidadePage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('creme');
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'creme';
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
      setAudioEnabled(false);
      setTimeout(() => setAudioEnabled(true), 1500);
    }
  };

  const themes = [
    { id: 'creme', label: 'Modo Padrão', desc: 'Fundo creme, texto escuro — padrão do sistema' },
    { id: 'claro', label: 'Modo Claro', desc: 'Fundo branco, texto escuro' },
    { id: 'contraste', label: 'Alto Contraste', desc: 'Preto e Amarelo — máxima legibilidade' },
  ];

  const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.13em] flex items-center gap-3";

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Cabeçalho */}
        <div className="text-center space-y-3 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-normal serif-title text-[#1A1A1A] tracking-tight">
            Acessibilidade
          </h1>
          <p className="text-[#1A1A1A]/45 text-sm max-w-md mx-auto">
            Personalize sua experiência de navegação no Sistema de Folksonomia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">

          {/* Preferência Visual */}
          <div className="glass-card p-8 space-y-6">
            <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
              <Sun size={16} />
              Preferência Visual
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  id={`btn-tema-${t.id}`}
                  onClick={() => changeTheme(t.id)}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all text-left"
                  style={{
                    background: activeTheme === t.id
                      ? 'rgba(232,73,10,0.06)'
                      : 'rgba(255,255,255,0.45)',
                    borderColor: activeTheme === t.id
                      ? 'rgba(232,73,10,0.40)'
                      : 'rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1A1A1A]">
                      {t.label}
                    </p>
                    <p className="text-[10px] text-[#1A1A1A]/40 mt-0.5">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && (
                    <CheckCircle2 size={16} style={{ color: '#E8490A', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Áudio e Fonte */}
          <div className="glass-card p-8 space-y-8">
            {/* Controle de Voz */}
            <div className="space-y-4">
              <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
                <VolumeX size={16} />
                Controle de Voz
              </h2>
              <button
                id="btn-parar-audio"
                onClick={stopAudio}
                className="liquid-button w-full !text-[11px] !font-semibold !tracking-[0.12em]"
                style={!audioEnabled ? {
                  background: 'rgba(192,37,43,0.10)',
                  borderColor: 'rgba(192,37,43,0.30)',
                  color: '#C0252B',
                } : {}}
              >
                {!audioEnabled ? 'Áudio Interrompido' : 'Interromper Audiodescrição'}
              </button>
              <p className="text-[10px] text-[#1A1A1A]/38 italic text-center">
                Cessa imediatamente qualquer narração em andamento.
              </p>
            </div>

            {/* Tamanho da Fonte */}
            <div className="space-y-4 pt-6 border-t border-[#1A1A1A]/06">
              <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
                <Type size={16} />
                Tamanho da Fonte
              </h2>
              <input
                id="slider-fonte"
                type="range"
                min={12}
                max={24}
                value={fontSize}
                onChange={e => changeFontSize(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: '#E8490A' }}
              />
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(0,0,0,0.07)',
                }}
              >
                <p style={{ fontSize: `${fontSize}px` }} className="text-[#1A1A1A]">
                  Exemplo de visualização tipográfica. (Tamanho: {fontSize}px)
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
