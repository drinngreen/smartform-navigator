/**
 * RENTRI API Service – connects to the Ngrok-exposed backend.
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
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────

function sanitizePayloadFir(raw: Record<string, unknown>): Record<string, unknown> {
  const ALLOWED_KEYS = new Set([
    "numero_fir",
    "produttore_denominazione", "produttore_codice_fiscale", "produttore_indirizzo",
    "produttore_comune", "produttore_provincia", "produttore_cap",
    "destinatario_denominazione", "destinatario_codice_fiscale", "destinatario_indirizzo",
    "destinatario_autorizzazione",
    "trasportatore_denominazione", "trasportatore_codice_fiscale",
    "trasportatore_iscrizione_albo", "trasportatore_targa_automezzo",
    "trasportatore_targa_rimorchio", "trasportatore_conducente",
    "intermediario_denominazione", "intermediario_codice_fiscale", "intermediario_iscrizione_albo",
    "codice_eer", "descrizione_rifiuto", "stato_fisico",
    "quantita", "unita_misura", "caratteristiche_hp",
    "data_partenza", "data_arrivo", "note",
    "produttore", "destinatario", "trasportatore", "intermediario", "rifiuto",
  ]);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === "string" && value.length > 10_000) continue;
    clean[key] = value;
  }
  return clean;
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
 * Send FIR data for signature (emissione) via Ngrok.
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const body = {
    company: payload.societaId,
    payload: sanitizePayloadFir(payload.payloadFir),
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

  return data as RentriFirmaResponse;
}

/**
 * Request new vidimated FIR numbers.
 */
export async function richiediNuoviNumeri(
  company: string
): Promise<RentriVidimateResponse> {
  const res = await fetch(`${NGROK_BASE}/api/rentri/action/vidimazione`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ company, quantity: 50 }),
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

  return { ...data, numeri };
}

/**
 * Send closure data (firma ricezione) via Ngrok.
 */
export async function chiudiFirRentri(
  payload: RentriChiusuraPayload
): Promise<Record<string, unknown>> {
  const res = await fetch(`${NGROK_BASE}/api/rentri/action/firma-ricezione`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      company: payload.societaId,
      payload: {
        fir_id: payload.numero_fir,
        dati_arrivo: {
          peso_verificato: payload.peso_accettato,
          accettato: true,
          data_arrivo: payload.data_arrivo || new Date().toISOString(),
        },
      },
    }),
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
 * Build the PDF download URL via Ngrok.
 */
export function getRentriPdfUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-pdf?firId=${encodeURIComponent(numeroFir)}`;
}

/**
 * Build the xFIR download URL via Ngrok.
 */
export function getRentriXfirUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-xfir?firId=${encodeURIComponent(numeroFir)}`;
}

/**
 * Build the QR code image URL via Ngrok.
 */
export function getRentriQrUrl(numeroFir: string): string {
  return `${NGROK_BASE}/api/rentri/action/get-qr?firId=${encodeURIComponent(numeroFir)}`;
}
