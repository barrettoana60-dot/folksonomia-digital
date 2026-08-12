import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('obras')
      .select('*')
      .eq('publicado', true)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ obras: data });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar obras.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await supabaseAdmin
      .from('obras')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ obra: data });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao criar obra.' }, { status: 500 });
  }
}
