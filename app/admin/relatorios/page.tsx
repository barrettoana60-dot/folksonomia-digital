import { supabaseAdmin } from '@/lib/supabase/client';
import { ML_SERVICE_URL } from '@/lib/core/env';
import { Clock, BarChart3, Database, Brain, Activity, TrendingUp, Layers, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function safeQuery(table: string, select: string, opts?: any) {
  try {
    let q = supabaseAdmin.from(table).select(select);
    if (opts?.order) q = q.order(opts.order, { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch { return []; }
}

async function getRelatorioData() {
  const [tags, nucleos, obras, fontes, validacoes, evidencias, predictions, memory, unknowns] = await Promise.all([
    safeQuery('tags', 'id, tag_original, tag_normalizada, grupo_tematico, status, obra_id, criado_em'),
    safeQuery('nucleos', 'id, conteudo_original, status_validacao, confianca, novidade, tensao, ressonancia, created_at'),
    safeQuery('obras', 'id, titulo, artista'),
    safeQuery('resultados_externos', 'id, fonte, status, match_score'),
    safeQuery('validacoes', 'id, decisao, criado_em'),
    safeQuery('cross_source_evidence', 'id, termo, fonte, tipo_relacao, peso, created_at'),
    safeQuery('semantic_predictions', 'id, motor, confianca_calibrada, created_at'),
    safeQuery('semantic_memory', 'id, termo, categoria, status, confianca'),
    safeQuery('unknown_terms', 'id, termo, status, hipotese_categoria')
  ]);

  return { tags, nucleos, obras, fontes, validacoes, evidencias, predictions, memory, unknowns };
}

function getTemporalFlow(tags: any[]) {
  const byDay: Record<string, number> = {};
  for (const t of tags) {
    if (!t.criado_em) continue;
    const day = new Date(t.criado_em).toLocaleDateString('pt-BR');
    byDay[day] = (byDay[day] || 0) + 1;
  }
  return Object.entries(byDay).sort((a, b) => {
    const [dA, mA, yA] = a[0].split('/').map(Number);
    const [dB, mB, yB] = b[0].split('/').map(Number);
    return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
  });
}

export default async function RelatoriosPage() {
  const { tags, nucleos, obras, fontes, validacoes, evidencias, predictions, memory, unknowns } = await getRelatorioData();

  const mlServiceOnline = !!ML_SERVICE_URL;
  const motorStatus = {
    tokenClassifier: mlServiceOnline ? 'modernbert_ner' : 'heuristic_fallback',
    knowledgeGraph: mlServiceOnline ? 'rotate_link_prediction' : 'heuristic_fallback',
    communities: mlServiceOnline ? 'gat_clustering' : 'heuristic_fallback',
    semanticMemory: mlServiceOnline ? 'pgvector_embedding' : 'hash_fallback',
    confidence: 'calibrated_model',
    evidenceCollector: 'cross_source',
    activeLearning: 'enabled'
  };

  const temporalFlow = getTemporalFlow(tags);
  const maxCount = Math.max(...temporalFlow.map(([, c]) => c), 1);

  const tagsPorStatus = tags.reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const tagsPorGrupo = tags.reduce((acc: Record<string, number>, t: any) => {
    const g = t.grupo_tematico || 'Outros';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const evidenciasPorFonte = evidencias.reduce((acc: Record<string, number>, e: any) => {
    acc[e.fonte] = (acc[e.fonte] || 0) + 1;
    return acc;
  }, {});

  const evidenciasPorRelacao = evidencias.reduce((acc: Record<string, number>, e: any) => {
    acc[e.tipo_relacao] = (acc[e.tipo_relacao] || 0) + 1;
    return acc;
  }, {});

  const memoriaPorCategoria = memory.reduce((acc: Record<string, number>, m: any) => {
    acc[m.categoria] = (acc[m.categoria] || 0) + 1;
    return acc;
  }, {});

  const csvContent = [
    ['Contribuição', 'Forma Organizada', 'Campo Temático', 'Estado', 'Data'].join(','),
    ...tags.map((t: any) => [
      `"${t.tag_original}"`, `"${t.tag_normalizada}"`,
      `"${t.grupo_tematico || ''}"`, `"${t.status}"`, `"${t.criado_em}"`
    ].join(','))
  ].join('\n');

  return (
    <main className="min-h-screen px-6 py-12 pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-normal serif-title text-white">Relatório Semântico</h1>
          <p className="text-white/40 mt-2 text-xs uppercase tracking-[0.3em]">Análise temporal, motores ativos e evidências cross-source</p>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'Tags coletadas', value: tags.length, icon: <Layers size={16} />, color: 'text-blue-300' },
            { label: 'Núcleos processados', value: nucleos.length, icon: <Brain size={16} />, color: 'text-purple-300' },
            { label: 'Evidências externas', value: evidencias.length, icon: <Globe size={16} />, color: 'text-green-300' },
            { label: 'Memórias semânticas', value: memory.length, icon: <Database size={16} />, color: 'text-amber-300' },
            { label: 'Termos desconhecidos', value: unknowns.length, icon: <Activity size={16} />, color: 'text-red-300' }
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="glass-card p-5 text-center">
              <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
              <div className="text-white/40 text-[9px] mt-1 uppercase tracking-wider leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* FLUXO TEMPORAL */}
        <div className="glass-card p-8 mb-8">
          <h3 className="text-lg font-normal serif-title text-white mb-2 flex items-center gap-3">
            <Clock size={20} className="text-[#E85002]" />
            Fluxo Temporal de Contribuições
          </h3>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-6">Distribuição de tags ao longo do tempo</p>
          
          {temporalFlow.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">Nenhuma contribuição registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {temporalFlow.map(([day, count]) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="text-white/50 text-xs w-24 text-right font-mono">{day}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-[#E85002] to-[#E85002]/60 rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/80">
                      {count} {count === 1 ? 'tag' : 'tags'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Status das tags */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4">Tags por Estado</h3>
            {Object.entries(tagsPorStatus).length === 0 ? (
              <p className="text-white/30 text-sm">Nenhuma tag ainda.</p>
            ) : Object.entries(tagsPorStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm capitalize">{status}</span>
                <span className="text-blue-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Grupos temáticos */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4">Campos Temáticos</h3>
            {Object.entries(tagsPorGrupo).length === 0 ? (
              <p className="text-white/30 text-sm">Nenhum grupo ainda.</p>
            ) : Object.entries(tagsPorGrupo).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([grupo, count]) => (
              <div key={grupo} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm">{grupo}</span>
                <span className="text-purple-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Evidências Cross-Source */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4 flex items-center gap-2">
              <Globe size={16} className="text-orange-400" /> Evidências por Fonte
            </h3>
            {Object.keys(evidenciasPorFonte).length === 0 ? (
              <p className="text-white/30 text-sm">Nenhuma evidência cross-source ainda.</p>
            ) : Object.entries(evidenciasPorFonte).map(([fonte, count]) => (
              <div key={fonte} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm capitalize">{fonte}</span>
                <span className="text-green-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Tipos de relação */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4">Tipos de Match</h3>
            {Object.keys(evidenciasPorRelacao).length === 0 ? (
              <p className="text-white/30 text-sm">Nenhum match registrado.</p>
            ) : Object.entries(evidenciasPorRelacao).map(([tipo, count]) => (
              <div key={tipo} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm">{tipo}</span>
                <span className="text-amber-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Indicadores semânticos */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" /> Indicadores Médios
            </h3>
            {nucleos.length > 0 ? (() => {
              const avg = (key: string) => Math.round(nucleos.reduce((s: number, n: any) => s + (n[key] || 0), 0) / nucleos.length);
              return [
                { label: 'Confiança calibrada', val: avg('confianca'), color: 'bg-orange-400' },
                { label: 'Novidade semântica', val: avg('novidade'), color: 'bg-blue-400' },
                { label: 'Tensão documental', val: avg('tensao'), color: 'bg-amber-400' },
                { label: 'Ressonância', val: avg('ressonancia'), color: 'bg-purple-400' }
              ].map(({ label, val, color }) => (
                <div key={label} className="py-2 border-b border-white/5 last:border-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{label}</span>
                    <span className="text-white/80 font-bold">{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(val, 100)}%` }} />
                  </div>
                </div>
              ));
            })() : <p className="text-white/30 text-sm">Dados insuficientes.</p>}
          </div>

          {/* Memória semântica */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title text-white mb-4 flex items-center gap-2">
              <Database size={16} className="text-amber-400" /> Memória por Categoria
            </h3>
            {Object.keys(memoriaPorCategoria).length === 0 ? (
              <p className="text-white/30 text-sm">Memória semântica vazia — aguardando primeiro treinamento.</p>
            ) : Object.entries(memoriaPorCategoria).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm">{cat}</span>
                <span className="text-amber-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="glass-card p-8 text-center space-y-4">
          <h3 className="text-xl font-normal serif-title text-white mb-2">Exportar Dados</h3>
          <p className="text-white/50 text-sm">Baixe os dados para análise externa ou integração institucional.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
              download="folksonomia_contribuicoes.csv"
              className="liquid-button px-6 py-3 text-sm"
            >
              Exportar CSV
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
