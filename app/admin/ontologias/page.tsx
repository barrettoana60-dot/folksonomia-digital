import { supabaseAdmin } from '@/lib/supabase/client';
import { Database, Network } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOntologiasPage() {
  const { data: grupos } = await supabaseAdmin
    .from('tags')
    .select('grupo_tematico')
    .not('grupo_tematico', 'is', null);

  // Group and count
  const counts: Record<string, number> = {};
  grupos?.forEach(g => {
    if (g.grupo_tematico) {
      counts[g.grupo_tematico] = (counts[g.grupo_tematico] || 0) + 1;
    }
  });

  const ontologias = Object.entries(counts).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif text-white flex items-center gap-3">
          <Network className="text-gray-400" />
          Ontologias e Agrupamentos
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ontologias.map((ont) => (
          <div key={ont.nome} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">{ont.nome}</h3>
            <p className="text-gray-400 text-sm">
              <span className="text-white font-medium">{ont.count}</span> tags normalizadas vinculadas a esta categoria.
            </p>
          </div>
        ))}
        {ontologias.length === 0 && (
          <div className="col-span-3 p-8 text-center text-gray-400">
            Nenhuma ontologia registrada ainda.
          </div>
        )}
      </div>
    </div>
  );
}
