import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Lazy-initialized Supabase client to prevent crash when env vars aren't loaded yet
let _client: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Environment variables not yet available, using fallback');
    // Use the known project values as fallback
    _client = createClient<Database>(
      'https://zungtspcixpxjpjlcwzy.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bmd0c3BjaXhweGpwamxjd3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzk0NDQsImV4cCI6MjA4NDM1NTQ0NH0.eNLT478rWBxK-G9sOhiHaWC3j-u_KzPWu07wEC4BQxA',
      {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  } else {
    _client = createClient<Database>(url, key, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return _client;
}

// Export as a proxy that lazily initializes
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
