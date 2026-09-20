/**
 * API Route: /api/ml/classify-tokens
 * 
 * Classifica tokens de um texto usando ModernBERT (via ML Service) ou heurística.
 * Confiança vem do modelo real, nunca valores fixos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { ML_SERVICE_URL } from '@/lib/core/env';

// ============================================================
// Fallback Heurístico (quando ML Service está offline)
// ============================================================

const CATEGORIES: Record<string, string[]> = {
  DATA: ['circa', 'seculo', 'século', 'anos', 'decada', 'colonial', 'barroco', 'setecentista', 'oitocentista'],
  TECNICA: ['oleo', 'óleo', 'tela', 'aquarela', 'gravura', 'escultura', 'talha', 'policromia', 'marcenaria', 'dourada', 'entalhe'],
  GEO: ['brasil', 'portugal', 'lisboa', 'rio de janeiro', 'minas gerais', 'bahia', 'ouro preto'],
  MATERIAL: ['madeira', 'ouro', 'prata', 'bronze', 'ferro', 'barro', 'papel', 'tecido', 'vidro', 'pedra', 'marfim'],
  AUTORIA: ['aleijadinho', 'debret', 'portinari', 'tarsila', 'ataíde', 'atribuído', 'escola', 'anônimo'],
  PROVENIENCIA: ['coleção', 'acervo', 'doação', 'museu', 'igreja', 'arquivo', 'herança'],
  QUALIFICADOR: ['possivelmente', 'provavelmente', 'circa', 'atribuído a', 'estimado'],
  ICONOGRAFIA: ['santo', 'santa', 'cristo', 'virgem', 'anjo', 'querubim', 'crucifixo'],
  TEMA: ['retrato', 'paisagem', 'natureza', 'guerra', 'maternidade', 'religião'],
  ESTILO: ['gótico', 'maneirista', 'churrigueresco', 'rococó', 'neogótico'],
  MOVIMENTO: ['impressionismo', 'expressionismo', 'cubismo', 'modernismo', 'tropicália'],
  CONSERVACAO: ['restaurado', 'fragmento', 'lacuna', 'repintura', 'consolidado', 'original'],
  PERIODO: ['medieval', 'renascentista', 'colonial', 'imperial', 'republicano', 'contemporâneo']
};

function classifyHeuristic(word: string): { category: string; confidence: number } {
  const lower = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  
  // Datas numéricas: confiança moderada (contexto pode mudar significado)
  if (/^\d{4}$/.test(word)) return { category: 'DATA', confidence: 0.65 };
  
  for (const [cat, terms] of Object.entries(CATEGORIES)) {
    for (const term of terms) {
      const termClean = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (lower === termClean) {
        // Match exato: confiança moderada (dicionário, não modelo)
        return { category: cat, confidence: 0.55 };
      }
      if (lower.includes(termClean) && termClean.length > 3) {
        // Match parcial: confiança mais baixa
        return { category: cat, confidence: 0.40 };
      }
    }
  }
  
  // Não reconhecido: NÃO é 100% confiante de que não sabe
  // 0.5 = genuína incerteza (o sistema não sabe, não "tem certeza que não é nada")
  return { category: 'O', confidence: 0.5 };
}

// ============================================================
// ML Service Client
// ============================================================

async function classifyViaMLService(text: string): Promise<{
  tokens: { token: string; category: string; confidence: number }[];
  modelVersion?: string;
} | null> {
  const mlServiceUrl = ML_SERVICE_URL;
  if (!mlServiceUrl) return null;

  try {
    const res = await fetch(`${mlServiceUrl}/predict-ner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      tokens: data.tokens.map((t: any) => ({
        token: t.token,
        category: t.category || t.label?.replace('B-', '').replace('I-', '') || 'O',
        // Confiança REAL do modelo (softmax probability)
        confidence: t.confidence || t.probability || 0.5
      })),
      modelVersion: data.model_version
    };
  } catch {
    console.warn('[ClassifyTokens] ML Service indisponível');
    return null;
  }
}

// ============================================================
// Endpoint
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Campo "text" obrigatório' }, { status: 400 });
    }

    let tokens: { token: string; category: string; confidence: number }[] = [];
    let motor = 'heuristic_fallback';
    let modelVersion: string | undefined;
    const startTime = Date.now();

    // 1. Tentar ML Service primeiro
    const mlResult = await classifyViaMLService(text);
    
    if (mlResult) {
      tokens = mlResult.tokens;
      motor = 'modernbert_ner';
      modelVersion = mlResult.modelVersion;
    } else {
      // 2. Fallback para heurística
      const words = text.split(/\s+/).filter(Boolean);
      tokens = words.map((word: string) => {
        const { category, confidence } = classifyHeuristic(word);
        return { token: word, category, confidence };
      });
    }

    const inferenceTime = Date.now() - startTime;

    // 3. Gerar resumo
    const summary: Record<string, string[]> = {};
    for (const c of tokens) {
      if (c.category !== 'O') {
        if (!summary[c.category]) summary[c.category] = [];
        if (!summary[c.category].includes(c.token)) {
          summary[c.category].push(c.token);
        }
      }
    }

    // 4. Registrar predição no banco (para aprendizado futuro)
    const avgConfidence = tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.confidence, 0) / tokens.length
      : 0;

    try {
      await supabaseAdmin.from('semantic_predictions').insert({
        texto_input: text,
        tokens_preditos: tokens,
        motor,
        modelo_versao: modelVersion || null,
        confianca_media: Math.round(avgConfidence * 100) / 100,
        tempo_inferencia_ms: inferenceTime
      });
    } catch {
      // Log de predição é best-effort, não bloqueia resposta
    }

    return NextResponse.json({
      motor,
      modelVersion,
      tokens,
      summary,
      totalTokens: tokens.length,
      classifiedTokens: tokens.filter((c: any) => c.category !== 'O').length,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      inferenceTimeMs: inferenceTime
    });
  } catch (err) {
    console.error('[ClassifyTokens] Error:', err);
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 });
  }
}
