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
  | "TRANSAZIONE_FIR";

export interface RentriVpsRequest {
  cliente: RentriCliente;
  tipo_operazione: RentriTipoOperazione;
  payload: Record<string, unknown>;
}

export interface RentriVpsResponse {
  success: boolean;
  status: number;
  data: unknown;
  error?: string;
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

/* ── Async Vidimazione orchestrator ── */

export interface VidimazioneAsyncResult {
  numeri: string[];
  transazione_id?: string;
  pending: boolean;
  partial: boolean;
}

function formatProgressivo(value: number | string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? raw.padStart(6, "0") : raw;
}

/**
 * Orchestrates the full async vidimazione flow:
 * 1. Read LISTA_BLOCCHI to get current count
 * 2. Send VIDIMAZIONE request
 * 3. If numbers returned immediately → use them
 * 4. Otherwise poll LOTTO for new numbers
 */
export async function vidimaFIRAsync(
  cliente: RentriCliente,
  quantita: number,
  codiceBlocco: string,
  numIscrSito?: string,
  onProgress?: (msg: string) => void,
): Promise<VidimazioneAsyncResult> {
  // Step 1: Get current block state
  onProgress?.("Lettura stato blocco…");
  const blocchiRes = await listaBlocchi(cliente);
  let startProgressivo = 0;

  if (blocchiRes.success && Array.isArray((blocchiRes.data as any)?.blocchi)) {
    const blocchi = (blocchiRes.data as any).blocchi as any[];
    const blocco = blocchi.find((b: any) => b.codice_blocco === codiceBlocco);
    if (blocco) {
      startProgressivo = Number(blocco.numero_fir_vidimati || blocco.progressivo || 0);
    }
  } else if (blocchiRes.success && Array.isArray(blocchiRes.data)) {
    const blocco = (blocchiRes.data as any[]).find((b: any) => b.codice_blocco === codiceBlocco);
    if (blocco) {
      startProgressivo = Number(blocco.numero_fir_vidimati || blocco.progressivo || 0);
    }
  }

  // Step 2: Send VIDIMAZIONE
  onProgress?.("Invio richiesta vidimazione…");
  const vidRes = await richiestaVidimazione(cliente, quantita, codiceBlocco, numIscrSito);
  const vidData = (vidRes.data as any) || {};

  // Step 3: Check for immediate numbers
  const immediati = extractFirNumbers(vidData);
  const transazioneId = vidData.transazione_id || vidData.transazioneId || vidData.id_transazione || undefined;

  if (immediati.length >= quantita) {
    return { numeri: immediati, transazione_id: transazioneId, pending: false, partial: false };
  }

  // Step 4: Async — poll LOTTO for remaining numbers (even if we got some immediate ones)
  if (!transazioneId && !vidRes.success) {
    // Real error, not async
    if (immediati.length > 0) {
      return { numeri: immediati, transazione_id: transazioneId, pending: false, partial: true };
    }
    return { numeri: [], transazione_id: undefined, pending: false, partial: false };
  }

  onProgress?.("Richiesta accettata, recupero numeri in corso…");
  const numeri: string[] = [...immediati]; // Start with any immediate numbers
  const maxRetries = 60; // RENTRI può rendere disponibili i numeri con diversi minuti di ritardo

  for (let attempt = 0; attempt < maxRetries && numeri.length < quantita; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 4000));
    }
    onProgress?.(`Recupero numeri… ${numeri.length}/${quantita} (tentativo ${attempt + 1}/${maxRetries})`);

    for (let p = startProgressivo + numeri.length + 1; p <= startProgressivo + quantita; p++) {
      if (numeri.length >= quantita) break;
      try {
        const lottoRes = await leggiLotto(cliente, codiceBlocco, formatProgressivo(p));
        if (lottoRes.success) {
          const lottoData = (lottoRes.data as any) || {};
          const firNum = lottoData.numero_fir || lottoData.numero || lottoData.firNumber || "";
          if (firNum && typeof firNum === "string" && firNum.trim().length > 0) {
            const normalized = firNum.trim().replace(/\s+/g, " ").toUpperCase();
            if (!numeri.includes(normalized)) {
              numeri.push(normalized);
            }
          }
        }
      } catch {
        // LOTTO not ready yet, will retry
      }
    }
  }

  return {
    numeri,
    transazione_id: transazioneId,
    pending: numeri.length === 0,
    partial: numeri.length > 0 && numeri.length < quantita,
  };
}

/** Extract FIR numbers from any response shape */
function extractFirNumbers(data: any): string[] {
  if (!data || typeof data !== "object") return [];
  for (const key of ["numeri", "firNumbers", "numbers", "formulari"]) {
    if (Array.isArray(data[key])) return data[key].map((n: any) => String(n));
    if (data.data && Array.isArray(data.data[key])) return data.data[key].map((n: any) => String(n));
  }
  if (typeof data.numero === "string") return [data.numero];
  if (typeof data.firNumber === "string") return [data.firNumber];
  // Deep search for string arrays
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v as string[];
  }
  return [];
}
