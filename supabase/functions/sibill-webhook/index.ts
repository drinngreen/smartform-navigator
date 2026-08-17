import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook pubblico chiamato da Sibill: eventi 'document.updated' e 'flow.updated'
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIBILL_API_KEY = Deno.env.get("SIBILL_API_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("SIBILL_WEBHOOK_SECRET") || "";

const CONTO_CREDITI = "20.10.001";
const CONTO_BANCA = "10.10.001";
const CONTO_CASSA = "10.10.002";

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verifica firma X-Sibill-Signature: t=<ts>,v1=<hmac_sha256(ts + "." + body, api_key)>
async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!SIBILL_API_KEY) return false;
  if (!header) return false;

  let ts = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2).map((s) => s?.trim());
    if (k === "t") ts = v;
    else if (k === "v1" && v) sigs.push(v.toLowerCase());
  }
  if (!ts || !sigs.length) return false;

  // tolleranza 5 minuti contro replay attack
  const skew = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(skew) || skew > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIBILL_API_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sigs.some((s) => safeEq(s, expected));
}

/** Header segreto condiviso (alternativa/aggiunta alla firma HMAC). */
function verifySharedSecret(req: Request): boolean {
  if (!WEBHOOK_SECRET) return false;
  const provided =
    req.headers.get("x-sibill-webhook-secret") ||
    req.headers.get("x-webhook-secret") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return !!provided && safeEq(provided, WEBHOOK_SECRET);
}

type AnyRec = Record<string, any>;

function pick(...vals: any[]) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return null;
}

/** Trova la riga di sync (e la fattura collegata) partendo dal document_id Sibill. */
async function findSync(admin: AnyRec, documentId: string) {
  const { data } = await admin
    .from("fatture_sibill_sync")
    .select("*")
    .eq("sibill_document_id", documentId)
    .maybeSingle();
  return data as AnyRec | null;
}

async function getContoId(admin: AnyRec, tenantId: string, codice: string, descrizione: string, tipo: string) {
  const { data } = await admin
    .from("erp_piano_conti")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("codice", codice)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created } = await admin
    .from("erp_piano_conti")
    .insert({ tenant_id: tenantId, codice, descrizione, tipo, livello: 3, is_movimentabile: true })
    .select("id")
    .single();
  return created?.id as string | undefined;
}

/** Scrive la registrazione di incasso in prima nota (idempotente per fattura). */
async function registraIncassoPrimaNota(
  admin: AnyRec,
  fattura: AnyRec,
  paymentDate: string | null,
  paymentMethod: string | null,
) {
  const { data: esistente } = await admin
    .from("erp_prima_nota")
    .select("id")
    .eq("documento_tipo", "incasso_fattura")
    .eq("documento_id", fattura.id)
    .maybeSingle();
  if (esistente?.id) return; // già registrata

  const data_registrazione = (paymentDate || new Date().toISOString()).slice(0, 10);
  const anno = Number(data_registrazione.slice(0, 4));

  let numero_registro = 1;
  const { data: num } = await admin.rpc("next_prima_nota_number", {
    p_tenant_id: fattura.tenant_id,
    p_anno: anno,
  });
  if (typeof num === "number") numero_registro = num;

  const { data: testata, error } = await admin
    .from("erp_prima_nota")
    .insert({
      tenant_id: fattura.tenant_id,
      data_registrazione,
      numero_registro,
      descrizione: `Incasso fattura ${fattura.numero_completo} — ${fattura.cliente_ragione_sociale ?? ""}`.trim(),
      documento_tipo: "incasso_fattura",
      documento_id: fattura.id,
    })
    .select("id")
    .single();
  if (error || !testata?.id) {
    console.error("prima nota insert error", error);
    return;
  }

  const isCassa = (paymentMethod || "").toUpperCase().includes("CONTANT") ||
    (paymentMethod || "").toUpperCase() === "CASH";
  const contoIncasso = await getContoId(
    admin,
    fattura.tenant_id,
    isCassa ? CONTO_CASSA : CONTO_BANCA,
    isCassa ? "Cassa" : "Banca c/c",
    "attivo",
  );
  const contoCrediti = await getContoId(
    admin,
    fattura.tenant_id,
    CONTO_CREDITI,
    "Crediti verso clienti",
    "attivo",
  );

  const importo = Number(fattura.totale || 0);
  const righe = [
    contoIncasso && {
      prima_nota_id: testata.id,
      conto_id: contoIncasso,
      segno: "D",
      importo,
      descrizione_riga: `Incasso ${paymentMethod || "bonifico"} fattura ${fattura.numero_completo}`,
    },
    contoCrediti && {
      prima_nota_id: testata.id,
      conto_id: contoCrediti,
      segno: "A",
      importo,
      descrizione_riga: `Chiusura credito ${fattura.cliente_ragione_sociale ?? ""}`.trim(),
    },
  ].filter(Boolean);

  if (righe.length) {
    const { error: rErr } = await admin.from("erp_prima_nota_righe").insert(righe);
    if (rErr) console.error("prima nota righe error", rErr);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const rawBody = await req.text();
    const valid =
      verifySharedSecret(req) ||
      (await verifySignature(rawBody, req.headers.get("X-Sibill-Signature")));
    if (!valid) {
      console.warn("sibill-webhook: autenticazione webhook fallita");
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: AnyRec = JSON.parse(rawBody || "{}");
    const event = pick(payload.event_type, payload.event, payload.type);
    const data: AnyRec = payload.data || payload.object || payload.document || {};
    const now = new Date().toISOString();

    if (event === "document.updated") {
      const documentId = String(pick(data.id, data.document_id, payload.document_id) || "");
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      const flow = Array.isArray(data.flows) && data.flows.length ? data.flows[0] : null;
      const deliveryStatus = String(pick(data.delivery_status, data.status_delivery, data.status) || "").toUpperCase();
      const failed = ["FAILED", "REJECTED", "ERROR", "SCARTATA", "NOT_DELIVERED"].includes(deliveryStatus);
      const delivered = ["DELIVERED", "CONSEGNATA", "SENT", "ACCEPTED"].includes(deliveryStatus);
      const errorTitle = pick(data.error_title, data.error?.title, failed ? "Invio non riuscito" : null);
      const errorDetail = pick(data.error_detail, data.error?.detail, data.error_message, data.message);

      await admin
        .from("fatture_sibill_sync")
        .update({
          document_status: pick(data.status, data.document_status),
          delivery_status: deliveryStatus || null,
          sync_status: failed ? "errore" : "sincronizzata",
          payment_status: pick(flow?.payment_status, data.payment_status),
          payment_method: pick(flow?.payment_method, data.payment_method),
          payment_date: pick(flow?.payment_date, data.payment_date),
          error_title: failed ? errorTitle : null,
          error_detail: failed ? errorDetail : null,
          raw_response: data,
          last_sync_at: now,
        })
        .eq("sibill_document_id", documentId);

      const sync = await findSync(admin, documentId);
      if (sync?.fattura_id) {
        if (delivered) {
          await admin
            .from("fatture")
            .update({ stato: "inviata", locked: true, inviata_at: now })
            .eq("id", sync.fattura_id);
        } else if (failed) {
          await admin
            .from("fatture")
            .update({ stato: "cortesia", locked: false })
            .eq("id", sync.fattura_id);
        }
      }
    } else if (event === "flow.updated") {
      const documentId = String(
        pick(data.document_id, data.document?.id, data.invoice_id, payload.document_id) || "",
      );
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      const paymentStatus = String(pick(data.payment_status, data.status) || "").toUpperCase();
      const paid = ["PAID", "PAGATA", "SETTLED"].includes(paymentStatus);
      const paymentMethod = pick(data.payment_method, data.method);
      const paymentDate = pick(data.payment_date, data.date, data.settled_at);

      await admin
        .from("fatture_sibill_sync")
        .update({
          payment_status: paymentStatus || null,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          sync_status: paid ? "incassata" : "sincronizzata",
          last_sync_at: now,
        })
        .eq("sibill_document_id", documentId);

      if (paid) {
        const sync = await findSync(admin, documentId);
        if (sync?.fattura_id) {
          const { data: fattura } = await admin
            .from("fatture")
            .select("id, tenant_id, numero_completo, cliente_ragione_sociale, totale")
            .eq("id", sync.fattura_id)
            .maybeSingle();
          if (fattura) {
            await registraIncassoPrimaNota(
              admin,
              fattura,
              paymentDate ? String(paymentDate).slice(0, 10) : null,
              paymentMethod ? String(paymentMethod) : null,
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sibill-webhook error", e);
    // Rispondiamo 200 per evitare retry infiniti su payload non gestiti
    return new Response(JSON.stringify({ received: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
