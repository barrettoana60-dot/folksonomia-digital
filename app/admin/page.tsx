'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Tag, Clock, CheckCircle2, 
  Settings, Link as LinkIcon, ShieldCheck, Database,
  FileText, Globe, ListFilter
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('visao');

  const stats = [
    { label: 'Total de Obras', value: '5', icon: Database, color: '#E85002' },
    { label: 'Participantes', value: '1', icon: Users, color: '#E85002' },
    { label: 'Total de Tags', value: '0', icon: Tag, color: '#E85002' },
    { label: 'Tags em Análise', value: '0', icon: Clock, color: '#C10801' },
    { label: 'Tags Validadas', value: '0', icon: CheckCircle2, color: '#E85002' },
    { label: 'Ontologias', value: '12', icon: Settings, color: '#E85002' },
    { label: 'Fontes Externas', value: '6', icon: Globe, color: '#E85002' },
    { label: 'Eventos Registrados', value: '0', icon: ShieldCheck, color: '#E85002' },
  ];

  const tabs = [
    { id: 'visao', label: 'Visão Geral' },
    { id: 'obras', label: 'Gestão de Obras' },
    { id: 'tags', label: 'Gestão de Tags' },
    { id: 'validacao', label: 'Sistema de Validação' },
    { id: 'ontologias', label: 'Ontologias' },
    { id: 'interoperabilidade', label: 'Interoperabilidade' },
    { id: 'trilha', label: 'Trilha de Auditoria' },
    { id: 'relatorios', label: 'Relatórios' },
  ];

  return (
    <main className="min-h-screen bg-black pt-24 pb-20 px-8">
      <div className="max-w-[1400px] mx-auto space-y-12">
        
        {/* Header Tabs */}
        <nav className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'visao' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="glass-card p-10 flex flex-col items-center text-center space-y-6 bg-white/[0.01]">
                <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center opacity-40">
                  <s.icon size={24} style={{ color: s.color }} />
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-normal serif-title text-white">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'obras' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-normal serif-title uppercase tracking-wider">Gestão de Obras</h2>
              <button className="liquid-button !bg-[#E85002] !text-white !border-none text-[10px]">Adicionar Nova Obra</button>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 1, titulo: 'Guernica', artista: 'Pablo Picasso', ano: '1937', img: 'https://upload.wikimedia.org/wikipedia/pt/7/74/Guernica.jpg' },
                { id: 2, titulo: 'A Noite Estrelada', artista: 'Vincent van Gogh', ano: '1889', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' }
              ].map(obra => (
                <div key={obra.id} className="glass-card p-6 flex items-center justify-between border-white/5">
                  <div className="flex items-center gap-8">
                    <img src={obra.img} className="w-40 h-24 object-cover rounded-lg bg-black/40" />
                    <div>
                      <h3 className="text-lg font-bold">#{obra.id} — {obra.titulo}</h3>
                      <p className="text-white/40 text-sm italic">{obra.artista} — {obra.ano}</p>
                    </div>
                  </div>
                  <button className="liquid-button !bg-red-500/10 !text-red-400 !border-red-500/20 px-8 py-3 rounded-full text-[10px] uppercase font-bold hover:!bg-red-500/20">
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ontologias' && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
              <h2 className="text-2xl font-normal serif-title uppercase tracking-wider">Ontologias e Vocabulários</h2>
              <button className="liquid-button text-[10px]">Criar Ontologia</button>
            </div>
            
            <div className="overflow-x-auto glass-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/5 text-[10px] uppercase tracking-widest text-white/40">
                  <tr>
                    <th className="px-8 py-6">ID</th>
                    <th className="px-8 py-6">Nome</th>
                    <th className="px-8 py-6">Categoria</th>
                    <th className="px-8 py-6">Descrição</th>
                    <th className="px-8 py-6 text-center">Qtd Termos</th>
                    <th className="px-8 py-6">Termos Principais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { id: 1, nome: 'Religioso', cat: 'Tema', desc: 'Vocabulário para referências religiosas.', qtd: 8, termos: 'igreja, santo, altar' },
                    { id: 2, nome: 'Guerra', cat: 'Tema', desc: 'Vocabulário para conflitos e violência.', qtd: 7, termos: 'arma, soldado, combate' },
                    { id: 3, nome: 'Cor', cat: 'Atributo', desc: 'Vocabulário básico cromático.', qtd: 9, termos: 'azul, vermelho, verde' },
                  ].map(row => (
                    <tr key={row.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-6 text-white/30">{row.id}</td>
                      <td className="px-8 py-6 font-bold">{row.nome}</td>
                      <td className="px-8 py-6"><span className="px-3 py-1 rounded-full bg-white/5 text-[10px] uppercase">{row.cat}</span></td>
                      <td className="px-8 py-6 text-white/50">{row.desc}</td>
                      <td className="px-8 py-6 text-center font-mono">{row.qtd}</td>
                      <td className="px-8 py-6 text-[#E85002] text-xs">{row.termos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'validacao' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h2 className="text-2xl font-normal serif-title uppercase tracking-wider">Motor Semântico de Validação</h2>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold">Núcleo Informacional • Llama 3.3 & DNA Semântico</p>
              </div>
              <div className="flex gap-4">
                <button className="liquid-button !bg-[#E85002] !text-white text-[10px] !rounded-full">Processar Redes de Conexão</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Analysis Area */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-10 bg-white/[0.01]">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 text-[#E85002]">Análise de Conectividade em Tempo Real</h3>
                  
                  <div className="space-y-8">
                    {[
                      { tag: 'Maternidade', status: 'Conectado', score: 98, source: 'Europeana, IBRAM, Wikidata' },
                      { tag: 'Solidão', status: 'Em Análise', score: 45, source: 'Arquivos Institucionais, Tesauros' },
                      { tag: 'Liberdade', status: 'Validado', score: 82, source: 'Open Data, Getty Vocabularies' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center border border-white/10">
                            <Database size={20} className="text-[#E85002]" />
                          </div>
                          <div>
                            <p className="text-lg font-bold">{item.tag}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">{item.source}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-xs font-bold uppercase tracking-tighter text-[#E85002]">{item.score}% Ressonância</p>
                          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#E85002]" style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Second Brain Panel */}
              <div className="space-y-6">
                <div className="glass-card p-10 border-[#E85002]/20 bg-[#E85002]/[0.02]">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <ShieldCheck size={16} className="text-[#E85002]" />
                    Segundo Cérebro
                  </h3>
                  <div className="space-y-6 text-sm text-white/50 leading-relaxed">
                    <p>Cada tag criada no sistema é ancorada em uma rede de trilhões de parâmetros via **DNA Semântico**.</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#E85002]" />
                        <span className="text-[11px] uppercase tracking-widest">Interoperabilidade Open Data</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#E85002]" />
                        <span className="text-[11px] uppercase tracking-widest">Arquivos Externos Anexados</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#E85002]" />
                        <span className="text-[11px] uppercase tracking-widest">Parâmetros de Llama 3.3</span>
                      </div>
                    </div>
                    <button className="liquid-button w-full !rounded-xl !bg-white !text-black font-bold text-[10px] uppercase mt-4">
                      Ver Grafo de Conexões
                    </button>
                  </div>
                </div>

                <div className="glass-card p-8 bg-white/[0.01]">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 opacity-40">Status do Motor IA</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Latência de Resposta</span>
                    <span className="text-xs text-green-400 font-mono">24ms</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs">Modelo Ativo</span>
                    <span className="text-xs text-white/60">Llama 3.3 Enhanced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </main>
  );
}
