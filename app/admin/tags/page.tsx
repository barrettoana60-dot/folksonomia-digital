import { supabaseAdmin } from '@/lib/supabase/client';
import { Tag as TagIcon, Layers, BarChart3, Clock, MoreVertical, Brain, Database, Activity, Globe } from 'lucide-react';
import { ML_SERVICE_URL } from '@/lib/core/env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getTagsWithNuclei() {
  const { data, error } = await supabaseAdmin
    .from('tags')
    .select(`
      id, tag_original, tag_normalizada, grupo_tematico, status, criado_em, obra_id,
      obras (titulo),
      nucleos (id, confianca, novidade, tensao, ressonancia, status_validacao, metadados, contexto)
    `)
    .order('criado_em', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Tags query error:', error);
    return [];
  }
  return data || [];
}

async function safeCount(table: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

async function getStats() {
  const [nucleos, evidencias, memoria, desconhecidos] = await Promise.all([
    safeCount('nucleos'),
    safeCount('cross_source_evidence'),
    safeCount('semantic_memory'),
    safeCount('unknown_terms')
  ]);
  return { nucleos, evidencias, memoria, desconhecidos };
}

const statusStyle: Record<string, string> = {
  'em análise': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'em_analise': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'bruto': 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  validado: 'bg-green-500/10 border-green-500/20 text-green-400',
  publicado: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  rejeitado: 'bg-red-500/10 border-red-500/20 text-red-400'
};

export default async function AdminTagsPage() {
  const tags = await getTagsWithNuclei();
  const stats = await getStats();
  const mlOnline = !!ML_SERVICE_URL;

  return (
    <div className="p-10 bg-black min-h-screen text-white pt-24">
      <div className="max-w-[95%] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-normal serif-title tracking-tight flex items-center gap-4">
              <TagIcon className="text-[#E85002]" size={36} />
              Análise de Tags
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mt-2">
              {tags.length} contribuições • Motor: {mlOnline ? 'ModernBERT NER' : 'Heurístico'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-[#E85002]">{tags.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">Tags</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-purple-300">{stats.nucleos}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">Núcleos</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-green-300">{stats.evidencias}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">Evidências</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-300">{stats.memoria}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">Memórias</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold text-red-300">{stats.desconhecidos}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40">Desconhecidos</div>
          </div>
        </div>

        {/* Tags Table */}
        <div className="glass-card overflow-hidden border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-[10px] uppercase tracking-widest text-white/30 border-b border-white/10">
              <tr>
                <th className="px-6 py-5 font-bold">Tag / Original</th>
                <th className="px-6 py-5 font-bold">Obra</th>
                <th className="px-6 py-5 font-bold">Confiança</th>
                <th className="px-6 py-5 font-bold">Novidade</th>
                <th className="px-6 py-5 font-bold">Grupo Temático</th>
                <th className="px-6 py-5 font-bold">Estado</th>
                <th className="px-6 py-5 font-bold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tags.map((tag: any) => {
                const nucleo = tag.nucleos;
                const confianca = nucleo?.confianca ?? 0;
                const novidade = nucleo?.novidade ?? 0;
                return (
                  <tr key={tag.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-6 py-5">
                      <div className="font-medium text-white group-hover:text-[#F16001] transition-colors text-base">
                        {tag.tag_original}
                      </div>
                      <div className="text-white/30 text-[10px] mt-1">
                        normalizado: {tag.tag_normalizada}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-white/50 text-xs italic">
                      {tag.obras?.titulo || <span className="text-white/20">sem obra</span>}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min(confianca, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-green-400">{Math.round(confianca)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(novidade, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-400">{Math.round(novidade)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] text-purple-300">
                        {tag.grupo_tematico || 'Outros'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        statusStyle[tag.status] || 'bg-white/5 border-white/10 text-white/30'
                      }`}>
                        {tag.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-white/30 text-xs">
                      {tag.criado_em ? new Date(tag.criado_em).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tags.length === 0 && (
            <div className="py-20 text-center">
              <Layers className="mx-auto text-white/10 mb-4" size={48} strokeWidth={1} />
              <p className="text-white/30 text-sm uppercase tracking-widest">Nenhuma contribuição no sistema.</p>
              <p className="text-white/20 text-xs mt-2">Submeta tags na página de obras para começar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
