import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VPS_URL = Deno.env.get("RENTRI_VPS_URL") ?? "http://178.104.22.197:3000/invia-operazione";

const COMPANY_ALIAS: Record<string, string> = {
  global: "GLOBAL",
  multy: "MULTY",
  niyol: "NIYOL",
};

function normalizePayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function buildUpstreamBody(cliente: string, tipoOperazione: string, payload: unknown) {
  const normalizedCliente = cliente.trim().toLowerCase();
  const company = COMPANY_ALIAS[normalizedCliente] ?? normalizedCliente;
  const safePayload = normalizePayload(payload);

  const quantityRaw = safePayload.quantita ?? safePayload.quantity ?? safePayload.qty;
  const quantity = typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
  const vidimazioneFields = Number.isFinite(quantity) && quantity > 0
    ? { quantita: quantity, quantity }
    : {};

  return {
    cliente: normalizedCliente,
    company,
    tipo_operazione: tipoOperazione,
    tipoOperazione: tipoOperazione,
    operation: tipoOperazione,
    payload: safePayload,
    dati_inviati: safePayload,
    ...vidimazioneFields,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cliente, tipo_operazione, payload } = body;

    if (
      typeof cliente !== "string" ||
      typeof tipo_operazione !== "string" ||
      !cliente.trim() ||
      !tipo_operazione.trim()
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "cliente e tipo_operazione sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCliente = cliente.trim();
    const normalizedTipoOperazione = tipo_operazione.trim().toUpperCase();

    const upstreamBody = buildUpstreamBody(normalizedCliente, normalizedTipoOperazione, payload);

    console.log(
      `[rentri-vps] Invio a VPS: cliente=${normalizedCliente}, tipo=${normalizedTipoOperazione}, keys=${Object.keys(upstreamBody).join(",")}`
    );

    const upstream = await fetch(VPS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    console.log(`[rentri-vps] Risposta VPS: status=${upstream.status}`);

    const proxyHttpStatus = upstream.ok ? upstream.status : 200;

    return new Response(
      JSON.stringify({ success: upstream.ok, status: upstream.status, data }),
      { status: proxyHttpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rentri-vps] ERROR:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
