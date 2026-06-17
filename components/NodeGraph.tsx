'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Network, Plus, Trash2, Link2, Eye, Cpu } from 'lucide-react';

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

interface NodeGraphProps {
  initialNodes?: NodeData[];
  initialLinks?: NodeLink[];
  interactive?: boolean;
}

export default function NodeGraph({ initialNodes, initialLinks, interactive = true }: NodeGraphProps) {
  // Default nodes representing the Folksonomy AI pipeline if none provided
  const defaultNodes: NodeData[] = [
    {
      id: 'n1',
      title: 'Prompt / Tag Original',
      subtitle: 'INPUT CURADOR',
      x: 40,
      y: 50,
      width: 250,
      height: 140,
      inputs: [],
      outputs: [{ id: 'out1', label: 'Tag Text' }],
      type: 'prompt',
      content: (
        <div className="space-y-2 text-xs">
          <label className="text-[10px] text-white/40 uppercase">Tag Digitada</label>
          <div className="bg-[#121214] border border-white/5 rounded-lg p-2.5 font-mono text-[#ff8533] select-all">
            "barroco colonial"
          </div>
        </div>
      )
    },
    {
      id: 'n2',
      title: 'ModernBERT NER',
      subtitle: 'TOKEN CLASSIFIER',
      x: 340,
      y: 40,
      width: 280,
      height: 200,
      inputs: [{ id: 'in1', label: 'Tag Text' }],
      outputs: [{ id: 'out2', label: 'Entity Label' }],
      type: 'engine',
      content: (
        <div className="space-y-2 text-xs">
          <label className="text-[10px] text-white/40 uppercase font-semibold">Predição do Modelo</label>
          <div className="bg-[#121214] border border-white/5 rounded-lg p-2 font-mono text-xs space-y-1">
            <p className="text-green-400"><span className="text-white/45">[ESTILO]:</span> Barroco</p>
            <p className="text-blue-400"><span className="text-white/45">[PERIODO]:</span> Colonial</p>
            <p className="text-purple-400"><span className="text-white/45">[CONFIANÇA]:</span> 98.4%</p>
          </div>
        </div>
      )
    },
    {
      id: 'n3',
      title: 'Tesauro CNFCP/IPHAN',
      subtitle: 'REFERENCIA NORMATIVA',
      x: 40,
      y: 300,
      width: 250,
      height: 180,
      inputs: [],
      outputs: [{ id: 'out3', label: 'Contexto Tesauro' }],
      type: 'text',
      content: (
        <div className="space-y-2 text-xs">
          <label className="text-[10px] text-white/40 uppercase font-semibold">Definição do Verbete</label>
          <p className="text-white/60 text-[11px] leading-relaxed italic bg-black/30 p-2 rounded-lg border border-white/5 font-light">
            "Estilo artístico surgido na Europa no final do século XVI, caracterizado pelo rebuscamento e riqueza de detalhes..."
          </p>
        </div>
      )
    },
    {
      id: 'n4',
      title: 'Rede Neural MLP',
      subtitle: 'CONFIANÇA COGNITIVA',
      x: 700,
      y: 120,
      width: 320,
      height: 260,
      inputs: [
        { id: 'in2', label: 'Entity Label' },
        { id: 'in3', label: 'Contexto Tesauro' },
        { id: 'in4', label: 'Similaridade Vetorial' }
      ],
      outputs: [{ id: 'out4', label: 'Pesos Calibrados' }],
      type: 'result',
      content: (
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center bg-[#18181b] p-2 rounded-xl border border-white/5">
            <span className="text-white/50 text-[10px]">Confiança Calibrada:</span>
            <span className="font-bold text-[#ff8533] text-sm">98.7%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-green-500" style={{ width: '98.7%' }} />
          </div>
          <div className="text-[10px] text-white/35 font-mono space-y-1 bg-black/40 p-2 rounded-lg border border-white/5">
            <p>Input Dim: 10 | Hidden Dim: 8</p>
            <p>Retropropagação: Ativa (Backprop)</p>
            <p>Replay de Memória: 4 AM REM</p>
          </div>
        </div>
      )
    }
  ];

  const defaultLinks: NodeLink[] = [
    { id: 'l1', fromNode: 'n1', fromSocket: 'out1', toNode: 'n2', toSocket: 'in1' },
    { id: 'l2', fromNode: 'n2', fromSocket: 'out2', toNode: 'n4', toSocket: 'in2' },
    { id: 'l3', fromNode: 'n3', fromSocket: 'out3', toNode: 'n4', toSocket: 'in3' }
  ];

  const [nodes, setNodes] = useState<NodeData[]>(initialNodes || defaultNodes);
  const [links, setLinks] = useState<NodeLink[]>(initialLinks || defaultLinks);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Sync positions if props update
  useEffect(() => {
    if (initialNodes) setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    if (initialLinks) setLinks(initialLinks);
  }, [initialLinks]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!interactive) return;
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (graphContainerRef.current) {
      const rect = graphContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setDraggingNodeId(nodeId);
      setDragOffset({
        x: mouseX - node.x,
        y: mouseY - node.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !interactive) return;

    if (graphContainerRef.current) {
      const rect = graphContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === draggingNodeId 
            ? { ...node, x: Math.max(0, mouseX - dragOffset.x), y: Math.max(0, mouseY - dragOffset.y) }
            : node
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Helper to calculate socket coordinates
  const getSocketPosition = (nodeId: string, socketId: string, isInput: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const headerHeight = 44; // px
    const socketGap = 32; // px
    const topPadding = 20; // px
    
    if (isInput) {
      const socketIndex = node.inputs.findIndex(s => s.id === socketId);
      return {
        x: node.x,
        y: node.y + headerHeight + topPadding + (socketIndex >= 0 ? socketIndex : 0) * socketGap
      };
    } else {
      const socketIndex = node.outputs.findIndex(s => s.id === socketId);
      return {
        x: node.x + node.width,
        y: node.y + headerHeight + topPadding + (socketIndex >= 0 ? socketIndex : 0) * socketGap
      };
    }
  };

  return (
    <div 
      ref={graphContainerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-full h-[600px] bg-[#09090b] rounded-3xl border border-white/5 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Dynamic SVG Connection Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          {/* Yellow glow filter */}
          <filter id="yellow-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {links.map((link) => {
          const fromPos = getSocketPosition(link.fromNode, link.fromSocket, false);
          const toPos = getSocketPosition(link.toNode, link.toSocket, true);
          
          // Control points for smooth bezier curvature (ComfyUI look)
          const dx = Math.abs(toPos.x - fromPos.x) * 0.5;
          const cp1x = fromPos.x + dx;
          const cp1y = fromPos.y;
          const cp2x = toPos.x - dx;
          const cp2y = toPos.y;

          return (
            <path
              key={link.id}
              d={`M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`}
              stroke="#E8FC4F"
              strokeWidth="2.5"
              fill="none"
              filter="url(#yellow-glow)"
              className="opacity-80 transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* Nodes Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {nodes.map((node) => {
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
              }}
              className={`pointer-events-auto rounded-2xl bg-[#131315] border ${
                draggingNodeId === node.id ? 'border-[#ff8533]' : 'border-white/10'
              } shadow-2xl flex flex-col overflow-hidden transition-shadow`}
            >
              {/* Node Header (Draggable) */}
              <div
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                className="flex justify-between items-center px-4 py-2.5 bg-[#18181b] border-b border-white/5 cursor-move"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-white select-none">
                    {node.title.toUpperCase()}
                  </span>
                  {node.subtitle && (
                    <span className="text-[8px] font-mono tracking-widest text-[#ff8533] uppercase leading-none mt-0.5">
                      {node.subtitle}
                    </span>
                  )}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#E8FC4F]" />
              </div>

              {/* Sockets and Body */}
              <div className="flex-grow flex relative">
                {/* Inputs Sockets Column (Left side) */}
                <div className="absolute left-0 top-[20px] bottom-0 flex flex-col gap-[16px] pointer-events-none transform -translate-x-1.5">
                  {node.inputs.map((socket) => (
                    <div key={socket.id} className="flex items-center gap-1.5 relative">
                      {/* Socket Circle (neon yellow) */}
                      <div className="w-3 h-3 rounded-full bg-[#E8FC4F] border-2 border-[#131315] shadow-[0_0_8px_rgba(232,252,79,0.8)] pointer-events-auto cursor-pointer" />
                      <span className="text-[8px] font-mono font-bold text-white/50 tracking-wider bg-[#131315] px-1 rounded transform translate-x-1">
                        {socket.label.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Body Content Area */}
                <div className="flex-grow p-4 overflow-y-auto max-h-[calc(100%-8px)] no-scrollbar">
                  {node.content}
                </div>

                {/* Outputs Sockets Column (Right side) */}
                <div className="absolute right-0 top-[20px] bottom-0 flex flex-col gap-[16px] items-end pointer-events-none transform translate-x-1.5">
                  {node.outputs.map((socket) => (
                    <div key={socket.id} className="flex items-center gap-1.5 relative">
                      <span className="text-[8px] font-mono font-bold text-white/50 tracking-wider bg-[#131315] px-1 rounded transform -translate-x-1">
                        {socket.label.toUpperCase()}
                      </span>
                      <div className="w-3 h-3 rounded-full bg-[#E8FC4F] border-2 border-[#131315] shadow-[0_0_8px_rgba(232,252,79,0.8)] pointer-events-auto cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
