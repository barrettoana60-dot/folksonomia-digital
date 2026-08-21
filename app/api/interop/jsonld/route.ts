import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Compatibilidade para consumidores que ainda usam esta URL. A representação
// passa a ser produzida pela mesma rota do cofre que serve o dossiê humano.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag');
  if (!tag) {
    return NextResponse.json({ success: false, error: 'Informe a tag para gerar sua representação JSON-LD.' }, { status: 400 });
  }
  const target = new URL('/api/interop/live-vault', url.origin);
  target.searchParams.set('tag', tag);
  const response = await fetch(target, {
    headers: { Accept: 'application/ld+json' },
    cache: 'no-store',
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': response.headers.get('content-type') || 'application/ld+json; charset=utf-8',
    },
  });
}
