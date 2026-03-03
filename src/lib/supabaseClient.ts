import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { safeLocalStorage } from '@/lib/safeStorage';

let _client: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL || 'https://zungtspcixpxjpjlcwzy.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bmd0c3BjaXhweGpwamxjd3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzk0NDQsImV4cCI6MjA4NDM1NTQ0NH0.eNLT478rWBxK-G9sOhiHaWC3j-u_KzPWu07wEC4BQxA';

  _client = createClient<Database>(url, key, {
    auth: {
      storage: safeLocalStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
