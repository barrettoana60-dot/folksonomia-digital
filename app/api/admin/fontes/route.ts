import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fontesPadrao = [
      {
        nome: 'Museu de Arte Religiosa e Tradicional (MART)',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo focado em arte sacra, cultura popular e tradições da Região dos Lagos.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'https://museudeartereligiosaetradicional.acervos.museus.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu Regional de Caeté',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo com foco em cultura popular, tradições locais, saberes e fazeres.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'https://museuregionaldecaete.acervos.museus.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu de Arqueologia de Itaipu',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo focado em cultura popular, território e arqueologia.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'http://museudearqueologiadeitaipu.museus.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu da Abolição',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo sobre memória afro-brasileira, escravidão e resistência.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'https://museudaabolicao.acervos.museus.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu do Diamante',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo focado em cultura material, mineração e técnicas.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'http://museudodiamante.acervos.museus.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu do Índio',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo focado em cultura indígena, etnografia e artesanato.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'https://tainacan.museudoindio.gov.br',
        ativo: true,
      },
      {
        nome: 'Museu da Pessoa',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo de histórias de vida, memória e depoimentos.',
        licenca: 'Creative Commons',
        url: 'https://acervo.museudapessoa.org',
        ativo: true,
      },
      {
        nome: 'Museu de Folclore Edison Carneiro',
        tipo: 'Tainacan / json-flat',
        descricao: 'Acervo do Centro Nacional de Folclore e Cultura Popular.',
        licenca: 'Domínio Público / Creative Commons',
        url: 'http://acervo.cnfcp.gov.br',
        ativo: true,
      }
    ];

    for (const fonte of fontesPadrao) {
      await supabaseAdmin
        .from('fontes_externas')
        .upsert(fonte, { onConflict: 'url' })
        .select();
    }

    const { data } = await supabaseAdmin
      .from('fontes_externas')
      .select('*')
      .order('nome');

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar fontes' }, { status: 500 });
  }
}
