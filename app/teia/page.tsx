'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@/lib/supabase/client';
import { Network, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import NodeGraph from '@/components/NodeGraph';

interface NodeSocket {
  id: string;
  label: string;
}

interface NodeData {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  type: 'prompt' | 'image' | 'text' | 'engine' | 'result';
  content: React.ReactNode;
}

interface NodeLink {
  id: string;
  fromNode: string;
  fromSocket: string;
  toNode: string;
  toSocket: string;
}

export default function TeiaPublicaPage() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<NodeLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGraph() {
      try {
        const { data: nucleos } = await supabase
          .from('nucleos')
          .select('id, conteudo_original, status_validacao')
          .limit(8);

        const { data: relacoes } = await supabase
          .from('relacoes')
          .select('id, origem_id, destino_id, tipo_relacao')
          .limit(10);

        if (!nucleos || nucleos.length === 0) {
          setLoading(false);
          return;
        }

        const mappedNodes: NodeData[] = nucleos.map((n, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return {
            id: n.id,
            title: `Núcleo Semântico`,
            subtitle: n.status_validacao.toUpperCase(),
            x: 50 + col * 320,
            y: 40 + row * 260,
            width: 260,
            height: 160,
            inputs: [{ id: `in-${n.id}`, label: 'Origem' }],
            outputs: [{ id: `out-${n.id}`, label: 'Destino' }],
            type: 'text',
            content: (
              <div className="space-y-2 text-xs">
                <label className="text-[9px] text-white/35 uppercase font-mono">Folksonomia ID: {n.id.substring(0, 8)}</label>
                <p className="text-white bg-black/40 p-2.5 rounded-xl border border-white/5 font-semibold text-xs leading-normal">
                  {n.conteudo_original}
                </p>
              </div>
            )
          };
        });

        const mappedLinks: NodeLink[] = (relacoes || [])
          .filter(r => nucleos.some(n => n.id === r.origem_id) && nucleos.some(n => n.id === r.destino_id))
          .map(r => ({
            id: r.id || `l-${r.origem_id}-${r.destino_id}`,
            fromNode: r.origem_id,
            fromSocket: `out-${r.origem_id}`,
            toNode: r.destino_id,
            toSocket: `in-${r.destino_id}`
          }));

        setNodes(mappedNodes);
        setLinks(mappedLinks);
      } catch (e) {
        console.warn('Erro ao mapear nós da teia, usando fallback:', e);
      } finally {
        setLoading(false);
      }
    }
    loadGraph();
  }, []);

  return (
    <main className="min-h-screen pt-24 pb-20 px-6 bg-[#000000] text-white">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal serif-title tracking-tight flex items-center gap-3">
              <Network className="text-[#E85002]" size={30} />
              Teia Semântica Pública
            </h1>
            <p className="text-white/35 text-[11px] uppercase tracking-wider mt-2 font-semibold">
              Mapa coletivo e associativo de conceitos e acervos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="liquid-button liquid-glass-orange flex items-center gap-2">
              <ArrowLeft size={14} /> Voltar ao Início
            </Link>
          </div>
        </div>

        {/* Node Editor Frame */}
        <div className="rounded-3xl border border-white/5 overflow-hidden bg-black/40">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <NodeGraph 
              initialNodes={nodes.length > 0 ? nodes : undefined} 
              initialLinks={links.length > 0 ? links : undefined} 
            />
          )}
        </div>

        {/* Info Box */}
        <div className="glass-card p-6 border border-white/5 bg-[#121214]/10 text-center">
          <p className="text-white/40 text-xs leading-relaxed max-w-2xl mx-auto flex items-center justify-center gap-2">
            <Info size={16} className="text-[#00A3FF]" />
            Você pode arrastar e organizar os blocos para explorar as conexões conceituais mapeadas pela curadoria institucional.
          </p>
        </div>

      </div>
    </main>
  );
}
