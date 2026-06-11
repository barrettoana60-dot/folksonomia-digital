'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Network, Search, Filter, Info, X } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function TeiaPublicaPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const graphRef = useRef<any>();

  useEffect(() => {
    // Simular dados para demonstração do grafo institucional
    const data = {
      nodes: [
        { id: '1', name: 'Escultura Mãe e Filho', type: 'obra', color: '#E85002' },
        { id: '2', name: 'Guernica', type: 'obra', color: '#E85002' },
        { id: '3', name: 'Maternidade', type: 'conceito', color: '#D9C3AB' },
        { id: '4', name: 'Guerra', type: 'conceito', color: '#D9C3AB' },
        { id: '5', name: 'mamãe', type: 'tag', color: '#F16001' },
        { id: '6', name: 'conflito', type: 'tag', color: '#F16001' },
        { id: '7', name: 'IBRAM/Tainacan', type: 'fonte', color: '#A7A7A7' },
      ],
      links: [
        { source: '1', target: '3', type: 'broader' },
        { source: '2', target: '4', type: 'broader' },
        { source: '5', target: '1', type: 'mentions' },
        { source: '5', target: '3', type: 'closeMatch' },
        { source: '6', target: '2', type: 'mentions' },
        { source: '6', target: '4', type: 'closeMatch' },
        { source: '3', target: '7', type: 'sourceLink' },
      ]
    };
    setGraphData(data);
    setLoading(false);
  }, []);

  return (
    <main className="min-h-screen bg-[#000000] text-white selection:bg-[#E85002]/30">
      
      {/* Header Interativo */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-3">
            <Network className="text-[#E85002]" size={28} />
            Teia Semântica
          </h1>
          <p className="text-white/35 text-[10px] uppercase tracking-wider mt-1">Mapa de conexões e indicadores semânticos</p>
        </div>
        
        <div className="pointer-events-auto flex gap-4">
          <div className="glass-card flex items-center px-4 py-2 gap-3">
            <Search size={16} className="text-white/40" />
            <input 
              placeholder="Buscar núcleo..." 
              className="bg-transparent border-none outline-none text-sm placeholder:text-white/20 w-48"
            />
          </div>
          <button className="liquid-button !p-3">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Canvas do Grafo */}
      <div className="w-full h-screen">
        {!loading && (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            backgroundColor="#000000"
            nodeLabel="name"
            nodeRelSize={6}
            nodeColor={node => (node as any).color}
            linkColor={() => 'rgba(255, 255, 255, 0.1)'}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={(node) => setSelectedNode(node)}
            width={typeof window !== 'undefined' ? window.innerWidth : 1200}
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
          />
        )}
      </div>

      {/* Painel Lateral de Detalhes (Friendly) */}
      {selectedNode && (
        <div className="fixed top-24 right-6 bottom-6 w-80 glass-card p-8 animate-in slide-in-from-right-10 duration-500 z-50 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E85002]">{selectedNode.type}</span>
            <button onClick={() => setSelectedNode(null)} className="text-white/30 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <h2 className="text-xl font-light serif-title mb-6">{selectedNode.name}</h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-3 flex items-center gap-2">
                <Info size={12} /> Camadas do Registro
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Origem da Informação</p>
                  <p className="text-xs">Participação Colaborativa</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Estado de Validação</p>
                  <p className="text-xs text-orange-400">Validado institucionalmente</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-3">Relações Encontradas</p>
              <div className="flex flex-wrap gap-2">
                {['Maternidade', 'Afeto', 'Cuidado'].map(tag => (
                  <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider">{tag}</span>
                ))}
              </div>
            </div>

            <button className="liquid-button w-full mt-4 text-xs font-semibold tracking-wider">
              Ver Trilha de Validação
            </button>
          </div>
        </div>
      )}

      {/* Legenda Institucional */}
      <div className="fixed bottom-6 left-6 glass-card px-6 py-4 flex gap-6 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#E85002]" /> Obra
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F16001]" /> Tag pública
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#D9C3AB]" /> Conceito
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#A7A7A7]" /> Fonte externa
        </div>
      </div>

    </main>
  );
}
