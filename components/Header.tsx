'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasQuiz, setHasQuiz] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('visitante_quiz_completado');
    setHasQuiz(!!completed);
  }, [pathname]);

  const handleNav = (href: string) => {
    if (hasQuiz && href === '/') {
      router.push('/obras');
    } else {
      router.push(href);
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5 print:hidden">
      
      {/* Branding */}
      <div 
        onClick={() => handleNav('/')} 
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
      <nav className="flex items-center gap-4 md:gap-12">
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
        
        <Link 
          href="/login" 
          className="liquid-button !py-2 !px-4 md:!py-2.5 md:!px-8 !rounded-lg md:!rounded-xl !text-[10px] md:!text-[11px] !bg-white/5 !border-white/10"
        >
          {pathname === '/admin' ? 'PAINEL' : 'GESTÃO'}
        </Link>
      </nav>

    </header>
  );
}
