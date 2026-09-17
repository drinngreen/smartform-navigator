import {
  inviaOperazioneRentriCustom,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

/**
 * Lettura SOLA LETTURA dei movimenti già registrati sul RENTRI per un registro
 * cronologico (usata per il registro di intermediazione). Nessun invio.
 *
 * Schema reale RENTRI (/dati-registri/v1.0/operatore/{registro}/movimenti):
 *   { annotazioni: "Rif. FIR XNQLK030854BP", annullato, rettificato,
 *     riferimenti: { causale_operazione_cs, data_ora_registrazione,
 *                    numero_registrazione: { anno, identificativo, progressivo } },
 *     rifiuto: { codice_eer, quantita: { valore, unita_misura } } }
 */

export interface MovimentoRegistroRentri {
  /** Numero FIR normalizzato (solo lettere/cifre) estratto dalle annotazioni. */
  chiaveFir: string | null;
  numeroFirGrezzo: string | null;
  progressivo: number | null;
  identificativo: string | null;
  anno: number | null;
  dataRegistrazione: string | null;
  causale: string | null;
  eer: string | null;
  quantitaKg: number | null;
  annullato: boolean;
  raw: unknown;
}

type Rec = Record<string, unknown>;

const asRec = (v: unknown): Rec | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null;

export const normalizzaNumeroFir = (v: unknown): string =>
  String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** Estrae il numero formulario dalle annotazioni tipo "Rif. FIR XNQLK030854BP". */
export function estraiNumeroFir(annotazioni: unknown): string | null {
  const testo = String(annotazioni ?? "");
  const match = testo.match(/([A-Z]{5}\s?\d{6}\s?[A-Z]{2})/i);
  return match ? match[1].trim() : null;
}

export function interpretaMovimentoRegistro(row: Rec): MovimentoRegistroRentri {
  const rif = asRec(row.riferimenti) ?? {};
  const numReg = asRec(rif.numero_registrazione) ?? {};
  const rifiuto = asRec(row.rifiuto) ?? {};
  const quantita = asRec(rifiuto.quantita) ?? {};
  const numeroFir = estraiNumeroFir(row.annotazioni);

  return {
    chiaveFir: numeroFir ? normalizzaNumeroFir(numeroFir) : null,
    numeroFirGrezzo: numeroFir,
    progressivo: numReg.progressivo === undefined ? null : Number(numReg.progressivo),
    identificativo: numReg.identificativo ? String(numReg.identificativo) : null,
    anno: numReg.anno === undefined ? null : Number(numReg.anno),
    dataRegistrazione: rif.data_ora_registrazione ? String(rif.data_ora_registrazione) : null,
    causale: rif.causale_operazione_cs ? String(rif.causale_operazione_cs) : null,
    eer: rifiuto.codice_eer ? String(rifiuto.codice_eer) : null,
    quantitaKg: quantita.valore === undefined ? null : Number(quantita.valore),
    annullato: Boolean(row.annullato),
    raw: row,
  };
}

export function estraiElencoMovimenti(data: unknown): Rec[] {
  if (Array.isArray(data)) return data.filter((x) => x && typeof x === "object") as Rec[];
  const rec = asRec(data);
  if (!rec) return [];
  for (const key of ["movimenti", "items", "elenco", "content", "risultati", "data", "value"]) {
    const found = estraiElencoMovimenti(rec[key]);
    if (found.length) return found;
  }
  return [];
}

export interface MovimentiRegistroResult {
  response: RentriVpsResponse;
  movimenti: MovimentoRegistroRentri[];
}

/** Movimenti già trasmessi al RENTRI per un registro e periodo. Sola lettura. */
export async function leggiMovimentiRegistroRentri(
  cliente: RentriCliente,
  registroId: string,
  dataDa: string,
  dataA: string,
): Promise<MovimentiRegistroResult> {
  const response = await inviaOperazioneRentriCustom(
    cliente,
    "GET",
    `/dati-registri/v1.0/operatore/${registroId}/movimenti?dataRegistrazioneDa=${dataDa}&dataRegistrazioneA=${dataA}`,
    null,
  );
  return {
    response,
    movimenti: estraiElencoMovimenti(response.data).map(interpretaMovimentoRegistro),
  };
}
