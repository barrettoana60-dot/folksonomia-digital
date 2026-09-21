import { NextRequest, NextResponse } from 'next/server';
import { getEntityProvenanceTimeline } from '@/lib/core/audit-engine';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID da entidade é obrigatório' }, { status: 400 });
    }

    const timeline = await getEntityProvenanceTimeline(id);
    return NextResponse.json(timeline);
  } catch (error: any) {
    console.error('[API Auditoria] Falha ao recuperar história da entidade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao recuperar proveniência da entidade' },
      { status: 500 }
    );
  }
}
