'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Unified Logo Component
const InstitutionalLogo = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 rounded-full bg-[#E85002] shadow-[0_0_20px_rgba(232,80,2,0.5)]" />
    <div className="absolute inset-[25%] rounded-full bg-black/30" />
    <div className="absolute inset-[40%] rounded-full bg-white/20" />
  </div>
);

export default function Header() {

  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/obras', label: 'Explorar Obras' },
    { href: '/acessibilidade', label: 'Acessibilidade' },
  ];

  const handleLogoClick = (e: React.MouseEvent) => {
    const hasCompletedQuiz = typeof window !== 'undefined' && localStorage.getItem('visitante_quiz_completado');
    if (hasCompletedQuiz) {
      const target = e.currentTarget as HTMLAnchorElement;
      if (target.getAttribute('href') === '/') {
        e.preventDefault();
        window.location.href = '/obras';
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-20 md:h-24 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5 print:hidden">
      
      {/* Branding */}
      <Link href="/" onClick={handleLogoClick} className="flex items-center gap-3 md:gap-4 group">
        <InstitutionalLogo className="w-8 h-8 md:w-10 md:h-10" />
        <div className="flex flex-col">

          <span className="text-white text-sm md:text-lg font-normal serif-title tracking-tight uppercase leading-none">
            Sistema de Folksonomia
          </span>
          <span className="text-[7px] md:text-[9px] text-white/30 font-black uppercase tracking-[0.4em] mt-1">
            Institucional
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-4 md:gap-12">
        {links.map(link => (
          <Link 
            key={link.href}
            href={link.href}
            onClick={(e) => {
              const hasCompletedQuiz = typeof window !== 'undefined' && localStorage.getItem('visitante_quiz_completado');
              if (hasCompletedQuiz && link.href === '/') {
                e.preventDefault();
                window.location.href = '/obras';
              }
            }}
            className={`hidden md:block text-[10px] uppercase font-black tracking-[0.25em] transition-all hover:text-[#E85002] ${
              pathname === link.href ? 'text-[#E85002]' : 'text-white/40'
            }`}
          >
            {link.label}
          </Link>
        ))}
        
        <Link 
          href="/login" 
          className="liquid-button !py-2 !px-4 md:!py-2.5 md:!px-8 !rounded-lg md:!rounded-xl !text-[9px] md:!text-[10px] !bg-white/5 !border-white/10"
        >
          {pathname === '/admin' ? 'Painel' : 'GESTÃO'}
        </Link>
      </nav>

    </header>
  );
}
