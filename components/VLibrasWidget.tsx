'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (options: string | Record<string, unknown>) => void;
    };
  }
}

export default function VLibrasWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Evita duplicar: checa pelo elemento raiz, não pelo script
    if (document.querySelector('[vw]')) return;

    // Cria a estrutura DOM exigida pelo plugin usando setAttribute
    // (innerHTML pode perder atributos booleanos customizados em alguns parsers)
    const root = document.createElement('div');
    root.setAttribute('vw', '');
    root.className = 'enabled';

    const accessBtn = document.createElement('div');
    accessBtn.setAttribute('vw-access-button', '');
    accessBtn.className = 'active';

    const pluginWrapper = document.createElement('div');
    pluginWrapper.setAttribute('vw-plugin-wrapper', '');

    const topWrapper = document.createElement('div');
    topWrapper.className = 'vw-plugin-top-wrapper';

    pluginWrapper.appendChild(topWrapper);
    root.appendChild(accessBtn);
    root.appendChild(pluginWrapper);
    document.body.appendChild(root);

    // Carrega o script oficial do Governo Federal
    const script = document.createElement('script');
    script.id = 'vlibras-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      if (window.VLibras) {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
      }
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
