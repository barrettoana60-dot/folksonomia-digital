'use client';

import { useState } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Hardcoded NUGEP login as requested
    if (email === 'nugep' && password === 'nugep123') {
      // Simulate session creation
      localStorage.setItem('isAdmin', 'true');
      router.push('/admin');
    } else {
      setError('Credenciais inválidas. Use o usuário administrativo.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        
        {/* Icon & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-white/5 border border-white/10 mb-8 shadow-xl">
            <LogIn size={40} className="text-white" strokeWidth={1} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase mb-2">Curadoria NUGEP</h1>
          <p className="text-white/40 mt-2 text-sm max-w-xs mx-auto">Acesso restrito para autenticação e gestão de núcleos informacionais.</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Usuário Institucional</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="liquid-input w-full px-4 py-3 text-sm placeholder:text-white/30"
                placeholder="nugep"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="liquid-input w-full px-4 py-3 text-sm placeholder:text-white/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="liquid-button w-full py-4 text-sm font-bold disabled:opacity-50 mt-2"
            >
              {loading ? 'Verificando acesso...' : 'Entrar no sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          O acesso público à galeria não requer autenticação.
        </p>
      </div>
    </main>
  );
}
