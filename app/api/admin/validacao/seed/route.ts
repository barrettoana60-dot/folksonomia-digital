import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET() {
  try {
    const { data: obras, error: obrasError } = await supabaseAdmin.from('obras').select('id').limit(1);
    const obraId = obras && obras.length > 0 ? obras[0].id : null;

    const mockNucleos = [
      {
        tipo: 'tag',
        conteudo_original: 'Mamãe',
        conteudo_normalizado: 'mae',
        origem: 'ModernBERT_v1',
        status_validacao: 'em_analise',
        confianca: 0.85,
        novidade: 0.20,
        tensao: 0.10,
        ressonancia: 0.90,
        obra_id: obraId
      },
      {
        tipo: 'tag',
        conteudo_original: 'Séc. 18',
        conteudo_normalizado: 'seculo_xviii',
        origem: 'ModernBERT_v1',
        status_validacao: 'bruto',
        confianca: 0.95,
        novidade: 0.05,
        tensao: 0.0,
        ressonancia: 0.60,
        obra_id: obraId
      }
    ];

    const { error } = await supabaseAdmin.from('nucleos').insert(mockNucleos);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Dados inseridos' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
