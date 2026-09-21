import { NextResponse } from 'next/server';
import { getAuditExternalSources } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sources = await getAuditExternalSources();
    return NextResponse.json(sources);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar fontes externas auditadas' }, { status: 500 });
  }
}
