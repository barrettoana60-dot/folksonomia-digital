'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim().toLowerCase();
    
    // Suportar 'nugep 123' ou 'nugep123'
    if (cleanPass === 'nugep 123' || cleanPass === 'nugep123') {
      localStorage.setItem('admin_token', 'true');
      router.push('/admin');
      window.dispatchEvent(new Event('storage'));
    } else {
      setError('Senha Curatorial Inválida');
    }
  };


  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      
      <div className="text-center space-y-6 mb-12">
        <div className="w-16 h-16 rounded-full bg-[#E85002]/10 border border-[#E85002]/30 flex items-center justify-center mx-auto">
          <ShieldCheck className="text-[#E85002]" size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-normal serif-title text-white tracking-wider">
            Curadoria NUGEP
          </h1>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] font-semibold">
            Acesso Restrito
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-card p-10 space-y-8">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/45 ml-2">Senha Curatorial</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="liquid-input w-full"
                  placeholder="Insira a senha do curador"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-[11px] uppercase tracking-wider font-semibold text-center animate-fade-in">{error}</p>
            )}

            <button 
              type="submit" 
              className="liquid-button w-full !py-4 !rounded-xl !bg-[#E85002] !text-black !font-semibold !tracking-wider hover:!bg-[#F16001]"
            >
              Acessar Sistema
            </button>
          </form>
        </div>
      </div>

    </main>
  );
}
