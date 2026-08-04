// Import temporaneo: upsert massivo anagrafiche/preset da file Prometeo.
// Protetto da token statico; da rimuovere al termine dell'import.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN = "mp-import-2026-08-04-prometeo";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-import-token") !== TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { table, rows, onConflict, select } = body as {
      table: string;
      rows?: any[];
      onConflict?: string;
      select?: { columns: string; filter?: Record<string, string>; limit?: number; offset?: number };
    };

    if (select) {
      const off = select.offset ?? 0;
      const lim = select.limit ?? 1000;
      let q = supabase.from(table).select(select.columns).range(off, off + lim - 1);
      for (const [k, v] of Object.entries(select.filter ?? {})) q = q.eq(k, v);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error, count } = await supabase
      .from(table)
      .upsert(rows ?? [], { onConflict, ignoreDuplicates: false, count: "exact" });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
