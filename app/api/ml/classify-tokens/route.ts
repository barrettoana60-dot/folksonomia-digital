/**
 * API Route: /api/ml/classify-tokens
 * 
 * Classifica tokens de um texto usando ModernBERT.
 * Se o modelo não estiver treinado ou disponível, faz fallback para heurística.
 */

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================
// Fallback Heurístico (Até que o ModernBERT termine de treinar)
// ============================================================

const CATEGORIES: Record<string, string[]> = {
  DATA: ['circa', 'seculo', 'século', 'anos', 'decada', 'colonial', 'barroco', 'setecentista', 'oitocentista'],
  TECNICA: ['oleo', 'óleo', 'tela', 'aquarela', 'gravura', 'escultura', 'talha', 'policromia', 'marcenaria'],
  GEO: ['brasil', 'portugal', 'lisboa', 'rio de janeiro', 'minas gerais', 'bahia', 'ouro preto'],
  MATERIAL: ['madeira', 'ouro', 'prata', 'bronze', 'ferro', 'barro', 'papel', 'tecido', 'vidro', 'pedra'],
  AUTORIA: ['aleijadinho', 'debret', 'portinari', 'tarsila', 'ataíde', 'atribuído', 'escola', 'anônimo'],
  PROVENIENCIA: ['coleção', 'acervo', 'doação', 'museu', 'igreja', 'arquivo', 'herança'],
  QUALIFICADOR: ['possivelmente', 'provavelmente', 'circa', 'atribuído a', 'estimado']
};

function classifyHeuristic(word: string): { category: string; confidence: number } {
  const lower = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  if (/^\d{4}$/.test(word)) return { category: 'DATA', confidence: 0.9 };
  for (const [cat, terms] of Object.entries(CATEGORIES)) {
    for (const term of terms) {
      const termClean = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (lower === termClean || lower.includes(termClean)) {
        return { category: cat, confidence: 0.7 };
      }
    }
  }
  return { category: 'O', confidence: 1.0 };
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

    const rootDir = process.cwd();
    const scriptPath = path.join(rootDir, 'scripts', 'infer_modernbert_ner.py');
    const venvPythonPath = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'py';

    let tokens = [];
    let motor = 'modernbert';

    try {
      const { stdout } = await execFileAsync(pythonExecutable, [scriptPath, text]);
      const result = JSON.parse(stdout);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      tokens = result.tokens.map((t: any) => ({
        token: t.token,
        category: t.category,
        confidence: 0.95 // Modelo treinado tem alta confiança
      }));
    } catch (pyErr: any) {
      console.warn('[ClassifyTokens] ModernBERT indisponível ou erro no script, usando heurística:', pyErr.message || pyErr);
      motor = 'heuristic_fallback';
      
      const words = text.split(/\s+/).filter(Boolean);
      tokens = words.map((word: string) => {
        const { category, confidence } = classifyHeuristic(word);
        return { token: word, category, confidence };
      });
    }

    // Gerar resumo
    const summary: Record<string, string[]> = {};
    for (const c of tokens) {
      if (c.category !== 'O') {
        if (!summary[c.category]) summary[c.category] = [];
        if (!summary[c.category].includes(c.token)) {
          summary[c.category].push(c.token);
        }
      }
    }

    return NextResponse.json({
      motor,
      tokens,
      summary,
      totalTokens: tokens.length,
      classifiedTokens: tokens.filter((c: any) => c.category !== 'O').length
    });
  } catch (err) {
    console.error('[ClassifyTokens] Error:', err);
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 });
  }
}
