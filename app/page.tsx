import Link from "next/link";
import { BookOpen, User, Eye, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden">
      
      <div className="z-10 text-center max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 drop-shadow-lg">
          Sistema Folksonomia Digital
        </h1>
        
        <p className="text-xl md:text-2xl text-blue-100 font-light leading-relaxed max-w-3xl mx-auto drop-shadow">
          Plataforma de catalogação colaborativa. Contribua com a documentação do acervo e ajude a construir a teia semântica.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-2xl mx-auto">
          
          <Link href="/questionario" className="glass-card p-8 group flex flex-col items-center text-center gap-4 hover:bg-white/10">
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-300 group-hover:scale-110 transition-transform">
              <BookOpen size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white">Explorar Obras</h2>
            <p className="text-blue-100/70">Visualize o acervo e adicione suas percepções e tags.</p>
          </Link>

          <Link href="/login" className="glass-card p-8 group flex flex-col items-center text-center gap-4 hover:bg-white/10">
            <div className="p-4 rounded-full bg-purple-500/20 text-purple-300 group-hover:scale-110 transition-transform">
              <User size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white">Área Administrativa</h2>
            <p className="text-blue-100/70">Acesso restrito para curadoria, validação e análise da teia semântica.</p>
          </Link>

          <Link href="/acessibilidade" className="glass-card p-8 group flex flex-col items-center text-center gap-4 hover:bg-white/10 md:col-span-2 md:w-1/2 md:mx-auto">
            <div className="p-4 rounded-full bg-green-500/20 text-green-300 group-hover:scale-110 transition-transform">
              <Eye size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white">Acessibilidade</h2>
            <p className="text-blue-100/70">Ajuste o contraste, tamanho de fonte e audiodescrição.</p>
          </Link>

        </div>
      </div>

    </main>
  );
}
