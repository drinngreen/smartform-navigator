/**
 * RENTRI API Service – connects to the Render-hosted SmartForm Navigator server.
 * Handles FIR signature (vidimazione), QR code retrieval and PDF download.
 */

const RENTRI_BASE_URL = "https://smartform-navigator.onrender.com";

// ─── Tenant → societaId mapping ─────────────────────────────
const TENANT_MAP: Record<string, string> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "global_reco", // Global Reco
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "multy_niyol", // Multy Niyol
};

/**
 * Resolve the societaId from the user's profile / tenant.
 * Falls back to mn_context for multy_niyol sub-contexts.
 */
export function resolveSocietaId(
  tenantId?: string | null,
  mnContext?: string | null
): string {
  if (tenantId && TENANT_MAP[tenantId]) {
    const base = TENANT_MAP[tenantId];
    // For multy_niyol, further differentiate by mn_context
    if (base === "multy_niyol" && mnContext) {
      return mnContext; // "multyproget" | "niyol"
    }
    return base;
  }
  return "global_reco"; // default fallback
}

// ─── Types ───────────────────────────────────────────────────
export interface RentriFirmaPayload {
  societaId: string;
  payloadFir: Record<string, unknown>;
}

export interface RentriFirmaResponse {
  numero_fir: string;
  qr_code: string; // base64 data-uri or SVG string for QR
  pdf_url?: string; // optional direct PDF link
  [key: string]: unknown;
}

export interface RentriErrorResponse {
  error: string;
  details?: string;
}

// ─── API Functions ───────────────────────────────────────────

/**
 * Send FIR data to RENTRI server for signature (vidimazione).
 * Called when clicking "INVIA E FIRMA PARTENZA".
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const res = await fetch(`${RENTRI_BASE_URL}/api/fir/firma`, {
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
 * Build the PDF download URL for a given FIR number.
 * Opens in a new tab.
 */
export function getRentriPdfUrl(numeroFir: string): string {
  return `${RENTRI_BASE_URL}/pdf/${encodeURIComponent(numeroFir)}`;
}

/**
 * Build the QR code image URL if the server provides one via endpoint.
 */
export function getRentriQrUrl(numeroFir: string): string {
  return `${RENTRI_BASE_URL}/qr/${encodeURIComponent(numeroFir)}`;
}
