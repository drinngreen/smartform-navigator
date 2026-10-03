import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read-only full export, admin only. Never writes data.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Accesso richiesto" }, 401);
    const admin = createClient(url, service);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "Sessione non valida" }, 401);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Solo gli amministratori possono esportare tutti i dati" }, 403);

    const body = await req.json().catch(() => ({}));
    if (body.action === "list") {
      const { data, error } = await admin.rpc("exec_sql_readonly", {
        query: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
      });
      if (error) throw new Error(error.message);
      return json({ tables: (data as any[]).map((t) => t.table_name) });
    }
    if (body.action === "table") {
      const name = String(body.table || "");
      if (!/^[a-z0-9_]+$/i.test(name)) return json({ error: "Nome tabella non valido" }, 400);
      const from = Math.max(0, Number(body.from) || 0);
      const size = Math.min(1000, Math.max(1, Number(body.size) || 200));
      const { data, error } = await admin.from(name).select("*").range(from, from + size - 1);
      if (error) throw new Error(`${name}: ${error.message}`);
      return json({ rows: data || [], done: (data || []).length < size });
    }
    return json({ error: "Azione non valida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
