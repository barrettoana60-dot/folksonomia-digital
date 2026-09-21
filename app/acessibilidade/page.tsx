'use client';

import { useState, useEffect } from 'react';
import { 
  Eye, Volume2, VolumeX, Sun, Moon, CheckCircle2, Type, 
  Sparkles, Keyboard, Sliders, RefreshCw, Volume1, Bookmark,
  Layers, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';

export default function AcessibilidadePage() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTheme, setActiveTheme] = useState('creme');
  const [fontSize, setFontSize] = useState(16);
  const [letterSpacing, setLetterSpacing] = useState('normal');
  const [lineHeight, setLineHeight] = useState('normal');
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highFocus, setHighFocus] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'creme';
    const savedFontSize = parseInt(localStorage.getItem('fontSize') || '16');
    const savedSpacing = localStorage.getItem('letterSpacing') || 'normal';
    const savedLineHeight = localStorage.getItem('lineHeight') || 'normal';
    const savedDyslexic = localStorage.getItem('dyslexicFont') === 'true';
    const savedMotion = localStorage.getItem('reducedMotion') === 'true';
    const savedFocus = localStorage.getItem('highFocus') === 'true';
    const savedRate = parseFloat(localStorage.getItem('speechRate') || '1.0');

    setActiveTheme(savedTheme);
    setFontSize(savedFontSize);
    setLetterSpacing(savedSpacing);
    setLineHeight(savedLineHeight);
    setDyslexicFont(savedDyslexic);
    setReducedMotion(savedMotion);
    setHighFocus(savedFocus);
    setSpeechRate(savedRate);

    applyGlobalSettings(savedTheme, savedFontSize, savedSpacing, savedLineHeight, savedDyslexic, savedMotion, savedFocus);
  }, []);

  const announceToScreenReader = (msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), 3000);
  };

  const applyGlobalSettings = (
    theme: string, 
    size: number, 
    spacing: string, 
    lh: string, 
    dyslexic: boolean, 
    motion: boolean,
    focus: boolean
  ) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.fontSize = `${size}px`;

    // Espaçamento entre letras
    root.style.letterSpacing = spacing === 'amplo' ? '0.08em' : spacing === 'expandido' ? '0.04em' : 'normal';

    // Altura de linha
    root.style.lineHeight = lh === 'triplo' ? '2.2' : lh === 'ampliado' ? '1.8' : '1.5';

    // Fonte dislexia
    if (dyslexic) {
      root.classList.add('font-dyslexic');
    } else {
      root.classList.remove('font-dyslexic');
    }

    // Movimento reduzido
    if (motion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Foco de alto contraste
    if (focus) {
      root.classList.add('high-focus-outline');
    } else {
      root.classList.remove('high-focus-outline');
    }
  };

  const changeTheme = (theme: string) => {
    setActiveTheme(theme);
    localStorage.setItem('theme', theme);
    applyGlobalSettings(theme, fontSize, letterSpacing, lineHeight, dyslexicFont, reducedMotion, highFocus);
    const themeName = themes.find(t => t.id === theme)?.label || theme;
    announceToScreenReader(`Tema alterado para ${themeName}`);
  };

  const changeFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
    applyGlobalSettings(activeTheme, size, letterSpacing, lineHeight, dyslexicFont, reducedMotion, highFocus);
    announceToScreenReader(`Tamanho de texto ajustado para ${size} pixels`);
  };

  const changeLetterSpacing = (spacing: string) => {
    setLetterSpacing(spacing);
    localStorage.setItem('letterSpacing', spacing);
    applyGlobalSettings(activeTheme, fontSize, spacing, lineHeight, dyslexicFont, reducedMotion, highFocus);
    announceToScreenReader(`Espaçamento entre letras ajustado para ${spacing}`);
  };

  const changeLineHeight = (lh: string) => {
    setLineHeight(lh);
    localStorage.setItem('lineHeight', lh);
    applyGlobalSettings(activeTheme, fontSize, letterSpacing, lh, dyslexicFont, reducedMotion, highFocus);
    announceToScreenReader(`Espaçamento entre linhas ajustado para ${lh}`);
  };

  const toggleDyslexicFont = () => {
    const newVal = !dyslexicFont;
    setDyslexicFont(newVal);
    localStorage.setItem('dyslexicFont', newVal.toString());
    applyGlobalSettings(activeTheme, fontSize, letterSpacing, lineHeight, newVal, reducedMotion, highFocus);
    announceToScreenReader(newVal ? 'Modo de fonte para dislexia ativado' : 'Modo de fonte padrão ativado');
  };

  const toggleReducedMotion = () => {
    const newVal = !reducedMotion;
    setReducedMotion(newVal);
    localStorage.setItem('reducedMotion', newVal.toString());
    applyGlobalSettings(activeTheme, fontSize, letterSpacing, lineHeight, dyslexicFont, newVal, highFocus);
    announceToScreenReader(newVal ? 'Animações e movimentos reduzidos' : 'Animações normais restauradas');
  };

  const toggleHighFocus = () => {
    const newVal = !highFocus;
    setHighFocus(newVal);
    localStorage.setItem('highFocus', newVal.toString());
    applyGlobalSettings(activeTheme, fontSize, letterSpacing, lineHeight, dyslexicFont, reducedMotion, newVal);
    announceToScreenReader(newVal ? 'Realce de foco em botões e links ativado' : 'Realce de foco desativado');
  };

  const changeSpeechRate = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem('speechRate', rate.toString());
    announceToScreenReader(`Velocidade de audiodescrição ajustada para ${rate} vezes`);
  };

  const testSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingTest(true);
      const text = 'Este é um teste da audiodescrição do Sistema de Folksonomia Digital. As expressões do patrimônio cultural brasileiro são narradas com clareza e precisão.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = speechRate;
      utterance.onend = () => setIsSpeakingTest(false);
      utterance.onerror = () => setIsSpeakingTest(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingTest(false);
      setAudioEnabled(false);
      setTimeout(() => setAudioEnabled(true), 1200);
      announceToScreenReader('Audiodescrição e narrações interrompidas');
    }
  };

  const resetDefaults = () => {
    setActiveTheme('creme');
    setFontSize(16);
    setLetterSpacing('normal');
    setLineHeight('normal');
    setDyslexicFont(false);
    setReducedMotion(false);
    setHighFocus(false);
    setSpeechRate(1.0);

    localStorage.removeItem('theme');
    localStorage.removeItem('fontSize');
    localStorage.removeItem('letterSpacing');
    localStorage.removeItem('lineHeight');
    localStorage.removeItem('dyslexicFont');
    localStorage.removeItem('reducedMotion');
    localStorage.removeItem('highFocus');
    localStorage.removeItem('speechRate');

    applyGlobalSettings('creme', 16, 'normal', 'normal', false, false, false);
    announceToScreenReader('Padrões de acessibilidade restaurados com sucesso');
  };

  const themes = [
    { id: 'creme', label: 'Modo Editorial Padrão', desc: 'Fundo creme suave, contraste equilibrado e leitura confortável' },
    { id: 'claro', label: 'Modo Branco', desc: 'Fundo branco limpo com texto preto para ambientes iluminados' },
    { id: 'contraste', label: 'Alto Contraste', desc: 'Fundo preto e amarelo intenso para máxima legibilidade' },
    { id: 'escuro', label: 'Modo Preto', desc: 'Fundo preto e texto claro para reduzir a emissão de luz' },
  ];

  const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-2.5";

  return (
    <main className="min-h-screen pt-28 pb-24 px-6" role="main" aria-label="Painel de Configurações de Acessibilidade">
      {/* ARIA Live Region para leitores de tela */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="max-w-4xl mx-auto space-y-8">

        {/* Cabeçalho */}
        <div className="text-center space-y-3 animate-fade-in">
          <img
            src="/logo-acessibilidade.svg"
            alt="Símbolo de acessibilidade da Folksonomia"
            className="w-24 h-20 object-contain mx-auto mb-2"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8490A]/10 border border-[#E8490A]/20 rounded-full text-[10px] uppercase font-bold text-[#E8490A] tracking-wider mb-1">
            <ShieldCheck size={14} /> Conformidade WCAG 2.1 Nível AAA
          </div>
          <h1 className="text-3xl md:text-4xl font-normal serif-title text-[#1A1A1A] tracking-tight">
            Central de Acessibilidade
          </h1>
          <p className="text-[#1A1A1A]/55 text-sm max-w-lg mx-auto">
            Personalize a tipografia, contraste, audiodescrição, foco e comportamento visual para uma navegação inclusiva e confortável.
          </p>
        </div>

        {/* Grade de Configurações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">

          {/* 1. PREFERÊNCIA VISUAL & TEMAS */}
          <div className="glass-card p-6 md:p-8 space-y-5">
            <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
              <Sun size={17} />
              Temas & Contraste Visual
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {themes.map(t => (
                <button
                  key={t.id}
                  id={`btn-tema-${t.id}`}
                  onClick={() => changeTheme(t.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${
                    activeTheme === t.id
                      ? 'bg-[#E8490A]/10 border-[#E8490A]/50 shadow-sm'
                      : 'bg-white/50 border-black/08 hover:border-black/20 hover:bg-white/80'
                  }`}
                  aria-pressed={activeTheme === t.id}
                >
                  <div className="pr-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] group-hover:text-[#E8490A] transition-colors">
                      {t.label}
                    </p>
                    <p className="text-[11px] text-[#1A1A1A]/50 mt-1 leading-snug">{t.desc}</p>
                  </div>
                  {activeTheme === t.id && (
                    <CheckCircle2 size={18} className="text-[#E8490A] shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Alternância de Modo Foco e Alto Realce */}
            <div className="pt-4 border-t border-black/07 space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-black/06 cursor-pointer hover:bg-white/70 transition-all">
                <div className="flex items-center gap-2.5">
                  <Zap size={16} className="text-[#E8490A]" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Realce de Foco Visual</p>
                    <p className="text-[10px] text-[#1A1A1A]/50">Bordas reforçadas em links e elementos clicáveis</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={highFocus}
                  onChange={toggleHighFocus}
                  className="w-4 h-4 accent-[#E8490A] cursor-pointer"
                  aria-label="Ativar realce de foco visual"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-black/06 cursor-pointer hover:bg-white/70 transition-all">
                <div className="flex items-center gap-2.5">
                  <Sliders size={16} className="text-[#E8490A]" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Reduzir Movimento</p>
                    <p className="text-[10px] text-[#1A1A1A]/50">Desativa transições rápidas e efeitos oscilatórios</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={toggleReducedMotion}
                  className="w-4 h-4 accent-[#E8490A] cursor-pointer"
                  aria-label="Reduzir movimentos e animações"
                />
              </label>
            </div>
          </div>

          {/* 2. AJUSTE TIPOGRÁFICO & LEGIBILIDADE */}
          <div className="glass-card p-6 md:p-8 space-y-6">
            <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
              <Type size={17} />
              Tipografia & Legibilidade
            </h2>

            {/* Tamanho da Fonte */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#1A1A1A]">
                <span>Tamanho Base da Fonte</span>
                <span className="font-mono text-[#E8490A] text-sm font-black">{fontSize}px</span>
              </div>
              <input
                id="slider-fonte"
                type="range"
                min={13}
                max={26}
                value={fontSize}
                onChange={e => changeFontSize(parseInt(e.target.value))}
                className="w-full h-2 bg-black/10 rounded-lg cursor-pointer accent-[#E8490A]"
                aria-label="Controle de tamanho de fonte em pixels"
              />
              <div className="flex justify-between text-[9px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider">
                <span>Compacto (13px)</span>
                <span>Padrão (16px)</span>
                <span>Ampliado (26px)</span>
              </div>
            </div>

            {/* Espaçamento entre Letras e Linhas */}
            <div className="space-y-3 pt-4 border-t border-black/07">
              <p className="text-xs font-bold text-[#1A1A1A]">Espaçamento entre Letras</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal' },
                  { id: 'expandido', label: 'Médio (+4%)' },
                  { id: 'amplo', label: 'Amplo (+8%)' }
                ].map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => changeLetterSpacing(sp.id)}
                    className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      letterSpacing === sp.id
                        ? 'bg-[#E8490A] text-white border-[#E8490A]'
                        : 'bg-white/50 text-[#1A1A1A]/70 border-black/08 hover:bg-white'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Espaçamento entre Linhas */}
            <div className="space-y-3 pt-3">
              <p className="text-xs font-bold text-[#1A1A1A]">Espaçamento entre Linhas (Entrelinha)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Padrão (1.5x)' },
                  { id: 'ampliado', label: 'Arejado (1.8x)' },
                  { id: 'triplo', label: 'Espaçoso (2.2x)' }
                ].map(lh => (
                  <button
                    key={lh.id}
                    onClick={() => changeLineHeight(lh.id)}
                    className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      lineHeight === lh.id
                        ? 'bg-[#E8490A] text-white border-[#E8490A]'
                        : 'bg-white/50 text-[#1A1A1A]/70 border-black/08 hover:bg-white'
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fonte para Dislexia */}
            <div className="pt-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-black/06 cursor-pointer hover:bg-white/70 transition-all">
                <div className="flex items-center gap-2.5">
                  <Bookmark size={16} className="text-[#E8490A]" />
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A]">Tipografia Amigável para Dislexia</p>
                    <p className="text-[10px] text-[#1A1A1A]/50">Caracteres diferenciados com base reforçada</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dyslexicFont}
                  onChange={toggleDyslexicFont}
                  className="w-4 h-4 accent-[#E8490A] cursor-pointer"
                  aria-label="Ativar fonte para dislexia"
                />
              </label>
            </div>

            {/* Painel de Pré-visualização Tipográfica */}
            <div className="p-4 rounded-xl bg-white/65 border border-black/08 space-y-1.5 shadow-inner">
              <p className="text-[9px] uppercase font-bold text-[#E8490A] tracking-wider">Amostra em Tempo Real</p>
              <p style={{ fontSize: `${fontSize}px` }} className="text-[#1A1A1A] font-normal leading-relaxed">
                As tradições do folclore brasileiro conectam saberes seculares de mestres e mestras artesãs.
              </p>
            </div>
          </div>

          {/* 3. AUDIODESCRIÇÃO & LEITOR DE VOZ */}
          <div className="glass-card p-6 md:p-8 space-y-5">
            <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
              <Volume2 size={17} />
              Audiodescrição & Voz Sintética
            </h2>
            <p className="text-xs text-[#1A1A1A]/60 leading-relaxed">
              O sistema oferece leitura por voz para os dossiês etnográficos das obras e termos de folksonomia.
            </p>

            {/* Velocidade da Fala */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#1A1A1A]">
                <span>Velocidade da Narração</span>
                <span className="font-mono text-[#E8490A] font-bold">{speechRate}x</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0.75, 1.0, 1.25, 1.5].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changeSpeechRate(rate)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      speechRate === rate
                        ? 'bg-[#E8490A] text-white border-[#E8490A]'
                        : 'bg-white/50 text-[#1A1A1A]/70 border-black/08 hover:bg-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Botões de Ação de Áudio */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={testSpeech}
                disabled={isSpeakingTest}
                className="w-full liquid-button !bg-[#E8490A] !text-white flex items-center justify-center gap-2 !py-2.5 font-bold shadow-md hover:!bg-[#c73d08]"
              >
                <Volume1 size={16} />
                {isSpeakingTest ? 'Reproduzindo Amostra...' : 'Ouvir Exemplo de Audiodescrição'}
              </button>

              <button
                id="btn-parar-audio"
                onClick={stopAudio}
                className="w-full liquid-button !bg-white/70 flex items-center justify-center gap-2 !py-2.5 text-xs font-bold border border-black/10 hover:!bg-red-50 hover:!text-red-600 hover:border-red-200"
              >
                <VolumeX size={16} className="text-red-500" />
                Interromper Qualquer Narração em Andamento
              </button>
            </div>
          </div>

          {/* 4. GUIA DE NAVEGAÇÃO POR TECLADO & ATALHOS */}
          <div className="glass-card p-6 md:p-8 space-y-5">
            <h2 className={sectionTitle} style={{ color: '#E8490A' }}>
              <Keyboard size={17} />
              Navegação por Teclado
            </h2>
            <p className="text-xs text-[#1A1A1A]/60 leading-relaxed">
              Todos os recursos da plataforma podem ser operados exclusivamente via teclado.
            </p>

            <div className="space-y-2 text-xs">
              {[
                { key: 'Tab', desc: 'Avança o foco para o próximo elemento interativo' },
                { key: 'Shift + Tab', desc: 'Retorna o foco para o elemento anterior' },
                { key: 'Enter / Espaço', desc: 'Ativa botões, links e expande cartões' },
                { key: 'Esc', desc: 'Fecha janelas modais e interrompe narrações de voz' },
                { key: 'Alt + 1', desc: 'Atalho direto para a Página Inicial de Obras' },
                { key: 'Alt + 2', desc: 'Atalho direto para a Central de Acessibilidade' },
                { key: 'Alt + 3', desc: 'Atalho para o Painel de Administração e Gráficos' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-black/05 last:border-0">
                  <kbd className="px-2 py-0.5 bg-black/06 border border-black/10 rounded font-mono text-[10px] font-bold text-[#1A1A1A]">
                    {shortcut.key}
                  </kbd>
                  <span className="text-[11px] text-[#1A1A1A]/60 text-right">{shortcut.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTÃO DE RESTAURAR PADRÕES */}
        <div className="glass-card p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-sm font-bold text-[#1A1A1A]">Restaurar Preferências Originais</h3>
            <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Retorna todas as fontes, temas e contrastes para os valores de fábrica.</p>
          </div>
          <button
            onClick={resetDefaults}
            className="liquid-button !bg-white/80 border border-black/10 text-xs font-bold flex items-center gap-2 hover:!bg-black/05 active:scale-95 transition-all shrink-0"
          >
            <RefreshCw size={14} className="text-[#E8490A]" />
            Restaurar Padrões
          </button>
        </div>

      </div>
    </main>
  );
}

