import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"], display: 'swap', variable: '--font-sans' });
const lora = Lora({ subsets: ["latin"], display: 'swap', variable: '--font-serif' });

export const metadata: Metadata = {
  title: "Sistema de Folksonomia",
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
              const theme = localStorage.getItem('theme') || 'escuro';
              document.documentElement.setAttribute('data-theme', theme);
              
              const savedFontSize = localStorage.getItem('fontSize');
              if (savedFontSize) {
                document.documentElement.style.fontSize = savedFontSize + 'px';
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased min-h-screen`}>
        <Header />
        <div className="pt-4">
          {children}
        </div>
      </body>
    </html>
  );
}
