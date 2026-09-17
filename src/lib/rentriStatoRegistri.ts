/**
 * Stato di trasmissione dei movimenti verso i registri cronologici RENTRI.
 *
 * Regole fissate con il cliente il 17/09/2026:
 * - lo stato "inviato" si legge SEMPRE dal RENTRI, mai da elenchi locali;
 * - tutti i movimenti con data fino al 31/07/2026 incluso sono già stati
 *   trasmessi dal terminale: risultano inviati (storico) e non sono più
 *   selezionabili, così non si generano doppioni;
 * - restano da inviare solo i movimenti successivi a quella data che sul
 *   registro RENTRI non risultano presenti.
 *
 * Nessuna funzione di questo file scrive dati: è sola lettura e classificazione.
 */

/** Ultimo giorno già trasmesso manualmente dal terminale (incluso). */
export const CONFINE_STORICO_INVIATI = "2026-07-31";

export type StatoTrasmissione = "STORICO" | "REGISTRATO" | "DA_INVIARE";

/** Vero se il movimento ricade nel periodo già trasmesso a mano. */
export function isPeriodoStorico(
  data: string | null | undefined,
  confine: string = CONFINE_STORICO_INVIATI,
): boolean {
  const giorno = String(data ?? "").slice(0, 10);
  if (!giorno) return false;
  return giorno <= confine;
}

/**
 * Chiave di confronto con il registro RENTRI quando il numero formulario non
 * compare nelle annotazioni: giorno + codice EER + chilogrammi.
 */
export function chiaveDatiMovimento(
  data: string | null | undefined,
  eer: string | null | undefined,
  kg: number | null | undefined,
): string | null {
  const giorno = String(data ?? "").slice(0, 10);
  const codice = String(eer ?? "").replace(/[^0-9]/g, "");
  if (!giorno || !codice || kg === null || kg === undefined || Number.isNaN(Number(kg))) return null;
  return `${giorno}|${codice}|${Number(kg).toFixed(3)}`;
}

export interface EsitoTrasmissione {
  stato: StatoTrasmissione;
  progressivi: string[];
  identificativi: string[];
  /** Testo mostrato all'utente. */
  etichetta: string;
}

const STORICO: EsitoTrasmissione = {
  stato: "STORICO",
  progressivi: [],
  identificativi: [],
  etichetta: "INVIATO (storico)",
};

/**
 * Determina lo stato di una riga: prima il confine storico, poi la presenza
 * reale sul registro RENTRI (per numero formulario o per data/EER/kg).
 */
export function statoRigaRegistro(params: {
  data: string | null | undefined;
  eer: string | null | undefined;
  kg: number | null | undefined;
  chiaveFir: string | null | undefined;
  perFir: Map<string, EsitoTrasmissione>;
  perDati: Map<string, EsitoTrasmissione>;
  confine?: string;
}): EsitoTrasmissione | null {
  const { data, eer, kg, chiaveFir, perFir, perDati, confine } = params;
  if (isPeriodoStorico(data, confine)) return STORICO;
  if (chiaveFir) {
    const perNumero = perFir.get(chiaveFir);
    if (perNumero) return perNumero;
  }
  const chiave = chiaveDatiMovimento(data, eer, kg);
  if (chiave) {
    const perValori = perDati.get(chiave);
    if (perValori) return perValori;
  }
  return null;
}
