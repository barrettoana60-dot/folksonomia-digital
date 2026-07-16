import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";

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

        {/* ================================================================
            VLibras — Widget Oficial do Governo Federal
            A estrutura HTML PRECISA existir no DOM antes do script carregar.
            O next/script garante execução mesmo em navegação client-side.
            ================================================================ */}
        <div
          dangerouslySetInnerHTML={{ __html: `
            <div vw class="enabled">
              <div vw-access-button class="active"></div>
              <div vw-plugin-wrapper>
                <div class="vw-plugin-top-wrapper"></div>
              </div>
            </div>
          ` }}
        />

        {/* Carrega o script oficial do VLibras via next/script */}
        <Script
          id="vlibras-plugin"
          src="https://vlibras.gov.br/app/vlibras-plugin.js"
          strategy="afterInteractive"
        />

        {/* Inicializa o Widget após o script carregar */}
        <Script
          id="vlibras-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              var attempts = 0;
              function tryInit() {
                attempts++;
                if (window.VLibras && window.VLibras.Widget) {
                  try {
                    new window.VLibras.Widget('https://vlibras.gov.br/app');
                    console.log('[VLibras] Widget inicializado com sucesso');
                  } catch (e) {
                    console.error('[VLibras] Erro:', e);
                  }
                } else if (attempts < 20) {
                  setTimeout(tryInit, 500);
                }
              }
              if (document.readyState === 'complete') {
                setTimeout(tryInit, 300);
              } else {
                window.addEventListener('load', function() {
                  setTimeout(tryInit, 300);
                });
              }
            })();
          `}}
        />
      </body>
    </html>
  );
}
