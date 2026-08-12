'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeiaPublicaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/grafo');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-9 h-9 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#E8490A', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
