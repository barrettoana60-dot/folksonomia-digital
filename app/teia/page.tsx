'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeiaPublicaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/grafo');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

