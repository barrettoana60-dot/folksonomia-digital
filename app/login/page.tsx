'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'nugep' && password === 'nugep 123') {
      localStorage.setItem('admin_token', 'true');
      router.push('/admin');
    } else {
      setError('Credenciais Institucionais Inválidas');
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      
      <div className="text-center space-y-6 mb-12">
        <div className="w-16 h-16 rounded-full bg-[#E85002]/10 border border-[#E85002]/30 flex items-center justify-center mx-auto">
          <ShieldCheck className="text-[#E85002]" size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-normal serif-title text-white uppercase tracking-widest">
            Curadoria NUGEP
          </h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">
            Acesso Administrativo Restrito
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-card p-12 space-y-10">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-white/40 ml-2">Identificação</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="liquid-input w-full"
                  placeholder="nugep"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-white/40 ml-2">Senha Institucional</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="liquid-input w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-[10px] uppercase tracking-widest font-black text-center animate-fade-in">{error}</p>
            )}

            <button 
              type="submit" 
              className="liquid-button w-full !py-5 !rounded-xl !bg-[#222] !text-white !border-white/10 !font-black !tracking-widest"
            >
              ACESSAR SISTEMA
            </button>
          </form>
        </div>
      </div>

    </main>
  );
}
