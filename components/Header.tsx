'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Eye, LogIn } from 'lucide-react';

const navLinks = [
  { href: '/obras', label: 'Explorar Obras', icon: BookOpen },
  { href: '/acessibilidade', label: 'Acessibilidade', icon: Eye },
  { href: '/login', label: 'Gestão', icon: LogIn },
];

export default function Header() {
  const pathname = usePathname();

  if (pathname === '/questionario' || pathname === '/') return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 py-8">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-5 group">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md group-hover:border-[#E85002]/40 transition-all">
            <div className="w-3 h-3 rounded-full bg-[#E85002] shadow-[0_0_15px_rgba(232,80,2,0.6)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-normal serif-title text-white tracking-wide leading-none">
              Sistema de Folksonomia
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-white/20 mt-1">Institucional</span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all border ${
                  isActive
                    ? 'bg-white/10 text-white border-white/20 backdrop-blur-xl'
                    : 'text-white/40 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
