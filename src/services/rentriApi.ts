/**
 * RENTRI API Service – connects to the Ngrok-exposed backend.
 * Payload structures match the C# Bridge exactly.
 */

const NGROK_BASE = "https://pleasing-glorious-skunk.ngrok-free.app";

// ─── Tenant → company mapping ─────────────────────────────
const TENANT_MAP: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "GLOBAL",
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "MULTY",
};

const MN_CONTEXT_MAP: Record<string, string> = {
  multyproget: "MULTY",
  "multyproget-intermediario": "MULTY",
  "multyproget-impianto": "MULTY",
  niyol: "NIYOL",
};

/**
 * Resolve the company name from the user's profile / tenant.
 */
export function resolveSocietaId(
  tenantId?: string | null,
  mnContext?: string | null
): string {
  if (mnContext && MN_CONTEXT_MAP[mnContext]) {
    return MN_CONTEXT_MAP[mnContext];
  }
  if (tenantId && TENANT_MAP[tenantId]) {
    return TENANT_MAP[tenantId];
  }
  return "GLOBAL";
}

// ─── Types ───────────────────────────────────────────────────
export interface RentriFirmaPayload {
  societaId: string;
  payloadFir: Record<string, unknown>;
}

export interface RentriFirmaResponse {
  numero_fir: string;
  firId?: string;
  qr_code?: string;
  qrCodeBytes?: string;
  pdf_url?: string;
  pdf_content?: string;
  [key: string]: unknown;
}

export interface RentriErrorResponse {
  error: string;
  details?: string;
}

export interface RentriVidimateResponse {
  numeri: string[];
  [key: string]: unknown;
}

export interface RentriChiusuraPayload {
  societaId: string;
  numero_fir: string;
  peso_accettato: number;
  data_arrivo?: string;
  destinatario_denominazione?: string;
  destinatario_codice_fiscale?: string;
  destinatario_indirizzo?: string;
  destinatario_tipo_aut?: string;
  destinatario_numero_aut?: string;
  unita_misura?: string;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Resolve company-specific static config required by RENTRI schema.
 */
const COMPANY_CONFIG: Record<string, { unitId: string }> = {
  GLOBAL: { unitId: "OP2501RMK022692-TO0001" },
  MULTY: { unitId: "OP2501XMQ021914-TO0001" },
  NIYOL: { unitId: "OP2501SXW021767-TO0001" },
};

// ─── Expanded ISTAT comuni dictionary ───────────────────────
const COMUNE_ID_BY_NAME: Record<string, string> = {
  // Piemonte
  torino: "001272", moncalieri: "001156", carmagnola: "001059", settimo: "001270",
  "settimo torinese": "001270", alpignano: "001007", front: "001108",
  santena: "001252", lombardore: "001134", frossasco: "001111",
  piscina: "001194", villafranca: "001296", "villafranca piemonte": "001296",
  mappano: "001308", volvera: "001303", centallo: "004062",
  "costigliole saluzzo": "004077", "costigliole d'asti": "005046",
  "borgo san dalmazzo": "004029", clavesana: "004072", masserano: "096033",
  gaglianico: "096023", asti: "005005", tortona: "006175",
  // Lombardia
  milano: "015146", monza: "108033", desio: "108015", vimercate: "108050",
  vernate: "015234", uboldo: "012129", zanica: "016244",
  "romano di lombardia": "016182", "cassago brianza": "097015",
  "annone brianza": "097003", dorno: "018059", mortara: "018100",
  // Veneto
  cerea: "023022", "valeggio sul mincio": "023089", "albaredo d'adige": "023002",
  arzignano: "024008",
  // Trentino
  lavis: "022098", "rive del garda": "022155",
  // Friuli / Alto Adige
  bolzano: "021008",
  // Liguria
  genova: "010025", "serra ricco'": "010058", "pietra ligure": "009047",
  toirano: "009062", "la spezia": "011015", "santo stefano magra": "011027",
  sarzana: "011028",
  // Emilia-Romagna
  bologna: "037006", piacenza: "033032", cortemaggiore: "033015",
  parma: "034027", "reggio nell'emilia": "035033", "reggio emilia": "035033",
  scandiano: "035038", "castelnovo di sotto": "035012",
  rimini: "099014", "san giovanni in marignano": "099015",
  gambettola: "040013", "anzola dell'emilia": "037002",
  valsamoggia: "037059", redondesco: "020047",
  // Toscana
  pisa: "050026", firenze: "048017", livorno: "049009",
  montemurlo: "100003", camaiore: "046005", massa: "045010",
  "monte san savino": "051024",
  // Umbria
  foligno: "054018", torgiano: "054050", "torchiagina di assisi": "054001",
  assisi: "054001", montecastrilli: "055020", terni: "055032",
  // Marche
  treia: "043053", pesaro: "041044", jesi: "042021",
  // Lazio
  roma: "058091", pomezia: "058077",
  // Abruzzo
  rosciano: "068033", montesilvano: "068028",
  // Puglia
  trani: "110009",
  // Campania / Sud
  ravenna: "039014",
  // Mantova
  mantova: "020030", motteggiana: "020034",
  // Padova
  "ponte san nicolo'": "028066", "ponte san nicolò": "028066",
  // Brescia
  capriano: "017037",
};

function normalizeNumeroIscrizioneAlbo(raw: string): string | undefined {
  const v = (raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\./g, "")
    .replace(/^([A-Z]{2})(\d{3,})$/, "$1/$2");

  if (!v) return undefined;
  if (/^[A-Z]{2}\/\d{3,}$/.test(v)) return v;
  return undefined;
}

/**
 * Parse a flat Italian address string into the RENTRI structured format.
 * CONSERVATIVE FALLBACK: never substitutes city with arbitrary values.
 */
function parseIndirizzo(raw: unknown, comuneIstatOverride?: string): { indirizzo: string; civico?: string; cap: string; nazione_id: string; citta: { nome_citta: string; nazione_id: string; comune_id: string } } {
  // If structured object is passed
  if (raw && typeof raw === "object") {
    const source = raw as any;
    const city = source?.citta?.nome_citta || source?.citta?.nome || "";
    const comuneId = comuneIstatOverride || source?.citta?.comune_id || lookupComuneId(city) || "";
    return {
      indirizzo: source?.indirizzo || "",
      civico: source?.civico || "",
      cap: source?.cap || "00000",
      nazione_id: "IT",
      citta: {
        nome_citta: city,
        nazione_id: "IT",
        comune_id: comuneId,
      },
    };
  }

  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return {
      indirizzo: "",
      civico: "",
      cap: "00000",
      nazione_id: "IT",
      citta: { nome_citta: "", nazione_id: "IT", comune_id: comuneIstatOverride || "" },
    };
  }

  const cleaned = String(raw).trim();

  // Pattern: "VIA X 123, 10022 CARMAGNOLA (TO)"
  const match = cleaned.match(/^(.+?)\s+(\d+[a-zA-Z\/]*)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/);
  if (match) {
    const city = match[4].trim();
    return {
      indirizzo: match[1].trim(),
      civico: match[2].trim(),
      cap: match[3].trim(),
      nazione_id: "IT",
      citta: { nome_citta: city, nazione_id: "IT", comune_id: comuneIstatOverride || lookupComuneId(city) || "" },
    };
  }

  // Pattern: "VIA X, 10022 CARMAGNOLA (TO)"
  const match2 = cleaned.match(/^(.+?)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/);
  if (match2) {
    const city = match2[3].trim();
    return {
      indirizzo: match2[1].trim(),
      civico: "",
      cap: match2[2].trim(),
      nazione_id: "IT",
      citta: { nome_citta: city, nazione_id: "IT", comune_id: comuneIstatOverride || lookupComuneId(city) || "" },
    };
  }

  // Pattern without CAP: "VIA X, CARMAGNOLA (TO)" or "VIA X, CITY"
  const match3 = cleaned.match(/^(.+?)\s*[-,]\s+([A-Z][A-Za-z\s']+?)(?:\s*\([A-Z]{2}\))?\s*$/);
  if (match3) {
    const city = match3[2].trim();
    return {
      indirizzo: match3[1].trim(),
      civico: "",
      cap: "00000",
      nazione_id: "IT",
      citta: { nome_citta: city, nazione_id: "IT", comune_id: comuneIstatOverride || lookupComuneId(city) || "" },
    };
  }

  // Last resort: keep original string as indirizzo, try to extract city from parentheses
  const cityFromParens = cleaned.match(/([A-Z][A-Za-z\s']+?)\s*\([A-Z]{2}\)\s*$/);
  const cityName = cityFromParens ? cityFromParens[1].trim() : "";

  return {
    indirizzo: cleaned,
    civico: "",
    cap: "00000",
    nazione_id: "IT",
    citta: { nome_citta: cityName, nazione_id: "IT", comune_id: comuneIstatOverride || lookupComuneId(cityName) || "" },
  };
}

/** Lookup ISTAT code by city name (case-insensitive) */
function lookupComuneId(city: string): string | undefined {
  if (!city) return undefined;
  return COMUNE_ID_BY_NAME[city.trim().toLowerCase()];
}

/**
 * Map stato fisico to RENTRI numeric codes.
 * RENTRI accepts ONLY "1"-"5".
 */
const STATO_FISICO_TO_CODE: Record<string, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "2", // "Altro" → fallback solido non pulverulento
  "s": "2",
  "sp": "1",
  "solido pulverulento": "1",
  "solido non pulverulento": "2",
  "fangoso palabile": "3",
  "fangoso": "3",
  "liquido": "4",
  "l": "4",
  "aeriforme": "5",
  "a": "5",
  "f": "3",
  "altro": "2",
};

function resolveStatoFisico(raw: unknown): string {
  const v = String(raw ?? "").trim().toLowerCase();
  return STATO_FISICO_TO_CODE[v] || "2"; // Default: solido non pulverulento
}

/**
 * Build payload in full RENTRI schema.
 * Single call, no brute-force retry.
 */
function buildEmissionePayload(flat: Record<string, unknown>, societaId: string): Record<string, unknown> {
  const str = (key: string) => (flat[key] as string) || "";
  const num = (key: string) => {
    const v = flat[key];
    if (typeof v === "number") return v;
    const parsed = parseFloat(String(v || "0"));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formData = (flat.form_data as Record<string, unknown> | null) || {};
  const isUrbano = Boolean(formData.provenienza_urbano);
  const provenienza = isUrbano ? "U" : "S";
  const destinatarioAttivita =
    (formData.destinatario_operazione_R as string) ||
    (formData.destinatario_operazione_D as string) ||
    "R13";

  const statoFisicoCode = resolveStatoFisico(flat.stato_fisico || str("stato_fisico"));

  const unitId = COMPANY_CONFIG[societaId]?.unitId || COMPANY_CONFIG.GLOBAL.unitId;
  const unitaMisura = str("unita_misura") || "kg";

  const produttoreCf = str("produttore_codice_fiscale");
  const destinatarioCf = str("destinatario_codice_fiscale") || produttoreCf;

  // Get comuneIstat override from form_data if available
  const destComuneIstat = (formData.destinatario_comune_istat as string) || undefined;
  const prodComuneIstat = (formData.produttore_comune_istat as string) || undefined;

  // Build intermediario block if present
  const intermediarioDenom = str("intermediario_denominazione");
  const intermediarioCf = str("intermediario_codice_fiscale");
  const intermediarioAlbo = normalizeNumeroIscrizioneAlbo(str("intermediario_iscrizione_albo"));
  const hasIntermediario = !!(intermediarioDenom || intermediarioCf);

  const payload: Record<string, unknown> = {
    num_iscr_sito: unitId,
    dati_partenza: {
      numero_fir: str("numero_fir"),
      produttore: {
        denominazione: str("produttore_denominazione"),
        codice_fiscale: produttoreCf,
        nazione_id: "IT",
        indirizzo: parseIndirizzo(flat["produttore_indirizzo"], prodComuneIstat),
      },
      destinatario: {
        denominazione: str("destinatario_denominazione"),
        codice_fiscale: destinatarioCf,
        nazione_id: "IT",
        autorizzazione: {
          tipo: str("destinatario_tipo_aut") || (formData.destinatario_tipo as string) || "AIA",
          numero: str("destinatario_autorizzazione") || str("destinatario_numero_aut") || "N/D",
        },
        attivita: destinatarioAttivita,
        indirizzo: parseIndirizzo(flat["destinatario_indirizzo"], destComuneIstat),
      },
      trasportatori: [
        {
          denominazione: str("trasportatore_denominazione") || str("produttore_denominazione"),
          codice_fiscale: str("trasportatore_codice_fiscale") || produttoreCf,
          nazione_id: "IT",
          tipo_trasporto: "Terrestre",
          numero_iscrizione_albo: normalizeNumeroIscrizioneAlbo(str("trasportatore_iscrizione_albo")),
          indirizzo: parseIndirizzo(flat["produttore_indirizzo"], prodComuneIstat),
        },
      ],
      rifiuto: {
        codice_eer: str("codice_eer"),
        descrizione: str("descrizione_rifiuto"),
        provenienza,
        stato_fisico: statoFisicoCode,
        quantita: {
          valore: num("quantita"),
          unita_misura: unitaMisura,
        },
        caratteristiche_pericolo: flat["caratteristiche_hp"] || [],
      },
      dati_trasporto_partenza: {
        targa_automezzo: str("trasportatore_targa_automezzo"),
        targa_rimorchio: str("trasportatore_targa_rimorchio"),
        data_ora_inizio_trasporto: str("data_partenza") || new Date().toISOString(),
      },
      annotazioni: str("note") || undefined,
    },
  };

  // Add intermediario block if data is present
  if (hasIntermediario) {
    (payload.dati_partenza as any).intermediario = {
      denominazione: intermediarioDenom,
      codice_fiscale: intermediarioCf,
      nazione_id: "IT",
      ...(intermediarioAlbo ? { numero_iscrizione_albo: intermediarioAlbo } : {}),
    };
  }

  return payload;
}

// ─── API Functions ───────────────────────────────────────────

export async function checkRentriHealth(): Promise<{ ok: boolean; url: string; status: number; body: string }> {
  const url = `${NGROK_BASE}/api/rentri/health`;
  try {
    const res = await fetch(url, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    return { ok: res.ok, url, status: res.status, body: res.ok ? "OK" : "Error" };
  } catch (err: any) {
    return { ok: false, url, status: 0, body: err.message || String(err) };
  }
}

/**
 * 1. EMISSIONE — Send FIR data for signature (BOZZA → IN VIAGGIO).
 * POST /api/rentri/action/emissione
 * Single call — no brute-force retry on stato_fisico.
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const structuredPayload = buildEmissionePayload(payload.payloadFir, payload.societaId);

  const body = {
    company: payload.societaId,
    payload: structuredPayload,
  };

  console.log("[RENTRI] Emissione payload:", JSON.stringify(body, null, 2).substring(0, 2000));

  let res: Response;
  let data: any;

  try {
    res = await fetch(`${NGROK_BASE}/api/rentri/action/emissione`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(body),
    });
    data = await res.json();
  } catch (networkErr) {
    console.warn("[RENTRI] Direct emissione failed, using proxy fallback:", networkErr);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zungtspcixpxjpjlcwzy.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bmd0c3BjaXhweGpwamxjd3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3Nzk0NDQsImV4cCI6MjA4NDM1NTQ0NH0.eNLT478rWBxK-G9sOhiHaWC3j-u_KzPWu07wEC4BQxA';

    res = await fetch(`${supabaseUrl}/functions/v1/rentri-action-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({
        endpoint: "/api/rentri/action/emissione",
        payload: body,
      }),
    });

    data = await res.json().catch(() => ({}));
  }

  const root = (data as any)?.data || (data as any)?.result || (data as any)?.payload || data || {};

  console.log("[RENTRI] Emissione response:", {
    status: res.status,
    keys: Object.keys(data || {}),
    rootKeys: Object.keys(root || {}),
    hasPdfContent: Boolean(root.pdf_content || root.pdfContent || root.pdf_base64 || root.pdfBase64),
    hasFirId: Boolean(root.firId || root.numero_fir || root.fir_id),
  });

  if (res.ok) {
    const firId = root.firId || root.numero_fir || root.fir_id || "";
    return {
      ...(data as Record<string, unknown>),
      ...(root as Record<string, unknown>),
      numero_fir: firId,
      firId,
      pdf_content: root.pdf_content || root.pdfContent || root.pdf_base64 || root.pdfBase64 || undefined,
      qr_code: root.qr_code || root.qrCodeBytes || root.qrCode || root.qr_base64 || root.qrBase64 || undefined,
    } as RentriFirmaResponse;
  }

  // Build meaningful error message from model_state if available
  const modelState = (data as any)?.model_state || {};
  const modelErrors = Object.entries(modelState)
    .map(([field, msgs]) => `${translateFieldName(field)}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
    .join("; ");

  const errMsg =
    modelErrors ||
    (data as RentriErrorResponse).error ||
    (data as RentriErrorResponse).details ||
    `Errore server (${res.status})`;

  throw new Error(errMsg);
}

/** Translate RENTRI model_state field names to Italian for user-friendly errors */
function translateFieldName(field: string): string {
  const map: Record<string, string> = {
    "dati_partenza.rifiuto.stato_fisico": "Stato fisico rifiuto",
    "dati_partenza.produttore.indirizzo": "Indirizzo produttore",
    "dati_partenza.produttore.codice_fiscale": "CF produttore",
    "dati_partenza.destinatario.indirizzo": "Indirizzo destinatario",
    "dati_partenza.destinatario.codice_fiscale": "CF destinatario",
    "dati_partenza.destinatario.attivita": "Operazione destinatario (R/D)",
    "dati_partenza.trasportatori[0].numero_iscrizione_albo": "Iscrizione albo trasportatore",
    "num_iscr_sito": "Numero iscrizione sito",
  };
  return map[field] || field;
}

/**
 * 2. GET-PDF — Fetch PDF/QR for Controllo Polizia (IN VIAGGIO).
 * POST /api/rentri/action/get-pdf
 */
export async function getRentriPdf(
  company: string,
  firId: string
): Promise<{ pdfBase64?: string; pdfUrl?: string; qrCode?: string; qrUrl?: string; [key: string]: unknown }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/rentri-get-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "apikey": supabaseKey,
    },
    body: JSON.stringify({ company, firId }),
  });

  const data = await res.json();
  const root = (data as any)?.data || (data as any)?.result || (data as any)?.payload || data || {};

  const normalized = {
    ...(data as Record<string, unknown>),
    ...(root as Record<string, unknown>),
    qrCode: root.qrCode || root.qr_code || root.qrCodeBytes || root.qr_base64 || root.qrBase64 || undefined,
    pdfBase64:
      root.pdfBase64 ||
      root.pdf_base64 ||
      root.pdf_content ||
      root.pdfContent ||
      root.pdf_base_64 ||
      root.content ||
      undefined,
    pdfUrl: root.pdfUrl || root.pdf_url || root.url || undefined,
  };

  console.log("[RENTRI] get-pdf proxy response:", {
    status: res.status,
    keys: Object.keys(data || {}),
    rootKeys: Object.keys(root || {}),
    hasQr: Boolean(normalized.qrCode),
    hasPdf: Boolean(normalized.pdfBase64),
  });

  if (!res.ok) {
    const errMsg = (normalized as any)?.error || (normalized as any)?.details || `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  return normalized;
}

/**
 * 3. FIRMA RICEZIONE — Close FIR at destination (IN VIAGGIO → ARRIVO).
 * POST /api/rentri/action/firma-ricezione
 * Company is always "MULTY" (the facility that signs the arrival).
 */
export async function chiudiFirRentri(
  payload: RentriChiusuraPayload
): Promise<Record<string, unknown>> {
  const body = {
    company: "MULTY",
    firId: payload.numero_fir,
    payload: {
      dati_arrivo: {
        numero_fir: payload.numero_fir,
        data_ora_arrivo: payload.data_arrivo || new Date().toISOString(),
        destinatario: {
          denominazione: payload.destinatario_denominazione || "",
          codice_fiscale: payload.destinatario_codice_fiscale || "",
          indirizzo: parseIndirizzo(payload.destinatario_indirizzo || ""),
          autorizzazione: {
            tipo: payload.destinatario_tipo_aut || "AIA",
            numero: payload.destinatario_numero_aut || "",
          },
        },
        accettazione: {
          accettato: true,
          quantita_ricevuta: {
            valore: payload.peso_accettato,
            unita_misura: payload.unita_misura || "kg",
          },
        },
      },
    },
  };

  const res = await fetch(`${NGROK_BASE}/api/rentri/action/firma-ricezione`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      (data as RentriErrorResponse).error ||
      (data as RentriErrorResponse).details ||
      `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

/**
 * 4. VIDIMAZIONE — Request new vidimated FIR numbers.
 * POST /api/rentri/action/vidimazione
 */
export async function richiediNuoviNumeri(
  company: string,
  quantity: number = 5
): Promise<RentriVidimateResponse> {
  const res = await fetch(`${NGROK_BASE}/api/rentri/action/vidimazione`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ company, quantity }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      (data as RentriErrorResponse).error ||
      (data as RentriErrorResponse).details ||
      `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  let numeri: string[] = [];
  if (Array.isArray(data.numeri)) numeri = data.numeri;
  else if (typeof data.numeri === "string") numeri = [data.numeri];
  else if (typeof data.firNumber === "string") numeri = [data.firNumber];
  else if (Array.isArray(data.firNumbers)) numeri = data.firNumbers;
  else if (Array.isArray(data.firCodes)) numeri = data.firCodes;

  return { ...data, numeri };
}

// ─── Legacy URL builders (kept for download links) ───────────

export function getRentriPdfUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-pdf?firId=${encodeURIComponent(numeroFir)}`;
}

export function getRentriXfirUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-xfir?firId=${encodeURIComponent(numeroFir)}`;
}

export function getRentriQrUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-qr?firId=${encodeURIComponent(numeroFir)}`;
}
