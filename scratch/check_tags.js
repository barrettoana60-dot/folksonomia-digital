const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  const res = await fetch(`${url}/rest/v1/tags?select=id,tag_original,tag_normalizada`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log(`Found ${data.length} tags:`);
  console.log(data);
}

check();
