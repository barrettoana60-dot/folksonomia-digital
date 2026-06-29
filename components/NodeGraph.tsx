'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, ShieldCheck, XCircle, Clipboard, Hash, FileText, Globe } from 'lucide-react';

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
  status: string;
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

function nodesFromProps(propNodes?: NodeData[]): NodeData[] | null {
  if (!propNodes) return null;
  return propNodes.map(n => ({ ...n, status: n.status || 'bruto' }));
}

export default function NodeGraph({ initialNodes, initialLinks, interactive = true }: NodeGraphProps) {
  const defaultNodes: NodeData[] = [
    {
      id: 'n1',
      title: 'Prompt / Tag Original',
      subtitle: 'INPUT CURADOR',
      x: 40, y: 50, width: 250, height: 140,
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
      x: 340, y: 40, width: 280, height: 200,
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
      x: 40, y: 300, width: 250, height: 180,
      inputs: [],
      outputs: [{ id: 'out3', label: 'Contexto Tesauro' }],
      type: 'text',
      status: 'validado',
      content: (
        <div className="space-y-2 text-xs">
          <label className="text-[10px] text-white/40 uppercase font-semibold">Definição do Verbete</label>
          <p className="text-white/60 text-[11px] leading-relaxed italic bg-black/30 p-2 rounded-lg border border-white/5 font-light">
            "Estilo artístico surgido na Europa no final do século XVI..."
          </p>
        </div>
      )
    },
    {
      id: 'n4',
      title: 'Rede Neural MLP',
      subtitle: 'CONFIANÇA COGNITIVA',
      x: 700, y: 120, width: 320, height: 260,
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
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const graphContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (initialNodes) setNodes(nodesFromProps(initialNodes) || []);
  }, [initialNodes]);

  useEffect(() => {
    if (initialLinks) setLinks(initialLinks);
  }, [initialLinks]);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!interactive) return;
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !graphContainerRef.current) return;
    const rect = graphContainerRef.current.getBoundingClientRect();
    setDraggingNodeId(nodeId);
    setDragOffset({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !interactive || !graphContainerRef.current) return;
    const rect = graphContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setNodes(prev => prev.map(node =>
      node.id === draggingNodeId
        ? { ...node, x: Math.max(0, mouseX - dragOffset.x), y: Math.max(0, mouseY - dragOffset.y) }
        : node
    ));
  };

  const handleMouseUp = () => setDraggingNodeId(null);

  const getSocketPosition = (nodeId: string, socketId: string, isInput: boolean) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const headerHeight = 44;
    const socketGap = 32;
    const topPadding = 20;
    if (isInput) {
      const idx = node.inputs.findIndex(s => s.id === socketId);
      return { x: node.x, y: node.y + headerHeight + topPadding + (idx >= 0 ? idx : 0) * socketGap };
    } else {
      const idx = node.outputs.findIndex(s => s.id === socketId);
      return { x: node.x + node.width, y: node.y + headerHeight + topPadding + (idx >= 0 ? idx : 0) * socketGap };
    }
  };

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

  const handleRemoveRelation = async (relationId: string) => {
    setActionStatus('Removendo...');
    try {
      const res = await fetch(`/api/admin/relacoes?id=${relationId}`, { method: 'DELETE' });
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

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
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
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="yellow-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {links.map((link) => {
            const fromPos = getSocketPosition(link.fromNode, link.fromSocket, false);
            const toPos = getSocketPosition(link.toNode, link.toSocket, true);
            const dx = Math.abs(toPos.x - fromPos.x) * 0.5;
            return (
              <path
                key={link.id}
                d={`M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx} ${fromPos.y}, ${toPos.x - dx} ${toPos.y}, ${toPos.x} ${toPos.y}`}
                stroke="#E8FC4F"
                strokeWidth="2.5"
                fill="none"
                filter="url(#yellow-glow)"
                className="opacity-80"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 z-10 pointer-events-none">
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            let statusColor = 'border-white/10';
            if (node.status === 'validado' || node.status === 'publicado') statusColor = 'border-green-500/50';
            if (node.status === 'rejeitado') statusColor = 'border-red-500/50';
            if (node.status === 'em_analise') statusColor = 'border-amber-500/50';

            return (
              <div
                key={node.id}
                style={{ position: 'absolute', left: node.x, top: node.y, width: node.width, height: node.height }}
                className={`pointer-events-auto rounded-2xl bg-[#131315]/95 border ${isSelected ? 'border-[#ff8533] ring-1 ring-[#ff8533]' : statusColor} shadow-2xl flex flex-col overflow-hidden transition-all`}
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
              >
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
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    node.status === 'validado' || node.status === 'publicado' ? 'bg-green-400' :
                    node.status === 'rejeitado' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                </div>

                <div className="flex-grow flex relative">
                  <div className="absolute left-0 top-[20px] bottom-0 flex flex-col gap-[16px] pointer-events-none transform -translate-x-1.5">
                    {node.inputs.map((socket) => (
                      <div key={socket.id} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#E8FC4F] border-2 border-[#131315] shadow-[0_0_8px_rgba(232,252,79,0.8)]" />
                        <span className="text-[8px] font-mono font-bold text-white/50 tracking-wider bg-[#131315] px-1 rounded transform translate-x-1">
                          {socket.label.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-grow p-4 overflow-y-auto">{node.content}</div>
                  <div className="absolute right-0 top-[20px] bottom-0 flex flex-col gap-[16px] items-end pointer-events-none transform translate-x-1.5">
                    {node.outputs.map((socket) => (
                      <div key={socket.id} className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-bold text-white/50 tracking-wider bg-[#131315] px-1 rounded transform -translate-x-1">
                          {socket.label.toUpperCase()}
                        </span>
                        <div className="w-3 h-3 rounded-full bg-[#E8FC4F] border-2 border-[#131315] shadow-[0_0_8px_rgba(232,252,79,0.8)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedNode && (
        <div className="w-80 h-full bg-[#0c0c0e] border-l border-white/10 z-20 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <span className="text-[8px] font-mono font-bold text-[#00A3FF] uppercase tracking-wider">Detecção & Curadoria</span>
              <h3 className="text-sm font-semibold text-white truncate max-w-[200px] mt-0.5">{selectedNode.title}</h3>
            </div>
            <button onClick={() => setSelectedNodeId(null)} className="text-xs text-white/40 hover:text-white transition-colors">
              Fechar
            </button>
          </div>

          <div className="p-5 space-y-6 flex-grow">
            {actionStatus && (
              <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] rounded-xl text-center">
                {actionStatus}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">Curadoria de Núcleo</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleValidateNode(selectedNode.id, 'validar')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  <ShieldCheck size={13} /> Validar
                </button>
                <button
                  onClick={() => handleValidateNode(selectedNode.id, 'rejeitar')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <XCircle size={13} /> Rejeitar
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRelation} className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">Criar Nova Ligação</label>
              <select
                value={targetNodeId}
                onChange={e => setTargetNodeId(e.target.value)}
                className="w-full bg-[#131315] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-[#ff8533]"
                required
              >
                <option value="">Selecionar destino...</option>
                {nodes.filter(n => n.id !== selectedNodeId).map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
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
                  type="range" min="0.1" max="1.0" step="0.05"
                  value={relWeight}
                  onChange={e => setRelWeight(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff8533]"
                />
              </div>
              <button
                type="submit" disabled={submittingRelation}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs bg-[#ff8533]/10 border border-[#ff8533]/20 text-[#ff8533] rounded-lg hover:bg-[#ff8533]/20 transition-colors disabled:opacity-50"
              >
                <Plus size={12} /> {submittingRelation ? 'Salvando...' : 'Inserir Ligação'}
              </button>
            </form>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-white/35">
                Ligações Ativas ({selectedNodeLinks.length})
              </label>
              {selectedNodeLinks.length === 0 ? (
                <p className="text-[10px] text-white/20 italic">Nenhuma ligação registrada.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedNodeLinks.map(link => {
                    const isFromMe = link.fromNode === selectedNodeId;
                    const otherNodeId = isFromMe ? link.toNode : link.fromNode;
                    const otherNode = nodes.find(n => n.id === otherNodeId);
                    return (
                      <div key={link.id} className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="text-[9px] font-mono text-white/30 uppercase block">
                            {translateRelationType(link.tipo_relacao || '')} ({Math.round((link.peso || 0.8) * 100)}%)
                          </span>
                          <span className="text-white/80 font-light truncate block">
                            {isFromMe ? '→' : '←'} {otherNode?.title || otherNodeId.substring(0, 8)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveRelation(link.id)}
                          className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedNodeLinks.some(l => l.hash_dna) && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-purple-300/60 flex items-center gap-1.5">
                  <Hash size={12} /> DNA Semântico
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedNodeLinks.filter(l => l.hash_dna).map(link => (
                    <div key={link.id} className="bg-purple-900/10 border border-purple-500/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-purple-300 font-semibold font-mono tracking-wider">DNA SHA-256</span>
                        <button onClick={() => copyToClipboard(link.hash_dna || '')} className="p-1 text-purple-300/60 hover:text-purple-300">
                          <Clipboard size={12} />
                        </button>
                      </div>
                      <p className="text-[8px] font-mono text-purple-200 break-all bg-black/40 p-1.5 rounded-lg border border-purple-500/5">
                        {link.hash_dna}
                      </p>
                      {link.metadados?.externalApis?.length > 0 && (
                        <p className="text-[9px] text-white/50 flex items-center gap-1">
                          <Globe size={9} className="text-[#00A3FF]" />
                          Correspondido com {link.metadados.externalApis[0].fonte.toUpperCase()}
                        </p>
                      )}
                      {link.metadados?.bibliographies && (
                        <p className="text-[9px] text-white/50 flex items-center gap-1">
                          <FileText size={9} className="text-[#34C759]" /> DNA Registro Imutável
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/5 bg-black/30 text-center text-[10px] text-white/20 italic">
            Clique no canvas para cancelar a seleção.
          </div>
        </div>
      )}
    </div>
  );
}
