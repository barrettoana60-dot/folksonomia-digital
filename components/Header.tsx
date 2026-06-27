'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasQuiz, setHasQuiz] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const completed = localStorage.getItem('visitante_quiz_completado');
    setHasQuiz(!!completed);

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
    `hidden md:block text-[11px] font-semibold uppercase tracking-[0.13em] transition-all ${
      active
        ? 'text-[#E8490A]'
        : 'text-[#1A1A1A]/55 hover:text-[#E8490A]'
    }`;

  /* Skeleton SSR */
  if (!isMounted) {
    return (
      <header className="fixed top-0 left-0 w-full z-50 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 print:hidden"
        style={{
          background: 'rgba(255,255,255,0.60)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
          <Logo className="w-9 h-9 md:w-11 md:h-11 transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="text-[#1A1A1A] text-sm md:text-base font-normal serif-title tracking-normal leading-none">
              Folksonomia Digital
            </span>
            <span className="text-[8px] md:text-[10px] text-[#1A1A1A]/35 font-semibold uppercase tracking-[0.22em] mt-1">
              NUGEP — Documentação Semântica
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-4 md:gap-10">
          <Link href="/login" className="liquid-button !py-2 !px-5 md:!py-2.5 md:!px-8 !rounded-xl !text-[10px] md:!text-[11px]">
            GESTÃO
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header
      className="fixed top-0 left-0 w-full z-50 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 print:hidden"
      style={{
        background: 'rgba(255,255,255,0.60)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Branding */}
      <div
        onClick={() => router.push('/')}
        className="flex items-center gap-3 md:gap-4 group cursor-pointer"
      >
        <Logo className="w-9 h-9 md:w-11 md:h-11 transition-transform group-hover:scale-105" />
        <div className="flex flex-col">
          <span className="text-[#1A1A1A] text-sm md:text-[15px] font-normal serif-title tracking-normal leading-none">
            Folksonomia Digital
          </span>
          <span className="text-[8px] md:text-[10px] text-[#1A1A1A]/35 font-semibold uppercase tracking-[0.22em] mt-1">
            NUGEP — Documentação Semântica
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-5 md:gap-10 relative">
        {hasQuiz && (
          <button
            onClick={() => router.push('/obras')}
            className={navLinkClass(pathname === '/obras')}
          >
            Explorar Obras
          </button>
        )}

        <button
          onClick={() => router.push('/acessibilidade')}
          className={navLinkClass(pathname === '/acessibilidade')}
        >
          Acessibilidade
        </button>

        {isAdmin ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-button"
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                style={{ background: 'linear-gradient(135deg, #E8490A, #1E3A8A)' }}
              >
                C
              </div>
              <span className="text-[#1A1A1A]/70 hidden sm:inline text-[11px] font-semibold">Curador NUGEP</span>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl p-2 z-50 animate-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              >
                <div className="px-3 py-2 border-b border-black/5 mb-1.5">
                  <p className="text-xs font-semibold text-[#1A1A1A]">NUGEP Curador</p>
                  <p className="text-[9px] text-[#1A1A1A]/40 uppercase tracking-wider mt-0.5">Administrador</p>
                </div>
                {pathname !== '/admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#1A1A1A]/70 hover:bg-black/5 hover:text-[#1A1A1A] transition-all text-left"
                  >
                    Painel Gestão
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#C0252B] hover:bg-red-50 hover:text-[#8B1A1F] transition-all text-left"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="liquid-button !py-2 !px-5 md:!py-2.5 md:!px-8 !rounded-xl !text-[10px] md:!text-[11px]"
          >
            GESTÃO
          </Link>
        )}
      </nav>
    </header>
  );
}
