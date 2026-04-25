import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

async function getPendingNuclei() {
  const { data } = await supabaseAdmin
    .from('nucleos')
    .select(`
      id, conteudo_original, conteudo_normalizado, status_validacao,
      confianca, novidade, tensao, ressonancia, criado_em, obra_id, metadados,
      obras (titulo, artista),
      ml_sugestoes (id, tipo_sugestao, sugestao, score, status),
      resultados_externos (id, fonte, titulo, url, match_score, tipo_relacao)
    `)
    .in('status_validacao', ['bruto', 'revisado'])
    .order('criado_em', { ascending: false })
    .limit(50);

  return data || [];
}

function ScoreBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-white/50 text-xs">{label}</span>
        <span className="text-white/80 text-xs font-bold">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export default async function ValidacaoPage() {
  const nuclei = await getPendingNuclei();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Painel de Validação</h1>
          <p className="text-white/50 mt-2">
            {nuclei.length} contribuição(ões) aguardando análise curatorial
          </p>
        </div>

        {nuclei.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <p className="text-white/40 text-lg">Nenhuma contribuição pendente no momento.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {nuclei.map((n: any) => (
              <div key={n.id} className="glass-card p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                  {/* Left: Tag Cell Info */}
                  <div className="lg:col-span-2 space-y-5">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <span className="text-xs text-white/30 uppercase tracking-wider">Contribuição original</span>
                        <h2 className="text-3xl font-bold text-white mt-1">{n.conteudo_original}</h2>
                        <p className="text-blue-200/60 text-sm mt-1">
                          Forma organizada: <strong>{n.conteudo_normalizado}</strong>
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        n.status_validacao === 'bruto' 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      }`}>
                        {n.status_validacao === 'bruto' ? 'Em análise' : 'Em revisão'}
                      </div>
                    </div>

                    {n.obras && (
                      <p className="text-white/50 text-sm">
                        Obra relacionada: <span className="text-white/80">{n.obras.titulo}</span>
                        {n.obras.artista && <span className="text-white/40"> — {n.obras.artista}</span>}
                      </p>
                    )}

                    {/* Semantic indicators */}
                    <div className="grid grid-cols-2 gap-3">
                      <ScoreBar label="Nível de conexão" value={n.confianca} color="bg-blue-400" />
                      <ScoreBar label="Novidade semântica" value={n.novidade} color="bg-purple-400" />
                      <ScoreBar label="Tensão documental" value={n.tensao} color="bg-amber-400" />
                      <ScoreBar label="Ressonância" value={n.ressonancia} color="bg-green-400" />
                    </div>

                    {/* Suggested concepts */}
                    {n.ml_sugestoes && n.ml_sugestoes.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Conceitos próximos identificados</p>
                        <div className="flex flex-wrap gap-2">
                          {n.ml_sugestoes.filter((s: any) => s.status === 'pendente').map((s: any) => (
                            <span key={s.id} className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-200 text-xs font-medium">
                              {s.sugestao}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* External sources */}
                    {n.resultados_externos && n.resultados_externos.length > 0 && (
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Fontes externas conectadas</p>
                        <div className="space-y-2">
                          {n.resultados_externos.slice(0, 3).map((r: any) => (
                            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                              <div>
                                <div className="text-white/80 text-sm font-medium line-clamp-1">{r.titulo}</div>
                                <div className="text-white/30 text-xs">{r.fonte} · {r.tipo_relacao}</div>
                              </div>
                              <div className="text-green-300 text-xs font-bold ml-4">
                                {Math.round(r.match_score * 100)}%
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Action Panel */}
                  <div className="flex flex-col gap-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Ações curatoriais</p>

                    {[
                      { decisao: 'validado', label: 'Validar contribuição', cls: 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20' },
                      { decisao: 'publicado', label: 'Validar e publicar', cls: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20' },
                      { decisao: 'revisado', label: 'Marcar para revisão', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' },
                      { decisao: 'rejeitado', label: 'Rejeitar', cls: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20' }
                    ].map(({ decisao, label, cls }) => (
                      <ValidationButton
                        key={decisao}
                        nucleoId={n.id}
                        decisao={decisao}
                        label={label}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${cls}`}
                      />
                    ))}

                    <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/30 leading-relaxed">
                      Assinatura: {n.id.substring(0, 8)}…
                      <br />
                      Registrado: {new Date(n.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// Client sub-component for actions
function ValidationButton({ nucleoId, decisao, label, className }: {
  nucleoId: string;
  decisao: string;
  label: string;
  className: string;
}) {
  return (
    <form action={async () => {
      'use server';
      const { supabaseAdmin: sb } = await import('@/lib/supabase/client');
      await sb.from('validacoes').insert({ nucleo_id: nucleoId, decisao, status_novo: decisao });
      await sb.from('nucleos').update({ status_validacao: decisao }).eq('id', nucleoId);
      await sb.from('eventos').insert({
        entidade_tipo: 'nucleo', entidade_id: nucleoId,
        tipo_evento: `validacao_${decisao}`,
        resumo: `Registro ${decisao} pelo curador.`
      });
    }}>
      <button type="submit" className={className}>{label}</button>
    </form>
  );
}
