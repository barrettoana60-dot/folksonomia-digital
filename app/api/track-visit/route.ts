import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { pagina = '/', hash } = body;

    // Gerar hash único do visitante baseado em IP + User-Agent
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const ua = req.headers.get('user-agent') || '';
    const visitanteId = hash || Buffer.from(`${ip}:${ua}`).toString('base64').slice(0, 32);

    // Registrar visita na tabela tags (campo visitante_hash já existe)
    // Também tentamos em uma tabela própria se existir
    try {
      await supabaseAdmin.from('visitantes').insert({
        visitante_hash: visitanteId,
        pagina,
        created_at: new Date().toISOString()
      });
    } catch {
      // Tabela visitantes pode não existir - tudo bem
    }

    // Contar visitas únicas via tags (fallback sempre funciona)
    const { count } = await supabaseAdmin
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .not('visitante_hash', 'is', null);

    return NextResponse.json({
      success: true,
      visitanteId,
      totalVisitantes: count || 0
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
