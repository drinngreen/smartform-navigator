/**
 * RENTRI API Service – connects to the Dragon Rifiuti Sender on Render.
 * Handles FIR signature (vidimazione), QR code retrieval, PDF/xFIR download,
 * and pool replenishment (vidimate).
 */

const RENTRI_BASE_URL = "https://dragonrifiutisender-production.up.railway.app/api/rentri";
/**
 * Health check – proxied through edge function to avoid CORS.
 */
export async function checkRentriHealth(): Promise<{ ok: boolean; url: string; status: number; body: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/railway-health`;
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    });
    if (!res.ok) return { ok: false, url, status: res.status, body: "Edge function error" };
    const data = await res.json();
    return { ok: data.ok, url, status: data.status, body: JSON.stringify(data) };
  } catch (err: any) {
    return { ok: false, url, status: 0, body: err.message || String(err) };
  }
}

// ─── Tenant → societaId mapping ─────────────────────────────
const TENANT_MAP: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "global", // Global Reco
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "multy_niyol", // Multy Niyol
};

const MN_CONTEXT_MAP: Record<string, string> = {
  multyproget: "multy",
  niyol: "niyol",
};

/**
 * Resolve the societaId from the user's profile / tenant.
 */
export function resolveSocietaId(
  tenantId?: string | null,
  mnContext?: string | null
): string {
  if (tenantId && TENANT_MAP[tenantId]) {
    const base = TENANT_MAP[tenantId];
    if (base === "multy_niyol" && mnContext) {
      return MN_CONTEXT_MAP[mnContext] || mnContext;
    }
    return base;
  }
  return "global";
}

// ─── Types ───────────────────────────────────────────────────
export interface RentriFirmaPayload {
  societaId: string;
  payloadFir: Record<string, unknown>;
}

export interface RentriFirmaResponse {
  numero_fir: string;
  qr_code?: string;       // base64 string or data-uri for QR
  qrCodeBytes?: string;   // alternative field name from some server versions
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

/**
 * Strip heavy / binary fields from the payload before sending to Render.
 * The server loads certificates from its own /etc/secrets/ – we must NOT
 * include any base64, p12 data, or oversized blobs in the request.
 */
function sanitizePayloadFir(raw: Record<string, unknown>): Record<string, unknown> {
  // Fields that are relevant for RENTRI signature
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
    // Nested objects accepted by old callers
    "produttore", "destinatario", "trasportatore", "intermediario", "rifiuto",
  ]);

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    // Extra safety: skip any string longer than 10 KB (base64 blobs, etc.)
    if (typeof value === "string" && value.length > 10_000) continue;
    clean[key] = value;
  }
  return clean;
}

// ─── API Functions ───────────────────────────────────────────

/**
 * Send FIR data to RENTRI server for signature (vidimazione).
 * Called when clicking "INVIA E FIRMA PARTENZA".
 *
 * IMPORTANT: Only sends societaId + clean FIR fields.
 * No certificates, no base64, no form_data blobs.
 * The Render server loads the .p12 certificate from /etc/secrets/.
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const body = {
    societaId: payload.societaId,
    payloadFir: sanitizePayloadFir(payload.payloadFir),
    isSandbox: false,
  };

  const res = await fetch(`${RENTRI_BASE_URL}/firma-fir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
 * Request new vidimated FIR numbers from RENTRI.
 * Called when the pool is empty and admin requests replenishment.
 */
export async function richiediNuoviNumeri(
  company: string
): Promise<RentriVidimateResponse> {
  const res = await fetch(`${RENTRI_BASE_URL}/vidimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      (data as RentriErrorResponse).error ||
      (data as RentriErrorResponse).details ||
      `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  // Normalize response: accept { numeri: [...] }, { firNumber: "..." }, or { numeri: "..." }
  let numeri: string[] = [];
  if (Array.isArray(data.numeri)) {
    numeri = data.numeri;
  } else if (typeof data.numeri === "string") {
    numeri = [data.numeri];
  } else if (typeof data.firNumber === "string") {
    numeri = [data.firNumber];
  } else if (Array.isArray(data.firNumbers)) {
    numeri = data.firNumbers;
  }

  return { ...data, numeri };
}

/**
 * Send closure data (peso accettato) to finalize FIR on RENTRI.
 */
export async function chiudiFirRentri(
  payload: RentriChiusuraPayload
): Promise<Record<string, unknown>> {
  const res = await fetch(`${RENTRI_BASE_URL}/chiudi-fir`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
 * Build the PDF download URL for a given FIR number.
 */
export function getRentriPdfUrl(numeroFir: string): string {
  return `${RENTRI_BASE_URL}/pdf/${encodeURIComponent(numeroFir)}`;
}

/**
 * Build the xFIR download URL for a given FIR number.
 */
export function getRentriXfirUrl(numeroFir: string): string {
  return `${RENTRI_BASE_URL}/xfir/${encodeURIComponent(numeroFir)}`;
}

/**
 * Build the QR code image URL if the server provides one via endpoint.
 */
export function getRentriQrUrl(numeroFir: string): string {
  return `${RENTRI_BASE_URL}/qr/${encodeURIComponent(numeroFir)}`;
}
