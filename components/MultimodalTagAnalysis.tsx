'use client';

import React, { useMemo } from 'react';

type TagStat = {
  tag: string;
  uses: number;
  people: number;
  works: number;
};

type Correlation = {
  tagA: string;
  tagB: string;
  phi: number;
  jaccard: number;
  cooccurrence: number;
  support: number;
};

type ImageEvidence = {
  obraId: string;
  titulo: string;
  imagemUrl?: string | null;
  cached?: boolean;
  visualEvidence?: number | null;
  contextSimilarity?: number | null;
  tagSetCoherence?: number | null;
  cohesionScore?: number | null;
  visualConcepts?: Array<{ label: string; score: number }>;
  otherTags?: string[];
  model?: string;
  error?: string;
};

type MultimodalData = {
  currentTag?: TagStat | null;
  topTags?: TagStat[];
  correlations?: Correlation[];
  correlationMatrix?: {
    labels: string[];
    values: number[][];
  };
  imageEvidence?: ImageEvidence[];
  worksTotal?: number;
  worksAnalyzed?: number;
  visualModel?: string | null;
  contextModel?: string | null;
  formula?: string;
  note?: string;
};

function pct(v: number | null | undefined): string {
  return typeof v === 'number' ? `${Math.round(v * 100)}%` : '—';
}

function clamp(v: number, min = -1, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

export default function MultimodalTagAnalysis({
  data,
}: {
  data?: MultimodalData | null;
}) {
  const matrix = data?.correlationMatrix;
  const matrixMax = useMemo(() => {
    if (!matrix?.values?.length) return 1;
    return Math.max(
      ...matrix.values.flat().map(v => Math.abs(v)),
      0.01
    );
  }, [matrix]);

  if (!data) return null;

  return (
    <div className="space-y-5">
      <section className="glass-card p-6 border border-[#E85002]/20">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E85002]" />
              Análise multimodal da associação
            </h3>
            <p className="text-[10px] text-[#1A1A1A]/45 mt-1">
              Imagem + contexto museológico + conjunto de tags + frequência das contribuições.
            </p>
          </div>
          <div className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/40 text-right">
            {data.visualModel ? `Visão: ${data.visualModel}` : 'Visão não disponível'}
            <br />
            {data.contextModel ? `Texto: ${data.contextModel}` : 'Texto não disponível'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white/55 border border-black/07">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Pessoas</p>
            <p className="text-2xl font-semibold text-[#E85002] mt-1">{data.currentTag?.people ?? 0}</p>
            <p className="text-[9px] text-[#1A1A1A]/35 mt-1">contribuidores distintos</p>
          </div>
          <div className="p-4 rounded-xl bg-white/55 border border-black/07">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Usos</p>
            <p className="text-2xl font-semibold text-[#1A1A1A] mt-1">{data.currentTag?.uses ?? 0}</p>
            <p className="text-[9px] text-[#1A1A1A]/35 mt-1">atribuições da tag</p>
          </div>
          <div className="p-4 rounded-xl bg-white/55 border border-black/07">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Obras</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{data.currentTag?.works ?? 0}</p>
            <p className="text-[9px] text-[#1A1A1A]/35 mt-1">obras com a tag</p>
          </div>
          <div className="p-4 rounded-xl bg-white/55 border border-black/07">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Imagens analisadas</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">{data.worksAnalyzed ?? 0}</p>
            <p className="text-[9px] text-[#1A1A1A]/35 mt-1">
              de {data.worksTotal ?? data.currentTag?.works ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider">O que o modelo encontrou na imagem</h4>
          <p className="text-[10px] text-[#1A1A1A]/40 mt-1">
            A porcentagem abaixo é evidência visual do modelo, não uma probabilidade calibrada de “verdade”.
          </p>
        </div>

        {data.imageEvidence && data.imageEvidence.length > 0 ? (
          <div className="space-y-4">
            {data.imageEvidence.map((item, index) => (
              <div key={`${item.obraId}-${index}`} className="p-4 rounded-xl bg-white/60 border border-black/08">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-32 shrink-0">
                    {item.imagemUrl ? (
                      <img
                        src={item.imagemUrl}
                        alt={item.titulo}
                        className="w-full h-28 md:h-24 object-cover rounded-lg border border-black/08"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-lg bg-black/05 flex items-center justify-center text-[9px] uppercase text-[#1A1A1A]/30">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <h5 className="text-sm font-serif italic text-[#1A1A1A]/85 truncate">{item.titulo}</h5>
                      {item.cached && (
                        <span className="self-start px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/15 text-[8px] uppercase font-bold">
                          análise persistida
                        </span>
                      )}
                    </div>

                    {item.error ? (
                      <p className="text-[10px] text-red-500">{item.error}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <MetricBar label="Evidência visual" value={item.visualEvidence} />
                          <MetricBar label="Contexto da obra" value={item.contextSimilarity} />
                          <MetricBar label="Coerência com outras tags" value={item.tagSetCoherence} />
                        </div>

                        <div className="mt-3 p-3 bg-[#E85002]/05 rounded-lg border border-[#E85002]/10">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Coesão multimodal</p>
                              <p className="text-[9px] text-[#1A1A1A]/35 mt-1">{data.formula || 'Combinação das evidências disponíveis'}</p>
                            </div>
                            <p className="text-2xl font-semibold text-[#E85002]">{pct(item.cohesionScore)}</p>
                          </div>
                        </div>

                        {item.visualConcepts && item.visualConcepts.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40 mb-2">Conceitos visuais relacionados</p>
                            <div className="flex flex-wrap gap-1.5">
                              {item.visualConcepts.slice(0, 8).map((concept, ci) => (
                                <span
                                  key={ci}
                                  className="px-2 py-1 rounded-full text-[9px] bg-blue-500/08 border border-blue-500/10 text-blue-700"
                                >
                                  {concept.label} · {pct(concept.score)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.otherTags && item.otherTags.length > 0 && (
                          <p className="text-[9px] text-[#1A1A1A]/38 mt-3">
                            Outras tags na mesma obra: {item.otherTags.slice(0, 8).join(', ')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Ainda não há imagens associadas a esta tag para análise visual." />
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider">Adoção das tags por pessoas</h4>
          <p className="text-[10px] text-[#1A1A1A]/40 mt-1">
            Conta contribuidores distintos por tag, sem exibir identificadores individuais.
          </p>
        </div>

        {data.topTags && data.topTags.length > 0 ? (
          <div className="space-y-3">
            {data.topTags.slice(0, 10).map((item, index) => {
              const maxPeople = Math.max(...data.topTags!.map(x => x.people), 1);
              const width = Math.max((item.people / maxPeople) * 100, item.people > 0 ? 4 : 0);
              return (
                <div key={`${item.tag}-${index}`} className="space-y-1">
                  <div className="flex justify-between gap-3 text-[10px]">
                    <span className="font-semibold text-[#1A1A1A]/75 truncate">{item.tag}</span>
                    <span className="font-mono text-[#1A1A1A]/45">{item.people} pessoas · {item.uses} usos</span>
                  </div>
                  <div className="h-2 bg-black/05 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E85002] rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Nenhuma contribuição de visitante foi encontrada para gerar este gráfico." />
        )}
      </section>

      <section className="glass-card p-6">
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider">Correlações entre tags por obra</h4>
          <p className="text-[10px] text-[#1A1A1A]/40 mt-1">
            Correlação φ (phi) calculada sobre a presença/ausência das tags em cada obra. O número de coocorrências também é mostrado.
          </p>
        </div>

        {matrix && matrix.labels?.length > 1 ? (
          <div className="overflow-x-auto">
            <table className="border-collapse text-[8px] min-w-[640px]">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white/95 border border-black/08 p-2 text-left" />
                  {matrix.labels.map((label, i) => (
                    <th key={i} className="border border-black/08 p-2 text-center font-semibold max-w-[90px] truncate">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.values.map((row, i) => (
                  <tr key={i}>
                    <th className="sticky left-0 bg-white/95 border border-black/08 p-2 text-left font-semibold max-w-[110px] truncate">{matrix.labels[i]}</th>
                    {row.map((value, j) => {
                      const intensity = Math.min(Math.abs(value) / matrixMax, 1);
                      const isDiag = i === j;
                      return (
                        <td
                          key={j}
                          className="border border-black/08 p-0 text-center"
                          title={`${matrix.labels[i]} × ${matrix.labels[j]}: ${value.toFixed(2)}`}
                        >
                          <div
                            className="w-16 h-9 flex items-center justify-center font-mono"
                            style={{
                              background: isDiag
                                ? 'rgba(232,80,2,0.12)'
                                : value >= 0
                                ? `rgba(37,99,235,${0.08 + intensity * 0.42})`
                                : `rgba(220,38,38,${0.08 + intensity * 0.42})`,
                              color: isDiag ? '#C73D08' : value >= 0 ? '#1D4ED8' : '#B91C1C',
                            }}
                          >
                            {value.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Ainda não há obras em quantidade suficiente para uma matriz de correlação." />
        )}

        {data.correlations && data.correlations.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[#1A1A1A]/40">Pares com suporte observado</p>
            {data.correlations.slice(0, 8).map((pair, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-white/55 border border-black/06">
                <span className="text-[11px] font-serif italic text-[#1A1A1A]/80 flex-1">
                  {pair.tagA} ↔ {pair.tagB}
                </span>
                <span className="text-[9px] text-[#1A1A1A]/45">{pair.cooccurrence} obras em comum</span>
                <span className="text-[10px] font-mono font-bold text-[#E85002]">
                  φ {pair.phi.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#1A1A1A]/40">
                  Jaccard {Math.round(pair.jaccard * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card p-5 border border-blue-500/10 bg-blue-500/03">
        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-700 mb-2">Critério de análise</p>
        <p className="text-[10px] text-[#1A1A1A]/50 leading-relaxed">
          {data.note || 'A análise separa evidência visual, semântica e comportamento coletivo para evitar transformar uma única métrica em “verdade”.'}
        </p>
      </section>
    </div>
  );
}

function MetricBar({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  const known = typeof value === 'number';
  const width = known ? `${Math.max(2, Math.min(100, value! * 100))}%` : '0%';

  return (
    <div className="p-3 rounded-lg bg-white/45 border border-black/06">
      <div className="flex justify-between text-[9px] mb-1">
        <span className="text-[#1A1A1A]/45">{label}</span>
        <span className="font-semibold text-[#1A1A1A]/65">{known ? pct(value) : '—'}</span>
      </div>
      <div className="h-1.5 bg-black/05 rounded-full overflow-hidden">
        <div className="h-full bg-[#E85002]" style={{ width }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center text-[10px] uppercase tracking-wider font-semibold text-[#1A1A1A]/30 border border-black/06 rounded-xl">
      {text}
    </div>
  );
}
