import { supabaseAdmin } from '@/lib/supabase/client';
import { Tag as TagIcon, Layers, BarChart3, Clock, MoreVertical } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getTagsWithNuclei() {
  const { data } = await supabaseAdmin
    .from('tags')
    .select(`
      id, tag_original, tag_normalizada, grupo_tematico, status, criado_em,
      obras (titulo),
      nucleos (id, confianca, novidade, tensao, ressonancia, status_validacao, metadados)
    `)
    .order('criado_em', { ascending: false })
    .limit(100);

  return data || [];
}

const statusStyle: Record<string, string> = {
  'em análise': 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  validado: 'bg-green-500/10 border-green-500/20 text-green-500',
  publicado: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
  rejeitado: 'bg-red-500/10 border-red-500/20 text-red-500'
};

export default async function AdminTagsPage() {
  const tags = await getTagsWithNuclei();

  return (
    <div className="p-10 bg-black min-h-screen text-white">
      <div className="max-w-[95%] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-normal serif-title tracking-tight flex items-center gap-4">
              <TagIcon className="text-[#E85002]" size={36} />
              Gestão de Contribuições
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mt-2">Folksonomia e Núcleos Informacionais</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-[10px] uppercase tracking-widest text-white/30 border-b border-white/10">
              <tr>
                <th className="px-8 py-5 font-bold">Tag / Original</th>
                <th className="px-8 py-5 font-bold">Obra Relacionada</th>
                <th className="px-8 py-5 font-bold">Indicadores Semânticos</th>
                <th className="px-8 py-5 font-bold">Estado</th>
                <th className="px-8 py-5 font-bold">Data</th>
                <th className="px-8 py-5 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tags.map((tag: any) => (
                <tr key={tag.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-8 py-6">
                    <div className="font-medium text-white group-hover:text-[#F16001] transition-colors">{tag.tag_original}</div>
                    <div className="text-white/30 text-[10px] mt-1 uppercase tracking-tighter">Assinatura: {tag.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-8 py-6 text-white/50 text-xs italic">"{tag.obras?.titulo || '—'}"</td>
                  <td className="px-8 py-6">
                    {tag.nucleos ? (
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex justify-between text-[8px] uppercase font-bold text-white/40">
                            <span>Conexão</span>
                            <span>{Math.round(tag.nucleos.confianca || 0)}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#E85002]" style={{ width: `${tag.nucleos.confianca || 0}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex justify-between text-[8px] uppercase font-bold text-white/40">
                            <span>Novidade</span>
                            <span>{Math.round(tag.nucleos.novidade || 0)}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${tag.nucleos.novidade || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/20 text-[10px] uppercase">Sem núcleo</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      statusStyle[tag.status] || 'bg-white/5 border-white/10 text-white/30'
                    }`}>
                      {tag.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-white/30 text-xs">
                    {new Date(tag.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <MoreVertical size={16} className="text-white/30" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tags.length === 0 && (
            <div className="py-20 text-center">
              <Layers className="mx-auto text-white/10 mb-4" size={48} strokeWidth={1} />
              <p className="text-white/30 text-sm uppercase tracking-widest">Nenhuma contribuição pendente no sistema.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
