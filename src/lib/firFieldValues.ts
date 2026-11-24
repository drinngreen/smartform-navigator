/** Valori digitati nei formulari: numeri italiani e date nel fuso operativo. */

/** Data civile italiana nel formato richiesto dai campi date (YYYY-MM-DD). */
export function dataOggiLocale(adesso = new Date()): string {
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(adesso);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Converte una quantità digitata in italiano senza troncarla (parseFloat)
 * né scambiarne il separatore delle migliaia. Vuoto = non indicato; un valore
 * presente ma invalido o non positivo blocca il salvataggio/invio.
 */
export function parseQuantitaFir(value: unknown, label = "Quantità"): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().replace(/[\s\u00a0]/g, "");
  if (!raw) return null;

  let normalized = raw;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    // L'ultimo separatore è quello decimale; l'altro separa le migliaia.
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    if ((raw.match(/,/g) ?? []).length !== 1) {
      throw new Error(`${label} non valida: usa un solo separatore decimale.`);
    }
    normalized = raw.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
    // In italiano 20.000 significa ventimila; per i decimali si usa 20,5.
    normalized = raw.replace(/\./g, "");
  }

  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    throw new Error(`${label} non valida: inserisci solo il numero, ad esempio 1250,5.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`${label} non valida.`);
  if (parsed <= 0) throw new Error(`${label} deve essere maggiore di zero.`);
  return parsed;
}

/** Kg hanno la precedenza se entrambi sono indicati; altrimenti si usano i litri. */
export function quantitaPerRentri(data: {
  quantita?: unknown;
  quantitaLitri?: unknown;
}): { valore: number; unita_misura: "kg" | "l" } {
  const kg = parseQuantitaFir(data.quantita, "Quantità (Kg)");
  if (kg !== null) return { valore: kg, unita_misura: "kg" };
  const litri = parseQuantitaFir(data.quantitaLitri, "Quantità (Litri)");
  if (litri !== null) return { valore: litri, unita_misura: "l" };
  throw new Error("Quantità mancante: inserisci i chilogrammi oppure i litri, senza valori presunti.");
}
