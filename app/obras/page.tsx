import { supabaseAdmin } from '@/lib/supabase/client';
import ObraCard from '@/components/ObraCard';

export const dynamic = 'force-dynamic';

async function getObras() {
  const { data, error } = await supabaseAdmin
    .from('obras')
    .select('*')
    .eq('publicado', true)
    .order('criado_em', { ascending: false });

  if (error) return [];
  return data || [];
}

export default async function ObrasPage() {
  const obras = await getObras();

  return (
    <main className="min-h-screen pt-28 pb-20 px-8">
      <div className="max-w-[1400px] mx-auto space-y-16">

        {/* Cabeçalho */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-normal serif-title text-[#1A1A1A] tracking-tight">
            Explorar Obras
          </h1>
          <p className="text-[#1A1A1A]/40 text-[11px] uppercase tracking-[0.22em] font-semibold">
            Acervo e Documentação Semântica
          </p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <div className="h-px w-10 bg-[#1A1A1A]/10" />
            <div className="w-2 h-2 rounded-full" style={{ background: '#E8490A' }} />
            <div className="h-px w-10 bg-[#1A1A1A]/10" />
          </div>
        </div>

        {/* Grid de obras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
          {obras.length === 0 ? (
            <ObraCard
              obra={{
                id: 'picasso-test',
                titulo: 'Guernica',
                artista: 'Pablo Picasso',
                ano: '1937',
                imagem_url: 'https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg',
                descricao: 'Painel a óleo sobre tela, retratando o bombardeio de Guernica.',
                audiodescricao: 'A pintura apresenta tons de cinza e branco, retratando o sofrimento humano em meio ao caos da guerra.'
              }}
            />
          ) : (
            obras.map(obra => (
              <ObraCard key={obra.id} obra={obra} />
            ))
          )}
        </div>

      </div>
    </main>
  );
}
