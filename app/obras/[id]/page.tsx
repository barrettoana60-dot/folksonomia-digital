'use client';

import { useState, useEffect, use } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { Tag, Play, CheckCircle, Search, AlertCircle } from 'lucide-react';

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

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      // 1. Submit tag to API to create the informational nucleus
      const response = await fetch('/api/ml/analisar-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          obra_id: resolvedParams.id, 
          tag: tagInput.trim(),
          contexto_usuario: 'web_visitor' // anonymized
        })
      });

      if (!response.ok) throw new Error('Erro na análise');
      
      setFeedback({ type: 'success', msg: 'Palavra-chave enviada e processada pelo motor semântico com sucesso!' });
      setTagInput('');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Ocorreu um erro ao enviar a palavra-chave. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-24 text-center text-white font-serif">Carregando obra...</div>;
  if (!obra) return <div className="p-24 text-center text-red-500 font-serif">Obra não encontrada.</div>;

  return (
    <div className="min-h-screen pt-24 px-6 md:px-24 bg-black text-white font-serif relative">
      <div className="max-w-4xl mx-auto backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{obra.titulo}</h1>
        <p className="text-xl text-gray-400 mb-8">{obra.artista} ({obra.ano}) - {obra.tipo}</p>
        
        <div className="mb-8 p-6 bg-black/40 rounded-xl border border-white/5 leading-relaxed text-lg">
          {obra.descricao}
        </div>

        <div className="border-t border-white/10 pt-8 mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Tag size={24} />
            Como você descreveria esta obra?
          </h2>
          <p className="text-gray-400 mb-6">
            Sua palavra-chave será analisada por nosso motor semântico e conectada a bases de dados internacionais para enriquecimento cultural.
          </p>

          <form onSubmit={handleSubmitTag} className="flex gap-4 flex-col md:flex-row">
            <input 
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Digite uma palavra-chave (ex: família, conflito, esperança)"
              className="flex-1 bg-black border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/60 transition-colors"
              disabled={submitting}
            />
            <button 
              type="submit"
              disabled={submitting}
              className="bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Analisando...' : 'Enviar'}
            </button>
          </form>

          {feedback && (
            <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
              {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {feedback.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
