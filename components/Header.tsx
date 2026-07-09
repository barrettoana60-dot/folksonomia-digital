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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    setDropdownOpen(false);
    router.push('/');
    window.dispatchEvent(new Event('storage'));
  };

  const navLinkClass = (active: boolean) =>
    `text-[11px] md:text-[12px] font-medium transition-all ${
      active
        ? 'text-[#0D3A85] font-semibold border-b-2 border-[#0D3A85] pb-1'
        : 'text-[#1A1A1A]/65 hover:text-[#0D3A85]'
    }`;

  // Seção de links comuns do CULTIVA
  const renderNavLinks = () => (
    <div className="hidden lg:flex items-center gap-7">
      <Link href="/" className={navLinkClass(pathname === '/')}>Início</Link>
      <a href="#sobre" className={navLinkClass(pathname === '/#sobre')}>Sobre</a>
      <a href="#solucoes" className={navLinkClass(pathname === '/#solucoes')}>Soluções</a>
      <a href="#impacto" className={navLinkClass(pathname === '/#impacto')}>Impacto</a>
      <a href="#comunidade" className={navLinkClass(pathname === '/#comunidade')}>Comunidade</a>
      <a href="#contato" className={navLinkClass(pathname === '/#contato')}>Contato</a>
    </div>
  );

  /* Skeleton SSR */
  if (!isMounted) {
    return (
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-50 h-16 md:h-18 flex items-center justify-between px-6 md:px-10 print:hidden rounded-full"
        style={{
          background: 'rgba(255,255,255,0.76)',
          backdropFilter: 'blur(20px) saturate(190%)',
          WebkitBackdropFilter: 'blur(20px) saturate(190%)',
          border: '1.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-3 cursor-pointer">
          <Logo className="w-8 h-8 md:w-9 h-9" />
          <span className="text-[#0D3A85] text-base md:text-lg font-black tracking-wider uppercase font-sans">
            CULTIVA
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 h-8 bg-white/20 rounded-full animate-pulse"></span>
        </div>
      </header>
    );
  }

  return (
    <header
      className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl z-50 h-16 md:h-18 flex items-center justify-between px-6 md:px-10 print:hidden rounded-full transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.76)',
        backdropFilter: 'blur(20px) saturate(190%)',
        WebkitBackdropFilter: 'blur(20px) saturate(190%)',
        border: '1.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      {/* Branding (Logo + CULTIVA) */}
      <div
        onClick={() => router.push('/')}
        className="flex items-center gap-3 group cursor-pointer"
      >
        <Logo className="w-8 h-8 md:w-9 h-9 transition-transform group-hover:scale-105" />
        <span className="text-[#0D3A85] text-base md:text-lg font-black tracking-wider uppercase font-sans">
          CULTIVA
        </span>
      </div>

      {/* Navegação Central */}
      {renderNavLinks()}

      {/* Botões da Direita */}
      <nav className="flex items-center gap-3">
        {isAdmin ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full liquid-button hover:scale-105 transition-transform"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase bg-[#0D3A85]">
                A
              </div>
              <span className="text-[#1A1A1A]/70 hidden sm:inline text-[11px] font-bold">Painel Gestão</span>
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
                  <p className="text-xs font-bold text-[#0D3A85]">CULTIVA Curador</p>
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
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C62228] hover:bg-red-50 hover:text-[#C62228] transition-all text-left font-semibold"
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
              className="liquid-button !bg-[#0D3A85] !border-[#0D3A85]/20 !text-white !py-2.5 !px-6 !rounded-full !text-[11px] !font-bold hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(13,58,133,0.15)]"
            >
              Comece agora ↗
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
