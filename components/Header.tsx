'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Unified SVG Logo Component (Minimalist & Modern)
const InstitutionalLogo = ({ className = "w-10 h-10" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <text 
        x="50%" 
        y="65%" 
        textAnchor="middle" 
        fill="#E85002" 
        style={{ fontFamily: "'Times New Roman', serif", fontSize: '80px', fontWeight: 'normal' }}
      >
        f
      </text>
    </svg>
  </div>
);

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
    <header className="fixed top-0 left-0 w-full z-50 h-20 md:h-24 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5 print:hidden">
      
      {/* Branding */}
      <div 
        onClick={() => handleNav('/')} 
        className="flex items-center gap-3 md:gap-5 group cursor-pointer"
      >
        <InstitutionalLogo className="w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110" />
        <div className="flex flex-col">
          <span className="text-white text-sm md:text-lg font-normal serif-title tracking-tight uppercase leading-none">
            Sistema de Folksonomia
          </span>
          <span className="text-[7px] md:text-[9px] text-white/30 font-black uppercase tracking-[0.4em] mt-1">
            Institucional — NUGEP
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-4 md:gap-12">
        {hasQuiz && (
          <button 
            onClick={() => router.push('/obras')}
            className={`hidden md:block text-[10px] uppercase font-black tracking-[0.25em] transition-all hover:text-[#E85002] ${
              pathname === '/obras' ? 'text-[#E85002]' : 'text-white/40'
            }`}
          >
            Explorar Obras
          </button>
        )}

        <button 
          onClick={() => router.push('/acessibilidade')}
          className={`hidden md:block text-[10px] uppercase font-black tracking-[0.25em] transition-all hover:text-[#E85002] ${
            pathname === '/acessibilidade' ? 'text-[#E85002]' : 'text-white/40'
          }`}
        >
          Acessibilidade
        </button>
        
        <Link 
          href="/login" 
          className="liquid-button !py-2 !px-4 md:!py-2.5 md:!px-8 !rounded-lg md:!rounded-xl !text-[9px] md:!text-[10px] !bg-white/5 !border-white/10"
        >
          {pathname === '/admin' ? 'PAINEL' : 'GESTÃO'}
        </Link>
      </nav>

    </header>
  );
}
