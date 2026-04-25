'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Eye, LogIn, Home } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/obras', label: 'Obras', icon: BookOpen },
  { href: '/acessibilidade', label: 'Acessibilidade', icon: Eye },
  { href: '/login', label: 'Área Administrativa', icon: LogIn },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(0,15,40,0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white hover:text-blue-200 transition-colors tracking-tight">
          Sistema Folksonomia Digital
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
