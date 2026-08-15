/**
 * Core logic of the rentri-vps-proxy Edge Function.
 * Extracted from index.ts so it can be unit-tested with a mocked fetch,
 * without performing any real call to the RENTRI bridge.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface HandlerOptions {
  /** Injectable fetch (tests pass a mock). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Bridge base URL override (tests). */
  bridgeUrl?: string;
  /** Bridge key override (tests). Never logged nor returned. */
  bridgeKey?: string;
  /** Fetch timeout override (tests). */
  timeoutMs?: number;
}

function env(name: string): string | undefined {
  try {
    return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(name);
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.replace(/\/+$/, "");
  if (url.endsWith("/invia-operazione")) url = url.replace(/\/invia-operazione$/, "");
  return url;
}

function isConnectivityError(message: string): boolean {
  return /No route to host|Connection timed out|tcp connect error|Connection refused|client error \(Connect\)|network|aborted|timeout/i.test(
    message,
  );
}

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

/**
 * Alias verso la chiave di configurazione: il bridge espone `multyproget`,
 * ma la configurazione (unit id, registro, blocchi) è censita sotto `multy`.
 * Nessun valore viene inventato: si riusa esclusivamente quello di `multy`.
 */
const CONFIG_KEY_ALIAS: Record<string, string> = {
  multyproget: "multy",
  globalreco: "global",
};

export function configKey(cliente: string): string {
  const n = norm(cliente);
  return CONFIG_KEY_ALIAS[n] ?? n;
}

const UNIT_ID_MAP: Record<string, string> = {
  global: "OP2501RMK022692-TO0001",
  multy: "OP2501XMQ021914-TO0001",
  niyol: "OP2501SXW021767-TO0001",
};

/**
 * Registri RENTRI attivi per unità locale (dati ufficiali forniti dall'operatore).
 * La chiave è la config key (multy | niyol | global).
 */
export const REGISTRIES: Record<string, { id: string; nome: string; tipo: string }[]> = {
  multy: [
    { id: "RAH20NP7O40", nome: "Registro Impianto / Produttore", tipo: "IMPIANTO" },
    { id: "RQCTGTP7NT0", nome: "Registro Trasporto (Conto Proprio)", tipo: "TRASPORTO" },
    { id: "RQEL39R7NS0", nome: "Registro Intermediario", tipo: "INTERMEDIARIO" },
  ],
  niyol: [
    { id: "RTR31497PX0", nome: "Registro Trasporto", tipo: "TRASPORTO" },
  ],
  global: [
    { id: "R6QSWHZ6HJV", nome: "Registro Global Reco", tipo: "IMPIANTO" },
  ],
};

const REGISTRY_ID_MAP: Record<string, string | null> = {
  global: REGISTRIES.global[0].id,
  multy: REGISTRIES.multy[0].id,
  niyol: REGISTRIES.niyol[0].id,
};

/** Registro effettivo: `payload.registro_id` se valido per il cliente, altrimenti il default. */
export function resolveRegistryId(cliente: string, payload: Record<string, unknown>): string {
  const key = configKey(cliente);
  const requested = String(payload?.registro_id ?? payload?.registro ?? "").trim();
  const list = REGISTRIES[key] ?? [];
  if (requested && list.some((r) => r.id === requested)) return requested;
  return REGISTRY_ID_MAP[key] ?? "";
}


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

export function norm(cliente: string): string { return String(cliente ?? "").trim().toLowerCase(); }

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

function normalizeMethod(value: unknown): "GET" | "POST" | null {
  const method = String(value ?? "").trim().toUpperCase();
  return method === "GET" || method === "POST" ? method : null;
}

function normalizePath(value: unknown): string | null {
  const path = String(value ?? "").trim();
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}

/* ── Routing: mappa tipo_operazione → path + method RENTRI ── */

export interface RouteInfo {
  method: "GET" | "POST";
  path: string;
  /** Path alternativi da provare solo se RENTRI risponde 404 sul path principale. */
  altPaths?: string[];
}


function formatProgressivo(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? raw.padStart(6, "0") : raw;
}

export function resolveRoute(
  tipo: string,
  cliente: string,
  payload: Record<string, unknown>,
): RouteInfo {
  const key = configKey(cliente);
  const issuer = ISSUER_MAP[norm(cliente)] ?? "";
  const registryId = resolveRegistryId(cliente, payload);
  const blocks = BLOCK_CODES[key] ?? [];
  const codiceBlocco = String(payload.codice_blocco ?? payload.blocco ?? blocks[0]?.code ?? "");
  const progressivo = formatProgressivo(payload.progressivo);
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
      return {
        method: "GET",
        path: `/dati-registri/v1.0/operatore/${registryId}/transazioni/${txnId}`,
        altPaths: [`/dati-registri/v1.0/operatore/${registryId}/transazione/${txnId}`],
      };
    case "TRANSAZIONE_FIR":
      return {
        method: "GET",
        path: `/formulari/v1.0/transazioni/${txnId}`,
        altPaths: [`/formulari/v1.0/transazione/${txnId}`],
      };
    case "TRANSAZIONE_VIDIMAZIONE":
      return {
        method: "GET",
        path: `/vidimazione-formulari/v1.0/transazioni/${txnId}`,
        altPaths: [
          `/vidimazione-formulari/v1.0/transazione/${txnId}`,
          ...(codiceBlocco ? [`/vidimazione-formulari/v1.0/${codiceBlocco}/transazioni/${txnId}`] : []),
        ],
      };

    case "FIRMA_RICEZIONE":
      return { method: "POST", path: `/formulari/v1.0` };
    default:
      return { method: "POST", path: `/invia-operazione` };
  }
}

/* ── Build upstream body ── */

export function buildUpstreamBody(
  cliente: string,
  tipoOp: string,
  payload: unknown,
  route: RouteInfo,
) {
  const n = norm(cliente);
  const key = configKey(n);
  const company = COMPANY_ALIAS[n] ?? n.toUpperCase();
  const issuer = ISSUER_MAP[n] ?? "";
  const unitId = UNIT_ID_MAP[key] ?? "";
  const safe = normalizePayload(payload);

  let codiceBlocco = safe.codice_blocco ?? safe.blocco ?? null;
  let numIscrSito = safe.num_iscr_sito ?? null;

  if (!codiceBlocco && (tipoOp === "VIDIMAZIONE" || tipoOp === "LOTTO" || tipoOp === "LOTTO_PDF")) {
    const blocks = BLOCK_CODES[key] ?? [];
    if (blocks.length > 0) {
      codiceBlocco = blocks[0].code;
      numIscrSito = numIscrSito ?? blocks[0].sito;
    }
  }

  const qRaw = safe.quantita ?? safe.quantity ?? safe.qty;
  const qty = typeof qRaw === "number" ? qRaw : Number(qRaw);
  const qtyFields = Number.isFinite(qty) && qty > 0 ? { quantita: qty, quantity: qty } : {};

  return {
    // il bridge espone il tenant come `multyproget`: si mantiene invariato
    cliente: n,
    company,
    issuer,
    tipo_operazione: tipoOp,
    rentri_method: route.method,
    rentri_path: route.path,
    codice_blocco: codiceBlocco,
    num_iscr_sito: numIscrSito ?? unitId,
    progressivo: safe.progressivo ?? null,
    registro_id: resolveRegistryId(n, safe),

    identificativo: safe.identificativo ?? issuer,
    payload: safe,
    dati_inviati: safe,
    ...qtyFields,
  };
}

/* ── Handler ── */

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Codice errore stabile e non sensibile, derivato dallo status HTTP. */
export function errorCodeForStatus(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422) return "INVALID_DATA";
  if (status === 429) return "RATE_LIMITED";
  if (status === 502 || status === 503 || status === 504) return "BRIDGE_UNAVAILABLE";
  if (status >= 500) return "BRIDGE_ERROR";
  if (status >= 400) return "CLIENT_ERROR";
  return "OK";
}

/** Rimuove eventuali tracce di segreti/stack trace dai messaggi propagati alla UI. */
export function sanitizeMessage(raw: string, secret?: string): string {
  let out = String(raw ?? "").split("\n")[0].slice(0, 500);
  if (secret) out = out.split(secret).join("***");
  return out
    .replace(/x-bridge-key\s*[:=]\s*\S+/gi, "x-bridge-key: ***")
    .replace(
      /(authorization|password|passphrase|apikey|api_key|token)\s*[:=]\s*(bearer\s+)?\S+/gi,
      "$1: ***",
    )
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]+/gi, "bearer ***");
}


export async function handleRentriProxy(req: Request, options: HandlerOptions = {}): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const bridgeBase = options.bridgeUrl ?? env("RENTRI_BRIDGE_URL") ?? "https://rentri-bridge.dragonrifiuti.space";
  const bridgeKey = options.bridgeKey ?? env("RENTRI_BRIDGE_KEY") ?? "";
  const timeoutMs = options.timeoutMs ?? Number(env("RENTRI_VPS_TIMEOUT_MS") ?? 6000);
  const bridgeUrl = normalizeBaseUrl(bridgeBase);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ success: false, status: 400, error: "Body JSON non valido" }, 400);
  }

  const { cliente, tipo_operazione, payload, rentri_method, rentri_path, dry_run } = body as {
    cliente?: string; tipo_operazione?: string; payload?: unknown;
    rentri_method?: unknown; rentri_path?: unknown; dry_run?: unknown;
  };
  const isDryRun = dry_run === true || dry_run === "true";
  const directMethod = normalizeMethod(rentri_method);
  const directPath = normalizePath(rentri_path);
  const hasDirectRoute = Boolean(directMethod && directPath);

  if (!norm(cliente ?? "") || (!hasDirectRoute && !String(tipo_operazione ?? "").trim())) {
    return json(
      {
        success: false,
        status: 400,
        mode: isDryRun ? "dry_run" : "real",
        error_code: errorCodeForStatus(400),
        error: "cliente e tipo_operazione oppure rentri_method/rentri_path sono obbligatori",
        validation: {
          cliente_presente: Boolean(norm(cliente ?? "")),
          route_presente: hasDirectRoute || Boolean(String(tipo_operazione ?? "").trim()),
        },
      },
      400,
    );
  }

  const tipoOp = String(tipo_operazione ?? (hasDirectRoute ? "CUSTOM" : "")).trim().toUpperCase();
  const candidates = getCandidates(cliente!);
  // Nessun retry per le route dirette (es. GET esplicita).
  const allowFallback = !hasDirectRoute && (tipoOp === "VIDIMAZIONE" || tipoOp === "LOTTO") && candidates.length > 1;

  /* ── DRY RUN: nessuna fetch esterna, nessuna scrittura DB ── */
  if (isDryRun) {
    const primary = candidates[0];
    const safePayload = normalizePayload(payload);
    const route = hasDirectRoute
      ? { method: directMethod!, path: directPath! }
      : resolveRoute(tipoOp, primary, safePayload);
    const upstream = buildUpstreamBody(primary, tipoOp, payload, route);
    const key = configKey(primary);

    const clienteRiconosciuto = Boolean(ISSUER_MAP[norm(primary)]);
    const preview = {
      cliente: upstream.cliente,
      config_key: key,
      tipo_operazione: tipoOp,
      rentri_method: route.method,
      rentri_path: route.path,
      has_num_iscr_sito: Boolean(upstream.num_iscr_sito),
      has_issuer: Boolean(upstream.issuer),
      has_registry_id: Boolean(REGISTRY_ID_MAP[key]),
      has_codice_blocco: Boolean(upstream.codice_blocco),
      blocchi_configurati: (BLOCK_CODES[key] ?? []).length,
      bridge_key_configurata: Boolean(bridgeKey),
      bridge_endpoint: `${bridgeUrl}/invia-operazione`,
    };

    const validation = {
      cliente_riconosciuto: clienteRiconosciuto,
      route_valida: Boolean(route.path && route.path !== "/invia-operazione"),
      num_iscr_sito_presente: preview.has_num_iscr_sito,
      registro_presente: preview.has_registry_id,
      blocco_presente: preview.has_codice_blocco,
    };
    const errori: string[] = [];
    if (!clienteRiconosciuto) errori.push("Cliente non riconosciuto nella configurazione");
    if (!validation.route_valida) errori.push("Tipo operazione o path RENTRI non risolvibile");
    if (!validation.num_iscr_sito_presente) errori.push("num_iscr_sito non configurato");
    if (!preview.bridge_key_configurata) errori.push("Chiave del bridge non configurata sul server");

    console.log(
      `[rentri-vps][dry-run] cliente=${preview.cliente}, config_key=${key}, tipo=${tipoOp}, ` +
        `rentri_path=${route.path}, num_iscr_sito=${preview.has_num_iscr_sito ? "present" : "missing"}, ` +
        `bridge_key=${preview.bridge_key_configurata ? "present" : "missing"} — NESSUN INVIO`,
    );

    return json(
      {
        success: errori.length === 0,
        status: errori.length === 0 ? 200 : 422,
        mode: "dry_run",
        dry_run: true,
        sent_to_bridge: false,
        error_code: errori.length === 0 ? null : errorCodeForStatus(422),
        error: errori.length === 0 ? null : errori.join("; "),
        preview,
        validation,
        errori,
      },
      errori.length === 0 ? 200 : 422,
    );
  }


  const attempts: Array<{
    cliente: string; company: string; status: number; success: boolean;
    message?: string; rentri_path?: string;
  }> = [];

  let primaryStatus = 502;
  let primaryData: unknown = { error: "Nessuna risposta dal bridge RENTRI" };
  let lastStatus = primaryStatus;
  let lastData: unknown = primaryData;

  for (let i = 0; i < candidates.length; i++) {
    const cur = candidates[i];
    const safePayload = normalizePayload(payload);
    const route = hasDirectRoute
      ? { method: directMethod!, path: directPath! }
      : resolveRoute(tipoOp, cur, safePayload);
    const upstream = buildUpstreamBody(cur, tipoOp, payload, route);
    const targetUrl = `${bridgeUrl}/invia-operazione`;

    console.log(
      `[rentri-vps] POST ${targetUrl} — cliente=${upstream.cliente}, company=${upstream.company}, ` +
        `issuer=${upstream.issuer}, tipo=${tipoOp}, rentri_path=${route.path}, ` +
        `codice_blocco=${upstream.codice_blocco || "N/A"}, bridge_key=${bridgeKey ? "present" : "missing"}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bridgeKey ? { "x-bridge-key": bridgeKey } : {}),
        },
        body: JSON.stringify(upstream),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      const rawMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      const message = sanitizeMessage(rawMessage, bridgeKey);
      console.error("[rentri-vps] CONNECTIVITY:", message);
      attempts.push({
        cliente: upstream.cliente, company: upstream.company,
        status: 502, success: false, message, rentri_path: route.path,
      });
      return json(
        {
          success: false,
          status: 502,
          mode: "real",
          error_code: errorCodeForStatus(502),
          error: isConnectivityError(rawMessage)
            ? "Bridge RENTRI non raggiungibile o timeout. Puoi continuare a compilare e salvare i FIR localmente."
            : "Errore di comunicazione con il bridge RENTRI",
          data: { error: message, bridge_unreachable: true },
          rentri_offline: true,
          attempts,
        },
        502,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let text: string;
    try {
      text = await res.text();
    } catch (readErr) {
      const message = sanitizeMessage(readErr instanceof Error ? readErr.message : String(readErr), bridgeKey);
      return json(
        {
          success: false, status: 502, mode: "real",
          error_code: errorCodeForStatus(502),
          error: "Risposta del bridge RENTRI non valida",
          data: { error: message, bridge_invalid_response: true },
          attempts,
        },
        502,
      );
    }


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

    console.log(`[rentri-vps] Risposta bridge: status=${res.status}, cliente=${upstream.cliente}, rentri_path=${route.path}`);

    if (res.ok) {
      return json({ success: true, status: res.status, mode: "real", error_code: null, data, attempts }, res.status);
    }

    if (res.status !== 500 || !allowFallback || i === candidates.length - 1) break;
    console.warn(`[rentri-vps] fallback → prossimo candidato dopo 500: ${upstream.cliente}`);
  }

  // Errore 4xx/5xx del bridge: stesso status HTTP verso il chiamante.
  const outStatus = primaryStatus >= 400 && primaryStatus <= 599 ? primaryStatus : 502;
  return json(
    {
      success: false,
      status: primaryStatus,
      mode: "real",
      error_code: errorCodeForStatus(primaryStatus),
      error: sanitizeMessage(
        extractMsg(primaryData) || `Il bridge RENTRI ha risposto con errore HTTP ${primaryStatus}`,
        bridgeKey,
      ),
      data: primaryData,
      attempts,
      fallback_last_status: lastStatus,
      fallback_last_data: lastData,
    },

    outStatus,
  );
}
