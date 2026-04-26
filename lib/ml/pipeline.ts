import { normalizeText } from '../core/normalize';
import { createEntitySignature } from '../core/crypto';
import { createLocalEmbedding } from './embeddings';
import { matchOntologies, suggestInternalRelations } from './recommendations';
import { calculateConfidence, calculateNovelty, calculateTension, calculateResonance } from './scoring';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function runSemanticPipeline(tagOriginal: string, obraId: string, visitanteHash?: string) {
  // 1 & 2. Salvar e Normalizar
  const conteudoNormalizado = normalizeText(tagOriginal);
  if (!conteudoNormalizado) throw new Error('Tag inválida');

  // 3. Criar assinatura interna
  const payloadToHash = { tag: tagOriginal, norm: conteudoNormalizado, obra_id: obraId, ts: Date.now() };
  const assinaturaHash = createEntitySignature(payloadToHash);

  // 4. Gerar vetor local
  const embedding = await createLocalEmbedding(conteudoNormalizado);

  // Consultar dados auxiliares (ontologias, núcleos existentes)
  // Como estamos em ambiente serverless, fazemos consultas leves ao DB
  const [{ data: ontologias }, { data: nucleosExistentes }] = await Promise.all([
    supabaseAdmin.from('ontologias').select('*').limit(20),
    supabaseAdmin.from('nucleos').select('id, conteudo_original').neq('conteudo_original', tagOriginal).limit(50)
  ]);

  // 7. Comparar ontologias
  const matchedOntologies = matchOntologies(conteudoNormalizado, ontologias || []);

  // 9. Relações internas
  const internalRelations = suggestInternalRelations(conteudoNormalizado, nucleosExistentes || []);

  // Simulação de chamadas externas para o score (0 a 1)
  const externalMatchesCount = 1; // Default to 1 to simulate open data connections

  // 13. Calcular Scores (agora convertidos de 0 a 1 para o formato 0 a 100 esperado pelas APIs)
  const confidence = calculateConfidence(conteudoNormalizado, {}, externalMatchesCount, 0) * 100;
  
  const maxSim = internalRelations.length > 0 ? internalRelations[0].score : 0;
  const novelty = calculateNovelty(conteudoNormalizado, maxSim, maxSim < 0.3) * 100;
  
  const tension = calculateTension(conteudoNormalizado, matchedOntologies.length, 0.5) * 100;
  const resonance = calculateResonance(conteudoNormalizado, internalRelations.length, externalMatchesCount) * 100;

  return {
    cell: {
      signature: assinaturaHash,
      embedding: `[${embedding.join(',')}]`,
      encryptedPayload: Buffer.from(JSON.stringify(payloadToHash)).toString('base64'),
    },
    semantics: {
      confidence,
      novelty,
      tension,
      resonance,
      concepts: matchedOntologies.length > 0 ? matchedOntologies : ['Outros']
    }
  };
}
