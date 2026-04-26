'use client';

import { useState, useEffect, use } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Volume2, VolumeX, CheckCircle, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ObraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [speaking, setSpeaking] = useState(false);

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
    
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [resolvedParams.id]);

  const handleSpeech = () => {
    if (!obra || !window.speechSynthesis) return;
    
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = `Esta obra é de ${obra.artista || 'artista desconhecido'}, chamada ${obra.titulo}. Foi produzida no ano de ${obra.ano || 'desconhecido'}. Descrição: ${obra.audiodescricao || obra.descricao || 'Sem descrição adicional disponível.'}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.onend = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || submitting) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tagInput.trim(),
          obra_id: resolvedParams.id,
          visitante_hash: localStorage.getItem('visitante_hash'),
          visitante_nome: localStorage.getItem('visitante_nome')
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Sua percepção foi integrada ao sistema.' });
        setTagInput('');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Erro ao registrar. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase tracking-widest text-xs">Carregando...</div>;
  if (!obra) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500/50 uppercase tracking-widest text-xs">Não encontrado</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto space-y-12">
        
        <Link href="/obras" className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors text-[10px] uppercase tracking-widest mb-4">
          <ArrowLeft size={14} /> Voltar para Galeria
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Obra Visual */}
          <div className="space-y-8">
            <div className="glass-card p-4 bg-white/[0.02] border-white/5 overflow-hidden">
              <img 
                src={obra.imagem_url} 
                alt={obra.titulo} 
                className="w-full h-auto rounded-xl object-contain shadow-2xl"
              />
            </div>
            
            <button 
              onClick={handleSpeech}
              className={`liquid-button w-full flex items-center justify-center gap-3 py-5 !rounded-xl transition-all ${speaking ? 'bg-[#E85002] border-[#E85002]' : ''}`}
            >
              {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
              {speaking ? 'Parar Audiodescrição' : 'Ouvir Audiodescrição'}
            </button>
          </div>

          {/* Obra Info & Tagging */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h1 className="text-5xl font-normal serif-title leading-tight">{obra.titulo}</h1>
              <div className="flex items-center gap-6 text-[#E85002] text-xs font-bold uppercase tracking-[0.2em]">
                <span>{obra.artista}</span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span>{obra.ano}</span>
              </div>
              <div className="h-[1px] w-20 bg-white/10 my-8" />
              <p className="text-white/50 leading-relaxed text-sm font-light italic">
                "{obra.descricao}"
              </p>
            </div>

            <div className="glass-card p-10 bg-white/[0.01] border-white/5 space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#E85002]/10 flex items-center justify-center shrink-0">
                  <Info size={20} className="text-[#E85002]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-normal serif-title">Sua Percepção</h2>
                  <p className="text-white/30 text-xs leading-relaxed">
                    O que esta obra evoca em você? Sua tag será analisada pelo motor semântico.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitTag} className="space-y-4">
                <input 
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Ex: Família, Liberdade, Solidão..."
                  className="liquid-input w-full !bg-black/60"
                  disabled={submitting}
                />
                <button 
                  type="submit"
                  disabled={submitting}
                  className="liquid-button w-full !rounded-lg !bg-white !text-black font-bold hover:!bg-white/90"
                >
                  {submitting ? 'Analisando...' : 'Registrar Percepção'}
                </button>
              </form>

              {feedback && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-[11px] font-medium`}>
                  {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {feedback.msg}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
