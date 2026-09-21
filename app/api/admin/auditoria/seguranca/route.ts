import { NextRequest, NextResponse } from 'next/server';
import { getSecurityLogs, recordSecurityEvent } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const event_type = searchParams.get('event_type') || undefined;
    const actor_id = searchParams.get('actor_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const logs = await getSecurityLogs({ event_type, actor_id, limit });
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao recuperar logs de segurança:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar logs de segurança' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, actor_id, actor_role, ip_address, user_agent, details } = body;

    if (!event_type || !actor_id || !actor_role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes para registro de segurança' },
        { status: 400 }
      );
    }

    const entry = await recordSecurityEvent({
      event_type,
      actor_id,
      actor_role,
      ip_address,
      user_agent,
      details,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao gravar log de segurança:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gravar log de segurança' },
      { status: 500 }
    );
  }
}
