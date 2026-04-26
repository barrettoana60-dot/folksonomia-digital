import { supabaseAdmin } from '@/lib/supabase/client';
import ObraCard from '@/components/ObraCard';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

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
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-[#E85002]/10 mb-6">
            <BookOpen size={40} className="text-[#E85002]" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-normal serif-title text-white mb-4">
            Galeria de Acervo
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed font-light">
            Explore as obras e registre suas percepções. Cada contribuição alimenta a 
            teia de conhecimento e amplia as leituras do acervo.
          </p>
        </div>

        {/* Stats Banner */}
        <div
          className="glass-card p-8 mb-16 grid grid-cols-3 gap-6 text-center border-[#E85002]/10"
        >
          <div>
            <div className="text-3xl font-normal serif-title text-[#E85002]">{obras.length}</div>
            <div className="text-white/30 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Registros no Acervo</div>
          </div>
          <div>
            <div className="text-3xl font-normal serif-title text-white">∞</div>
            <div className="text-white/30 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Conexões Semânticas</div>
          </div>
          <div>
            <div className="text-3xl font-normal serif-title text-[#D9C3AB]">6</div>
            <div className="text-white/30 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold">Fontes Institucionais</div>
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
