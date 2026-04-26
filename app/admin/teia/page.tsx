'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { Activity, Share2, Maximize2 } from 'lucide-react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function TeiaPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const graphRef = useRef<any>();

  useEffect(() => {
    async function loadGraph() {
      const { data: nucleos } = await supabase.from('nucleos').select('id, conteudo_original, status_validacao').limit(100);
      const { data: relacoes } = await supabase.from('relacoes').select('origem_id, destino_id, tipo_relacao, peso').limit(200);

      const nodes = (nucleos || []).map(n => ({
        id: n.id,
        name: n.conteudo_original,
        val: n.status_validacao === 'validado' ? 5 : 2,
        color: n.status_validacao === 'validado' ? '#ffffff' : 'rgba(255,255,255,0.2)'
      }));

      const links = (relacoes || []).map(r => ({
        source: r.origem_id,
        target: r.destino_id,
        name: r.tipo_relacao,
        width: r.peso * 2
      }));

      setGraphData({ nodes, links });
      setLoading(false);
    }
    loadGraph();
  }, []);

  return (
    <main className="min-h-screen pt-20 px-6">
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">Teia Semântica</h1>
            <p className="text-white/40 text-sm">Visualização em tempo real das conexões e núcleos informacionais.</p>
          </div>
          <div className="flex gap-2">
            <button className="glass-card px-4 py-2 text-xs flex items-center gap-2 hover:bg-white/10">
              <Share2 size={14} /> Exportar Grafo
            </button>
            <button className="glass-card px-4 py-2 text-xs flex items-center gap-2 hover:bg-white/10">
              <Maximize2 size={14} /> Tela Cheia
            </button>
          </div>
        </div>

        <div className="flex-1 glass-card overflow-hidden relative border-white/5 bg-black/40">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="animate-pulse text-white/20" size={40} />
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              backgroundColor="rgba(0,0,0,0)"
              nodeLabel="name"
              nodeColor={node => (node as any).color}
              nodeRelSize={4}
              linkColor={() => 'rgba(255,255,255,0.1)'}
              linkDirectionalParticles={1}
              linkDirectionalParticleSpeed={d => (d as any).width * 0.001}
              width={1200}
              height={800}
            />
          )}
        </div>
      </div>
    </main>
  );
}
