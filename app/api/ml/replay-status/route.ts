import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ml/replay-status
 * Retorna os dados do último ciclo de Replay de Memória Muscular (Sono REM).
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ml_execucoes')
      .select('metricas, created_at')
      .eq('tipo_execucao', 'semantic_memory_replay')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ trained: null, avgError: null, ts: null });
    }

    const m = data.metricas as any;
    return NextResponse.json({
      trained: m?.trained ?? 0,
      avgError: m?.avgError ?? 0,
      ts: m?.timestamp ?? data.created_at
    });
  } catch {
    return NextResponse.json({ trained: null, avgError: null, ts: null });
  }
}
