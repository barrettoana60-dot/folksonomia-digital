import { supabaseAdmin } from '@/lib/supabase/client';
import { ML_SERVICE_URL } from '@/lib/core/env';
import { Brain, Activity, Database, BarChart3, Clock, CheckCircle, XCircle, AlertTriangle, Layers, Globe, Cpu } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getModelData() {
  const [versions, runs, predictions, feedback, memory, unknowns, evidence, examples] = await Promise.all([
    supabaseAdmin.from('model_versions').select('*').order('created_at', { ascending: false }).limit(10).catch(() => ({ data: [] })),
    supabaseAdmin.from('training_runs').select('*').order('created_at', { ascending: false }).limit(10).catch(() => ({ data: [] })),
    supabaseAdmin.from('semantic_predictions').select('id, motor, categoria_predita, confianca_calibrada, created_at').order('created_at', { ascending: false }).limit(50).catch(() => ({ data: [] })),
    supabaseAdmin.from('semantic_feedback').select('*').order('created_at', { ascending: false }).limit(50).catch(() => ({ data: [] })),
    supabaseAdmin.from('semantic_memory').select('*').order('created_at', { ascending: false }).limit(50).catch(() => ({ data: [] })),
    supabaseAdmin.from('unknown_terms').select('*').order('created_at', { ascending: false }).limit(30).catch(() => ({ data: [] })),
    supabaseAdmin.from('cross_source_evidence').select('*').order('created_at', { ascending: false }).limit(50).catch(() => ({ data: [] })),
    supabaseAdmin.from('semantic_training_examples').select('id, texto, created_at').limit(1).catch(() => ({ data: [], count: 0 }))
  ]);

  return {
    versions: (versions as any).data || [],
    runs: (runs as any).data || [],
    predictions: (predictions as any).data || [],
    feedback: (feedback as any).data || [],
    memory: (memory as any).data || [],
    unknowns: (unknowns as any).data || [],
    evidence: (evidence as any).data || [],
    examplesCount: (examples as any).data?.length || 0
  };
}

async function checkMLHealth(): Promise<any> {
  if (!ML_SERVICE_URL) return null;
  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (res.ok) return await res.json();
    return null;
  } catch { return null; }
}

export default async function ModelosPage() {
  const data = await getModelData();
  const mlHealth = await checkMLHealth();
  const mlOnline = !!mlHealth;

  const motors = {
    tokenClassifier: { name: 'Token Classifier', engine: mlOnline ? 'modernbert_ner' : 'heuristic_fallback', desc: 'NER museológico — MATERIAL, TECNICA, AUTORIA, DATA, PERIODO, LUGAR, ICONOGRAFIA, TEMA, ESTILO' },
    knowledgeGraph: { name: 'Knowledge Graph', engine: mlOnline ? 'rotate_link_prediction' : 'heuristic_fallback', desc: 'Previsão de links e relações entre entidades (RotatE)' },
    communities: { name: 'Community Detection', engine: mlOnline ? 'gat_clustering' : 'heuristic_fallback', desc: 'Detecção de comunidades sobrepostas (Graph Attention Network)' },
    semanticMemory: { name: 'Semantic Memory', engine: mlOnline ? 'pgvector_embedding' : 'hash_fallback', desc: 'Embeddings de 768d via ModernBERT-base' },
    confidence: { name: 'Confidence Engine', engine: 'calibrated_model', desc: 'Multi-fator: modelo + evidência + memória + validação + ambiguidade' },
    evidenceCollector: { name: 'Evidence Collector', engine: 'cross_source', desc: 'Europeana + Ibram/Tainacan + Brasiliana Museus' },
    activeLearning: { name: 'Active Learning', engine: 'enabled', desc: 'Registro de termos desconhecidos → hipótese → validação → memória' }
  };

  // Compute pseudo-metrics from predictions
  const predByCategory = data.predictions.reduce((acc: Record<string, number>, p: any) => {
    const cat = p.categoria_predita || 'O';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const avgConfidence = data.predictions.length > 0
    ? Math.round(data.predictions.reduce((s: number, p: any) => s + (p.confianca_calibrada || 0), 0) / data.predictions.length)
    : 0;

  const feedbackCount = data.feedback.length;
  const validatedCount = data.feedback.filter((f: any) => f.decisao === 'validar' || f.acao === 'validar').length;
  const rejectedCount = data.feedback.filter((f: any) => f.decisao === 'rejeitar' || f.acao === 'rejeitar').length;

  const memoryByCategory = data.memory.reduce((acc: Record<string, number>, m: any) => {
    acc[m.categoria || 'geral'] = (acc[m.categoria || 'geral'] || 0) + 1;
    return acc;
  }, {});

  const evidenceBySource = data.evidence.reduce((acc: Record<string, number>, e: any) => {
    acc[e.fonte || 'desconhecida'] = (acc[e.fonte || 'desconhecida'] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-black text-white p-10 pt-24">
      <div className="max-w-[95%] mx-auto">
        
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-normal serif-title tracking-tight flex items-center gap-4">
              <Cpu className="text-[#E85002]" size={36} />
              Painel de Modelos
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mt-2">
              Versionamento, métricas e calibração do pipeline ML
            </p>
          </div>
          <Link href="/admin" className="liquid-button text-[10px] py-2 px-6">Voltar</Link>
        </div>

        {/* ML Service Status */}
        <div className={`glass-card p-6 mb-8 border ${mlOnline ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${mlOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <div>
                <h3 className="text-lg font-bold">{mlOnline ? 'ML Service ONLINE' : 'ML Service OFFLINE'}</h3>
                <p className="text-white/40 text-xs">
                  {mlOnline 
                    ? `${ML_SERVICE_URL} — Device: ${mlHealth?.device || 'cpu'}`
                    : ML_SERVICE_URL ? `${ML_SERVICE_URL} — não respondeu` : 'ML_SERVICE_URL não configurada'
                  }
                </p>
              </div>
            </div>
            {mlHealth && (
              <div className="flex gap-4 text-xs">
                <span className={mlHealth.models?.embedder ? 'text-green-400' : 'text-red-400'}>
                  Embedder: {mlHealth.models?.embedder ? 'OK' : 'OFF'}
                </span>
                <span className={mlHealth.models?.ner ? 'text-green-400' : 'text-red-400'}>
                  NER: {mlHealth.models?.ner ? `v${mlHealth.models?.ner_version || '1'}` : 'não treinado'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Motors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Object.entries(motors).map(([key, motor]) => {
            const isReal = !motor.engine.includes('heuristic') && !motor.engine.includes('hash');
            return (
              <div key={key} className={`glass-card p-5 border ${isReal ? 'border-green-500/20' : 'border-amber-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {isReal ? <CheckCircle size={14} className="text-green-400" /> : <AlertTriangle size={14} className="text-amber-400" />}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/80">{motor.name}</h4>
                </div>
                <p className={`text-sm font-bold mb-2 ${isReal ? 'text-green-400' : 'text-amber-400'}`}>{motor.engine}</p>
                <p className="text-[10px] text-white/30 leading-relaxed">{motor.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
          {[
            { label: 'Predições', value: data.predictions.length, color: 'text-blue-300' },
            { label: 'Validações humanas', value: feedbackCount, color: 'text-green-300' },
            { label: 'Aceitas', value: validatedCount, color: 'text-green-400' },
            { label: 'Rejeitadas', value: rejectedCount, color: 'text-red-400' },
            { label: 'Memórias', value: data.memory.length, color: 'text-amber-300' },
            { label: 'Termos desconhecidos', value: data.unknowns.length, color: 'text-purple-300' }
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Confidence Distribution */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-[#E85002]" /> Confiança Média Calibrada
            </h3>
            <div className="text-center py-6">
              <div className="text-6xl font-bold text-white/90">{avgConfidence}%</div>
              <p className="text-white/30 text-xs mt-2">
                Baseado em {data.predictions.length} predições
              </p>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  avgConfidence > 80 ? 'bg-green-400' : avgConfidence > 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(avgConfidence, 100)}%` }}
              />
            </div>
          </div>

          {/* Predictions by Category */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
              <Layers size={18} className="text-[#E85002]" /> Predições por Categoria
            </h3>
            {Object.keys(predByCategory).length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">Nenhuma predição registrada — aguardando primeiro uso.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(predByCategory).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm font-mono">{cat}</span>
                    <span className="text-blue-300 font-bold text-sm">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memory by Category */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
              <Database size={18} className="text-amber-400" /> Memória Semântica
            </h3>
            {Object.keys(memoryByCategory).length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">Memória vazia — valide tags para popular.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(memoryByCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm">{cat}</span>
                    <span className="text-amber-300 font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence by Source */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
              <Globe size={18} className="text-green-400" /> Evidências Cross-Source
            </h3>
            {Object.keys(evidenceBySource).length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">Sem evidências — serão geradas ao processar tags.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(evidenceBySource).map(([src, count]) => (
                  <div key={src} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm capitalize">{src}</span>
                    <span className="text-green-300 font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Model Versions */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#E85002]" /> Versões do Modelo
          </h3>
          {data.versions.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">
              Nenhum modelo treinado ainda. Execute POST /api/ml/train-model para iniciar.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left">Versão</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-left">F1</th>
                  <th className="px-4 py-3 text-left">Exemplos</th>
                  <th className="px-4 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.versions.map((v: any) => (
                  <tr key={v.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-blue-300 font-mono">{v.versao || v.version || '—'}</td>
                    <td className="px-4 py-3 text-white/70">{v.modelo || v.model_name || '—'}</td>
                    <td className="px-4 py-3 text-green-400 font-bold">{v.f1_score ? `${(v.f1_score * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-4 py-3 text-white/50">{v.num_exemplos || v.num_examples || '—'}</td>
                    <td className="px-4 py-3 text-white/30">{v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Training Runs */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
            <Clock size={18} className="text-purple-400" /> Histórico de Treino
          </h3>
          {data.runs.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">
              Nenhum treino executado. O ML Service em {ML_SERVICE_URL || '(não configurado)'} aceita POST /train.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-white/30 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Modelo</th>
                  <th className="px-4 py-3 text-left">Métricas</th>
                  <th className="px-4 py-3 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.runs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        r.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>{r.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.modelo || r.model_name || '—'}</td>
                    <td className="px-4 py-3 text-white/50 text-xs font-mono">{r.metricas ? JSON.stringify(r.metricas).slice(0, 60) : '—'}</td>
                    <td className="px-4 py-3 text-white/30">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Unknown Terms */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-normal serif-title mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" /> Termos Desconhecidos (Active Learning)
          </h3>
          {data.unknowns.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">
              Nenhum termo desconhecido — o sistema registra automaticamente palavras não reconhecidas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.unknowns.map((u: any) => (
                <div key={u.id} className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-300 text-sm font-medium">{u.termo}</span>
                  {u.hipotese_categoria && (
                    <span className="text-white/30 text-[10px] ml-2">→ {u.hipotese_categoria}</span>
                  )}
                  <span className={`ml-2 text-[9px] uppercase ${u.status === 'resolved' ? 'text-green-400' : 'text-amber-400'}`}>
                    {u.status || 'pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
