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
