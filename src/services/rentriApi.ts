/**
 * RENTRI API Service – connects to the Dragon Rifiuti Sender on Render.
 * Handles FIR signature (vidimazione), QR code retrieval, PDF/xFIR download,
 * and pool replenishment (vidimate).
 */

const RENTRI_BASE_URL = "https://smartform-navigator.onrender.com";

/**
 * Health check – GET /health or /status to verify the server is reachable.
 */
export async function checkRentriHealth(): Promise<{ ok: boolean; url: string; status: number; body: string }> {
  const url = `${RENTRI_BASE_URL}/health`;
  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    return { ok: res.ok, url, status: res.status, body: text.slice(0, 500) };
  } catch (err: any) {
    return { ok: false, url, status: 0, body: err.message || String(err) };
  }
}

// ─── Tenant → societaId mapping ─────────────────────────────
const TENANT_MAP: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "global_reco", // Global Reco
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "multy_niyol", // Multy Niyol
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
      return mnContext;
    }
    return base;
  }
  return "global_reco";
}

// ─── Types ───────────────────────────────────────────────────
export interface RentriFirmaPayload {
  societaId: string;
  payloadFir: Record<string, unknown>;
}

export interface RentriFirmaResponse {
  numero_fir: string;
  qr_code: string; // base64 data-uri or SVG string for QR
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

// ─── API Functions ───────────────────────────────────────────

/**
 * Send FIR data to RENTRI server for signature (vidimazione).
 * Called when clicking "INVIA E FIRMA PARTENZA".
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const res = await fetch(`${RENTRI_BASE_URL}/firma-fir`, {
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

  return data as RentriFirmaResponse;
}

/**
 * Request new vidimated FIR numbers from RENTRI.
 * Called when the pool is empty and admin requests replenishment.
 */
export async function richiediNuoviNumeri(
  societaId: string
): Promise<RentriVidimateResponse> {
  const res = await fetch(`${RENTRI_BASE_URL}/vidimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ societaId }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg =
      (data as RentriErrorResponse).error ||
      (data as RentriErrorResponse).details ||
      `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  return data as RentriVidimateResponse;
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
