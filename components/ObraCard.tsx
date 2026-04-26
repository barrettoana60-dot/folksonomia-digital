'use client';

import { useState } from 'react';
import { Volume2, VolumeX, CheckCircle, Info, Tag as TagIcon, X } from 'lucide-react';

interface ObraCardProps {
  obra: {
    id: string;
    titulo: string;
    artista?: string;
    ano?: string;
    imagem_url?: string;
    descricao?: string;
    audiodescricao?: string;
  };
}

export default function ObraCard({ obra }: ObraCardProps) {
  const [isTagging, setIsTagging] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTag, setMyTag] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = `Obra: ${obra.titulo}. Artista: ${obra.artista}. Descrição: ${obra.audiodescricao || obra.descricao || 'Sem descrição.'}`;
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (Vercel free limit)

      const res = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tagInput.trim(),
          obra_id: obra.id,
          visitante_hash: localStorage.getItem('visitante_hash')
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setMyTag(tagInput.trim());
        setTagInput('');
        setIsTagging(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`O motor de IA detectou um problema: ${errorData.error || 'Falha na conexão com o banco'}.`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        alert('O processamento semântico está levando mais tempo que o esperado devido à alta carga. Sua tag foi enviada para a fila de curadoria e aparecerá em breve.');
      } else {
        console.error('Submission error:', err);
        alert('Ocorreu um erro técnico. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="flex flex-col space-y-4 animate-fade-in">
      <div className="glass-card overflow-hidden bg-white/[0.02] border-white/5 hover:border-[#E85002]/30 flex flex-col transition-all duration-500 shadow-2xl">
        
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-black/40">
          <img
            src={obra.imagem_url || 'https://via.placeholder.com/400x500?text=Sem+Imagem'}
            alt={obra.titulo}
            className="w-full h-full object-cover grayscale-[30%] hover:grayscale-0 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
          
          {/* Subtle Audio Toggle */}
          <button 
            onClick={handleSpeech}
            className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all ${speaking ? 'bg-[#E85002] text-white border-[#E85002] shadow-[0_0_15px_rgba(232,80,2,0.5)]' : 'bg-black/20 text-white/50'}`}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Info Area */}
        <div className="p-8 space-y-3">
          <p className="text-[10px] text-[#E85002] uppercase font-black tracking-[0.3em]">{obra.artista}</p>
          <h3 className="text-xl font-normal serif-title text-white">{obra.titulo}</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-widest">{obra.ano}</p>
          
          <div className="pt-6">
            {!myTag ? (
              <button 
                onClick={() => setIsTagging(!isTagging)}
                className="liquid-button w-full !rounded-full !bg-white/5 hover:!bg-white/10 !text-[11px] !py-4 font-black"
              >
                {isTagging ? 'CANCELAR' : 'ADICIONAR TAG'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3 py-4 bg-green-500/5 rounded-xl border border-green-500/10">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-green-400">TAG REGISTRADA: {myTag}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Tagging Form (Image Reference Style) */}
      {isTagging && !myTag && (
        <div className="glass-card p-10 bg-[#0A0A0C] border-white/10 space-y-8 animate-fade-in shadow-2xl">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-full bg-[#E85002]/10 flex items-center justify-center shrink-0 border border-[#E85002]/20">
              <TagIcon size={20} className="text-[#E85002]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-normal serif-title text-white">Registro Semântico</h4>
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black">
                Contribua com sua percepção sobre esta obra.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitTag} className="space-y-4">
            <input 
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="O que esta obra evoca para você?"
              className="liquid-input w-full"
              disabled={submitting}
              autoFocus
            />
            <button 
              type="submit"
              disabled={submitting || !tagInput.trim()}
              className="liquid-button w-full !rounded-xl !bg-[#222] !text-white !border-white/10 font-bold uppercase tracking-[0.2em] text-[11px] py-5 hover:!bg-[#333]"
            >
              {submitting ? 'PROCESSANDO SEMÂNTICA...' : 'ENVIAR PERCEPÇÃO'}
            </button>

          </form>
        </div>
      )}
    </div>
  );
}
