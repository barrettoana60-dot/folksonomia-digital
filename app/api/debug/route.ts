import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // try to insert a fake tag to see the exact error
    const tagPayload = {
      tag_original: 'debug-api-test',
      tag_normalizada: 'debug api test',
      grupo_tematico: 'Outros',
      status: 'em análise'
    };
    
    const { data, error } = await supabaseAdmin.from('tags').insert(tagPayload).select();

    return NextResponse.json({
      success: !error,
      data,
      error
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
