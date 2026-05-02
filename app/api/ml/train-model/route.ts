import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { collectTrainingData, exportToHuggingFace } from '@/lib/ml/training-data-collector';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.ADMIN_SECRET && authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 1. Gerar os dados de treinamento (Europeana + IBRAM)
    console.log('[TrainModelAPI] Coletando dados para treinamento...');
    const result = await collectTrainingData(50, 20); // Pode demorar alguns segundos
    const jsonlData = exportToHuggingFace(result.samples);

    // 2. Salvar no arquivo local que o script Python vai ler
    const rootDir = process.cwd();
    const datasetPath = path.join(rootDir, 'folksonomia-ner-dataset.jsonl');
    fs.writeFileSync(datasetPath, jsonlData, 'utf-8');
    console.log(`[TrainModelAPI] Dataset salvo em ${datasetPath} com ${result.samples.length} amostras.`);

    // 3. Executar o script Python para fine-tuning do ModernBERT
    const scriptPath = path.join(rootDir, 'scripts', 'train_modernbert_ner.py');
    const venvPythonPath = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
    
    // Verificar se o venv existe, senao usar 'py' global
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'py';

    console.log(`[TrainModelAPI] Iniciando treinamento via ${pythonExecutable} ${scriptPath}...`);

    const pyProcess = spawn(pythonExecutable, [scriptPath], {
      cwd: rootDir,
      detached: true, // Roda em background mesmo se o request finalizar
      stdio: 'ignore' // Ignora logs no console do Next.js (em produção você salvaria num arquivo)
    });

    // Permite que o processo do Node.js não espere pelo processo Python
    pyProcess.unref();

    return NextResponse.json({
      success: true,
      message: 'Treinamento do ModernBERT iniciado em background no servidor',
      stats: result.stats
    });
  } catch (err) {
    console.error('[TrainModelAPI] Error:', err);
    return NextResponse.json({ error: 'Erro no disparo do treinamento' }, { status: 500 });
  }
}
