'use client';

import Link from 'next/link';

interface ObraCardProps {
  obra: {
    id: string;
    titulo: string;
    artista?: string;
    ano?: string;
    imagem_url?: string;
  };
}

export default function ObraCard({ obra }: ObraCardProps) {
  return (
    <Link href={`/obras/${obra.id}`} className="group">
      <div className="glass-card overflow-hidden bg-white/[0.02] border-white/5 hover:border-[#E85002]/30 flex flex-col h-full transition-all duration-500">
        
        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden bg-black/40">
          {obra.imagem_url ? (
            <img
              src={obra.imagem_url}
              alt={obra.titulo}
              className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/10 uppercase tracking-widest text-[10px]">
              Sem Imagem
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        </div>

        {/* Info */}
        <div className="p-6 space-y-2">
          <p className="text-[10px] text-[#E85002] uppercase font-bold tracking-[0.2em]">{obra.artista || 'Artista Desconhecido'}</p>
          <h3 className="text-lg font-normal serif-title text-white group-hover:text-[#E85002] transition-colors">{obra.titulo}</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">{obra.ano || 'S.D.'}</p>
        </div>
        
        <div className="px-6 pb-6 mt-auto">
          <button className="liquid-button w-full !py-3 !text-[10px] !rounded-lg !bg-white/5 group-hover:!bg-white/10 group-hover:!border-[#E85002]/50 transition-all">
            Explorar Obra
          </button>
        </div>


      </div>
    </Link>
  );
}
