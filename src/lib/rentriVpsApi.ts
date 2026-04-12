import { supabase } from "@/lib/supabaseClient";

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
}

export interface RentriVpsResponse {
  success: boolean;
  status: number;
  data: unknown;
  error?: string;
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

export async function inviaOperazioneRentri(
  request: RentriVpsRequest
): Promise<RentriVpsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("rentri-vps-proxy", {
      body: request,
    });

    if (error) {
      return { success: false, status: 0, data: null, error: error.message };
    }

    return data as RentriVpsResponse;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, status: 0, data: null, error: message };
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
