'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Accessibility, VolumeX } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Estados de acessibilidade
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('creme');
  const [fontSize, setFontSize] = useState(16);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [librasActive, setLibrasActive] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkToken = () => {
      const token = localStorage.getItem('admin_token');
      setIsAdmin(!!token);
    };
    checkToken();
    window.addEventListener('storage', checkToken);

    // Carregar configurações de acessibilidade
    const savedTheme = localStorage.getItem('theme') || 'creme';
    const savedFontSize = parseInt(localStorage.getItem('fontSize') || '16');
    const savedZoom = parseInt(localStorage.getItem('zoomLevel') || '100');

    setActiveTheme(savedTheme);
    setFontSize(savedFontSize);
    setZoomLevel(savedZoom);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.documentElement.style.fontSize = savedFontSize + 'px';
      // Esperar o body estar pronto para aplicar o zoom
      setTimeout(() => {
        if (document.body) {
          // @ts-ignore
          document.body.style.zoom = `${savedZoom}%`;
        }
      }, 100);
    }

    return () => window.removeEventListener('storage', checkToken);
  }, []);

  // Fechar menus ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setAccessibilityOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    window.dispatchEvent(new Event('storage'));
  };

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

  const changeZoom = (zoom: number) => {
    setZoomLevel(zoom);
    if (typeof document !== 'undefined' && document.body) {
      // @ts-ignore
      document.body.style.zoom = `${zoom}%`;
      localStorage.setItem('zoomLevel', zoom.toString());
    }
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleLibras = () => {
    setLibrasActive(!librasActive);
    if (typeof document === 'undefined') return;

    const existingVw = document.querySelector('[vw]');
    if (existingVw) {
      const isVisible = existingVw.getAttribute('style') !== 'display: none;';
      existingVw.setAttribute('style', isVisible ? 'display: none;' : 'display: block; position: fixed; right: 20px; bottom: 20px; z-index: 99999;');
      return;
    }

    // Criar a estrutura DOM necessária para o VLibras
    const div = document.createElement('div');
    div.setAttribute('vw', 'true');
    div.className = 'enabled';
    div.setAttribute('style', 'position: fixed; right: 20px; bottom: 20px; z-index: 99999;');

    const divBtn = document.createElement('div');
    divBtn.setAttribute('vw-access-button', 'true');
    divBtn.className = 'active';

    const divPlugin = document.createElement('div');
    divPlugin.setAttribute('vw-plugin-wrapper', 'true');

    const divTop = document.createElement('div');
    divTop.className = 'vw-plugin-top-wrapper';

    divPlugin.appendChild(divTop);
    div.appendChild(divBtn);
    div.appendChild(divPlugin);
    document.body.appendChild(div);

    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      // @ts-ignore
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    };
    document.body.appendChild(script);
  };


  const navLinkClass = (active: boolean) =>
    `text-[11px] md:text-[12px] font-bold uppercase tracking-wider transition-all ${
      active
        ? 'text-[#0D3A85] border-b-2 border-[#0D3A85] pb-1'
        : 'text-[#1A1A1A]/65 hover:text-[#0D3A85]'
    }`;

  const headerStyle = {
    background: 'rgba(255,255,255,0.76)',
    backdropFilter: 'blur(20px) saturate(190%)',
    WebkitBackdropFilter: 'blur(20px) saturate(190%)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
  };

  /* Skeleton SSR */
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
          <span className="w-20 h-8 bg-white/20 rounded-full animate-pulse"></span>
        </div>
      </header>
    );
  }

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

        {/* Lado Direito: Acessibilidade + Auth */}
        <div className="flex items-center gap-3">
          {/* Menu de Acessibilidade (Desktop) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setAccessibilityOpen(!accessibilityOpen)}
              className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${
                accessibilityOpen
                  ? 'bg-[#0D3A85] text-white border-[#0D3A85]'
                  : 'bg-white/40 border-white/50 text-[#0D3A85] hover:bg-[#0D3A85]/10'
              }`}
              title="Acessibilidade"
              aria-label="Menu de Acessibilidade"
            >
              <Accessibility size={18} />
            </button>

            {accessibilityOpen && (
              <div
                className="absolute right-0 mt-3 w-72 rounded-2xl p-4 z-50 animate-fade-in text-[#1A1A1A] space-y-4"
                style={{
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(24px)',
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                }}
              >
                {/* Title */}
                <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                  <Accessibility size={16} className="text-[#0D3A85]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0D3A85]">
                    Acessibilidade
                  </span>
                </div>

                {/* Font Size Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wider">
                    <span>Tamanho do Texto</span>
                    <span className="font-mono text-xs">{fontSize}px</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeFontSize(Math.max(12, fontSize - 2))}
                      className="flex-1 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-xs font-bold transition-all"
                      title="Diminuir texto"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => changeFontSize(16)}
                      className="py-1 px-2.5 rounded-lg bg-black/5 hover:bg-black/10 text-[10px] font-bold transition-all"
                      title="Restaurar tamanho padrão"
                    >
                      Padrão
                    </button>
                    <button
                      onClick={() => changeFontSize(Math.min(26, fontSize + 2))}
                      className="flex-1 py-1 rounded-lg bg-black/5 hover:bg-black/10 text-xs font-bold transition-all"
                      title="Aumentar texto"
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* Zoom Control (Lupa) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wider">
                    <span>Zoom da Página (Lupa)</span>
                    <span className="font-mono text-xs">{zoomLevel}%</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => changeZoom(100)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${zoomLevel === 100 ? 'bg-[#0D3A85] text-white' : 'bg-black/5 hover:bg-black/10'}`}
                    >
                      100%
                    </button>
                    <button
                      onClick={() => changeZoom(125)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${zoomLevel === 125 ? 'bg-[#0D3A85] text-white' : 'bg-black/5 hover:bg-black/10'}`}
                    >
                      125%
                    </button>
                    <button
                      onClick={() => changeZoom(150)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${zoomLevel === 150 ? 'bg-[#0D3A85] text-white' : 'bg-black/5 hover:bg-black/10'}`}
                    >
                      150%
                    </button>
                  </div>
                </div>

                {/* Theme Contrast Control */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wider block">
                    Contraste Visual
                  </span>
                  <div className="flex gap-1.5 flex-col">
                    <button
                      onClick={() => changeTheme('creme')}
                      className={`w-full py-1.5 px-3 rounded-lg text-left text-xs font-semibold flex items-center justify-between border transition-all ${activeTheme === 'creme' ? 'border-[#0D3A85]/35 bg-[#0D3A85]/5 text-[#0D3A85]' : 'border-transparent hover:bg-black/5'}`}
                    >
                      <span>Creme (Padrão)</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-[#EEEBE3] border border-black/10" />
                    </button>
                    <button
                      onClick={() => changeTheme('claro')}
                      className={`w-full py-1.5 px-3 rounded-lg text-left text-xs font-semibold flex items-center justify-between border transition-all ${activeTheme === 'claro' ? 'border-[#0D3A85]/35 bg-[#0D3A85]/5 text-[#0D3A85]' : 'border-transparent hover:bg-black/5'}`}
                    >
                      <span>Claro</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-white border border-black/10" />
                    </button>
                    <button
                      onClick={() => changeTheme('contraste')}
                      className={`w-full py-1.5 px-3 rounded-lg text-left text-xs font-semibold flex items-center justify-between border transition-all ${activeTheme === 'contraste' ? 'border-[#0D3A85]/35 bg-[#0D3A85]/5 text-[#0D3A85]' : 'border-transparent hover:bg-black/5'}`}
                    >
                      <span>Alto Contraste</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-black border border-yellow-400 flex items-center justify-center text-[8px] text-yellow-400 font-bold">C</div>
                    </button>
                  </div>
                </div>

                {/* VLibras (Libras with Bonequinho) */}
                <div className="space-y-1.5 pt-2 border-t border-black/5">
                  <button
                    onClick={toggleLibras}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${librasActive ? 'bg-[#0D3A85] text-white border-[#0D3A85]' : 'bg-[#0D3A85]/10 text-[#0D3A85] border-transparent hover:bg-[#0D3A85]/20'}`}
                  >
                    <span className="text-lg">👋🤖</span>
                    <span>{librasActive ? 'Desativar VLibras' : 'Ativar Tradutor Libras'}</span>
                  </button>
                </div>

                {/* Audiodescrição Stop */}
                <div className="space-y-1.5 pt-2 border-t border-black/5">
                  <button
                    onClick={stopAudio}
                    className="w-full py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <VolumeX size={12} />
                    Parar Audiodescrição
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Auth (Desktop) */}
          <nav className="hidden md:flex items-center gap-3">
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full liquid-button hover:scale-105 transition-transform"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#0D3A85] uppercase" style={{ color: '#fff' }}>
                    A
                  </div>
                  <span className="text-[#1A1A1A]/70 text-[11px] font-bold">Painel Gestão</span>
                </button>
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl p-2 z-50 animate-fade-in"
                    style={{
                      background: 'rgba(255,255,255,0.94)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
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

          {/* Hamburguer — só mobile */}
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
            className="absolute top-20 left-4 right-4 rounded-3xl p-6 space-y-5 animate-slide-up"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px)',
              border: '1.5px solid rgba(255,255,255,0.8)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Opções de Acessibilidade (Mobile Inline) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                <Accessibility size={16} className="text-[#0D3A85]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D3A85]">
                  Opções de Acessibilidade
                </span>
              </div>

              {/* Fonte */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-[#1A1A1A]/60 uppercase">Fonte</span>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => changeFontSize(Math.max(12, fontSize - 2))}
                    className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="text-xs font-mono">{fontSize}px</span>
                  <button
                    onClick={() => changeFontSize(Math.min(26, fontSize + 2))}
                    className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lupa (Zoom) */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-[#1A1A1A]/60 uppercase">Zoom (Lupa)</span>
                <div className="flex gap-1.5">
                  {[100, 125, 150].map(z => (
                    <button
                      key={z}
                      onClick={() => changeZoom(z)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${zoomLevel === z ? 'bg-[#0D3A85] text-white' : 'bg-black/5'}`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Alto Contraste */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-[#1A1A1A]/60 uppercase">Contraste</span>
                <div className="flex gap-1.5">
                  {['creme', 'claro', 'contraste'].map(t => (
                    <button
                      key={t}
                      onClick={() => changeTheme(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${activeTheme === t ? 'bg-[#0D3A85] text-white' : 'bg-black/5'}`}
                    >
                      {t === 'contraste' ? 'Contraste' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* VLibras (Libras with Bonequinho) */}
              <div className="flex gap-2">
                <button
                  onClick={toggleLibras}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${librasActive ? 'bg-[#0D3A85] text-white border-[#0D3A85]' : 'bg-[#0D3A85]/10 text-[#0D3A85] border-transparent'}`}
                >
                  <span className="text-base">👋🤖</span>
                  <span>{librasActive ? 'Desativar VLibras' : 'Tradutor Libras'}</span>
                </button>
                <button
                  onClick={stopAudio}
                  className="py-2 px-3 rounded-xl bg-red-500/10 text-red-600 border border-transparent hover:bg-red-50"
                  title="Parar audiodescrição"
                >
                  <VolumeX size={16} />
                </button>
              </div>
            </div>

            <div className="h-px bg-black/08" />

            {/* Auth */}
            {isAdmin ? (
              <div className="space-y-1">
                {pathname !== '/admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#0D3A85] hover:bg-[#0D3A85]/5 transition-all uppercase tracking-wider"
                  >
                    ⚙️ Painel Gestão
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#C62228] hover:bg-red-50 transition-all uppercase tracking-wider text-left"
                >
                  ← Sair
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
                  Comece agora ↗
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
