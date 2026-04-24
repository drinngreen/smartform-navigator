/**
 * RENTRI API Service – routes through VPS proxy (rentri-vps-proxy edge function).
 */

import { inviaOperazioneRentri, emissioneFir, firmaRicezione, richiestaVidimazione, scaricaPdfLotto, type RentriCliente } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";

// ─── Tenant → company mapping ─────────────────────────────
const TENANT_MAP: Record<string, RentriCliente> = {
  "167d07ad-9184-484e-85a6-da5ceafa42a3": "global",
  "dc2a6046-d9a8-4549-8e45-82367d695ac6": "multy",
  "77ec9a3d-602e-438f-97bf-1c69abd8f691": "multy",
  "819c783e-78dd-4080-8265-802e75b0d813": "niyol",
};

const MN_CONTEXT_MAP: Record<string, RentriCliente> = {
  multyproget: "multy",
  "multyproget-intermediario": "multy",
  "multyproget-impianto": "multy",
  niyol: "niyol",
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
  return "global";
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

interface RentriErrorResponse {
  error?: string;
  details?: string;
  model_state?: Record<string, string[]>;
}

export interface RentriChiusuraPayload {
  societaId?: string;
  numero_fir: string;
  data_arrivo?: string;
  destinatario_denominazione?: string;
  destinatario_codice_fiscale?: string;
  destinatario_indirizzo?: string;
  destinatario_tipo_aut?: string;
  destinatario_numero_aut?: string;
  peso_accettato: number;
  unita_misura?: string;
}

export interface RentriVidimateResponse {
  numeri: string[];
  [key: string]: unknown;
}

// ─── Helper ──────────────────────────────────────────────────
function parseIndirizzo(raw: string) {
  const match = raw.match(/^(.+?),?\s*(\d{5})?\s+(.+?)(?:\s*\((\w+)\))?$/);
  if (match) {
    return {
      via: match[1]?.trim() || raw,
      cap: match[2] || "",
      comune: match[3]?.trim() || "",
      provincia: match[4] || "",
      nazione_id: "IT",
    };
  }
  return { via: raw, cap: "", comune: "", provincia: "", nazione_id: "IT" };
}

function parseLottoReference(raw: string): { codiceBlocco: string; progressivo: string } | null {
  const normalized = raw.trim().replace(/\s+/g, " ").toUpperCase();
  const match = normalized.match(/^([A-Z]{5})\s*(\d{1,6})(?:\s+[A-Z]{2})?$/);
  if (!match) return null;
  return {
    codiceBlocco: match[1],
    progressivo: match[2].padStart(6, "0"),
  };
}

// ─── API Functions ───────────────────────────────────────────

export async function checkRentriHealth(): Promise<{ ok: boolean; url: string; status: number; body: string }> {
  try {
    // Use a lightweight VPS call to check health
    const res = await inviaOperazioneRentri({
      cliente: "global",
      tipo_operazione: "LISTA_BLOCCHI",
      payload: {},
    });
    return { ok: res.success, url: "VPS Proxy", status: res.status, body: res.success ? "OK" : (res.error || "Error") };
  } catch (err: any) {
    return { ok: false, url: "VPS Proxy", status: 0, body: err.message || String(err) };
  }
}

/**
 * 1. EMISSIONE — Send FIR data for signature via VPS proxy.
 */
export async function inviaFirmaRentri(
  payload: RentriFirmaPayload
): Promise<RentriFirmaResponse> {
  const cliente = (payload.societaId.toLowerCase()) as RentriCliente;

  // Inject num_iscr_sito from tenant config if missing (mobile FIR form sends raw dbFields)
  const cfg = getTenantConfig(cliente);
  const enrichedPayload: Record<string, unknown> = { ...payload.payloadFir };
  if (cfg?.unitId && !enrichedPayload.num_iscr_sito) {
    enrichedPayload.num_iscr_sito = cfg.unitId;
  }

  const res = await emissioneFir(cliente, enrichedPayload);

  if (res.success) {
    const root = (res.data as any) || {};
    const firId = root.firId || root.numero_fir || root.fir_id || "";
    return {
      ...(root as Record<string, unknown>),
      numero_fir: firId,
      firId,
      pdf_content: root.pdf_content || root.pdfContent || root.pdf_base64 || root.pdfBase64 || undefined,
      qr_code: root.qr_code || root.qrCodeBytes || root.qrCode || root.qr_base64 || root.qrBase64 || undefined,
    } as RentriFirmaResponse;
  }

  // Build meaningful error message from model_state if available
  const errData = (res.data as any) || {};
  const modelState = errData?.model_state || {};
  const modelErrors = Object.entries(modelState)
    .map(([field, msgs]) => `${translateFieldName(field)}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
    .join("; ");

  const errMsg = modelErrors || res.error || errData?.error || errData?.details || `Errore server (${res.status})`;
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
 * 2. GET-PDF — Fetch PDF/QR via VPS proxy.
 */
export async function getRentriPdf(
  company: string,
  firId: string
): Promise<{ pdfBase64?: string; pdfUrl?: string; qrCode?: string; qrUrl?: string; [key: string]: unknown }> {
  const cliente = (company.toLowerCase()) as RentriCliente;
  const lottoRef = parseLottoReference(firId);
  if (!lottoRef) {
    throw new Error("Numero FIR non valido per il recupero PDF/QR");
  }

  const res = await scaricaPdfLotto(cliente, lottoRef.codiceBlocco, lottoRef.progressivo);

  const root = (res.data as any) || {};
  const normalized = {
    ...(root as Record<string, unknown>),
    qrCode: root.qrCode || root.qr_code || root.qrCodeBytes || root.qr_base64 || root.qrBase64 || undefined,
    pdfBase64: root.pdfBase64 || root.pdf_base64 || root.pdf_content || root.pdfContent || root.content || undefined,
    pdfUrl: root.pdfUrl || root.pdf_url || root.url || undefined,
  };

  if (!res.success) {
    const errMsg = res.error || (root as any)?.error || `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  return normalized;
}

/**
 * 3. FIRMA RICEZIONE — Close FIR at destination via VPS proxy.
 */
export async function chiudiFirRentri(
  payload: RentriChiusuraPayload
): Promise<Record<string, unknown>> {
  const firPayload = {
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
  };

  const cliente = ((payload.societaId || "global").toLowerCase()) as RentriCliente;
  const res = await firmaRicezione(cliente, firPayload);

  if (!res.success) {
    const errMsg = res.error || `Errore server (${res.status})`;
    throw new Error(errMsg);
  }

  return (res.data as Record<string, unknown>) || {};
}

/**
 * 4. VIDIMAZIONE — Request new vidimated FIR numbers via VPS proxy.
 */
export async function richiediNuoviNumeri(
  company: string,
  quantity: number = 5
): Promise<RentriVidimateResponse> {
  const cliente = (company.toLowerCase()) as RentriCliente;
  const res = await richiestaVidimazione(cliente, quantity);

  if (!res.success) {
    throw new Error(res.error || `Errore server (${res.status})`);
  }

  const data = (res.data as any) || {};
  let numeri: string[] = [];
  if (Array.isArray(data.numeri)) numeri = data.numeri;
  else if (typeof data.numeri === "string") numeri = [data.numeri];
  else if (typeof data.firNumber === "string") numeri = [data.firNumber];
  else if (Array.isArray(data.firNumbers)) numeri = data.firNumbers;
  else if (Array.isArray(data.firCodes)) numeri = data.firCodes;

  return { ...data, numeri };
}

// ─── URL builders (now use VPS proxy, return empty since PDF is fetched via API) ───
export function getRentriPdfUrl(_numeroFir: string): string {
  return ""; // PDF is fetched via getRentriPdf() API call
}

export function getRentriXfirUrl(_numeroFir: string): string {
  return ""; // xFIR is fetched via API call
}

export function getRentriQrUrl(_numeroFir: string): string {
  return ""; // QR is fetched via API call
}
