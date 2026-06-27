import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BgShapes from "@/components/BgShapes";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-serif',
  weight: '400',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: "Sistema de Folksonomia — NUGEP",
  description: "Plataforma Institucional de Documentação Semântica e Participativa",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme') || 'creme';
              document.documentElement.setAttribute('data-theme', theme);
              const savedFontSize = localStorage.getItem('fontSize');
              if (savedFontSize) {
                document.documentElement.style.fontSize = savedFontSize + 'px';
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased min-h-screen`}>
        {/* Formas geométricas decorativas (fixas, z-0) */}
        <BgShapes />
        {/* Header (z-50) */}
        <Header />
        {/* Conteúdo principal (z-10) */}
        <div className="relative z-10 pt-4">
          {children}
        </div>
      </body>
    </html>
  );
}
