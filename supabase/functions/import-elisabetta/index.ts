// Edge function: importa dati Excel approvati da Elisabetta
// Inserisce FIR (impianto + conto_proprio) nel tenant Multyproget saltando i doppioni.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import data from "./data.json" with { type: "json" };
import data2 from "./data_2026_06_24.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MULTY_TENANT = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";
const compactCf = (s: any) => (s || "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
const routeTenant = (r: any): string => {
  const prod = compactCf(r.cf_produttore);
  const dest = compactCf(r.cf_destinatario);
  const trasp = compactCf(r.cf_trasportatore);
  if (prod === MULTY_CF || dest === MULTY_CF) return MULTY_TENANT;
  if (prod === NIYOL_CF || dest === NIYOL_CF || trasp === NIYOL_CF) return NIYOL_TENANT;
  return MULTY_TENANT;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supaUser.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Numeri già presenti su entrambi i tenant (evita duplicati cross-tenant)
    const { data: existing } = await admin
      .from("fir_forms")
      .select("numero_fir")
      .in("tenant_id", [MULTY_TENANT, NIYOL_TENANT])
      .not("numero_fir", "is", null);
    const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const existingSet = new Set((existing || []).map((r: any) => compact(r.numero_fir || "")));

    const allRows: any[] = [
      ...(data as any).impianto.map((r: any) => ({ ...r, _src: "impianto" })),
      ...(data as any).conto_proprio.map((r: any) => ({ ...r, _src: "conto_proprio" })),
      ...(data2 as any).fir_niyol.map((r: any) => ({ ...r, _src: "niyol_24_06", _force_tenant: NIYOL_TENANT })),
      ...(data2 as any).fir_conto_proprio.map((r: any) => ({ ...r, _src: "conto_proprio_24_06", _force_tenant: MULTY_TENANT })),
    ];

    const toInsert: any[] = [];
    let skipped = 0;
    let routedToNiyol = 0;
    const seen = new Set<string>();
    for (const r of allRows) {
      const c = compact(r.numero_fir);
      if (!c) continue;
      if (existingSet.has(c) || seen.has(c)) { skipped++; continue; }
      seen.add(c);
      const target = routeTenant(r);
      if (target === NIYOL_TENANT) routedToNiyol++;
      toInsert.push({
        user_id: uid,
        tenant_id: target,
        status: "bozza",
        numero_fir: r.numero_fir,
        form_data: {
          numero_fir: r.numero_fir,
          numero_formulario: r.numero_fir,
          produttore_denominazione: r.produttore,
          trasportatore_denominazione: r.trasportatore,
          destinatario_denominazione: r.destinatario,
          cer: r.cer,
          quantita_origine: r.qta_origine,
          quantita_destino: r.qta_destino,
          data_emissione: r.data_emi,
          produttore_codice_fiscale: r.cf_produttore,
          trasportatore_codice_fiscale: r.cf_trasportatore,
          destinatario_codice_fiscale: r.cf_destinatario,
          targa_automezzo: r.targa,
          _import_source: r._src,
          _import_target_tenant: target === NIYOL_TENANT ? "niyol" : "multy",
          _import_full: r.form_data,
        },
        // Colonne top-level per filtri cross-tenant (trasportatore, ecc.)
        produttore_denominazione: r.produttore,
        trasportatore_denominazione: r.trasportatore,
        destinatario_denominazione: r.destinatario,
        produttore_codice_fiscale: r.cf_produttore,
        trasportatore_codice_fiscale: r.cf_trasportatore,
        destinatario_codice_fiscale: r.cf_destinatario,
        allegati: [],
        deleted_by_user: false,
      });
    }


    // Insert in batch da 50
    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < toInsert.length; i += 50) {
      const chunk = toInsert.slice(i, i + 50);
      const { data: ins, error } = await admin.from("fir_forms").insert(chunk).select("id");
      if (error) {
        errors.push(`batch ${i}: ${error.message}`);
        // fallback uno per uno
        for (const row of chunk) {
          const { error: e2 } = await admin.from("fir_forms").insert(row);
          if (!e2) inserted++;
          else errors.push(`row ${row.numero_fir}: ${e2.message}`);
        }
      } else {
        inserted += ins?.length || 0;
      }
    }

    // Flag persistente
    await admin.from("app_reset_flags").upsert({
      scope: "elisabetta_import_approved",
      reset_token: new Date().toISOString(),
      note: `Approvato da ${uid}. Inseriti ${inserted}, saltati ${skipped}.`,
    });

    return new Response(
      JSON.stringify({ ok: true, inserted, skipped, routedToNiyol, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
