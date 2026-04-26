import { supabaseAdmin } from '@/lib/supabase/client';
import ObraCard from '@/components/ObraCard';

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
    <main className="min-h-screen bg-black pt-32 pb-20 px-8">
      <div className="max-w-[1400px] mx-auto space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-normal serif-title text-white tracking-tight">
            Explorar Obras
          </h1>
          <p className="text-white/30 text-xs uppercase tracking-[0.4em] font-medium">
            Acervo Institucional de Folksonomia
          </p>
          <div className="h-[1px] w-12 bg-[#E85002] mx-auto mt-8" />
        </div>

        {/* Info Banner */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white/40 text-sm leading-relaxed font-light italic">
            Selecione uma obra para ver detalhes e registrar suas percepções semânticas. 
            Sua contribuição é fundamental para o enriquecimento do nosso sistema.
          </p>
        </div>

        {/* No obras */}
        {obras.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-white/20 uppercase tracking-[0.2em] text-[10px]">
              Nenhuma obra disponível no momento.
            </p>
          </div>
        )}

        {/* Obras Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {obras.map(obra => (
            <ObraCard key={obra.id} obra={obra} />
          ))}
        </div>

      </div>
    </main>
  );
}
