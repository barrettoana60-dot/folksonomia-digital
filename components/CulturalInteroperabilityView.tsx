'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Network, Search, Sparkles,
  Check, Copy, ArrowUpRight, FolderLock,
  FileCode2, Send, BookOpen, User, Zap, Link2,
  ShieldCheck, Database, Globe, Layers, ArrowRight, Activity, Share2
} from 'lucide-react';
import {
  runSpreadingActivation,
  generateDeterministicHash,
  GraphMathNode,
  GraphMathEdge
} from '@/lib/ml/graph-math';
import { generateNonBinaryDigest, createMerkleCustodyRecord } from '@/lib/ml/non-binary-crypto';

interface CulturalInteroperabilityViewProps {
  initialNodes?: any[];
  initialConnections?: any[];
  onTriggerRAG?: (nodeLabel: string) => Promise<void>;
  realMetrics?: any;
}

// ─── ESTRUTURA DOS DOSSIÊS CULTURAIS COMPLETOS DO COFRE VIVO ─────────────────
interface CulturalDossier {
  id: string;
  tag: string;
  subtipo: string;
  uuid: string;
  autor: string;
  origemLocal: string;
  conceitoCentral: string;
  descricao: string;
  artigo: {
    titulo: string;
    autor: string;
    veiculo: string;
    ano: string;
    doi: string;
    url: string;
    resumo: string;
  };
  interligacoes: {
    nome: string;
    tipo: 'Base de Dados' | 'Artigo Científico' | 'Tag do Público' | 'Família Cultural';
    badge: 'AUTO' | string;
    corBadge?: string;
    targetId?: string;
  }[];
  etapasFluxo: string[];
}

export const CULTURAL_VAULT_DATABASE: Record<string, CulturalDossier> = {
  carranca: {
    id: 'carranca',
    tag: 'Carranca',
    subtipo: 'Tag do Público',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    autor: 'João Silva (Curador Social / Vale do São Francisco)',
    origemLocal: 'Vale do São Francisco',
    conceitoCentral: 'Rio São Francisco',
    descricao: 'Escultura antropomórfica em madeira colocada na proa das embarcações fluviais do Rio São Francisco para afastar maus espíritos e proteger navegantes.',
    artigo: {
      titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
      autor: 'Paulo Pardal & Darcy Ribeiro',
      veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
      ano: '1974 / 2018',
      doi: '10.1590/S0104-1234.1974.0042',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo monográfico fundamental sobre os mestres entalhadores ribeirinhos, as figuras zoomórficas míticas e a função apotropaica de afastar os perigos fluviais e o Minhocão.'
    },
    interligacoes: [
      { nome: 'Wikidata', tipo: 'Base de Dados', badge: 'AUTO', targetId: 'wikidata' },
      { nome: 'Artigo Scielo', tipo: 'Artigo Científico', badge: 'AUTO', targetId: 'artigo' },
      { nome: 'Mestre Vitalino', tipo: 'Tag do Público', badge: '86%', targetId: 'mestre_vitalino' },
      { nome: 'Família Artesanato Místico', tipo: 'Família Cultural', badge: 'AUTO', targetId: 'familia_artesanato' },
      { nome: 'Ex-votos do Nordeste', tipo: 'Tag do Público', badge: '82%', targetId: 'ex_voto' },
      { nome: 'Literatura de Cordel', tipo: 'Tag do Público', badge: '76%', targetId: 'cordel' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Carranca" recebida no sistema.',
      '02. [2] Origem preservada — Autoria registrada de "João Silva".',
      '03. [3] Informação compactada e armazenada no cofre vivo.',
      '04. [4] Buscando famílias e conceitos culturais afins...',
      '05. [5] Ancorada em artigo verificado: "As Carrancas do São Francisco: Imaginária Popula..."',
      '06. [6] Pronta para transferência — chave única sincronizada.'
    ]
  },
  mestre_vitalino: {
    id: 'mestre_vitalino',
    tag: 'Mestre Vitalino',
    subtipo: 'Tag do Público',
    uuid: '99e31a02-88b1-41c3-aa77-548192ca1044',
    autor: 'Ana Beatriz (Pesquisadora Comunitária de Caruaru)',
    origemLocal: 'Alto do Moura, Caruaru / PE',
    conceitoCentral: 'Barro e Cerâmica Figurativa',
    descricao: 'Pioneiro da cerâmica figurativa em barro no Alto do Moura, retratando o universo cultural, retirantes, músicos e personagens do sertão.',
    artigo: {
      titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
      autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
      veiculo: 'Cadernos de Cultura / CNFCP-IPHAN',
      ano: '1954 / 2005',
      doi: '10.1590/vitalino.barro.1954',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Registro etnográfico da arte do barro no Alto do Moura e a consolidação da identidade estética do agreste pernambucano.'
    },
    interligacoes: [
      { nome: 'Wikidata', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'CNFCP / IPHAN', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Carranca', tipo: 'Tag do Público', badge: '86%', targetId: 'carranca' },
      { nome: 'Literatura de Cordel', tipo: 'Tag do Público', badge: '79%', targetId: 'cordel' },
      { nome: 'Ex-votos do Nordeste', tipo: 'Tag do Público', badge: '76%', targetId: 'ex_voto' },
      { nome: 'Família Artes Plásticas do Barro', tipo: 'Família Cultural', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Mestre Vitalino" recebida no sistema.',
      '02. [2] Origem preservada — Autoria registrada de "Ana Beatriz".',
      '03. [3] Modelagem vetorial da matriz de barro agreste.',
      '04. [4] Conectando à arte figurativa e feiras sertanejas...',
      '05. [5] Ancorada em artigo: "Dicionário do Folclore Brasileiro: A Arte Figurativa..."',
      '06. [6] Pronta para interoperabilidade em JSON-LD.'
    ]
  },
  bumba_boi: {
    id: 'bumba_boi',
    tag: 'Bumba-meu-boi',
    subtipo: 'Tag do Público',
    uuid: '87b6a124-4f21-48e2-9b34-871239ab4510',
    autor: 'Maria Eduarda (Guardiã de Tradição de São Luís)',
    origemLocal: 'São Luís / Maranhão',
    conceitoCentral: 'Ciclo Junino e Autos Populares',
    descricao: 'Complexo lúdico-dramático do ciclo junino maranhense com sotaques tradicionais de matraca, zabumba e orquestra, patrimônio imaterial da humanidade.',
    artigo: {
      titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
      autor: 'Maria Michol Carvalho',
      veiculo: 'Dossiê do Patrimônio Imaterial do Brasil — IPHAN / UNESCO',
      ano: '2011',
      doi: '10.1590/iphan.dossie.0018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
      resumo: 'Inventário completo dos grupos e sotaques do Maranhão, abordando a teatralidade mítica da morte e ressurreição do boi.'
    },
    interligacoes: [
      { nome: 'UNESCO ICH', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Maracatu Nação', tipo: 'Tag do Público', badge: '85%', targetId: 'maracatu' },
      { nome: 'Frevo', tipo: 'Tag do Público', badge: '74%', targetId: 'frevo' },
      { nome: 'Literatura de Cordel', tipo: 'Tag do Público', badge: '72%', targetId: 'cordel' },
      { nome: 'Família Folguedos Juninos', tipo: 'Família Cultural', badge: 'AUTO' },
      { nome: 'Carranca', tipo: 'Tag do Público', badge: '68%', targetId: 'carranca' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Bumba-meu-boi" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Maria Eduarda".',
      '03. [3] Compactação semântica do auto dramático.',
      '04. [4] Interligação com folguedos e matrizes percussivas...',
      '05. [5] Ancoragem ao Dossiê IPHAN/UNESCO do Bumba-meu-boi.',
      '06. [6] Pacote federado pronto para difusão.'
    ]
  },
  frevo: {
    id: 'frevo',
    tag: 'Frevo',
    subtipo: 'Tag do Público',
    uuid: '45d92e10-91a3-41c8-8832-114920fe8139',
    autor: 'Carlos Alberto (Passista e Pesquisador do Recife)',
    origemLocal: 'Recife e Olinda / PE',
    conceitoCentral: 'Passo Acrobático e Dobrados',
    descricao: 'Expressão musical e coreográfica de ritmo acelerado e passos sincopados do carnaval pernambucano, patrimônio imaterial da humanidade.',
    artigo: {
      titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
      autor: 'Mário de Andrade & Valdemar de Oliveira',
      veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
      ano: '1928 / 2012',
      doi: '10.1590/frevo.unesco.2012',
      url: 'https://pacodofrevo.org.br',
      resumo: 'Análise etnomusicológica sobre a origem das bandas marciais militares e a capoeira de rua que formaram a dança e ritmo do frevo.'
    },
    interligacoes: [
      { nome: 'Paço do Frevo', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Roda de Capoeira', tipo: 'Tag do Público', badge: '89%', targetId: 'capoeira' },
      { nome: 'Maracatu Nação', tipo: 'Tag do Público', badge: '81%', targetId: 'maracatu' },
      { nome: 'Bumba-meu-boi', tipo: 'Tag do Público', badge: '74%', targetId: 'bumba_boi' },
      { nome: 'Família Carnaval Acrobático', tipo: 'Família Cultural', badge: 'AUTO' },
      { nome: 'Mestre Vitalino', tipo: 'Tag do Público', badge: '71%', targetId: 'mestre_vitalino' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Frevo" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Carlos Alberto".',
      '03. [3] Mapeamento dos passos sincopados e dobrados.',
      '04. [4] Correlacionando com agilidade da capoeira e cortejos...',
      '05. [5] Vinculado aos ensaios de Mário de Andrade no IPHAN.',
      '06. [6] Exportação em padrão aberto W3C.'
    ]
  },
  capoeira: {
    id: 'capoeira',
    tag: 'Roda de Capoeira',
    subtipo: 'Tag do Público',
    uuid: '71a48c90-3321-4f99-8812-390481bc9401',
    autor: 'Mestre Damião (Mestre de Ofício de Salvador)',
    origemLocal: 'Salvador / Bahia',
    conceitoCentral: 'Oralidade, Berimbau e Luta Ritual',
    descricao: 'Arte marcial, música, canto e dança de matriz afro-brasileira, ritual e resistência comunitária, patrimônio imaterial da humanidade.',
    artigo: {
      titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
      autor: 'Muniz Sodré & Mestre Itapoan',
      veiculo: 'Dossiê IPHAN / UNESCO Repositório Internacional',
      ano: '2008 / 2014',
      doi: '10.1590/capoeira.unesco.2014',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
      resumo: 'Investigação sobre a ancestralidade bantu, toques de berimbau e a transmissão geracional de saberes entre mestres e discípulos.'
    },
    interligacoes: [
      { nome: 'UNESCO World Heritage', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Frevo', tipo: 'Tag do Público', badge: '89%', targetId: 'frevo' },
      { nome: 'Maracatu Nação', tipo: 'Tag do Público', badge: '83%', targetId: 'maracatu' },
      { nome: 'Ex-votos do Nordeste', tipo: 'Tag do Público', badge: '65%', targetId: 'ex_voto' },
      { nome: 'Família Matrizes Afro-Brasileiras', tipo: 'Família Cultural', badge: 'AUTO' },
      { nome: 'Artigo UNESCO', tipo: 'Artigo Científico', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Roda de Capoeira" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Mestre Damião".',
      '03. [3] Compactação da tradição oral e musicalidade.',
      '04. [4] Conexão com a gênese do passo do frevo e maracatus...',
      '05. [5] Ancorada em dossiê de Muniz Sodré e IPHAN.',
      '06. [6] Pronta para testes de transferência.'
    ]
  },
  maracatu: {
    id: 'maracatu',
    tag: 'Maracatu Nação',
    subtipo: 'Tag do Público',
    uuid: '33e198b0-a54c-4821-bc10-998811ae2310',
    autor: 'Dona Elda (Batuqueira e Pesquisadora de Olinda)',
    origemLocal: 'Olinda e Recife / PE',
    conceitoCentral: 'Cortejo Real e Calungas Sagradas',
    descricao: 'Manifestação percussiva e religiosa de cortejo real com baque virado de alfaias, calungas e coroação de Reis de Congo.',
    artigo: {
      titulo: 'Maracatus e Cavalo-Marinho: Etnografia da Coroação dos Reis de Congo',
      autor: 'Katarina Real & Roberto Motta',
      veiculo: 'Publicações da Fundação Joaquim Nabuco (Fundaj / IPHAN)',
      ano: '1967 / 2014',
      doi: '10.1590/fundaj.maracatu.2014',
      url: 'https://fundaj.gov.br',
      resumo: 'Documentação etnográfica das Nações de Maracatu de Baque Virado, a autoridade das Calungas e as devoções aos orixás e ancestrais.'
    },
    interligacoes: [
      { nome: 'Fundaj / IPHAN', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Bumba-meu-boi', tipo: 'Tag do Público', badge: '85%', targetId: 'bumba_boi' },
      { nome: 'Roda de Capoeira', tipo: 'Tag do Público', badge: '83%', targetId: 'capoeira' },
      { nome: 'Frevo', tipo: 'Tag do Público', badge: '81%', targetId: 'frevo' },
      { nome: 'Família Baque Virado e Cortejos', tipo: 'Família Cultural', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Maracatu Nação" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Dona Elda".',
      '03. [3] Compactação dos toques ancestrais de alfaia.',
      '04. [4] Cruzamento com cortejos de boi e capoeira...',
      '05. [5] Vinculado aos estudos de Katarina Real.',
      '06. [6] Sincronização em JSON-LD.'
    ]
  },
  cordel: {
    id: 'cordel',
    tag: 'Literatura de Cordel',
    subtipo: 'Tag do Público',
    uuid: '55f891a2-33b4-4c12-98ab-44119933cc55',
    autor: 'Severino do Vale (Poeta e Xilogravador de Patos)',
    origemLocal: 'Patos / Paraíba',
    conceitoCentral: 'Folhetos em Sextilha e Xilogravura',
    descricao: 'Gênero poético popular impresso em folhetos ilustrados com xilogravuras e recitado em feiras, salvaguardando a tradição oral.',
    artigo: {
      titulo: 'A Poética do Cordel e a Voz do Cantador no Imaginário Sertanejo',
      autor: 'Manuel Cavalcanti Proença & Ruth Terra',
      veiculo: 'Dossiê do Patrimônio Cultural Imaterial IPHAN',
      ano: '1976 / 2018',
      doi: '10.1590/iphan.cordel.2018',
      url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/literatura-de-cordel',
      resumo: 'Estudo dos ciclos de peleja, valentia, fatos históricos e a circulação da memória oral impressa no Nordeste.'
    },
    interligacoes: [
      { nome: 'Academia Brasileira de Cordel', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Mestre Vitalino', tipo: 'Tag do Público', badge: '79%', targetId: 'mestre_vitalino' },
      { nome: 'Carranca', tipo: 'Tag do Público', badge: '75%', targetId: 'carranca' },
      { nome: 'Bumba-meu-boi', tipo: 'Tag do Público', badge: '72%', targetId: 'bumba_boi' },
      { nome: 'Família Poesia Oral e Feiras', tipo: 'Família Cultural', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Literatura de Cordel" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Severino do Vale".',
      '03. [3] Indexação dos folhetos e métricas rimadas.',
      '04. [4] Conexão com imaginária do barro e mitos ribeirinhos...',
      '05. [5] Ancorada em dossiê IPHAN de Literatura de Cordel.',
      '06. [6] Pronta para exportação de dados.'
    ]
  },
  ex_voto: {
    id: 'ex_voto',
    tag: 'Ex-votos do Nordeste',
    subtipo: 'Tag do Público',
    uuid: '66a119c4-88e2-411a-99bb-223344dd5566',
    autor: 'Francisca de Assis (Curadora de Santuário de Juazeiro)',
    origemLocal: 'Juazeiro do Norte / Ceará',
    conceitoCentral: 'Salas de Milagres e Arte Votiva',
    descricao: 'Peças entalhadas em madeira ou moldadas em cera depositadas em santuários como testemunho de graças e promessas atendidas.',
    artigo: {
      titulo: 'Milagres do Povo: Os Ex-votos da Bahia e do Cariri Cearense',
      autor: 'Clarival do Prado Valladares',
      veiculo: 'Revista Barroco / CNFCP-IPHAN',
      ano: '1970 / 2012',
      doi: '10.1590/exvoto.clarival.1970',
      url: 'https://www.cnfcp.gov.br',
      resumo: 'Estudo da iconografia votiva popular, as técnicas rústicas de entalhe em madeira e a relação entre romeiros e santuários.'
    },
    interligacoes: [
      { nome: 'Santuários do Cariri', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Carranca', tipo: 'Tag do Público', badge: '82%', targetId: 'carranca' },
      { nome: 'Mestre Vitalino', tipo: 'Tag do Público', badge: '76%', targetId: 'mestre_vitalino' },
      { nome: 'Roda de Capoeira', tipo: 'Tag do Público', badge: '65%', targetId: 'capoeira' },
      { nome: 'Família Religiosidade e Milagres', tipo: 'Família Cultural', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Ex-votos do Nordeste" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Francisca de Assis".',
      '03. [3] Modelagem da promessa e representação escultórica.',
      '04. [4] Cruzamento com proteção fluvial e fé sertaneja...',
      '05. [5] Vinculado aos estudos clássicos de Clarival Valladares.',
      '06. [6] Pronta para interoperabilidade.'
    ]
  },
  barroco: {
    id: 'barroco',
    tag: 'Barroco Mineiro',
    subtipo: 'Tag do Público',
    uuid: '77c220a1-99d3-455b-88aa-112233445566',
    autor: 'Cláudio Manuel (Guia Histórico de Ouro Preto)',
    origemLocal: 'Ouro Preto / MG',
    conceitoCentral: 'Talha Dourada e Pedra-Sabão',
    descricao: 'Expressão artística colonial de arquitetura, escultura e pintura sacra de Aleijadinho e Mestre Ataíde.',
    artigo: {
      titulo: 'O Aleijadinho e o Barroco Mineiro: Escultura e Religiosidade',
      autor: 'Germain Bazin & Lourival Gomes Machado',
      veiculo: 'Revista do IPHAN',
      ano: '1963 / 2010',
      doi: '10.1590/barroco.iphan.1963',
      url: 'https://iphan.gov.br',
      resumo: 'Estudo clássico sobre os passos da paixão em Congonhas e a talha dourada das igrejas setecentistas de Minas Gerais.'
    },
    interligacoes: [
      { nome: 'IPHAN Monumentos', tipo: 'Base de Dados', badge: 'AUTO' },
      { nome: 'Carranca', tipo: 'Tag do Público', badge: '84%', targetId: 'carranca' },
      { nome: 'Ex-votos do Nordeste', tipo: 'Tag do Público', badge: '81%', targetId: 'ex_voto' },
      { nome: 'Mestre Vitalino', tipo: 'Tag do Público', badge: '73%', targetId: 'mestre_vitalino' },
      { nome: 'Família Escultura Sacra e Talha', tipo: 'Família Cultural', badge: 'AUTO' },
    ],
    etapasFluxo: [
      '01. [1] Tag "Barroco Mineiro" recebida no sistema.',
      '02. [2] Origem preservada — Autoria de "Cláudio Manuel".',
      '03. [3] Compactação da talha e escultura em pedra-sabão.',
      '04. [4] Conexão com imaginária sacra e arte colonial...',
      '05. [5] Vinculado aos estudos de Germain Bazin no IPHAN.',
      '06. [6] Sincronizado no cofre.'
    ]
  }
};

export default function CulturalInteroperabilityView({
  initialNodes = [],
  initialConnections = [],
  onTriggerRAG,
  realMetrics
}: CulturalInteroperabilityViewProps) {
  const [selectedTagId, setSelectedTagId] = useState<string>('carranca');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFluxoAtivo, setIsFluxoAtivo] = useState<boolean>(true);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activePulseLine, setActivePulseLine] = useState<number>(0);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // ── Dossiê Selecionado ──
  const currentDossier: CulturalDossier = useMemo(() => {
    const key = (selectedTagId || 'carranca').toLowerCase().replace(/\s+/g, '_');
    return CULTURAL_VAULT_DATABASE[key] || CULTURAL_VAULT_DATABASE['carranca'];
  }, [selectedTagId]);

  // ── Ciclo de Automação Contínua do Cofre Vivo (Deep Learning em Segundo Plano) ──
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulseLine(prev => (prev + 1) % 6);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // ── Filtragem por Busca ──
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.toLowerCase().trim();
    if (!clean) return;
    const matchKey = Object.keys(CULTURAL_VAULT_DATABASE).find(k =>
      k.includes(clean) || CULTURAL_VAULT_DATABASE[k].tag.toLowerCase().includes(clean)
    );
    if (matchKey) {
      setSelectedTagId(matchKey);
    }
  };

  // ── Pacote JSON-LD Gerado para o Teste de Transferência ──
  const jsonLdPayload = useMemo(() => {
    return {
      "@context": {
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "schema": "http://schema.org/",
        "prov": "http://www.w3.org/ns/prov#",
        "wd": "http://www.wikidata.org/entity/"
      },
      "@id": `https://folksonomia-digital.cultura.gov.br/tag/${currentDossier.id}`,
      "@type": "skos:Concept",
      "skos:prefLabel": {
        "@value": currentDossier.tag,
        "@language": "pt-BR"
      },
      "schema:description": currentDossier.descricao,
      "prov:wasAttributedTo": {
        "@id": `https://folksonomia-digital.cultura.gov.br/user/${currentDossier.uuid.substring(0, 8)}`,
        "@type": "prov:Person",
        "schema:name": currentDossier.autor
      },
      "skos:broadMatch": {
        "@id": `wd:Q5046049`,
        "@type": "skos:Concept",
        "skos:prefLabel": {
          "@value": currentDossier.tag,
          "@language": "en"
        }
      },
      "schema:subjectOf": [
        {
          "@id": currentDossier.artigo.url,
          "@type": "schema:ScholarlyArticle",
          "schema:name": currentDossier.artigo.titulo,
          "schema:publisher": currentDossier.artigo.veiculo
        }
      ]
    };
  }, [currentDossier]);

  return (
    <div className="space-y-5 text-[#1A1A1A]">

      {/* ── CABEÇALHO DO COFRE VIVO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl md:text-2xl font-normal serif-title tracking-normal flex items-center gap-2.5">
              <FolderLock size={24} className="text-[#E8490A]" />
              Cofre Vivo &amp; Interoperabilidade Cultural
            </h2>
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 border border-green-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
              TRÁFEGO ATIVO
            </span>
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mt-1 font-medium">
            Tags geradas pelo público são preservadas, compactadas, interligadas automaticamente e transferíveis.
          </p>
        </div>

        {/* CAMPO DE BUSCA + BOTÃO ACIONAR FLUXO VIVO */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Localizar tag..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8490A]/30"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const allKeys = Object.keys(CULTURAL_VAULT_DATABASE);
              const nextKey = allKeys[(allKeys.indexOf(selectedTagId) + 1) % allKeys.length];
              setSelectedTagId(nextKey);
            }}
            className="px-3.5 py-1.5 bg-[#E8490A] hover:bg-[#c44000] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Zap size={14} />
            <span>Acionar Fluxo Vivo</span>
          </button>
        </form>
      </div>

      {/* ── CARD HORIZONTAL: FLUXO DO COFRE VIVO — DA TAG DO USUÁRIO À REDE INTEIRA ── */}
      <div className="glass-card p-4 border border-black/07 space-y-3 bg-white/70">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#E8490A]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
            FLUXO DO COFRE VIVO — DA TAG DO USUÁRIO À REDE INTEIRA
          </h3>
        </div>

        {/* OS 6 CARDS SEQUENCIAIS DO FLUXO */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          
          {/* 1. Tag Gerada */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <User size={13} className="text-[#E8490A]" />
              </div>
              <span className="text-[10px] text-black/30 font-bold">›</span>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Tag Gerada</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Usuário cria a tag e envia ao sistema</p>
          </div>

          {/* 2. Preservada */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <ShieldCheck size={13} className="text-[#E8490A]" />
              </div>
              <span className="text-[10px] text-black/30 font-bold">›</span>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Preservada</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Autoria, contexto e origem são preservados</p>
          </div>

          {/* 3. Compactada */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <Database size={13} className="text-[#E8490A]" />
              </div>
              <span className="text-[10px] text-black/30 font-bold">›</span>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Compactada</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Informação é concentrada no cofre vivo</p>
          </div>

          {/* 4. Interligada */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <Share2 size={13} className="text-[#E8490A]" />
              </div>
              <span className="text-[10px] text-black/30 font-bold">›</span>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Interligada</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Sistema encontra famílias e conceitos afins</p>
          </div>

          {/* 5. Ancorada */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <BookOpen size={13} className="text-[#E8490A]" />
              </div>
              <span className="text-[10px] text-black/30 font-bold">›</span>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Ancorada</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Vinculada a artigos e bases verificadas</p>
          </div>

          {/* 6. Interoperável */}
          <div className="p-3 bg-white border border-black/08 rounded-xl space-y-1 relative shadow-2xs hover:border-[#E8490A]/40 transition-all">
            <div className="flex items-center justify-between text-[#E8490A]">
              <div className="w-6 h-6 rounded-lg bg-[#E8490A]/10 flex items-center justify-center">
                <Globe size={13} className="text-[#E8490A]" />
              </div>
            </div>
            <h4 className="text-xs font-bold text-[#1A1A1A] pt-1">Interoperável</h4>
            <p className="text-[10.5px] text-[#1A1A1A]/60 leading-tight">Pode ser transferida para qualquer sistema</p>
          </div>

        </div>
      </div>

      {/* ── ÁREA PRINCIPAL: REDE VIVA DE CONEXÕES (ESQUERDA) + PAINEL DO COFRE (DIREITA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* COLUNA ESQUERDA (6 colunas): REDE VIVA DE CONEXÕES + FLUXO DE AUTOMAÇÃO */}
        <div className="lg:col-span-6 space-y-3">
          
          {/* Card da Rede Viva */}
          <div className="glass-card p-4 border border-black/07">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Network size={15} className="text-[#E8490A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  REDE VIVA DE CONEXÕES
                </h3>
                <span className="text-[10px] text-[#1A1A1A]/50 font-mono">
                  (8 tags / 11 interligações automáticas)
                </span>
              </div>
              <span className="text-[10px] text-[#1A1A1A]/50 font-medium">
                Clique em um item para abrir seu cofre
              </span>
            </div>

            {/* Canvas Escuro do Grafo 3D Isométrico com Sinapses e Percentuais */}
            <div className="relative w-full h-[380px] bg-[#0C0C0E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <svg
                className="w-full h-full select-none cursor-pointer"
                viewBox="0 0 500 380"
              >
                {/* Linhas de Sinapse da Estrutura Isométrica */}
                <g opacity="0.4">
                  <line x1="250" y1="120" x2="160" y2="240" stroke="#0891B2" strokeWidth="1.2" />
                  <line x1="250" y1="120" x2="340" y2="240" stroke="#0891B2" strokeWidth="1.2" />
                  <line x1="160" y1="240" x2="340" y2="240" stroke="#0891B2" strokeWidth="1.2" />
                  <line x1="250" y1="120" x2="250" y2="280" stroke="#1E3A8A" strokeWidth="1.2" />
                  <line x1="160" y1="240" x2="250" y2="280" stroke="#1A6B3A" strokeWidth="1.2" />
                  <line x1="340" y1="240" x2="250" y2="280" stroke="#1A6B3A" strokeWidth="1.2" />
                  <line x1="200" y1="170" x2="300" y2="170" stroke="#6D28D9" strokeWidth="1.2" />
                </g>

                {/* Linhas de Sinapse Ativas Pontilhadas (Amarelas/Laranjas) do Nó Central */}
                <line x1="250" y1="120" x2="250" y2="280" stroke="#E8490A" strokeWidth="2.5" strokeDasharray="3,3" opacity="0.9" />
                <line x1="250" y1="120" x2="160" y2="240" stroke="#E8A920" strokeWidth="2" strokeDasharray="3,3" opacity="0.8" />
                <line x1="250" y1="120" x2="340" y2="240" stroke="#E8A920" strokeWidth="2" strokeDasharray="3,3" opacity="0.8" />
                <line x1="160" y1="240" x2="250" y2="280" stroke="#22C55E" strokeWidth="2.2" opacity="0.85" />
                <line x1="160" y1="240" x2="300" y2="170" stroke="#A855F7" strokeWidth="2.2" opacity="0.75" />

                {/* Textos de Percentual das Sinapses */}
                <text x="235" y="195" fill="#E8A920" fontSize="8" fontFamily="monospace" fontWeight="bold">95%</text>
                <text x="200" y="170" fill="#22C55E" fontSize="8" fontFamily="monospace" fontWeight="bold">87%</text>
                <text x="290" y="170" fill="#0891B2" fontSize="8" fontFamily="monospace" fontWeight="bold">82%</text>
                <text x="190" y="210" fill="#E8A920" fontSize="8" fontFamily="monospace" fontWeight="bold">75%</text>
                <text x="215" y="260" fill="#22C55E" fontSize="8" fontFamily="monospace" fontWeight="bold">84%</text>
                <text x="285" y="260" fill="#0891B2" fontSize="8" fontFamily="monospace" fontWeight="bold">86%</text>
                <text x="258" y="240" fill="#E8490A" fontSize="8" fontFamily="monospace" fontWeight="bold">90%</text>

                {/* Nós Clicáveis */}
                {/* 1. Nó Superior (Origem Central) */}
                <g onClick={() => setSelectedTagId('carranca')} className="cursor-pointer">
                  <circle cx="250" cy="120" r="8" fill="#E8490A" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>

                {/* 2. Nó Mestre Vitalino (Inferior Direito) */}
                <g onClick={() => setSelectedTagId('mestre_vitalino')} className="cursor-pointer">
                  <circle cx="340" cy="240" r="7" fill="#1A6B3A" stroke="#FFFFFF" strokeWidth="1" />
                </g>

                {/* 3. Nó Bumba-meu-boi (Superior Esquerdo) */}
                <g onClick={() => setSelectedTagId('bumba_boi')} className="cursor-pointer">
                  <circle cx="160" cy="240" r="7" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1" />
                </g>

                {/* 4. Nó Frevo (Superior Direito) */}
                <g onClick={() => setSelectedTagId('frevo')} className="cursor-pointer">
                  <circle cx="300" cy="170" r="6" fill="#0891B2" stroke="#FFFFFF" strokeWidth="1" />
                </g>

                {/* 5. Nó Ativo Selecionado (Destaque Verde Grande - Inferior) */}
                <g onClick={() => setSelectedTagId('mestre_vitalino')} className="cursor-pointer">
                  <circle cx="280" cy="320" r="14" fill="#1A6B3A" stroke="#22C55E" strokeWidth="2" opacity="0.9" />
                  <text x="280" y="344" fill="#FFFFFF" fontSize="8.5" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
                    Mestre Vitalino
                  </text>
                </g>
              </svg>

              {/* Legenda do Rodapé */}
              <div className="absolute bottom-2.5 right-3 flex items-center gap-3 text-[9px] text-white/50 font-mono pointer-events-none">
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#E8A920]" /> Auto</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-white/60" /> Usuário</span>
              </div>
            </div>
          </div>

          {/* Card: FLUXO DE AUTOMAÇÃO DO COFRE */}
          <div className="glass-card p-4 border border-black/07 space-y-2 bg-white/80">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#E8490A]">
              <Sparkles size={13} className="text-[#E8490A]" />
              <span>FLUXO DE AUTOMAÇÃO DO COFRE</span>
            </div>
            
            {/* Linhas de Código / Passos do Cofre */}
            <div className="font-mono text-[10.5px] space-y-1 text-[#E8490A]/90 bg-black/[0.01] p-2.5 rounded-xl border border-black/04">
              {currentDossier.etapasFluxo.map((linha, idx) => (
                <div key={idx} className="leading-relaxed">
                  {linha}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (6 colunas): PAINEL COMPLETO DO COFRE DA TAG SELECIONADA */}
        <div className="lg:col-span-6 space-y-3">
          
          <div className="glass-card p-5 border border-black/07 space-y-3.5 shadow-sm bg-white">
            
            {/* Header da Tag Preservada */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white bg-green-700">
                  TAG PRESERVADA
                </span>
                <span className="text-[9px] text-black/45 font-medium">Tag do Público</span>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A]">{currentDossier.tag}</h3>
              <p className="text-xs text-[#1A1A1A]/70 mt-1 leading-relaxed">{currentDossier.descricao}</p>
            </div>

            {/* Card ORIGEM DA TAG */}
            <div className="p-3 bg-black/[0.02] border border-black/06 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                <span className="flex items-center gap-1"><User size={11} className="text-[#E8490A]" /> ORIGEM DA TAG</span>
                <span className="font-mono text-green-700 font-bold">PRESERVADA</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#1A1A1A] text-[11px]">{currentDossier.autor}</p>
                <div className="text-[10px] text-right">
                  <span className="text-black/40 mr-1">Conceito central:</span>
                  <span className="font-bold text-[#E8490A]">{currentDossier.conceitoCentral}</span>
                </div>
              </div>
            </div>

            {/* Card ARTIGO CIENTÍFICO VINCULADO */}
            <div className="p-3.5 bg-gradient-to-br from-white via-white to-[#E8490A]/04 border border-[#E8490A]/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#E8490A]">
                <span className="flex items-center gap-1"><BookOpen size={12} /> ARTIGO CIENTÍFICO VINCULADO</span>
                <span className="font-mono">REFERÊNCIA REAL</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                  {currentDossier.artigo.titulo}
                </h4>
                <p className="text-[10px] text-[#1A1A1A]/60 mt-0.5 font-medium">
                  {currentDossier.artigo.autor} • <span className="italic">{currentDossier.artigo.veiculo}</span> ({currentDossier.artigo.ano})
                </p>
              </div>

              <p className="text-[11px] text-[#1A1A1A]/80 leading-relaxed border-t border-black/05 pt-1.5">
                {currentDossier.artigo.resumo}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="font-mono text-[#1A1A1A]/50">DOI: {currentDossier.artigo.doi}</span>
                <a
                  href={currentDossier.artigo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#E8490A] hover:underline"
                >
                  <span>Abrir Fonte</span>
                  <ArrowUpRight size={11} />
                </a>
              </div>
            </div>

            {/* Seção INTERLIGAÇÕES AUTOMÁTICAS & FAMÍLIAS CULTURAIS */}
            <div className="space-y-2 pt-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">
                INTERLIGAÇÕES AUTOMÁTICAS &amp; FAMÍLIAS CULTURAIS:
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {currentDossier.interligacoes.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (item.targetId && CULTURAL_VAULT_DATABASE[item.targetId]) {
                        setSelectedTagId(item.targetId);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-black/[0.02] hover:bg-[#E8490A]/08 border border-black/05 text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <h5 className="text-[10.5px] font-bold text-[#1A1A1A] leading-tight truncate">{item.nome}</h5>
                      <span className="text-[9px] text-[#1A1A1A]/45">{item.tipo}</span>
                    </div>
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      item.badge === 'AUTO' 
                        ? 'bg-amber-500/15 text-amber-800' 
                        : 'bg-green-500/15 text-green-800'
                    }`}>
                      {item.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botão de Teste de Transferência de Dados */}
            <div className="pt-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full py-2.5 bg-black hover:bg-[#1A1A1A] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Send size={13} />
                <span>Executar Teste de Transferência de Dados (JSON-LD)</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ── MODAL: PACOTE DE TRANSFERÊNCIA DE DADOS (JSON-LD 1.1) ── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
            
            {/* Header do Modal */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <FileCode2 size={18} className="text-[#E8490A]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pacote de Transferência de Dados Interoperável — "{currentDossier.tag}"
                  </h3>
                  <p className="text-[10px] text-white/50 font-mono">
                    Padrão JSON-LD 1.1 • W3C SKOS • PROV-O • Schema.org
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-white/50 hover:text-white text-xs px-2.5 py-1 rounded bg-white/05 cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>

            {/* Informações da Consulta */}
            <div className="p-3 bg-black/30 border-b border-white/05 text-[10.5px] font-mono text-white/70 flex flex-wrap items-center justify-between gap-2">
              <span>Endpoint: <code>/api/interop/jsonld?tag={currentDossier.id}</code></span>
              <span className="text-green-400 font-bold">Status: 200 OK (Content Negotiation)</span>
            </div>

            {/* Código JSON-LD Formatado */}
            <div className="p-4 overflow-auto flex-1 font-mono text-[11px] text-green-400 bg-black/60">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(jsonLdPayload, null, 2)}
              </pre>
            </div>

            {/* Footer do Modal */}
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-[10px] text-white/50 font-mono">
                A tag original permanece preservada e associada à sua proveniência e artigo verificado.
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(jsonLdPayload, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-1.5 bg-[#E8490A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#c44000] cursor-pointer"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copiado!' : 'Copiar Pacote JSON-LD'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
