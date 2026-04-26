import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://miicyiykbdsdhrjautpy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4ffRXusg_g6kRbFBFGARFg_dU3lLkSE';

// Client for public usage (respects RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
    }
  }
);

