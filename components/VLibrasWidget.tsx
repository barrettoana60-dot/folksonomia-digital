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
    if (document.getElementById('vlibras-script')) return; // evita duplicar

    const mount = document.createElement('div');
    mount.innerHTML = `
      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      </div>
    `;
    document.body.appendChild(mount);

    const script = document.createElement('script');
    script.id = 'vlibras-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      if (window.VLibras) {
        new window.VLibras.Widget({
          rootPath: 'https://vlibras.gov.br/app',
          position: 'R',
          avatar: 'icaro',
          opacity: 1,
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
