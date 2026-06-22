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
    // Trigger storage event manually for same-tab updates
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5 print:hidden">
      
      {/* Branding */}
      <div 
        onClick={() => router.push('/')} 
        className="flex items-center gap-3 md:gap-5 group cursor-pointer"
      >
        <Logo className="w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110" />
        <div className="flex flex-col">
          <span className="text-white text-sm md:text-base font-normal serif-title tracking-normal leading-none">
            Sistema de Folksonomia
          </span>
          <span className="text-[8px] md:text-[10px] text-white/35 font-semibold uppercase tracking-[0.2em] mt-1">
            Institucional — NUGEP
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-4 md:gap-12 relative">
        {hasQuiz && (
          <button 
            onClick={() => router.push('/obras')}
            className={`hidden md:block text-[11px] uppercase font-semibold tracking-[0.15em] transition-all hover:text-[#E85002] ${
              pathname === '/obras' ? 'text-[#E85002]' : 'text-white/40'
            }`}
          >
            Explorar Obras
          </button>
        )}

        <button 
          onClick={() => router.push('/acessibilidade')}
          className={`hidden md:block text-[11px] font-medium transition-all hover:text-[#E85002] ${
             pathname === '/acessibilidade' ? 'text-[#E85002]' : 'text-white/60'
          }`}
        >
          Acessibilidade
        </button>

        
        {isAdmin ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#E85002] to-[#00A3FF] flex items-center justify-center text-[10px] font-bold text-white uppercase">
                C
              </div>
              <span className="text-white/80 hidden sm:inline">Curador NUGEP</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0f0f11] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                  <p className="text-xs font-semibold text-white">NUGEP Curador</p>
                  <p className="text-[9px] text-white/45 uppercase tracking-wider mt-0.5">Administrador</p>
                </div>
                {pathname !== '/admin' && (
                  <Link 
                    href="/admin" 
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all text-left"
                  >
                    Painel Gestão
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link 
            href="/login" 
            className="liquid-button !py-2 !px-4 md:!py-2.5 md:!px-8 !rounded-lg md:!rounded-xl !text-[10px] md:!text-[11px] !bg-white/5 !border-white/10"
          >
            GESTÃO
          </Link>
        )}
      </nav>

    </header>
  );
}
