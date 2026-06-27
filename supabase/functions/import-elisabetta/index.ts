// Edge function: importa dati Excel approvati da Elisabetta
// Inserisce FIR (impianto + conto_proprio) nel tenant Multyproget saltando i doppioni.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import data from "./data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MULTY_TENANT = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

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

    // Numeri già presenti nel tenant
    const { data: existing } = await admin
      .from("fir_forms")
      .select("numero_fir")
      .eq("tenant_id", MULTY_TENANT)
      .not("numero_fir", "is", null);
    const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const existingSet = new Set((existing || []).map((r: any) => compact(r.numero_fir || "")));

    const allRows: any[] = [
      ...(data as any).impianto.map((r: any) => ({ ...r, _src: "impianto" })),
      ...(data as any).conto_proprio.map((r: any) => ({ ...r, _src: "conto_proprio" })),
    ];

    const toInsert: any[] = [];
    let skipped = 0;
    const seen = new Set<string>();
    for (const r of allRows) {
      const c = compact(r.numero_fir);
      if (!c) continue;
      if (existingSet.has(c) || seen.has(c)) { skipped++; continue; }
      seen.add(c);
      toInsert.push({
        user_id: uid,
        tenant_id: MULTY_TENANT,
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
          _import_full: r.form_data,
        },
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
      JSON.stringify({ ok: true, inserted, skipped, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
