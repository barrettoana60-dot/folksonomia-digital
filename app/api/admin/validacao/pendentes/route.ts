import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const EXPECTED_TOKENS = [
  crypto.createHash('sha256').update('nugep123-nugep-curator-salt-2026').digest('hex'),
  crypto.createHash('sha256').update('nugep 123-nugep-curator-salt-2026').digest('hex')
];

function checkAuthToken(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  return EXPECTED_TOKENS.includes(token);
}

export async function GET(req: Request) {
  try {
    if (!checkAuthToken(req)) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // 1. Carregar núcleos pendentes
    const { data: pending, error: errorPending } = await supabaseAdmin
      .from('nucleos')
      .select(`
        *,
        obra:obras(titulo)
      `)
      .in('status_validacao', ['bruto', 'em_analise'])
      .order('criado_em', { ascending: false });

    if (errorPending) throw errorPending;

    // 2. Carregar todos os núcleos validados/ativos para permitir ligações semânticas e referências
    const { data: all, error: errorAll } = await supabaseAdmin
      .from('nucleos')
      .select(`
        *,
        obra:obras(titulo)
      `)
      .order('conteudo_original', { ascending: true });

    if (errorAll) throw errorAll;

    return NextResponse.json({ 
      success: true, 
      data: pending || [],
      all: all || []
    });
  } catch (error: any) {
    console.error('Error fetching pending nucleos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
