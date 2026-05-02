'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, ArrowRightLeft, 
  PlusCircle, Database 
} from 'lucide-react';
import Link from 'next/link';

export default function ValidacaoPage() {
  const [pendingTags, setPendingTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/validacao/pendentes');
      const json = await res.json();
      if (json.success) {
        setPendingTags(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'validar' | 'rejeitar') => {
    try {
      const res = await fetch('/api/admin/validacao/acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, justificativa: '' })
      });
      const json = await res.json();
      if (json.success) {
        setPendingTags(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-10 pt-24">
      
      <div className="max-w-[95%] mx-auto mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-normal serif-title tracking-tight">Painel de Validação</h1>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2">Ajuste de Pesos e Verificação Humana</p>
        </div>
        <Link href="/admin" className="liquid-button text-[10px] py-2 px-6">
          Voltar ao Início
        </Link>
      </div>

      <div className="max-w-[95%] mx-auto space-y-8">
        
        {loading ? (
          <div className="text-center py-20 text-white/50 text-sm tracking-widest uppercase">
            Carregando fila de curadoria...
          </div>
        ) : pendingTags.length === 0 ? (
          <div className="text-center py-20 text-white/50 text-sm tracking-widest uppercase">
            Nenhum termo pendente de validação.
          </div>
        ) : (
          pendingTags.map(item => (
            <div key={item.id} className="glass-card p-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* Coluna 1: Dados Originais */}
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Tag Extraída</label>
                    <p className="text-3xl font-normal serif-title text-[#F16001]">{item.conteudo_original}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Forma Normalizada</label>
                    <p className="text-xl font-light text-white/80">{item.conteudo_normalizado || '---'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Obra Relacionada</label>
                    <p className="text-sm font-medium text-blue-300">
                      {item.obra?.titulo || 'Desconhecida'}
                    </p>
                  </div>
                </div>

                {/* Coluna 2: Indicadores Semânticos */}
                <div className="space-y-8">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">Indicadores do Motor ML</label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Confiança</p>
                      <p className="text-2xl font-light text-green-400">{((item.confianca ?? 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Novidade</p>
                      <p className="text-2xl font-light text-blue-400">{((item.novidade ?? 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Tensão</p>
                      <p className="text-2xl font-light text-yellow-400">{((item.tensao ?? 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Ressonância</p>
                      <p className="text-2xl font-light text-purple-400">{((item.ressonancia ?? 0) * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                {/* Coluna 3: Ações e Proveniência */}
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-3">Fontes Conectadas</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px]">
                        <Database size={10} /> {item.origem || 'ModernBERT'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Ação Curatorial</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleAction(item.id, 'validar')}
                        className="liquid-button !bg-green-500/20 !border-green-500/40 hover:!bg-green-500/40 text-[10px]"
                      >
                        <CheckCircle size={14} className="mr-2" /> Validar
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, 'rejeitar')}
                        className="liquid-button !bg-red-500/20 !border-red-500/40 hover:!bg-red-500/40 text-[10px]"
                      >
                        <XCircle size={14} className="mr-2" /> Rejeitar
                      </button>
                    </div>
                  </div>

                  <div>
                    <textarea 
                      placeholder="Observações da validação institucional..."
                      className="liquid-input w-full bg-white/5 border-white/10 rounded-xl px-4 py-3 text-xs placeholder:text-white/20 min-h-[80px]"
                    />
                  </div>
                </div>

              </div>
            </div>
          ))
        )}

        <div className="text-center py-12">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/20">Fim da Trilha de Validação</p>
        </div>

      </div>
    </main>
  );
}
