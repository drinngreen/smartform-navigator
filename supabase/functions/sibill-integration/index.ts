import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Ambienti Sibill (da docs.sibill.com/api-reference)
//  - Development: https://integration.dev.sibill.com
//  - Production:  https://integration.sibill.com
const SIBILL_ENV = (Deno.env.get("SIBILL_ENV") || "production").toLowerCase();
const BASE_URL = SIBILL_ENV.startsWith("dev")
  ? "https://integration.dev.sibill.com"
  : "https://integration.sibill.com";

const API_KEY = Deno.env.get("SIBILL_API_KEY");
const COMPANY_ID = Deno.env.get("SIBILL_COMPANY_ID");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type SibillError = { status: number; title: string; detail: string; raw: unknown };

async function parseError(res: Response): Promise<SibillError> {
  let raw: any = null;
  let text = "";
  try {
    text = await res.text();
    raw = JSON.parse(text);
  } catch {
    raw = text;
  }
  const first = Array.isArray(raw?.errors) ? raw.errors[0] : raw?.errors || raw?.error || null;
  const title = first?.title || raw?.title || `Errore Sibill ${res.status}`;
  const detail =
    first?.detail ||
    raw?.detail ||
    raw?.message ||
    (typeof raw === "string" ? raw.slice(0, 500) : "") ||
    (res.status === 401
      ? "Chiave API Sibill non valida o mancante"
      : res.status === 422
      ? "Dati fattura non processabili da Sibill"
      : "Richiesta rifiutata da Sibill");
  return { status: res.status, title, detail, raw };
}

function sibillHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

/** Cerca il counterpart su Sibill per P.IVA / CF, altrimenti lo crea. */
async function ensureCounterpart(admin: any, cp: any, tenantId: string | null) {
  const vat = (cp?.vat_number || "").replace(/\s/g, "");
  const tax = (cp?.tax_number || "").replace(/\s/g, "");

  // 1) cache locale
  if (vat || tax) {
    const { data: cached } = await admin
      .from("sibill_counterparts")
      .select("sibill_counterpart_id")
      .or([vat ? `vat_number.eq.${vat}` : null, tax ? `tax_number.eq.${tax}` : null].filter(Boolean).join(","))
      .limit(1)
      .maybeSingle();
    if (cached?.sibill_counterpart_id) return cached.sibill_counterpart_id as string;
  }

  // 2) lista su Sibill
  try {
    const listRes = await fetch(
      `${BASE_URL}/api/v1/companies/${COMPANY_ID}/counterparts?limit=100`,
      { headers: sibillHeaders() }
    );
    if (listRes.ok) {
      const listBody = await listRes.json();
      const items = listBody?.data || [];
      const found = items.find(
        (c: any) =>
          (vat && (c.vat_number || "").replace(/\s/g, "") === vat) ||
          (tax && (c.tax_number || "").replace(/\s/g, "") === tax)
      );
      if (found?.id) {
        await admin.from("sibill_counterparts").insert({
          tenant_id: tenantId,
          company_name: found.company_name || cp.company_name,
          vat_number: found.vat_number || vat || null,
          tax_number: found.tax_number || tax || null,
          sibill_counterpart_id: found.id,
          raw_payload: found,
        });
        return found.id as string;
      }
    }
  } catch (_) {
    // ignora: si prova comunque la creazione
  }

  // 3) creazione
  const payload = {
    company_name: cp.company_name || null,
    vat_number: vat || null,
    tax_number: tax || null,
    address: cp.address || null,
    city: cp.city || null,
    postal_code: cp.postal_code || null,
    province_code: cp.province_code || null,
    country: cp.country || "IT",
    destination_code: cp.destination_code || null,
    identity_type: cp.identity_type || "COMPANY",
  };
  const res = await fetch(`${BASE_URL}/api/v1/companies/${COMPANY_ID}/counterparts`, {
    method: "POST",
    headers: sibillHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseError(res);
  const body = await res.json();
  const id = body?.data?.id;
  if (id) {
    await admin.from("sibill_counterparts").insert({
      tenant_id: tenantId,
      azienda_id: cp.azienda_id || null,
      company_name: payload.company_name,
      vat_number: payload.vat_number,
      tax_number: payload.tax_number,
      sibill_counterpart_id: id,
      raw_payload: body?.data,
    });
  }
  return id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!API_KEY || !COMPANY_ID) {
      return json(
        { error: { title: "Configurazione mancante", detail: "SIBILL_API_KEY / SIBILL_COMPANY_ID non configurati" } },
        400
      );
    }

    // Autenticazione utente
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: { title: "Non autorizzato", detail: "Sessione non valida" } }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "send_invoice";



    if (action === "ping") {
      const res = await fetch(`${BASE_URL}/api/v1/companies`, { headers: sibillHeaders() });
      if (!res.ok) {
        const e = await parseError(res);
        return json({ error: e }, 200);
      }
      return json({ ok: true, env: SIBILL_ENV, base_url: BASE_URL, data: await res.json() });
    }

    if (action !== "send_invoice") {
      return json({ error: { title: "Azione non valida", detail: String(action) } }, 400);
    }

    const { fattura_id, tenant_id, xml, counterpart } = body || {};
    if (!fattura_id || !xml) {
      return json({ error: { title: "Dati mancanti", detail: "fattura_id e xml sono obbligatori" } }, 400);
    }

    let counterpartId: string | null = null;
    try {
      if (counterpart) counterpartId = await ensureCounterpart(admin, counterpart, tenant_id || null);
    } catch (e: any) {
      const err = e?.title ? e : { title: "Errore anagrafica Sibill", detail: String(e?.message || e) };
      await admin.from("fatture_sibill_sync").upsert(
        {
          fattura_id,
          tenant_id: tenant_id || null,
          sync_status: "errore",
          error_title: err.title,
          error_detail: err.detail,
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "fattura_id" }
      );
      return json({ error: err }, 200);
    }

    // Invio fattura (XML FatturaPA) ed emissione immediata
    const url = `${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents/invoice?issue=true`;
    const res = await fetch(url, {
      method: "POST",
      headers: sibillHeaders({ "Content-Type": "application/xml" }),
      body: xml,
    });

    if (!res.ok) {
      const err = await parseError(res);
      await admin.from("fatture_sibill_sync").upsert(
        {
          fattura_id,
          tenant_id: tenant_id || null,
          sync_status: "errore",
          error_title: err.title,
          error_detail: err.detail,
          raw_response: typeof err.raw === "object" ? err.raw : { raw: String(err.raw) },
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "fattura_id" }
      );
      return json({ error: err }, 200);
    }

    const okBody = await res.json().catch(() => ({}));
    const doc = okBody?.data || okBody;
    const documentId = doc?.id || null;

    await admin.from("fatture_sibill_sync").upsert(
      {
        fattura_id,
        tenant_id: tenant_id || null,
        sibill_document_id: documentId,
        sync_status: "sincronizzata",
        document_status: doc?.status || null,
        delivery_status: doc?.delivery_status || null,
        error_title: null,
        error_detail: null,
        raw_response: doc || null,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "fattura_id" }
    );

    return json({ ok: true, document_id: documentId, counterpart_id: counterpartId, data: doc });
  } catch (e: any) {
    console.error("sibill-integration error", e);
    return json({ error: { title: "Errore interno", detail: String(e?.message || e) } }, 500);
  }
});
