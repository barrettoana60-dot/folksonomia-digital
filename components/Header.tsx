// trigger redeploy force
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Logo from '@/components/Logo';
import { Accessibility, VolumeX, ZoomIn, Type, AlignJustify, Sun } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Tipos                                                               */
/* ------------------------------------------------------------------ */
type ThemeKey = 'creme' | 'claro' | 'contraste' | 'escuro';
type FontFamilyKey = 'sans' | 'serif' | 'mono';

const FONT_LABEL: Record<FontFamilyKey, string> = {
  sans:  'Sem Serifa (padrão)',
  serif: 'Com Serifa',
  mono:  'Monoespaçada',
};

const FONT_STACK: Record<FontFamilyKey, string> = {
  sans:  `var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif`,
  serif: `Georgia, 'Times New Roman', serif`,
  mono:  `'Courier New', Courier, monospace`,
};

const THEME_LABEL: Record<ThemeKey, string> = {
  creme:     'Creme (padrão)',
  claro:     'Branco',
  contraste: 'Alto Contraste',
  escuro:    'Escuro',
};

const THEME_SWATCH: Record<ThemeKey, string> = {
  creme:     '#EEEBE3',
  claro:     '#FFFFFF',
  contraste: '#000000',
  escuro:    '#181818',
};

/* ------------------------------------------------------------------ */
/*  Aplicar tema via CSS vars no <html>                                 */
/* ------------------------------------------------------------------ */
function applyTheme(theme: ThemeKey) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'contraste') {
    root.style.setProperty('--bg-page',   '#000');
    root.style.setProperty('--text-page', '#FFD600');
    root.style.setProperty('--card-bg',   '#111');
    root.style.setProperty('--border',    '#FFD600');
  } else if (theme === 'escuro') {
    root.style.setProperty('--bg-page',   '#181818');
    root.style.setProperty('--text-page', '#ECECEC');
    root.style.setProperty('--card-bg',   '#242424');
    root.style.setProperty('--border',    '#3A3A3A');
  } else if (theme === 'claro') {
    root.style.setProperty('--bg-page',   '#FFFFFF');
    root.style.setProperty('--text-page', '#111111');
    root.style.setProperty('--card-bg',   '#F8F8F8');
    root.style.setProperty('--border',    '#DDDDDD');
  } else {
    root.style.setProperty('--bg-page',   '#EEEBE3');
    root.style.setProperty('--text-page', '#1A1A1A');
    root.style.setProperty('--card-bg',   'rgba(255,255,255,0.55)');
    root.style.setProperty('--border',    'rgba(0,0,0,0.09)');
  }
  // background on html element so body::before overlay still works
  document.documentElement.style.backgroundColor = THEME_SWATCH[theme];
}



/* ------------------------------------------------------------------ */
/*  Componente Header                                                   */
/* ------------------------------------------------------------------ */
export default function Header() {
  const pathname  = usePathname();
  const router    = useRouter();

  const [isAdmin,           setIsAdmin]           = useState(false);
  const [dropdownOpen,      setDropdownOpen]       = useState(false);
  const [mobileMenuOpen,    setMobileMenuOpen]     = useState(false);
  const [isMounted,         setIsMounted]          = useState(false);
  const [accessibilityOpen, setAccessibilityOpen]  = useState(false);

  // --- acessibilidade ---
  const [activeTheme,   setActiveTheme]   = useState<ThemeKey>('creme');
  const [fontFamily,    setFontFamily]    = useState<FontFamilyKey>('sans');
  const [fontSize,      setFontSize]      = useState(16);
  const [lineHeight,    setLineHeight]    = useState(1.5);
  const [zoomLevel,     setZoomLevel]     = useState(100);
  const [librasActive,  setLibrasActive]  = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  /* ---- inicializar ---- */
  useEffect(() => {
    setIsMounted(true);

    const checkToken = () => setIsAdmin(!!localStorage.getItem('admin_token'));
    checkToken();
    window.addEventListener('storage', checkToken);

    // carregar preferências salvas
    const savedTheme      = (localStorage.getItem('theme')      || 'creme')  as ThemeKey;
    const savedFont       = (localStorage.getItem('fontFamily') || 'sans')   as FontFamilyKey;
    const savedFontSize   = parseInt(localStorage.getItem('fontSize')   || '16');
    const savedLineHeight = parseFloat(localStorage.getItem('lineHeight') || '1.5');
    const savedZoom       = parseInt(localStorage.getItem('zoomLevel')  || '100');

    setActiveTheme(savedTheme);
    setFontFamily(savedFont);
    setFontSize(savedFontSize);
    setLineHeight(savedLineHeight);
    setZoomLevel(savedZoom);

    applyTheme(savedTheme);
    document.documentElement.style.setProperty('--text-scale-factor', String(savedFontSize / 16));
    document.documentElement.style.setProperty('--font-current', FONT_STACK[savedFont]);
    document.documentElement.style.lineHeight = String(savedLineHeight);
    // @ts-ignore
    document.body.style.zoom = `${savedZoom}%`;

    return () => window.removeEventListener('storage', checkToken);
  }, []);


  /* ---- fechar ao navegar ---- */
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setAccessibilityOpen(false);
  }, [pathname]);

  /* ---- fechar painel ao clicar fora ---- */
  useEffect(() => {
    if (!accessibilityOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAccessibilityOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accessibilityOpen]);

  /* ---- handlers ---- */
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    window.dispatchEvent(new Event('storage'));
  };

  const changeTheme = (theme: ThemeKey) => {
    setActiveTheme(theme);
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  };

  const changeFontFamily = (ff: FontFamilyKey) => {
    setFontFamily(ff);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--font-current', FONT_STACK[ff]);
      localStorage.setItem('fontFamily', ff);
    }
  };

  const changeFontSize = (size: number) => {
    const s = Math.min(28, Math.max(12, size));
    setFontSize(s);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--text-scale-factor', String(s / 16));
      localStorage.setItem('fontSize', s.toString());
    }
  };

  const changeLineHeight = (lh: number) => {
    setLineHeight(lh);
    document.documentElement.style.lineHeight = String(lh);
    localStorage.setItem('lineHeight', lh.toString());
  };

  const changeZoom = (zoom: number) => {
    setZoomLevel(zoom);
    // @ts-ignore
    document.body.style.zoom = `${zoom}%`;
    localStorage.setItem('zoomLevel', zoom.toString());
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleLibras = () => {
    // O VLibras controla seu próprio estado interno.
    // Clicamos diretamente no botão flutuante oficial para abrir/fechar o intérprete.
    const btn = document.querySelector('[vw-access-button]') as HTMLElement | null;
    if (btn) {
      btn.click();
      setLibrasActive(prev => !prev);
    }
  };


  const resetAll = () => {
    changeTheme('creme');
    changeFontFamily('sans');
    changeFontSize(16);
    changeLineHeight(1.5);
    changeZoom(100);
  };

  /* ---- estilos ---- */
  const headerStyle = {
    background:          'rgba(255,255,255,0.76)',
    backdropFilter:      'blur(20px) saturate(190%)',
    WebkitBackdropFilter:'blur(20px) saturate(190%)',
    border:              '1.5px solid rgba(255,255,255,0.6)',
    boxShadow:           '0 8px 32px rgba(0,0,0,0.06)',
  };

  /* ---- skeleton SSR ---- */
  if (!isMounted) {
    return (
      <header
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-50 h-14 md:h-16 flex items-center justify-between px-4 md:px-10 print:hidden rounded-full"
        style={headerStyle}
      >
        <div className="flex items-center gap-2.5 cursor-pointer">
          <Logo className="w-7 h-7 md:w-9 md:h-9" />
          <span className="text-[#0D3A85] text-xs md:text-base font-black tracking-wider uppercase font-sans">
            Sistema de Folksonomia
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 h-8 bg-white/20 rounded-full animate-pulse" />
        </div>
      </header>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Painel de acessibilidade (reutilizado em desktop e mobile)        */
  /* ---------------------------------------------------------------- */
  const AccessibilityPanel = ({ compact = false }: { compact?: boolean }) => (
    <div className={`space-y-4 ${compact ? '' : 'p-4'}`}>

      {/* Cabeçalho do painel */}
      {!compact && (
        <div className="flex items-center justify-between border-b border-black/5 pb-2">
          <div className="flex items-center gap-2">
            <Accessibility size={15} className="text-[#0D3A85]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D3A85]">
              Acessibilidade
            </span>
          </div>
          <button
            onClick={resetAll}
            className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/35 hover:text-[#0D3A85] transition-colors"
          >
            Restaurar Tudo
          </button>
        </div>
      )}

      {/* ---- Tamanho do Texto ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type size={12} className="text-[#1A1A1A]/40" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
              Tamanho do Texto
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#1A1A1A]/50">{fontSize}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeFontSize(fontSize - 2)}
            className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 text-sm font-bold transition-all flex items-center justify-center shrink-0"
            aria-label="Diminuir texto"
          >A-</button>
          <input
            type="range"
            min={12} max={28} step={2}
            value={fontSize}
            onChange={e => changeFontSize(Number(e.target.value))}
            className="flex-1 h-1.5 accent-[#0D3A85] cursor-pointer"
          />
          <button
            onClick={() => changeFontSize(fontSize + 2)}
            className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 text-sm font-bold transition-all flex items-center justify-center shrink-0"
            aria-label="Aumentar texto"
          >A+</button>
        </div>
      </div>

      {/* ---- Espaçamento entre Linhas ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlignJustify size={12} className="text-[#1A1A1A]/40" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
              Espaçamento de Linhas
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#1A1A1A]/50">{lineHeight.toFixed(1)}</span>
        </div>
        <div className="flex gap-1.5">
          {[1.2, 1.5, 1.8, 2.0].map(lh => (
            <button
              key={lh}
              onClick={() => changeLineHeight(lh)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                lineHeight === lh ? 'bg-[#0D3A85] text-white' : 'bg-black/5 hover:bg-black/10'
              }`}
            >
              {lh.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Zoom (Lupa) ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ZoomIn size={12} className="text-[#1A1A1A]/40" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
              Zoom da Página
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#1A1A1A]/50">{zoomLevel}%</span>
        </div>
        <input
          type="range"
          min={80} max={160} step={10}
          value={zoomLevel}
          onChange={e => changeZoom(Number(e.target.value))}
          className="w-full h-1.5 accent-[#0D3A85] cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-[#1A1A1A]/30 font-mono">
          <span>80%</span><span>100%</span><span>130%</span><span>160%</span>
        </div>
      </div>

      {/* ---- Família Tipográfica ---- */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 block">
          Família Tipográfica
        </span>
        <div className="flex flex-col gap-1">
          {(['sans', 'serif', 'mono'] as FontFamilyKey[]).map(ff => (
            <button
              key={ff}
              onClick={() => changeFontFamily(ff)}
              className={`w-full py-1.5 px-3 rounded-lg text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                fontFamily === ff
                  ? 'border-[#0D3A85]/30 bg-[#0D3A85]/8 text-[#0D3A85]'
                  : 'border-transparent hover:bg-black/5 text-[#1A1A1A]/70'
              }`}
              style={{ fontFamily: FONT_STACK[ff] }}
            >
              <span>{FONT_LABEL[ff]}</span>
              {fontFamily === ff && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D3A85] shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Contraste Visual ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sun size={12} className="text-[#1A1A1A]/40" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
            Contraste Visual
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['creme', 'claro', 'contraste', 'escuro'] as ThemeKey[]).map(t => (
            <button
              key={t}
              onClick={() => changeTheme(t)}
              className={`py-2 px-2.5 rounded-xl text-left text-[10px] font-bold flex items-center gap-2 border transition-all ${
                activeTheme === t
                  ? 'border-[#0D3A85]/40 bg-[#0D3A85]/8 text-[#0D3A85]'
                  : 'border-transparent bg-black/4 hover:bg-black/8 text-[#1A1A1A]/65'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/15"
                style={{ background: THEME_SWATCH[t] }}
              />
              {THEME_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ---- VLibras ---- */}
      <div className="space-y-1.5 pt-2 border-t border-black/5">
        <button
          onClick={toggleLibras}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            librasActive
              ? 'bg-[#0D3A85] text-white border-[#0D3A85]'
              : 'bg-[#0D3A85]/8 text-[#0D3A85] border-transparent hover:bg-[#0D3A85]/15'
          }`}
        >
          {/* ícone de mãos em Libras — SVG simples sem emoji */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
          <span>{librasActive ? 'Desativar VLibras (Libras)' : 'Ativar VLibras (Libras)'}</span>
        </button>
        <p className="text-[9px] text-[#1A1A1A]/35 text-center leading-tight">
          Plugin oficial — Secretaria de Governo Digital
        </p>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <>
      <header
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-50 h-14 md:h-16 flex items-center justify-between px-4 md:px-10 print:hidden rounded-full transition-all duration-300"
        style={headerStyle}
      >
        {/* Branding */}
        <div
          onClick={() => router.push('/')}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <Logo className="w-7 h-7 md:w-9 md:h-9 transition-transform group-hover:scale-105" />
          <span className="text-[#0D3A85] text-[11px] md:text-base font-black tracking-wider uppercase font-sans">
            Sistema de Folksonomia
          </span>
        </div>

        {/* Lado Direito */}
        <div className="flex items-center gap-3">

          {/* Acessibilidade — Desktop */}
          <div className="relative hidden md:block" ref={panelRef}>
            <button
              onClick={() => setAccessibilityOpen(!accessibilityOpen)}
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                accessibilityOpen
                  ? 'bg-[#0D3A85] text-white border-[#0D3A85]'
                  : 'bg-white/40 border-white/50 text-[#0D3A85] hover:bg-[#0D3A85]/10'
              }`}
              title="Acessibilidade"
              aria-label="Abrir menu de acessibilidade"
              aria-expanded={accessibilityOpen}
            >
              <Accessibility size={18} />
            </button>

            {accessibilityOpen && (
              <div
                className="absolute right-0 mt-3 w-80 rounded-2xl z-50 animate-fade-in text-[#1A1A1A] overflow-hidden"
                style={{
                  background:   'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(28px)',
                  border:       '1.5px solid rgba(255,255,255,0.85)',
                  boxShadow:    '0 20px 60px rgba(0,0,0,0.13)',
                }}
              >
                <div className="max-h-[80vh] overflow-y-auto p-4">
                  <AccessibilityPanel />
                </div>
              </div>
            )}
          </div>

          {/* Auth — Desktop */}
          <nav className="hidden md:flex items-center gap-3">
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full liquid-button hover:scale-105 transition-transform"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#0D3A85] uppercase"
                    style={{ color: '#fff' }}
                  >
                    A
                  </div>
                  <span className="text-[#1A1A1A]/70 text-[11px] font-bold">Painel Gestão</span>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl p-2 z-50 animate-fade-in"
                    style={{
                      background:      'rgba(255,255,255,0.94)',
                      backdropFilter:  'blur(20px)',
                      border:          '1px solid rgba(255,255,255,0.8)',
                      boxShadow:       '0 12px 32px rgba(0,0,0,0.10)',
                    }}
                  >
                    <div className="px-3 py-2 border-b border-black/5 mb-1.5">
                      <p className="text-xs font-bold text-[#0D3A85]">Curador</p>
                      <p className="text-[9px] text-[#1A1A1A]/40 uppercase tracking-wider mt-0.5">Administrador</p>
                    </div>
                    {pathname !== '/admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#1A1A1A]/75 hover:bg-black/5 hover:text-[#0D3A85] transition-all text-left font-semibold"
                      >
                        Painel Gestão
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C62228] hover:bg-red-50 transition-all text-left font-semibold"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="liquid-button !bg-white/40 !border-white/50 !text-[#1A1A1A] !py-2.5 !px-6 !rounded-full !text-[11px] !font-bold hover:scale-105 active:scale-95 transition-transform"
                >
                  Entrar
                </Link>
              </div>
            )}
          </nav>

          {/* Hambúrguer — mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-xl liquid-button gap-1.5"
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-[#0D3A85] transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#0D3A85] transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#0D3A85] transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-20 left-4 right-4 rounded-3xl p-5 animate-slide-up overflow-y-auto max-h-[80vh]"
            style={{
              background:     'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(28px)',
              border:         '1.5px solid rgba(255,255,255,0.85)',
              boxShadow:      '0 20px 60px rgba(0,0,0,0.14)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Acessibilidade no mobile */}
            <div className="border-b border-black/5 pb-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Accessibility size={15} className="text-[#0D3A85]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D3A85]">
                    Acessibilidade
                  </span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/35 hover:text-[#0D3A85] transition-colors"
                >
                  Restaurar Tudo
                </button>
              </div>
              <AccessibilityPanel compact />
            </div>

            {/* Auth mobile */}
            {isAdmin ? (
              <div className="space-y-1">
                {pathname !== '/admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#0D3A85] hover:bg-[#0D3A85]/5 transition-all uppercase tracking-wider"
                  >
                    Painel Gestão
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#C62228] hover:bg-red-50 transition-all uppercase tracking-wider text-left"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="liquid-button !w-full !justify-center !py-3 !rounded-2xl !text-[12px] !font-bold !bg-white/70"
                >
                  Entrar
                </Link>
                <Link
                  href="/questionario"
                  className="liquid-button !w-full !justify-center !py-3 !rounded-2xl !text-[12px] !font-bold !bg-[#0D3A85] shadow-[0_4px_12px_rgba(13,58,133,0.2)]"
                  style={{ color: '#fff' }}
                >
                  Comece agora
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
