import { NextResponse } from 'next/server';
import { getAuditRelations } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const relations = await getAuditRelations();
    return NextResponse.json(relations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar relações auditadas' }, { status: 500 });
  }
}
