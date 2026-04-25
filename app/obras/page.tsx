import { supabaseAdmin } from '@/lib/supabase/client';
import ObraCard from '@/components/ObraCard';
import { BookOpen } from 'lucide-react';

export const revalidate = 60;

async function getObras() {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .select('*')
    .eq('publicado', true)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Error fetching obras:', error);
    return [];
  }
  return data || [];
}

export default async function ObrasPage() {
  const obras = await getObras();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-blue-500/10 mb-6">
            <BookOpen size={40} className="text-blue-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Galeria de Obras
          </h1>
          <p className="text-blue-100/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Explore o acervo e registre suas percepções. Cada contribuição é processada 
            pelo motor semântico e conecta-se à teia do conhecimento.
          </p>
        </div>

        {/* Stats Banner */}
        <div
          className="glass-card p-6 mb-12 grid grid-cols-3 gap-6 text-center"
        >
          <div>
            <div className="text-3xl font-bold text-blue-300">{obras.length}</div>
            <div className="text-white/50 text-sm mt-1 uppercase tracking-wider">Obras no acervo</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-300">∞</div>
            <div className="text-white/50 text-sm mt-1 uppercase tracking-wider">Conexões possíveis</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-300">6</div>
            <div className="text-white/50 text-sm mt-1 uppercase tracking-wider">Fontes conectadas</div>
          </div>
        </div>

        {/* No obras */}
        {obras.length === 0 && (
          <div className="glass-card p-16 text-center">
            <p className="text-white/50 text-lg">
              Nenhuma obra cadastrada ainda. O curador pode adicionar obras na área administrativa.
            </p>
          </div>
        )}

        {/* Obras Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {obras.map(obra => (
            <ObraCard key={obra.id} obra={obra} />
          ))}
        </div>

        {/* Footer Info */}
        <div className="glass-card p-6 mt-16 text-center">
          <p className="text-white/40 text-sm leading-relaxed">
            Cada percepção registrada alimenta a teia semântica. O motor de inteligência do sistema 
            identifica conexões com outros acervos, ontologias institucionais e fontes abertas.
          </p>
        </div>
      </div>
    </main>
  );
}
