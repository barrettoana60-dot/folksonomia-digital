import { supabaseAdmin } from '@/lib/supabase/client';
import { BookOpen, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminObrasPage() {
  const { data: obras } = await supabaseAdmin
    .from('obras')
    .select('*')
    .order('titulo');

  return (
    <div className="p-10 bg-black min-h-screen text-white">
      <div className="max-w-[95%] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-normal serif-title tracking-tight flex items-center gap-4">
              <BookOpen className="text-[#E85002]" size={36} />
              Gestão do Acervo
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mt-2">Inventário e Metadados Institucionais</p>
          </div>
          <button className="liquid-button flex items-center gap-2 text-xs font-bold px-8">
            <Plus size={18} /> Adicionar Nova Obra
          </button>
        </div>

        <div className="glass-card overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-full border border-white/10 w-80">
              <Search size={16} className="text-white/30" />
              <input placeholder="Filtrar obras..." className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full" />
            </div>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-[10px] uppercase tracking-widest text-white/30 border-b border-white/10">
              <tr>
                <th className="px-8 py-5 font-bold">Obra / Título</th>
                <th className="px-8 py-5 font-bold">Artista</th>
                <th className="px-8 py-5 font-bold">Ano</th>
                <th className="px-8 py-5 font-bold">Tipo</th>
                <th className="px-8 py-5 font-bold">Estado</th>
                <th className="px-8 py-5 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {obras?.map((obra) => (
                <tr key={obra.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {obra.imagem_url ? (
                        <img src={obra.imagem_url} className="w-12 h-12 object-cover rounded-md border border-white/10" alt="" />
                      ) : (
                        <div className="w-12 h-12 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-[10px] text-white/20">IMG</div>
                      )}
                      <span className="font-medium text-white group-hover:text-[#E85002] transition-colors">{obra.titulo}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-white/50">{obra.artista || '-'}</td>
                  <td className="px-8 py-6 text-white/50">{obra.ano || '-'}</td>
                  <td className="px-8 py-6 text-white/50 font-bold text-[10px] uppercase">{obra.tipo || '-'}</td>
                  <td className="px-8 py-6">
                    {obra.publicado ? (
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase rounded-full border border-green-500/20">Publicado</span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase rounded-full border border-yellow-500/20">Rascunho</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
