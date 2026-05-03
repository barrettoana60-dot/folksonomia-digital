import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking tags in Supabase...");
  const { data, error } = await supabase.from('tags').select('id, tag_original, tag_normalizada');
  if (error) {
    console.error("Error fetching tags:", error);
  } else {
    console.log(`Found ${data.length} tags:`);
    console.log(data);
  }
}

check();
