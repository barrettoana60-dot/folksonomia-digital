import { NextRequest, NextResponse } from 'next/server';
import { getAuditEvents, computeMerkleRoot } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const { events } = await getAuditEvents({ startDate, endDate, limit: 10000 });
    const digests = events.map(e => e.event_digest);
    const root = computeMerkleRoot(digests);

    return NextResponse.json({
      merkleRoot: root,
      eventCount: events.length,
      firstEventDigest: digests[0] || null,
      lastEventDigest: digests[digests.length - 1] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao calcular Merkle Root:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao calcular Merkle Root' },
      { status: 500 }
    );
  }
}
