import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook pubblico chiamato da Sibill: eventi 'document.updated' e 'flow.updated'
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIBILL_API_KEY = Deno.env.get("SIBILL_API_KEY") || "";

// Verifica firma X-Sibill-Signature: t=<ts>,v1=<hmac_sha256(ts + "." + body, api_key)>
async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!SIBILL_API_KEY) return true; // nessun segreto configurato: non blocchiamo
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

  // confronto a tempo costante
  return sigs.some((s) => {
    if (s.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const rawBody = await req.text();
    const valid = await verifySignature(rawBody, req.headers.get("X-Sibill-Signature"));
    if (!valid) {
      console.warn("sibill-webhook: firma non valida");
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    const payload = JSON.parse(rawBody || "{}");
    const event = payload?.event || payload?.type;
    const data = payload?.data || payload?.object || {};


    if (event === "document.updated") {
      const documentId = data?.id;
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      const flow = Array.isArray(data.flows) && data.flows.length ? data.flows[0] : null;

      await admin
        .from("fatture_sibill_sync")
        .update({
          document_status: data.status || null,
          delivery_status: data.delivery_status || null,
          sync_status: "sincronizzata",
          payment_status: flow?.payment_status || null,
          payment_method: flow?.payment_method || null,
          payment_date: flow?.payment_date || null,
          raw_response: data,
          last_sync_at: new Date().toISOString(),
        })
        .eq("sibill_document_id", documentId);
    } else if (event === "flow.updated") {
      const documentId = data?.document_id;
      if (!documentId) return new Response("ok", { headers: corsHeaders });

      await admin
        .from("fatture_sibill_sync")
        .update({
          payment_status: data.payment_status || null,
          payment_method: data.payment_method || null,
          payment_date: data.payment_date || null,
          sync_status: data.payment_status === "PAID" ? "incassata" : "sincronizzata",
          last_sync_at: new Date().toISOString(),
        })
        .eq("sibill_document_id", documentId);
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
