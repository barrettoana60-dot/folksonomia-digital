'use client';

import { useState } from 'react';
import { Eye, VolumeX, Type, Sun, CheckCircle2 } from 'lucide-react';

export default function AcessibilidadePage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [activeTheme, setActiveTheme] = useState('escuro');

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAudioEnabled(false);
    }
  };

  const themes = [
    { id: 'escuro', label: 'Escuro', desc: 'Fundo preto, texto branco' },
    { id: 'contraste', label: 'Contraste', desc: 'Alto contraste institucional' },
    { id: 'claro', label: 'Claro', desc: 'Fundo cinza claro' },
  ];

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 bg-[#000814] text-white selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-white/5 border border-white/10 mb-4">
            <Eye size={48} className="text-white" strokeWidth={1} />
          </div>
          <h1 className="text-4xl font-normal serif-title tracking-tight uppercase">Acessibilidade</h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">Personalize sua experiência de navegação no Sistema Folksonomia Digital.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Audio Control */}
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
                <VolumeX size={20} className="text-white/50" />
                Áudio Descrição
              </h2>
              <button 
                onClick={stopAudio}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${!audioEnabled ? 'bg-white text-black' : 'border border-white/10 text-white/50 hover:bg-white/5'}`}
              >
                {!audioEnabled ? 'Áudio Parado' : 'Parar Áudio'}
              </button>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">Interrompe imediatamente qualquer narração ou leitura de tela em andamento no sistema.</p>
          </div>

          {/* Theme Control */}
          <div className="glass-card p-8 space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
              <Sun size={20} className="text-white/50" />
              Modo Visual
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${activeTheme === t.id ? 'border-white bg-white/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase">{t.label}</p>
                    <p className="text-[10px] text-white/40">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && <CheckCircle2 size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Font Control */}
          <div className="glass-card p-8 md:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
                <Type size={20} className="text-white/50" />
                Tamanho da Fonte: <span className="text-white">{fontSize}px</span>
              </h2>
            </div>
            <input
              type="range"
              min={14}
              max={32}
              value={fontSize}
              onChange={e => setFontSize(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="p-6 bg-white/5 rounded-lg border border-white/5">
              <p className="leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                Exemplo de texto para visualização da escala tipográfica no acervo institucional.
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
