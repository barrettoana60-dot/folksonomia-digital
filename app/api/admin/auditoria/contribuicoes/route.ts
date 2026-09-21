import { NextRequest, NextResponse } from 'next/server';
import { getAuditContributions, recordContributionAudit } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getAuditContributions();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao listar contribuições:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar contribuições auditadas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actor_id, actor_role, tag_id, tag_label, object_id, content, source, reason, existing_id } = body;

    if (!actor_id || !tag_id || !content) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes (actor_id, tag_id, content)' }, { status: 400 });
    }

    const contribution = await recordContributionAudit({
      actor_id,
      actor_role: actor_role || 'USER',
      tag_id,
      tag_label: tag_label || tag_id,
      object_id,
      content,
      source: source || 'colaboracao_publica',
      reason,
      existing_id,
    });

    return NextResponse.json(contribution, { status: 201 });
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao registrar contribuição:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar contribuição auditada' }, { status: 500 });
  }
}
