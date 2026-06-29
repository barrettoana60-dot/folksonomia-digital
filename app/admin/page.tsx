'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Tag as TagIcon, Database, BarChart3, Plus, Trash2, ExternalLink, 
  FileText, Download, Share2, TrendingUp, Clock, PieIcon, 
  CheckCircle2, Settings, ChevronRight, ShieldCheck, Network, Globe, 
  Search, ArrowUpRight, X, AlertCircle, Activity, Cpu, AlertTriangle, CheckCircle, Brain, BookOpen, ArrowRight
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Logo from '@/components/Logo';
import NodeGraph from '@/components/NodeGraph';

const tabs = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'obras', label: 'Gestão de Obras' },
  { id: 'tags', label: 'Análise de Tags' },
  { id: 'relatorios', label: 'Relatório Semântico' },
  { id: 'interoperabilidade', label: 'Interoperabilidade Cultural' },
  { id: 'ontologia', label: 'Ontologias' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('visao');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Real Analytics State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State for Nova Obra
  const [obraForm, setObraForm] = useState({ titulo: '', descricao: '', imagem_url: '', artista: '', ano: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Obras List State
  const [obrasList, setObrasList] = useState<any[]>([]);
  const [obrasLoading, setObrasLoading] = useState(false);

  // Modals UI State
  const [showOntologiaForm, setShowOntologiaForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Relatório Semântico State
  const [searchTag, setSearchTag] = useState('');
  const [semanticResult, setSemanticResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Análise de Tags State (ML)
  const [tagAnalysisResult, setTagAnalysisResult] = useState<any>(null);
  const [selectedTagForAnalysis, setSelectedTagForAnalysis] = useState<string | null>(null);
  const [isAnalyzingTag, setIsAnalyzingTag] = useState(false);

  // ML Service Health
  const [mlHealth, setMlHealth] = useState<any>(null);
  const [mlChecking, setMlChecking] = useState(true);

  const handleTagAnalysis = async (tagText: string) => {
    setSelectedTagForAnalysis(tagText);
    setIsAnalyzingTag(true);
    setTagAnalysisResult(null);
    try {
      const res = await fetch('/api/admin/tag-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagText })
      });
      const json = await res.json();
      if (json.success) setTagAnalysisResult(json.data);
    } catch (err) {
      console.error('Erro na análise de tag:', err);
    } finally {
      setIsAnalyzingTag(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchTag.trim()) return;
    setIsAnalyzing(true);
    setSemanticResult(null);
    try {
      const res = await fetch('/api/admin/relatorio-semantico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: searchTag })
      });
      const json = await res.json();
      if (json.success) setSemanticResult(json.data);
    } catch (err) {
      console.error('Erro na análise semântica:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar obras do Supabase
  const fetchObras = async () => {
    setObrasLoading(true);
    try {
      const res = await fetch('/api/admin/obras', { cache: 'no-store' });
      if (!res.ok) {
        console.error('Erro HTTP ao buscar obras:', res.status, res.statusText);
        setObrasLoading(false);
        return;
      }
      const json = await res.json();
      console.log('Obras recebidas do API:', json);
      if (json.success) {
        setObrasList(json.data || []);
      } else {
        console.error('Erro na resposta da API:', json.error);
      }
    } catch (err) {
      console.error('Erro ao buscar obras:', err);
    } finally {
      setObrasLoading(false);
    }
  };

  const handleDeleteObra = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) return;
    try {
      const res = await fetch('/api/admin/obras', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setObrasList(prev => prev.filter(o => o.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Carregar dados na montagem E quando trocar de aba
  useEffect(() => {
    fetchDashboard();
    if (activeTab === 'obras') fetchObras();
  }, [activeTab]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Verificar saúde do ML Service
  useEffect(() => {
    const checkML = async () => {
      setMlChecking(true);
      try {
        const res = await fetch('/api/ml/status', { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          setMlHealth(json);
        } else {
          setMlHealth(null);
        }
      } catch {
        setMlHealth(null);
      } finally {
        setMlChecking(false);
      }
    };
    checkML();
  }, []);

  const handleAddObra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obraForm)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const newObra = json.data;
          setObrasList(prev => [newObra, ...prev]);
          setShowAddForm(false);
          setObraForm({ titulo: '', descricao: '', imagem_url: '', artista: '', ano: '' });
          setImagePreview(null);
          alert('Obra adicionada com sucesso!');
        } else {
          alert('Erro ao adicionar obra: ' + json.error);
        }
      } else {
        alert('Erro ao adicionar obra.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na requisição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(resizedBase64);
          setObraForm({...obraForm, imagem_url: resizedBase64});
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const stats = [
    { label: 'Volume de Dados', value: dashboardData?.visaoGeral.totalDados || 0, icon: Database, color: '#E85002' },
    { label: 'Usuários Únicos', value: dashboardData?.visaoGeral.usuarios || 0, icon: Users, color: '#E85002' },
    { label: 'Tags Criadas', value: dashboardData?.visaoGeral.tags || 0, icon: TagIcon, color: '#E85002' },
    { label: 'Registros Validados', value: dashboardData?.visaoGeral.validados || 0, icon: ShieldCheck, color: '#00FF00' },
  ];

  // Estado do modal do grafo
  const [graphNodeSelected, setGraphNodeSelected] = useState<any>(null);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    const addedNodes = new Set<string>();

    const recentTags = dashboardData?.relatorioSemantico?.recentTags || [];
    
    for (const tagObj of recentTags) {
      const tagName = tagObj.tag;
      if (!addedNodes.has(tagName)) {
        nodes.push({ id: tagName, group: 1, val: 20 });
        addedNodes.add(tagName);
      }
      // Conectar tag ao seu grupo (se não for "Outros")
      if (tagObj.grupo && tagObj.grupo !== 'Outros') {
        if (!addedNodes.has(tagObj.grupo)) {
          nodes.push({ id: tagObj.grupo, group: 2, val: 30 });
          addedNodes.add(tagObj.grupo);
        }
        links.push({ source: tagName, target: tagObj.grupo });
      }
    }

    // Conectar tags do mesmo grupo entre si
    const groupMap: Record<string, string[]> = {};
    for (const tagObj of recentTags) {
      const g = tagObj.grupo || 'Outros';
      if (g !== 'Outros') {
        if (!groupMap[g]) groupMap[g] = [];
        groupMap[g].push(tagObj.tag);
      }
    }
    for (const members of Object.values(groupMap)) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          links.push({ source: members[i], target: members[j] });
        }
      }
    }

    // Fallback se não houver dados
    if (nodes.length === 0) {
      nodes.push({ id: 'Aguardando dados...', group: 3, val: 10 });
    }

    return { nodes, links };
  }, [dashboardData]);

  const nodeGraphData = useMemo(() => {
    const nodesList = (graphData.nodes || []).map((node: any, index: number) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const isGroup = node.group === 2;
      return {
        id: node.id,
        title: isGroup ? 'Grupo Temático' : 'Núcleo / Tag',
        subtitle: isGroup ? 'CATEGORIA' : 'CONCEITO',
        x: 50 + col * 340,
        y: 40 + row * 240,
        width: 280,
        height: 160,
        inputs: [{ id: `in-${node.id}`, label: 'Origem' }],
        outputs: [{ id: `out-${node.id}`, label: 'Destino' }],
        type: isGroup ? 'engine' : 'prompt',
        status: node.status || (isGroup ? 'validado' : 'em_analise'),
        content: (
          <div className="space-y-2 text-xs">
            <div className="bg-white/550/30 p-2.5 rounded-xl border border-black/07 flex items-center justify-between">
              <span className="font-semibold text-white/90 truncate mr-2">{node.id}</span>
              <button 
                onClick={() => {
                  handleTagAnalysis(node.id);
                  setGraphNodeSelected(node.id);
                }}
                className="text-[10px] text-[#00A3FF] hover:underline flex-shrink-0"
              >
                Analisar
              </button>
            </div>
          </div>
        )
      };
    });

    const linksList = (graphData.links || []).map((link: any, idx: number) => {
      const fromId = typeof link.source === 'object' ? link.source.id : link.source;
      const toId = typeof link.target === 'object' ? link.target.id : link.target;
      return {
        id: link.id || `l-${idx}-${fromId}-${toId}`,
        fromNode: fromId,
        fromSocket: `out-${fromId}`,
        toNode: toId,
        toSocket: `in-${toId}`,
        tipo_relacao: link.tipo_relacao || 'closeMatch',
        peso: link.peso || 0.8,
        hash_dna: link.hash_dna,
        metadados: link.metadados
      };
    });

    return { nodes: nodesList, links: linksList };
  }, [graphData]);

  const handleExportCSV = () => {
    const data = [['ID', 'Obra', 'Tag', 'Visitante', 'Data'], ['1', 'Guernica', 'Caos', 'Visitante #A2', '2026-04-26']];
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'relatorio_folksonomia.csv'; 
    a.click();
  };

  const handleExportPDF = () => {
    if (!semanticResult) return;

    const tag = semanticResult.tag || '';
    const certeza = semanticResult.motores?.transformer?.certeza ?? '—';
    const aguardando = semanticResult.motores?.transformer?.aguardandoTreino;
    const tesauro = semanticResult.tesauro?.contexto || '';
    const termosExpandidos: string[] = semanticResult.tesauro?.termosExpandidos || [];
    const estruturado = semanticResult.relatorioEstruturado;
    const analiseEscrita = semanticResult.analiseEscrita || '';
    const deducaoCognitiva = estruturado ? estruturado.deducao : analiseEscrita;
    const matrizCruzadaTexto = estruturado ? estruturado.factual : `As obras listadas nos acervos nacionais demonstraram proximidade através dos motores de busca semânticos (PPLM). Foram computadas conexões transversais entre os ${ibramTotal} registros do IBRAM e os ${brasilianaTotal} registros da Brasiliana Museus.`;

    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const ibramTotal = semanticResult.correlacoes?.ibram?.total ?? 0;
    const brasilianaTotal = semanticResult.correlacoes?.brasiliana?.total ?? 0;
    const internasTotal = semanticResult.correlacoes?.internas?.total ?? 0;
    const internas: any[] = semanticResult.correlacoes?.internas?.items || [];

    const doc = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório Semântico NUGEP — ${tag}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', Arial, sans-serif;
            background: #fff;
            color: #1a1a1a;
            padding: 0;
          }
          /* MARCA D'ÁGUA — aparece em todas as páginas */
          @page { margin: 2cm 2.2cm; }
          .watermark-pdf {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 65px;
            font-weight: 900;
            color: rgba(200, 60, 0, 0.1);
            white-space: nowrap;
            pointer-events: none;
            z-index: -1;
            letter-spacing: 0.05em;
          }
          .page { position: relative; z-index: 1; }
          /* CABEÇALHO */
          .header {
            border-bottom: 3px solid #c44000;
            padding-bottom: 20px;
            margin-bottom: 32px;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .institution { font-size: 11px; color: #888; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; }
          .system-name { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #111; }
          .report-type { font-size: 13px; color: #c44000; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em; }
          .date-block { text-align: right; font-size: 10px; color: #999; }
          .nugep-badge {
            display: inline-block;
            background: #c44000;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            padding: 3px 10px;
            border-radius: 4px;
            margin-top: 6px;
          }
          /* BLOCO DA TAG */
          .tag-block {
            background: #fff5f0;
            border-left: 4px solid #c44000;
            padding: 20px 24px;
            margin-bottom: 28px;
            border-radius: 0 6px 6px 0;
          }
          .tag-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; color: #999; font-weight: 700; margin-bottom: 6px; }
          .tag-value { font-size: 32px; font-weight: 900; color: #c44000; letter-spacing: 0.02em; }
          .tag-meta { display: flex; gap: 24px; margin-top: 12px; }
          .tag-stat { text-align: center; }
          .tag-stat-val { font-size: 20px; font-weight: 700; color: #111; }
          .tag-stat-lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.15em; color: #999; }
          /* CERTEZA */
          .certeza-block {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 16px 20px;
            background: ${aguardando ? '#fffbea' : '#f0fdf4'};
            border: 1px solid ${aguardando ? '#fde68a' : '#86efac'};
            border-radius: 8px;
            margin-bottom: 28px;
          }
          .certeza-num { font-size: 44px; font-weight: 900; color: ${aguardando ? '#d97706' : '#16a34a'}; }
          .certeza-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${aguardando ? '#92400e' : '#166534'}; }
          .certeza-desc { font-size: 11px; color: #666; margin-top: 4px; line-height: 1.5; }
          /* SEÇÕES */
          .section { margin-bottom: 28px; page-break-inside: avoid; }
          .section-title {
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            color: #c44000;
            border-bottom: 1px solid #f0ddd8;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .section-body {
            font-size: 12px;
            line-height: 1.85;
            color: #333;
            white-space: pre-wrap;
          }
          .tesauro-box {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 16px 20px;
          }
          .termos-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
          .termo-badge {
            background: #fef3c7;
            color: #92400e;
            font-size: 10px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 20px;
            border: 1px solid #fde68a;
          }
          .tags-internas { display: flex; flex-wrap: wrap; gap: 8px; }
          .tag-interna {
            background: #fff5f0;
            color: #c44000;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid #fecaca;
          }
          /* RODAPÉ */
          .footer {
            border-top: 1px solid #e5e7eb;
            margin-top: 40px;
            padding-top: 14px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #aaa;
            letter-spacing: 0.08em;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="watermark-pdf">USO EXCLUSIVO DO NUGEP</div>
        <div class="page">
          <div class="header">
            <div class="header-top">
              <div>
                <p class="system-name">Folksonomia Digital 2.0</p>
                <p class="report-type">Relatório Semântico — Análise de Tag</p>
              </div>
              <div class="date-block">
                <p>Gerado em</p>
                <p style="font-weight:700; color:#111; font-size:11px;">${dataGeracao}</p>
                <span class="nugep-badge">⬣ Uso Exclusivo do NUGEP</span>
              </div>
            </div>
          </div>

          <div class="tag-block">
            <p class="tag-label">Tag Analisada</p>
            <p class="tag-value">${tag}</p>
            <div class="tag-meta">
              <div class="tag-stat"><p class="tag-stat-val">${ibramTotal}</p><p class="tag-stat-lbl">Registros IBRAM</p></div>
              <div class="tag-stat"><p class="tag-stat-val">${brasilianaTotal}</p><p class="tag-stat-lbl">Itens Brasiliana</p></div>
              <div class="tag-stat"><p class="tag-stat-val">${internasTotal}</p><p class="tag-stat-lbl">Tags Correlatas</p></div>
            </div>
          </div>

          <div class="certeza-block">
            <div class="certeza-num">${certeza}%</div>
            <div>
              <p class="certeza-label">${aguardando ? 'Sistema aprendendo' : 'Certeza Matemática Atingida'}</p>
              <p class="certeza-desc">${aguardando
                ? 'O sistema não atingiu a margem de 95% de certeza. Fará uma busca mais profunda nas bases de dados e devolverá a resposta definitiva quando alcançar o threshold necessário.'
                : 'O raciocínio lógico-vetorial atingiu o threshold de 95%, confirmando a correlação semântica desta tag com o acervo institucional.'
              }</p>
            </div>
          </div>

          ${tesauro ? `
          <div class="section">
            <p class="section-title">Tesauro CNFCP / IPHAN — Definição Normativa</p>
            <div class="tesauro-box">
              <p class="section-body">${tesauro.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              ${termosExpandidos.length > 0 ? `
              <div class="termos-list">
                ${termosExpandidos.map((t: string) => `<span class="termo-badge">${t}</span>`).join('')}
              </div>` : ''}
            </div>
          </div>` : ''}

          <div class="section">
            <p class="section-title">Conexões Cruzadas e Malha Vetorial</p>
            <div class="tesauro-box" style="background: #f8fafc; border-color: #cbd5e1;">
              <p class="section-body">${matrizCruzadaTexto.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </div>

          ${internas.length > 0 ? `
          <div class="section">
            <p class="section-title">Matriz Inter-Tags (Ecossistema Interno)</p>
            <div class="tags-internas">
              ${internas.slice(0, 20).map((t: any) => `<span class="tag-interna">${t.tag_original} → ${t.grupo_tematico || 'Outros'}</span>`).join('')}
            </div>
          </div>` : ''}

          <div class="section">
            <p class="section-title">Dedução Cognitiva da Inteligência Artificial</p>
            <div class="tesauro-box" style="background: #fff; border-color: #e2e8f0; border-left: 4px solid #0f172a;">
              <p class="section-body" style="font-size: 11px; font-weight: 600;">${deducaoCognitiva.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              ${estruturado ? `<p class="section-body" style="font-size: 9px; margin-top: 12px; color: #64748b;">[OPERAÇÃO VETORIAL DA IA: ${estruturado.vetorial}]</p>` : ''}
            </div>
          </div>

          <div class="footer">
            <span>Sistema de Folksonomia Digital 2.0</span>
            <span>Documento de uso exclusivo do NUGEP</span>
            <span>${dataGeracao}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(doc);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 print:pt-0">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
        
        {/* LOGO INSTITUCIONAL */}
        <div className="flex items-center gap-6 pb-6 border-b border-black/07 print:border-black/10 print:pb-10 print:mb-10">
          <Logo className="w-12 h-12 md:w-16 md:h-16" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-normal print:text-black">
              Sistema de Folksonomia Digital
            </h1>
            <p className="text-[9px] md:text-[11px] uppercase font-medium tracking-[0.2em] text-[#1A1A1A]/38 print:text-black/50">
              Gestão Semântica Institucional — NUGEP
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-black/07 print:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-5 md:px-7 py-2.5 rounded-xl text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white border border-black/18 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'text-[#1A1A1A]/45 border-transparent hover:text-white hover:bg-white/550'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {activeTab === 'visao' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
                {stats.map((s, i) => (
                  <div key={i} className="glass-card p-6 md:p-10 flex flex-col items-center text-center space-y-3 md:space-y-6">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-black/10 flex items-center justify-center bg-white/550">
                      <s.icon size={20} className="md:size-[28px]" style={{ color: s.color }} />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-2xl md:text-4xl font-normal serif-title text-white tracking-tight">{s.value}</p>
                      <p className="text-[8px] md:text-[11px] uppercase tracking-[0.12em] text-[#1A1A1A]/45 font-semibold">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'obras' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal">Gestão de Obras</h2>
                    <button onClick={() => setShowAddForm(true)} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Obra</button>
                 </div>
                 
                 {showAddForm && (
                   <div className="fixed inset-0 z-50 bg-white/550/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-2xl relative animate-fade-in">
                       <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-[#1A1A1A]/55 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-lg serif-title mb-6">Adicionar Nova Obra</h3>
                       <form onSubmit={handleAddObra} className="space-y-4">
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Título</label>
                           <input required value={obraForm.titulo} onChange={e => setObraForm({...obraForm, titulo: e.target.value})} className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Cálice Colonial" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Autor/Artista</label>
                             <input value={obraForm.artista} onChange={e => setObraForm({...obraForm, artista: e.target.value})} className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                           <div>
                             <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Ano</label>
                             <input value={obraForm.ano} onChange={e => setObraForm({...obraForm, ano: e.target.value})} className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Descrição</label>
                           <textarea value={obraForm.descricao} onChange={e => setObraForm({...obraForm, descricao: e.target.value})} rows={3} className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none"></textarea>
                         </div>
                         <div>
                            <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider mb-2 block">Foto da Obra</label>
                            <div 
                              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-[#E85002] bg-[#E85002]/10' : imagePreview ? 'border-orange-500/30 bg-orange-500/5' : 'border-black/10 hover:border-black/15 bg-white/550'}`}
                              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                              onDragLeave={() => setIsDragging(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                const file = e.dataTransfer.files[0];
                                if (file) handleImageUpload(file);
                              }}
                              onClick={() => document.getElementById('obra-file-input')?.click()}
                            >
                              <input 
                                id="obra-file-input"
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file);
                                }}
                              />
                              {imagePreview ? (
                                <div className="space-y-3">
                                  <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg border border-black/10 object-contain" />
                                  <p className="text-[11px] text-orange-400 uppercase tracking-wider font-semibold">✓ Foto carregada — clique para trocar</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-12 h-12 mx-auto rounded-full bg-white/550 border border-black/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A1A1A]/35"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                  </div>
                                  <p className="text-[#1A1A1A]/45 text-xs">Arraste uma foto aqui ou clique para selecionar</p>
                                  <p className="text-[#1A1A1A]/25 text-[10px] uppercase tracking-wider font-medium">JPG, PNG, WebP</p>
                                </div>
                              )}
                            </div>
                          </div>
                         <button disabled={isSubmitting} type="submit" className="w-full liquid-button !bg-[#E85002] mt-4">
                           {isSubmitting ? 'Salvando...' : 'Salvar Obra no Supabase'}
                         </button>
                       </form>
                     </div>
                   </div>
                 )}

                 {/* GALERIA REAL DE OBRAS */}
                 {obrasLoading ? (
                   <div className="glass-card p-12 text-center">
                     <div className="w-8 h-8 border-2 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                     <p className="text-[#1A1A1A]/38 uppercase tracking-wider font-semibold text-xs">Carregando obras do Supabase...</p>
                   </div>
                 ) : obrasList.length === 0 ? (
                   <div className="glass-card p-12 text-center">
                     <Database size={48} className="mx-auto text-[#1A1A1A]/15 mb-6" />
                     <p className="text-[#1A1A1A]/38 uppercase tracking-wider font-semibold text-xs">Nenhuma obra cadastrada ainda. Clique em "+ Nova Obra" para começar.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {obrasList.map((obra) => (
                       <div key={obra.id} className="glass-card overflow-hidden group hover:border-[#E85002]/30 transition-all duration-300">
                         {obra.imagem_url ? (
                           <div className="h-48 overflow-hidden bg-white/550/30">
                             <img src={obra.imagem_url} alt={obra.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                         ) : (
                           <div className="h-48 bg-gradient-to-br from-[#E85002]/10 to-transparent flex items-center justify-center">
                             <Database size={48} className="text-[#1A1A1A]/15" />
                           </div>
                         )}
                         <div className="p-5 space-y-3">
                           <h3 className="text-base font-normal serif-title tracking-normal leading-tight">{obra.titulo}</h3>
                           {obra.artista && <p className="text-[11px] text-[#E85002] font-semibold uppercase tracking-wider">{obra.artista}</p>}
                           {obra.ano && <p className="text-[10px] text-[#1A1A1A]/48 uppercase tracking-wider">Ano: {obra.ano}</p>}
                           {obra.descricao && <p className="text-xs text-[#1A1A1A]/55 line-clamp-2">{obra.descricao}</p>}
                           <div className="flex items-center justify-between pt-3 border-t border-black/07">
                             <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/38 font-semibold">
                               <TagIcon size={10} className="inline mr-1" />
                               {obra.total_tags || 0} tags
                             </span>
                             <div className="flex gap-2">
                               <button
                                 onClick={() => handleDeleteObra(obra.id)}
                                 className="text-[#1A1A1A]/25 hover:text-red-400 transition-colors p-1"
                                 title="Excluir obra"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'tags' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                   <div>
                     <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal">Análise de Tags</h2>
                     <p className="text-[10px] uppercase tracking-wider font-semibold text-[#1A1A1A]/38 mt-1">Motor ML: deduplicação, famílias temáticas, erros ortográficos, correlações inter-tags</p>
                   </div>
                   <button onClick={() => { setTagAnalysisResult(null); setSelectedTagForAnalysis(null); }} className="liquid-button !bg-white/550 text-[11px] font-semibold tracking-wider">Limpar Análise</button>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Lista de tags recentes */}
                   <div className="glass-card p-8">
                     <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-6">
                       <TagIcon className="text-[#E85002]" size={18} /> Tags no Sistema
                     </h3>
                     <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {dashboardData?.relatorioSemantico?.recentTags?.length > 0 ? (
                          dashboardData.relatorioSemantico.recentTags.map((tagObj: any, i: number) => (
                            <div key={tagObj.id || i} className={`p-4 rounded-lg border flex justify-between items-center cursor-pointer transition-all ${
                              selectedTagForAnalysis === tagObj.tag 
                                ? 'bg-[#E85002]/10 border-[#E85002]/40' 
                                : 'bg-white/550 border-black/10 hover:border-black/15'
                            }`} onClick={() => handleTagAnalysis(tagObj.tag)}>
                              <div>
                                <span className="text-[#E85002] font-serif italic text-lg">&quot;{tagObj.tag}&quot;</span>
                                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A]/48 mt-1">
                                  {tagObj.grupo !== 'Outros' ? tagObj.grupo : 'Clique para analisar'}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-[#1A1A1A]/35" />
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-[#1A1A1A]/48 text-[11px] font-semibold uppercase tracking-wider border border-black/07 rounded-lg">
                            Nenhuma tag criada ainda
                          </div>
                        )}
                     </div>
                   </div>

                   {/* Resultado da análise ML da tag selecionada */}
                   <div className="space-y-4">
                     {isAnalyzingTag && (
                       <div className="glass-card p-12 text-center">
                         <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                         <p className="text-[#1A1A1A]/48 text-[11px] uppercase tracking-wider font-semibold">Analisando tag com motor ML...</p>
                       </div>
                     )}

                     {tagAnalysisResult && !isAnalyzingTag && (
                       <>
                         {/* Identidade da Tag */}
                         <div className="glass-card p-6 space-y-4">
                           <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                             <Network size={16} className="text-[#E85002]" /> Identidade Semântica
                           </h3>
                           <div className="flex items-center gap-3">
                             <span className="text-2xl font-serif italic text-[#E85002]">&quot;{tagAnalysisResult.tag}&quot;</span>
                             {tagAnalysisResult.family && (
                               <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] uppercase font-semibold tracking-wider text-purple-400">
                                 {tagAnalysisResult.family.name}
                               </span>
                             )}
                             {!tagAnalysisResult.family && (
                               <span className="px-3 py-1 bg-white/550 border border-black/10 rounded-full text-[10px] uppercase font-semibold tracking-wider text-[#1A1A1A]/45">
                                 Sem família detectada
                               </span>
                             )}
                           </div>
                           {tagAnalysisResult.family && (
                             <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                               <p className="text-[11px] uppercase font-semibold tracking-wider text-purple-400 mb-3">Membros desta família</p>
                               <div className="flex flex-wrap gap-2">
                                 {tagAnalysisResult.family.members.slice(0, 12).map((m: string, i: number) => (
                                   <span key={i} className={`px-2 py-1 rounded text-[10px] font-bold ${
                                     m.toLowerCase() === tagAnalysisResult.tag.toLowerCase() 
                                       ? 'bg-[#E85002]/20 text-[#E85002] border border-[#E85002]/30' 
                                       : 'bg-purple-500/10 text-purple-300'
                                   }`}>{m}</span>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Duplicatas e erros */}
                         {tagAnalysisResult.duplicates?.length > 0 && (
                           <div className="glass-card p-6 border border-red-500/20 space-y-3">
                             <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                               <AlertCircle size={16} className="text-red-400" /> Duplicatas / Erros Detectados ({tagAnalysisResult.duplicates.length})
                             </h3>
                             {tagAnalysisResult.duplicates.map((d: any, i: number) => (
                               <div key={i} className="p-3 bg-red-500/5 rounded-lg flex items-center justify-between">
                                 <div>
                                   <span className="text-[#1A1A1A]/80 font-serif italic">&quot;{d.tag}&quot;</span>
                                   <span className="text-[10px] text-[#1A1A1A]/38 ml-2">({Math.round(d.score * 100)}% similar)</span>
                                 </div>
                                 <span className="text-[10px] text-red-400/85 italic max-w-[50%] text-right">{d.reason}</span>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Tags relacionadas */}
                         {tagAnalysisResult.siblings?.length > 0 && (
                           <div className="glass-card p-6 border border-blue-500/20 space-y-3">
                             <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                               <Share2 size={16} className="text-blue-400" /> Tags Relacionadas ({tagAnalysisResult.siblings.length})
                             </h3>
                             {tagAnalysisResult.siblings.slice(0, 8).map((s: any, i: number) => (
                               <div key={i} className="p-3 bg-blue-500/5 rounded-lg flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <span className="text-[#1A1A1A]/80 font-serif italic">&quot;{s.tag}&quot;</span>
                                   <div className="flex items-center gap-1">
                                     <div className="h-1 w-16 bg-white/550 rounded-full overflow-hidden">
                                       <div className="h-full bg-blue-400" style={{ width: `${s.score * 100}%` }} />
                                     </div>
                                     <span className="text-[10px] text-[#1A1A1A]/38 font-semibold">{Math.round(s.score * 100)}%</span>
                                   </div>
                                 </div>
                                 <span className="text-[10px] text-blue-400/85 italic max-w-[45%] text-right">{s.reason}</span>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Sugestões do ML */}
                         {tagAnalysisResult.suggestions?.length > 0 && (
                           <div className="glass-card p-6 space-y-2">
                             <h3 className="text-xs font-semibold uppercase tracking-wider mb-3">Sugestões do Cérebro</h3>
                             {tagAnalysisResult.suggestions.map((s: string, i: number) => (
                               <p key={i} className="text-[11px] text-[#1A1A1A]/60 leading-relaxed flex items-start gap-2">
                                 <span className="text-[#E85002] mt-0.5">→</span> {s}
                               </p>
                             ))}
                           </div>
                         )}

                         {/* Conexões Propagadas (A→B + B→C = A↔C) */}
                         {tagAnalysisResult.propagated?.length > 0 && (
                           <div className="glass-card p-6 border border-orange-500/20 space-y-3">
                             <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                               <TrendingUp size={16} className="text-orange-400" /> Conexões Propagadas ({tagAnalysisResult.propagated.length})
                             </h3>
                             <p className="text-[10px] text-[#1A1A1A]/38 uppercase tracking-wider">Inferidas automaticamente: se A→B e B→C, então A↔C</p>
                             {tagAnalysisResult.propagated.map((p: any, i: number) => (
                               <div key={i} className="p-3 bg-orange-500/5 rounded-lg">
                                 <div className="flex items-center justify-between">
                                   <span className="text-[#1A1A1A]/80 font-serif italic">&quot;{p.tag}&quot;</span>
                                   <span className="text-[10px] text-orange-400/80 font-semibold">{Math.round(p.score * 100)}% confiança</span>
                                 </div>
                                 <p className="text-[10px] text-[#1A1A1A]/48 italic mt-1">{p.reason}</p>
                               </div>
                             ))}
                           </div>
                         )}

                         {/* DNA Semântico */}
                         {tagAnalysisResult.dna && (
                           <div className="glass-card p-6 space-y-4">
                             <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                               <Database size={16} className="text-[#E85002]" /> DNA Semântico
                             </h3>
                             <div className="space-y-2">
                               {Object.entries(tagAnalysisResult.dna)
                                 .filter(([, val]) => (val as number) > 0)
                                 .sort(([, a], [, b]) => (b as number) - (a as number))
                                 .map(([key, val]) => {
                                   const labels: Record<string, string> = { period: 'Período', technique: 'Técnica', geography: 'Geografia', material: 'Material', theme: 'Temática', provenance: 'Proveniência', movement: 'Movimento' };
                                   return (
                                     <div key={key} className="flex items-center gap-3">
                                       <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/48 w-24 text-right font-semibold">{labels[key] || key}</span>
                                       <div className="h-2 flex-1 bg-white/550 rounded-full overflow-hidden">
                                         <div className="h-full bg-gradient-to-r from-[#E85002] to-[#F16001] transition-all duration-700" style={{ width: `${(val as number) * 100}%` }} />
                                       </div>
                                       <span className="text-[10px] text-[#1A1A1A]/38 font-semibold w-10">{Math.round((val as number) * 100)}%</span>
                                     </div>
                                   );
                                 })}
                             </div>
                           </div>
                         )}

                         {/* Rastro Neural (Tráfego de Informação) */}
                         {tagAnalysisResult.traces?.length > 0 && (
                           <div className="glass-card p-6 space-y-3">
                             <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                               <Clock size={16} className="text-[#1A1A1A]/55" /> Rastro Neural ({tagAnalysisResult.totalTraces || tagAnalysisResult.traces.length} eventos)
                             </h3>
                             <p className="text-[10px] text-[#1A1A1A]/38 uppercase tracking-wider">De onde veio → Para onde vai</p>
                             <div className="space-y-2 max-h-48 overflow-y-auto">
                               {tagAnalysisResult.traces.slice(0, 10).map((t: any, i: number) => {
                                 const actionColors: Record<string, string> = {
                                   'INGESTAO': 'text-blue-400 bg-blue-500/10',
                                   'CORRELACAO': 'text-purple-400 bg-purple-500/10',
                                   'PROPAGACAO': 'text-orange-400 bg-orange-500/10',
                                   'APRENDIZADO': 'text-yellow-400 bg-yellow-500/10',
                                   'VALIDACAO': 'text-orange-400 bg-orange-500/10',
                                   'CONEXAO': 'text-[#E85002] bg-[#E85002]/10'
                                 };
                                 const colorClass = actionColors[t.action] || 'text-[#1A1A1A]/55 bg-white/550';
                                 return (
                                   <div key={t.id || i} className="flex items-center gap-2 text-[10px]">
                                     <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-semibold tracking-wider ${colorClass}`}>{t.action}</span>
                                     <span className="text-[#1A1A1A]/35">{t.origin}</span>
                                     <span className="text-white/15">→</span>
                                     <span className="text-[#1A1A1A]/55">{t.destination}</span>
                                     <span className="text-white/15 ml-auto">{Math.round(t.confidence * 100)}%</span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         )}

                         {/* Botão para análise completa no Relatório Semântico */}
                         <button onClick={() => { setSearchTag(tagAnalysisResult.tag); setActiveTab('relatorios'); setTimeout(() => handleSemanticSearch(), 300); }} className="w-full liquid-button !bg-[#E85002] flex items-center justify-center gap-2">
                           <Globe size={16} /> Análise Completa (IBRAM/Tainacan + Tesauro CNFCP)
                         </button>
                       </>
                     )}

                     {!tagAnalysisResult && !isAnalyzingTag && (
                       <div className="glass-card p-12 text-center">
                         <TagIcon size={48} className="mx-auto text-[#1A1A1A]/15 mb-4" />
                         <p className="text-[#1A1A1A]/38 text-xs uppercase tracking-wider font-semibold">Clique em uma tag à esquerda para ver a análise ML completa</p>
                         <p className="text-[#1A1A1A]/25 text-[10px] uppercase tracking-wider mt-2 font-medium">Família temática • Duplicatas • Erros ortográficos • Tags relacionadas</p>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Volume por grupo */}
                 <div className="glass-card p-8">
                   <h3 className="text-xs font-semibold uppercase tracking-wider mb-6">Volume por Grupo Temático</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {dashboardData?.relatorioSemantico?.topConceitos?.map((c: any, i: number) => {
                       const maxVal = Math.max(...(dashboardData?.relatorioSemantico?.topConceitos?.map((x: any) => x.valor) || [1]));
                       return (
                         <div key={i} className="space-y-2">
                           <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider">
                             <span>{c.nome}</span>
                             <span className="text-[#1A1A1A]/45">{c.valor} tags</span>
                           </div>
                           <div className="h-1.5 bg-white/550 rounded-full overflow-hidden">
                             <div className="h-full bg-[#E85002] transition-all duration-700" style={{ width: `${(c.valor / maxVal) * 100}%` }} />
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'relatorios' && (
              <div className="space-y-8 animate-fade-in print-section">
                {/* Estilos para impressão limpa — somente análise da tag */}
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    /* Reset geral */
                    body { background: white !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    
                    /* Esconder TUDO que não é a análise */
                    nav, header, footer, .print\\:hidden, [class*="print:hidden"] { display: none !important; }
                    
                    /* Sidebar e tabs */
                    aside, [role="navigation"], [role="tablist"] { display: none !important; }
                    
                    /* Cards com borda leve */
                    .glass-card { 
                      border: 1px solid #ddd !important; 
                      box-shadow: none !important; 
                      background: transparent !important; 
                      page-break-inside: avoid;
                      margin-bottom: 12px !important;
                    }
                    
                    /* Tipografia */
                    * { color: #222 !important; }
                    h1, h2, h3, h4 { color: #000 !important; font-weight: bold !important; }
                    .text-\\[\\#E85002\\] { color: #c44000 !important; font-weight: bold; }
                    .text-orange-400, .text-orange-500 { color: #16a34a !important; }
                    .text-blue-400, .text-blue-300 { color: #2563eb !important; }
                    .text-purple-400, .text-purple-300 { color: #7c3aed !important; }
                    .text-amber-400, .text-amber-300 { color: #d97706 !important; }
                    .text-red-400, .text-red-500 { color: #dc2626 !important; }
                    
                    /* Badges e tags coloridas */
                    .bg-\\[\\#E85002\\]\\/10, .bg-blue-500\\/10, .bg-orange-500\\/10, .bg-purple-500\\/10, .bg-amber-500\\/10 { 
                      background: #f5f5f5 !important; 
                      border: 1px solid #ccc !important; 
                    }
                    
                    /* Prose e análise escrita */
                    .prose, .prose * { color: #222 !important; line-height: 1.8 !important; }
                    
                    /* Barras de progresso */
                    .bg-\\[\\#E85002\\] { background: #c44000 !important; }
                    
                    /* Cabeçalho do print */
                    .print-header { display: block !important; }
                    
                    /* Margens */
                    @page { margin: 1.5cm 2cm; }
                    
                    /* Largura */
                    .print-section { max-width: 100% !important; padding: 0 !important; }
                  }
                `}} />
 
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
                  <div>
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal">Relatório Semântico</h2>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[#1A1A1A]/38 mt-1">Análise profunda com cruzamento de dados — ModernBERT + RotatE + GAT</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={handleExportPDF} disabled={!semanticResult} className="liquid-button !bg-white/550 flex items-center gap-2 flex-1 md:flex-none justify-center hover:!bg-white/20 transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed">
                      <FileText size={16} /> Exportar PDF
                    </button>
                    <button onClick={handleExportCSV} className="liquid-button !bg-[#E85002] flex items-center gap-2 flex-1 md:flex-none justify-center">
                      <Download size={16} /> CSV
                    </button>
                  </div>
                </div>
 
                {/* GRÁFICO TEMPORAL RESTAURADO */}
                <div className="glass-card p-8 md:p-12 space-y-8 print:hidden">
                  <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="text-[#E85002]" size={18} /> Fluxo Temporal de Tags (Últimos 7 dias)
                  </h3>
                  <div className="h-48 w-full flex items-end gap-3 border-b border-black/10 pb-2">
                    {dashboardData?.relatorioSemantico?.fluxoTemporal?.map((val: number, i: number) => {
                      const maxVal = Math.max(...(dashboardData?.relatorioSemantico?.fluxoTemporal || [1]), 1);
                      const percent = (val / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 bg-gradient-to-t from-[#E85002] to-[#F16001] rounded-t-lg relative group transition-all duration-500" style={{ height: `${percent}%` }}>
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{val}</span>
                        </div>
                      )
                    }) || (
                      <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/38 text-xs font-semibold uppercase tracking-wider">Carregando dados temporais...</div>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-[#1A1A1A]/35 uppercase tracking-widest">
                    <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                  </div>
                </div>

                {/* Cabeçalho institucional — só aparece no PDF */}
                <div className="print-header hidden mb-8">
                  <div style={{borderBottom: '2px solid #c44000', paddingBottom: '16px', marginBottom: '24px'}}>
                    <h1 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase'}}>Sistema de Folksonomia Digital 2.0</h1>
                    <p style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>Relatório Semântico — Gerado em {new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                    {semanticResult && !semanticResult.tagNaoExiste && (
                      <p style={{fontSize: '18px', fontWeight: 'bold', marginTop: '12px', color: '#c44000'}}>Tag analisada: &quot;{semanticResult.tag}&quot;</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE BUSCA SEMÂNTICA — escondida no print */}
                <div className="glass-card p-6 flex gap-4 items-center print:hidden">
                  <Search size={20} className="text-[#1A1A1A]/35" />
                  <input
                    value={searchTag}
                    onChange={e => setSearchTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
                    placeholder="Buscar tag para análise semântica profunda (ex: espada, liturgia, barroco, cubismo...)"
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-[#1A1A1A]/35"
                  />
                  <button onClick={handleSemanticSearch} disabled={isAnalyzing} className="liquid-button !bg-[#E85002] !px-8">
                    {isAnalyzing ? 'Analisando...' : 'Analisar'}
                  </button>
                </div>


                {/* RESULTADOS DA ANÁLISE */}
                {semanticResult && semanticResult.tagNaoExiste && (
                  <div className="glass-card p-12 text-center border-red-500/30 border">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Tag não encontrada no sistema</h3>
                    <p className="text-[#1A1A1A]/55 text-sm max-w-lg mx-auto">A tag <span className="text-red-400 font-bold">&quot;{semanticResult.tag}&quot;</span> não foi criada por nenhum visitante. Crie a tag primeiro pela interface pública.</p>
                  </div>
                )}

                {semanticResult && !semanticResult.tagNaoExiste && (
                  <div className="space-y-6">
                    <div className="glass-card p-6 border-l-4 border-[#E85002]/50">
                      <h3 className="text-base font-semibold">Resultados para <span className="text-[#E85002] italic font-serif">&quot;{semanticResult.tag}&quot;</span></h3>
                      <div className="flex items-center gap-3">
                        {semanticResult.layers && (
                          <div className="flex gap-2">
                            <span className="px-2 py-1 rounded text-[9px] uppercase font-semibold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">Factual: {semanticResult.layers.factual}</span>
                            <span className="px-2 py-1 rounded text-[9px] uppercase font-semibold tracking-wider bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20">Inferida: {semanticResult.layers.inferred}</span>
                            <span className="px-2 py-1 rounded text-[9px] uppercase font-semibold tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">Validada: {semanticResult.layers.validated}</span>
                          </div>
                        )}
                        <span className={`px-4 py-1 rounded-full text-[10px] uppercase font-semibold tracking-wider border ${
                          semanticResult.profundidade === 'ALTA' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' :
                          semanticResult.profundidade === 'MÉDIA' ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10' :
                          'text-red-500 border-red-500/30 bg-red-500/10'
                        }`}>Profundidade: {semanticResult.profundidade}</span>
                      </div>
                    </div>
 
                    {/* CORRELAÇÃO INTER-TAGS: duplicatas, erros, famílias */}
                    {semanticResult.tagAnalysis && (semanticResult.tagAnalysis.duplicates?.length > 0 || semanticResult.tagAnalysis.siblings?.length > 0 || semanticResult.tagAnalysis.family) && (
                      <div className="glass-card p-6 border border-purple-500/20 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                          <Network size={16} className="text-purple-400" /> Análise Inter-Tags (ML)
                        </h4>
 
                        {/* Duplicatas / Erros ortográficos */}
                        {semanticResult.tagAnalysis.duplicates?.length > 0 && (
                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-red-400 mb-2">Tags Duplicatas / Variantes Detectadas</p>
                            <div className="space-y-2">
                              {semanticResult.tagAnalysis.duplicates.map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-[#1A1A1A]/80">&quot;{d.tag}&quot;</span>
                                  <span className="text-[10px] text-[#1A1A1A]/48 italic max-w-[60%] text-right">{d.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
 
                        {/* Família temática */}
                        {semanticResult.tagAnalysis.family && (
                          <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-purple-400 mb-2">Família: {semanticResult.tagAnalysis.family.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {semanticResult.tagAnalysis.family.members.slice(0, 10).map((m: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-[10px] font-bold">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
 
                        {/* Siblings semânticos */}
                        {semanticResult.tagAnalysis.siblings?.length > 0 && (
                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <p className="text-[11px] uppercase font-semibold tracking-wider text-blue-400 mb-2">Tags Semanticamente Próximas</p>
                            <div className="space-y-2">
                              {semanticResult.tagAnalysis.siblings.slice(0, 5).map((s: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-[#1A1A1A]/80">&quot;{s.tag}&quot; <span className="text-[10px] text-[#1A1A1A]/38">({Math.round(s.score * 100)}%)</span></span>
                                  <span className="text-[10px] text-[#1A1A1A]/48 italic max-w-[50%] text-right">{s.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
 
                        {/* Sugestões */}
                        {semanticResult.tagAnalysis.suggestions?.length > 0 && (
                          <div className="space-y-1">
                            {semanticResult.tagAnalysis.suggestions.map((s: string, i: number) => (
                              <p key={i} className="text-[10px] text-[#1A1A1A]/55 italic">→ {s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cards das fontes COM correlações explicadas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['ibram', 'brasiliana', 'auxiliares'].map(fonte => {
                        const data = semanticResult.correlacoes?.[fonte] || { total: 0, items: [], correlations: [] };
                        const label = fonte === 'ibram' ? 'IBRAM / Tainacan' : fonte === 'brasiliana' ? 'Brasiliana' : 'Fontes Auxiliares';
                        return (
                          <div key={fonte} className="glass-card p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold uppercase tracking-wider">{label}</h4>
                              <span className="text-[#E85002] font-semibold text-lg">{data.total}</span>
                            </div>
                            {fonte === 'ibram' && data.museus?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {data.museus.map((m: string, mi: number) => (
                                  <span key={mi} className="px-2 py-0.5 bg-[#E85002]/10 text-[#E85002] text-[9px] font-semibold uppercase rounded">{m}</span>
                                ))}
                              </div>
                            )}
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {data.items?.map((item: any, i: number) => {
                                const corr = data.correlations?.[i];
                                return (
                                  <div key={i} className="p-3 bg-white/550 rounded-lg border border-black/07 space-y-2">
                                    <p className="text-sm font-semibold leading-tight">{item.titulo}</p>
                                    {item.criador && item.criador !== 'Desconhecido' && <p className="text-[10px] text-[#E85002] font-medium">{item.criador}</p>}
                                    {item.museu && <p className="text-[10px] text-[#1A1A1A]/55">{item.museu} {item.localizacao ? `— ${item.localizacao}` : ''}</p>}
                                    {item.material && <p className="text-[10px] text-[#1A1A1A]/48">Material: {item.material}</p>}
                                    {item.tecnica && <p className="text-[10px] text-[#1A1A1A]/48">Técnica: {item.tecnica}</p>}
                                    {item.data && <p className="text-[10px] text-[#1A1A1A]/48">{item.data}{item.pais ? ` • ${item.pais}` : ''}</p>}
                                    {/* Razões da correlação */}
                                    {corr?.reasons?.length > 0 && (
                                      <div className="pt-2 border-t border-black/07 space-y-1">
                                        {corr.reasons.slice(0, 3).map((r: any, ri: number) => (
                                          <p key={ri} className="text-[10px] text-orange-400/85">✓ {r.description}</p>
                                        ))}
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="h-1 flex-1 bg-white/550 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#E85002]" style={{ width: `${(corr.score || 0) * 100}%` }} />
                                          </div>
                                          <span className="text-[10px] text-[#1A1A1A]/38 font-semibold">{Math.round((corr.score || 0) * 100)}%</span>
                                        </div>
                                      </div>
                                    )}
                                    {item.link && <a href={item.link} target="_blank" rel="noopener" className="text-[10px] text-[#E85002] underline block">Ver na fonte →</a>}
                                  </div>
                                );
                              })}
                              {data.total === 0 && <p className="text-[#1A1A1A]/35 text-xs">Sem resultados</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
 
                    {/* Tesauro CNFCP */}
                    {semanticResult.tesauro?.contexto && (
                      <div className="glass-card p-6 border border-amber-500/20 relative overflow-hidden">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
                          <FileText size={16} className="text-amber-400" /> Tesauro CNFCP / IPHAN
                        </h4>
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                          <pre className="text-[11px] text-[#1A1A1A]/70 leading-relaxed whitespace-pre-wrap font-sans">{semanticResult.tesauro.contexto}</pre>
                        </div>
                        {semanticResult.tesauro.termosExpandidos?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/38 font-semibold mr-2">Expansão:</span>
                            {semanticResult.tesauro.termosExpandidos.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
 
                    {/* Conexões Cruzadas */}
                    {semanticResult.crossConnections?.length > 0 && (
                      <div className="glass-card p-6 border border-[#E85002]/20">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Share2 size={16} className="text-[#E85002]" /> Conexões Cruzadas Entre Fontes ({semanticResult.crossConnections.length})
                        </h4>
                        <div className="space-y-3">
                          {semanticResult.crossConnections.slice(0, 5).map((conn: any, i: number) => (
                            <div key={i} className="p-4 bg-white/550 rounded-lg border border-black/07">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold uppercase rounded">{conn.sourceA}</span>
                                <span className="text-[#1A1A1A]/25">↔</span>
                                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-semibold uppercase rounded">{conn.sourceB}</span>
                                <span className="text-[10px] text-[#1A1A1A]/38 ml-auto font-medium">{Math.round(conn.confidence * 100)}% confidence</span>
                              </div>
                              <p className="text-[11px] text-[#1A1A1A]/70 leading-relaxed">{conn.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Tags internas */}
                    {semanticResult.correlacoes.internas.total > 0 && (
                      <div className="glass-card p-6 relative overflow-hidden">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 relative z-10">Tags internas correlacionadas ({semanticResult.correlacoes.internas.total})</h4>
                        <div className="flex flex-wrap gap-2 relative z-10">
                          {semanticResult.correlacoes.internas.items.map((t: any, i: number) => (
                            <span key={i} className="px-3 py-1 bg-[#E85002]/10 text-[#E85002] border border-[#E85002]/20 rounded-full text-[10px] uppercase font-semibold">
                              {t.tag_original} → {t.grupo_tematico || 'Outros'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* Conhecimento acumulado */}
                    {semanticResult.knowledge && (semanticResult.knowledge.previousCorrelations > 0 || semanticResult.knowledge.learningEvents > 0) && (
                      <div className="glass-card p-6 border border-orange-500/10">
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TrendingUp size={16} className="text-orange-400" /> Conhecimento Acumulado
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-white/550 rounded-lg">
                            <p className="text-2xl font-bold text-orange-400">{semanticResult.knowledge.previousCorrelations}</p>
                            <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/38 font-semibold">Correlações Prévias</p>
                          </div>
                          <div className="text-center p-3 bg-white/550 rounded-lg">
                            <p className="text-2xl font-bold text-orange-400">{semanticResult.knowledge.learningEvents}</p>
                            <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/38 font-semibold">Eventos de Aprendizado</p>
                          </div>
                        </div>
                      </div>
                    )}
 
                    {/* Nível de Confiança Semântica */}
                    {semanticResult.motores?.transformer && (
                      <div className={`glass-card p-6 border ${semanticResult.motores.transformer.aguardandoTreino ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                              Nível de Confiança Semântica
                            </h4>
                            <p className="text-xs text-[#1A1A1A]/60">
                              {semanticResult.motores.transformer.aguardandoTreino 
                                ? 'Classificação conceitual sob análise e monitoramento.' 
                                : 'Classificação conceitual validada e confirmada.'}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-center">
                            <div className={`text-4xl font-black tracking-tighter ${semanticResult.motores.transformer.aguardandoTreino ? 'text-yellow-400' : 'text-orange-400'}`}>
                              {semanticResult.motores.transformer.certeza}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Parecer Semântico */}
                    {semanticResult.relatorioEstruturado ? (
                      <div className="grid grid-cols-1 gap-4 mt-6">
                        {semanticResult.relatorioEstruturado.camadas ? (
                          <div className={`glass-card p-8 border-l-4 ${semanticResult.relatorioEstruturado.statusImparcial ? 'border-orange-500/50' : 'border-[#00FF00]/50'} relative overflow-hidden`}>
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${semanticResult.relatorioEstruturado.statusImparcial ? 'text-orange-400' : 'text-[#00FF00]'} mb-3 flex items-center gap-2`}>
                              <Brain size={16} /> Parecer Semântico Institucional
                            </h4>
                            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                              {semanticResult.relatorioEstruturado.camadas.sintese}
                            </p>
                          </div>
                        ) : (
                          <div className="glass-card p-8 border-l-4 border-[#00FF00]/50 relative overflow-hidden">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-[#00FF00] mb-3 flex items-center gap-2">
                              <Brain size={16} /> Parecer Semântico Institucional
                            </h4>
                            <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                              {semanticResult.relatorioEstruturado.deducao}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="glass-card p-8 relative overflow-hidden mt-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                          <FileText size={16} className="text-[#E85002]" /> Análise Escrita
                        </h4>
                        <div className="prose prose-invert prose-sm max-w-none text-[#1A1A1A]/80 leading-relaxed whitespace-pre-line relative z-10">
                          {semanticResult.analiseEscrita}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isAnalyzing && (
                  <div className="glass-card p-16 flex flex-col items-center justify-center space-y-6">
                    <div className="flex gap-2">
                      <div className="w-4 h-4 rounded-full bg-[#E85002] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-4 h-4 rounded-full bg-[#E85002] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-4 h-4 rounded-full bg-[#E85002] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-[#E85002]/80 text-xs uppercase tracking-widest font-bold">O Cérebro Semântico está pesquisando e calculando correlações...</p>
                  </div>
                )}

                {!semanticResult && !isAnalyzing && (
                  <div className="glass-card p-16 text-center">
                    <Search size={48} className="mx-auto text-[#1A1A1A]/15 mb-4" />
                    <p className="text-[#1A1A1A]/35 text-xs uppercase tracking-wider font-semibold">Busque uma tag para ver a inteligência em ação.</p>
                  </div>
                )}
              </div>
            )}

 
                 {/* Modal de Análise Neural do Nó Clicado */}
                 {graphNodeSelected && tagAnalysisResult && !isAnalyzingTag && (
                   <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center p-4" onClick={() => setGraphNodeSelected(null)}>
                     <div className="glass-card p-8 w-full max-w-2xl relative animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                       <button onClick={() => setGraphNodeSelected(null)} className="absolute top-6 right-6 text-[#1A1A1A]/55 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-xl serif-title mb-1">Análise Neural</h3>
                       <p className="text-[#E85002] font-semibold font-serif italic text-lg mb-6">&quot;{graphNodeSelected}&quot;</p>
                       
                       {/* Família */}
                       {tagAnalysisResult.family && (
                         <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg mb-4">
                           <p className="text-[11px] uppercase font-semibold tracking-wider text-purple-400 mb-2">Família: {tagAnalysisResult.family.name}</p>
                           <div className="flex flex-wrap gap-2">
                             {tagAnalysisResult.family.members.slice(0, 10).map((m: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-[10px] font-bold">{m}</span>
                             ))}
                           </div>
                         </div>
                       )}
 
                       {/* Conexões */}
                       {(tagAnalysisResult.siblings?.length > 0 || tagAnalysisResult.duplicates?.length > 0) && (
                         <div className="p-4 bg-white/550 border border-black/10 rounded-lg mb-4 space-y-2">
                           <p className="text-[10px] uppercase font-black tracking-widest text-[#1A1A1A]/55 mb-2">Conexões ({tagAnalysisResult.totalRelated})</p>
                           {[...(tagAnalysisResult.duplicates || []), ...(tagAnalysisResult.siblings || [])].slice(0, 6).map((s: any, i: number) => (
                             <div key={i} className="flex items-center justify-between text-sm">
                               <span className="text-[#1A1A1A]/80 font-serif italic">&quot;{s.tag}&quot;</span>
                               <span className="text-[10px] text-[#1A1A1A]/45">{Math.round(s.score * 100)}%</span>
                             </div>
                           ))}
                         </div>
                       )}
 
                       {/* DNA */}
                       {tagAnalysisResult.dna && Object.values(tagAnalysisResult.dna).some((v: any) => v > 0) && (
                         <div className="p-4 bg-white/550 border border-black/10 rounded-lg mb-4 space-y-2">
                           <p className="text-[11px] uppercase font-semibold tracking-wider text-[#1A1A1A]/48 mb-2">DNA Semântico</p>
                           {Object.entries(tagAnalysisResult.dna).filter(([,v]) => (v as number) > 0).sort(([,a],[,b]) => (b as number) - (a as number)).map(([k,v]) => {
                             const labels: Record<string,string> = { period:'Período', technique:'Técnica', geography:'Geografia', material:'Material', theme:'Temática', movement:'Movimento', provenance:'Proveniência' };
                             return (
                               <div key={k} className="flex items-center gap-2">
                                 <span className="text-[10px] text-[#1A1A1A]/48 w-20 text-right uppercase font-semibold">{labels[k]||k}</span>
                                 <div className="h-1.5 flex-1 bg-white/550 rounded-full overflow-hidden">
                                   <div className="h-full bg-[#E85002]" style={{ width: `${(v as number)*100}%` }} />
                                 </div>
                                 <span className="text-[10px] text-[#1A1A1A]/38 font-semibold">{Math.round((v as number)*100)}%</span>
                               </div>
                             );
                           })}
                         </div>
                       )}
 
                       {/* Ações */}
                       <div className="flex gap-3 mt-4">
                         <button onClick={() => { setSearchTag(graphNodeSelected); setActiveTab('relatorios'); setGraphNodeSelected(null); setTimeout(() => handleSemanticSearch(), 300); }} className="flex-1 liquid-button !bg-[#E85002] text-xs font-semibold tracking-wider">
                           Relatório Semântico Completo
                         </button>
                         <button onClick={() => { setActiveTab('tags'); setGraphNodeSelected(null); }} className="flex-1 liquid-button !bg-white/10 text-xs font-semibold tracking-wider">
                           Ver na Análise de Tags
                         </button>
                       </div>
                     </div>
                   </div>
                 )}
 
                 {graphNodeSelected && isAnalyzingTag && (
                   <div className="fixed inset-0 z-50 bg-white/550/80 flex items-center justify-center p-4">
                     <div className="glass-card p-12 text-center">
                       <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="text-[#1A1A1A]/45 text-[10px] uppercase tracking-widest font-bold">Cérebro analisando &quot;{graphNodeSelected}&quot;...</p>
                     </div>
                   </div>
                 )}
              </div>
            )}

             {activeTab === 'ontologia' && (
              <div className="space-y-8 animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal">Ontologias & Vocabulários</h2>
                    <button onClick={() => setShowOntologiaForm(true)} className="liquid-button !bg-[#E85002] flex items-center gap-2"><Plus size={16} /> Nova Ontologia</button>
                 </div>

                 {/* MODAL NOVA ONTOLOGIA */}
                 {showOntologiaForm && (
                   <div className="fixed inset-0 z-50 bg-white/550/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-lg relative animate-fade-in">
                       <button onClick={() => setShowOntologiaForm(false)} className="absolute top-6 right-6 text-[#1A1A1A]/55 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-xl serif-title mb-6">Mapear Nova Ontologia</h3>
                       <form onSubmit={(e) => { e.preventDefault(); alert('Ontologia mapeada com sucesso!'); setShowOntologiaForm(false); }} className="space-y-4">
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Nome da Ontologia / Padrão</label>
                           <input required className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Dublin Core" />
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Provedor / Instituição</label>
                           <input required className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: DCMI" />
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">URL do Endpoint (SPARQL/API)</label>
                           <input type="url" className="w-full bg-white/550 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="https://..." />
                         </div>
                         <button type="submit" className="w-full liquid-button !bg-[#E85002] mt-4 flex justify-center items-center gap-2">
                           <Database size={16} /> Iniciar Mapeamento Neural
                         </button>
                       </form>
                     </div>
                   </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'CIDOC-CRM', provider: 'ICOM', terms: 'Conceitos Museais' },
                      { name: 'Tesauro CNFCP/IPHAN', provider: 'IPHAN', terms: 'Vocabulário Controlado' },
                      { name: 'Tainacan Core', provider: 'IBRAM', terms: 'Padrão Brasil' }
                    ].map((o, i) => (
                      <div key={i} className="glass-card p-8 space-y-6 hover:border-[#E85002]/40 group transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                           <Database className="w-8 h-8 opacity-50 text-[#E85002] group-hover:opacity-100 transition-opacity" />
                           <ArrowUpRight size={18} className="text-[#1A1A1A]/25 group-hover:text-[#E85002]" />
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-lg font-bold leading-tight">{o.name}</h3>
                           <p className="text-[10px] uppercase font-semibold tracking-wider text-[#1A1A1A]/38">{o.provider}</p>
                        </div>
                        <div className="pt-4 border-t border-black/07 flex justify-between items-center text-[10px] uppercase font-semibold tracking-wider">
                           <span className="text-orange-500">Mapeado no Banco</span>
                           <span className="text-[#1A1A1A]/45">{o.terms}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'interoperabilidade' && (
              <div className="space-y-8 animate-fade-in text-[#1A1A1A]">
                
                {/* Cabeçalho Técnico */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/10 pb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
                      <Cpu size={24} className="text-[#E8490A]" />
                      Interoperabilidade Cultural
                    </h2>
                    <p className="text-xs text-[#1A1A1A]/55 mt-1 uppercase tracking-widest font-semibold">
                      Rede de Preservação e Rastreabilidade Criptografada Interna
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-[#E8490A] text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-full">
                    <Fingerprint size={12} /> Rastreio Criptográfico Ativo
                  </div>
                </div>

                {/* Obsidian-Style Graph View e Detalhes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Coluna 1 & 2: Obsidian Node Graph Interactive Simulator */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6 md:p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E8490A] flex items-center gap-2">
                          <Network size={16} /> Rede de Conexões Semânticas (Obsidian Graph View)
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 font-semibold">
                          Clique em um nó para inspecionar
                        </span>
                      </div>
                      
                      {/* Área do Grafo SVG Interativo */}
                      <div className="relative w-full h-[400px] bg-[#EEEBE3]/30 border border-black/07 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                        <svg className="w-full h-full cursor-grab active:cursor-grabbing" viewBox="0 0 800 400">
                          {/* Defs para filtros e marcadores de setas */}
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(26,26,26,0.18)" />
                            </marker>
                          </defs>

                          {/* Linhas de conexão (Arestas) */}
                          <line x1="400" y1="200" x2="250" y2="100" stroke="rgba(26,26,26,0.18)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                          <line x1="400" y1="200" x2="550" y2="100" stroke="rgba(26,26,26,0.18)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                          <line x1="400" y1="200" x2="250" y2="300" stroke="rgba(26,26,26,0.18)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                          <line x1="400" y1="200" x2="550" y2="300" stroke="rgba(26,26,26,0.18)" strokeWidth="1.5" markerEnd="url(#arrow)" />
                          <line x1="250" y1="100" x2="120" y2="200" stroke="rgba(26,26,26,0.12)" strokeWidth="1" />
                          <line x1="550" y1="100" x2="680" y2="200" stroke="rgba(26,26,26,0.12)" strokeWidth="1" />
                          <line x1="250" y1="300" x2="120" y2="200" stroke="rgba(26,26,26,0.12)" strokeWidth="1" />
                          <line x1="550" y1="300" x2="680" y2="200" stroke="rgba(26,26,26,0.12)" strokeWidth="1" />

                          {/* Nódulos Interativos */}
                          {[
                            { id: "core", label: "Núcleo Folksonômico", x: 400, y: 200, size: 24, fill: "#E8490A", desc: "Nó centralizador de dados e proveniências semânticas do acervo.", type: "Núcleo do Sistema", hash: "c8ed_9901_alpha_01" },
                            
                            { id: "frevo", label: "Frevo Pernambucano", x: 250, y: 100, size: 16, fill: "#1E3A8A", desc: "Patrimônio Cultural Imaterial que indexa as tags de dança, cores e sombrinhas ornamentadas do acervo de cultura popular.", type: "Objeto Imaterial", hash: "frevo_alpha_8f29_delta" },
                            { id: "carranca", label: "Carranca de São Francisco", x: 550, y: 100, size: 16, fill: "#1A6B3A", desc: "Escultura antropomórfica em madeira, representativa da arte popular e do imaginário ribeirinho brasileiro.", type: "Objeto de Cultura Popular", hash: "carra_alpha_1a2c_delta" },
                            { id: "bilro", label: "Renda de Bilro", x: 250, y: 300, size: 16, fill: "#C0252B", desc: "Prática artesanal tradicional de tecelagem manual de rendas usando bilros e almofadas de espinho.", type: "Objeto de Cultura Popular", hash: "bilro_alpha_5e8d_delta" },
                            { id: "dossie", label: "Dossiê de Registro IPHAN", x: 550, y: 300, size: 16, fill: "#E8A920", desc: "Artigo documental e histórico oficial sobre a salvaguarda e a regulamentação dos patrimônios catalogados.", type: "Artigo Científico / Documento", hash: "dossi_alpha_3c4b_delta" },
                            
                            { id: "artigo_popular", label: "Estudos Culturais Região Nordeste", x: 120, y: 200, size: 12, fill: "#1A1A1A", desc: "Estudo crítico detalhado sobre a influência das carrancas de proa na economia criativa do Vale do São Francisco.", type: "Artigo Científico / Documento", hash: "estud_alpha_2e3d_delta" },
                            { id: "museografia", label: "Cadernos de Museologia Popular", x: 680, y: 200, size: 12, fill: "#1A1A1A", desc: "Práticas e normas técnicas para a catalogação descentralizada e inclusão de linguagens populares em acervos.", type: "Artigo Científico / Documento", hash: "museo_alpha_7f8e_delta" }
                          ].map((node) => (
                            <g 
                              key={node.id} 
                              className="cursor-pointer group"
                              onClick={() => setGraphNodeSelected(node.label === "Núcleo Folksonômico" ? null : node.label)}
                            >
                              <circle 
                                cx={node.x} 
                                cy={node.y} 
                                r={node.size} 
                                fill={node.fill} 
                                className="transition-all duration-300 group-hover:scale-125 group-hover:stroke-white group-hover:stroke-2" 
                              />
                              <text 
                                x={node.x} 
                                y={node.y + node.size + 14} 
                                textAnchor="middle" 
                                className="text-[10px] font-sans font-semibold fill-[#1A1A1A]/70 group-hover:fill-orange-600 transition-colors pointer-events-none"
                              >
                                {node.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 3: Painel de Informações Imutáveis do Nó */}
                  <div>
                    {graphNodeSelected ? (
                      (() => {
                        const nodeInfo = [
                          { label: "Frevo Pernambucano", desc: "Patrimônio Cultural Imaterial que indexa as tags de dança, cores e sombrinhas ornamentadas do acervo de cultura popular.", type: "Objeto Imaterial", hash: "frevo_alpha_8f29_delta" },
                          { label: "Carranca de São Francisco", desc: "Escultura antropomórfica em madeira, representativa da arte popular e do imaginário ribeirinho brasileiro.", type: "Objeto de Cultura Popular", hash: "carra_alpha_1a2c_delta" },
                          { label: "Renda de Bilro", desc: "Prática artesanal tradicional de tecelagem manual de rendas usando bilros e almofadas de espinho.", type: "Objeto de Cultura Popular", hash: "bilro_alpha_5e8d_delta" },
                          { label: "Dossiê de Registro IPHAN", desc: "Artigo documental e histórico oficial sobre a salvaguarda e a regulamentação dos patrimônios catalogados.", type: "Artigo Científico / Documento", hash: "dossi_alpha_3c4b_delta" },
                          { label: "Estudos Culturais Região Nordeste", desc: "Estudo crítico detalhado sobre a influência das carrancas de proa na economia criativa do Vale do São Francisco.", type: "Artigo Científico / Documento", hash: "estud_alpha_2e3d_delta" },
                          { label: "Cadernos de Museologia Popular", desc: "Práticas e normas técnicas para a catalogação descentralizada e inclusão de linguagens populares em acervos.", type: "Artigo Científico / Documento", hash: "museo_alpha_7f8e_delta" }
                        ].find(n => n.label === graphNodeSelected);

                        if (!nodeInfo) return null;

                        return (
                          <div className="glass-card p-6 border border-black/07 space-y-6 sticky top-28 animate-fade-in text-left">
                            <div className="flex items-center gap-2 pb-4 border-b border-black/10">
                              <Cpu className="text-[#E8490A]" size={20} />
                              <div>
                                <h4 className="text-sm font-semibold serif-title">{nodeInfo.label}</h4>
                                <span className="text-[9px] uppercase tracking-wider font-bold text-[#1A1A1A]/40 block">{nodeInfo.type}</span>
                              </div>
                            </div>

                            <div className="space-y-4 text-xs">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 block">Descrição Histórica</span>
                                <p className="text-[#1A1A1A]/70 text-[10px] leading-relaxed mt-1">
                                  {nodeInfo.desc}
                                </p>
                              </div>

                              <div>
                                <span className="text-[9px] uppercase font-bold text-[#1A1A1A]/40 block">Chave Criptográfica do Registro</span>
                                <code className="text-[10px] font-mono text-orange-600 break-all block p-2 bg-white/40 border border-black/07 rounded-lg mt-1">
                                  {nodeInfo.hash}
                                </code>
                              </div>

                              <div className="p-3.5 bg-white/40 border border-black/07 rounded-xl space-y-1 mt-1 font-mono text-[9px] text-[#1A1A1A]/70">
                                <span className="font-bold text-green-700 block uppercase tracking-wider text-[8px] mb-1">
                                  ✓ Rastreamento Imutável Ativo
                                </span>
                                <p>Sincronismo: Confirmado</p>
                                <p>Criptografia Interna: Ativa</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="glass-card p-10 border border-black/07 text-center text-xs text-[#1A1A1A]/40 uppercase tracking-widest font-semibold sticky top-28">
                        Selecione um nódulo do grafo de conexões para inspecionar seus hashes criptográficos e integridade.
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
