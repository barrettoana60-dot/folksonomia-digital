'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, BrainCircuit, AlertCircle, Save, Check, GitMerge, Layers, Clock, Hash } from 'lucide-react';

interface MLPVisualizerProps {
  initialWeights: {
    weights1: number[][];
    bias1: number[];
    weights2: number[];
    bias2: number;
  };
}

const INPUT_LABELS = [
  'Probabilidade NER',
  'Similaridade Vetorial',
  'Qtd Fontes Externas',
  'Qualidade das Fontes',
  'Validações Curadores',
  'Rejeições Curadores',
  'Coerência com Obra',
  'Acurácia da Categoria',
  'Frequência em Memória',
  'É Termo Composto'
];

// Portuguese prepositions used in the co-adjacent swap engine
const PREPOSITIONS = ['de', 'do', 'da', 'em', 'no', 'na', 'para', 'com', 'por', 'sobre'];

function hashTerm(term: string): number {
  let hash = 0;
  for (let i = 0; i < term.length; i++) {
    const char = term.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCoAdjacentVector(term: string, siblings: string[]): number[] {
  const vec = new Array(10).fill(0);
  const h = hashTerm(term);
  vec[0] = (h % 100) / 100;

  for (let i = 0; i < Math.min(siblings.length, 9); i++) {
    const sh = hashTerm(siblings[i]);
    vec[i + 1] = ((h ^ sh) % 100) / 100;
  }
  return vec;
}

export default function MLPVisualizer({ initialWeights }: MLPVisualizerProps) {
  const [weights1, setWeights1] = useState<number[][]>(initialWeights.weights1);
  const [bias1, setBias1] = useState<number[]>(initialWeights.bias1);
  const [weights2, setWeights2] = useState<number[]>(initialWeights.weights2);
  const [bias2, setBias2] = useState<number>(initialWeights.bias2);

  const [inputs, setInputs] = useState<number[]>([0.8, 0.7, 2, 0.8, 1, 0, 0.8, 0.9, 2, 0]);
  const [target, setTarget] = useState<number>(1.0);
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [lastError, setLastError] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Co-Adjacent Engine state
  const [coTerm, setCoTerm] = useState<string>('barroco');
  const [coSiblings, setCoSiblings] = useState<string>('colonial, arte, brasil, museu, patrimônio');
  const [coVector, setCoVector] = useState<number[]>([]);
  const [swappedPreps, setSwappedPreps] = useState<string[]>([]);
  const [mutualPhase, setMutualPhase] = useState<number>(0); // 0=idle,1=running,2=done

  // Memory Replay state
  const [replayStatus, setReplayStatus] = useState<{trained: number; avgError: number; ts: string} | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const relu = (x: number) => Math.max(0, x);

  const runForward = useCallback((inputVec: number[]) => {
    const hidden: number[] = [];
    for (let i = 0; i < 8; i++) {
      let sum = bias1[i];
      for (let j = 0; j < 10; j++) {
        sum += inputVec[j] * (weights1[i]?.[j] ?? 0);
      }
      hidden.push(relu(sum));
    }
    let outSum = bias2;
    for (let i = 0; i < 8; i++) {
      outSum += hidden[i] * weights2[i];
    }
    return { hidden, output: sigmoid(outSum) };
  }, [weights1, bias1, weights2, bias2]);

  const { hidden, output } = runForward(inputs);

  const handleTrainStep = () => {
    const w1 = weights1.map(row => [...row]);
    const b1 = [...bias1];
    const w2 = [...weights2];
    let b2 = bias2;

    const { hidden: hid, output: out } = runForward(inputs);
    const error = target - out;
    setLastError(error);

    const outDelta = error * out * (1 - out);
    const hidDeltas = Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      const deriv = hid[i] > 0 ? 1 : 0;
      hidDeltas[i] = outDelta * w2[i] * deriv;
    }
    for (let i = 0; i < 8; i++) {
      w2[i] += learningRate * outDelta * hid[i];
    }
    b2 += learningRate * outDelta;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 10; j++) {
        w1[i][j] += learningRate * hidDeltas[i] * inputs[j];
      }
      b1[i] += learningRate * hidDeltas[i];
    }
    setWeights1(w1);
    setBias1(b1);
    setWeights2(w2);
    setBias2(b2);
    setIsSaved(false);
  };

  const handleReset = () => {
    setWeights1(initialWeights.weights1);
    setBias1(initialWeights.bias1);
    setWeights2(initialWeights.weights2);
    setBias2(initialWeights.bias2);
    setLastError(null);
    setIsSaved(true);
  };

  const handleSaveToDb = async () => {
    setSaveStatus('Salvando...');
    try {
      const res = await fetch('/api/ml/save-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights1, bias1, weights2, bias2 })
      });
      if (res.ok) {
        setIsSaved(true);
        setSaveStatus('Pesos salvos com sucesso!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('Falha ao salvar pesos no banco.');
      }
    } catch {
      setSaveStatus('Erro na requisição.');
    }
  };

  // Run Co-Adjacent mutual training simulation in browser
  const handleRunCoAdjacent = async () => {
    setMutualPhase(1);
    const siblings = coSiblings.split(',').map(s => s.trim()).filter(Boolean);

    // Simulate preposition swap
    const termWords = coTerm.split(' ');
    const swapped: string[] = [];
    for (const prep of PREPOSITIONS) {
      if (!termWords.includes(prep)) {
        swapped.push(`${coTerm} ${prep}`);
      }
    }
    setSwappedPreps(swapped.slice(0, 6));

    const vec = getCoAdjacentVector(coTerm, siblings);
    setCoVector(vec);

    // Actually use co-adjacent vector to run a client-side backprop step
    const w1 = weights1.map(row => [...row]);
    const b1 = [...bias1];
    const w2 = [...weights2];
    let b2 = bias2;

    const { hidden: hid, output: out } = runForward(vec);
    const mutalTarget = 0.85; // high confidence for trained term
    const error = mutalTarget - out;
    const outDelta = error * out * (1 - out);
    const hidDeltas = Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      const deriv = hid[i] > 0 ? 1 : 0;
      hidDeltas[i] = outDelta * w2[i] * deriv;
    }
    for (let i = 0; i < 8; i++) {
      w2[i] += learningRate * outDelta * hid[i];
    }
    b2 += learningRate * outDelta;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 10; j++) {
        w1[i][j] += learningRate * hidDeltas[i] * vec[j];
      }
      b1[i] += learningRate * hidDeltas[i];
    }

    setWeights1(w1);
    setBias1(b1);
    setWeights2(w2);
    setBias2(b2);
    setIsSaved(false);
    setLastError(Math.abs(error));

    setTimeout(() => setMutualPhase(2), 1200);
  };

  const updateInput = (idx: number, val: number) => {
    const nextInputs = [...inputs];
    nextInputs[idx] = val;
    setInputs(nextInputs);
  };

  // Load last replay log from Supabase via API
  useEffect(() => {
    fetch('/api/ml/replay-status')
      .then(r => r.json())
      .then(d => {
        if (d && d.trained !== undefined) setReplayStatus(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">

      {/* === Section 1: Classic MLP Visualizer === */}
      <div className="glass-card p-6 md:p-8 space-y-8 border border-[#E85002]/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-normal serif-title text-white flex items-center gap-2">
              <BrainCircuit className="text-[#E85002]" size={24} />
              Rede Neural Cognitiva (MLP)
            </h2>
            <p className="text-white/40 text-xs mt-1">
              10 entradas → 8 neurônios ocultos (ReLU) → 1 saída (Sigmoid) — Retropropagação em tempo real.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-white/70 flex items-center gap-1.5 transition-all">
              <RotateCcw size={14} /> Reverter
            </button>
            <button
              onClick={handleSaveToDb}
              disabled={isSaved}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSaved
                  ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#E85002] hover:bg-[#E85002]/80 text-white'
              }`}
            >
              {isSaved ? <Check size={14} /> : <Save size={14} />} {isSaved ? 'Sincronizado' : 'Persistir no Banco'}
            </button>
          </div>
        </div>

        {saveStatus && (
          <div className="text-xs text-center py-2 px-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg">
            {saveStatus}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sliders */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-wider text-white/35 font-bold border-b border-white/5 pb-2">
              Fatores de Entrada (Normalizados [0.0 - 1.0])
            </h3>
            <div className="grid grid-cols-1 gap-3.5">
              {INPUT_LABELS.map((label, idx) => {
                const isCheckbox = idx === 9;
                return (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-white/75 font-medium min-w-[150px]">{label}</span>
                    {isCheckbox ? (
                      <input
                        type="checkbox"
                        checked={inputs[idx] === 1.0}
                        onChange={(e) => updateInput(idx, e.target.checked ? 1.0 : 0.0)}
                        className="w-4 h-4 rounded border-[#E85002]/30 text-[#E85002] focus:ring-[#E85002]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-grow">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={inputs[idx]}
                          onChange={(e) => updateInput(idx, parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E85002]"
                        />
                        <span className="text-[11px] font-mono text-[#E85002] w-8 text-right">
                          {inputs[idx].toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SVG Topology */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center bg-black/30 rounded-2xl p-4 border border-white/5 relative min-h-[350px]">
            <h3 className="absolute top-3 left-4 text-[9px] uppercase tracking-wider text-white/35 font-bold">
              Esquema Topológico &amp; Sinapses
            </h3>
            <svg className="w-full h-full min-h-[300px]" viewBox="0 0 400 300">
              {inputs.map((val, inIdx) => {
                const x1 = 40; const y1 = 20 + inIdx * 28;
                return Array.from({ length: 8 }).map((_, hidIdx) => {
                  const x2 = 200; const y2 = 30 + hidIdx * 35;
                  const weight = weights1[hidIdx]?.[inIdx] ?? 0;
                  const opacity = Math.min(Math.max(Math.abs(weight) / 3, 0.05), 0.7);
                  const color = weight >= 0 ? 'rgba(232, 80, 2, ' : 'rgba(239, 68, 68, ';
                  return <line key={`l-${inIdx}-${hidIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}${opacity})`} strokeWidth={0.8 + Math.abs(weight) * 0.4} />;
                });
              })}
              {Array.from({ length: 8 }).map((_, hidIdx) => {
                const x1 = 200; const y1 = 30 + hidIdx * 35;
                const x2 = 360; const y2 = 150;
                const weight = weights2[hidIdx];
                const opacity = Math.min(Math.max(Math.abs(weight) / 2, 0.05), 0.85);
                const color = weight >= 0 ? 'rgba(232, 80, 2, ' : 'rgba(239, 68, 68, ';
                return <line key={`l-out-${hidIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${color}${opacity})`} strokeWidth={1 + Math.abs(weight) * 0.8} />;
              })}
              {inputs.map((val, idx) => (
                <g key={`in-${idx}`}>
                  <circle cx="40" cy={20 + idx * 28} r="6" fill="#1e1e1e" stroke={val > 0.5 ? '#E85002' : 'rgba(255,255,255,0.2)'} strokeWidth="1.5" />
                  <title>{INPUT_LABELS[idx]}: {val}</title>
                </g>
              ))}
              {hidden.map((val, idx) => (
                <g key={`hid-${idx}`}>
                  <circle cx="200" cy={30 + idx * 35} r="9" fill="#1e1e1e" stroke={val > 0 ? '#E85002' : 'rgba(255,255,255,0.2)'} strokeWidth="2" />
                  <title>Neurônio Oculto {idx}: {val.toFixed(3)}</title>
                </g>
              ))}
              <circle cx="360" cy="150" r="14" fill="#E85002" stroke="#ffffff" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Trainer */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <h3 className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Confiança Estimada</h3>
              <div className="text-4xl font-bold text-white my-3">{(output * 100).toFixed(1)}%</div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#E85002] transition-all duration-500" style={{ width: `${output * 100}%` }} />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-[10px] uppercase tracking-wider text-white/45 font-bold border-b border-white/5 pb-2">
                Treinador Online (Backpropagation)
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase">Decisão Esperada</label>
                <div className="flex gap-2">
                  <button onClick={() => setTarget(1.0)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${target === 1.0 ? 'bg-orange-500/20 border-[#E85002] text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>Válida (1.0)</button>
                  <button onClick={() => setTarget(0.0)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${target === 0.0 ? 'bg-red-500/20 border-red-500 text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>Rejeitada (0.0)</button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] text-white/40 uppercase">Taxa de Aprendizado (η)</label>
                  <span className="text-[10px] font-mono text-[#E85002]">{learningRate}</span>
                </div>
                <input type="range" min="0.01" max="0.5" step="0.01" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E85002]" />
              </div>
              <button onClick={handleTrainStep} className="w-full bg-[#E85002] hover:bg-[#E85002]/85 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md">
                <Play size={12} fill="white" /> Rodar Retropropagação
              </button>
              {lastError !== null && (
                <div className="pt-2 text-center border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/35">Erro Residual (L1)</span>
                  <div className="text-xs font-mono font-semibold text-[#E85002] mt-0.5">{Math.abs(lastError).toFixed(4)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === Section 2: Co-Adjacent Vector Engine === */}
      <div className="glass-card p-6 md:p-8 space-y-6 border border-purple-500/20">
        <div>
          <h2 className="text-xl font-normal serif-title text-white flex items-center gap-2">
            <GitMerge className="text-purple-400" size={22} />
            Motor Semântico Co-Adjacente (Aprendizado Mútuo)
          </h2>
          <p className="text-white/40 text-xs mt-1">
            Gera vetores de hash co-adjacente entre termos irmãos, aplica troca de preposições e executa retropropagação mútua — consolidando correlações semânticas na rede.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Term Inputs */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Termo Principal</label>
              <input
                type="text"
                value={coTerm}
                onChange={e => setCoTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/60 transition-all"
                placeholder="Ex: barroco"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tags Irmãs (separadas por vírgula)</label>
              <textarea
                value={coSiblings}
                onChange={e => setCoSiblings(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400/60 transition-all resize-none"
                placeholder="Ex: colonial, arte, brasil, museu"
              />
            </div>
            <button
              onClick={handleRunCoAdjacent}
              disabled={mutualPhase === 1}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mutualPhase === 1
                  ? 'bg-purple-900/40 text-purple-300/50 cursor-wait'
                  : 'bg-purple-700/70 hover:bg-purple-600/80 text-white shadow-md'
              }`}
            >
              <Hash size={13} />
              {mutualPhase === 1 ? 'Processando Vetores...' : mutualPhase === 2 ? '✓ Treinamento Mútuo Concluído' : 'Executar Treinamento Co-Adjacente'}
            </button>
          </div>

          {/* Output */}
          <div className="space-y-4">
            {coVector.length > 0 && (
              <div className="bg-black/30 rounded-xl p-4 border border-purple-500/15 space-y-3">
                <h4 className="text-[10px] uppercase tracking-wider text-purple-300/60 font-bold flex items-center gap-1.5">
                  <Layers size={11} /> Vetor Co-Adjacente Gerado (Hash XOR)
                </h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {coVector.map((v, i) => (
                    <div key={i} className="text-center">
                      <div className="h-10 bg-purple-900/30 rounded-lg relative overflow-hidden border border-purple-500/10">
                        <div
                          className="absolute bottom-0 w-full bg-purple-500/60 transition-all duration-700"
                          style={{ height: `${v * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-purple-200">{v.toFixed(2)}</span>
                      </div>
                      <span className="text-[8px] text-white/30 mt-0.5 block">v{i}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {swappedPreps.length > 0 && (
              <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-white/35 font-bold">Troca de Preposições Geradas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {swappedPreps.map((p, i) => (
                    <span key={i} className="px-2 py-1 bg-orange-500/10 border border-[#E85002]/20 rounded-md text-[10px] text-orange-300">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {mutualPhase === 2 && (
              <div className="bg-green-900/20 border border-green-500/20 rounded-xl p-3 text-xs text-green-300 flex items-center gap-2">
                <Check size={14} />
                Pesos da rede atualizados com vetor co-adjacente. Erro residual: {lastError !== null ? Math.abs(lastError).toFixed(4) : '—'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === Section 3: Autonomous Memory Replay (4 AM REM Sleep) === */}
      <div className="glass-card p-6 md:p-8 space-y-5 border border-amber-500/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-normal serif-title text-white flex items-center gap-2">
              <Clock className="text-amber-400" size={22} />
              Memória Muscular Autônoma (Sono REM — 4h Brasília)
            </h2>
            <p className="text-white/40 text-xs mt-1">
              Cron diário (07:00 UTC = 04:00 Brasília): recalibra a rede com toda a memória semântica validada. Aprendizado contínuo sem intervenção humana.
            </p>
          </div>
          <div className="flex-shrink-0 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Cron: 0 7 * * *
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Fase 1: Fila de Treinamento</div>
            <div className="text-2xl font-bold text-white">Tags Pendentes</div>
            <div className="text-xs text-white/40 mt-1">Co-adjacente + Retropropagação</div>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Fase 2: Fine-Tuning NER</div>
            <div className="text-2xl font-bold text-white">ModernBERT</div>
            <div className="text-xs text-white/40 mt-1">FastAPI local + corpus validado</div>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-amber-500/10 border text-center">
            <div className="text-[10px] uppercase tracking-wider text-amber-300/50 mb-2">Fase 3: Replay de Memória</div>
            <div className="text-2xl font-bold text-amber-200">
              {replayStatus ? replayStatus.trained : '—'}
            </div>
            <div className="text-xs text-amber-200/40 mt-1">
              {replayStatus ? `Erro médio: ${(replayStatus.avgError * 100).toFixed(2)}%` : 'Sem dados do último ciclo'}
            </div>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
          <h4 className="text-[10px] uppercase tracking-wider text-white/35 font-bold">Fluxo do Ciclo Noturno</h4>
          <div className="flex flex-col md:flex-row items-center gap-2 text-[10px] text-white/50 font-mono overflow-x-auto">
            {[
              'CRON (04h BRT)',
              'Buscar Fila',
              'Correlação Vetorial',
              'Treino Co-Adjacente',
              'Fine-Tuning NER',
              'REPLAY SEMÂNTICO',
              'Persistir Pesos'
            ].map((step, i, arr) => (
              <React.Fragment key={step}>
                <div className={`px-3 py-1.5 rounded-lg border flex-shrink-0 ${
                  step === 'REPLAY SEMÂNTICO'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : step === 'CRON (04h BRT)'
                    ? 'bg-[#E85002]/10 border-[#E85002]/30 text-orange-300'
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}>{step}</div>
                {i < arr.length - 1 && <span className="text-white/20 flex-shrink-0">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {replayStatus && (
          <div className="text-xs text-white/40 text-right">
            Último ciclo: {replayStatus.ts ? new Date(replayStatus.ts).toLocaleString('pt-BR') : 'desconhecido'}
          </div>
        )}
      </div>

    </div>
  );
}
