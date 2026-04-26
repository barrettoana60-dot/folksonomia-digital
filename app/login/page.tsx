'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Hardcoded NUGEP login as requested
    // Permitindo com ou sem espaço conforme a mensagem do usuário
    if (user === 'nugep' && (password === 'nugep123' || password === 'nugep 123')) {
      localStorage.setItem('isAdmin', 'true');
      router.push('/admin');
    } else {
      setError('Credenciais institucionais inválidas.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-[400px] space-y-10">
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-6">
            <ShieldCheck size={32} className="text-[#E85002]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-normal serif-title text-white tracking-wide uppercase">Curadoria NUGEP</h1>
          <p className="text-white/30 mt-2 text-[10px] uppercase tracking-[0.2em]">Acesso Administrativo Restrito</p>
        </div>

        <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Identificação</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                required
                className="liquid-input w-full bg-black/40"
                placeholder="nugep"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Senha Institucional</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="liquid-input w-full bg-black/40"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-[11px] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="liquid-button w-full py-4 !rounded-lg text-[11px] font-bold"
            >
              {loading ? 'Validando...' : 'Acessar Sistema'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-[10px] uppercase tracking-widest">
          Sistema de Folksonomia • 2024
        </p>
      </div>
    </main>
  );
}
