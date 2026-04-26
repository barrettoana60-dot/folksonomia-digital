'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

  const links = [
    { href: '/', label: 'Home' },
    { href: '/obras', label: 'Explorar Obras' },
    { href: '/acessibilidade', label: 'Acessibilidade' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-20 md:h-24 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5 print:hidden">
      
      {/* Branding */}
      <div 
        onClick={() => handleNav('/')} 
        className="flex items-center gap-3 md:gap-5 group cursor-pointer"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(232,80,2,0.2)] group-hover:border-[#E85002]/40 transition-all">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
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
        {links.map(link => (
          <button 
            key={link.href}
            onClick={() => handleNav(link.href)}
            className={`hidden md:block text-[10px] uppercase font-black tracking-[0.25em] transition-all hover:text-[#E85002] ${
              (pathname === link.href || (pathname === '/obras' && link.href === '/')) ? 'text-[#E85002]' : 'text-white/40'
            }`}
          >
            {link.label}
          </button>
        ))}
        
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
