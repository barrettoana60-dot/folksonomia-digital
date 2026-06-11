import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { weights1, bias1, weights2, bias2 } = payload;

    if (!weights1 || !bias1 || !weights2 || bias2 === undefined) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('ml_execucoes')
      .insert({
        tipo_execucao: 'cognitive_weights',
        resumo: 'Pesos calibrados manualmente via painel administrativo',
        status: 'active',
        metricas: { weights1, bias1, weights2, bias2 }
      });

    if (error) {
      console.error('[SaveWeightsAPI] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[SaveWeightsAPI] Error:', e);
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 });
  }
}
