import { NextRequest, NextResponse } from 'next/server';
import { getAuditEvents, recordAuditEvent } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity_id = searchParams.get('entity_id') || undefined;
    const actor_id = searchParams.get('actor_id') || undefined;
    const event_type = searchParams.get('event_type') || undefined;
    const source = searchParams.get('source') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await getAuditEvents({
      entity_id,
      actor_id,
      event_type,
      source,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API Auditoria] Falha ao consultar eventos:', error);
    return NextResponse.json(
      { error: 'Erro ao consultar eventos de auditoria' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      entity_id,
      entity_type,
      event_type,
      actor_id,
      actor_role,
      previous_version,
      new_version,
      previous_digest,
      new_digest,
      source,
      reason,
      metadata,
      stateTransition,
    } = body;

    if (!entity_id || !entity_type || !event_type || !actor_id || !actor_role || !new_digest) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes para registro de auditoria' },
        { status: 400 }
      );
    }

    const event = await recordAuditEvent({
      entity_id,
      entity_type,
      event_type,
      actor_id,
      actor_role,
      previous_version: previous_version ?? 0,
      new_version: new_version ?? 1,
      previous_digest: previous_digest ?? null,
      new_digest,
      source: source || 'sistema',
      reason,
      metadata: metadata || {},
      stateTransition,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao registrar evento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar evento de auditoria' },
      { status: 400 }
    );
  }
}
