/**
 * Lettura (SOLA LETTURA) della chiusura fatta dal destinatario sul RENTRI.
 *
 * Perché esiste: il formulario lo chiude il destinatario, firmando dal proprio
 * gestionale. Il trasportatore non può firmare al suo posto. Quando il
 * destinatario è un soggetto terzo, l'app deve solo *leggere* dal RENTRI se la
 * chiusura è avvenuta e recuperarne i dati (peso verificato, esito, data/ora),
 * senza inviare nulla.
 */
import { ricercaFir, type RentriCliente } from "@/lib/rentriVpsApi";

export interface ChiusuraDestinatarioRentri {
  /** true solo se il RENTRI riporta l'accettazione firmata dal destinatario. */
  chiusa: boolean;
  esito: "accettato" | "parziale" | "respinto" | null;
  pesoKg: number | null;
  dataOraArrivo: string | null;
  motivazione: string | null;
  raw: unknown;
}

const VUOTO: ChiusuraDestinatarioRentri = {
  chiusa: false,
  esito: null,
  pesoKg: null,
  dataOraArrivo: null,
  motivazione: null,
  raw: null,
};

/** Cerca in profondità il primo oggetto che contiene una delle chiavi indicate. */
export function trovaNodo(data: unknown, chiavi: string[]): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = trovaNodo(item, chiavi);
      if (found) return found;
    }
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (chiavi.some((k) => record[k] !== undefined && record[k] !== null)) return record;
  for (const value of Object.values(record)) {
    const found = trovaNodo(value, chiavi);
    if (found) return found;
  }
  return null;
}

const numero = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export function interpretaChiusura(data: unknown): ChiusuraDestinatarioRentri {
  const nodo = trovaNodo(data, ["accettazione", "esito_conferimento", "dati_arrivo"]);
  if (!nodo) return { ...VUOTO, raw: data };

  const accettazione =
    (nodo.accettazione as Record<string, unknown> | undefined) ??
    (trovaNodo(nodo.dati_arrivo ?? nodo, ["esito_conferimento"]) as Record<string, unknown> | null) ??
    nodo;

  const esitoRaw = String(accettazione?.esito_conferimento ?? "").toUpperCase();
  const esito =
    esitoRaw.includes("RESPINT") ? "respinto"
    : esitoRaw.includes("PARZIAL") ? "parziale"
    : esitoRaw.includes("ACCETTAT") ? "accettato"
    : null;

  const quantita = (accettazione?.quantita_ricevuta ?? accettazione?.quantita) as
    | Record<string, unknown>
    | number
    | undefined;
  const pesoKg =
    typeof quantita === "object" && quantita !== null
      ? numero((quantita as Record<string, unknown>).valore)
      : numero(quantita);

  const dataOraArrivo =
    (accettazione?.data_ora_arrivo as string | undefined) ??
    (accettazione?.data_ora_ricezione as string | undefined) ??
    (nodo.data_ora_arrivo as string | undefined) ??
    null;

  const motivazione = (accettazione?.motivazione as string | undefined) ?? null;

  return {
    chiusa: Boolean(esito),
    esito,
    pesoKg,
    dataOraArrivo: dataOraArrivo ? String(dataOraArrivo) : null,
    motivazione: motivazione ? String(motivazione) : null,
    raw: data,
  };
}

/** Interroga il RENTRI in sola lettura: nessun invio, nessuna firma. */
export async function leggiChiusuraDestinatario(
  cliente: RentriCliente,
  numeroFir: string,
): Promise<ChiusuraDestinatarioRentri> {
  const res = await ricercaFir(cliente, numeroFir);
  if (!res.success) throw new Error(res.error || `RENTRI non raggiungibile (${res.status})`);
  return interpretaChiusura(res.data);
}
