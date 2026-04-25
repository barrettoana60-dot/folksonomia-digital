import { supabaseAdmin } from '@/lib/supabase/client';
import { BookOpen, Plus } from 'lucide-react';

export const revalidate = 60;

export default async function AdminObrasPage() {
  const { data: obras } = await supabaseAdmin
    .from('obras')
    .select('*')
    .order('titulo');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-white flex items-center gap-3">
          <BookOpen className="text-gray-400" />
          Acervo de Obras
        </h1>
        <button className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-200">
          <Plus size={16} /> Nova Obra
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/50 text-xs uppercase text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-medium">Título</th>
              <th className="px-6 py-4 font-medium">Artista</th>
              <th className="px-6 py-4 font-medium">Ano</th>
              <th className="px-6 py-4 font-medium">Tipo</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {obras?.map((obra) => (
              <tr key={obra.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{obra.titulo}</td>
                <td className="px-6 py-4">{obra.artista || '-'}</td>
                <td className="px-6 py-4">{obra.ano || '-'}</td>
                <td className="px-6 py-4">{obra.tipo || '-'}</td>
                <td className="px-6 py-4">
                  {obra.publicado ? (
                    <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900/50">Publicado</span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded-full border border-yellow-900/50">Rascunho</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
