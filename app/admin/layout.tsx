'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authorized) {
            setAuthorized(true);
            return;
          }
        }

        // Se falhar na validação
        localStorage.removeItem('admin_token');
        router.push('/login');
      } catch (err) {
        console.error('Erro ao verificar autenticação com o backend:', err);
        // Fallback temporário apenas se o backend estiver inacessível e houver token
        if (token && token.length > 10) {
          setAuthorized(true);
        } else {
          router.push('/login');
        }
      }
    }

    checkAuth();
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}

