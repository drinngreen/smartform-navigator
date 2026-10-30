/**
 * Stati fisici del rifiuto per i formulari.
 *
 * Elenco richiesto dall'ufficio il 30/10/2026 (in questo ordine):
 * Fangoso, In polvere o pulverulento, Liquido, Solido, Vischioso sciropposo.
 *
 * `code` è il valore interno del formulario (già in uso in archivio),
 * `rentri` è il codice ufficiale RENTRI (S/SP/FP/L/VS/GA) che viene inviato,
 * `dbValue` è la dicitura salvata nella colonna stato_fisico.
 *
 * Le diciture vecchie restano riconosciute in lettura (STATI_FISICI_LEGACY)
 * così i formulari già compilati si aprono senza perdere il valore, ma non
 * compaiono più nella tendina.
 */

export interface StatoFisico {
  code: string;
  label: string;
  dbValue: string;
  rentri: string;
}

export const STATI_FISICI: StatoFisico[] = [
  { code: "3", label: "Fangoso", dbValue: "fangoso", rentri: "FP" },
  { code: "1", label: "In polvere o pulverulento", dbValue: "in polvere o pulverulento", rentri: "SP" },
  { code: "4", label: "Liquido", dbValue: "liquido", rentri: "L" },
  { code: "2", label: "Solido", dbValue: "solido", rentri: "S" },
  { code: "7", label: "Vischioso sciropposo", dbValue: "vischioso sciropposo", rentri: "VS" },
];

/**
 * Diciture già presenti in archivio → codice equivalente.
 * Non sono più selezionabili nella tendina: servono solo a rileggere i
 * formulari compilati prima del 30/10/2026.
 */
export const STATI_FISICI_LEGACY: Record<string, string> = {
  "solido pulverulento": "1",
  "solido polverulento": "1",
  "solido non pulverulento": "2",
  "solido non polverulento": "2",
  "fangoso palabile": "3",
  aeriforme: "5",
  altro: "6",
};

/** Codici legacy senza un equivalente nella nuova tendina (rotondità di salvataggio). */
const LEGACY_LABEL_BY_CODE: Record<string, string> = {
  "5": "aeriforme",
  "6": "altro",
};

const norm = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, " ");

const BY_CODE = new Map(STATI_FISICI.map((s) => [s.code, s]));
const BY_DB = new Map(STATI_FISICI.map((s) => [s.dbValue, s]));

/** Etichetta da mostrare in tendina a partire dal codice interno. */
export function statoFisicoLabel(code: unknown): string {
  const key = norm(code);
  return BY_CODE.get(key)?.label ?? LEGACY_LABEL_BY_CODE[key] ?? "";
}

/** Dicitura da salvare in archivio a partire dal codice interno. */
export function statoFisicoDbValue(code: unknown): string | null {
  const key = norm(code);
  const found = BY_CODE.get(key);
  if (found) return found.dbValue;
  const legacy = Object.entries(LEGACY_LABEL_BY_CODE).find(([c]) => c === key);
  return legacy ? legacy[1] : null;
}

/** Codice interno a partire da una dicitura (nuova o vecchia) o da un codice. */
export function statoFisicoCode(value: unknown): string {
  const key = norm(value);
  if (!key) return "";
  if (BY_CODE.has(key)) return key;
  const byDb = BY_DB.get(key);
  if (byDb) return byDb.code;
  return STATI_FISICI_LEGACY[key] ?? "";
}

/** Codice ufficiale RENTRI a partire da codice interno, dicitura o codice già valido. */
export function statoFisicoRentri(value: unknown): string {
  const key = norm(value);
  if (!key) return "";
  const byCode = BY_CODE.get(key);
  if (byCode) return byCode.rentri;
  const byDb = BY_DB.get(key);
  if (byDb) return byDb.rentri;
  const legacyCode = STATI_FISICI_LEGACY[key];
  if (legacyCode) return BY_CODE.get(legacyCode)?.rentri ?? "";
  const upper = String(value ?? "").trim().toUpperCase();
  if (["S", "SP", "FP", "L", "VS", "GA"].includes(upper)) return upper;
  return "";
}

/** Opzioni della tendina: etichette richieste, in ordine. */
export const STATI_FISICI_OPTIONS = STATI_FISICI.map((s) => ({ value: s.code, label: s.label }));
