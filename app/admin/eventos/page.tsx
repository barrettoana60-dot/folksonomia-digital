'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Search, RotateCcw, AlertTriangle, CheckCircle, Database } from 'lucide-react';

const eventColors: Record<string, string> = {
  tag_criada: 'bg-blue-500/10 border border-blue-500/20 text-blue-300',
  validacao_validado: 'bg-green-500/10 border border-green-500/20 text-green-300',
  validacao_publicado: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300',
  validacao_rejeitado: 'bg-red-500/10 border border-red-500/20 text-red-300',
  validacao_revisado: 'bg-purple-500/10 border border-purple-500/20 text-purple-300',
  pipeline_semantico_completo: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300',
  recalculo_semantico: 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
};

interface Evento {
  id: string;
  tipo_evento: string;
  resumo: string;
  criado_em: string;
  hash_evento: string;
  entidade_tipo: string;
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEventos = () => {
    setLoading(true);
    fetch('/api/admin/eventos')
      .then(r => r.json())
      .then(d => {
        setEventos(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadEventos();
  }, []);

  const filteredEventos = useMemo(() => {
    if (!searchQuery.trim()) return eventos;
    const query = searchQuery.toLowerCase().trim();
    return eventos.filter(ev => 
      (ev.resumo && ev.resumo.toLowerCase().includes(query)) ||
      (ev.tipo_evento && ev.tipo_evento.toLowerCase().includes(query)) ||
      (ev.entidade_tipo && ev.entidade_tipo.toLowerCase().includes(query)) ||
      (ev.hash_evento && ev.hash_evento.toLowerCase().includes(query))
    );
  }, [eventos, searchQuery]);

  return (
    <main className="min-h-screen px-6 py-24 bg-[#000000] text-white">
      <div className="max-w-[1200px] mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-tight flex items-center gap-3">
              <Clock className="text-[#E85002]" size={30} />
              Trilha de Proveniência (Timeline)
            </h1>
            <p className="text-white/35 text-[11px] uppercase tracking-wider mt-2 font-semibold">
              Registro auditável e histórico de transformações do sistema
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input inline in buttons area */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 w-full sm:w-64 focus-within:border-[#E85002]/60 focus-within:bg-[#121214] transition-all">
              <Search size={14} className="text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar na timeline..."
                className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-white/30 hover:text-white"
                >
                  Limpar
                </button>
              )}
            </div>

            <button 
              onClick={loadEventos}
              className="liquid-button liquid-glass-blue !py-2 !px-4"
              title="Recarregar eventos"
            >
              <RotateCcw size={12} />
            </button>

            <Link href="/admin" className="liquid-button liquid-glass-orange !py-2 !px-5 flex items-center gap-1.5">
              <ArrowLeft size={12} /> Voltar
            </Link>
          </div>
        </div>

        {/* Loading / Results */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEventos.length === 0 ? (
          <div className="glass-card p-16 text-center border-white/5 bg-[#121214]/20">
            <AlertTriangle className="mx-auto text-white/20 mb-4" size={40} />
            <p className="text-white/40 text-sm">Nenhum evento corresponde aos critérios de pesquisa.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-4">
              {filteredEventos.map((ev, idx) => {
                const colorClass = eventColors[ev.tipo_evento] || 'bg-white/5 border border-white/10 text-white/60';
                return (
                  <div key={ev.id} className="relative pl-16 md:pl-20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Circle timeline pin */}
                    <div className="absolute left-6 top-5 w-4 h-4 rounded-full bg-[#121214] border-2 border-[#E85002] shadow-[0_0_10px_rgba(232,80,2,0.4)]" />

                    <div className="glass-card p-5 border border-white/5 bg-[#121214]/40 hover:bg-[#121214]/80 hover:border-white/10 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-grow">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
                              {ev.tipo_evento.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                              {new Date(ev.criado_em).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-white/85 text-xs md:text-sm font-light leading-relaxed">
                            {ev.resumo || 'Nenhuma descrição adicional.'}
                          </p>
                        </div>

                        <div className="text-left md:text-right flex-shrink-0 space-y-1">
                          <p className="text-[9px] font-mono text-white/30 select-all" title="Clique para selecionar">
                            {ev.hash_evento ? `HASH: ${ev.hash_evento.substring(0, 16)}…` : `EVT-${String(idx + 1).padStart(4, '0')}`}
                          </p>
                          {ev.entidade_tipo && (
                            <span className="text-[9px] text-[#00A3FF] uppercase tracking-wider font-semibold">
                              Entidade: {ev.entidade_tipo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
