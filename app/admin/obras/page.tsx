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
    <div className="p-10 bg-[#000000] min-h-screen text-white">
      <div className="max-w-[95%] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-normal flex items-center gap-4">
              <BookOpen className="text-[#E85002]" size={36} />
              Gestão do Acervo
            </h1>
            <p className="text-white/35 text-[11px] uppercase tracking-wider mt-2 font-semibold">Inventário e Metadados Institucionais</p>
          </div>
          <button className="liquid-button flex items-center gap-2 text-xs font-semibold px-6 tracking-wider">
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
            <thead className="bg-black/40 text-[11px] uppercase tracking-wider font-semibold text-white/35 border-b border-white/10">
              <tr>
                <th className="px-8 py-5 font-semibold">Obra / Título</th>
                <th className="px-8 py-5 font-semibold">Artista</th>
                <th className="px-8 py-5 font-semibold">Ano</th>
                <th className="px-8 py-5 font-semibold">Tipo</th>
                <th className="px-8 py-5 font-semibold">Estado</th>
                <th className="px-8 py-5 font-semibold text-right">Ações</th>
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
                  <td className="px-8 py-6 text-white/50 font-semibold text-[11px] uppercase tracking-wider">{obra.tipo || '-'}</td>
                  <td className="px-8 py-6">
                    {obra.publicado ? (
                      <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-[11px] font-semibold uppercase tracking-wider rounded-full border border-orange-500/20">Publicado</span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-[11px] font-semibold uppercase tracking-wider rounded-full border border-yellow-500/20">Rascunho</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-[11px] font-semibold uppercase tracking-wider text-white/45 hover:text-white transition-colors">Editar</button>
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
