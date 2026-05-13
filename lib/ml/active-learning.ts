/**
 * Folksonomia Digital 2.0 — Motor de Aprendizado Ativo
 * 
 * Quando o sistema encontra um termo que não compreende:
 * 1. Registra em `unknown_terms`
 * 2. Busca nas bases externas (Europeana, Ibram, Brasiliana)
 * 3. Gera hipótese com evidências
 * 4. Marca para validação humana
 * 5. Quando validado, salva em `semantic_memory` e `semantic_training_examples`
 * 
 * Este é o mecanismo que faz o sistema EVOLUIR.
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeText, createLocalEmbedding, EMBEDDING_DIMENSIONS } from './embeddings';
import { collectEvidence, getCachedEvidence } from './evidence-collector';

// ============================================================
// Tipos
// ============================================================

export interface UnknownTerm {
  termo: string;
  termo_normalizado: string;
  contexto_texto?: string;
  obra_id?: string;
  hipotese_categoria?: string;
  hipotese_confianca: number;
  evidencias: any[];
  status: 'pendente' | 'resolvido' | 'descartado';
}

export interface LearningResult {
  action: 'registered' | 'already_known' | 'hypothesis_generated' | 'resolved';
  term: string;
  hypothesis?: {
    categoria: string;
    confianca: number;
    evidencias: number;
    fontes: string[];
  };
  memory_match?: {
    termo: string;
    categoria: string;
    confianca: number;
  };
  needs_validation: boolean;
}

// ============================================================
// Detecção de Termos Desconhecidos
// ============================================================

/**
 * Verifica se um termo é conhecido pelo sistema.
 * Ordem de busca: memória semântica → dicionários → fontes externas
 */
export async function isTermKnown(term: string): Promise<{
  known: boolean;
  source?: string;
  category?: string;
  confidence?: number;
}> {
  const termNorm = normalizeText(term);
  if (!termNorm || termNorm.length < 2) return { known: false };

  // 1. Buscar na memória semântica
  try {
    const { data: memory } = await supabaseAdmin
      .from('semantic_memory')
      .select('termo, categoria, confianca, status')
      .eq('termo_normalizado', termNorm)
      .single();
    
    if (memory && memory.status !== 'rejeitado') {
      return {
        known: true,
        source: 'semantic_memory',
        category: memory.categoria,
        confidence: memory.confianca
      };
    }
  } catch {
    // Não encontrado na memória
  }

  // 2. Buscar evidências já persistidas
  const cached = await getCachedEvidence(term);
  if (cached.length > 0) {
    const bestEvidence = cached[0];
    return {
      known: true,
      source: `evidence_cache:${bestEvidence.fonte}`,
      category: bestEvidence.categoria,
      confidence: bestEvidence.peso * 0.7 // Evidência externa tem peso menor que memória
    };
  }

  return { known: false };
}

// ============================================================
// Fluxo de Aprendizado Ativo
// ============================================================

/**
 * Processa um termo potencialmente desconhecido.
 * Se o termo não é conhecido, inicia o fluxo de aprendizado ativo.
 */
export async function processUnknownTerm(
  term: string,
  options: {
    contexto_texto?: string;
    obra_id?: string;
    confidence_threshold?: number;
  } = {}
): Promise<LearningResult> {
  const termNorm = normalizeText(term);
  const threshold = options.confidence_threshold || 0.4;

  // 1. Verificar se já é conhecido
  const known = await isTermKnown(term);
  if (known.known && (known.confidence || 0) >= threshold) {
    return {
      action: 'already_known',
      term,
      memory_match: {
        termo: term,
        categoria: known.category || 'TEMA',
        confianca: known.confidence || 0
      },
      needs_validation: false
    };
  }

  // 2. Verificar se já está registrado como desconhecido
  try {
    const { data: existing } = await supabaseAdmin
      .from('unknown_terms')
      .select('*')
      .eq('termo_normalizado', termNorm)
      .single();
    
    if (existing && existing.status === 'resolvido') {
      return {
        action: 'resolved',
        term,
        memory_match: {
          termo: term,
          categoria: existing.resolvido_como || 'TEMA',
          confianca: 0.8
        },
        needs_validation: false
      };
    }
    
    if (existing && existing.status === 'pendente') {
      // Já registrado, retornar hipótese existente
      return {
        action: 'registered',
        term,
        hypothesis: {
          categoria: existing.hipotese_categoria || 'TEMA',
          confianca: existing.hipotese_confianca || 0,
          evidencias: (existing.evidencias_externas || []).length,
          fontes: (existing.evidencias_externas || []).map((e: any) => e.fonte)
        },
        needs_validation: true
      };
    }
  } catch {
    // Não encontrado, vamos registrar
  }

  // 3. Buscar evidências externas
  const evidenceReport = await collectEvidence(term);

  // 4. Gerar hipótese baseada nas evidências
  const hypothesis = {
    categoria: evidenceReport.consenso_categoria || 'TEMA',
    confianca: evidenceReport.consenso_confianca,
    evidencias: evidenceReport.total_evidencias,
    fontes: evidenceReport.fontes_com_resultado
  };

  // 5. Registrar como termo desconhecido
  try {
    await supabaseAdmin.from('unknown_terms').upsert({
      termo: term,
      termo_normalizado: termNorm,
      contexto_texto: options.contexto_texto,
      obra_id: options.obra_id,
      hipotese_categoria: hypothesis.categoria,
      hipotese_confianca: hypothesis.confianca,
      evidencias_externas: evidenceReport.evidencias,
      status: 'pendente'
    }, { onConflict: 'termo_normalizado' });
  } catch (err) {
    console.warn('[ActiveLearning] Register failed:', err);
  }

  return {
    action: 'hypothesis_generated',
    term,
    hypothesis,
    needs_validation: true
  };
}

// ============================================================
// Resolução de Termos (após validação humana)
// ============================================================

/**
 * Resolve um termo desconhecido após validação do curador.
 * Salva na memória semântica e gera exemplo de treinamento.
 */
export async function resolveTerm(
  term: string,
  categoria: string,
  significado: string,
  curadorId: string,
  contextos: string[] = []
): Promise<boolean> {
  const termNorm = normalizeText(term);

  try {
    // 1. Gerar embedding para memória semântica
    const embedding = await createLocalEmbedding(term);

    // 2. Salvar na memória semântica
    await supabaseAdmin.from('semantic_memory').upsert({
      termo: term,
      termo_normalizado: termNorm,
      significado,
      categoria,
      contextos,
      embedding: JSON.stringify(embedding),
      confianca: 0.90, // Validado por curador
      status: 'validado',
      total_validacoes: 1,
      ultima_validacao: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'termo_normalizado,categoria' });

    // 3. Marcar unknown_term como resolvido
    await supabaseAdmin
      .from('unknown_terms')
      .update({
        status: 'resolvido',
        resolvido_como: categoria,
        resolvido_por: 'curador',
        resolvido_em: new Date().toISOString()
      })
      .eq('termo_normalizado', termNorm);

    // 4. Gerar exemplo de treinamento para fine-tuning futuro
    if (significado) {
      const tokens = term.split(/\s+/).filter(Boolean);
      const labels = tokens.map((_, i) => i === 0 ? `B-${categoria}` : `I-${categoria}`);
      
      await supabaseAdmin.from('semantic_training_examples').insert({
        texto: significado,
        tokens,
        labels,
        contexto: { tipo: categoria.toLowerCase(), validado_por: curadorId, contextos },
        obra_referencia: null,
        fonte: 'active_learning',
        qualidade: 'humano',
        validado_por: curadorId,
        validado_em: new Date().toISOString()
      });
    }

    return true;
  } catch (err) {
    console.error('[ActiveLearning] Resolve failed:', err);
    return false;
  }
}

// ============================================================
// Listagem de Termos Pendentes
// ============================================================

/**
 * Lista termos desconhecidos pendentes de validação.
 */
export async function getPendingTerms(limit: number = 50): Promise<UnknownTerm[]> {
  try {
    const { data } = await supabaseAdmin
      .from('unknown_terms')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return (data || []).map(row => ({
      termo: row.termo,
      termo_normalizado: row.termo_normalizado,
      contexto_texto: row.contexto_texto,
      obra_id: row.obra_id,
      hipotese_categoria: row.hipotese_categoria,
      hipotese_confianca: row.hipotese_confianca || 0,
      evidencias: row.evidencias_externas || [],
      status: row.status
    }));
  } catch {
    return [];
  }
}
