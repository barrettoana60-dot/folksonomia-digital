'use client';

import { useEffect } from 'react';
import "./globals.css";
import Header from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  
  useEffect(() => {
    // Aplicar tema salvo no localStorage em todas as páginas
    const theme = localStorage.getItem('theme') || 'escuro';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">
        <Header />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
