import { CER_CATALOG } from "@/data/cerCatalog";

/** Codici CER validi (6 cifre, senza spazi/punti) presenti nel catalogo europeo. */
const CER_CODES = new Set(CER_CATALOG.map((entry) => normalizeCerCode(entry.codice)));

export function normalizeCerCode(value: unknown): string {
  return String(value ?? "").replace(/[^0-9*]/g, "").replace(/\*$/, "");
}

/** True se il codice è di 6 cifre ed esiste nel catalogo CER/EER. */
export function isValidCerCode(value: unknown): boolean {
  const code = normalizeCerCode(value);
  if (!/^\d{6}$/.test(code)) return false;
  return CER_CODES.has(code);
}
