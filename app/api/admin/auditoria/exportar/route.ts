import { NextRequest, NextResponse } from 'next/server';
import { recordExportAudit, getAuditExports, getAuditEvents } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const exportsList = await getAuditExports();
    return NextResponse.json(exportsList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao carregar exportações auditadas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      actor_id = 'adm_usuario_export',
      actor_role = 'ADMIN',
      format = 'JSON-LD',
      filter_criteria = {},
    } = body;

    // Buscar dados a exportar
    const { events } = await getAuditEvents({ limit: 500 });

    const exportDataset = {
      '@context': 'https://www.w3.org/ns/prov-o',
      domain: 'folksonomia-digital/interoperabilidade-cultural/v1',
      generatedAt: new Date().toISOString(),
      format,
      recordCount: events.length,
      records: events.map(e => ({
        eventId: e.event_id,
        entityId: e.entity_id,
        entityType: e.entity_type,
        eventType: e.event_type,
        version: e.new_version,
        digest: e.new_digest,
        eventDigest: e.event_digest,
        previousEventDigest: e.previous_event_digest,
        actor: { id: e.actor_id, role: e.actor_role },
        source: e.source,
        timestamp: e.timestamp,
        reason: e.reason,
      })),
    };

    const record = await recordExportAudit({
      actor_id,
      actor_role,
      format,
      record_count: events.length,
      dataset: exportDataset,
      filter_criteria,
    });

    return NextResponse.json({
      success: true,
      export_id: record.export_id,
      dataset_digest: record.dataset_digest,
      record_count: record.record_count,
      format: record.format,
      timestamp: record.timestamp,
      payload: exportDataset,
    });
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao exportar pacote auditado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro durante a exportação auditada' },
      { status: 500 }
    );
  }
}
