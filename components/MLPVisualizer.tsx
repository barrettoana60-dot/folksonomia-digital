'use client';

import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, BrainCircuit, AlertCircle, Save, Check } from 'lucide-react';

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

export default function MLPVisualizer({ initialWeights }: MLPVisualizerProps) {
  // Local state for weights so we can train/revert live
  const [weights1, setWeights1] = useState<number[][]>(initialWeights.weights1);
  const [bias1, setBias1] = useState<number[]>(initialWeights.bias1);
  const [weights2, setWeights2] = useState<number[]>(initialWeights.weights2);
  const [bias2, setBias2] = useState<number>(initialWeights.bias2);

  // Inputs
  const [inputs, setInputs] = useState<number[]>([0.8, 0.7, 2, 0.8, 1, 0, 0.8, 0.9, 2, 0]); // normalized inputs

  // Target for backprop
  const [target, setTarget] = useState<number>(1.0);
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [lastError, setLastError] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Feed-forward calculation
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const relu = (x: number) => Math.max(0, x);

  const runForward = (inputVec: number[]) => {
    const hidden: number[] = [];
    for (let i = 0; i < 8; i++) {
      let sum = bias1[i];
      for (let j = 0; j < 10; j++) {
        sum += inputVec[j] * weights1[i][j];
      }
      hidden.push(relu(sum));
    }

    let outSum = bias2;
    for (let i = 0; i < 8; i++) {
      outSum += hidden[i] * weights2[i];
    }
    const output = sigmoid(outSum);
    return { hidden, output };
  };

  const { hidden, output } = runForward(inputs);

  // Backpropagation Step (Client-side simulation)
  const handleTrainStep = () => {
    const w1 = weights1.map(row => [...row]);
    const b1 = [...bias1];
    const w2 = [...weights2];
    let b2 = bias2;

    // 1. Forward Pass
    const { hidden: hid, output: out } = runForward(inputs);
    const error = target - out;
    setLastError(error);

    // 2. Output delta (Sigmoid derivative)
    const outDelta = error * out * (1 - out);

    // 3. Hidden deltas (ReLU derivative: 1 if x > 0 else 0)
    const hidDeltas = Array(8).fill(0);
    for (let i = 0; i < 8; i++) {
      const deriv = hid[i] > 0 ? 1 : 0;
      hidDeltas[i] = outDelta * w2[i] * deriv;
    }

    // 4. Update output layer
    for (let i = 0; i < 8; i++) {
      w2[i] += learningRate * outDelta * hid[i];
    }
    b2 += learningRate * outDelta;

    // 5. Update hidden layer
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 10; j++) {
        w1[i][j] += learningRate * hidDeltas[i] * inputs[j];
      }
      b1[i] += learningRate * hidDeltas[i];
    }

    // Update states
    setWeights1(w1);
    setBias1(b1);
    setWeights2(w2);
    setBias2(b2);
    setIsSaved(false);
  };

  // Reset to initial database weights
  const handleReset = () => {
    setWeights1(initialWeights.weights1);
    setBias1(initialWeights.bias1);
    setWeights2(initialWeights.weights2);
    setBias2(initialWeights.bias2);
    setLastError(null);
    setIsSaved(true);
  };

  // Save current weights to database
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

  const updateInput = (idx: number, val: number) => {
    const nextInputs = [...inputs];
    nextInputs[idx] = val;
    setInputs(nextInputs);
  };

  return (
    <div className="glass-card p-6 md:p-8 space-y-8 border border-[#E85002]/20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-normal serif-title text-white flex items-center gap-2">
            <BrainCircuit className="text-[#E85002]" size={24} />
            Visualizador Interativo: Rede Neural Cognitiva (MLP)
          </h2>
          <p className="text-white/40 text-xs mt-1">
            Modelo local Multi-Layer Perceptron (10 entradas → 8 neurônios ocultos → 1 saída) rodando retropropagação em tempo real.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleReset} 
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-white/70 flex items-center gap-1.5 transition-all"
          >
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
        
        {/* Sliders para controle dos Fatores de Entrada */}
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

        {/* Desenho da Topologia da Rede Neural (SVG) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center bg-black/30 rounded-2xl p-4 border border-white/5 relative min-h-[350px]">
          <h3 className="absolute top-3 left-4 text-[9px] uppercase tracking-wider text-white/35 font-bold">
            Esquema Topológico & Sinapses
          </h3>
          
          <svg className="w-full h-full min-h-[300px]" viewBox="0 0 400 300">
            {/* Draw connection lines Input -> Hidden */}
            {inputs.map((val, inIdx) => {
              const x1 = 40;
              const y1 = 20 + inIdx * 28;
              return Array.from({ length: 8 }).map((_, hidIdx) => {
                const x2 = 200;
                const y2 = 30 + hidIdx * 35;
                const weight = weights1[hidIdx][inIdx];
                const opacity = Math.min(Math.max(Math.abs(weight) / 3, 0.05), 0.7);
                const color = weight >= 0 ? 'rgba(232, 80, 2, ' : 'rgba(239, 68, 68, '; // orange for positive, red for negative
                return (
                  <line 
                    key={`l-${inIdx}-${hidIdx}`} 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={`${color}${opacity})`} 
                    strokeWidth={0.8 + Math.abs(weight) * 0.4} 
                  />
                );
              });
            })}

            {/* Draw connection lines Hidden -> Output */}
            {Array.from({ length: 8 }).map((_, hidIdx) => {
              const x1 = 200;
              const y1 = 30 + hidIdx * 35;
              const x2 = 360;
              const y2 = 150;
              const weight = weights2[hidIdx];
              const opacity = Math.min(Math.max(Math.abs(weight) / 2, 0.05), 0.85);
              const color = weight >= 0 ? 'rgba(232, 80, 2, ' : 'rgba(239, 68, 68, ';
              return (
                <line 
                  key={`l-out-${hidIdx}`} 
                  x1={x1} y1={y1} x2={x2} y2={y2} 
                  stroke={`${color}${opacity})`} 
                  strokeWidth={1 + Math.abs(weight) * 0.8}
                />
              );
            })}

            {/* Draw Input Nodes */}
            {inputs.map((val, idx) => (
              <g key={`in-${idx}`}>
                <circle cx="40" cy={20 + idx * 28} r="6" fill="#1e1e1e" stroke={val > 0.5 ? '#E85002' : '#ffffff/20'} strokeWidth="1.5" />
                <title>{INPUT_LABELS[idx]}: {val}</title>
              </g>
            ))}

            {/* Draw Hidden Nodes */}
            {hidden.map((val, idx) => (
              <g key={`hid-${idx}`}>
                <circle cx="200" cy={30 + idx * 35} r="9" fill="#1e1e1e" stroke={val > 0 ? '#E85002' : '#ffffff/20'} strokeWidth="2" />
                <title>Neurônio Oculto {idx}: {val.toFixed(3)}</title>
              </g>
            ))}

            {/* Draw Output Node */}
            <circle cx="360" cy="150" r="14" fill="#E85002" stroke="#ffffff" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Estimativas e Treinador Online */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">
              Confiança Estimada
            </h3>
            <div className="text-4xl font-bold text-white my-3">
              {(output * 100).toFixed(1)}%
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#E85002]" style={{ width: `${output * 100}%` }} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-[10px] uppercase tracking-wider text-white/45 font-bold border-b border-white/5 pb-2">
              Treinador Online (Backpropagation)
            </h3>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 uppercase">Decisão Esperada</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setTarget(1.0)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    target === 1.0 
                      ? 'bg-orange-500/20 border-[#E85002] text-white' 
                      : 'border-white/10 text-white/40 hover:bg-white/5'
                  }`}
                >
                  Válida (1.0)
                </button>
                <button 
                  onClick={() => setTarget(0.0)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    target === 0.0 
                      ? 'bg-red-500/20 border-red-500 text-white' 
                      : 'border-white/10 text-white/40 hover:bg-white/5'
                  }`}
                >
                  Rejeitada (0.0)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] text-white/40 uppercase">Taxa de Aprendizado (η)</label>
                <span className="text-[10px] font-mono text-[#E85002]">{learningRate}</span>
              </div>
              <input 
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E85002]"
              />
            </div>

            <button 
              onClick={handleTrainStep}
              className="w-full bg-[#E85002] hover:bg-[#E85002]/85 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <Play size={12} fill="white" /> Rodar Retropropagação
            </button>

            {lastError !== null && (
              <div className="pt-2 text-center border-t border-white/5">
                <span className="text-[9px] uppercase tracking-wider text-white/35">Erro Residual (L1)</span>
                <div className="text-xs font-mono font-semibold text-[#E85002] mt-0.5">
                  {Math.abs(lastError).toFixed(4)}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
