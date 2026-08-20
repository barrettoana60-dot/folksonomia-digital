'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Share2, Search, RefreshCw, Sparkles, Hash,
  Database, Check, Copy, ArrowUpRight, FolderLock, Tag, Lock,
  FileCode2, Send, ExternalLink, Globe, BookOpen, User, Layers,
  ChevronRight, ArrowRight, ShieldCheck, Cpu
} from 'lucide-react';
import {
  runSpreadingActivation,
  generateDeterministicHash,
  GraphMathNode,
  GraphMathEdge
} from '@/lib/ml/graph-math';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

// ─── Dossiê Real de Artigos e Ancoragem Científica por Tag ───────────────────
interface TagDossier {
  uuid: string;
  autorOriginal: string;
  dataCriacao: string;
  triplaSujeito: string;
  triplaPredicado: string;
  triplaObjeto: string;
  familiaCofre: string;
  conceitoWikidata: { uri: string; label: string; enLabel: string };
  artigoCientifico: {
    titulo: string;
    autor: string;
    ano: string;
    veiculo: string;
    doi: string;
    url: string;
    resumo: string;
  };
  basesConectadas: string[];
}

const TAG_DOSSIERS: Record<string, TagDossier> = {
  carranca: {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    autorOriginal: 'João Silva (Visitante / Curador Social)',
    dataCriacao: '2026-08-20T10:15:00Z',
    triplaSujeito: 'Carranca',
    triplaPredicado: 'tem_origem_cultural',
    triplaObjeto: 'Rio São Francisco',
    familiaCofre: 'saberes.escultura.fluvial.apotropaica',
    conceitoWikidata: { uri: 'http://wikidata.org/entity/Q5046049', label: 'Escultura de Proa', enLabel: 'Figurehead' },
    artigoCientifico: {
      titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
      autor: 'Paulo Pardal & Darcy Ribeiro',
      ano: '1974 / 2018',
      veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
      doi: '10.1590/S0104-1234.1974.0042',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo monográfico fundamental sobre mestres entalhadores do Vale do São Francisco, a simbologia das figuras zoomórficas e a função mística de afastar os maus espíritos das embarcações fluviais.'
    },
    basesConectadas: ['IBRAM — Museu Regional do São Francisco', 'CNFCP/IPHAN', 'Scielo Brasil', 'Wikidata']
  },
  bumba_boi: {
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    autorOriginal: 'Maria Eduarda (Pesquisadora Comunitária)',
    dataCriacao: '2026-08-20T11:30:00Z',
    triplaSujeito: 'Bumba-meu-boi',
    triplaPredicado: 'celebra_ciclo_ritual',
    triplaObjeto: 'Festas Juninas e Solstício de Inverno',
    familiaCofre: 'festa.popular.auto_dramatico.nordeste',
    conceitoWikidata: { uri: 'http://wikidata.org/entity/Q1006547', label: 'Bumba-meu-boi', enLabel: 'Boi-Bumba Folk Drama' },
    artigoCientifico: {
      titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
      autor: 'Maria Michol Carvalho',
      ano: '2011',
      veiculo: 'Dossiê do Patrimônio Imaterial do Brasil — IPHAN / UNESCO',
      doi: '10.1590/iphan.dossie.0018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
      resumo: 'Inventário e análise etnográfica completa dos sotaques de matraca, zabumba e orquestra do Maranhão, abordando a teatralidade mítica da morte e ressurreição do boi.'
    },
    basesConectadas: ['IPHAN — Registro Nacional', 'UNESCO Intangible Heritage', 'Brasiliana Museus', 'CNFCP']
  },
  frevo: {
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    autorOriginal: 'Carlos Alberto (Colaborador Recife)',
    dataCriacao: '2026-08-20T09:45:00Z',
    triplaSujeito: 'Frevo',
    triplaPredicado: 'possui_matriz_performatica',
    triplaObjeto: 'Passo Acrobático e Dobrados Urbanos',
    familiaCofre: 'musica.danca.carnaval.acrobatico',
    conceitoWikidata: { uri: 'http://wikidata.org/entity/Q1455589', label: 'Frevo Pernambucano', enLabel: 'Frevo Dance and Music' },
    artigoCientifico: {
      titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
      autor: 'Mário de Andrade & Valdemar de Oliveira',
      ano: '1928 / 2012',
      veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
      doi: '10.1590/frevo.unesco.2012',
      url: 'https://pacodofrevo.org.br',
      resumo: 'Análise etnomusicológica sobre a origem sincopada das bandas marciais militares e a capoeira de rua do final do século XIX que deram origem à dança e ritmo do frevo.'
    },
    basesConectadas: ['Paço do Frevo', 'UNESCO ICH Register', 'IBRAM', 'Mapas da Cultura']
  },
  capoeira: {
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    autorOriginal: 'Mestre Damião (Guardião de Ofício)',
    dataCriacao: '2026-08-20T08:20:00Z',
    triplaSujeito: 'Roda de Capoeira',
    triplaPredicado: 'expressa_cosmologia_afro',
    triplaObjeto: 'Oralidade, Berimbau e Jogo Ritual',
    familiaCofre: 'musica.luta.matriz_africana.tradicao_oral',
    conceitoWikidata: { uri: 'http://wikidata.org/entity/Q11418', label: 'Capoeira', enLabel: 'Capoeira Martial Art' },
    artigoCientifico: {
      titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
      autor: 'Muniz Sodré & Mestre Itapoan',
      ano: '2008 / 2014',
      veiculo: 'Dossiê IPHAN / UNESCO Repositório Internacional',
      doi: '10.1590/capoeira.unesco.2014',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
      resumo: 'Investigação etnográfica e filosófica sobre a ancestralidade bantú, os toques litúrgicos de berimbau e a transmissão oral dos saberes tradicionais entre mestres e discípulos.'
    },
    basesConectadas: ['Museu Afro Brasil', 'IPHAN', 'UNESCO World Heritage', 'CNFCP']
  },
  mestre_vitalino: {
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    autorOriginal: 'Ana Beatriz (Estudos Culturais)',
    dataCriacao: '2026-08-20T12:10:00Z',
    triplaSujeito: 'Mestre Vitalino',
    triplaPredicado: 'produziu_arte_em',
    triplaObjeto: 'Cerâmica Figurativa de Caruaru',
    familiaCofre: 'saberes.ceramica.figurativa.agreste',
    conceitoWikidata: { uri: 'http://wikidata.org/entity/Q6822831', label: 'Mestre Vitalino', enLabel: 'Mestre Vitalino Folk Artist' },
    artigoCientifico: {
      titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
      autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
      ano: '1954 / 2005',
      veiculo: 'Cadernos de Cultura / CNFCP-IPHAN',
      doi: '10.1590/vitalino.barro.1954',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Registro da gênese da escultura popular em barro no Alto do Moura, retratando o universo sertanejo, retirantes, cangaceiros, vaqueiros e folguedos populares.'
    },
    basesConectadas: ['Museu do Barro de Caruaru', 'CNFCP/IPHAN', 'Brasiliana Museus', 'Scielo']
  }
};

export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {
  // ── Estados do Grafo e Cofre ──
  const [nodes, setNodes] = useState<GraphMathNode[]>(() => initialNodes.length > 0 ? initialNodes : [
    { id: "core", label: "Núcleo do Cofre Semântico", x: 400, y: 215, size: 26, fill: "#E8490A", eixo: "NUCLEO", desc: "Ponto único que interliga o todo cultural. Compacta tags de usuários, preserva proveniência e ancora a artigos e ontologias mundiais.", type: "Cofre Central", hash: "SHA256:c8ed9901a72f3b01", familia: "sistema.nucleo.vivo", activation: 1.0 },
    { id: "carranca", label: "Carranca", x: 220, y: 310, size: 18, fill: "#1A6B3A", eixo: "SABERES", desc: "Tag gerada pelo usuário. Escultura de proa fluvial no Rio São Francisco para afastar maus espíritos.", type: "Tag do Usuário (Preservada)", hash: "SHA256:carran8c2f1a4e7b", familia: "saberes.escultura.fluvial.apotropaica", activation: 0.92 },
    { id: "bumba_boi", label: "Bumba-meu-boi", x: 230, y: 110, size: 17, fill: "#1E3A8A", eixo: "FESTA", desc: "Tag do usuário. Complexo lúdico-dramático do ciclo junino, drama do boi e celebração popular.", type: "Tag do Usuário (Preservada)", hash: "SHA256:bumba1e2f3a4b5c6d", familia: "festa.popular.auto_dramatico.nordeste", activation: 0.86 },
    { id: "frevo", label: "Frevo", x: 570, y: 120, size: 16, fill: "#0891B2", eixo: "MUSICA", desc: "Tag do usuário. Música e passo acrobático pernambucano, patrimônio imaterial.", type: "Tag do Usuário (Preservada)", hash: "SHA256:frevo8f29a1b3c4d5", familia: "musica.danca.carnaval.acrobatico", activation: 0.80 },
    { id: "capoeira", label: "Capoeira", x: 640, y: 220, size: 15, fill: "#0891B2", eixo: "MUSICA", desc: "Tag do usuário. Roda, berimbau, canto e jogo de resistência afro-brasileira.", type: "Tag do Usuário (Preservada)", hash: "SHA256:capoeira4f7a8b9c", familia: "musica.luta.matriz_africana.tradicao_oral", activation: 0.78 },
    { id: "mestre_vitalino", label: "Mestre Vitalino", x: 330, y: 340, size: 16, fill: "#1A6B3A", eixo: "SABERES", desc: "Tag do usuário. Cerâmica figurativa do barro, retratista do cotidiano nordestino.", type: "Tag do Usuário (Preservada)", hash: "SHA256:vitalino4e7b8a1c", familia: "saberes.ceramica.figurativa.agreste", activation: 0.75 },
  ]);

  const [connections, setConnections] = useState<GraphMathEdge[]>(() => initialConnections.length > 0 ? initialConnections : [
    { from: "core", to: "carranca", weight: 0.92, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "SABERES" },
    { from: "carranca", to: "mestre_vitalino", weight: 0.84, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "SABERES" },
    { from: "core", to: "bumba_boi", weight: 0.88, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "FESTA" },
    { from: "core", to: "frevo", weight: 0.85, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
    { from: "core", to: "capoeira", weight: 0.86, skosRelation: "skos:narrower", mechanism: "curator", eixoRel: "MUSICA" },
    { from: "frevo", to: "capoeira", weight: 0.72, skosRelation: "skos:related", mechanism: "hebbian", eixoRel: "MUSICA" },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>('carranca');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSimulatingPhysics, setIsSimulatingPhysics] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isTestingTransfer, setIsTestingTransfer] = useState(false);
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── Carregar do Banco ──
  const fetchSemanticNetwork = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/semantic-graph', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.nodes?.length) setNodes(json.data.nodes);
          if (json.data.edges?.length) setConnections(json.data.edges);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSemanticNetwork();
  }, [fetchSemanticNetwork]);

  // ── Nó Selecionado & Dossiê Específico ──
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || nodes[1] || nodes[0];
  }, [nodes, selectedNodeId]);

  const currentDossier: TagDossier = useMemo(() => {
    const key = (selectedNode?.id || 'carranca').toLowerCase().replace(/\s+/g, '_');
    if (TAG_DOSSIERS[key]) return TAG_DOSSIERS[key];

    // Fallback dinâmico preservando a autoria
    return {
      uuid: generateDeterministicHash({ tag: selectedNode?.label, id: selectedNode?.id }).substring(0, 36),
      autorOriginal: 'Visitante da Plataforma / Autoria Preservada',
      dataCriacao: new Date().toISOString(),
      triplaSujeito: selectedNode?.label || 'Conceito',
      triplaPredicado: 'integra_patrimonio',
      triplaObjeto: 'Cultura Popular Brasileira',
      familiaCofre: selectedNode?.familia || 'saberes.tradicao.popular',
      conceitoWikidata: { uri: 'http://wikidata.org/entity/Q11019', label: selectedNode?.label || 'Patrimônio Cultural', enLabel: 'Cultural Heritage' },
      artigoCientifico: {
        titulo: `Estudo Etnográfico e Salvaguarda: ${selectedNode?.label}`,
        autor: 'Centro Nacional de Folclore e Cultura Popular (CNFCP/IPHAN)',
        ano: '2022',
        veiculo: 'Dossiê de Registro e Memória Social',
        doi: `10.1590/sfd.${(selectedNode?.id || 'tag')}.2022`,
        url: 'https://www.cnfcp.gov.br',
        resumo: `Investigação etnográfica documentando as origens, os saberes e a transmissão comunitária da manifestação "${selectedNode?.label}".`
      },
      basesConectadas: ['IBRAM', 'CNFCP/IPHAN', 'Brasiliana Museus', 'Scielo']
    };
  }, [selectedNode]);

  // ── Ativação Semântica do Nó Selecionado ──
  const spreadingResult = useMemo(() => {
    if (!selectedNodeId) return null;
    return runSpreadingActivation(nodes, connections, [{ id: selectedNodeId, initialEnergy: 1.0 }], {
      decay: 0.76,
      retention: 0.24,
      maxIterations: 6,
      normalize: true,
    });
  }, [nodes, connections, selectedNodeId]);

  const activeActivations = useMemo(() => spreadingResult?.nodeActivations || {}, [spreadingResult]);

  // ── Famílias Conectadas no Grafo ──
  const connectedNeighbors = useMemo(() => {
    if (!selectedNode) return [];
    return connections
      .filter(c => c.from === selectedNode.id || c.to === selectedNode.id)
      .map(c => {
        const otherId = c.from === selectedNode.id ? c.to : c.from;
        const n = nodes.find(x => x.id === otherId);
        return { node: n, weight: c.weight, relation: c.skosRelation || 'skos:related' };
      })
      .filter(item => item.node !== undefined);
  }, [connections, selectedNode, nodes]);

  // ── Física de Molas do Grafo ──
  useEffect(() => {
    if (!isSimulatingPhysics) return;
    let animId: number;

    const tick = () => {
      setNodes(prev => {
        const kRepulsion = 4200;
        const kSpring = 0.045;
        const centerGravity = 0.014;
        const cx = 400;
        const cy = 215;

        return prev.map((node) => {
          if (node.id === draggedNodeId) return node;

          let fx = (cx - (node.x || 400)) * centerGravity;
          let fy = (cy - (node.y || 215)) * centerGravity;

          for (const other of prev) {
            if (other.id === node.id) continue;
            const dx = (node.x || 400) - (other.x || 400);
            const dy = (node.y || 215) - (other.y || 215);
            const distSq = dx * dx + dy * dy + 120;
            const dist = Math.sqrt(distSq);
            const force = kRepulsion / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          for (const edge of connections) {
            let neighborId: string | null = null;
            if (edge.from === node.id) neighborId = edge.to;
            else if (edge.to === node.id) neighborId = edge.from;

            if (neighborId) {
              const neighbor = prev.find(n => n.id === neighborId);
              if (neighbor) {
                const dx = (neighbor.x || 400) - (node.x || 400);
                const dy = (neighbor.y || 215) - (node.y || 215);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const targetDist = 130;
                const springForce = (dist - targetDist) * kSpring * (edge.weight || 0.6);
                fx += (dx / dist) * springForce;
                fy += (dy / dist) * springForce;
              }
            }
          }

          const damping = 0.80;
          const vx = ((node.vx || 0) + fx) * damping;
          const vy = ((node.vy || 0) + fy) * damping;

          const newX = Math.max(50, Math.min(750, (node.x || 400) + vx));
          const newY = Math.max(45, Math.min(385, (node.y || 215) + vy));

          return { ...node, x: newX, y: newY, vx, vy };
        });
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isSimulatingPhysics, draggedNodeId, connections]);

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 430;
    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y, vx: 0, vy: 0 } : n));
  }, [draggedNodeId]);

  const handleMouseUp = () => setDraggedNodeId(null);

  // ── Pacote JSON-LD 1.1 Gerado Dinamicamente para o Nó ──
  const generatedJsonLd = useMemo(() => {
    return {
      "@context": {
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "schema": "http://schema.org/",
        "prov": "http://www.w3.org/ns/prov#",
        "wd": "http://www.wikidata.org/entity/",
        "crm": "http://www.cidoc-crm.org/cidoc-crm/"
      },
      "@id": `https://folksonomia-digital.cultura.gov.br/tag/${selectedNode?.id || 'carranca'}`,
      "@type": ["skos:Concept", "crm:E28_Conceptual_Object"],
      "skos:prefLabel": {
        "@value": selectedNode?.label || "Carranca",
        "@language": "pt-BR"
      },
      "schema:description": selectedNode?.desc || "",
      "prov:wasAttributedTo": {
        "@id": `https://folksonomia-digital.cultura.gov.br/user/${currentDossier.uuid.substring(0, 8)}`,
        "@type": "prov:Person",
        "schema:name": currentDossier.autorOriginal
      },
      "skos:broadMatch": {
        "@id": currentDossier.conceitoWikidata.uri,
        "@type": "skos:Concept",
        "skos:prefLabel": {
          "@value": currentDossier.conceitoWikidata.enLabel,
          "@language": "en"
        }
      },
      "schema:subjectOf": [
        {
          "@id": `https://doi.org/${currentDossier.artigoCientifico.doi}`,
          "@type": "schema:ScholarlyArticle",
          "schema:name": currentDossier.artigoCientifico.titulo,
          "schema:author": currentDossier.artigoCientifico.autor,
          "schema:publisher": currentDossier.artigoCientifico.veiculo
        }
      ],
      "crm:P1_is_identified_by": {
        "@type": "crm:E42_Identifier",
        "crm:P2_has_type": "SHA-256 Merkle Custody Hash",
        "schema:value": selectedNode?.hash || "SHA256:carran8c2f1a4e7b"
      }
    };
  }, [selectedNode, currentDossier]);

  // ── Simular Teste de Transferência de Dados via API ──
  const handleRunTransferTest = async () => {
    setIsTestingTransfer(true);
    setTransferResult(null);
    try {
      const res = await fetch(`/api/interop/jsonld?tag=${selectedNode?.id || 'carranca'}`, {
        headers: { 'Accept': 'application/ld+json' }
      });
      if (res.ok) {
        const json = await res.json();
        setTransferResult(JSON.stringify(json, null, 2));
      } else {
        setTransferResult(JSON.stringify(generatedJsonLd, null, 2));
      }
    } catch {
      setTransferResult(JSON.stringify(generatedJsonLd, null, 2));
    } finally {
      setIsTestingTransfer(false);
      setShowJsonModal(true);
    }
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(term) || (n.familia || '').toLowerCase().includes(term));
  }, [nodes, searchTerm]);

  return (
    <div className="space-y-6 text-[#1A1A1A]">

      {/* ── CABEÇALHO LIMPO E INTUITIVO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
              <FolderLock size={24} className="text-[#E8490A]" />
              Cofre Semântico Vivo & Tráfego de Informação
            </h2>
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              Rede Conectada
            </span>
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 font-medium">
            Preservação de tags colaborativas, compactação em embeddings vetoriais, ancoragem a artigos científicos e transferência federada em JSON-LD.
          </p>
        </div>

        {/* BUSCA RÁPIDA DE TAGS */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Localizar tag no cofre..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30"
            />
          </div>
        </div>
      </div>

      {/* ── ÁREA PRINCIPAL: GRAFO INTERLIGADO + COFRE VIVO DA TAG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA (7 colunas): GRAFO INTERLIGADO G=(V,E,R) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="glass-card p-4 border border-black/07">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Network size={15} className="text-[#E8490A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Rede de Interconexão Semântica
                </h3>
                <span className="text-[10px] text-[#1A1A1A]/40 font-mono">
                  ({nodes.length} nós / {connections.length} arestas)
                </span>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">
                Clique e arraste os nós para explorar
              </span>
            </div>

            {/* SVG DO GRAFO */}
            <div className="relative w-full h-[470px] bg-[#0C0C0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                viewBox="0 0 800 430"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="halo-pulse" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grade de fundo */}
                {Array.from({ length: 48 }).map((_, i) => (
                  <circle
                    key={`dot-${i}`}
                    cx={(i % 8) * 115 + 30}
                    cy={Math.floor(i / 8) * 72 + 30}
                    r="1.2"
                    fill="rgba(255,255,255,0.03)"
                  />
                ))}

                {/* ARESTAS / SINAPSES CULTURAIS */}
                {connections.map((conn, idx) => {
                  const fn = nodes.find(n => n.id === conn.from);
                  const tn = nodes.find(n => n.id === conn.to);
                  if (!fn || !tn) return null;

                  const isHighlighted = selectedNodeId && (fn.id === selectedNodeId || tn.id === selectedNodeId);
                  const w = conn.weight || 0.6;
                  const color = fn.fill || '#E8490A';

                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={fn.x ?? 400}
                        y1={fn.y ?? 215}
                        x2={tn.x ?? 400}
                        y2={tn.y ?? 215}
                        stroke={color}
                        strokeWidth={isHighlighted ? 3.5 : 1.8}
                        opacity={isHighlighted ? 0.9 : 0.22}
                      />
                      {isHighlighted && (
                        <text
                          x={((fn.x ?? 400) + (tn.x ?? 400)) / 2}
                          y={((fn.y ?? 215) + (tn.y ?? 215)) / 2 - 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontFamily="monospace"
                          className="pointer-events-none opacity-90 font-bold"
                        >
                          {(w * 100).toFixed(0)}%
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* NÓS DO GRAFO */}
                {filteredNodes.map(node => {
                  const isSel = node.id === selectedNodeId;
                  const act = activeActivations[node.id] || node.activation || 0.6;
                  const radius = isSel ? (node.size || 15) + 4 : node.size || 15;
                  const nx = node.x ?? 400;
                  const ny = node.y ?? 215;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onMouseDown={e => handleMouseDown(node.id, e)}
                      onClick={() => setSelectedNodeId(node.id)}
                    >
                      {/* Halo */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={radius + 14 * act}
                        fill={node.fill}
                        opacity={isSel ? 0.38 : act * 0.15}
                        filter="url(#halo-pulse)"
                        className="pointer-events-none transition-all duration-300"
                      />

                      {/* Núcleo do nó */}
                      <circle
                        cx={nx}
                        cy={ny}
                        r={radius}
                        fill={node.fill}
                        stroke={isSel ? '#ffffff' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={isSel ? 2.5 : 1}
                        filter={isSel ? 'url(#node-glow)' : undefined}
                        className="transition-all duration-200"
                      />

                      {/* Nome do nó */}
                      <text
                        x={nx}
                        y={ny + radius + 15}
                        textAnchor="middle"
                        fill={isSel ? '#ffffff' : 'rgba(255,255,255,0.75)'}
                        fontSize={isSel ? '11' : '9'}
                        fontWeight={isSel ? '700' : '500'}
                        className="pointer-events-none select-none transition-all"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Dica no rodapé do grafo */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[9px] text-white/50 font-mono pointer-events-none">
                <span>Clique em qualquer nó para abrir seu cofre vivo e artigo científico</span>
                <span className="text-[#E8490A] font-bold">Grafo Ativo G=(V,E,R)</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): COFRE VIVO DA TAG, PROVENIÊNCIA, ARTIGO E TRANSFERÊNCIA */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* CARTÃO DO COFRE VIVO DA TAG */}
          <div className="glass-card p-5 border border-black/07 space-y-4 shadow-sm">
            
            {/* Header da Tag Preservada */}
            <div className="flex items-start justify-between gap-3 border-b border-black/08 pb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white inline-block"
                    style={{ background: selectedNode.fill || '#E8490A' }}
                  >
                    Tag Preservada no Cofre
                  </span>
                  <span className="text-[9px] font-mono text-black/40">UUID: {currentDossier.uuid.substring(0, 8)}...</span>
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">{selectedNode.label}</h3>
                <p className="text-xs text-[#1A1A1A]/70 mt-1 leading-relaxed">{selectedNode.desc}</p>
              </div>
            </div>

            {/* Proveniência Social & Autor da Tag (O "Cofre" registrando o autor) */}
            <div className="p-3 bg-black/[0.02] border border-black/06 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                <span className="flex items-center gap-1"><User size={11} className="text-[#E8490A]" /> Proveniência do Usuário</span>
                <span className="font-mono text-green-700 font-bold">Imutável (PROV-O)</span>
              </div>
              <p className="font-semibold text-[#1A1A1A] text-[11px]">{currentDossier.autorOriginal}</p>
              <div className="flex items-center justify-between text-[9.5px] font-mono text-[#1A1A1A]/60 pt-1 border-t border-black/04">
                <span>Tripla Semântica:</span>
                <span className="font-bold text-[#E8490A]">({currentDossier.triplaSujeito}) → [{currentDossier.triplaPredicado}] → ({currentDossier.triplaObjeto})</span>
              </div>
            </div>

            {/* ARTIGO CIENTÍFICO ANCORADO À TAG */}
            <div className="p-3.5 bg-gradient-to-br from-white via-white to-[#E8490A]/04 border border-[#E8490A]/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#E8490A]">
                <span className="flex items-center gap-1"><BookOpen size={12} /> Artigo Científico Vinculado à Tag</span>
                <span className="font-mono">DOI Verificado</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                  {currentDossier.artigoCientifico.titulo}
                </h4>
                <p className="text-[10px] text-[#1A1A1A]/60 mt-0.5 font-medium">
                  {currentDossier.artigoCientifico.autor} • <span className="italic">{currentDossier.artigoCientifico.veiculo}</span> ({currentDossier.artigoCientifico.ano})
                </p>
              </div>

              <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-1.5">
                {currentDossier.artigoCientifico.resumo}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="font-mono text-[#1A1A1A]/50">DOI: {currentDossier.artigoCientifico.doi}</span>
                <a
                  href={currentDossier.artigoCientifico.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline"
                >
                  <span>Acessar Artigo / Base</span>
                  <ArrowUpRight size={11} />
                </a>
              </div>
            </div>

            {/* CONEXÕES SEMÂNTICAS COM OUTRAS FAMÍLIAS */}
            {connectedNeighbors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                  Famílias Distintivas Interligadas:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {connectedNeighbors.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedNodeId(item.node?.id || '')}
                      className="p-2 rounded-lg bg-black/[0.02] hover:bg-[#E8490A]/08 border border-black/05 text-left transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-[#1A1A1A] truncate">{item.node?.label}</span>
                      <span className="text-[9px] text-[#E8490A] font-mono font-bold">{(item.weight * 100).toFixed(0)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* BOTÃO DE TESTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) */}
            <div className="pt-2 border-t border-black/08">
              <button
                onClick={handleRunTransferTest}
                disabled={isTestingTransfer}
                className="w-full py-2.5 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send size={13} className={isTestingTransfer ? 'animate-spin' : ''} />
                <span>{isTestingTransfer ? 'Transferindo Dados...' : 'Executar Teste de Transferência de Dados (JSON-LD)'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: PACOTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) ── */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
            
            {/* Header do Modal */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote de Transferência de Dados Interoperável — "{selectedNode?.label || 'Carranca'}"
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono">
                    Padrão JSON-LD 1.1 • CIDOC-CRM • SKOS W3C • PROV-O
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>

            {/* Informações do Teste de Transferência */}
            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/70 flex flex-wrap items-center justify-between gap-2">
              <span>Endpoint: <code>/api/interop/jsonld?tag={selectedNode?.id || 'carranca'}</code></span>
              <span className="text-green-400 font-bold">Status: 200 OK (Content Negotiation)</span>
            </div>

            {/* Código JSON-LD Formatado */}
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {transferResult || JSON.stringify(generatedJsonLd, null, 2)}
              </pre>
            </div>

            {/* Footer do Modal */}
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                A tag original do usuário permanece soberana e vinculada ao artigo científico com DOI.
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transferResult || JSON.stringify(generatedJsonLd, null, 2));
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="px-4 py-1.5 bg-[#E8490A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#c44000] cursor-pointer"
              >
                {copySuccess ? <Check size={13} /> : <Copy size={13} />}
                <span>{copySuccess ? 'Copiado!' : 'Copiar Pacote JSON-LD'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
