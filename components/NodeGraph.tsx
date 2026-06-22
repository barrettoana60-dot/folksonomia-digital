'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Network, Plus, Trash2, Link2, Eye, Cpu, ShieldCheck, XCircle, ArrowRight, Clipboard, Hash, FileText, Globe } from 'lucide-react';

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
  type: string;
  content: React.ReactNode;
  status: string; // validado, rejeitado, em_analise, bruto
}

interface NodeLink {
  id: string;
  fromNode: string;
  fromSocket: string;
  toNode: string;
  toSocket: string;
  tipo_relacao?: string;
  peso?: number;
  hash_dna?: string;
  metadados?: any;
}

interface NodeGraphProps {
  initialNodes?: NodeData[];
  initialLinks?: NodeLink[];
  interactive?: boolean;
}

export default function NodeGraph({ initialNodes, initialLinks, interactive = true }: NodeGraphProps) {
  // Setup fallback nodes representing the AI workflow pipeline if database is empty
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
      status: 'validado',
      content: (
        <div className="space-y-2 text-xs">
          <label className="text-[10px] text-white/40 uppercase">Tag Digitada</label>
          <div className="bg-[#121214] border border-white/5 rounded-lg p-2.5 font-mono text-[#ff8533]">
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
      status: 'validado',
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
      status: 'validado',
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
      status: 'validado',
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
    { id: 'l1', fromNode: 'n1', fromSocket: 'out1', toNode: 'n2', toSocket: 'in1', tipo_relacao: 'input', peso: 1.0 },
    { id: 'l2', fromNode: 'n2', fromSocket: 'out2', toNode: 'n4', toSocket: 'in2', tipo_relacao: 'rotate', peso: 0.95 },
    { id: 'l3', fromNode: 'n3', fromSocket: 'out3', toNode: 'n4', toSocket: 'in3', tipo_relacao: 'rotate', peso: 0.88 }
  ];

  const [nodes, setNodes] = useState<NodeData[]>(nodesFromProps(initialNodes) || defaultNodes);
  const [links, setLinks] = useState<NodeLink[]>(initialLinks || defaultLinks);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Dragging States
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Form states for creating new relations
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relType, setRelType] = useState('closeMatch');
  const [relWeight, setRelWeight] = useState(0.8);
  const [submittingRelation, setSubmittingRelation] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  const translateRelationType = (type: string): string => {
    const mapping: Record<string, string> = {
      closeMatch: 'Correspondência Próxima',
      exactMatch: 'Correspondência Exata',
      broader: 'Termo Genérico',
      narrower: 'Termo Específico',
      related: 'Termo Associado'
    };
    return mapping[type] || type || 'LIGAÇÃO';
  };

  function nodesFromProps(propNodes?: NodeData[]): NodeData[] | null {
    if (!propNodes) return null;
    return propNodes.map(n => ({
      ...n,
      status: n.status || 'bruto'
    }));
  }

  // Update when props change
  useEffect(() => {
    if (initialNodes) {
      setNodes(nodesFromProps(initialNodes) || []);
    }
  }, [initialNodes]);

  useEffect(() => {
    if (initialLinks) {
      setLinks(initialLinks);
    }
  }, [initialLinks]);

  // Handle dragging of nodes
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

  // Node actions: Validate or Reject Node
  const handleValidateNode = async (nodeId: string, action: 'validar' | 'rejeitar') => {
    setActionStatus('Processando...');
    try {
      const res = await fetch('/api/admin/validacao/acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nodeId, action, justificativa: 'Curador validou via Teia de Fluxo' })
      });
      const d = await res.json();
      if (d.success) {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: d.status } : n));
        setActionStatus(`Nó ${action === 'validar' ? 'validado' : 'rejeitado'} com sucesso!`);
      } else {
        setActionStatus(`Falha: ${d.error || 'Erro desconhecido'}`);
      }
    } catch {
      setActionStatus('Erro ao enviar solicitação.');
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  // Connection actions: Add relation
  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !targetNodeId) return;

    setSubmittingRelation(true);
    setActionStatus('Computando DNA Semântico...');
    try {
      const res = await fetch('/api/admin/relacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem_id: selectedNodeId,
          destino_id: targetNodeId,
          tipo_relacao: relType,
          peso: relWeight,
          metodo: 'manual',
          fonte: 'curador'
        })
      });
      const d = await res.json();
      if (d.success) {
        // Add link locally
        const newLink: NodeLink = {
          id: d.relation.id,
          fromNode: selectedNodeId,
          fromSocket: `out-${selectedNodeId}`,
          toNode: targetNodeId,
          toSocket: `in-${targetNodeId}`,
          tipo_relacao: relType,
          peso: relWeight,
          hash_dna: d.relation.hash_dna,
          metadados: d.relation.metadados
        };
        setLinks(prev => [...prev, newLink]);
        setTargetNodeId('');
        setActionStatus('Conexão e DNA registrados!');
      } else {
        setActionStatus(`Falha: ${d.error || 'Erro'}`);
      }
    } catch {
      setActionStatus('Erro ao criar conexão.');
    } finally {
      setSubmittingRelation(false);
      setTimeout(() => setActionStatus(''), 3000);
    }
  };

  // Connection actions: Remove relation
  const handleRemoveRelation = async (relationId: string) => {
    setActionStatus('Removendo...');
    try {
      const res = await fetch(`/api/admin/relacoes?id=${relationId}`, {
        method: 'DELETE'
      });
      const d = await res.json();
      if (d.success) {
        setLinks(prev => prev.filter(l => l.id !== relationId));
        setActionStatus('Relação excluída com sucesso.');
      } else {
        setActionStatus(`Falha: ${d.error}`);
      }
    } catch {
      setActionStatus('Erro ao remover.');
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  // Get selected node data
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  // Get links connected to selected node
  const selectedNodeLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return links.filter(l => l.fromNode === selectedNodeId || l.toNode === selectedNodeId);
  }, [links, selectedNodeId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setActionStatus('Hash copiado!');
    setTimeout(() => setActionStatus(''), 2000);
  };

  return (
    <div className="relative w-full h-[600px] flex overflow-hidden">
      
      {/* Node Editor Canvas */}
      <div 
        ref={graphContainerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex-grow h-[600px] bg-[#09090b] rounded-3xl border border-white/5 overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Dynamic SVG Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
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
            const isSelected = selectedNodeId === node.id;
            let statusColor = 'border-white/10';
            if (node.status === 'validado' || node.status === 'publicado') statusColor = 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
            if (node.status === 'rejeitado') statusColor = 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
            if (node.status === 'em_analise') statusColor = 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]';

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
                className={`pointer-events-auto rounded-2xl bg-[#131315]/95 border ${
                  isSelected ? 'border-[#ff8533] ring-1 ring-[#ff8533]' : statusColor
                } shadow-2xl flex flex-col overflow-hidden transition-all`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
              >
                {/* Node Header */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  className="flex justify-between items-center px-4 py-2.5 bg-[#18181b] border-b border-white/5 cursor-move"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-white truncate max-w-[160px]">
                      {node.title.toUpperCase()}
                    </span>
                    {node.subtitle && (
                      <span className="text-[8px] font-mono tracking-widest text-[#ff8533] uppercase leading-none mt-0.5">
                        {node.subtitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {node.status && (
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        node.status === 'validado' || node.status === 'publicado' ? 'bg-green-400' :
                        node.status === 'rejeitado' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                    )}
                  </div>
                </div>

                {/* Sockets and Body */}
                <div className="flex-grow flex relative">
                  {/* Inputs */}
                  <div className="absolute left-0 top-[20px] bottom-0 flex flex-col gap-[16px] pointer-events-none transform -translate-x-1.5">
                    {node.inputs.map((socket) => (
                      <div key={socket.id} className="flex items-center gap-1.5 relative">
                        <div className="w-3 h-3 rounded-full bg-[#E8FC4F] border-2 border-[#131315] shadow-[0_0_8px_rgba(232,252,79,0.8)] pointer-events-auto cursor-pointer" />
                        <span className="text-[8px] font-mono font-bold text-white/50 tracking-wider bg-[#131315] px-1 rounded transform translate-x-1">
                          {socket.label.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Body Content */}
                  <div className="flex-grow p-4 overflow-y-auto max-h-[calc(100%-8px)] no-scrollbar">
                    {node.content}
                  </div>

                  {/* Outputs */}
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

      {/* Gaveta de Ações do Nó Selecionado */}
      {selectedNode && (
        <div className="w-80 h-full bg-[#0c0c0e] border-l border-white/10 z-20 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-10 duration-200">
          
          {/* Header da Gaveta */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[8px] font-mono font-bold text-[#00A3FF] uppercase tracking-wider">Detecção & Curadoria</span>
              <h3 className="text-sm font-semibold text-white truncate max-w-[200px] mt-0.5">{selectedNode.title}</h3>
            </div>
            <button 
              onClick={() => setSelectedNodeId(null)}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>

          {/* Status & Ações Principais */}
          <div className="p-5 space-y-6 flex-grow">
            
            {actionStatus && (
              <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] rounded-xl text-center">
                {actionStatus}
              </div>
            )}

            {/* Validação de Nó (Demarcação) */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">Curadoria de Núcleo</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleValidateNode(selectedNode.id, 'validar')}
                  className="flex-1 liquid-button liquid-glass-green !py-2 !px-3 text-xs"
                >
                  <ShieldCheck size={13} /> Validar
                </button>
                <button 
                  onClick={() => handleValidateNode(selectedNode.id, 'rejeitar')}
                  className="flex-1 liquid-button liquid-glass-red !py-2 !px-3 text-xs"
                >
                  <XCircle size={13} /> Rejeitar
                </button>
              </div>
            </div>

            {/* Criar Nova Conexão */}
            <form onSubmit={handleAddRelation} className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">Criar Nova Ligação</label>
              
              <div className="space-y-2">
                <select
                  value={targetNodeId}
                  onChange={e => setTargetNodeId(e.target.value)}
                  className="w-full bg-[#131315] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#ff8533]"
                  required
                >
                  <option value="">Selecionar destino...</option>
                  {nodes
                    .filter(n => n.id !== selectedNodeId)
                    .map(n => (
                      <option key={n.id} value={n.id}>
                        {n.title.startsWith('Núcleo') ? `${n.title.split(': ')[0]}: "${n.content.props?.children?.props?.children[1] || n.id.substring(0,8)}"` : n.title}
                      </option>
                    ))
                  }
                </select>

                <select
                  value={relType}
                  onChange={e => setRelType(e.target.value)}
                  className="w-full bg-[#131315] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#ff8533]"
                >
                  <option value="closeMatch">Correspondência Próxima</option>
                  <option value="exactMatch">Correspondência Exata</option>
                  <option value="broader">Termo Genérico</option>
                  <option value="narrower">Termo Específico</option>
                  <option value="related">Termo Associado</option>
                </select>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-white/40">
                    <span>Peso de Confiança</span>
                    <span>{relWeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={relWeight}
                    onChange={e => setRelWeight(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff8533]"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submittingRelation}
                  className="w-full liquid-button liquid-glass-orange !py-2"
                >
                  <Plus size={12} /> {submittingRelation ? 'Salvando...' : 'Inserir Ligação'}
                </button>
              </div>
            </form>

            {/* Listagem de Conexões do Nó */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">Ligações Ativas ({selectedNodeLinks.length})</label>
              {selectedNodeLinks.length === 0 ? (
                <p className="text-[10px] text-white/20 italic">Nenhuma ligação registrada para este nó.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {selectedNodeLinks.map(link => {
                    const isFromMe = link.fromNode === selectedNodeId;
                    const otherNodeId = isFromMe ? link.toNode : link.fromNode;
                    const otherNode = nodes.find(n => n.id === otherNodeId);
                    
                    return (
                      <div key={link.id} className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs gap-2">
                        <div className="truncate">
                          <span className="text-[9px] font-mono text-white/30 uppercase block">
                            {translateRelationType(link.tipo_relacao)} ({Math.round((link.peso || 0.8) * 100)}%)
                          </span>
                          <span className="text-white/80 font-light truncate block">
                            {isFromMe ? '→' : '←'} {otherNode?.title || otherNodeId.substring(0,8)}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveRelation(link.id)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex-shrink-0"
                          title="Excluir Conexão"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DNA Semântico (Proveniência Imutável) */}
            {selectedNodeLinks.length > 0 && selectedNodeLinks.some(l => l.hash_dna) && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-purple-300/60 flex items-center gap-1.5">
                  <Hash size={12} /> DNA Semântico das Ligações
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {selectedNodeLinks.filter(l => l.hash_dna).map(link => (
                    <div key={link.id} className="bg-purple-900/10 border border-purple-500/10 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-purple-300 font-semibold font-mono tracking-wider">DNA SHA-256</span>
                        <button 
                          onClick={() => copyToClipboard(link.hash_dna || '')}
                          className="p-1 text-purple-300/60 hover:text-purple-300 flex-shrink-0"
                          title="Copiar Hash"
                        >
                          <Clipboard size={12} />
                        </button>
                      </div>
                      <p className="text-[8px] font-mono text-purple-200 select-all break-all bg-black/40 p-1.5 rounded-lg border border-purple-500/5">
                        {link.hash_dna}
                      </p>

                      {/* Metadados DNA */}
                      {link.metadados && (
                        <div className="space-y-1.5 text-[9px] text-white/50 leading-relaxed font-light">
                          {link.metadados.externalApis && link.metadados.externalApis.length > 0 && (
                            <p className="flex items-center gap-1"><Globe size={9} className="text-[#00A3FF]" /> Correspondido com {link.metadados.externalApis[0].fonte.toUpperCase()}</p>
                          )}
                          {link.metadados.bibliographies && (
                            <p className="flex items-center gap-1"><FileText size={9} className="text-[#34C759]" /> DNA Registro Imutável</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Rodapé da Gaveta */}
          <div className="p-4 border-t border-white/5 bg-black/30 text-center text-[10px] text-white/20 italic">
            Clique no canvas do grafo para cancelar a seleção.
          </div>

        </div>
      )}

    </div>
  );
}
