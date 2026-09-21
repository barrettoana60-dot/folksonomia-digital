import { NextRequest, NextResponse } from 'next/server';
import { verifySystemIntegrity } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const result = await verifySystemIntegrity();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao verificar integridade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro durante a verificação de integridade' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const result = await verifySystemIntegrity();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao verificar integridade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro durante a verificação de integridade' },
      { status: 500 }
    );
  }
}
