import { supabaseAdmin } from '@/lib/supabase/client';
import ObraCard from '@/components/ObraCard';
import Link from 'next/link';

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
    <main className="min-h-screen pt-32 pb-20 px-8">
      <div className="max-w-[1400px] mx-auto space-y-20">
        
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-normal serif-title text-white tracking-tight">
            Explorar Obras
          </h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[0.5em] font-bold">
            Galeria Institucional de Folksonomia
          </p>
          <div className="h-[1px] w-12 bg-[#E85002] mx-auto mt-10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {obras.length === 0 ? (
            <ObraCard 
              obra={{
                id: 'picasso-test',
                titulo: 'Guernica',
                artista: 'Pablo Picasso',
                ano: '1937',
                imagem_url: 'https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg'
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
