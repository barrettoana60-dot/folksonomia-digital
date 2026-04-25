'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';

interface ObraCardProps {
  obra: {
    id: string;
    titulo: string;
    artista?: string;
    ano?: string;
    descricao?: string;
    imagem_url?: string;
    audio_descricao?: string;
  };
}

export default function ObraCard({ obra }: ObraCardProps) {
  const [tag, setTag] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [indicadores, setIndicadores] = useState<any>(null);

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim()) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tag.trim(), obra_id: obra.id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setIndicadores(data.indicadores);
        setTag('');
      } else {
        setError(data.error || 'Erro ao registrar contribuição.');
      }
    } catch {
      setError('Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleAudio = () => {
    if (!window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = obra.audio_descricao || `Obra: ${obra.titulo}. Artista: ${obra.artista || 'desconhecido'}. Ano: ${obra.ano || 'desconhecido'}. ${obra.descricao || ''}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="glass-card p-0 overflow-hidden flex flex-col">
      {/* Image */}
      {obra.imagem_url && (
        <div className="relative w-full h-52 overflow-hidden">
          <img
            src={obra.imagem_url}
            alt={`Obra: ${obra.titulo}`}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      )}

      {/* Info */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="text-xl font-bold text-white">{obra.titulo}</h3>
          {obra.artista && <p className="text-blue-200/80 text-sm mt-1">{obra.artista}{obra.ano ? ` — ${obra.ano}` : ''}</p>}
          {obra.descricao && <p className="text-white/60 text-sm mt-2 leading-relaxed line-clamp-2">{obra.descricao}</p>}
        </div>

        {/* Audiodescrição */}
        <button onClick={handleAudio} className="liquid-button w-full flex items-center justify-center gap-2 text-sm py-2">
          {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {speaking ? 'Parar audiodescrição' : 'Ouvir audiodescrição'}
        </button>

        {/* Tag Form */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Sua contribuição</p>
          {!success ? (
            <form onSubmit={handleTagSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={tag}
                onChange={e => setTag(e.target.value)}
                placeholder="O que esta obra evoca para você?"
                className="liquid-input w-full px-4 py-3 text-sm placeholder:text-white/40"
                maxLength={80}
              />
              {error && <p className="text-red-300/90 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="liquid-button w-full py-3 text-sm disabled:opacity-50"
              >
                {sending ? 'Registrando...' : 'Adicionar percepção'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-green-300 text-sm font-semibold">✓ Contribuição registrada</p>
              <p className="text-white/60 text-xs leading-relaxed">
                Essa percepção será analisada pela equipe e poderá ampliar as leituras da obra.
              </p>
              {indicadores && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-blue-300 text-lg font-bold">{indicadores.nivel_conexao}%</div>
                    <div className="text-white/40 text-xs">Nível de conexão</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-purple-300 text-lg font-bold">{indicadores.nivel_novidade}%</div>
                    <div className="text-white/40 text-xs">Novidade semântica</div>
                  </div>
                </div>
              )}
              <button onClick={() => setSuccess(false)} className="liquid-button text-xs px-4 py-2 mt-2">
                Adicionar outra
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
