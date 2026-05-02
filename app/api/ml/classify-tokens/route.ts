/**
 * API Route: /api/ml/classify-tokens
 * 
 * Classifica tokens de um texto em categorias semânticas museais.
 * Motor atual: heurístico baseado em dicionários.
 * Motor futuro: ModernBERT fine-tuned.
 */

import { NextRequest, NextResponse } from 'next/server';

// Dicionários inline para classificação (sem dependência circular)
const CATEGORIES: Record<string, string[]> = {
  DATA: [
    'circa', 'seculo', 'século', 'anos', 'decada', 'período', 'periodo',
    'colonial', 'barroco', 'rococo', 'rococó', 'neoclassico', 'modernista',
    'setecentista', 'oitocentista', 'novecentista'
  ],
  TECNICA: [
    'oleo', 'óleo', 'tela', 'aquarela', 'gravura', 'escultura', 'talha',
    'dourada', 'policromia', 'marcenaria', 'ourivesaria', 'cerâmica',
    'entalhe', 'nanquim', 'litografia', 'xilogravura', 'fotografia'
  ],
  GEO: [
    'brasil', 'portugal', 'lisboa', 'rio de janeiro', 'minas gerais',
    'bahia', 'pernambuco', 'ouro preto', 'congonhas', 'salvador',
    'recife', 'são paulo', 'europa', 'áfrica'
  ],
  MATERIAL: [
    'madeira', 'ouro', 'prata', 'bronze', 'ferro', 'barro', 'argila',
    'papel', 'tecido', 'vidro', 'pedra', 'marfim', 'couro', 'tinta',
    'jacarandá', 'cedro', 'porcelana', 'cristal', 'mármore'
  ],
  AUTORIA: [
    'aleijadinho', 'debret', 'portinari', 'tarsila', 'ataíde',
    'atribuído', 'escola', 'oficina', 'mestre', 'anônimo', 'desconhecido'
  ],
  PROVENIENCIA: [
    'coleção', 'acervo', 'doação', 'museu', 'igreja', 'palácio',
    'arquivo', 'pinacoteca', 'herança', 'transferência', 'legado'
  ],
  QUALIFICADOR: [
    'possivelmente', 'provavelmente', 'circa', 'atribuído a',
    'possível', 'provável', 'estimado', 'presumido'
  ]
};

function classifyToken(word: string): { category: string; confidence: number } {
  const lower = word.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  // Detectar datas numéricas
  if (/^\d{4}$/.test(word) && parseInt(word) >= 1400 && parseInt(word) <= 2100) {
    return { category: 'DATA', confidence: 0.9 };
  }

  for (const [cat, terms] of Object.entries(CATEGORIES)) {
    for (const term of terms) {
      const termClean = term.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      if (lower === termClean || lower.includes(termClean)) {
        return { category: cat, confidence: 0.7 };
      }
    }
  }

  return { category: 'O', confidence: 1.0 };
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Campo "text" obrigatório' }, { status: 400 });
    }

    const words = text.split(/\s+/).filter(Boolean);
    const classified = words.map((word: string) => {
      const { category, confidence } = classifyToken(word);
      return { token: word, category, confidence };
    });

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
      motor: 'heuristic',  // será 'modernbert' quando o modelo estiver treinado
      tokens: classified,
      summary,
      totalTokens: words.length,
      classifiedTokens: classified.filter((c: any) => c.category !== 'O').length
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 });
  }
}
