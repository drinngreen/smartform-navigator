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

/**
 * MOCK MODE — simula la risposta di Sibill senza chiamare l'API reale.
 * Attivo se il body contiene `mock: true` oppure se il secret SIBILL_MOCK = "true".
 * Riproduce ESATTAMENTE le stesse dinamiche del flusso reale
 * (stessa scrittura su `fatture_sibill_sync`, stessi campi di risposta):
 * l'unica differenza è che la chiamata HTTP verso Sibill non parte.
 */
const MOCK_ENV = (Deno.env.get("SIBILL_MOCK") || "").toLowerCase() === "true";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cache in memoria dell'elenco documenti Sibill (per istanza della function)
const DOC_CACHE = new Map<string, { at: number; documents: any[]; scanned: number; partial: boolean }>();

const mockId = (prefix: string) =>
  `${prefix}_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json().catch(() => ({}));
    const mock = MOCK_ENV || body?.mock === true;

    if (!mock && (!API_KEY || !COMPANY_ID)) {
      return json(
        { error: { title: "Configurazione mancante", detail: "SIBILL_API_KEY / SIBILL_COMPANY_ID non configurati" } },
        400
      );
    }

    // Autenticazione utente
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: { title: "Non autorizzato", detail: "Sessione non valida" } }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const action = body?.action || "send_invoice";

    // Debug: GET grezzo verso Sibill (solo lettura, nessuna scrittura su DB)
    if (action === "raw_get") {
      const p = String(body?.path || "");
      if (!p.startsWith("/api/")) return json({ error: { title: "Path non valido", detail: p } }, 400);
      const res = await fetch(`${BASE_URL}${p.replace("{company}", COMPANY_ID || "")}`, { headers: sibillHeaders() });
      const txt = await res.text();
      return json({ ok: res.ok, status: res.status, body: txt.slice(0, 900000) });
    }

    // Debug: trova i primi documenti "/P" e mostra il grezzo lista + dettaglio
    if (action === "debug_p") {
      let cursor: string | null = null;
      const hits: any[] = [];
      for (let page = 0; page < 60 && hits.length < 3; page++) {
        const res = await fetch(
          `${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents?page_size=100` +
            (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
          { headers: sibillHeaders() }
        );
        if (!res.ok) return json({ error: await parseError(res) }, 200);
        const b = await res.json();
        for (const d of b?.data || []) if (/\/P$/i.test(String(d?.number || ""))) hits.push(d);
        if (!b?.page?.has_next_page) break;
        cursor = b.page.cursor;
        await sleep(200);
      }
      let detail: any = null;
      if (hits[0]?.id) {
        const dr = await fetch(`${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents/${hits[0].id}`, { headers: sibillHeaders() });
        detail = { status: dr.status, body: (await dr.text()).slice(0, 4000) };
      }
      return json({ ok: true, hits: hits.slice(0, 3), detail });
    }

    // Diagnostica: conta direzioni/tipi sui primi N documenti
    if (action === "scan_stats") {
      let cursor: string | null = null;
      const stats: Record<string, number> = {};
      const received: any[] = [];
      let scanned = 0;
      for (let page = 0; page < Number(body?.pages || 40); page++) {
        const res = await fetch(
          `${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents?page_size=100` +
            (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""),
          { headers: sibillHeaders() }
        );
        if (!res.ok) break;
        const b = await res.json();
        for (const d of b?.data || []) {
          scanned++;
          const k = `${d.direction}|${d.type}|e=${!!d.is_e_invoice}`;
          stats[k] = (stats[k] || 0) + 1;
          if (String(d.direction).toUpperCase() === "RECEIVED" && received.length < 3) received.push(d);
        }
        if (!b?.page?.has_next_page || !b?.page?.cursor) break;
        cursor = b.page.cursor;
        await sleep(200);
      }
      return json({ ok: true, scanned, stats, received });
    }

    if (action === "peek_documents") {
      const res = await fetch(`${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents?page_size=5`, { headers: sibillHeaders() });
      if (!res.ok) return json({ error: await parseError(res) }, 200);
      const b = await res.json();
      return json({ ok: true, sample: (b?.data || []).slice(0, 5) });
    }

    if (action === "ping") {

      if (mock) {
        return json({ ok: true, mock: true, env: "mock", base_url: BASE_URL, data: { data: [{ id: mockId("cmp"), name: "Azienda Mock" }] } });
      }
      const res = await fetch(`${BASE_URL}/api/v1/companies`, { headers: sibillHeaders() });
      if (!res.ok) {
        const e = await parseError(res);
        return json({ error: e }, 200);
      }
      return json({ ok: true, env: SIBILL_ENV, base_url: BASE_URL, data: await res.json() });
    }

    // Allineamento stati: rilegge da Sibill lo stato reale dei documenti già trasmessi
    // Elenco documenti presenti su Sibill (stato reale lato provider)
    if (action === "list_documents") {
      // `filter`: "P" (default) = solo le fatture con numero che termina con "/P", "all" = tutti i documenti
      const filter = String(body?.filter || "P").toUpperCase();
      if (mock) {
        return json({
          ok: true, mock: true, env: "mock", count: 1, scanned: 1,
          documents: [
            {
              id: mockId("doc"), number: "679/P", type: "INVOICE", status: "DELIVERED",
              delivery_status: null, delivery_date: new Date().toISOString(),
              gross: 3111.12, vat: 8.62, net: 3102.5, currency: "EUR",
              date: new Date().toISOString().slice(0, 10), direction: "ISSUED",
              counterpart: "FERMET SRL (mock)", is_e_invoice: true, file_name: null,
            },
          ],
        });
      }
      if (!API_KEY || !COMPANY_ID) {
        return json({ error: { title: "Configurazione mancante", detail: "SIBILL_API_KEY / SIBILL_COMPANY_ID non configurati" } }, 200);
      }

      const num = (v: any) => {
        const n = Number(v?.amount ?? v);
        return Number.isFinite(n) ? n : null;
      };


      // Cache in memoria (10 min): evita di ri-scaricare migliaia di documenti ad ogni apertura
      // Versione cache incrementata quando cambia il mapping dei campi economici.
      const cacheKey = `docs:v2:${filter}`;
      const cached = DOC_CACHE.get(cacheKey);
      if (cached && !body?.force && Date.now() - cached.at < 10 * 60 * 1000) {
        return json({ ok: true, env: SIBILL_ENV, cached: true, count: cached.documents.length, scanned: cached.scanned, partial: cached.partial, documents: cached.documents });
      }

      const out: any[] = [];
      let cursor: string | null = null;
      let scanned = 0;
      let partial = false;
      let warning: string | null = null;

      pages: for (let page = 0; page < 250; page++) {
        const url =
          `${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents?page_size=100` +
          (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

        // Throttling + retry con backoff sul rate limit di Sibill (429)
        let res: Response | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          res = await fetch(url, { headers: sibillHeaders() });
          if (res.status !== 429) break;
          await res.text().catch(() => "");
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 15000)
            : 1500 * Math.pow(2, attempt);
          if (attempt === 4) {
            partial = true;
            warning = "Limite di chiamate Sibill raggiunto: elenco parziale, riprova tra qualche minuto.";
            break pages;
          }
          await sleep(waitMs);
        }
        if (!res) break;
        if (!res.ok) {
          if (out.length) { partial = true; warning = "Errore Sibill durante lo scorrimento: elenco parziale."; break; }
          return json({ error: await parseError(res) }, 200);
        }

        const okBody = await res.json().catch(() => ({}));
        const list: any[] = Array.isArray(okBody?.data) ? okBody.data : [];
        scanned += list.length;
        for (const d of list) {
          const number = d?.number || null;
          if (filter === "P" && !/\/P$/i.test(String(number || ""))) continue;
          if (filter === "IN") {
            const isReceived = String(d?.direction || "").toUpperCase() === "RECEIVED";
            const isInvoice = !!d?.is_e_invoice || ["INVOICE", "CREDIT_NOTE"].includes(String(d?.type || "").toUpperCase());
            if (!isReceived || !isInvoice) continue;
          }
          const gross = num(d?.gross_amount);
          const vat = num(d?.vat_amount);
          out.push({
            id: d?.id || null,
            number,
            type: d?.type || null,
            status: d?.status || null,
            delivery_status: d?.delivery_status || null,
            delivery_date: d?.delivery_date || null,
            gross,
            vat,
            net: gross != null && vat != null ? Number((gross - vat).toFixed(2)) : gross,
            currency: d?.gross_amount?.currency || "EUR",
            date: d?.creation_date || d?.created_at || null,
            direction: d?.direction || null,
            counterpart:
              d?.counterpart?.company_name ||
              (Array.isArray(d?.reasons_and_remarks) && d.reasons_and_remarks.length
                ? d.reasons_and_remarks.join(" — ")
                : null) ||
              d?.notes ||
              null,
            notes: d?.notes || null,
            is_e_invoice: !!d?.is_e_invoice,
            file_name: d?.file_name || null,

          });
        }
        const pg = okBody?.page || {};
        if (!pg?.has_next_page || !pg?.cursor) break;
        cursor = pg.cursor as string;
        await sleep(250); // rallenta: rispetta il rate limit di Sibill
      }

      out.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

      // Arricchimento descrizione (Sibill non espone il counterpart nell'elenco):
      // 1) fatture emesse dal gestionale e sincronizzate su Sibill (match per document_id)
      // 2) match per numero documento con la tabella `fatture` (solo lettura)
      try {
        const docIds = out.map((d) => d.id).filter(Boolean);
        if (docIds.length) {
          const { data: syncRows } = await admin
            .from("fatture_sibill_sync")
            .select("sibill_document_id, fattura_id")
            .in("sibill_document_id", docIds.slice(0, 1000));
          const fattIds = (syncRows || []).map((r: any) => r.fattura_id).filter(Boolean);
          const byDocId = new Map<string, string>();
          if (fattIds.length) {
            const { data: fatt } = await admin
              .from("fatture")
              .select("id, cliente_ragione_sociale, numero_completo, imponibile")
              .in("id", fattIds);
            const fMap = new Map((fatt || []).map((f: any) => [f.id, f]));
            for (const r of (syncRows || []) as any[]) {
              const f = fMap.get(r.fattura_id);
              if (f?.cliente_ragione_sociale) byDocId.set(r.sibill_document_id, f.cliente_ragione_sociale);
            }
          }
          const numbers = out.map((d) => d.number).filter(Boolean).slice(0, 1000);
          const byNumber = new Map<string, string>();
          if (numbers.length) {
            const { data: fatt2 } = await admin
              .from("fatture")
              .select("numero_completo, cliente_ragione_sociale")
              .in("numero_completo", numbers);
            for (const f of (fatt2 || []) as any[]) {
              if (f.cliente_ragione_sociale) byNumber.set(f.numero_completo, f.cliente_ragione_sociale);
            }
          }
          for (const d of out) {
            if (!d.counterpart) d.counterpart = byDocId.get(d.id) || byNumber.get(d.number) || null;
          }
        }
      } catch (_e) { /* enrichment best-effort */ }

      DOC_CACHE.set(cacheKey, { at: Date.now(), documents: out, scanned, partial });
      return json({ ok: true, env: SIBILL_ENV, count: out.length, scanned, partial, warning, documents: out });

    }


    if (action === "refresh_status") {

      const ids: string[] = Array.isArray(body?.fattura_ids) ? body.fattura_ids : [];
      const { data: rows } = await admin
        .from("fatture_sibill_sync")
        .select("*")
        .in("fattura_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      const results: any[] = [];
      for (const r of (rows || []) as any[]) {
        const docId: string | null = r.sibill_document_id;
        const isMock = !docId || docId.includes("_mock_");
        if (isMock) {
          results.push({ fattura_id: r.fattura_id, mock: true, document_status: r.document_status, delivery_status: r.delivery_status });
          continue;
        }
        if (mock || !API_KEY || !COMPANY_ID) {
          results.push({ fattura_id: r.fattura_id, skipped: true });
          continue;
        }
        try {
          const res = await fetch(`${BASE_URL}/api/v1/companies/${COMPANY_ID}/documents/${docId}`, {
            headers: sibillHeaders(),
          });
          if (!res.ok) {
            const err = await parseError(res);
            results.push({ fattura_id: r.fattura_id, error: err });
            continue;
          }
          const okBody = await res.json().catch(() => ({}));
          const doc = okBody?.data || okBody;
          await admin.from("fatture_sibill_sync").update({
            document_status: doc?.status ?? r.document_status,
            delivery_status: doc?.delivery_status ?? r.delivery_status,
            payment_status: doc?.payment_status ?? r.payment_status,
            raw_response: doc || r.raw_response,
            last_sync_at: new Date().toISOString(),
          }).eq("fattura_id", r.fattura_id);
          results.push({
            fattura_id: r.fattura_id,
            document_status: doc?.status || null,
            delivery_status: doc?.delivery_status || null,
          });
        } catch (e: any) {
          results.push({ fattura_id: r.fattura_id, error: { title: "Errore rete", detail: String(e?.message || e) } });
        }
      }
      return json({ ok: true, env: mock ? "mock" : SIBILL_ENV, checked: results.length, results });
    }

    if (action !== "send_invoice") {
      return json({ error: { title: "Azione non valida", detail: String(action) } }, 400);
    }


    const { fattura_id, tenant_id, xml, counterpart } = body || {};
    if (!fattura_id || !xml) {
      return json({ error: { title: "Dati mancanti", detail: "fattura_id e xml sono obbligatori" } }, 400);
    }

    if (mock) {
      // Validazioni minime equivalenti a quelle che farebbe Sibill
      if (typeof xml !== "string" || !xml.includes("FatturaElettronica")) {
        const err = { title: "XML non valido", detail: "Il documento non sembra una FatturaPA valida (mock)" };
        await admin.from("fatture_sibill_sync").upsert(
          {
            fattura_id,
            tenant_id: tenant_id || null,
            sync_status: "errore",
            error_title: err.title,
            error_detail: err.detail,
            raw_response: { mock: true },
            last_sync_at: new Date().toISOString(),
          },
          { onConflict: "fattura_id" }
        );
        return json({ error: err }, 200);
      }

      const documentId = mockId("doc");
      const counterpartId = counterpart ? mockId("cp") : null;
      const doc = {
        id: documentId,
        status: "ISSUED",
        delivery_status: "SENT",
        format: "FPA12",
        mock: true,
        created_at: new Date().toISOString(),
      };

      await admin.from("fatture_sibill_sync").upsert(
        {
          fattura_id,
          tenant_id: tenant_id || null,
          sibill_document_id: documentId,
          sync_status: "sincronizzata",
          document_status: doc.status,
          delivery_status: doc.delivery_status,
          error_title: null,
          error_detail: null,
          raw_response: doc,
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "fattura_id" }
      );

      return json({ ok: true, mock: true, document_id: documentId, counterpart_id: counterpartId, data: doc });
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
