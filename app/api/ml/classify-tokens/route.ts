/**
 * API Route: /api/ml/classify-tokens
 * 
 * Classifica tokens de um texto em categorias semânticas museais.
 * Utiliza o classificador autônomo baseado em Naive Bayes e bigramas,
 * que é treinado continuamente com dados da Europeana/IBRAM e feedback curatorial.
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyTokens } from '@/lib/ml/autonomous-trainer';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Campo "text" obrigatório' }, { status: 400 });
    }

    // Classifica usando o modelo autônomo (carrega do BD ou treina on-demand)
    const classified = await classifyTokens(text);

    // Gerar resumo
    const summary: Record<string, string[]> = {};
    for (const c of classified) {
      if (c.category !== 'O') {
        if (!summary[c.category]) summary[c.category] = [];
        if (!summary[c.category].includes(c.token)) {
          summary[c.category].push(c.token);
        }
      }
    }

    return NextResponse.json({
      motor: 'autonomous-naive-bayes',
      tokens: classified,
      summary,
      totalTokens: classified.length,
      classifiedTokens: classified.filter((c: any) => c.category !== 'O').length
    });
  } catch (err) {
    console.error('[ClassifyTokens] Error:', err);
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 });
  }
}
