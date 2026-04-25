import { supabaseAdmin } from '@/lib/supabase/client';

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

const statusColors: Record<string, string> = {
  'em análise': 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  validado: 'bg-green-500/20 border-green-500/40 text-green-300',
  publicado: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  rejeitado: 'bg-red-500/20 border-red-500/40 text-red-300',
  revisado: 'bg-purple-500/20 border-purple-500/40 text-purple-300'
};

export default async function TagsPage() {
  const tags = await getTagsWithNuclei();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Contribuições e Células</h1>
          <p className="text-white/50 mt-2">
            Cada contribuição gera um núcleo informacional único com camadas semânticas, criptografia e conexões externas.
          </p>
        </div>

        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Contribuição</th>
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Obra</th>
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Campo temático</th>
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Conexão</th>
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs text-white/40 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{tag.tag_original}</div>
                      <div className="text-white/40 text-xs mt-0.5">→ {tag.tag_normalizada}</div>
                    </td>
                    <td className="px-6 py-4 text-white/70 text-sm">
                      {tag.obras?.titulo || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {tag.grupo_tematico ? (
                        <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-200 text-xs">
                          {tag.grupo_tematico}
                        </span>
                      ) : <span className="text-white/30 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {tag.nucleos ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-blue-400"
                              style={{ width: `${Math.min(100, tag.nucleos.confianca || 0)}%` }}
                            />
                          </div>
                          <span className="text-white/50 text-xs">{Math.round(tag.nucleos.confianca || 0)}%</span>
                        </div>
                      ) : <span className="text-white/30 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        statusColors[tag.status] || 'bg-white/10 border-white/20 text-white/50'
                      }`}>
                        {tag.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/40 text-xs">
                      {new Date(tag.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {tags.length === 0 && (
              <div className="py-16 text-center text-white/40">
                Nenhuma contribuição registrada ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
