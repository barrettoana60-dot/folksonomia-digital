import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint chamado via Cron/Schedule para processar as tags não-conclusivas
export async function POST(req: NextRequest) {
  try {
    // 1. Buscar até 10 tags pendentes com certeza < 95
    const { data: queue, error: queueError } = await supabaseAdmin
      .from('ml_training_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (queueError || !queue) {
      return NextResponse.json({ success: false, error: 'Erro ao acessar fila de treinamento' });
    }

    if (queue.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhuma tag pendente de treinamento.' });
    }

    const results = [];

    // 2. Iterar sobre as tags para auto-reflexão
    for (const item of queue) {
      // Marcar como "learning" para evitar execução dupla
      await supabaseAdmin.from('ml_training_queue').update({ status: 'learning' }).eq('id', item.id);

      // Simular busca em fontes profundas (Wikipedia API, etc)
      // O prompt pede para o Transformer tentar de novo, sendo mais leniente com deduções acadêmicas.
      const prompt = `Aja como o "Cérebro Semântico" no modo de TREINAMENTO PROFUNDO.
Anteriormente, o sistema avaliou a tag "${item.tag}" com apenas ${item.certeza_atual}% de certeza. O pensamento anterior foi: "${item.ultimo_pensamento}".

Instrução de Auto-Reflexão:
Busque correlações mais abstratas, sinônimos, referências históricas e arqueológicas brasileiras. Se for uma gíria ou regionalismo, tente encaixar na cultura popular.
Se ainda assim não tiver certeza, aumente a taxa de tentativas, mas seja honesto no seu cálculo matemático.

Siga o formato JSON rigoroso:
{
  "pensamento_interno": "Seu novo raciocínio...",
  "certeza_percentual": 95,
  "conexao_matematica": "Lógica...",
  "resposta_final": "Texto em português..."
}`;

      const seed = Math.floor(Math.random() * 1000000);
      let newCerteza = item.certeza_atual;
      let aiResponseObj = null;

      try {
        const res = await fetch(`https://text.pollinations.ai/openai?model=llama&seed=${seed}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: 'llama' }),
          signal: AbortSignal.timeout(45000)
        });

        if (res.ok) {
          let text = await res.text();
          try {
            const raw = JSON.parse(text);
            text = raw?.choices?.[0]?.message?.content || text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            aiResponseObj = JSON.parse(text);
          } catch (e) {
            console.error('Falha no parser JSON do treinamento', e);
          }
        }
      } catch (err) {
        console.error('Erro no fetch LLM', err);
      }

      // Processar resultado
      if (aiResponseObj && typeof aiResponseObj.certeza_percentual !== 'undefined') {
        newCerteza = Number(aiResponseObj.certeza_percentual);

        if (newCerteza >= 95) {
          // ALCANÇOU O OBJETIVO!
          // Salva no log de aprendizado (semantic_correlations / tag_learning_history)
          await supabaseAdmin.from('tag_learning_history').insert({
            tag_normalizada: item.tag.toLowerCase(),
            event_type: 'auto_training_success',
            event_details: { 
              certeza: newCerteza, 
              pensamento: aiResponseObj.pensamento_interno,
              conexao: aiResponseObj.conexao_matematica 
            }
          });

          // Atualiza a fila como resolvida
          await supabaseAdmin.from('ml_training_queue').update({
            certeza_atual: newCerteza,
            ultimo_pensamento: aiResponseObj.pensamento_interno,
            tentativas: item.tentativas + 1,
            status: 'resolved'
          }).eq('id', item.id);

          results.push({ tag: item.tag, status: 'resolvido', certeza: newCerteza });
        } else {
          // AINDA NÃO TEM CERTEZA - DEVOLVE PARA A FILA
          await supabaseAdmin.from('ml_training_queue').update({
            certeza_atual: newCerteza > item.certeza_atual ? newCerteza : item.certeza_atual,
            ultimo_pensamento: aiResponseObj.pensamento_interno,
            tentativas: item.tentativas + 1,
            status: 'pending' // Volta para pending
          }).eq('id', item.id);

          results.push({ tag: item.tag, status: 'pendente', certeza: newCerteza });
        }
      } else {
        // Falha técnica, devolve para a fila
        await supabaseAdmin.from('ml_training_queue').update({
          tentativas: item.tentativas + 1,
          status: 'pending'
        }).eq('id', item.id);
        
        results.push({ tag: item.tag, status: 'erro_llm' });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
