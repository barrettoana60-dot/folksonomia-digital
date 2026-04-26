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

  // Esconder header no questionario para focar na entrada
  if (pathname === '/questionario') return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
            <div className="w-2 h-2 rounded-full bg-[#E85002]" />
          </div>
          <span className="text-xl font-normal serif-title text-white tracking-wide">
            Sistema de Folksonomia
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-5 py-2 rounded-full text-[11px] font-medium uppercase tracking-[0.15em] transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
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
