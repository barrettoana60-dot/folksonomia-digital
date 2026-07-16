import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import VLibrasWidget from "@/components/VLibrasWidget";

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
              var theme = localStorage.getItem('theme') || 'padrao';
              if (theme === 'contraste') {
                document.documentElement.setAttribute('data-theme', 'contraste');
              }
              var savedFontSize = localStorage.getItem('fontSize');
              if (savedFontSize) {
                var size = parseInt(savedFontSize);
                if (!isNaN(size)) {
                  var scale = size / 16;
                  document.documentElement.style.setProperty('--text-scale-factor', scale.toString());
                }
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased min-h-screen`}>
        <Header />
        <div className="relative z-10 pt-4">
          {children}
        </div>
        <VLibrasWidget />
      </body>
    </html>
  );
}
