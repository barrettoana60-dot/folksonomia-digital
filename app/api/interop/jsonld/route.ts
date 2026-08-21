import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Compatibilidade para consumidores que ainda usam esta URL. A representação
// passa a ser produzida pela mesma rota do cofre que serve o dossiê humano.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = new URL('/api/interop/live-vault', url.origin);
  target.searchParams.set('tag', url.searchParams.get('tag') || 'carranca');
  return NextResponse.redirect(target, 307);
}
