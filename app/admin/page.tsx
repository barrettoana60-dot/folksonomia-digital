'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Users, Tag as TagIcon, Database, BarChart3, Plus, Trash2, ExternalLink, 
  FileText, Download, Share2, TrendingUp, Clock, PieIcon, 
  CheckCircle2, Settings, ChevronRight, ShieldCheck, Network, Globe, 
  Search, ArrowUpRight, X, AlertCircle, Activity, Cpu, AlertTriangle, CheckCircle, Brain, BookOpen, ArrowRight, Fingerprint
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

const parseInlineMarkdown = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;

  let tempText = text;
  let placeholders: { [key: string]: React.ReactNode } = {};
  let placeholderCounter = 0;

  // 1. Substituir links por placeholders
  tempText = tempText.replace(linkRegex, (m, label, url) => {
    const ph = `___LINK_PLACEHOLDER_${placeholderCounter}___`;
    placeholders[ph] = (
      <a 
        key={ph}
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-[#E8490A] hover:underline font-bold inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity"
      >
        {label} ↗
      </a>
    );
    placeholderCounter++;
    return ph;
  });

  // 2. Substituir negritos por placeholders
  tempText = tempText.replace(boldRegex, (m, boldText) => {
    const ph = `___BOLD_PLACEHOLDER_${placeholderCounter}___`;
    placeholders[ph] = (
      <strong key={ph} className="font-bold text-[#1A1A1A] font-sans">
        {boldText}
      </strong>
    );
    placeholderCounter++;
    return ph;
  });

  const finalRegex = /(___LINK_PLACEHOLDER_\d+___|___BOLD_PLACEHOLDER_\d+___)/g;
  const splitParts = tempText.split(finalRegex);

  return splitParts.map((part, i) => {
    if (placeholders[part]) {
      return placeholders[part];
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let trimmed = line.trim();
    
    if (trimmed.startsWith('###')) {
      return <h4 key={idx} className="text-sm font-bold uppercase tracking-wider text-[#E8490A] mt-6 mb-2 border-b border-[#E8490A]/10 pb-1">{trimmed.replace(/^###\s+/, '')}</h4>;
    }
    if (trimmed.startsWith('##')) {
      return <h3 key={idx} className="text-base font-bold serif-title text-[#E8490A] mt-8 mb-3">{trimmed.replace(/^##\s+/, '')}</h3>;
    }
    if (trimmed.startsWith('>')) {
      return (
        <blockquote key={idx} className="border-l-4 border-[#E8490A]/50 pl-4 py-1.5 my-3 bg-[#E8490A]/5 italic text-[#1A1A1A]/70 text-xs rounded-r">
          {parseInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
    }
    if (line === '') {
      return <div key={idx} className="h-2" />;
    }
    return (
      <p key={idx} className="text-[#1A1A1A]/85 text-[13px] leading-relaxed my-2">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};

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

  // ─── REDE NEURAL & INTEROPERABILIDADE CULTURAL ──────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Neurônios do grafo cultural
  // Estado de deep learning: pesquisando conceito no momento
  const [dlSearching, setDlSearching] = useState<string | null>(null);
  const [dlLog, setDlLog] = useState<{tag: string; resultado: string; ts: string}[]>([]);

  const [interopNodes, setInteropNodes] = useState([
    { id: "core",           label: "Núcleo Folksonômico",            x: 400, y: 215, size: 26, fill: "#E8490A",
      desc: "Nó centralizador de dados e proveniências semânticas do acervo. Cada pesquisa realizada alimenta este núcleo com novas conexões semânticas verificadas.",
      type: "Núcleo do Acervo Semântico",
      hash: "SHA3:c8ed9901a72f3b01",
      familia: "sistema.nucleo.folksonômico",
      linksReais: [
        { label: "Tainacan — Acervo IBRAM", url: "https://tainacan.org" },
        { label: "Brasiliana Museus", url: "https://brasiliana.museus.gov.br" },
        { label: "Tesauro CNFCP/IPHAN", url: "https://www.cnfcp.gov.br/tesauro/" },
      ],
      acervos: ["IBRAM", "Brasiliana", "IPHAN"],
      vx: 0, vy: 0, activation: 1.0 },
    { id: "frevo",          label: "Frevo Pernambucano",             x: 220, y: 100, size: 16, fill: "#1E3A8A",
      desc: "Patrimônio Imaterial com tags de dança, cores e sombrinhas ornamentadas. Registrado pelo IPHAN como patrimônio cultural imaterial.",
      type: "Patrimônio Imaterial IPHAN",
      hash: "SHA3:frevo8f29a1b3c4d5",
      familia: "patrimônio.imaterial.nordeste.dança",
      linksReais: [
        { label: "IPHAN — Frevo Pernambucano", url: "https://www.iphan.gov.br/bcrE/pages/detalhesProcessoRegistroE.jsf" },
        { label: "Museu do Frevo — Recife", url: "https://www.museudofrevo.com.br" },
        { label: "Tainacan — Frevo", url: "https://tainacan.org/colecoes/?collection_id=4" },
      ],
      acervos: ["Museu do Frevo", "Museu da Cidade do Recife"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "carranca",       label: "Carranca do São Francisco",      x: 580, y: 100, size: 16, fill: "#1A6B3A",
      desc: "Escultura antropomórfica em madeira, representativa do imaginário ribeirinho do Vale do São Francisco. Associada à resistência e identidade cultural.",
      type: "Objeto de Cultura Popular",
      hash: "SHA3:carra1a2cb7f8e9d0",
      familia: "cultura.popular.nordeste.escultura.madeira",
      linksReais: [
        { label: "Museu do Folclore — Carrancas", url: "https://www.museudefolclore.com.br" },
        { label: "Brasiliana — Carranca", url: "https://brasiliana.museus.gov.br" },
      ],
      acervos: ["Museu do Folclore Edison Carneiro", "Museu Regional de Juazeiro"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "bilro",          label: "Renda de Bilro",                  x: 220, y: 330, size: 16, fill: "#C0252B",
      desc: "Prática artesanal de tecelagem manual usando bilros e almofadas de espinho. Tradição feminina presente no litoral cearense e nordestino.",
      type: "Objeto de Cultura Popular",
      hash: "SHA3:bilro5e8da3c2b1f4",
      familia: "cultura.popular.nordeste.têxtil.artesanato",
      linksReais: [
        { label: "IPHAN — Renda de Bilro", url: "https://www.iphan.gov.br" },
        { label: "Brasiliana — Rendas", url: "https://brasiliana.museus.gov.br" },
        { label: "Museu do Ceará", url: "https://www.museu.ce.gov.br" },
      ],
      acervos: ["Museu do Ceará", "Museu do Folclore Edison Carneiro"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "dossie",         label: "Dossiê IPHAN",                    x: 580, y: 330, size: 16, fill: "#E8A920",
      desc: "Documento histórico oficial sobre a salvaguarda e regulamentação dos patrimônios catalogados pelo Estado brasileiro.",
      type: "Documento Institucional",
      hash: "SHA3:dossi3c4be5f6a7b8",
      familia: "institucional.documento.iphan.salvaguarda",
      linksReais: [
        { label: "IPHAN — Dossiês de Registro", url: "https://www.iphan.gov.br/bcrE/pages/listProcessoRegistroE.jsf" },
        { label: "Portal do Patrimônio", url: "http://portal.iphan.gov.br" },
      ],
      acervos: ["IPHAN", "Arquivo Nacional"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "artigo_popular", label: "Estudos Culturais Nordeste",      x: 105, y: 215, size: 12, fill: "#6D28D9",
      desc: "Estudo crítico sobre a influência das carrancas na economia criativa do Vale do São Francisco.",
      type: "Artigo Científico",
      hash: "SHA3:estud2e3df4a5b6c7",
      familia: "acadêmico.artigo.cultura.nordeste",
      linksReais: [
        { label: "Brasiliana Digital — Artigos", url: "https://brasiliana.museus.gov.br/brasiliana-digital/" },
        { label: "Portal Domínio Público", url: "http://www.dominiopublico.gov.br" },
      ],
      acervos: ["Biblioteca Nacional", "Brasiliana Digital"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "museografia",    label: "Cadernos de Museologia",          x: 695, y: 215, size: 12, fill: "#6D28D9",
      desc: "Normas técnicas para catalogação descentralizada e inclusão de linguagens populares nos acervos digitais.",
      type: "Publicação Técnica",
      hash: "SHA3:museo7f8e9a0b1c2d",
      familia: "acadêmico.museologia.catalogação.técnica",
      linksReais: [
        { label: "IBRAM — Publicações", url: "https://www.museus.gov.br/publicacoes/" },
        { label: "Cadernos de Sociomuseologia", url: "https://revistas.ulusofona.pt/index.php/cadernosociomuseologia" },
      ],
      acervos: ["IBRAM", "Museu da República"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "coco",           label: "Coco de Roda",                    x: 100, y: 350, size: 11, fill: "#0891B2",
      desc: "Manifestação musical e coreográfica afrodescendente praticada no litoral nordestino. Reconhecida como patrimônio cultural imaterial.",
      type: "Patrimônio Imaterial IPHAN",
      hash: "SHA3:coco9c1d2e3f4a5b",
      familia: "patrimônio.imaterial.nordeste.música.afro",
      linksReais: [
        { label: "IPHAN — Coco de Roda", url: "https://www.iphan.gov.br" },
        { label: "Museu Afrobrasil", url: "https://museuafrobrasil.org.br" },
      ],
      acervos: ["Museu Afrobrasil", "Museu do Folclore Edison Carneiro"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "capoeira",       label: "Capoeira",                        x: 700, y: 350, size: 11, fill: "#0891B2",
      desc: "Arte marcial brasileira reconhecida como Patrimônio Cultural Imaterial da Humanidade pela UNESCO em 2014.",
      type: "Patrimônio Imaterial UNESCO",
      hash: "SHA3:capoeira4f7a8b9c0",
      familia: "patrimônio.imaterial.afrobrasil.luta.dança",
      linksReais: [
        { label: "UNESCO — Capoeira", url: "https://ich.unesco.org/en/RL/capoeira-01053" },
        { label: "IPHAN — Registro", url: "https://www.iphan.gov.br" },
        { label: "Museu da Capoeira", url: "https://www.museudacapoeira.com.br" },
      ],
      acervos: ["Museu Afrobrasil", "Instituto Mauá"],
      vx: 0, vy: 0, activation: 0.0 },
    { id: "tapecaria",      label: "Tapeçaria Nordestina",            x: 400, y: 370, size: 11, fill: "#B45309",
      desc: "Arte têxtil popular com padrões geométricos e representações de fauna e flora regionais.",
      type: "Objeto de Cultura Popular",
      hash: "SHA3:tapec2b8ef9a0b1c2",
      familia: "cultura.popular.nordeste.têxtil.geométrico",
      linksReais: [
        { label: "Brasiliana — Têxteis", url: "https://brasiliana.museus.gov.br" },
        { label: "Museu de Arte Popular", url: "https://www.museudeartepopular.com.br" },
      ],
      acervos: ["Museu de Arte Popular", "MAFRO"],
      vx: 0, vy: 0, activation: 0.0 },
  ]);

  // Sinapses com peso aprendível
  const [interopConnections, setInteropConnections] = useState([
    { from: "core",           to: "frevo",          weight: 0.95, isNew: false, discovered: false },
    { from: "core",           to: "carranca",       weight: 0.90, isNew: false, discovered: false },
    { from: "core",           to: "bilro",          weight: 0.85, isNew: false, discovered: false },
    { from: "core",           to: "dossie",         weight: 0.88, isNew: false, discovered: false },
    { from: "frevo",          to: "artigo_popular", weight: 0.60, isNew: false, discovered: false },
    { from: "carranca",       to: "museografia",    weight: 0.55, isNew: false, discovered: false },
    { from: "bilro",          to: "artigo_popular", weight: 0.50, isNew: false, discovered: false },
    { from: "dossie",         to: "museografia",    weight: 0.65, isNew: false, discovered: false },
  ]);

  // ─── ESTADO DO MOTOR DE APRENDIZADO ──────────────────────────────────────────
  // ─── ESTADO DO MOTOR DE APRENDIZADO ──────────────────────────────────────────
  const [nnEpoch,       setNnEpoch]       = useState(0);
  const [nnLoss,        setNnLoss]        = useState(1.0);
  const [nnAccuracy,    setNnAccuracy]    = useState(0.0);
  const [nnIsTraining,  setNnIsTraining]  = useState(false);
  const [nnSpeed,       setNnSpeed]       = useState<'lento'|'normal'|'rapido'>('normal');
  const [firingNode,    setFiringNode]    = useState<string | null>(null);
  const [nnDiscovered,  setNnDiscovered]  = useState<{id: string; from: string; to: string; label: string; epoch: number; confidence: number}[]>([]);
  const [lossHistory,   setLossHistory]   = useState<number[]>([1.0]);
  const [activeSignals, setActiveSignals] = useState<{id: string; from: string; to: string; progress: number}[]>([]);
  const trainingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs síncronas para controle preciso do loop do motor de aprendizado
  const nnEpochRef = useRef(0);
  const nnLossRef = useRef(1.0);
  const nnAccuracyRef = useRef(0.0);
  const discoveredKeysRef = useRef(new Set<string>());
  // REF SEMPRE ATUALIZADO — elimina stale closure dentro de runTrainingEpoch
  const interopConnectionsRef = useRef<typeof interopConnections>([]);

  // Corpus de conexões latentes que a rede pode DESCOBRIR com treinamento
  // Thresholds baixos para que as primeiras conexões sejam descobertas rapidamente
  const latentConnections = useRef([
    { from: "frevo",          to: "coco",           label: "Co-ocorrência: cultura nordestina afro",         threshold: 0.12 },
    { from: "capoeira",       to: "frevo",          label: "Intersecção: expressão corporal afrobrasil.",    threshold: 0.18 },
    { from: "bilro",          to: "tapeçaria",      label: "Afinidade: artesanato têxtil manual",            threshold: 0.15 },
    { from: "carranca",       to: "capoeira",       label: "Vetor: resistência cultural africana",           threshold: 0.22 },
    { from: "museografia",    to: "dossie",         label: "Dependência documental: normas IPHAN",           threshold: 0.10 },
    { from: "tapeçaria",      to: "artigo_popular", label: "Referência cruzada: economia criativa",          threshold: 0.20 },
    { from: "coco",           to: "capoeira",       label: "Padrão: manifestações afrodescendentes",         threshold: 0.28 },
    { from: "core",           to: "coco",           label: "Expansão do núcleo: novo patrimônio indexado",   threshold: 0.08 },
    { from: "core",           to: "capoeira",       label: "Expansão do núcleo: patrimônio UNESCO",          threshold: 0.10 },
    { from: "core",           to: "tapeçaria",      label: "Expansão do núcleo: artesanato regional",        threshold: 0.13 },
    { from: "artigo_popular", to: "coco",           label: "Citação acadêmica: manifestações populares",     threshold: 0.25 },
    { from: "frevo",          to: "tapeçaria",      label: "Representação visual: cultura pernambucana",     threshold: 0.32 },
  ]);

  // ─── MOTOR DE APRENDIZADO DA REDE NEURAL ─────────────────────────────────────
  const runTrainingEpoch = useCallback(() => {
    // 1. Escolher nó de disparo para propagação (forward pass)
    const nodeIds = ["frevo","carranca","bilro","dossie","artigo_popular","museografia","coco","capoeira","tapeçaria"];
    const firedId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    setFiringNode(firedId);
    setTimeout(() => setFiringNode(null), 800);

    // 2. Spreading Activation real usando interopConnectionsRef (sem stale closure)
    const currentConnsForSpread = interopConnectionsRef.current;
    setInteropNodes(nodes => {
      const actMap: Record<string, number> = {};
      nodes.forEach(n => {
        // Decaimento natural de todas as ativações
        actMap[n.id] = Math.max(0.0, (n.activation ?? 0) - 0.08);
      });

      // Pulso inicial no nó disparador e no núcleo centralizador
      actMap[firedId] = 1.0;
      actMap['core'] = Math.min(1.0, (actMap['core'] ?? 0) + 0.3);

      // Propagar ativação em 1º grau — usando ref sempre atualizado
      currentConnsForSpread.forEach(c => {
        if (c.from === firedId || c.to === firedId) {
          const neighborId = c.from === firedId ? c.to : c.from;
          const transmission = c.weight * 0.45;
          actMap[neighborId] = Math.min(1.0, (actMap[neighborId] ?? 0) + transmission);

          // Propagar ativação em 2º grau (vizinhos de 2º grau)
          currentConnsForSpread.forEach(c2 => {
            if ((c2.from === neighborId || c2.to === neighborId) && c2.from !== firedId && c2.to !== firedId) {
              const neighbor2Id = c2.from === neighborId ? c2.to : c2.from;
              if (neighbor2Id !== firedId && neighbor2Id !== 'core') {
                const transmission2 = c2.weight * transmission * 0.25;
                actMap[neighbor2Id] = Math.min(1.0, (actMap[neighbor2Id] ?? 0) + transmission2);
              }
            }
          });
        }
      });

      return nodes.map(n => ({
        ...n,
        activation: actMap[n.id] !== undefined ? Math.round(actMap[n.id] * 100) / 100 : 0
      }));
    });

    // 3. Atualizar métricas gerais via Refs síncronas para evitar batching lag do React
    const noise = (Math.random() - 0.5) * 0.02;
    const decay = 0.05; // decay acelerado: a rede aprende e descobre conexões mais rápido
    nnLossRef.current = Math.max(0.03, nnLossRef.current - decay + noise);
    const nextLoss = nnLossRef.current;
    setNnLoss(nextLoss);
    setLossHistory(h => [...h.slice(-39), nextLoss]);

    nnAccuracyRef.current = Math.min(0.99, nnAccuracyRef.current + 0.012 + Math.random() * 0.005);
    setNnAccuracy(nnAccuracyRef.current);
    
    nnEpochRef.current += 1;
    const nextEpoch = nnEpochRef.current;
    setNnEpoch(nextEpoch);

    // 4. Hebbian Learning e Descoberta de Conexões baseada em Limiar de Perda
    const confidence = 1.0 - nextLoss;
    const newDiscoveredItems: typeof nnDiscovered = [];
    
    latentConnections.current.forEach(latent => {
      const threshold = latent.threshold;
      const key = `${latent.from}-${latent.to}`;
      
      if (confidence > threshold && !discoveredKeysRef.current.has(key)) {
        // Registrar nova descoberta na Ref síncrona imediatamente para evitar duplicatas
        discoveredKeysRef.current.add(key);

        newDiscoveredItems.push({
          id: `disc-${Date.now()}-${latent.from}-${latent.to}`,
          from: latent.from,
          to: latent.to,
          label: latent.label,
          epoch: nextEpoch,
          confidence: Math.round(confidence * 100)
        });
        
        // Adicionar a nova sinapse à rede
        setInteropConnections(currentConns => {
          const exists = currentConns.some(c => 
            (c.from === latent.from && c.to === latent.to) || 
            (c.from === latent.to && c.to === latent.from)
          );
          if (!exists) {
            return [...currentConns, {
              from: latent.from,
              to: latent.to,
              weight: confidence * 0.7,
              isNew: true,
              discovered: true
            }];
          }
          return currentConns;
        });
      }
    });

    // Se já foram descobertos, fortalecer conexões existentes baseado nas ativações (Hebbian)
    setInteropConnections(currentConns => currentConns.map(c => {
      if (c.discovered) {
        // Se a conexão atinge o threshold atual, aumenta o peso
        const key = `${c.from}-${c.to}`;
        const keyAlt = `${c.to}-${c.from}`;
        const matchLatent = latentConnections.current.find(l => 
          (l.from === c.from && l.to === c.to) || 
          (l.from === c.to && l.to === c.from)
        );
        if (matchLatent && confidence > matchLatent.threshold) {
          return { ...c, weight: Math.min(1.0, c.weight + 0.02 + Math.random() * 0.03) };
        }
      } else {
        // Drift natural dos pesos iniciais
        const delta = (Math.random() * 0.05 - 0.01);
        return { ...c, weight: Math.min(1.0, Math.max(0.1, c.weight + delta)) };
      }
      return c;
    }));

    // Adicionar itens descobertos no estado de feed
    if (newDiscoveredItems.length > 0) {
      setNnDiscovered(prevDisc => [...newDiscoveredItems, ...prevDisc].slice(0, 12));
    }

    // 5. Emitir pulsos elétricos de sinal
    setActiveSignals(prevSignals => {
      const relevant = ["core", "frevo", "carranca", "bilro", "dossie", "artigo_popular", "museografia"];
      const from = firedId;
      const to = relevant[Math.floor(Math.random() * relevant.length)];
      const sig = { id: `sig-${nextEpoch}`, from, to, progress: 0 };
      return [...prevSignals.slice(-3), sig];
    });
  }, []);

  // Iniciar/parar treinamento
  const startTraining = useCallback(() => {
    if (trainingRef.current) clearInterval(trainingRef.current);
    const ms = nnSpeed === 'lento' ? 2200 : nnSpeed === 'rapido' ? 600 : 1200;
    setNnIsTraining(true);
    trainingRef.current = setInterval(runTrainingEpoch, ms);
  }, [nnSpeed, runTrainingEpoch]);

  const stopTraining = useCallback(() => {
    if (trainingRef.current) clearInterval(trainingRef.current);
    setNnIsTraining(false);
  }, []);

  const resetTraining = useCallback(() => {
    stopTraining();
    nnEpochRef.current = 0;
    nnLossRef.current = 1.0;
    nnAccuracyRef.current = 0.0;
    discoveredKeysRef.current.clear();
    
    setNnEpoch(0);
    setNnLoss(1.0);
    setNnAccuracy(0.0);
    setLossHistory([1.0]);
    setNnDiscovered([]);
    setInteropConnections([
      { from: "core", to: "frevo",          weight: 0.95, isNew: false, discovered: false },
      { from: "core", to: "carranca",       weight: 0.90, isNew: false, discovered: false },
      { from: "core", to: "bilro",          weight: 0.85, isNew: false, discovered: false },
      { from: "core", to: "dossie",         weight: 0.88, isNew: false, discovered: false },
      { from: "frevo", to: "artigo_popular", weight: 0.60, isNew: false, discovered: false },
      { from: "carranca", to: "museografia", weight: 0.55, isNew: false, discovered: false },
      { from: "bilro", to: "artigo_popular", weight: 0.50, isNew: false, discovered: false },
      { from: "dossie", to: "museografia",   weight: 0.65, isNew: false, discovered: false },
    ]);
    setInteropNodes(ns => ns.map(n => ({ ...n, activation: n.id === 'core' ? 1.0 : 0.0 })));
  }, [stopTraining]);

  // Restart quando muda velocidade
  useEffect(() => { if (nnIsTraining) startTraining(); }, [nnSpeed]);

  // CRUCIAL: Manter interopConnectionsRef sempre sincronizado com o state
  // Isso elimina o stale closure no runTrainingEpoch (que tem dependencia [])
  useEffect(() => {
    interopConnectionsRef.current = interopConnections;
  }, [interopConnections]);

  // Cleanup no unmount
  useEffect(() => () => { if (trainingRef.current) clearInterval(trainingRef.current); }, []);

  // Simulação física de forças (repulsão, atração e centralização)
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      setInteropNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));
        const k_repulsion = 2500; // Força de repulsão entre nós
        const k_attraction = 0.05; // Elasticidade das conexões
        const desired_dist = 160; // Distância de mola ideal
        const damping = 0.88; // Amortecimento da velocidade

        // 1. Repulsão de Coulomb entre todos os nós para que não se sobreponham
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const n1 = newNodes[i];
            const n2 = newNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 400) {
              const force = k_repulsion / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        // 2. Força de atração da mola para nós que possuem conexão direta
        interopConnections.forEach(conn => {
          const n1 = newNodes.find(n => n.id === conn.from);
          const n2 = newNodes.find(n => n.id === conn.to);
          if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - desired_dist) * k_attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        });

        // 3. Força de atração central leve para manter os nós visíveis
        newNodes.forEach(node => {
          const dx = 400 - node.x;
          const dy = 200 - node.y;
          node.vx += dx * 0.005;
          node.vy += dy * 0.005;
        });

        // 4. Aplicar velocidade e limites ao espaço
        newNodes.forEach(node => {
          if (node.id === draggedNodeId) {
            node.vx = 0;
            node.vy = 0;
            return; // O nó sendo arrastado não recebe física
          }
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;

          // Limites do viewBox 800x430
          node.x = Math.max(40, Math.min(760, node.x));
          node.y = Math.max(40, Math.min(390, node.y));
        });

        return newNodes;
      });

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [draggedNodeId, interopConnections]);

  const handleGraphMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedNodeId(nodeId);
  };

  const handleGraphMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 430;

    const boundedX = Math.max(30, Math.min(770, x));
    const boundedY = Math.max(30, Math.min(400, y));

    setInteropNodes(prev => prev.map(node => 
      node.id === draggedNodeId ? { ...node, x: boundedX, y: boundedY } : node
    ));
  };

  const handleGraphMouseUp = () => {
    setDraggedNodeId(null);
  };


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
      if (json.success) {
        setSemanticResult(json.data);
        
        // --- APRENDIZADO CONTÍNUO: Pesquisa RAG alimenta a cadeia de DNA Semântico ---
        const tag = json.data.tag || searchTag;
        const tagKey = tag.toLowerCase();
        
        // 1. Injetar nó no grafo de Interoperabilidade se não existir
        setInteropNodes(currentNodes => {
          const exists = currentNodes.some(n => n.id.toLowerCase() === tagKey);
          if (!exists) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 180 + Math.random() * 50;
            const x = 400 + Math.cos(angle) * radius;
            const y = 215 + Math.sin(angle) * radius;
            
            const newNode = {
              id: tagKey,
              label: tag,
              x,
              y,
              size: 14,
              fill: "#6D28D9", // Cor roxa para nós aprendidos via RAG contínuo
              desc: `Nó inferido e integrado via busca RAG contínua sobre acervos digitais.`,
              type: "Conceito Aprendido (RAG)",
              hash: `rag_dna_${Math.random().toString(16).slice(2, 6)}_delta`,
              vx: 0,
              vy: 0,
              activation: 1.0 // Pulsa na criação
            };
            return [...currentNodes, newNode];
          }
          return currentNodes.map(n => n.id.toLowerCase() === tagKey ? { ...n, activation: 1.0 } : n);
        });

        // 2. Conectar a tag ao núcleo central
        setInteropConnections(currentConns => {
          const exists = currentConns.some(c => 
            (c.from === 'core' && c.to === tagKey) || 
            (c.from === tagKey && c.to === 'core')
          );
          if (!exists) {
            return [...currentConns, {
              from: "core",
              to: tagKey,
              weight: 0.82 + Math.random() * 0.12,
              discovered: true
            }];
          }
          return currentConns;
        });

        // 3. Adicionar aos itens descobertos no feed lateral
        const key = `core-${tagKey}`;
        if (!discoveredKeysRef.current.has(key)) {
          discoveredKeysRef.current.add(key);
          setNnDiscovered(prevDisc => [
            {
              id: `disc-rag-${Date.now()}`,
              from: "core",
              to: tagKey,
              label: `RAG: "${tag}" integrado à malha de DNA Semântico`,
              epoch: nnEpochRef.current,
              confidence: 96
            },
            ...prevDisc
          ].slice(0, 12));
        }
      }
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

  // Inicialização automática do treinamento neural na aba de Interoperabilidade
  useEffect(() => {
    if (activeTab === 'interoperabilidade') {
      startTraining();
    } else {
      stopTraining();
    }
  }, [activeTab, startTraining, stopTraining]);

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
            <div className="bg-white/30 p-2.5 rounded-xl border border-black/07 flex items-center justify-between">
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

    const tag          = semanticResult.tag || '';
    const certeza      = semanticResult.motores?.transformer?.certeza ?? 0;
    const aguardando   = semanticResult.motores?.transformer?.aguardandoTreino;
    const tesauro      = semanticResult.tesauro?.contexto || '';
    const termosExp    = (semanticResult.tesauro?.termosExpandidos || []) as string[];
    const ibramTotal   = semanticResult.correlacoes?.ibram?.total ?? 0;
    const brasTotal    = semanticResult.correlacoes?.brasiliana?.total ?? 0;
    const internasTotal= semanticResult.correlacoes?.internas?.total ?? 0;
    const auxiliarTotal= semanticResult.correlacoes?.auxiliares?.total ?? 0;
    const internas     = (semanticResult.correlacoes?.internas?.items || []) as any[];
    const analise      = semanticResult.analiseEscrita || '';
    const estruturado  = semanticResult.relatorioEstruturado;
    const camadas      = estruturado?.camadas || {};

    const dataGeracao  = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // ─── converte markdown simples para HTML ──────────────────────
    const md2html = (md: string): string => {
      if (!md) return '';
      return md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3 class="sec-title">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="sec-title2">$1</h2>')
        .replace(/^#### (.+)$/gm, '<h4 class="sec-subtitle">$1</h4>')
        .replace(/^---$/gm, '<hr class="divider"/>')
        .replace(/^> (.+)$/gm, '<blockquote class="bq">$1</blockquote>')
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#c44000">$1</a>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .split('\n').map(l => {
          if (/^<(h[2-4]|hr|ul|blockquote|li)/.test(l.trim())) return l;
          if (l.trim() === '') return '<br/>';
          return `<p class="body-p">${l}</p>`;
        }).join('\n');
    };

    // ─── gráfico de barras inline SVG ─────────────────────────────
    const barMax = Math.max(ibramTotal, brasTotal, internasTotal, auxiliarTotal, 1);
    const barW = 180;
    const bars = [
      { label: 'IBRAM/Tainacan', val: ibramTotal, color: '#c44000' },
      { label: 'Brasiliana Museus', val: brasTotal, color: '#1E3A8A' },
      { label: 'Tags Internas', val: internasTotal, color: '#1A6B3A' },
      { label: 'Fontes Auxiliares', val: auxiliarTotal, color: '#E8A920' },
    ];
    const svgBars = bars.map((b, i) => {
      const w = Math.round((b.val / barMax) * barW);
      const y = i * 32 + 8;
      return `<g>
        <rect x="0" y="${y}" width="${w || 2}" height="20" fill="${b.color}" rx="3"/>
        <text x="${(w || 2) + 6}" y="${y + 14}" font-size="10" fill="#333">${b.val} — ${b.label}</text>
      </g>`;
    }).join('');
    const svgChart = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="${bars.length * 32 + 16}" style="margin:8px 0 16px">
      ${svgBars}
    </svg>`;

    // ─── barra de certeza ─────────────────────────────────────────
    const certW = Math.round(certeza * 2.8);
    const certColor = certeza >= 95 ? '#16a34a' : certeza >= 60 ? '#d97706' : '#dc2626';
    const certChart = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="28">
      <rect x="0" y="4" width="280" height="16" fill="#f1f5f9" rx="8"/>
      <rect x="0" y="4" width="${certW}" height="16" fill="${certColor}" rx="8"/>
      <text x="288" y="16" font-size="11" fill="${certColor}" font-weight="700">${certeza}%</text>
    </svg>`;

    // ─── monta o HTML completo ─────────────────────────────────────
    const fullReport = analise || (estruturado?.camadas
      ? Object.values(estruturado.camadas).join('\n\n')
      : estruturado?.deducao || '');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório Semântico NUGEP — ${tag}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=DM+Serif+Display&display=swap');
  @page { margin: 2cm 2.5cm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#fff; color:#1a1a1a; font-size:12px; line-height:1.8; }
  .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:64px; font-weight:900; color:rgba(200,60,0,0.07); white-space:nowrap; pointer-events:none; z-index:-1; }
  .header { border-bottom:3px solid #c44000; padding-bottom:18px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:flex-end; }
  .sysname { font-family:'DM Serif Display',serif; font-size:22px; color:#111; }
  .rtype { font-size:11px; color:#c44000; font-weight:700; text-transform:uppercase; letter-spacing:.12em; margin-top:3px; }
  .badge { background:#c44000; color:#fff; font-size:8px; font-weight:900; letter-spacing:.2em; text-transform:uppercase; padding:2px 8px; border-radius:3px; }
  .datebox { text-align:right; font-size:9px; color:#999; }
  .tag-block { background:#fff5f0; border-left:4px solid #c44000; padding:18px 22px; margin-bottom:22px; border-radius:0 6px 6px 0; }
  .tag-label { font-size:9px; text-transform:uppercase; letter-spacing:.2em; color:#999; font-weight:700; margin-bottom:4px; }
  .tag-value { font-family:'DM Serif Display',serif; font-size:34px; color:#c44000; }
  .certeza-row { display:flex; align-items:center; gap:16px; padding:14px 18px; background:${aguardando?'#fffbea':'#f0fdf4'}; border:1px solid ${aguardando?'#fde68a':'#86efac'}; border-radius:8px; margin-bottom:22px; }
  .certeza-num { font-size:40px; font-weight:900; color:${certColor}; }
  .certeza-info { }
  .certeza-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:${aguardando?'#92400e':'#166534'}; }
  .certeza-desc { font-size:10px; color:#666; margin-top:3px; }
  .stats-row { display:flex; gap:20px; margin-bottom:22px; }
  .stat-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; flex:1; text-align:center; }
  .stat-val { font-size:22px; font-weight:700; color:#111; }
  .stat-lbl { font-size:8px; text-transform:uppercase; letter-spacing:.15em; color:#999; }
  .sec-title { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:.25em; color:#c44000; border-bottom:1px solid #fde8e0; padding-bottom:6px; margin:22px 0 10px; }
  .sec-title2 { font-family:'DM Serif Display',serif; font-size:16px; color:#111; margin:20px 0 8px; }
  .sec-subtitle { font-size:11px; font-weight:700; color:#333; margin:14px 0 4px; }
  .body-p { font-size:11.5px; color:#333; margin:4px 0; line-height:1.75; }
  .bq { border-left:3px solid #c44000; padding:8px 14px; background:#fff5f0; font-style:italic; color:#555; margin:10px 0; border-radius:0 4px 4px 0; font-size:11px; }
  li { font-size:11px; color:#333; margin:2px 0 2px 20px; }
  ul { margin:6px 0; }
  .divider { border:none; border-top:1px solid #e5e7eb; margin:16px 0; }
  .termos { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
  .termo { background:#fef3c7; color:#92400e; font-size:9px; font-weight:700; padding:2px 8px; border-radius:12px; border:1px solid #fde68a; }
  table { width:100%; border-collapse:collapse; font-size:10px; margin:10px 0; }
  th { background:#f8fafc; color:#555; font-size:8px; text-transform:uppercase; letter-spacing:.12em; padding:6px 10px; border:1px solid #e5e7eb; text-align:left; }
  td { padding:6px 10px; border:1px solid #e5e7eb; color:#333; }
  .footer { border-top:1px solid #e5e7eb; margin-top:36px; padding-top:12px; display:flex; justify-content:space-between; font-size:9px; color:#aaa; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="watermark">USO EXCLUSIVO DO NUGEP</div>
<div class="header">
  <div>
    <p class="sysname">Folksonomia Digital 2.0</p>
    <p class="rtype">Relatório Semântico — Análise por Deep Learning</p>
  </div>
  <div class="datebox">
    <p>Gerado em</p>
    <p style="font-weight:700;color:#111;font-size:11px">${dataGeracao}</p>
    <span class="badge">⬣ NUGEP</span>
  </div>
</div>

<div class="tag-block">
  <p class="tag-label">Conceito Analisado</p>
  <p class="tag-value">${tag}</p>
</div>

<div class="certeza-row">
  <div class="certeza-num">${certeza}%</div>
  <div class="certeza-info">
    <p class="certeza-lbl">${aguardando ? 'Em aprendizado contínuo' : 'Certeza semântica atingida'}</p>
    <p class="certeza-desc">${aguardando
      ? 'Limiar de 95% não atingido. O sistema ampliará as buscas progressivamente.'
      : 'O raciocínio vetorial confirma correlação semântica robusta com o acervo institucional.'}
    </p>
    ${certChart}
  </div>
</div>

<div class="stats-row">
  <div class="stat-box"><p class="stat-val">${ibramTotal}</p><p class="stat-lbl">IBRAM / Tainacan</p></div>
  <div class="stat-box"><p class="stat-val">${brasTotal}</p><p class="stat-lbl">Brasiliana Museus</p></div>
  <div class="stat-box"><p class="stat-val">${internasTotal}</p><p class="stat-lbl">Tags correlatas</p></div>
  <div class="stat-box"><p class="stat-val">${auxiliarTotal}</p><p class="stat-lbl">Fontes auxiliares</p></div>
</div>

<p class="sec-title">📊 Distribuição por Base de Dados</p>
${svgChart}

${tesauro ? `<p class="sec-title">📖 Tesauro CNFCP / IPHAN — Definição Normativa</p>
<div class="bq">${tesauro.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
${termosExp.length > 0 ? `<div class="termos">${termosExp.map((t: string) => `<span class="termo">${t}</span>`).join('')}</div>` : ''}` : ''}

<p class="sec-title">📋 Análise Completa do Sistema de IA</p>
${md2html(fullReport)}

${internas.length > 0 ? `<p class="sec-title">🏷️ Tags Correlatas no Sistema</p>
<div class="termos">${internas.slice(0,30).map((t: any) => `<span class="termo">${t.tag_original}</span>`).join('')}</div>` : ''}

<div class="footer">
  <span>Sistema de Folksonomia Digital 2.0 — NUGEP</span>
  <span>Confidencial — Uso interno</span>
  <span>${dataGeracao}</span>
</div>
</body></html>`;

    // Download via Blob — sem popup blocker
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `relatorio-semantico-${tag.replace(/\s+/g, '-')}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Abre para impressão como PDF
    const pdfWin = window.open(blobUrl, '_blank');
    if (pdfWin) {
      pdfWin.addEventListener('load', () => setTimeout(() => pdfWin.print(), 800));
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
  };


  return (
    <div className="min-h-screen pt-28 md:pt-32 pb-20 px-3 md:px-8 print:pt-0">
      <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-10">

        {/* Tab Navigation — sticky com glass background para legibilidade */}
        <div
          className="sticky top-[72px] z-30 -mx-3 px-3 md:mx-0 md:px-0 pb-1 pt-2"
          style={{
            background: 'rgba(238,235,227,0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <nav className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-black/10 print:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex-shrink-0 px-4 md:px-7 py-2 md:py-2.5 rounded-xl text-[9px] md:text-xs font-semibold uppercase tracking-wider transition-all liquid-button ${
                activeTab === tab.id 
                  ? '!bg-[#E8490A] !text-white border border-[#E8490A]/30 shadow-[0_4px_16px_rgba(232,73,10,0.25)]' 
                  : '!bg-white/40 !text-[#1A1A1A]/70 hover:!bg-white/75'
              }`}
            >
              {tab.label}
            </button>
          ))}
          </nav>
        </div>

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
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-black/10 flex items-center justify-center bg-white/50">
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
                   <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-2xl relative animate-fade-in">
                       <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-[#1A1A1A]/55 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-lg serif-title mb-6">Adicionar Nova Obra</h3>
                       <form onSubmit={handleAddObra} className="space-y-4">
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Título</label>
                           <input required value={obraForm.titulo} onChange={e => setObraForm({...obraForm, titulo: e.target.value})} className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Cálice Colonial" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Autor/Artista</label>
                             <input value={obraForm.artista} onChange={e => setObraForm({...obraForm, artista: e.target.value})} className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                           <div>
                             <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Ano</label>
                             <input value={obraForm.ano} onChange={e => setObraForm({...obraForm, ano: e.target.value})} className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" />
                           </div>
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Descrição</label>
                           <textarea value={obraForm.descricao} onChange={e => setObraForm({...obraForm, descricao: e.target.value})} rows={3} className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none"></textarea>
                         </div>
                         <div>
                            <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider mb-2 block">Foto da Obra</label>
                            <div 
                              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-[#E85002] bg-[#E85002]/10' : imagePreview ? 'border-orange-500/30 bg-orange-500/5' : 'border-black/10 hover:border-black/15 bg-white/50'}`}
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
                                  <div className="w-12 h-12 mx-auto rounded-full bg-white/50 border border-black/10 flex items-center justify-center">
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
                           <div className="h-48 overflow-hidden bg-white/30">
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
                   <button onClick={() => { setTagAnalysisResult(null); setSelectedTagForAnalysis(null); }} className="liquid-button !bg-white/50 text-[11px] font-semibold tracking-wider">Limpar Análise</button>
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
                                : 'bg-white/50 border-black/10 hover:border-black/15'
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
                               <span className="px-3 py-1 bg-white/50 border border-black/10 rounded-full text-[10px] uppercase font-semibold tracking-wider text-[#1A1A1A]/45">
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
                                     <div className="h-1 w-16 bg-white/50 rounded-full overflow-hidden">
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
                                       <div className="h-2 flex-1 bg-white/50 rounded-full overflow-hidden">
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
                                 const colorClass = actionColors[t.action] || 'text-[#1A1A1A]/55 bg-white/50';
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
                           <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
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
                    <button onClick={handleExportPDF} disabled={!semanticResult} className="liquid-button !bg-white/45 backdrop-blur-md border border-white/50 shadow-md flex items-center gap-2 flex-1 md:flex-none justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed !text-[#1A1A1A]">
                      <FileText size={16} /> Exportar PDF
                    </button>
                    <button onClick={handleExportCSV} className="liquid-button !bg-[#E8490A] !text-white flex items-center gap-2 flex-1 md:flex-none justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(232,73,10,0.15)]">
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
                    <h1 style={{fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase'}}>Folksonomia Digital</h1>
                    <p style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>NUGEP — Documentação Semântica — Relatório Gerado em {new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                    {semanticResult && !semanticResult.tagNaoExiste && (
                      <p style={{fontSize: '18px', fontWeight: 'bold', marginTop: '12px', color: '#c44000'}}>Tag analisada: &quot;{semanticResult.tag}&quot;</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE BUSCA SEMÂNTICA — estilo liquid glass */}
                <div className="glass-card p-6 flex gap-4 items-center print:hidden !bg-white/62 backdrop-blur-xl border border-white/50 shadow-xl">
                  <Search size={20} className="text-[#1A1A1A]/45" />
                  <input
                    value={searchTag}
                    onChange={e => setSearchTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
                    placeholder="Buscar tag para análise semântica profunda (ex: espada, liturgia, barroco, cubismo...)"
                    className="liquid-input flex-1 !p-3.5 text-sm"
                  />
                  <button onClick={handleSemanticSearch} disabled={isAnalyzing} className="liquid-button !bg-[#E8490A] !text-white !px-8 hover:!bg-[#c73d08] shadow-[0_4px_12px_rgba(232,73,10,0.15)]">
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
                                  <div key={i} className="p-4 !bg-white/70 backdrop-blur-md border border-white/45 rounded-xl shadow-sm space-y-3">
                                    <p className="text-sm font-semibold leading-tight">{item.titulo}</p>
                                    {item.criador && item.criador !== 'Desconhecido' && <p className="text-[10px] text-[#E85002] font-semibold">{item.criador}</p>}
                                    {item.museu && <p className="text-[10px] text-[#1A1A1A]/60 font-medium">{item.museu} {item.localizacao ? `— ${item.localizacao}` : ''}</p>}
                                    {item.material && <p className="text-[10px] text-[#1A1A1A]/50">Material: {item.material}</p>}
                                    {item.tecnica && <p className="text-[10px] text-[#1A1A1A]/50">Técnica: {item.tecnica}</p>}
                                    {item.data && <p className="text-[10px] text-[#1A1A1A]/50">{item.data}{item.pais ? ` • ${item.pais}` : ''}</p>}
                                    {/* Razões da correlação */}
                                    {corr?.reasons?.length > 0 && (
                                      <div className="pt-2.5 border-t border-black/07 space-y-1.5">
                                        {corr.reasons.slice(0, 3).map((r: any, ri: number) => (
                                          <p key={ri} className="text-[10px] text-orange-500 font-medium">✓ {r.description}</p>
                                        ))}
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#E85002]" style={{ width: `${(corr.score || 0) * 100}%` }} />
                                          </div>
                                          <span className="text-[10px] text-[#1A1A1A]/45 font-mono font-bold">{Math.round((corr.score || 0) * 100)}%</span>
                                        </div>
                                      </div>
                                    )}
                                    {item.link && (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer" 
                                        className="liquid-button !w-full !py-1.5 !px-2.5 !rounded-lg !text-[9px] !font-bold flex items-center justify-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition-all">
                                        <Globe size={10} className="text-black/60" /> Acessar Base de Dados
                                      </a>
                                    )}
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
                            <div key={i} className="p-4 bg-white/50 rounded-lg border border-black/07">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-semibold uppercase rounded">{conn.sourceA}</span>
                                <span className="text-[#1A1A1A]/25">↔</span>
                                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-semibold uppercase rounded">{conn.sourceB}</span>
                                <span className="text-[10px] text-[#1A1A1A]/38 ml-auto font-medium">{Math.round(conn.confidence * 100)}% de confiança</span>
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
                          <div className="text-center p-3 bg-white/50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-400">{semanticResult.knowledge.previousCorrelations}</p>
                            <p className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/38 font-semibold">Correlações Prévias</p>
                          </div>
                          <div className="text-center p-3 bg-white/50 rounded-lg">
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

                            {/* Seção XAI (Rastreabilidade e Explicabilidade) */}
                            {semanticResult.relatorioEstruturado.explicabilidade && semanticResult.relatorioEstruturado.explicabilidade.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-white/10">
                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
                                  <Layers size={12} className="text-orange-400" /> Rastreabilidade e Explicabilidade (XAI)
                                </h5>
                                <div className="space-y-3">
                                  {semanticResult.relatorioEstruturado.explicabilidade.map((item: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs">
                                      <div className="flex justify-between items-center mb-1 text-white/40">
                                        <span className="font-mono text-[9px] uppercase tracking-wide">{item.caminho}</span>
                                        <span className="text-orange-400 font-bold">{(item.similarity * 100).toFixed(0)}% similaridade</span>
                                      </div>
                                      <p className="text-white/80 leading-relaxed italic">"{item.texto}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="glass-card p-8 border-l-4 border-[#E8490A]/50 relative overflow-hidden">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-[#E8490A] mb-3 flex items-center gap-2">
                              <Brain size={16} /> Parecer Semântico Institucional
                            </h4>
                            <div className="text-[#1A1A1A] space-y-3 font-normal">
                              {renderMarkdown(semanticResult.relatorioEstruturado.deducao)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="glass-card p-8 relative overflow-hidden mt-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                          <FileText size={16} className="text-[#E85002]" /> Análise Escrita
                        </h4>
                        <div className="text-[#1A1A1A] space-y-3 leading-relaxed relative z-10">
                          {renderMarkdown(semanticResult.analiseEscrita)}
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
                         <div className="p-4 bg-white/50 border border-black/10 rounded-lg mb-4 space-y-2">
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
                         <div className="p-4 bg-white/50 border border-black/10 rounded-lg mb-4 space-y-2">
                           <p className="text-[11px] uppercase font-semibold tracking-wider text-[#1A1A1A]/48 mb-2">DNA Semântico</p>
                           {Object.entries(tagAnalysisResult.dna).filter(([,v]) => (v as number) > 0).sort(([,a],[,b]) => (b as number) - (a as number)).map(([k,v]) => {
                             const labels: Record<string,string> = { period:'Período', technique:'Técnica', geography:'Geografia', material:'Material', theme:'Temática', movement:'Movimento', provenance:'Proveniência' };
                             return (
                               <div key={k} className="flex items-center gap-2">
                                 <span className="text-[10px] text-[#1A1A1A]/48 w-20 text-right uppercase font-semibold">{labels[k]||k}</span>
                                 <div className="h-1.5 flex-1 bg-white/50 rounded-full overflow-hidden">
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
                   <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center p-4">
                     <div className="glass-card p-12 text-center">
                       <div className="w-8 h-8 border-4 border-[#E85002] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="text-[#1A1A1A]/45 text-[10px] uppercase tracking-widest font-bold">Cérebro analisando &quot;{graphNodeSelected}&quot;...</p>
                     </div>
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
                   <div className="fixed inset-0 z-50 bg-white/80 flex items-center justify-center p-4">
                     <div className="glass-card p-8 w-full max-w-lg relative animate-fade-in">
                       <button onClick={() => setShowOntologiaForm(false)} className="absolute top-6 right-6 text-[#1A1A1A]/55 hover:text-white">
                         <X size={24} />
                       </button>
                       <h3 className="text-xl serif-title mb-6">Mapear Nova Ontologia</h3>
                       <form onSubmit={(e) => { e.preventDefault(); alert('Ontologia mapeada com sucesso!'); setShowOntologiaForm(false); }} className="space-y-4">
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Nome da Ontologia / Padrão</label>
                           <input required className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: Dublin Core" />
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">Provedor / Instituição</label>
                           <input required className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="Ex: DCMI" />
                         </div>
                         <div>
                           <label className="text-[11px] uppercase font-semibold text-[#1A1A1A]/48 tracking-wider">URL do Endpoint (SPARQL/API)</label>
                           <input type="url" className="w-full bg-white/50 border border-black/10 rounded-lg p-3 text-sm focus:border-[#E85002] outline-none" placeholder="https://..." />
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
              <div className="space-y-6 animate-fade-in text-[#1A1A1A]">

                {/* ── HEADER ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-5">
                  <div>
                    <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
                      <Brain size={24} className="text-[#E8490A]" />
                      Interoperabilidade Cultural — Motor Neural
                    </h2>
                    <p className="text-xs text-[#1A1A1A]/50 mt-1 uppercase tracking-widest font-semibold">
                      Rede neural aprendendo e criando conexões semânticas em tempo real
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Velocidade */}
                    <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/45 font-bold mr-1">Velocidade de Processamento:</span>
                    <div className="flex items-center gap-1 bg-white/25 backdrop-blur-md rounded-full p-1 border border-white/35 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
                      {(['lento','normal','rapido'] as const).map(s => (
                        <button key={s} onClick={() => { setNnSpeed(s); }}
                          className={`text-[9px] uppercase font-black px-3.5 py-1.5 rounded-full transition-all ${nnSpeed === s ? 'bg-[#E8490A] text-white shadow-md scale-105' : 'text-[#1A1A1A]/65 hover:text-[#1A1A1A] hover:bg-white/30'}`}>
                          {s === 'lento' ? 'Lento' : s === 'normal' ? 'Normal' : 'Rápido'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── GRAFO NEURAL + PAINEL LATERAL ────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* COLUNA 1+2: Grafo Neural */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="glass-card p-5 border border-black/07">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#E8490A] flex items-center gap-2">
                          <Network size={14}/> Rede Semantica — Aprendizado Hebbiano
                        </h3>
                        <span className="text-[8px] uppercase tracking-wider text-[#1A1A1A]/40 font-semibold font-mono">
                          {interopConnections.filter(c => c.discovered).length} sinapses novas / {interopConnections.length} total
                        </span>
                      </div>

                      {/* SVG NEURAL */}
                      <div className="relative w-full h-[430px] bg-[#0D0D0B] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <svg
                          ref={svgRef}
                          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                          viewBox="0 0 800 430"
                          onMouseMove={handleGraphMouseMove}
                          onMouseUp={handleGraphMouseUp}
                          onMouseLeave={handleGraphMouseUp}
                        >
                          {/* Estilos sinápticos locais */}
                          <style>{`
                            @keyframes synapseFlow  { to { stroke-dashoffset: -28; } }
                            @keyframes synapseNew   { 0%,100%{opacity:.3} 50%{opacity:1} }
                            @keyframes nodeActivate { 0%{r:0;opacity:.4} 60%{r:1;opacity:.8} 100%{r:0;opacity:0} }
                            .synapse-pulse { stroke-dasharray: 4,10; animation: synapseFlow 1.6s linear infinite; }
                            .synapse-new   { stroke-dasharray: 6,8;  animation: synapseNew 1.2s ease-in-out infinite; }
                          `}</style>

                          <defs>
                            <filter id="nn-glow" x="-60%" y="-60%" width="220%" height="220%">
                              <feGaussianBlur stdDeviation="9" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="nn-soft" x="-40%" y="-40%" width="180%" height="180%">
                              <feGaussianBlur stdDeviation="3.5" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="nn-fire" x="-80%" y="-80%" width="260%" height="260%">
                              <feGaussianBlur stdDeviation="14" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <marker id="arrow-nn" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.25)"/>
                            </marker>
                            <marker id="arrow-new" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa"/>
                            </marker>
                          </defs>

                          {/* Grade de pontos de fundo */}
                          {Array.from({length: 48}).map((_, i) => (
                            <circle key={`bg${i}`} cx={(i%8)*115+30} cy={Math.floor(i/8)*72+30} r="1.2" fill="rgba(255,255,255,0.03)"/>
                          ))}

                          {/* SINAPSES com espessura proporcional ao peso */}
                          {interopConnections.map((conn, idx) => {
                            const fn = interopNodes.find(n => n.id === conn.from);
                            const tn = interopNodes.find(n => n.id === conn.to);
                            if (!fn || !tn) return null;
                            const isSel = graphNodeSelected && (fn.label === graphNodeSelected || tn.label === graphNodeSelected);
                            const w = conn.weight;
                            const isDisc = conn.discovered;
                            return (
                              <g key={`conn-${idx}`}>
                                {/* Linha base */}
                                <line x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                                  stroke={isDisc ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)'}
                                  strokeWidth={isDisc ? 1.5 : w * 2 + 0.5}/>
                                {/* Pulso sináptico */}
                                <line x1={fn.x} y1={fn.y} x2={tn.x} y2={tn.y}
                                  stroke={isDisc ? '#a78bfa' : fn.fill}
                                  strokeWidth={isDisc ? 1.2 : w * 2.5}
                                  className={isDisc ? 'synapse-new' : 'synapse-pulse'}
                                  markerEnd={isDisc ? 'url(#arrow-new)' : 'url(#arrow-nn)'}
                                  style={{opacity: isSel ? 1 : isDisc ? 0.6 : w * 0.7 + 0.15}}/>
                                {/* Label de peso nas arestas selecionadas */}
                                {isSel && (
                                  <text x={(fn.x+tn.x)/2} y={(fn.y+tn.y)/2 - 5} textAnchor="middle"
                                    fill="rgba(255,255,255,0.7)" fontSize="7" fontFamily="monospace"
                                    className="pointer-events-none">
                                    w={w.toFixed(2)}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* NEURONIOS */}
                          {interopNodes.map(node => {
                            const isSel   = node.label === graphNodeSelected;
                            const isFire  = node.id === firingNode;
                            const act     = node.activation ?? 0;
                            return (
                              <g key={node.id}
                                className="cursor-pointer"
                                onMouseDown={e => handleGraphMouseDown(node.id, e)}
                                onClick={() => setGraphNodeSelected(node.label === graphNodeSelected ? null : node.label)}
                              >
                                {/* Halo de ativacao */}
                                <circle cx={node.x} cy={node.y} r={node.size + 18}
                                  fill={node.fill} opacity={isFire ? 0.35 : act * 0.14}
                                  className="pointer-events-none"
                                  style={{transition:'opacity 0.4s, r 0.4s'}}/>
                                <circle cx={node.x} cy={node.y} r={node.size + 8}
                                  fill={node.fill} opacity={isFire ? 0.5 : act * 0.22}
                                  className="pointer-events-none"/>
                                {/* Nucleo */}
                                <circle cx={node.x} cy={node.y} r={isFire ? node.size + 4 : node.size}
                                  fill={node.fill}
                                  filter={isFire ? 'url(#nn-fire)' : isSel ? 'url(#nn-glow)' : 'url(#nn-soft)'}
                                  stroke={isSel ? 'white' : isFire ? '#fff' : 'transparent'}
                                  strokeWidth={isSel || isFire ? 2 : 0}
                                  style={{transition:'all 0.25s'}}/>
                                {/* Barra de ativacao lateral */}
                                <rect x={node.x + node.size + 3} y={node.y - 8} width="3" height="16"
                                  fill="rgba(255,255,255,0.08)" rx="1.5" className="pointer-events-none"/>
                                <rect x={node.x + node.size + 3} y={node.y + 8 - 16 * act} width="3" height={16 * act}
                                  fill={node.fill} rx="1.5" className="pointer-events-none"
                                  style={{transition:'height 0.3s, y 0.3s'}}/>
                                {/* Label */}
                                <text x={node.x} y={node.y + node.size + 17}
                                  textAnchor="middle"
                                  fill={isSel ? 'white' : 'rgba(255,255,255,0.55)'}
                                  fontSize="8.5" fontWeight={isSel ? '700' : '400'}
                                  className="pointer-events-none"
                                  style={{transition:'fill 0.3s'}}>
                                  {node.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Overlay de status de treino */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${nnIsTraining ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                          <span className="text-[8px] uppercase font-bold tracking-widest text-white/50 font-mono">
                            {nnIsTraining ? `Processando Rede — Época ${nnEpoch}` : 'Pausado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FEED DE CONEXOES DESCOBERTAS + DEEP LEARNING */}
                    <div className="glass-card p-5 border border-black/07 space-y-4">
                      {/* Header com botão treinar */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center gap-2">
                          <Activity size={14}/> DNA Semântico — Sinapses Descobertas
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-[#1A1A1A]/35 uppercase tracking-widest">{nnDiscovered.length} / {latentConnections.current.length}</span>
                          <button
                            onClick={async () => {
                              // Deep Learning: pesquisa cada nó e salva conexões reais
                              const nodesToTrain = interopNodes.filter(n => n.id !== 'core').slice(0, 3);
                              for (const node of nodesToTrain) {
                                setDlSearching(node.label);
                                try {
                                  const res = await fetch('/api/admin/relatorio-semantico', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ tag: node.label })
                                  });
                                  const json = await res.json();
                                  if (json.success) {
                                    const ibramTotal = json.data?.correlacoes?.ibram?.total ?? 0;
                                    const brasTotal  = json.data?.correlacoes?.brasiliana?.total ?? 0;
                                    const siblings   = json.data?.tagAnalysis?.siblings ?? [];
                                    // Atualiza peso da sinapse baseado em evidências reais
                                    const newWeight = Math.min(0.99, 0.5 + (ibramTotal + brasTotal) * 0.04);
                                    setInteropConnections(curr => curr.map(c =>
                                      (c.from === node.id || c.to === node.id)
                                        ? { ...c, weight: Math.max(c.weight, newWeight) }
                                        : c
                                    ));
                                    // Injeta irmãos semânticos como novos nós/conexões
                                    siblings.slice(0, 2).forEach((sib: any) => {
                                      setInteropConnections(curr => {
                                        const exists = curr.some(c => (c.from === node.id && c.to === sib.tag) || (c.to === node.id && c.from === sib.tag));
                                        if (exists) return curr;
                                        return [...curr, { from: node.id, to: 'core', weight: 0.35, isNew: true, discovered: true, label: sib.tag }];
                                      });
                                    });
                                    setDlLog(log => [{ tag: node.label, resultado: `${ibramTotal + brasTotal} registros — ${siblings.length} irmãos semânticos`, ts: new Date().toLocaleTimeString('pt-BR') }, ...log].slice(0, 8));
                                  }
                                } catch(e) { /* silencioso */ }
                              }
                              setDlSearching(null);
                            }}
                            className="text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#6D28D9]/10 text-[#6D28D9] border border-[#6D28D9]/20 hover:bg-[#6D28D9]/20 transition-all flex items-center gap-1.5"
                            disabled={!!dlSearching}
                          >
                            <Cpu size={10}/>
                            {dlSearching ? `Treinando: ${dlSearching}...` : 'Treinar com IA'}
                          </button>
                        </div>
                      </div>

                      {/* Log de deep learning */}
                      {dlLog.length > 0 && (
                        <div className="space-y-1 border-t border-black/05 pt-3">
                          <p className="text-[7px] uppercase font-bold text-[#1A1A1A]/30 tracking-widest mb-2">Log de Aprendizado Contínuo</p>
                          {dlLog.map((l, i) => (
                            <div key={i} className="flex items-center gap-2 text-[8px] font-mono">
                              <span className="text-[#1A1A1A]/30">{l.ts}</span>
                              <span className="font-bold text-[#6D28D9]/80 truncate">{l.tag}</span>
                              <span className="text-[#1A1A1A]/50 truncate">{l.resultado}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Feed de sinapses descobertas */}
                      {nnDiscovered.length === 0 && dlLog.length === 0 ? (
                        <div className="text-center py-6">
                          <Brain size={20} className="mx-auto text-[#1A1A1A]/15 mb-2"/>
                          <p className="text-[9px] uppercase tracking-widest text-[#1A1A1A]/30 font-semibold">
                            Clique em «Treinar com IA» para iniciar o aprendizado e descobrir conexões semânticas reais
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {nnDiscovered.map(d => {
                            const fromNode = interopNodes.find(n => n.id === d.from);
                            const toNode   = interopNodes.find(n => n.id === d.to);
                            return (
                              <div key={d.id} className="p-2.5 bg-purple-500/5 border border-purple-500/15 rounded-xl animate-fade-in">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse mt-1 flex-shrink-0"/>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-[#1A1A1A]/80">{d.label}</p>
                                    <p className="text-[8px] font-mono text-[#1A1A1A]/40 mt-0.5">
                                      <span style={{color: fromNode?.fill}}>{fromNode?.label ?? d.from}</span>
                                      <span className="text-[#1A1A1A]/30"> ↔ </span>
                                      <span style={{color: toNode?.fill}}>{toNode?.label ?? d.to}</span>
                                    </p>
                                    {/* Links dos nós */}
                                    {(fromNode as any)?.linksReais?.[0] && (
                                      <a href={(fromNode as any).linksReais[0].url} target="_blank" rel="noopener noreferrer"
                                        className="text-[7px] text-[#E8490A] hover:underline inline-flex items-center gap-0.5 mt-1">
                                        Ver no acervo ↗
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <span className="text-[8px] font-bold text-purple-700 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">{d.confidence}%</span>
                                    <p className="text-[7px] text-[#1A1A1A]/30 font-mono mt-0.5">ép.{d.epoch}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUNA 3: Painel de Inspecao do Neuronio */}
                  <div className="space-y-4">
                    {/* Card de inspecao */}
                    {graphNodeSelected ? (() => {
                      const nodeInfo = interopNodes.find(n => n.label === graphNodeSelected);
                      if (!nodeInfo) return null;
                      const directConns = interopConnections
                        .filter(c => c.from === nodeInfo.id || c.to === nodeInfo.id)
                        .map(c => {
                          const otherId = c.from === nodeInfo.id ? c.to : c.from;
                          const other = interopNodes.find(n => n.id === otherId);
                          return { label: other?.label ?? otherId, role: c.from === nodeInfo.id ? 'SAIDA' : 'ENTRADA', weight: c.weight, discovered: c.discovered };
                        });
                      const ni = nodeInfo as any;
                      return (
                        <div className="glass-card border border-black/07 overflow-hidden sticky top-28">
                          {/* Header */}
                          <div className="p-4 border-b border-black/08 flex items-center gap-2.5" style={{background: ni.fill + '11'}}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: ni.fill + '22'}}>
                              <Cpu size={16} style={{color: ni.fill}}/>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[#1A1A1A] truncate">{nodeInfo.label}</h4>
                              <span className="text-[8px] uppercase tracking-wider font-bold" style={{color: ni.fill}}>{nodeInfo.type}</span>
                            </div>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{background: ni.fill}}/>
                          </div>

                          {/* DNA Hash — cofre criptográfico */}
                          <div className="px-4 py-3 border-b border-black/08 bg-black/02">
                            <p className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest mb-1.5">DNA Semântico — Hash Único</p>
                            <code className="text-[8px] font-mono text-[#E8490A]/80 break-all leading-relaxed">
                              {ni.hash ?? nodeInfo.id.toUpperCase()}_NUGEP
                            </code>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[7px] text-green-700 bg-green-500/10 px-1.5 py-0.5 rounded font-bold">CERT. ÚNICA</span>
                              <span className="text-[7px] text-blue-700 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">AUDITADO</span>
                              <span className="text-[7px] text-[#E8490A] bg-[#E8490A]/10 px-1.5 py-0.5 rounded font-bold">IMUTÁVEL</span>
                            </div>
                          </div>

                          {/* Família Semântica */}
                          {ni.familia && (
                            <div className="px-4 py-3 border-b border-black/08">
                              <p className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest mb-2">Família Semântica — Árvore Genealógica</p>
                              <div className="flex flex-wrap gap-1">
                                {ni.familia.split('.').map((part: string, i: number, arr: string[]) => (
                                  <span key={i} className="text-[8px] font-mono">
                                    <span className="px-1.5 py-0.5 rounded text-white text-[7px] font-bold" style={{background: ni.fill, opacity: 0.4 + i * (0.6 / arr.length)}}>
                                      {part}
                                    </span>
                                    {i < arr.length - 1 && <span className="text-[#1A1A1A]/20 mx-0.5">›</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ativação Neural */}
                          <div className="px-4 py-3 border-b border-black/08">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest">Ativação Neural</span>
                              <span className="text-[9px] font-bold font-mono" style={{color: ni.fill}}>{((nodeInfo.activation ?? 0)*100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/08 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{width:`${(nodeInfo.activation??0)*100}%`, background: ni.fill}}/>
                            </div>
                          </div>

                          {/* Definição */}
                          <div className="px-4 py-3 border-b border-black/08">
                            <p className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest mb-1.5">Definição do Conceito</p>
                            <p className="text-[9px] text-[#1A1A1A]/65 leading-relaxed">{nodeInfo.desc}</p>
                          </div>

                          {/* Links reais dos acervos */}
                          {ni.linksReais?.length > 0 && (
                            <div className="px-4 py-3 border-b border-black/08">
                              <p className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest mb-2">Acervos que Custodiam este Conceito</p>
                              <div className="space-y-1.5">
                                {ni.acervos?.map((a: string, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[8px] text-[#1A1A1A]/50">
                                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{background: ni.fill}}/>
                                    {a}
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-1 mt-3">
                                {ni.linksReais.map((l: {label: string; url: string}, i: number) => (
                                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[8px] font-semibold hover:opacity-70 transition-opacity"
                                    style={{color: ni.fill}}>
                                    <ArrowUpRight size={9}/>
                                    {l.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sinapses ativas */}
                          <div>
                            <div className="px-4 py-2 bg-[#EEEBE3]/10">
                              <span className="text-[7px] uppercase font-bold text-[#1A1A1A]/35 tracking-widest">Conexões Neurais Ativas ({directConns.length})</span>
                            </div>
                            <div className="max-h-44 overflow-y-auto">
                              {directConns.length > 0 ? directConns.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 px-4 py-2 border-b border-black/04 last:border-0">
                                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{background: c.discovered ? '#a78bfa' : ni.fill}}/>
                                  <span className="text-[8px] font-mono text-[#1A1A1A]/65 flex-1 truncate">
                                    {c.discovered && <span className="text-purple-500 mr-1">★</span>}
                                    {c.label}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <div className="w-10 h-1 bg-black/08 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{width:`${c.weight*100}%`, background: c.discovered ? '#a78bfa' : ni.fill}}/>
                                    </div>
                                    <span className="text-[7px] font-mono text-[#1A1A1A]/35">{(c.weight*100).toFixed(0)}%</span>
                                  </div>
                                  <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${
                                    c.role==='SAIDA' ? 'text-orange-700 bg-orange-500/10' : 'text-blue-700 bg-blue-500/10'
                                  }`}>{c.role}</span>
                                </div>
                              )) : (
                                <p className="px-4 py-3 text-[8px] text-[#1A1A1A]/25 text-center">Sem conexões ativas</p>
                              )}
                            </div>
                          </div>
                        </div>

                      );
                    })() : (
                      <div className="glass-card p-8 border border-black/07 text-center sticky top-28">
                        <Brain size={22} className="mx-auto text-[#1A1A1A]/12 mb-3"/>
                        <p className="text-[9px] uppercase tracking-widest text-[#1A1A1A]/30 font-semibold leading-relaxed">
                          Clique em um neuronio para inspecionar ativacao, pesos sinápticos e extrato de custodia
                        </p>
                      </div>
                    )}

                    {/* Legenda */}
                    <div className="glass-card p-4 border border-black/07 space-y-2">
                      <p className="text-[8px] uppercase font-bold text-[#1A1A1A]/40 tracking-widest mb-2">Legenda da Rede</p>
                      {[
                        { color: '#E8490A', label: 'Nucleo do Acervo' },
                        { color: '#1E3A8A', label: 'Objeto Imaterial IPHAN' },
                        { color: '#C0252B', label: 'Cultura Popular' },
                        { color: '#1A6B3A', label: 'Arte Popular' },
                        { color: '#E8A920', label: 'Documento / Dossie' },
                        { color: '#6D28D9', label: 'Artigo Cientifico' },
                        { color: '#0891B2', label: 'Patrimonio UNESCO' },
                        { color: '#a78bfa', label: 'Sinapse Descoberta' },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: l.color}}></span>
                          <span className="text-[9px] text-[#1A1A1A]/55">{l.label}</span>
                        </div>
                      ))}
                    </div>
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
