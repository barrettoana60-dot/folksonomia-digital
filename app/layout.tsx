import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
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

        {/* Estrutura HTML oficial do VLibras */}
        <div dangerouslySetInnerHTML={{ __html: `
          <div vw class="enabled">
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper>
              <div class="vw-plugin-top-wrapper"></div>
            </div>
          </div>
        ` }} />

        {/* Script do VLibras e inicializador com fallbacks robustos */}
        <script src="https://vlibras.gov.br/app/vlibras-plugin.js" defer></script>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            function initVLibras() {
              if (window.VLibras && !window.VLibras.initialized) {
                try {
                  new window.VLibras.Widget('https://vlibras.gov.br/app');
                  window.VLibras.initialized = true;
                } catch (e) {
                  console.error('Erro ao instanciar VLibras:', e);
                }
              }
            }
            if (document.readyState === 'complete') {
              initVLibras();
            } else {
              window.addEventListener('load', initVLibras);
            }
            // Fallback caso o evento load já tenha passado ou demore
            setTimeout(initVLibras, 2000);
            setTimeout(initVLibras, 4000);
          })();
        ` }} />
      </body>
    </html>
  );
}
