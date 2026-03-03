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
 * Parse a flat Italian address string into the RENTRI structured format.
 * Handles patterns like:
 *   "Via Roma 1 - 00100 Roma (RM)"
 *   "Via Alba 11 - 10024 Moncalieri (TO)"
 *   "Strada Provinciale 28, 15033 Casale Monferrato (AL)"
 */
function parseIndirizzo(raw: string): { indirizzo: string; civico: string; cap: string; citta: { comune: string } } {
  if (!raw) return { indirizzo: "", civico: "", cap: "", citta: { comune: "" } };

  const cleaned = raw.trim();

  // Try pattern: "Via/Strada ... N - CAP Comune (PROV)"
  const match = cleaned.match(
    /^(.+?)\s+(\d+[a-zA-Z\/]*)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/
  );
  if (match) {
    return {
      indirizzo: match[1].trim(),
      civico: match[2].trim(),
      cap: match[3].trim(),
      citta: { comune: match[4].trim() },
    };
  }

  // Try pattern without civico: "Via Roma - 00100 Roma (RM)"
  const match2 = cleaned.match(
    /^(.+?)\s*[-,]\s*(\d{5})\s+(.+?)(?:\s*\([A-Z]{2}\))?$/
  );
  if (match2) {
    return {
      indirizzo: match2[1].trim(),
      civico: "",
      cap: match2[2].trim(),
      citta: { comune: match2[3].trim() },
    };
  }

  // Fallback: put everything in indirizzo
  return { indirizzo: cleaned, civico: "", cap: "", citta: { comune: "" } };
}

/**
 * Map stato fisico to RENTRI letter codes.
 * RENTRI expects symbolic values (e.g. S/F/L/A), not numeric labels.
 */
const STATO_FISICO_TO_CODE: Record<string, string> = {
  "1": "S",
  "2": "S",
  "3": "F",
  "4": "L",
  "5": "A",
  "6": "S",
  "solido pulverulento": "S",
  "solido non pulverulento": "S",
  "fangoso palabile": "F",
  "liquido": "L",
  "aeriforme": "A",
  "altro": "S",
};

/**
 * Build the structured emissione payload from flat DB fields.
 * Maps flat fields → nested JSON as expected by the C# Bridge / RENTRI API.
 */
function buildEmissionePayload(flat: Record<string, unknown>): Record<string, unknown> {
  const str = (key: string) => (flat[key] as string) || "";
  const num = (key: string) => {
    const v = flat[key];
    if (typeof v === "number") return v;
    const parsed = parseFloat(String(v || "0"));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Resolve stato_fisico to RENTRI enum code (S/F/L/A)
  const rawStatoFisico = str("stato_fisico").trim().toLowerCase();
  const statoFisicoCode = STATO_FISICO_TO_CODE[rawStatoFisico] || "S";

  const unitaMisura = str("unita_misura") || "kg";

  const payload: Record<string, unknown> = {
    numero_fir: str("numero_fir"),
    produttore: {
      denominazione: str("produttore_denominazione"),
      codice_fiscale: str("produttore_codice_fiscale"),
      indirizzo: parseIndirizzo(str("produttore_indirizzo")),
    },
    destinatario: {
      denominazione: str("destinatario_denominazione"),
      codice_fiscale: str("destinatario_codice_fiscale"),
      indirizzo: parseIndirizzo(str("destinatario_indirizzo")),
      autorizzazione: {
        tipo: str("destinatario_tipo_aut") || "AIA",
        numero: str("destinatario_autorizzazione") || str("destinatario_numero_aut") || "",
      },
    },
    trasportatore: {
      denominazione: str("trasportatore_denominazione"),
      codice_fiscale: str("trasportatore_codice_fiscale"),
      iscrizione_albo: str("trasportatore_iscrizione_albo"),
      targa_automezzo: str("trasportatore_targa_automezzo"),
      targa_rimorchio: str("trasportatore_targa_rimorchio"),
      conducente: str("trasportatore_conducente"),
    },
    rifiuto: {
      codice_eer: str("codice_eer"),
      descrizione: str("descrizione_rifiuto"),
      stato_fisico: statoFisicoCode,
      quantita: {
        valore: num("quantita"),
        unita_misura: unitaMisura,
      },
      caratteristiche_hp: flat["caratteristiche_hp"] || [],
    },
  };

  // Intermediario (optional)
  if (str("intermediario_denominazione")) {
    payload.intermediario = {
      denominazione: str("intermediario_denominazione"),
      codice_fiscale: str("intermediario_codice_fiscale"),
      iscrizione_albo: str("intermediario_iscrizione_albo"),
    };
  }

  // Date trasporto
  if (str("data_partenza")) payload.data_partenza = str("data_partenza");
  if (str("note")) payload.note = str("note");

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
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const structuredPayload = buildEmissionePayload(payload.payloadFir);

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
