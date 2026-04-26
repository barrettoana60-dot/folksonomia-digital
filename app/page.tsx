'use client';

import { useRouter } from 'next/navigation';

const InstitutionalLogo = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 rounded-full bg-[#E85002] shadow-[0_0_40px_rgba(232,80,2,0.2)]" />
    <div className="absolute inset-[25%] rounded-full bg-black/30" />
    <div className="absolute inset-[40%] rounded-full bg-white/20" />
  </div>
);

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-[800px] text-center space-y-16">
        
        <div className="space-y-6">
          <InstitutionalLogo className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-5xl md:text-6xl font-normal serif-title text-white tracking-[0.05em] uppercase">
            Sistema de Folksonomia
          </h1>
          <p className="text-white/30 text-[11px] uppercase tracking-[0.6em] font-bold">
            Documentação Semântica Institucional
          </p>
        </div>

        <div className="h-[1px] w-24 bg-[#E85002] mx-auto opacity-50" />

        <p className="text-white/40 text-base leading-relaxed font-light italic max-w-md mx-auto">
          Participe da construção coletiva do conhecimento institucional através de percepções e tags semânticas.
        </p>

        <div className="pt-8">
          <button 
            onClick={() => router.push('/questionario')}
            className="liquid-button !px-20 !py-5 !rounded-full !text-[12px] !font-black !tracking-[0.3em] !bg-white/10"
          >
            Acessar Sistema
          </button>
        </div>

      </div>
    </main>
  );
}
