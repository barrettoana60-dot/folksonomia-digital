'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Database, Brain, Globe, Network,
  ArrowRight, Layers, Activity, TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface PendingItem {
  id: string;
  conteudo_original: string;
  conteudo_normalizado: string;
  status_validacao: string;
  confianca: number;
  novidade: number;
  tensao: number;
  ressonancia: number;
  origem: string;
  metadados: any;
  contexto: any;
  obra: { titulo: string } | null;
}

interface KnowledgeNode {
  id: string;
  label: string;
  type: 'tag' | 'concept' | 'source' | 'category';
  weight: number;
}

interface KnowledgeEdge {
  from: string;
  to: string;
  label: string;
  weight: number;
}

function buildKnowledgeGraph(items: PendingItem[]): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  const nodeIds = new Set<string>();

  for (const item of items.slice(0, 20)) {
    // Tag node
    const tagId = `tag_${item.id.slice(0, 8)}`;
    if (!nodeIds.has(tagId)) {
      nodes.push({ id: tagId, label: item.conteudo_original, type: 'tag', weight: item.confianca || 50 });
      nodeIds.add(tagId);
    }

    // Category node from metadados
    const concepts = item.metadados?.concepts || [];
    for (const concept of concepts.slice(0, 3)) {
      const conceptId = `concept_${concept}`;
      if (!nodeIds.has(conceptId)) {
        nodes.push({ id: conceptId, label: concept, type: 'concept', weight: 70 });
        nodeIds.add(conceptId);
      }
      edges.push({ from: tagId, to: conceptId, label: 'conceito', weight: 0.7 });
    }

    // Theme group
    const theme = item.contexto?.themeGroup;
    if (theme) {
      const themeId = `cat_${theme}`;
      if (!nodeIds.has(themeId)) {
        nodes.push({ id: themeId, label: theme, type: 'category', weight: 85 });
        nodeIds.add(themeId);
      }
      edges.push({ from: tagId, to: themeId, label: 'tema', weight: 0.8 });
    }

    // Source node
    const sourceId = `src_${item.origem}`;
    if (!nodeIds.has(sourceId)) {
      nodes.push({ id: sourceId, label: item.origem, type: 'source', weight: 60 });
      nodeIds.add(sourceId);
    }
    edges.push({ from: tagId, to: sourceId, label: 'origem', weight: 0.5 });
  }

  return { nodes, edges };
}

const typeColors: Record<string, string> = {
  tag: 'bg-[#E85002]/20 border-[#E85002]/40 text-[#E85002]',
  concept: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  source: 'bg-green-500/20 border-green-500/40 text-green-400',
  category: 'bg-purple-500/20 border-purple-500/40 text-purple-400'
};

export default function ValidacaoPage() {
  const [pendingTags, setPendingTags] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'graph'>('list');
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});

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
        body: JSON.stringify({ id, action, justificativa: justificativas[id] || '' })
      });
      const json = await res.json();
      if (json.success) {
        setPendingTags(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const graph = buildKnowledgeGraph(pendingTags);

  return (
    <main className="min-h-screen bg-black text-white p-10 pt-24">
      
      <div className="max-w-[95%] mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-normal serif-title tracking-tight">Painel de Validação</h1>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2">Verificação Humana + Grafo de Conhecimento</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveView('list')}
            className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold border transition-all ${
              activeView === 'list' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/30 hover:text-white/60'
            }`}
          >
            <Layers size={14} className="inline mr-2" /> Lista
          </button>
          <button 
            onClick={() => setActiveView('graph')}
            className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold border transition-all ${
              activeView === 'graph' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-white/30 hover:text-white/60'
            }`}
          >
            <Network size={14} className="inline mr-2" /> Grafo
          </button>
          <Link href="/admin" className="liquid-button text-[10px] py-2 px-6">
            Voltar ao Início
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="max-w-[95%] mx-auto grid grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-300">{pendingTags.length}</div>
          <div className="text-[9px] uppercase tracking-widest text-white/40">Pendentes</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-300">{graph.nodes.length}</div>
          <div className="text-[9px] uppercase tracking-widest text-white/40">Nós no grafo</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-300">{graph.edges.length}</div>
          <div className="text-[9px] uppercase tracking-widest text-white/40">Conexões</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-green-300">
            {pendingTags.length > 0 ? Math.round(pendingTags.reduce((s, t) => s + (t.confianca || 0), 0) / pendingTags.length) : 0}%
          </div>
          <div className="text-[9px] uppercase tracking-widest text-white/40">Confiança média</div>
        </div>
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
        ) : activeView === 'graph' ? (
          /* GRAFO DE CONHECIMENTO */
          <div className="glass-card p-8">
            <h3 className="text-lg font-normal serif-title mb-6 flex items-center gap-3">
              <Network size={20} className="text-[#E85002]" />
              Grafo de Conhecimento — Relações entre Tags
            </h3>
            
            {/* Visual Graph */}
            <div className="relative bg-black/40 rounded-2xl border border-white/5 p-8 min-h-[500px] overflow-auto">
              {/* Legend */}
              <div className="absolute top-4 right-4 flex gap-3 z-10">
                {Object.entries({ tag: 'Tag', concept: 'Conceito', source: 'Fonte', category: 'Categoria' }).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full border ${typeColors[type]}`} />
                    <span className="text-[9px] text-white/40 uppercase">{label}</span>
                  </div>
                ))}
              </div>

              {/* Nodes grid */}
              <div className="flex flex-wrap gap-3 pt-8">
                {graph.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 cursor-default ${typeColors[node.type]}`}
                    title={`${node.type}: ${node.label} (peso: ${node.weight})`}
                  >
                    {node.label}
                  </div>
                ))}
              </div>

              {/* Edges list */}
              {graph.edges.length > 0 && (
                <div className="mt-8 border-t border-white/5 pt-6">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Relações Detectadas</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {graph.edges.slice(0, 30).map((edge, i) => {
                      const fromNode = graph.nodes.find(n => n.id === edge.from);
                      const toNode = graph.nodes.find(n => n.id === edge.to);
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-white/50 bg-white/[0.02] px-3 py-1.5 rounded-lg">
                          <span className="text-white/80 font-medium">{fromNode?.label}</span>
                          <ArrowRight size={10} className="text-[#E85002]" />
                          <span className="text-white/40 italic">{edge.label}</span>
                          <ArrowRight size={10} className="text-[#E85002]" />
                          <span className="text-white/80 font-medium">{toNode?.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* LISTA DE VALIDAÇÃO */
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
                      <p className="text-2xl font-light text-green-400">{Math.round(item.confianca ?? 0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Novidade</p>
                      <p className="text-2xl font-light text-blue-400">{Math.round(item.novidade ?? 0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Tensão</p>
                      <p className="text-2xl font-light text-yellow-400">{Math.round(item.tensao ?? 0)}%</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] text-white/30 uppercase mb-1">Ressonância</p>
                      <p className="text-2xl font-light text-purple-400">{Math.round(item.ressonancia ?? 0)}%</p>
                    </div>
                  </div>

                  {/* Concepts */}
                  {item.metadados?.concepts?.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Conceitos Inferidos</label>
                      <div className="flex flex-wrap gap-2">
                        {item.metadados.concepts.map((c: string) => (
                          <span key={c} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-[10px] text-blue-300">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 3: Ações */}
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-3">Proveniência</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px]">
                        <Database size={10} /> {item.origem || 'pipeline_v3'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Ação Curatorial</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleAction(item.id, 'validar')}
                        className="liquid-button !bg-green-500/20 !border-green-500/40 hover:!bg-green-500/40 text-[10px] flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} /> Validar
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, 'rejeitar')}
                        className="liquid-button !bg-red-500/20 !border-red-500/40 hover:!bg-red-500/40 text-[10px] flex items-center justify-center gap-2"
                      >
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  </div>

                  <div>
                    <textarea 
                      placeholder="Justificativa da validação..."
                      value={justificativas[item.id] || ''}
                      onChange={(e) => setJustificativas(prev => ({ ...prev, [item.id]: e.target.value }))}
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
