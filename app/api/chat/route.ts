import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Node.js required for xenova/transformers in Next.js

// Singleton Pattern para não recarregar o modelo na memória a cada mensagem
class TransformerPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance(progress_callback: any = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

// Função para calcular Similaridade de Cossenos entre dois vetores (Tensors)
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensagem vazia' }, { status: 400 });
    }

    // Tenta instanciar o modelo Transformer Local
    const extractor = await TransformerPipeline.getInstance();

    // 1. Converte a mensagem do usuário num Tensor Vetorial (Embedding)
    const userOutput = await extractor(message, { pooling: 'mean', normalize: true });
    const userVector = Array.from(userOutput.data as Float32Array);

    // 2. Busca tags no banco de dados para cruzar
    const { data: dbTags } = await supabaseAdmin.from('tags').select('tag_original, grupo_tematico').limit(50);
    
    let bestMatch = { tag: '', similarity: 0, group: '' };

    // 3. Aplica a Lógica Matemática (Cosine Similarity) para achar a tag mais próxima do contexto da pergunta
    if (dbTags && dbTags.length > 0) {
      for (const t of dbTags) {
        // Ignora tags muito longas para n atrasar
        if (t.tag_original.length > 100) continue;
        
        const tagOutput = await extractor(t.tag_original, { pooling: 'mean', normalize: true });
        const tagVector = Array.from(tagOutput.data as Float32Array);
        
        const similarity = cosineSimilarity(userVector, tagVector);
        
        if (similarity > bestMatch.similarity) {
          bestMatch = { tag: t.tag_original, similarity, group: t.grupo_tematico };
        }
      }
    }

    // 4. Formula a resposta baseada na similaridade matemática
    let reply = '';
    
    if (bestMatch.similarity > 0.4) {
      reply = `Analisando seus vetores semânticos, encontrei uma forte conexão matemática com a tag "${bestMatch.tag}" do nosso banco (família: ${bestMatch.group || 'Diversos'}). O grau de similaridade vetorial entre o que você perguntou e esta tag é de ${(bestMatch.similarity * 100).toFixed(1)}%. Posso ajudar a pesquisar mais sobre ela no IBRAM.`;
    } else if (bestMatch.similarity > 0) {
      reply = `Sua mensagem gerou um vetor semântico isolado. A correlação mais próxima no meu banco de dados foi com "${bestMatch.tag}", mas a distância matemática é muito grande (${(bestMatch.similarity * 100).toFixed(1)}% de similaridade). Isso indica um tema inédito para o acervo.`;
    } else {
      reply = `O motor de Transformers locais calculou os embeddings da sua mensagem, mas meu banco interno de tags está vazio, então não pude calcular distâncias cruzadas. Você pode criar novas tags e eu passo a traçar as correlações!`;
    }

    // Responde com o texto e o cálculo matemático puro para a interface
    return NextResponse.json({
      success: true,
      reply,
      mathData: {
        similarity: bestMatch.similarity,
        matchedTag: bestMatch.tag
      }
    });

  } catch (error: any) {
    console.error('Erro no ChatBot AI:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
