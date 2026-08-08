import { supabase } from "@/lib/supabaseClient";
import {
  rentriErrorCodeForStatus,
  rentriUserMessage,
  sanitizeRentriMessage,
  type RentriErrorCode,
} from "@/lib/rentriErrorMessages";


export type RentriCliente = "multy" | "niyol" | "global";
export type RentriTipoOperazione =
  | "REGISTRO"
  | "FIR_EMISSIONE"
  | "VIDIMAZIONE"
  | "LOTTO"
  | "LOTTO_PDF"
  | "LISTA_BLOCCHI"
  | "DETTAGLIO_FIR"
  | "RICERCA_FIR"
  | "FIRMA_RICEZIONE"
  | "RICERCA_MOVIMENTI"
  | "TRANSAZIONE_REGISTRO"
  | "TRANSAZIONE_FIR"
  | "CUSTOM";

export type RentriMethod = "GET" | "POST";

export interface RentriVpsRequest {
  cliente: RentriCliente;
  tipo_operazione: RentriTipoOperazione;
  payload: Record<string, unknown> | null;
  rentri_method?: RentriMethod;
  rentri_path?: string;
  /** true = solo verifica configurazione, nessun invio al bridge */
  dry_run?: boolean;
}

export interface RentriDryRunPreview {
  cliente: string;
  config_key: string;
  tipo_operazione: string;
  rentri_method: string;
  rentri_path: string;
  has_num_iscr_sito: boolean;
  has_issuer: boolean;
  has_registry_id: boolean;
  has_codice_blocco: boolean;
  blocchi_configurati: number;
  bridge_key_configurata: boolean;
  bridge_endpoint: string;
}

export interface RentriVpsResponse {
  success: boolean;
  status: number;
  data: unknown;
  /** Messaggio tecnico (già sanitizzato) — sezione "Dettagli tecnici" */
  error?: string;
  /** Messaggio leggibile da mostrare all'utente */
  userMessage?: string;
  errorCode?: RentriErrorCode;
  mode?: "dry_run" | "real";
  preview?: RentriDryRunPreview;
  validation?: Record<string, boolean>;
  errori?: string[];
  rentri_offline?: boolean;
  retry_after_ms?: number;
}

const RENTRI_OFFLINE_MESSAGE = "RENTRI momentaneamente non raggiungibile: puoi continuare a compilare, modificare e salvare i FIR localmente.";

export function isRentriConnectivityError(message: string): boolean {
  return /No route to host|Connection timed out|tcp connect error|Connection refused|client error \(Connect\)|Edge function returned 500|network|aborted|timeout|offline|failed to fetch|relay/i.test(message);
}

export function isRentriOfflineResponse(response: Pick<RentriVpsResponse, "data" | "error" | "rentri_offline"> | null | undefined): boolean {
  const data = response?.data as Record<string, unknown> | null | undefined;
  const dataError = typeof data?.error === "string" ? data.error : "";
  return Boolean(response?.rentri_offline || data?.rentri_offline || isRentriConnectivityError(`${response?.error ?? ""} ${dataError}`));
}

function normalizeRentriResponse(data: unknown): RentriVpsResponse {
  if (data && typeof data === "object" && "success" in data) {
    const record = data as Record<string, unknown>;
    const nested = record.data as Record<string, unknown> | null | undefined;
    const success = Boolean(record.success);
    const status = Number(record.status ?? (record.rentri_offline ? 503 : success ? 200 : 0));
    const technical = typeof record.error === "string" ? sanitizeRentriMessage(record.error) : undefined;

    return {
      success,
      status,
      data: record.data ?? null,
      error: technical,
      userMessage: success ? "Operazione completata." : rentriUserMessage(status, technical),
      errorCode: (typeof record.error_code === "string"
        ? (record.error_code as RentriErrorCode)
        : rentriErrorCodeForStatus(status)),
      mode: record.mode === "dry_run" ? "dry_run" : "real",
      preview: (record.preview as RentriDryRunPreview) ?? undefined,
      validation: (record.validation as Record<string, boolean>) ?? undefined,
      errori: Array.isArray(record.errori) ? (record.errori as string[]) : undefined,
      rentri_offline: Boolean(record.rentri_offline || nested?.rentri_offline),
      retry_after_ms: typeof record.retry_after_ms === "number" ? record.retry_after_ms : undefined,
    };
  }

  return {
    success: false,
    status: 0,
    data: data ?? null,
    error: "Risposta RENTRI non valida",
    userMessage: "Risposta del servizio non valida. Riprovare più tardi.",
    errorCode: "UNKNOWN",
  };
}

export interface RentriAccettazionePayload {
  data_ora_ricezione: string;
  quantita_ricevuta: {
    valore: number;
    unita_misura: string;
  };
  esito_conferimento: string;
  num_iscr_sito: string;
  motivazione?: string;
}

/** Legge il body strutturato dalla Response allegata agli errori non-2xx di functions.invoke */
async function readInvokeError(
  error: unknown,
): Promise<{ status: number; body: Record<string, unknown> | null; text: string | null }> {
  const context = (error as { context?: unknown } | null)?.context as Response | undefined;
  if (!context || typeof context.text !== "function") {
    return { status: 0, body: null, text: null };
  }
  const status = Number(context.status ?? 0);
  try {
    const text = await context.clone().text();
    try {
      const parsed = JSON.parse(text);
      return {
        status,
        body: parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null,
        text,
      };
    } catch {
      return { status, body: null, text };
    }
  } catch {
    return { status, body: null, text: null };
  }
}

export async function inviaOperazioneRentri(
  request: RentriVpsRequest
): Promise<RentriVpsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("rentri-vps-proxy", {
      body: request,
    });

    if (error) {
      const { status, body } = await readInvokeError(error);

      // FunctionsHttpError con body JSON strutturato dalla Edge Function
      if (body && "success" in body) {
        const normalized = normalizeRentriResponse(body);
        return { ...normalized, success: false, status: normalized.status || status };
      }

      // FunctionsHttpError con body non JSON → status HTTP ancora utilizzabile
      if (status >= 400) {
        return {
          success: false,
          status,
          data: null,
          error: sanitizeRentriMessage(error.message),
          userMessage: rentriUserMessage(status),
          errorCode: rentriErrorCodeForStatus(status),
          rentri_offline: status === 502 || status === 503 || status === 504,
        };
      }

      // FunctionsRelayError / FunctionsFetchError: nessuna Response utilizzabile
      const offline = isRentriConnectivityError(error.message ?? "");
      return {
        success: false,
        status: offline ? 503 : 0,
        data: null,
        error: sanitizeRentriMessage(error.message),
        userMessage: offline ? RENTRI_OFFLINE_MESSAGE : "Operazione non riuscita: servizio non raggiungibile.",
        errorCode: offline ? "BRIDGE_UNAVAILABLE" : "NETWORK_ERROR",
        rentri_offline: offline,
      };
    }

    return normalizeRentriResponse(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const offline = isRentriConnectivityError(message);
    return {
      success: false,
      status: offline ? 503 : 0,
      data: null,
      error: sanitizeRentriMessage(message),
      userMessage: offline ? RENTRI_OFFLINE_MESSAGE : "Operazione non riuscita.",
      errorCode: offline ? "BRIDGE_UNAVAILABLE" : "NETWORK_ERROR",
      rentri_offline: offline,
    };
  }

}


/* ── Helper functions ── */

export function listaBlocchi(cliente: RentriCliente) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "LISTA_BLOCCHI", payload: {} });
}

export function richiestaVidimazione(cliente: RentriCliente, quantita: number, codiceBlocco?: string, numIscrSito?: string) {
  return inviaOperazioneRentri({
    cliente,
    tipo_operazione: "VIDIMAZIONE",
    payload: { quantita, codice_blocco: codiceBlocco, num_iscr_sito: numIscrSito },
  });
}

export function leggiLotto(cliente: RentriCliente, codiceBlocco: string, progressivo: number | string) {
  return inviaOperazioneRentri({
    cliente,
    tipo_operazione: "LOTTO",
    payload: { codice_blocco: codiceBlocco, progressivo },
  });
}

export function scaricaPdfLotto(cliente: RentriCliente, codiceBlocco: string, progressivo: number | string) {
  return inviaOperazioneRentri({
    cliente,
    tipo_operazione: "LOTTO_PDF",
    payload: { codice_blocco: codiceBlocco, progressivo },
  });
}

export function emissioneFir(cliente: RentriCliente, firPayload: Record<string, unknown>) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "FIR_EMISSIONE", payload: firPayload });
}

export function dettaglioFir(cliente: RentriCliente, uuidFir: string) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "DETTAGLIO_FIR", payload: { uuid_fir: uuidFir } });
}

export function ricercaFir(cliente: RentriCliente, numeroFir: string) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "RICERCA_FIR", payload: { numero_fir: numeroFir } });
}

export function inserimentoMovimento(cliente: RentriCliente, movimenti: unknown[]) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "REGISTRO", payload: { movimenti } });
}

export function ricercaMovimenti(cliente: RentriCliente, dataDa: string, dataA: string) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "RICERCA_MOVIMENTI", payload: { data_da: dataDa, data_a: dataA } });
}

export function statoTransazioneRegistro(cliente: RentriCliente, transazioneId: string) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "TRANSAZIONE_REGISTRO", payload: { transazione_id: transazioneId } });
}

export function statoTransazioneFir(cliente: RentriCliente, transazioneId: string) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "TRANSAZIONE_FIR", payload: { transazione_id: transazioneId } });
}

export function firmaRicezione(cliente: RentriCliente, firPayload: Record<string, unknown>) {
  return inviaOperazioneRentri({ cliente, tipo_operazione: "FIRMA_RICEZIONE", payload: firPayload });
}

export function inviaOperazioneRentriCustom(
  cliente: RentriCliente,
  method: RentriMethod,
  path: string,
  payload: Record<string, unknown> | null = null,
) {
  return inviaOperazioneRentri({
    cliente,
    tipo_operazione: "CUSTOM",
    rentri_method: method,
    rentri_path: path,
    payload,
  });
}

export function listaFirInArrivoDestinatario(
  cliente: RentriCliente,
  identificativoSoggetto: string,
) {
  const query = new URLSearchParams({
    identificativo_soggetto: identificativoSoggetto,
    ruolo: "DESTINATARIO",
    pendenza_arrivo: "true",
  });

  return inviaOperazioneRentriCustom(cliente, "GET", `/formulari/v1.0?${query.toString()}`, null);
}

export function accettaFirInArrivoDestinatario(
  cliente: RentriCliente,
  uuidFir: string,
  payload: RentriAccettazionePayload,
) {
  return inviaOperazioneRentriCustom(
    cliente,
    "POST",
    `/formulari/v1.0/${uuidFir}/accettazione`,
    payload as unknown as Record<string, unknown>,
  );
}

/* ── Async Vidimazione orchestrator ── */

export interface VidimazioneAsyncResult {
  numeri: string[];
  transazione_id?: string;
  pending: boolean;
  partial: boolean;
}

const FIR_NUMBER_REGEX = /^[A-Z]{5}\s+\d{6}\s+[A-Z]{2}$/;

function formatProgressivo(value: number | string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? raw.padStart(6, "0") : raw;
}

function normalizeFirNumber(value: unknown): string {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  return FIR_NUMBER_REGEX.test(normalized) ? normalized : "";
}

function readBlockProgressivo(blocchiRes: RentriVpsResponse, codiceBlocco: string): number {
  const payload = blocchiRes.data as any;
  const blocchi = Array.isArray(payload?.blocchi)
    ? payload.blocchi
    : Array.isArray(payload)
      ? payload
      : [];

  const blocco = blocchi.find((b: any) => b?.codice_blocco === codiceBlocco);
  const progressivo = Number(blocco?.numero_fir_vidimati ?? blocco?.progressivo ?? 0);
  return Number.isFinite(progressivo) ? progressivo : 0;
}

function collectFirNumbers(value: unknown, found = new Set<string>()): Set<string> {
  if (value == null) return found;

  if (typeof value === "string") {
    const normalized = normalizeFirNumber(value);
    if (normalized) found.add(normalized);
    return found;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectFirNumbers(item, found);
    return found;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of ["numero_fir", "numeroFir", "firNumber", "numero"]) {
      const normalized = normalizeFirNumber(record[key]);
      if (normalized) found.add(normalized);
    }

    for (const nested of Object.values(record)) {
      collectFirNumbers(nested, found);
    }
  }

  return found;
}

/**
 * Orchestrates the full async vidimazione flow:
 * 1. Read LISTA_BLOCCHI to get current count
 * 2. Send VIDIMAZIONE request
 * 3. If numbers returned immediately → use them
 * 4. Otherwise poll transaction + LOTTO until RENTRI really exposes all requested numbers
 */
export async function vidimaFIRAsync(
  cliente: RentriCliente,
  quantita: number,
  codiceBlocco: string,
  numIscrSito?: string,
  onProgress?: (msg: string) => void,
): Promise<VidimazioneAsyncResult> {
  onProgress?.("Lettura stato blocco…");
  const blocchiRes = await listaBlocchi(cliente);
  const startProgressivo = readBlockProgressivo(blocchiRes, codiceBlocco);

  onProgress?.("Invio richiesta vidimazione…");
  const vidRes = await richiestaVidimazione(cliente, quantita, codiceBlocco, numIscrSito);
  const vidData = (vidRes.data as any) || {};
  const transazioneId = vidData.transazione_id || vidData.transazioneId || vidData.id_transazione || undefined;

  const numeri = extractFirNumbers(vidData);
  const knownNumbers = new Set(numeri);
  const retrievedProgressivi = new Set<number>();
  let maxProgressivoToRead = startProgressivo;

  if (numeri.length >= quantita) {
    return {
      numeri: numeri.slice(0, quantita),
      transazione_id: transazioneId,
      pending: false,
      partial: false,
    };
  }

  if (!transazioneId && !vidRes.success && numeri.length === 0) {
    return { numeri: [], transazione_id: undefined, pending: false, partial: false };
  }

  onProgress?.("Richiesta accettata, recupero numeri in corso…");
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries && numeri.length < quantita; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    try {
      const blocchiPollRes = await listaBlocchi(cliente);
      const currentProgressivo = readBlockProgressivo(blocchiPollRes, codiceBlocco);
      maxProgressivoToRead = Math.max(maxProgressivoToRead, currentProgressivo);
    } catch {
      // keep last known progressivo window
    }

    if (transazioneId) {
      try {
        const txRes = await statoTransazioneFir(cliente, transazioneId);
        if (txRes.success) {
          for (const firNum of extractFirNumbers(txRes.data)) {
            if (!knownNumbers.has(firNum)) {
              knownNumbers.add(firNum);
              numeri.push(firNum);
            }
          }

          const txData = (txRes.data as any) || {};
          const txProgressivo = Number(
            txData.numero_fir_vidimati ??
            txData.progressivo ??
            txData.ultimo_progressivo ??
            txData.progressivo_finale ??
            txData.max_progressivo ??
            0,
          );

          if (Number.isFinite(txProgressivo) && txProgressivo > 0) {
            maxProgressivoToRead = Math.max(maxProgressivoToRead, txProgressivo);
          }
        }
      } catch {
        // transaction endpoint may lag behind LOTTO exposure
      }
    }

    const releasedCount = Math.max(0, maxProgressivoToRead - startProgressivo);
    const cappedMaxProgressivo = Math.min(startProgressivo + quantita, maxProgressivoToRead);

    onProgress?.(
      `Recupero numeri… ${numeri.length}/${quantita} (rilasciati ${Math.min(releasedCount, quantita)}/${quantita}, tentativo ${attempt + 1}/${maxRetries})`,
    );

    for (let p = startProgressivo + 1; p <= cappedMaxProgressivo && numeri.length < quantita; p++) {
      if (retrievedProgressivi.has(p)) continue;

      try {
        const lottoRes = await leggiLotto(cliente, codiceBlocco, formatProgressivo(p));
        if (!lottoRes.success) continue;

        const lottoNumbers = extractFirNumbers(lottoRes.data);
        if (lottoNumbers.length === 0) continue;

        retrievedProgressivi.add(p);

        for (const firNum of lottoNumbers) {
          if (!knownNumbers.has(firNum)) {
            knownNumbers.add(firNum);
            numeri.push(firNum);
          }
        }
      } catch {
        // specific progressivo not ready yet, retry on next cycle
      }
    }
  }

  return {
    numeri: numeri.slice(0, quantita),
    transazione_id: transazioneId,
    pending: numeri.length === 0,
    partial: numeri.length > 0 && numeri.length < quantita,
  };
}

/** Extract FIR numbers from any response shape */
function extractFirNumbers(data: unknown): string[] {
  return Array.from(collectFirNumbers(data));
}
