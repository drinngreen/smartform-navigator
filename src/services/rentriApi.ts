/**
 * RENTRI API Service – connects to the Ngrok-exposed backend.
 * Payload structures match the C# Bridge exactly.
 */

const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";

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

const COMUNE_ID_BY_NAME: Record<string, string> = {
  roma: "058091",
  moncalieri: "001156",
  torino: "001272",
};

function normalizeNumeroIscrizioneAlbo(raw: string): string | undefined {
  const v = (raw || "").trim().toUpperCase();
  if (!v) return undefined;
  // Transform MI58420 -> MI/58420
  const m = v.match(/^([A-Z]{2})(\d{3,})$/);
  if (m) return `${m[1]}/${m[2]}`;
  return v;
}

/**
 * Parse a flat Italian address string into the RENTRI structured format.
 */
function parseIndirizzo(raw: string): { indirizzo: string; civico?: string; cap: string; nazione_id: string; citta: { nome_citta: string; nazione_id: string; comune_id: string } } {
  const empty = {
    indirizzo: "",
    civico: "",
    cap: "",
    nazione_id: "IT",
    citta: { nome_citta: "Roma", nazione_id: "IT", comune_id: "058091" },
  };

  if (!raw) return empty;

  const cleaned = raw.trim();
  const pickComuneId = (city: string) => COMUNE_ID_BY_NAME[city.trim().toLowerCase()] || "058091";

  const match = cleaned.match(/^(.+?)\s+(\d+[a-zA-Z\/]*)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/);
  if (match) {
    const city = match[4].trim();
    return {
      indirizzo: match[1].trim(),
      civico: match[2].trim(),
      cap: match[3].trim(),
      nazione_id: "IT",
      citta: { nome_citta: city, nazione_id: "IT", comune_id: pickComuneId(city) },
    };
  }

  const match2 = cleaned.match(/^(.+?)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/);
  if (match2) {
    const city = match2[3].trim();
    return {
      indirizzo: match2[1].trim(),
      civico: "",
      cap: match2[2].trim(),
      nazione_id: "IT",
      citta: { nome_citta: city, nazione_id: "IT", comune_id: pickComuneId(city) },
    };
  }

  return empty;
}

/**
 * Map stato fisico to RENTRI codes.
 */
const STATO_FISICO_TO_CODE: Record<string, string> = {
  "1": "SP",
  "2": "SP",
  "3": "F",
  "4": "L",
  "5": "A",
  "6": "SP",
  "s": "SP",
  "sp": "SP",
  "solido pulverulento": "SP",
  "solido non pulverulento": "SP",
  "fangoso palabile": "F",
  "liquido": "L",
  "aeriforme": "A",
  "altro": "SP",
};

/**
 * Build payload in full RENTRI schema:
 * {
 *   num_iscr_sito,
 *   dati_partenza: { ... }
 * }
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

  const rawStatoFisico = str("stato_fisico").trim().toLowerCase();
  const statoFisicoCode = STATO_FISICO_TO_CODE[rawStatoFisico] || "SP";

  const unitId = COMPANY_CONFIG[societaId]?.unitId || COMPANY_CONFIG.GLOBAL.unitId;
  const unitaMisura = str("unita_misura") || "kg";

  const produttoreCf = str("produttore_codice_fiscale");
  const destinatarioCf = str("destinatario_codice_fiscale") || produttoreCf;

  return {
    num_iscr_sito: unitId,
    dati_partenza: {
      numero_fir: str("numero_fir"),
      produttore: {
        denominazione: str("produttore_denominazione"),
        codice_fiscale: produttoreCf,
        nazione_id: "IT",
        indirizzo: parseIndirizzo(str("produttore_indirizzo")),
      },
      destinatario: {
        denominazione: str("destinatario_denominazione"),
        codice_fiscale: destinatarioCf,
        nazione_id: "IT",
        autorizzazione: {
          tipo: str("destinatario_tipo_aut") || "AIA",
          numero: str("destinatario_autorizzazione") || str("destinatario_numero_aut") || "N/D",
        },
        indirizzo: parseIndirizzo(str("destinatario_indirizzo")),
      },
      trasportatori: [
        {
          denominazione: str("trasportatore_denominazione") || str("produttore_denominazione"),
          codice_fiscale: str("trasportatore_codice_fiscale") || produttoreCf,
          nazione_id: "IT",
          tipo_trasporto: "Terrestre",
          numero_iscrizione_albo: normalizeNumeroIscrizioneAlbo(str("trasportatore_iscrizione_albo")),
          indirizzo: parseIndirizzo(str("produttore_indirizzo")),
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
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const structuredPayload = buildEmissionePayload(payload.payloadFir, payload.societaId);

  const body = {
    company: payload.societaId,
    payload: structuredPayload,
  };

  const res = await fetch(`${NGROK_BASE}/api/rentri/action/emissione`, {
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

  // Normalize the firId from the response
  const firId = data.firId || data.numero_fir || data.fir_id || "";

  return { ...data, numero_fir: firId, firId } as RentriFirmaResponse;
}

/**
 * 2. GET-PDF — Fetch PDF/QR for Controllo Polizia (IN VIAGGIO).
 * POST /api/rentri/action/get-pdf
 */
export async function getRentriPdf(
  company: string,
  firId: string
): Promise<{ pdfBase64?: string; pdfUrl?: string; qrCode?: string; [key: string]: unknown }> {
  const res = await fetch(`${NGROK_BASE}/api/rentri/action/get-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ company, firId }),
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
 * 3. FIRMA RICEZIONE — Close FIR at destination (IN VIAGGIO → ARRIVO).
 * POST /api/rentri/action/firma-ricezione
 * Company is always "MULTY" (the facility that signs the arrival).
 */
export async function chiudiFirRentri(
  payload: RentriChiusuraPayload
): Promise<Record<string, unknown>> {
  const body = {
    company: "MULTY", // Chi firma l'arrivo (Destinatario / Impianto)
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
