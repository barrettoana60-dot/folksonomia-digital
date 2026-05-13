/**
 * Folksonomia Digital 2.0 — Coletor de Evidências Cross-Source
 * 
 * Consulta Europeana, Ibram/Tainacan e Brasiliana para encontrar
 * evidências que confirmem ou contestem um termo/classificação.
 * 
 * Cada evidência é estruturada como:
 * { fonte, termo_externo, categoria, tipo_relacao, peso }
 * 
 * As evidências são persistidas em `cross_source_evidence` e
 * alimentam o motor de confiança calibrado.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { EuropeanaConnector } from '../connectors/europeana';
import { IbramConnector } from '../connectors/ibram';
import { BrasilianaConnector } from '../connectors/brasiliana';
import { normalizeText } from './embeddings';

// ============================================================
// Tipos
// ============================================================

export interface CrossSourceEvidence {
  fonte: string;              // 'europeana', 'ibram', 'brasiliana'
  termo_externo: string;      // como o termo aparece na fonte
  categoria: string;          // categoria inferida na fonte
  tipo_relacao: 'exactMatch' | 'closeMatch' | 'relatedMatch' | 'broadMatch';
  peso: number;               // 0-1
  url?: string;               // link para registro original
  metadados?: Record<string, any>;
}

export interface EvidenceReport {
  termo: string;
  total_evidencias: number;
  evidencias: CrossSourceEvidence[];
  consenso_categoria?: string;       // categoria mais frequente nas fontes
  consenso_confianca: number;        // 0-1, grau de consenso entre fontes
  fontes_consultadas: string[];
  fontes_com_resultado: string[];
}

// ============================================================
// Extração de Categoria de Texto Externo
// ============================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  MATERIAL: ['material', 'materia', 'madeira', 'ouro', 'prata', 'bronze', 'ferro', 'marfim', 'barro', 'pedra', 'tecido', 'papel'],
  TECNICA: ['tecnica', 'técnica', 'talha', 'policromia', 'dourado', 'entalhe', 'escultura', 'pintura', 'gravura', 'fundição', 'marcenaria', 'ourivesaria'],
  AUTORIA: ['autor', 'artista', 'criador', 'mestre', 'atelier', 'oficina', 'escola'],
  DATA: ['data', 'datação', 'periodo', 'século', 'ano', 'circa'],
  GEO: ['local', 'lugar', 'cidade', 'país', 'região', 'procedência', 'origem'],
  PROVENIENCIA: ['proveniência', 'coleção', 'acervo', 'museu', 'doação'],
  ICONOGRAFIA: ['iconografia', 'santo', 'santa', 'virgem', 'cristo', 'anjo'],
  TEMA: ['tema', 'assunto', 'gênero', 'retrato', 'paisagem'],
};

function inferCategoryFromContext(text: string, fieldName?: string): string | undefined {
  const lower = normalizeText(text + ' ' + (fieldName || ''));
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = normalizeText(kw);
      if (lower.includes(kwNorm)) {
        return category;
      }
    }
  }
  return undefined;
}

function calculateMatchWeight(
  termNorm: string, 
  externalText: string, 
  source: string
): { tipo_relacao: CrossSourceEvidence['tipo_relacao']; peso: number } {
  const extNorm = normalizeText(externalText);
  
  // Match exato
  if (extNorm === termNorm || extNorm.includes(termNorm)) {
    return { 
      tipo_relacao: 'exactMatch', 
      peso: source === 'europeana' ? 0.90 : source === 'ibram' ? 0.85 : 0.80 
    };
  }
  
  // Match parcial (palavras em comum)
  const termWords = new Set(termNorm.split(' '));
  const extWords = extNorm.split(' ');
  const overlap = extWords.filter(w => termWords.has(w) && w.length > 2).length;
  
  if (overlap > 0 && termWords.size > 0) {
    const ratio = overlap / termWords.size;
    if (ratio >= 0.5) {
      return { tipo_relacao: 'closeMatch', peso: 0.65 + ratio * 0.15 };
    }
    return { tipo_relacao: 'relatedMatch', peso: 0.40 + ratio * 0.2 };
  }
  
  return { tipo_relacao: 'broadMatch', peso: 0.25 };
}

// ============================================================
// Coletores por Fonte
// ============================================================

async function collectFromEuropeana(term: string): Promise<CrossSourceEvidence[]> {
  const connector = new EuropeanaConnector();
  const evidences: CrossSourceEvidence[] = [];
  
  try {
    const records = await connector.searchRecords(term, 5);
    const termNorm = normalizeText(term);
    
    for (const rec of records) {
      // Checar cada campo relevante
      const fieldsToCheck = [
        { text: rec.title, field: 'titulo' },
        { text: rec.description, field: 'descricao' },
        { text: rec.creator, field: 'autoria' },
        { text: rec.date, field: 'data' },
        ...(rec.medium || []).map(m => ({ text: m, field: 'material/tecnica' })),
        ...(rec.subject || []).map(s => ({ text: s, field: 'assunto' })),
        ...(rec.spatial || []).map(s => ({ text: s, field: 'geografia' })),
      ];
      
      for (const { text, field } of fieldsToCheck) {
        if (!text) continue;
        const { tipo_relacao, peso } = calculateMatchWeight(termNorm, text, 'europeana');
        
        if (peso >= 0.40) {
          evidences.push({
            fonte: 'europeana',
            termo_externo: text.substring(0, 200),
            categoria: inferCategoryFromContext(text, field) || 'TEMA',
            tipo_relacao,
            peso,
            url: rec.url,
            metadados: { record_id: rec.id, field, provider: rec.dataProvider }
          });
        }
      }
    }
  } catch (err) {
    console.warn('[EvidenceCollector] Europeana error:', err);
  }
  
  return evidences.slice(0, 5); // máximo 5 evidências por fonte
}

async function collectFromIbram(term: string): Promise<CrossSourceEvidence[]> {
  const connector = new IbramConnector();
  const evidences: CrossSourceEvidence[] = [];
  
  try {
    const records = await connector.searchAllMuseums(term, 3);
    const termNorm = normalizeText(term);
    
    for (const rec of records) {
      const fieldsToCheck = [
        { text: rec.title, field: 'titulo' },
        { text: rec.description, field: 'descricao' },
        { text: rec.author, field: 'autoria' },
        ...Object.entries(rec.metadata).map(([k, v]) => ({ text: v, field: k })),
      ];
      
      for (const { text, field } of fieldsToCheck) {
        if (!text) continue;
        const { tipo_relacao, peso } = calculateMatchWeight(termNorm, text, 'ibram');
        
        if (peso >= 0.40) {
          evidences.push({
            fonte: 'ibram',
            termo_externo: text.substring(0, 200),
            categoria: inferCategoryFromContext(text, field) || 'TEMA',
            tipo_relacao,
            peso,
            url: rec.url,
            metadados: { record_id: rec.id, field, museum: rec.museum }
          });
        }
      }
    }
  } catch (err) {
    console.warn('[EvidenceCollector] IBRAM error:', err);
  }
  
  return evidences.slice(0, 5);
}

async function collectFromBrasiliana(term: string): Promise<CrossSourceEvidence[]> {
  const connector = new BrasilianaConnector();
  const evidences: CrossSourceEvidence[] = [];
  
  try {
    const matches = await connector.searchExternalSource(term);
    const termNorm = normalizeText(term);
    
    for (const match of matches) {
      const combinedText = `${match.title} ${match.description || ''}`;
      const { tipo_relacao, peso } = calculateMatchWeight(termNorm, combinedText, 'brasiliana');
      
      if (peso >= 0.35) {
        evidences.push({
          fonte: 'brasiliana',
          termo_externo: match.title.substring(0, 200),
          categoria: inferCategoryFromContext(combinedText) || 'TEMA',
          tipo_relacao,
          peso,
          url: match.url,
          metadados: { external_id: match.external_id }
        });
      }
    }
  } catch (err) {
    console.warn('[EvidenceCollector] Brasiliana error:', err);
  }
  
  return evidences.slice(0, 5);
}

// ============================================================
// Pipeline Principal
// ============================================================

/**
 * Coleta evidências de TODAS as fontes externas para um termo.
 * Persiste resultados em cross_source_evidence.
 */
export async function collectEvidence(term: string): Promise<EvidenceReport> {
  const termNorm = normalizeText(term);
  const fontesConsultadas = ['europeana', 'ibram', 'brasiliana'];
  
  // Buscar em paralelo em todas as fontes
  const [euEvidences, ibEvidences, brEvidences] = await Promise.allSettled([
    collectFromEuropeana(term),
    collectFromIbram(term),
    collectFromBrasiliana(term),
  ]);

  const allEvidences: CrossSourceEvidence[] = [
    ...(euEvidences.status === 'fulfilled' ? euEvidences.value : []),
    ...(ibEvidences.status === 'fulfilled' ? ibEvidences.value : []),
    ...(brEvidences.status === 'fulfilled' ? brEvidences.value : []),
  ];

  const fontesComResultado = [
    ...(euEvidences.status === 'fulfilled' && euEvidences.value.length > 0 ? ['europeana'] : []),
    ...(ibEvidences.status === 'fulfilled' && ibEvidences.value.length > 0 ? ['ibram'] : []),
    ...(brEvidences.status === 'fulfilled' && brEvidences.value.length > 0 ? ['brasiliana'] : []),
  ];

  // Calcular consenso de categoria
  const categoryVotes: Record<string, number> = {};
  for (const ev of allEvidences) {
    categoryVotes[ev.categoria] = (categoryVotes[ev.categoria] || 0) + ev.peso;
  }
  
  const sortedCategories = Object.entries(categoryVotes)
    .sort(([, a], [, b]) => b - a);
  
  const consensoCategoria = sortedCategories.length > 0 ? sortedCategories[0][0] : undefined;
  const totalPeso = Object.values(categoryVotes).reduce((s, v) => s + v, 0);
  const consensoConfianca = sortedCategories.length > 0 && totalPeso > 0
    ? sortedCategories[0][1] / totalPeso
    : 0;

  // Persistir no banco (best-effort)
  try {
    for (const ev of allEvidences.slice(0, 15)) {
      await supabaseAdmin.from('cross_source_evidence').upsert({
        termo: term,
        termo_normalizado: termNorm,
        fonte: ev.fonte,
        termo_externo: ev.termo_externo,
        categoria_externa: ev.categoria,
        tipo_relacao: ev.tipo_relacao,
        peso: ev.peso,
        url_fonte: ev.url,
        metadados: ev.metadados || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'termo_normalizado,fonte,termo_externo' });
    }
  } catch (err) {
    console.warn('[EvidenceCollector] Persist failed:', err);
  }

  return {
    termo: term,
    total_evidencias: allEvidences.length,
    evidencias: allEvidences,
    consenso_categoria: consensoCategoria,
    consenso_confianca: Math.round(consensoConfianca * 100) / 100,
    fontes_consultadas: fontesConsultadas,
    fontes_com_resultado: fontesComResultado,
  };
}

/**
 * Busca evidências já persistidas (cache) para um termo.
 * Evita re-consultar fontes externas se já temos dados recentes.
 */
export async function getCachedEvidence(term: string): Promise<CrossSourceEvidence[]> {
  const termNorm = normalizeText(term);
  
  try {
    const { data } = await supabaseAdmin
      .from('cross_source_evidence')
      .select('*')
      .eq('termo_normalizado', termNorm)
      .order('peso', { ascending: false })
      .limit(20);
    
    if (!data) return [];
    
    return data.map(row => ({
      fonte: row.fonte,
      termo_externo: row.termo_externo,
      categoria: row.categoria_externa,
      tipo_relacao: row.tipo_relacao,
      peso: row.peso,
      url: row.url_fonte,
      metadados: row.metadados,
    }));
  } catch {
    return [];
  }
}
