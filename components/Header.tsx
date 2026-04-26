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
    <header className="fixed top-0 left-0 w-full z-50 h-24 flex items-center justify-between px-12 bg-black/10 backdrop-blur-md border-b border-white/5">
      
      {/* Branding */}
      <Link href="/" className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-full bg-[#E85002] flex items-center justify-center shadow-[0_0_20px_rgba(232,80,2,0.5)] group-hover:scale-110 transition-transform">
          <div className="w-2 h-2 rounded-full bg-black/40" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-lg font-normal serif-title tracking-tight uppercase group-hover:text-[#E85002] transition-colors">
            Sistema de Folksonomia
          </span>
          <span className="text-[9px] text-white/30 font-black uppercase tracking-[0.4em] -mt-1">
            Institucional
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-12">
        {links.map(link => (
          <Link 
            key={link.href}
            href={link.href}
            className={`text-[10px] uppercase font-black tracking-[0.25em] transition-all hover:text-[#E85002] ${
              pathname === link.href ? 'text-[#E85002]' : 'text-white/40'
            }`}
          >
            {link.label}
          </Link>
        ))}
        
        <Link 
          href="/login" 
          className="liquid-button !py-2.5 !px-8 !rounded-xl !text-[10px] !bg-white/5 !border-white/10 hover:!bg-white/10"
        >
          Gestão
        </Link>
      </nav>

    </header>
  );
}
