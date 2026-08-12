import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const fontes = [
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
  }
];

async function seed() {
  for (const fonte of fontes) {
    const { error } = await supabaseAdmin
      .from('fontes_externas')
      .upsert({ ...fonte }, { onConflict: 'url' })
      .select();
      
    if (error) {
      console.error('Error inserting', fonte.nome, error);
    } else {
      console.log('Upserted', fonte.nome);
    }
  }
}

seed();
