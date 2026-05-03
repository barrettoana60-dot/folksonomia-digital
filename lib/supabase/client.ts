import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://miicyiykbdsdhrjautpy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4ffRXusg_g6kRbFBFGARFg_dU3lLkSE';

// CRÍTICO: Next.js cacheia TODAS as chamadas fetch() em produção.
// Supabase JS usa fetch() internamente, então sem isso, todas as
// queries ao banco retornam dados velhos (cacheados).
const noStoreFetch: typeof fetch = (input, init) => {
  return fetch(input, { ...init, cache: 'no-store' });
};

// Client for public usage (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch }
});

// Client for Admin/Server usage (bypasses RLS)
// IMPORTANTE: Para operações de escrita funcionarem, você deve configurar a 
// SUPABASE_SERVICE_ROLE_KEY nas configurações do Vercel.
export const supabaseAdmin = createClient(
  supabaseUrl, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: { fetch: noStoreFetch }
  }
);

