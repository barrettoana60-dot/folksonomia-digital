'use client';

import { useState } from 'react';
import { Eye, VolumeX, Type, Sun, CheckCircle2 } from 'lucide-react';

export default function AcessibilidadePage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('escuro');
  const [fontSize, setFontSize] = useState(18);

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
    <main className="min-h-screen pt-24 pb-20 px-6 bg-black text-white selection:bg-[#E85002]/30">

      <div className="max-w-4xl mx-auto space-y-12">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-white/5 border border-white/10 mb-4">
            <Eye size={48} className="text-white" strokeWidth={1} />
          </div>
          <h1 className="text-4xl font-normal serif-title tracking-tight uppercase">Acessibilidade</h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">Personalize sua experiência de navegação no Sistema de Folksonomia.</p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Audio Control */}
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
                <VolumeX size={20} className="text-white/50" />
                Controle de Voz
              </h2>
              <button 
                onClick={stopAudio}
                className={`liquid-button px-4 py-2 text-[10px] ${!audioEnabled ? '!bg-[#E85002] !text-white' : ''}`}
              >
                {!audioEnabled ? 'Áudio Parado' : 'Interromper Agora'}
              </button>
            </div>
            <p className="text-white/40 text-sm leading-relaxed italic">Cessa imediatamente qualquer audiodescrição ou leitura em andamento no sistema.</p>
          </div>


          {/* Theme Control */}
          <div className="glass-card p-8 space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-3">
              <Sun size={20} className="text-white/50" />
              Preferência Visual
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all ${activeTheme === t.id ? 'border-[#E85002] bg-[#E85002]/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase">{t.label}</p>
                    <p className="text-[9px] text-white/30">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && <CheckCircle2 size={16} className="text-[#E85002]" />}
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
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E85002]"
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
