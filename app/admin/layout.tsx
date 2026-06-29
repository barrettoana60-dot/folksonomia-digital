'use client';

import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setError(event.message + '\n' + (event.error?.stack || ''));
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (error) {
    return (
      <div style={{ padding: 32, fontFamily: 'monospace', background: '#fff' }}>
        <h2 style={{ color: 'red' }}>ERRO CAPTURADO:</h2>
        <pre style={{ background: '#fee', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12 }}>
          {error}
        </pre>
      </div>
    );
  }

  return <>{children}</>;
}
