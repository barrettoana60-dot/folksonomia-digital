'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        localStorage.setItem('admin_token', data.token);
        router.push('/admin');
        window.dispatchEvent(new Event('storage'));
      } else {
        setError(data.error || 'Senha Curatorial Inválida');
      }
    } catch (err) {
      console.error('Erro de rede ao autenticar:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">

      <div className="text-center space-y-5 mb-10 animate-fade-in">
        {/* Ícone */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{
            background: 'rgba(232,73,10,0.10)',
            border: '1px solid rgba(232,73,10,0.22)',
          }}
        >
          <ShieldCheck size={30} style={{ color: '#E8490A' }} />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-normal serif-title text-[#1A1A1A] tracking-tight">
            Curadoria NUGEP
          </h1>
          <p className="text-[10px] text-[#1A1A1A]/35 uppercase tracking-[0.22em] font-semibold">
            Acesso Restrito
          </p>
        </div>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="glass-card p-10 space-y-8">
          <form onSubmit={handleLogin} className="space-y-6">

            <div className="space-y-2">
              <label
                htmlFor="input-senha"
                className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A]/45 ml-1 block"
              >
                Senha Curatorial
              </label>
              <input
                id="input-senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="liquid-input w-full"
                placeholder="Insira a senha do curador"
              />
            </div>

            {error && (
              <p className="text-[11px] uppercase tracking-wider font-semibold text-center animate-fade-in"
                style={{ color: '#C0252B' }}>
                {error}
              </p>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="liquid-button w-full !py-4 !rounded-xl !text-[11px] !font-semibold !tracking-[0.15em] disabled:opacity-50"
              style={{
                background: '#E8490A',
                borderColor: '#C03808',
                color: '#fff',
              }}
            >
              {loading ? 'Validando Acesso...' : 'Acessar Sistema'}
            </button>
          </form>
        </div>
      </div>

    </main>
  );
}
