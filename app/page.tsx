import Link from "next/link";
import { BookOpen, User, Eye, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      <div className="z-10 text-center max-w-5xl mx-auto space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white uppercase">
            Sistema Folksonomia Digital
          </h1>
          <div className="h-1 w-24 bg-white mx-auto opacity-30" />
        </div>
        
        <p className="text-xl md:text-2xl text-white/80 font-light leading-relaxed max-w-3xl mx-auto">
          Catalogação colaborativa e interoperabilidade semântica. 
          Contribua para a construção da teia de significados do nosso acervo institucional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 max-w-3xl mx-auto">
          
          <Link href="/questionario" className="glass-card p-10 group flex flex-col items-center text-center gap-6">
            <div className="p-5 rounded-full bg-white/5 border border-white/10 text-white group-hover:scale-105 transition-all duration-500">
              <BookOpen size={48} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Explorar Obras</h2>
              <p className="text-white/40 text-sm">Acesse o acervo público e registre suas percepções.</p>
            </div>
          </Link>

          <Link href="/login" className="glass-card p-10 group flex flex-col items-center text-center gap-6">
            <div className="p-5 rounded-full bg-white/5 border border-white/10 text-white group-hover:scale-105 transition-all duration-500">
              <Activity size={48} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Administração</h2>
              <p className="text-white/40 text-sm">Curadoria, validação de núcleos e teia semântica.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
