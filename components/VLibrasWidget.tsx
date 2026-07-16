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

  if (!mounted) return null;

  return (
    <>
      <div
        dangerouslySetInnerHTML={{
          __html: `
            <div vw class="enabled">
              <div vw-access-button class="active"></div>
              <div vw-plugin-wrapper>
                <div class="vw-plugin-top-wrapper"></div>
              </div>
            </div>
          `
        }}
      />
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
    </>
  );
}
