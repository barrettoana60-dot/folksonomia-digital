'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Tag as TagIcon } from 'lucide-react';

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
  const [tagsSentCount, setTagsSentCount] = useState(0);
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
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        setTagsSentCount(prev => prev + 1);
        setTagInput('');
        setIsTagging(false);
        alert('Sua percepção foi integrada ao núcleo semântico com sucesso!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Erro: ${errorData.error || 'Falha na conexão com o banco'}.`);
      }
    } catch (err: unknown) {
      console.error('Submission error:', err);
      alert('Erro técnico ao enviar a tag.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 animate-fade-in">
      {/* Card da obra */}
      <div
        className="glass-card overflow-hidden flex flex-col transition-all duration-400 organic-hover"
        style={{ borderRadius: '1.25rem' }}
      >
        {/* Imagem */}
        <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden"
          style={{ background: 'rgba(26,26,26,0.06)' }}>
          <img
            src={obra.imagem_url || 'https://via.placeholder.com/400x500?text=Sem+Imagem'}
            alt={obra.titulo}
            className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
          />
          {/* Gradiente suave no bottom */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(242,237,228,0.85) 0%, transparent 55%)' }}
          />

          {/* Botão audio */}
          <button
            onClick={handleSpeech}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center liquid-button !p-0 !rounded-full transition-all ${
              speaking ? 'shadow-lg' : ''
            }`}
            style={speaking ? {
              background: '#E8490A',
              borderColor: '#C03808',
              color: '#fff',
            } : {}}
            aria-label={speaking ? 'Parar áudio' : 'Ouvir descrição'}
          >
            {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Info */}
        <div className="p-5 md:p-6 space-y-1.5">
          <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: '#E8490A' }}>
            {obra.artista}
          </p>
          <h3 className="text-base md:text-lg font-normal serif-title text-[#1A1A1A]">
            {obra.titulo}
          </h3>
          <p className="text-[10px] md:text-[11px] text-[#1A1A1A]/40 tracking-wider">
            {obra.ano}
          </p>

          <div className="pt-4">
            <button
              onClick={() => setIsTagging(!isTagging)}
              className="liquid-button w-full !rounded-full !text-[11px] !py-3 !font-semibold"
            >
              {isTagging ? 'CANCELAR' : 'ADICIONAR TAG'}
            </button>

            {tagsSentCount > 0 && (
              <p className="text-center text-[9px] uppercase tracking-wider mt-3 font-semibold"
                style={{ color: '#E8490A' }}>
                {tagsSentCount === 1
                  ? '1 Percepção Registrada'
                  : `${tagsSentCount} Percepções Registradas`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formulário de tag inline */}
      {isTagging && (
        <div className="glass-card p-6 md:p-8 space-y-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(232,73,10,0.10)',
                border: '1px solid rgba(232,73,10,0.22)',
              }}>
              <TagIcon size={17} style={{ color: '#E8490A' }} />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-base font-normal serif-title text-[#1A1A1A]">
                Registro Semântico
              </h4>
              <p className="text-[10px] text-[#1A1A1A]/40 uppercase tracking-[0.12em] font-semibold">
                Sua percepção sobre a obra.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitTag} className="space-y-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="O que esta obra evoca?"
              className="liquid-input w-full !py-4"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !tagInput.trim()}
              className="liquid-button w-full !rounded-xl !text-[11px] !py-4 !font-semibold !tracking-[0.18em] disabled:opacity-50"
              style={{
                background: '#E8490A',
                borderColor: '#C03808',
                color: '#fff',
              }}
            >
              {submitting ? 'PROCESSANDO...' : 'ENVIAR PERCEPÇÃO'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
