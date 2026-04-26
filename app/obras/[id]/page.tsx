'use client';

import { useState, useEffect, use } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Tag, Volume2, CheckCircle, Search, AlertCircle, Play, Info } from 'lucide-react';

export default function ObraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    async function fetchObra() {
      const { data, error } = await supabaseClient
        .from('obras')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();
      
      if (!error && data) {
        setObra(data);
      }
      setLoading(false);
    }
    fetchObra();
  }, [resolvedParams.id]);

  const handleSpeech = () => {
    if (!obra) return;
    const synth = window.speechSynthesis;
    const text = `Audiodescrição da obra ${obra.titulo}, de ${obra.artista}. ${obra.audiodescricao || obra.descricao}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    synth.speak(utter);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#000814] text-white serif-title animate-pulse">Carregando Acervo...</div>;
  if (!obra) return <div className="min-h-screen flex items-center justify-center bg-[#000814] text-red-400 serif-title">Registro não encontrado.</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 md:px-24 bg-[#000814] text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Main Display */}
        <div className="glass-card p-10 md:p-16 space-y-10 relative overflow-hidden">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-normal serif-title text-white tracking-tight">{obra.titulo}</h1>
            <div className="flex items-center gap-4 text-white/50 text-sm uppercase tracking-widest font-bold">
              <span>{obra.artista}</span>
              <span className="w-1 h-1 bg-white/30 rounded-full" />
              <span>{obra.ano}</span>
              <span className="w-1 h-1 bg-white/30 rounded-full" />
              <span>{obra.tipo}</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="bg-black/30 p-8 rounded-xl border border-white/5 leading-relaxed text-lg text-white/80 font-light italic">
              "{obra.descricao}"
            </div>
          </div>

          {/* Audio Description Block - MANDATORY BELOW WORK INFO */}
          <div className="border-t border-white/10 pt-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-3">
                <Volume2 size={24} className="text-white/70" />
                Audiodescrição do Acervo
              </h2>
              <button 
                onClick={handleSpeech}
                className="liquid-button flex items-center gap-2 hover:scale-105"
              >
                <Play size={16} fill="currentColor" />
                Ouvir Descrição
              </button>
            </div>
            <div className="bg-white/5 p-6 rounded-lg border border-white/5 text-sm text-white/60 leading-relaxed">
              <p className="font-bold text-white/80 mb-2">Descrevendo a obra:</p>
              {obra.audiodescricao || `Esta obra de ${obra.artista}, intitulada "${obra.titulo}", é apresentada aqui em seu contexto institucional para análise semântica colaborativa.`}
            </div>
          </div>
        </div>

        {/* Tagging Interaction */}
        <div className="glass-card p-10 md:p-16 border-t-4 border-t-blue-500/20">
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-3xl font-normal serif-title flex items-center gap-3">
              <Info size={32} strokeWidth={1} className="text-blue-400" />
              Sua percepção importa
            </h2>
            <p className="text-white/50 leading-relaxed">
              Como você descreveria esta obra em uma palavra? Sua contribuição será processada por nosso motor de **Machine Learning** e integrada à teia semântica global.
            </p>

            <form onSubmit={handleSubmitTag} className="flex gap-4 flex-col sm:flex-row pt-4">
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Ex: Família, Liberdade, Conflito..."
                className="liquid-input flex-1 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={submitting}
              />
              <button 
                type="submit"
                disabled={submitting}
                className="liquid-button bg-white !text-black font-bold uppercase tracking-widest hover:bg-white/80"
              >
                {submitting ? 'Analisando...' : 'Registrar Tag'}
              </button>
            </form>

            {feedback && (
              <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p className="text-sm font-medium">{feedback.msg}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

