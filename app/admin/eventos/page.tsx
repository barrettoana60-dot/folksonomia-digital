import { supabaseAdmin } from '@/lib/supabase/client';

export const revalidate = 60;

async function getEventos() {
  const { data } = await supabaseAdmin
    .from('eventos')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100);
  return data || [];
}

const eventColors: Record<string, string> = {
  tag_criada: 'bg-blue-500/20 text-blue-300',
  validacao_validado: 'bg-green-500/20 text-green-300',
  validacao_publicado: 'bg-cyan-500/20 text-cyan-300',
  validacao_rejeitado: 'bg-red-500/20 text-red-300',
  validacao_revisado: 'bg-purple-500/20 text-purple-300',
  pipeline_semantico_completo: 'bg-indigo-500/20 text-indigo-300',
  recalculo_semantico: 'bg-amber-500/20 text-amber-300'
};

export default async function EventosPage() {
  const eventos = await getEventos();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Trilha de Proveniência</h1>
          <p className="text-white/50 mt-2">
            Registro criptografado de todas as ações e transformações do sistema.
          </p>
        </div>

        {eventos.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <p className="text-white/40">Nenhum evento registrado ainda.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-4">
              {eventos.map((ev: any, idx: number) => {
                const colorClass = eventColors[ev.tipo_evento] || 'bg-white/10 text-white/60';
                return (
                  <div key={ev.id} className="relative pl-20">
                    {/* Dot */}
                    <div className="absolute left-6 top-5 w-4 h-4 rounded-full bg-blue-500/40 border border-blue-400/60" />

                    <div className="glass-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                              {ev.tipo_evento.replace(/_/g, ' ')}
                            </span>
                            <span className="text-white/30 text-xs">
                              {new Date(ev.criado_em).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-white/80 text-sm mt-2">{ev.resumo || 'Evento do sistema.'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/20 text-xs font-mono">
                            {ev.hash_evento ? ev.hash_evento.substring(0, 10) + '…' : `EVT-${String(idx + 1).padStart(4, '0')}`}
                          </p>
                          <p className="text-white/15 text-xs">{ev.entidade_tipo}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
