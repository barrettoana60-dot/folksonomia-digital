'use client';

import { useState, useEffect, use } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Volume2, VolumeX, CheckCircle, AlertCircle, Info, ArrowLeft, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';

export default function ObraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userTag, setUserTag] = useState<string | null>(null);
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
    
    // Recuperar tag criada localmente nesta sessão
    const savedTag = localStorage.getItem(`tag_obra_${resolvedParams.id}`);
    if (savedTag) setUserTag(savedTag);

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

    const text = `Esta obra é de ${obra.artista || 'artista desconhecido'}, chamada ${obra.titulo}. Foi produzida no ano de ${obra.ano || 'desconhecido'}. Descrição curatorial: ${obra.audiodescricao || obra.descricao || 'Sem descrição adicional disponível.'}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 0.9;
    utter.onend = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = tagInput.trim();
    if (!cleanTag || submitting) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: cleanTag,
          obra_id: resolvedParams.id,
          visitante_hash: localStorage.getItem('visitante_hash'),
          visitante_nome: localStorage.getItem('visitante_nome')
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', msg: 'Sua percepção foi integrada ao sistema.' });
        setUserTag(cleanTag);
        localStorage.setItem(`tag_obra_${resolvedParams.id}`, cleanTag);
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase tracking-[0.4em] text-[10px]">Processando...</div>;
  if (!obra) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500/50 uppercase tracking-[0.2em] text-[10px]">Registro não encontrado</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        
        <Link href="/obras" className="inline-flex items-center gap-2 text-white/40 hover:text-[#E85002] transition-colors text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Voltar ao Acervo
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Lado Esquerdo: Obra e Áudio */}
          <div className="space-y-8">
            <div className="glass-card p-4 bg-white/[0.01] border-white/5 shadow-2xl">
              <img 
                src={obra.imagem_url} 
                alt={obra.titulo} 
                className="w-full h-auto rounded-xl object-contain"
              />
            </div>
            
            <button 
              onClick={handleSpeech}
              className={`liquid-button w-full flex items-center justify-center gap-3 py-5 !rounded-2xl transition-all ${speaking ? '!bg-[#E85002] border-[#E85002]' : ''}`}
            >
              {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
              {speaking ? 'Interromper Descrição' : 'Ouvir Audiodescrição Descritiva'}
            </button>
          </div>

          {/* Lado Direito: Info e Percepção */}
          <div className="space-y-10">
            <div className="space-y-4">
              <h1 className="text-5xl font-normal serif-title leading-tight text-white">{obra.titulo}</h1>
              <div className="flex items-center gap-6 text-[#E85002] text-[11px] font-bold uppercase tracking-[0.2em]">
                <span>{obra.artista}</span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span>{obra.ano}</span>
              </div>
              <div className="h-[1px] w-12 bg-white/10 my-8" />
              <p className="text-white/40 leading-relaxed text-sm font-light italic">
                "{obra.descricao}"
              </p>
            </div>

            {/* Sistema de Tags */}
            <div className="glass-card p-10 bg-white/[0.01] border-white/5 space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#E85002]/10 flex items-center justify-center shrink-0">
                  <TagIcon size={20} className="text-[#E85002]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-normal serif-title">Percepção do Visitante</h2>
                  <p className="text-white/20 text-[11px] leading-relaxed uppercase tracking-widest">
                    Registre o que esta obra evoca em você.
                  </p>
                </div>
              </div>

              {userTag ? (
                <div className="space-y-6">
                  <div className="p-6 bg-[#E85002]/10 border border-[#E85002]/20 rounded-2xl text-center">
                    <p className="text-[10px] text-[#E85002] uppercase font-bold tracking-[0.2em] mb-2">Sua Contribuição Atual</p>
                    <p className="text-2xl font-normal serif-title text-white">"{userTag}"</p>
                  </div>
                  <p className="text-white/20 text-[10px] text-center italic">
                    Sua tag está sendo processada para integrar a teia de conhecimento institucional.
                  </p>
                  <button onClick={() => setUserTag(null)} className="liquid-button w-full !text-[10px] py-3">
                    Adicionar outra percepção
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTag} className="space-y-4">
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ex: Liberdade, Silêncio, Saudade..."
                    className="liquid-input w-full !bg-black/40"
                    disabled={submitting}
                    maxLength={40}
                  />
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="liquid-button w-full !rounded-xl !bg-[#E85002] !text-white font-bold hover:!shadow-[0_0_20px_rgba(232,80,2,0.4)]"
                  >
                    {submitting ? 'Analisando...' : 'Registrar Percepção'}
                  </button>
                </form>
              )}

              {feedback && !userTag && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-[11px] font-medium border border-current/20`}>
                  {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {feedback.msg}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-white/10 text-[9px] uppercase tracking-[0.3em] font-medium justify-center">
              <Info size={12} />
              Processamento Semântico Ativo
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
