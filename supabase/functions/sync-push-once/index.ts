import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Invio UNA TANTUM, avviato a mano da un amministratore. Nessun trigger, nessuna pianificazione.
// Legge le tabelle (sola lettura) e le spedisce al progetto di destinazione.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Ordine di dipendenza indicato nel file di sincronizzazione ("*" = tutte le tabelle con quel prefisso).
const ORDINE = [
  "tenants", "organizations", "profiles", "memberships", "user_roles", "cliente_*",
  "anagrafica_aziende_mp", "anagrafica_privati", "autorizzazioni_aziendali", "intermediari", "rubrica_contatti",
  "impianti", "impianti_accounts",
  "dragon_items", "dragon_warehouses", "dragon_lots", "dragon_lot_movements", "dragon_movement_allocations",
  "dragon_registers", "dragon_register_movements", "dragon_stock_movements", "dragon_production_sites", "dragon_causes",
  "dragon_documents", "dragon_inventory_adjustments", "dragon_transform_*", "dragon_*",
  "fir", "fir_forms", "fir_digitali", "fir_events", "fir_number_pool", "magazzino_deposito", "magazzino_giacenze",
  "giacenze_audit_log", "giacenze_applicazioni", "registro_generale", "registro_kg_privati", "register_movements",
  "privati_conferimenti", "ricevute_privati", "storico_ricevute_privati", "limiti_privati", "pagamenti_privati",
  "intermediazioni", "listini_intermediazione", "movimenti_intermediario", "erp_*", "fatture", "fatture_righe",
  "fatture_sibill_sync", "contratti_*", "ddt_forms", "noleggi", "appuntamenti_personale", "comunicazioni_log",
  "notifications", "rentri_firma_sessioni", "rentri_invii_privati", "rentri_invii_reali", "rentri_invii_registri",
  "rentri_registro_esiti", "rentri_operazioni", "rentri_operation_history", "rentri_logs",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Accesso richiesto" }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue && (ue as any).status >= 500) return json({ error: "TEMPORANEO: servizio non raggiungibile" }, 503);
    if (ue || !u?.user) return json({ error: "Sessione non valida" }, 401);
    const { data: role, error: re } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (re) return json({ error: "TEMPORANEO: verifica permessi non riuscita" }, 503);
    if (!role) return json({ error: "Solo gli amministratori possono avviare l'invio" }, 403);

    const dest = Deno.env.get("SYNC_DEST_URL");
    const key = Deno.env.get("SYNC_SHARED_KEY");
    if (!dest || !key) return json({ error: "Destinazione non configurata" }, 500);

    const body = await req.json().catch(() => ({}));

    if (body.action === "list") {
      const { data, error } = await admin.rpc("exec_sql_readonly", {
        query: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
      });
      if (error) throw new Error(error.message);
      const esistenti = new Set((data as any[]).map((t) => t.table_name as string));
      const out: string[] = [];
      for (const voce of ORDINE) {
        const match = voce.endsWith("*")
          ? [...esistenti].filter((t) => t.startsWith(voce.slice(0, -1))).sort()
          : esistenti.has(voce) ? [voce] : [];
        for (const t of match) if (!out.includes(t)) out.push(t);
      }
      return json({ tables: out });
    }

    if (body.action === "push") {
      const name = String(body.table || "");
      if (!/^[a-z0-9_]+$/.test(name)) return json({ error: "Nome tabella non valido" }, 400);
      const from = Math.max(0, Number(body.from) || 0);
      const size = Math.min(200, Math.max(1, Number(body.size) || 100));

      const { data: pkRows, error: pe } = await admin.rpc("exec_sql_readonly", {
        query: `SELECT a.attname AS col FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
                WHERE i.indrelid='public.${name}'::regclass AND i.indisprimary ORDER BY a.attnum`,
      });
      if (pe) throw new Error(pe.message);
      const pkCols = ((pkRows as any[]) || []).map((r) => r.col as string);
      if (!pkCols.length) return json({ error: `${name}: tabella senza chiave primaria, non inviabile` }, 400);

      let q = admin.from(name).select("*", from === 0 ? { count: "exact" } : undefined);
      for (const c of pkCols) q = q.order(c, { ascending: true });
      const { data, error, count } = await q.range(from, from + size - 1);
      if (error) {
        const m = String(error.message || "");
        if (m.includes("<html") || m.includes("<!DOCTYPE")) return json({ error: `TEMPORANEO: database non raggiungibile (${name})` }, 503);
        throw new Error(`${name}: ${m.slice(0, 300)}`);
      }
      const rows = (data || []) as Record<string, unknown>[];
      if (!rows.length) return json({ sent: 0, applied: 0, failed: [], done: true, total: count ?? null });

      const changes = rows.map((row, i) => ({
        id: from + i + 1,
        table: name,
        op: "INSERT",
        pk: pkCols, // la destinazione vuole l'elenco dei nomi delle colonne chiave
        row,
      }));
      const r = await fetch(dest, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Sync-Key": key },
        body: JSON.stringify({ changes }),
      });
      const txt = await r.text();
      let res: any = null;
      try { res = JSON.parse(txt); } catch { /* */ }
      if (!r.ok || !res) return json({ error: `TEMPORANEO: destinazione ha risposto ${r.status} ${txt.slice(0, 200)}` }, 503);
      return json({
        sent: rows.length,
        applied: (res.applied || []).length,
        failed: (res.failed || []).slice(0, 5),
        failedCount: (res.failed || []).length,
        done: rows.length < size,
        total: count ?? null,
      });
    }
    return json({ error: "Azione non valida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
