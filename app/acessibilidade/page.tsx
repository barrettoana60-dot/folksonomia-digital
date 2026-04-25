'use client';

import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

export default function AcessibilidadePage() {
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<'escuro' | 'claro' | 'contraste'>('escuro');

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-8">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/10 mb-6">
            <Eye size={40} className="text-green-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Acessibilidade</h1>
          <p className="text-white/60">Ajuste a experiência visual de acordo com suas preferências.</p>
        </div>

        {/* Theme */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6">Modo visual</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'escuro', label: 'Escuro', desc: 'Fundo escuro, texto claro' },
              { id: 'claro', label: 'Claro', desc: 'Fundo claro (em breve)' },
              { id: 'contraste', label: 'Alto Contraste', desc: 'Amarelo sobre preto' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`rounded-2xl p-4 text-left border transition-all ${
                  theme === t.id
                    ? 'border-blue-400/60 bg-blue-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="font-bold text-white mb-1">{t.label}</div>
                <div className="text-white/50 text-xs">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6">
            Tamanho da tipografia: <span className="text-blue-300">{fontSize}px</span>
          </h2>
          <input
            type="range"
            min={14}
            max={28}
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
          <div className="flex justify-between text-white/30 text-xs mt-2">
            <span>Menor</span>
            <span>Maior</span>
          </div>
          <p className="text-white mt-6 leading-relaxed" style={{ fontSize }}>
            Exemplo de texto com a tipografia selecionada. Sistema Folksonomia Digital.
          </p>
        </div>

        {/* Audio */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-4">Audiodescrição</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            Em cada obra do acervo, o botão de audiodescrição está disponível para narrar os elementos visuais em voz alta. 
            Utilize um fone de ouvido para melhor experiência.
          </p>
          <button
            onClick={() => {
              const u = new SpeechSynthesisUtterance('Sistema Folksonomia Digital. A audiodescrição está ativa e pronta para uso nas obras do acervo.');
              u.lang = 'pt-BR';
              window.speechSynthesis.speak(u);
            }}
            className="liquid-button px-6 py-3"
          >
            Testar audiodescrição
          </button>
        </div>

      </div>
    </main>
  );
}
