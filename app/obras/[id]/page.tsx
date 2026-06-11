'use client';

import { useState, useEffect, use } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Volume2, VolumeX, CheckCircle, Info, ArrowLeft, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';

export default function ObraDetalhePage({ params }: { params: { id: string } }) {
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTag, setMyTag] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    async function fetchObra() {
      const { data, error } = await supabaseClient
        .from('obras')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (!error && data) {
        setObra(data);
      } else {
        // Fallback para teste se o banco estiver vazio
        if (params.id === 'picasso-test') {

          setObra({
            id: 'picasso-test',
            titulo: 'Guernica',
            artista: 'Pablo Picasso',
            ano: '1937',
            descricao: 'Um painel a óleo sobre tela, uma das obras mais conhecidas de Pablo Picasso.',
            audiodescricao: 'A pintura apresenta tons de cinza, preto e branco. Retrata o sofrimento de pessoas e animais em meio à violência e ao caos. À esquerda, uma mãe chora sobre o filho morto.',
            imagem_url: 'https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg'
          });
        }
      }
      setLoading(false);
    }
    fetchObra();
    
    // Recuperar tag enviada nesta sessão se houver
    const savedTag = localStorage.getItem(`tag_${params.id}`);
    if (savedTag) setMyTag(savedTag);

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [params.id]);

  const handleSpeech = () => {
    if (!obra || !window.speechSynthesis) return;
    
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = `Atenção para a audiodescrição da obra. Esta peça é de autoria de ${obra.artista || 'um artista desconhecido'}, intitulada ${obra.titulo}, datada de ${obra.ano || 'período indeterminado'}. A obra pode ser descrita da seguinte forma: ${obra.audiodescricao || obra.descricao || 'A descrição visual completa está sendo processada pela curadoria.'} Fim da descrição.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 0.9;
    utter.onend = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tagInput.trim(),
          obra_id: params.id,
          visitante_hash: localStorage.getItem('visitante_hash'),
          visitante_nome: localStorage.getItem('visitante_nome')
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMyTag(tagInput.trim());
        localStorage.setItem(`tag_${params.id}`, tagInput.trim());
      } else {
        setSubmitError(data.error || `Erro ${res.status}: Falha ao salvar tag.`);
        console.error('Tag submit error:', data);
      }
    } catch (err: any) {
      setSubmitError(`Erro de rede: ${err.message}`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/25 uppercase tracking-[0.2em] text-xs">Sincronizando Acervo...</div>;
  if (!obra) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500/50 uppercase tracking-widest text-xs">Registro não encontrado</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-6">
      <div className="max-w-[1100px] mx-auto space-y-12">
        
        <Link href="/obras" className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs uppercase tracking-wider">
          <ArrowLeft size={14} /> Retornar à Galeria
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          <div className="space-y-10">
            <div className="glass-card p-3 bg-white/[0.01] border-white/5 overflow-hidden shadow-2xl">
              <img 
                src={obra.imagem_url} 
                alt={obra.titulo} 
                className="w-full h-auto rounded-lg object-contain bg-black/40"
              />
            </div>
            
            <button 
              onClick={handleSpeech}
              className={`liquid-button w-full flex items-center justify-center gap-4 py-6 !rounded-2xl transition-all ${speaking ? '!bg-[#E85002] border-[#E85002] shadow-[0_0_30px_rgba(232,80,2,0.3)] !text-black' : ''}`}
            >
              {speaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
              <span className="font-semibold uppercase tracking-wider text-xs">
                {speaking ? 'Interromper Audiodescrição' : 'Ativar Audiodescrição'}
              </span>
            </button>
          </div>

          <div className="space-y-12 flex flex-col justify-center">
            <div className="space-y-6">
              <h1 className="text-2xl md:text-3xl font-light serif-title leading-tight tracking-tight">{obra.titulo}</h1>
              <div className="flex items-center gap-6 text-[#E85002] text-sm font-semibold uppercase tracking-[0.15em]">
                <span>{obra.artista}</span>
                <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                <span>{obra.ano}</span>
              </div>
              <p className="text-white/40 leading-relaxed text-sm font-light border-l-2 border-[#E85002]/20 pl-6">
                "{obra.descricao}"
              </p>
            </div>

            <div className="glass-card p-12 bg-white/[0.01] border-white/10 space-y-10">
              <div className="space-y-2">
                <h2 className="text-lg font-normal serif-title flex items-center gap-3">
                  <TagIcon size={20} className="text-[#E85002]" />
                  Registro Semântico
                </h2>
                <p className="text-white/30 text-xs uppercase tracking-wider leading-loose">
                  Contribua com sua percepção sobre esta obra.
                </p>
              </div>

              {!myTag ? (
                <form onSubmit={handleSubmitTag} className="space-y-4">
                  <input 
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="O que esta obra evoca para você?"
                    className="liquid-input w-full !bg-black/80"
                    disabled={submitting}
                    maxLength={40}
                  />
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="liquid-button w-full !rounded-xl !bg-[#E85002] !text-black font-bold uppercase tracking-[0.2em] text-[10px] hover:!bg-[#F16001]"
                  >
                    {submitting ? 'Processando...' : 'Enviar Percepção'}
                  </button>
                  {submitError && (
                    <p className="text-red-400 text-[10px] leading-relaxed bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {submitError}
                    </p>
                  )}
                </form>
              ) : (
                <div className="text-center p-8 space-y-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 mb-2">
                    <CheckCircle size={24} className="text-orange-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-white/30 text-xs uppercase tracking-wider">Sua Tag Registrada:</p>
                    <p className="text-2xl font-normal serif-title text-[#E85002]">{myTag}</p>
                  </div>
                  <p className="text-white/20 text-xs leading-relaxed italic">
                    Sua contribuição foi processada pelo motor semântico e agora faz parte da teia de conhecimento institucional.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
