import { collectTrainingData, exportToHuggingFace } from '../lib/ml/training-data-collector';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Iniciando coleta de dados reais da Europeana e IBRAM...');
  const result = await collectTrainingData(50, 20);
  
  console.log(`Coletadas ${result.stats.total} amostras.`);
  console.log('Estatísticas:', result.stats);
  
  const jsonlData = exportToHuggingFace(result.samples);
  const outPath = path.join(process.cwd(), 'folksonomia-ner-dataset.jsonl');
  fs.writeFileSync(outPath, jsonlData, 'utf-8');
  
  console.log(`Dataset exportado para ${outPath}`);
  console.log('\nAgora você pode iniciar o treinamento Python executando:');
  console.log('.\\venv\\Scripts\\python.exe scripts/train_modernbert_ner.py');
}

main().catch(console.error);
