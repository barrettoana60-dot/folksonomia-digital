'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Eye, LogIn, Home, Network } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/obras', label: 'Acervo', icon: BookOpen },
  { href: '/teia', label: 'Teia', icon: Network },
  { href: '/acessibilidade', label: 'Acessibilidade', icon: Eye },
  { href: '/login', label: 'Gestão', icon: LogIn },
];

export default function Header() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [pathname]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-[95%] mx-auto glass-card !rounded-full px-8 h-16 flex items-center justify-between border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-[#E85002] rounded-lg flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
            <span className="text-white font-bold serif-title text-xl">F</span>
          </div>
          <span className="text-lg font-normal serif-title text-white tracking-tight hidden sm:block">
            Sistema Folksonomia <span className="text-[#E85002] font-sans font-bold text-xs uppercase ml-1">Digital</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-[#E85002]/20 text-[#E85002] border border-[#E85002]/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} strokeWidth={2} />
                <span className="hidden lg:block">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
