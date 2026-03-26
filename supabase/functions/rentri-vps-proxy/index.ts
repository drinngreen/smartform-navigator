import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VPS_BASE = Deno.env.get("RENTRI_VPS_URL") ?? "http://195.201.253.217:3000";

function normalizeBaseUrl(raw: string): string {
  let url = raw.replace(/\/+$/, "");
  if (url.endsWith("/invia-operazione")) url = url.replace(/\/invia-operazione$/, "");
  return url;
}

const VPS_URL = normalizeBaseUrl(VPS_BASE);

/* ── Mappature tenant ── */

const COMPANY_ALIAS: Record<string, string> = {
  global: "GLOBAL", globalreco: "GLOBALRECO",
  multy: "MULTY", multyproget: "MULTYPROGET",
  niyol: "NIYOL",
};

const ISSUER_MAP: Record<string, string> = {
  global: "08934760961", globalreco: "08934760961",
  multy: "12347770013", multyproget: "12347770013",
  niyol: "09879800010",
};

const UNIT_ID_MAP: Record<string, string> = {
  global: "OP2501RMK022692-TO0001",
  multy: "OP2501XMQ021914-TO0001",
  niyol: "OP2501SXW021767-TO0001",
};

const REGISTRY_ID_MAP: Record<string, string | null> = {
  global: "R6QSWHZ6HJV",
  multy: "RQEL39R7NS0",
  niyol: "01-250210-00079463",
};

const BLOCK_CODES: Record<string, { code: string; sito: string | null }[]> = {
  global: [
    { code: "FMGWB", sito: "TO0001" }, { code: "SKKZR", sito: "TO0001" },
    { code: "XNQLK", sito: "MI0001" }, { code: "GPFMK", sito: null },
  ],
  multy: [
    { code: "ZRZXR", sito: "TO0001" }, { code: "FRVKM", sito: null },
  ],
  niyol: [
    { code: "BPJMG", sito: "TO0001" }, { code: "DGXYQ", sito: null },
  ],
};

const CLIENTE_RETRY_MAP: Record<string, string[]> = {
  global: ["global", "globalreco"], globalreco: ["globalreco", "global"],
  multy: ["multy", "multyproget"], multyproget: ["multyproget", "multy"],
  niyol: ["niyol"],
};

/* ── Helpers ── */

function norm(cliente: string): string { return cliente.trim().toLowerCase(); }

function normalizePayload(p: unknown): Record<string, unknown> {
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function parseBody(text: string): unknown {
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
}

function extractMsg(d: unknown): string {
  if (!d || typeof d !== "object") return "";
  const r = d as Record<string, unknown>;
  const m = r.messaggio ?? r.message ?? r.error;
  return typeof m === "string" ? m : "";
}

function getCandidates(c: string): string[] {
  const n = norm(c);
  return [...new Set((CLIENTE_RETRY_MAP[n] ?? [n]).map(norm).filter(Boolean))];
}

/* ── Routing: mappa tipo_operazione → path + method RENTRI ── */

interface RouteInfo {
  method: "GET" | "POST";
  path: string;
}

function resolveRoute(
  tipo: string,
  cliente: string,
  payload: Record<string, unknown>
): RouteInfo {
  const issuer = ISSUER_MAP[norm(cliente)] ?? "";
  const registryId = REGISTRY_ID_MAP[norm(cliente)] ?? "";
  const blocks = BLOCK_CODES[norm(cliente)] ?? [];
  const codiceBlocco = String(payload.codice_blocco ?? payload.blocco ?? blocks[0]?.code ?? "");
  const progressivo = String(payload.progressivo ?? "");
  const uuidFir = String(payload.uuid_fir ?? "");
  const txnId = String(payload.transazione_id ?? "");
  const numeroFir = String(payload.numero_fir ?? "");

  switch (tipo) {
    case "LISTA_BLOCCHI":
      return { method: "GET", path: `/vidimazione-formulari/v1.0?identificativo=${issuer}` };

    case "VIDIMAZIONE":
      return { method: "POST", path: `/vidimazione-formulari/v1.0/${codiceBlocco}` };

    case "LOTTO":
      return { method: "GET", path: `/vidimazione-formulari/v1.0/${codiceBlocco}/${progressivo}` };

    case "LOTTO_PDF":
      return { method: "GET", path: `/vidimazione-formulari/v1.0/${codiceBlocco}/${progressivo}/pdf` };

    case "FIR_EMISSIONE":
      return { method: "POST", path: `/formulari/v1.0` };

    case "DETTAGLIO_FIR":
      return { method: "GET", path: `/formulari/v1.0/${uuidFir}` };

    case "RICERCA_FIR":
      return {
        method: "GET",
        path: `/formulari/v1.0?numeroFir=${encodeURIComponent(numeroFir)}&identificativo_soggetto=${issuer}`,
      };

    case "REGISTRO":
      return { method: "POST", path: `/dati-registri/v1.0/operatore/${registryId}/movimenti` };

    case "RICERCA_MOVIMENTI": {
      const da = String(payload.data_da ?? "");
      const a = String(payload.data_a ?? "");
      return {
        method: "GET",
        path: `/dati-registri/v1.0/operatore/${registryId}/movimenti?dataRegistrazioneDa=${da}&dataRegistrazioneA=${a}`,
      };
    }

    case "TRANSAZIONE_REGISTRO":
      return { method: "GET", path: `/dati-registri/v1.0/operatore/${registryId}/transazioni/${txnId}` };

    case "TRANSAZIONE_FIR":
      return { method: "GET", path: `/formulari/v1.0/transazioni/${txnId}` };

    case "FIRMA_RICEZIONE":
      return { method: "POST", path: `/formulari/v1.0` }; // firma ricezione usa stesso endpoint

    default:
      // Fallback generico
      return { method: "POST", path: `/invia-operazione` };
  }
}

/* ── Build upstream body ── */

function buildUpstreamBody(
  cliente: string,
  tipoOp: string,
  payload: unknown,
  route: RouteInfo
) {
  const n = norm(cliente);
  const company = COMPANY_ALIAS[n] ?? n.toUpperCase();
  const issuer = ISSUER_MAP[n] ?? "";
  const unitId = UNIT_ID_MAP[n] ?? "";
  const safe = normalizePayload(payload);

  // Auto-inject codice_blocco + num_iscr_sito for VIDIMAZIONE
  let codiceBlocco = safe.codice_blocco ?? safe.blocco ?? null;
  let numIscrSito = safe.num_iscr_sito ?? null;

  if (!codiceBlocco && (tipoOp === "VIDIMAZIONE" || tipoOp === "LOTTO" || tipoOp === "LOTTO_PDF")) {
    const blocks = BLOCK_CODES[n] ?? [];
    if (blocks.length > 0) {
      codiceBlocco = blocks[0].code;
      numIscrSito = numIscrSito ?? blocks[0].sito;
    }
  }

  // Quantity
  const qRaw = safe.quantita ?? safe.quantity ?? safe.qty;
  const qty = typeof qRaw === "number" ? qRaw : Number(qRaw);
  const qtyFields = Number.isFinite(qty) && qty > 0 ? { quantita: qty, quantity: qty } : {};

  return {
    cliente: n,
    company,
    issuer,
    tipo_operazione: tipoOp,
    rentri_method: route.method,
    rentri_path: route.path,
    codice_blocco: codiceBlocco,
    num_iscr_sito: numIscrSito ?? unitId,
    progressivo: safe.progressivo ?? null,
    identificativo: safe.identificativo ?? issuer,
    payload: safe,
    dati_inviati: safe,
    ...qtyFields,
  };
}

/* ── Main serve ── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { cliente, tipo_operazione, payload } = body;

    if (!cliente?.trim?.() || !tipo_operazione?.trim?.()) {
      return new Response(
        JSON.stringify({ success: false, error: "cliente e tipo_operazione sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tipoOp = tipo_operazione.trim().toUpperCase();
    const candidates = getCandidates(cliente);
    const allowFallback = (tipoOp === "VIDIMAZIONE" || tipoOp === "LOTTO") && candidates.length > 1;

    const attempts: Array<{
      cliente: string; company: string; status: number; success: boolean;
      message?: string; rentri_path?: string;
    }> = [];

    let primaryStatus = 500;
    let primaryData: unknown = { error: "Nessuna risposta dal VPS" };
    let lastStatus = 500;
    let lastData: unknown = primaryData;

    for (let i = 0; i < candidates.length; i++) {
      const cur = candidates[i];
      const safePayload = normalizePayload(payload);
      const route = resolveRoute(tipoOp, cur, safePayload);
      const upstream = buildUpstreamBody(cur, tipoOp, payload, route);
      const targetUrl = `${VPS_URL}/invia-operazione`;

      console.log(
        `[rentri-vps] POST ${targetUrl} — cliente=${upstream.cliente}, company=${upstream.company}, ` +
        `issuer=${upstream.issuer}, tipo=${tipoOp}, rentri_path=${route.path}, codice_blocco=${upstream.codice_blocco || "N/A"}`
      );

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(upstream),
      });

      const text = await res.text();
      const data = parseBody(text);
      const msg = extractMsg(data);

      attempts.push({
        cliente: upstream.cliente,
        company: upstream.company,
        status: res.status,
        success: res.ok,
        rentri_path: route.path,
        ...(msg ? { message: msg } : {}),
      });

      lastStatus = res.status;
      lastData = data;
      if (i === 0) { primaryStatus = res.status; primaryData = data; }

      console.log(`[rentri-vps] Risposta VPS: status=${res.status}, cliente=${upstream.cliente}, rentri_path=${route.path}`);

      if (res.ok) {
        return new Response(
          JSON.stringify({ success: true, status: res.status, data, attempts }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (res.status !== 500 || !allowFallback || i === candidates.length - 1) break;
      console.warn(`[rentri-vps] fallback → prossimo candidato dopo 500: ${upstream.cliente}`);
    }

    return new Response(
      JSON.stringify({
        success: false, status: primaryStatus, data: primaryData,
        attempts, fallback_last_status: lastStatus, fallback_last_data: lastData,
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
