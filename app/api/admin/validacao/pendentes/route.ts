import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('nucleos')
      .select(`
        *,
        obra:obras(titulo)
      `)
      .in('status_validacao', ['bruto', 'em_analise'])
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching pending nucleos:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
