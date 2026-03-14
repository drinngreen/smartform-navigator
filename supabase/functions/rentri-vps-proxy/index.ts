import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VPS_URL = Deno.env.get("RENTRI_VPS_URL") ?? "http://178.104.22.197:3000/invia-operazione";

const COMPANY_ALIAS: Record<string, string> = {
  global: "GLOBAL",
  globalreco: "GLOBALRECO",
  multy: "MULTY",
  multyproget: "MULTYPROGET",
  niyol: "NIYOL",
};

const CLIENTE_RETRY_MAP: Record<string, string[]> = {
  global: ["global", "globalreco"],
  globalreco: ["globalreco", "global"],
  multy: ["multy", "multyproget"],
  multyproget: ["multyproget", "multy"],
  niyol: ["niyol"],
};

function normalizePayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function parseResponseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const message = record.messaggio ?? record.message ?? record.error;
  return typeof message === "string" ? message : "";
}

function getClientCandidates(cliente: string): string[] {
  const normalized = cliente.trim().toLowerCase();
  const mapped = CLIENTE_RETRY_MAP[normalized] ?? [normalized];
  return [...new Set(mapped.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

function buildUpstreamBody(cliente: string, tipoOperazione: string, payload: unknown) {
  const normalizedCliente = cliente.trim().toLowerCase();
  const company = COMPANY_ALIAS[normalizedCliente] ?? normalizedCliente.toUpperCase();
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

    const normalizedCliente = cliente.trim().toLowerCase();
    const normalizedTipoOperazione = tipo_operazione.trim().toUpperCase();
    const candidates = getClientCandidates(normalizedCliente);
    const allowFallback = normalizedTipoOperazione === "VIDIMAZIONE" && candidates.length > 1;

    const attempts: Array<{
      cliente: string;
      company: string;
      status: number;
      success: boolean;
      message?: string;
    }> = [];

    let primaryStatus = 500;
    let primaryData: unknown = { error: "Nessuna risposta dal VPS" };
    let lastStatus = 500;
    let lastData: unknown = { error: "Nessuna risposta dal VPS" };

    for (let i = 0; i < candidates.length; i += 1) {
      const currentCliente = candidates[i];
      const upstreamBody = buildUpstreamBody(currentCliente, normalizedTipoOperazione, payload);

      console.log(
        `[rentri-vps] Invio a VPS: cliente=${upstreamBody.cliente}, company=${upstreamBody.company}, tipo=${normalizedTipoOperazione}, keys=${Object.keys(upstreamBody).join(",")}`
      );

      const upstream = await fetch(VPS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstreamBody),
      });

      const text = await upstream.text();
      const data = parseResponseBody(text);
      const message = extractErrorMessage(data);

      attempts.push({
        cliente: String(upstreamBody.cliente),
        company: String(upstreamBody.company),
        status: upstream.status,
        success: upstream.ok,
        ...(message ? { message } : {}),
      });

      lastStatus = upstream.status;
      lastData = data;
      if (i === 0) {
        primaryStatus = upstream.status;
        primaryData = data;
      }

      console.log(`[rentri-vps] Risposta VPS: status=${upstream.status}, cliente=${upstreamBody.cliente}`);

      if (upstream.ok) {
        return new Response(
          JSON.stringify({ success: true, status: upstream.status, data, attempts }),
          { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isLastCandidate = i === candidates.length - 1;
      if (upstream.status !== 500 || !allowFallback || isLastCandidate) {
        break;
      }

      console.warn(
        `[rentri-vps] fallback candidato successivo dopo errore 500: cliente=${upstreamBody.cliente}, message=${message || "n/a"}`
      );
    }

    return new Response(
      JSON.stringify({ success: false, status: lastStatus, data: lastData, attempts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
