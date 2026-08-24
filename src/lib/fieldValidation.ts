/**
 * Validazioni "errore lapalissiano" per la compilazione dei moduli.
 * Ritornano null se il valore è valido (o vuoto), altrimenti il messaggio da mostrare in rosso.
 */

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const clean = (v: string) => String(v ?? "").trim();

const CF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CF_ODD: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const CF_EVEN: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12,
  N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

/** Partita IVA: 11 cifre + check digit (algoritmo Luhn italiano). */
export function isValidPartitaIva(value: string): boolean {
  const v = onlyDigits(clean(value));
  if (v.length !== 11) return false;
  if (/^0+$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let n = Number(v[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** Codice fiscale persona fisica: 16 caratteri + carattere di controllo. */
export function isValidCodiceFiscalePF(value: string): boolean {
  const v = clean(value).toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = v[i];
    sum += i % 2 === 0 ? CF_ODD[c] : CF_EVEN[c];
  }
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[sum % 26] === v[15];
}

/** Campo "Codice Fiscale / P.IVA": accetta CF 16 o PIVA/CF numerico 11. */
export function validateCfPiva(value: string): string | null {
  const raw = clean(value).toUpperCase().replace(/[\s.\-]/g, "");
  if (!raw) return null;
  if (raw.startsWith("IT") && raw.length === 13) return validateCfPiva(raw.slice(2));
  if (/^\d+$/.test(raw)) {
    if (raw.length !== 11) return `Partita IVA di ${raw.length} cifre: devono essere 11`;
    if (!isValidPartitaIva(raw)) return "Partita IVA non valida (cifra di controllo errata)";
    return null;
  }
  if (raw.length !== 16) return `Codice fiscale di ${raw.length} caratteri: devono essere 16 (o 11 cifre per P.IVA)`;
  if (!isValidCodiceFiscalePF(raw)) return "Codice fiscale non valido (formato o carattere di controllo errato)";
  return null;
}

/** Solo partita IVA. */
export function validatePartitaIva(value: string): string | null {
  const raw = clean(value).toUpperCase().replace(/[\s.\-]/g, "").replace(/^IT/, "");
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return "La partita IVA deve contenere solo cifre";
  if (raw.length !== 11) return `Partita IVA di ${raw.length} cifre: devono essere 11`;
  if (!isValidPartitaIva(raw)) return "Partita IVA non valida (cifra di controllo errata)";
  return null;
}

/** Data di nascita: non prima del 1920, non nel futuro, età minima 14 anni. */
export function validateDataNascita(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  const d = parseDate(v);
  if (!d) return "Data non valida (usa il formato GG/MM/AAAA)";
  if (d.getFullYear() < 1920) return "Data di nascita precedente al 1920: verifica il dato";
  const now = new Date();
  if (d.getTime() > now.getTime()) return "Data di nascita nel futuro";
  const eta = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (eta < 14) return "Età inferiore a 14 anni: verifica il dato";
  return null;
}

/** Data generica di documento: anno plausibile (>= 1990) e non oltre 1 anno nel futuro. */
export function validateDataDocumento(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  const d = parseDate(v);
  if (!d) return "Data non valida (usa il formato GG/MM/AAAA)";
  if (d.getFullYear() < 1990) return `Anno ${d.getFullYear()} non plausibile: verifica il dato`;
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() + 1);
  if (d.getTime() > limite.getTime()) return "Data troppo lontana nel futuro";
  return null;
}

export function parseDate(value: string): Date | null {
  const v = clean(value);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(v);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    return build(year, Number(m[2]), Number(m[1]));
  }
  return null;
}

function build(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function validateCap(value: string): string | null {
  const v = onlyDigits(clean(value));
  if (!clean(value)) return null;
  if (v.length !== 5 || v !== clean(value).replace(/\s/g, "")) return "Il CAP deve essere di 5 cifre";
  return null;
}

export function validateProvincia(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  if (!/^[A-Za-z]{2}$/.test(v)) return "La provincia deve essere la sigla di 2 lettere (es. TO)";
  return null;
}

export function validateEmail(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v)) return "Indirizzo email non valido";
  return null;
}

export function validateTelefono(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  const digits = onlyDigits(v);
  if (!/^[+0-9\s().\-/]+$/.test(v)) return "Il telefono contiene caratteri non ammessi";
  if (digits.length < 6) return "Numero di telefono troppo corto";
  if (digits.length > 15) return "Numero di telefono troppo lungo";
  return null;
}

export function validateTarga(value: string): string | null {
  const v = clean(value).toUpperCase().replace(/[\s-]/g, "");
  if (!v) return null;
  if (v.length < 5 || v.length > 8) return "Targa non plausibile (5-8 caratteri, es. AB123CD)";
  if (!/^[A-Z0-9]+$/.test(v)) return "La targa può contenere solo lettere e numeri";
  return null;
}

export function validateQuantita(value: string): string | null {
  const v = clean(value).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "Quantità non numerica";
  if (n < 0) return "La quantità non può essere negativa";
  if (n === 0) return "La quantità non può essere zero";
  if (n > 1_000_000) return "Quantità fuori scala: verifica il dato";
  return null;
}

/**
 * Validazione automatica in base all'etichetta del campo.
 * Usata dai form generici (formulario FIR) per segnalare in rosso gli errori evidenti.
 */
export function autoValidateByLabel(label: string, value: string): string | null {
  const l = String(label || "").toLowerCase();
  if (!clean(value)) return null;
  if (l.includes("nascita")) return validateDataNascita(value);
  if (l.includes("p.iva") || l.includes("partita iva")) {
    return l.includes("codice fiscale") || l.includes("cf") ? validateCfPiva(value) : validatePartitaIva(value);
  }
  if (l.includes("codice fiscale") || /\bcf\b/.test(l)) return validateCfPiva(value);
  if (/\bcap\b/.test(l)) return validateCap(value);
  if (l.includes("provincia")) return validateProvincia(value);
  if (l.includes("email") || l.includes("pec")) return validateEmail(value);
  if (l.includes("telefono") || l.includes("cellulare")) return validateTelefono(value);
  if (l.includes("targa")) return validateTarga(value);
  if (l.includes("data")) return validateDataDocumento(value);
  if (l.includes("quantit") || l.includes("peso") || l.includes(" kg")) return validateQuantita(value);
  return null;
}
