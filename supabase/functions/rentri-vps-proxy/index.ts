import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VPS_BASE = Deno.env.get("RENTRI_VPS_URL") ?? "http://178.104.22.197:3000";

// Strip trailing slash and /invia-operazione if present (legacy env values)
function normalizeBaseUrl(raw: string): string {
  let url = raw.replace(/\/+$/, "");
  if (url.endsWith("/invia-operazione")) {
    url = url.replace(/\/invia-operazione$/, "");
  }
  return url;
}

const VPS_URL = normalizeBaseUrl(VPS_BASE);

const COMPANY_ALIAS: Record<string, string> = {
  global: "GLOBAL",
  globalreco: "GLOBALRECO",
  multy: "MULTY",
  multyproget: "MULTYPROGET",
  niyol: "NIYOL",
};

// Issuer (Codice Fiscale) per azienda — critico per JWT mTLS
const ISSUER_MAP: Record<string, string> = {
  global: "08934760961",
  globalreco: "08934760961",
  multy: "12347770013",
  multyproget: "12347770013",
  niyol: "09879800010",
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

/**
 * Determina la rotta VPS in base al tipo di operazione.
 * La VPS deve esporre endpoint specifici che corrispondono
 * agli endpoint RENTRI reali documentati nella guida.
 */
function getVpsRoute(tipoOperazione: string): string {
  switch (tipoOperazione) {
    case "VIDIMAZIONE":
    case "LOTTO":
      return "/vidimazione";
    case "LISTA_BLOCCHI":
      return "/vidimazione/blocchi";
    case "DETTAGLIO_FIR":
      return "/vidimazione/dettaglio";
    case "FIR_EMISSIONE":
      return "/fir/emissione";
    case "FIRMA_RICEZIONE":
      return "/fir/ricezione";
    case "REGISTRO":
      return "/invia-operazione";
    default:
      return "/invia-operazione";
  }
}

/**
 * Determina il metodo HTTP in base al tipo di operazione.
 */
function getHttpMethod(tipoOperazione: string): string {
  switch (tipoOperazione) {
    case "LISTA_BLOCCHI":
    case "DETTAGLIO_FIR":
      return "GET";
    default:
      return "POST";
  }
}

function buildUpstreamBody(
  cliente: string,
  tipoOperazione: string,
  payload: unknown
) {
  const normalizedCliente = cliente.trim().toLowerCase();
  const company = COMPANY_ALIAS[normalizedCliente] ?? normalizedCliente.toUpperCase();
  const issuer = ISSUER_MAP[normalizedCliente] ?? "";
  const safePayload = normalizePayload(payload);

  const quantityRaw = safePayload.quantita ?? safePayload.quantity ?? safePayload.qty;
  const quantity = typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
  const vidimazioneFields =
    Number.isFinite(quantity) && quantity > 0 ? { quantita: quantity, quantity } : {};

  return {
    cliente: normalizedCliente,
    company,
    issuer, // Codice Fiscale per firma JWT
    tipo_operazione: tipoOperazione,
    tipoOperazione: tipoOperazione,
    operation: tipoOperazione,
    // Campi specifici vidimazione dalla guida
    codice_blocco: safePayload.codice_blocco ?? safePayload.blocco ?? null,
    num_iscr_sito: safePayload.num_iscr_sito ?? null,
    progressivo: safePayload.progressivo ?? null,
    identificativo: safePayload.identificativo ?? issuer,
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
    const allowFallback =
      (normalizedTipoOperazione === "VIDIMAZIONE" || normalizedTipoOperazione === "LOTTO") &&
      candidates.length > 1;

    const vpsRoute = getVpsRoute(normalizedTipoOperazione);
    const httpMethod = getHttpMethod(normalizedTipoOperazione);

    const attempts: Array<{
      cliente: string;
      company: string;
      status: number;
      success: boolean;
      message?: string;
      route?: string;
    }> = [];

    let primaryStatus = 500;
    let primaryData: unknown = { error: "Nessuna risposta dal VPS" };
    let lastStatus = 500;
    let lastData: unknown = { error: "Nessuna risposta dal VPS" };

    for (let i = 0; i < candidates.length; i += 1) {
      const currentCliente = candidates[i];
      const upstreamBody = buildUpstreamBody(currentCliente, normalizedTipoOperazione, payload);
      const targetUrl = `${VPS_URL}${vpsRoute}`;

      console.log(
        `[rentri-vps] ${httpMethod} ${vpsRoute} — cliente=${upstreamBody.cliente}, company=${upstreamBody.company}, issuer=${upstreamBody.issuer}, tipo=${normalizedTipoOperazione}, codice_blocco=${upstreamBody.codice_blocco || "N/A"}`
      );

      let upstream: Response;

      if (httpMethod === "GET") {
        // Per GET, passa i parametri come query string
        const params = new URLSearchParams();
        params.set("cliente", upstreamBody.cliente);
        params.set("company", upstreamBody.company);
        params.set("issuer", upstreamBody.issuer);
        if (upstreamBody.codice_blocco) params.set("codice_blocco", String(upstreamBody.codice_blocco));
        if (upstreamBody.progressivo) params.set("progressivo", String(upstreamBody.progressivo));
        if (upstreamBody.identificativo) params.set("identificativo", String(upstreamBody.identificativo));

        upstream = await fetch(`${targetUrl}?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
      } else {
        upstream = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(upstreamBody),
        });
      }

      const text = await upstream.text();
      const data = parseResponseBody(text);
      const message = extractErrorMessage(data);

      attempts.push({
        cliente: String(upstreamBody.cliente),
        company: String(upstreamBody.company),
        status: upstream.status,
        success: upstream.ok,
        route: vpsRoute,
        ...(message ? { message } : {}),
      });

      lastStatus = upstream.status;
      lastData = data;
      if (i === 0) {
        primaryStatus = upstream.status;
        primaryData = data;
      }

      console.log(
        `[rentri-vps] Risposta VPS: status=${upstream.status}, cliente=${upstreamBody.cliente}, route=${vpsRoute}`
      );

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
      JSON.stringify({
        success: false,
        status: primaryStatus,
        data: primaryData,
        attempts,
        fallback_last_status: lastStatus,
        fallback_last_data: lastData,
      }),
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
