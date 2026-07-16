'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (options: string | Record<string, unknown>) => void;
      initialized?: boolean;
    };
  }
}

export default function VLibrasWidget() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const init = () => {
      if (window.VLibras && !window.VLibras.initialized) {
        try {
          new window.VLibras.Widget('https://vlibras.gov.br/app');
          window.VLibras.initialized = true;
          console.log('[VLibras] Inicializado com sucesso via useEffect fallback');
        } catch (e) {
          console.error('[VLibras] Falha no init:', e);
        }
      }
    };

    // Tenta inicializar em múltiplos intervalos caso o script já esteja cacheado
    init();
    const t1 = setTimeout(init, 1000);
    const t2 = setTimeout(init, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mounted]);

  return (
    <>
      {/* 
        A estrutura HTML oficial precisa estar presente no DOM estaticamente 
        desde o primeiro instante (SSR) para que o script do governo a encontre.
        Não usamos wrapper div para garantir que seja filho direto do body.
      */}
      {/* @ts-ignore */}
      <div vw="true" className="enabled">
        {/* @ts-ignore */}
        <div vw-access-button="true" className="active"></div>
        {/* @ts-ignore */}
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper"></div>
        </div>
      </div>

      {mounted && (
        <Script
          id="vlibras-script"
          src="https://vlibras.gov.br/app/vlibras-plugin.js"
          strategy="afterInteractive"
          onLoad={() => {
            if (window.VLibras && !window.VLibras.initialized) {
              try {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
                window.VLibras.initialized = true;
                console.log('[VLibras] Inicializado com sucesso via Script onLoad');
              } catch (e) {
                console.error('[VLibras] Falha no onLoad:', e);
              }
            }
          }}
        />
      )}
    </>
  );
}
