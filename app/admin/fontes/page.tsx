'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Folder, ArrowLeft, Globe, Database, BookOpen, Clock, Activity, CheckCircle, Info } from 'lucide-react';

interface Fonte {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  licenca: string;
  url: string;
  ativo: boolean;
}

interface Pasta {
  id: string;
  nome: string;
  descricao: string;
  qtdDocs: string;
  qtdItens: string;
  gradient: string;
  fontesNomes: string[];
}

export default function FontesPage() {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/fontes')
      .then(r => r.json())
      .then(d => {
        setFontes(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const pastas: Pasta[] = [
    {
      id: 'arte_sacra',
      nome: 'Arte Sacra & Tradições',
      descricao: 'Acervos de arte sacra, popular e tradições regionais.',
      qtdDocs: '02 Repos.',
      qtdItens: '4.5k Itens',
      gradient: 'from-orange-600/60 to-red-600/70',
      fontesNomes: [
        'Museu de Arte Religiosa e Tradicional (MART)',
        'Museu Regional de Caeté'
      ]
    },
    {
      id: 'arqueologia',
      nome: 'Arqueologia & Etnografia',
      descricao: 'Acervos de arqueologia, cultura indígena e território.',
      qtdDocs: '02 Repos.',
      qtdItens: '3.1k Itens',
      gradient: 'from-blue-600/60 to-cyan-600/70',
      fontesNomes: [
        'Museu de Arqueologia de Itaipu',
        'Museu do Índio'
      ]
    },
    {
      id: 'memoria_sociedade',
      nome: 'Memória & Sociedade',
      descricao: 'Acervos de memórias, escravidão e histórias de vida.',
      qtdDocs: '02 Repos.',
      qtdItens: '5.9k Itens',
      gradient: 'from-purple-600/60 to-pink-600/70',
      fontesNomes: [
        'Museu da Abolição',
        'Museu da Pessoa'
      ]
    },
    {
      id: 'cultura_material',
      nome: 'Cultura Material & Folclore',
      descricao: 'Mineração, folclore e cultura popular do CNFCP.',
      qtdDocs: '02 Repos.',
      qtdItens: '8.2k Itens',
      gradient: 'from-green-600/60 to-emerald-600/70',
      fontesNomes: [
        'Museu do Diamante',
        'Museu de Folclore Edison Carneiro'
      ]
    }
  ];

  return (
    <main className="min-h-screen px-6 py-24 bg-[#000000] text-white">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-tight flex items-center gap-3">
              <Database className="text-[#E85002]" size={30} />
              Repositórios de Dados Abertos
            </h1>
            <p className="text-white/35 text-[11px] uppercase tracking-wider mt-2 font-semibold">
              Arquivos externos integrados ao motor semântico para enriquecimento
            </p>
          </div>
          <Link href="/admin" className="liquid-button liquid-glass-orange flex items-center gap-2">
            <ArrowLeft size={14} /> Voltar ao Painel
          </Link>
        </div>

        {/* Folders Layout (Google Drive Style following card Image 1) */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/40">Pastas de Repositórios</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pastas.map((pasta) => {
              const isActive = activeFolder === pasta.id;
              return (
                <div
                  key={pasta.id}
                  onClick={() => setActiveFolder(isActive ? null : pasta.id)}
                  className={`group cursor-pointer relative overflow-hidden rounded-[2rem] border transition-all duration-500 ${
                    isActive 
                      ? 'border-[#E85002]/60 bg-[#121214] shadow-[0_10px_30px_rgba(232,80,2,0.15)] scale-[1.02]' 
                      : 'border-white/5 bg-[#121214]/60 hover:bg-[#121214] hover:border-white/15 hover:shadow-2xl hover:scale-[1.01]'
                  }`}
                  style={{ minHeight: '260px' }}
                >
                  {/* Folder Tab Shape Background Gradient peeking */}
                  <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-tr ${pasta.gradient} transition-transform duration-500 group-hover:scale-105`} />
                  
                  {/* Folder Overlay Cover (giving the card folder tab look) */}
                  <div className="absolute top-[4.5rem] left-0 right-0 bottom-0 bg-[#121214] rounded-t-[1.75rem] border-t border-white/5 transition-all duration-300" />

                  {/* Overlapping tab shape on top left */}
                  <div className="absolute top-[3rem] left-5 bg-[#121214] px-4 py-1.5 rounded-t-xl text-[10px] font-mono tracking-wider font-semibold text-white/50 border-t border-x border-white/5">
                    {pasta.id.replace('_', ' ').toUpperCase()}
                  </div>

                  {/* Folder Card Metadata (Taskello style) */}
                  <div className="relative z-10 p-6 pt-24 flex flex-col justify-between h-full min-h-[260px]">
                    <div className="space-y-1.5 mt-2">
                      <h3 className="text-base font-semibold text-white group-hover:text-[#E85002] transition-colors">
                        {pasta.nome}
                      </h3>
                      <p className="text-white/40 text-xs leading-relaxed font-light line-clamp-2">
                        {pasta.descricao}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] font-mono">
                      <span className="text-white/60 font-semibold">{pasta.qtdDocs}</span>
                      <span className="text-[#00A3FF] font-semibold">{pasta.qtdItens}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Folder Details (Google Drive Gaveta / Explorer list) */}
        <div className="transition-all duration-500">
          {activeFolder ? (
            <div className="glass-card p-8 border border-white/10 bg-[#121214]/90 space-y-8 animate-in slide-in-from-top-6 duration-500">
              {pastas.filter(p => p.id === activeFolder).map(pasta => (
                <React.Fragment key={pasta.id}>
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#00A3FF]">Pasta Explorador</span>
                      <h3 className="text-xl font-normal serif-title text-white flex items-center gap-2.5 mt-1">
                        <Folder className="text-[#E85002]" size={22} />
                        {pasta.nome}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveFolder(null)}
                      className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                      Fechar Explorador
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {fontes
                        .filter(f => pasta.fontesNomes.some(name => f.nome.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(f.nome.toLowerCase()) || f.nome.includes("MART") && name.includes("MART") || f.nome.includes("Caeté") && name.includes("Caeté") || f.nome.includes("Itaipu") && name.includes("Itaipu") || f.nome.includes("Índio") && name.includes("Índio") || f.nome.includes("Abolição") && name.includes("Abolição") || f.nome.includes("Pessoa") && name.includes("Pessoa") || f.nome.includes("Diamante") && name.includes("Diamante") || f.nome.includes("Carneiro") && name.includes("Carneiro")))
                        .map(fonte => (
                          <div key={fonte.id} className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-base font-semibold text-white">{fonte.nome}</h4>
                                <span className="text-[10px] text-[#00A3FF] font-mono uppercase tracking-wider">{fonte.tipo}</span>
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                fonte.ativo 
                                  ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                              }`}>
                                {fonte.ativo ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>

                            <p className="text-xs text-white/50 leading-relaxed font-light">
                              {fonte.descricao}
                            </p>

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-[10px] text-white/30 font-mono">Licença: {fonte.licenca}</span>
                              <a 
                                href={fonte.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="liquid-button liquid-glass-blue !py-1.5 !px-3.5"
                              >
                                Acessar Repositório
                              </a>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 border border-white/5 bg-[#121214]/20 text-center text-white/35 text-xs py-12">
              Selecione uma pasta acima para expandir e explorar seus repositórios e conexões.
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="glass-card p-6 border border-white/5 bg-[#121214]/10 text-center">
          <p className="text-white/40 text-xs leading-relaxed max-w-2xl mx-auto flex items-center justify-center gap-2">
            <Info size={16} className="text-[#00A3FF]" />
            A cada contribuição, o motor semântico consulta automaticamente as fontes ativas 
            dentro dessas pastas para identificar similaridades cruzadas e consolidar as células informacionais.
          </p>
        </div>

      </div>
    </main>
  );
}
