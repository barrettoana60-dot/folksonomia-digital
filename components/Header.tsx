'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: '/obras', label: 'Explorar Obras' },
    { href: '/acessibilidade', label: 'Acessibilidade' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-20 md:h-24 flex items-center justify-between px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5">
      
      {/* Branding */}
      <Link href="/" className="flex items-center gap-3 md:gap-4 group">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#E85002] flex items-center justify-center shadow-[0_0_20px_rgba(232,80,2,0.5)]">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-black/40" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-sm md:text-lg font-normal serif-title tracking-tight uppercase">
            Sistema de Folksonomia
          </span>
          <span className="text-[7px] md:text-[9px] text-white/30 font-black uppercase tracking-[0.4em] -mt-0.5 md:-mt-1">
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
          {pathname === '/admin' ? 'Painel' : 'Gestão'}
        </Link>
      </nav>

    </header>

  );
}
