'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkToken = () => {
      const token = localStorage.getItem('admin_token');
      setIsAdmin(!!token);
    };
    checkToken();
    window.addEventListener('storage', checkToken);
    return () => window.removeEventListener('storage', checkToken);
  }, []);

  // Fechar menu ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push('/');
    window.dispatchEvent(new Event('storage'));
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

        {/* Nav central — só desktop */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/obras" className={navLinkClass(pathname === '/obras')}>
            Obras
          </Link>
          <Link href="/acessibilidade" className={navLinkClass(pathname === '/acessibilidade')}>
            Acessibilidade
          </Link>
        </div>

        {/* Botões da direita — desktop */}
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
              <Link
                href="/questionario"
                className="liquid-button !bg-[#0D3A85] !border-[#0D3A85]/20 !py-2.5 !px-6 !rounded-full !text-[11px] !font-bold hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(13,58,133,0.15)]"
                style={{ color: '#fff' }}
              >
                Comece agora ↗
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
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-20 left-4 right-4 rounded-3xl p-6 space-y-4 animate-slide-up"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px)',
              border: '1.5px solid rgba(255,255,255,0.8)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Links principais */}
            <div className="space-y-1">
              <Link
                href="/obras"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#0D3A85]/5 hover:text-[#0D3A85] transition-all uppercase tracking-wider"
              >
                🎨 Obras
              </Link>
              <Link
                href="/acessibilidade"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#0D3A85]/5 hover:text-[#0D3A85] transition-all uppercase tracking-wider"
              >
                ♿ Acessibilidade
              </Link>
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
