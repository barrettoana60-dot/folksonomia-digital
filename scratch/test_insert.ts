// script to test inserting a tag exactly like the API does
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert into nucleos...');
  const nucleoPayload = {
    tipo: 'tag',
    conteudo_original: 'teste-debug-123',
    conteudo_normalizado: 'teste debug 123',
    origem: 'interface_publica',
    status_validacao: 'bruto',
    confianca: 50,
    novidade: 50,
    tensao: 50,
    ressonancia: 50
  };

  const { data: nucleo, error: nucleoError } = await supabaseAdmin
    .from('nucleos')
    .insert(nucleoPayload)
    .select()
    .single();

  if (nucleoError) {
    console.error('NUCLEO ERROR:', nucleoError);
    return;
  }

  console.log('Nucleo created:', nucleo.id);

  console.log('Testing insert into tags...');
  const tagPayload = {
    nucleo_id: nucleo.id,
    tag_original: 'teste-debug-123',
    tag_normalizada: 'teste debug 123',
    grupo_tematico: 'Outros',
    status: 'em análise'
  };

  const { data: tag, error: tagError } = await supabaseAdmin
    .from('tags')
    .insert(tagPayload)
    .select();

  if (tagError) {
    console.error('TAG ERROR:', tagError);
  } else {
    console.log('Tag created:', tag);
  }
}

testInsert();
