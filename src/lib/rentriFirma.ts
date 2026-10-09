/**
 * Regole condivise per l'invio dei formulari al RENTRI quando la firma
 * elettronica via API non è ancora disponibile: il programma compila e invia,
 * la firma (partenza o accettazione) si fa nell'app RENTRI.
 */

/** Interruttore firma elettronica via API. Spento finché non arriva la configurazione. */
export const FIRMA_API_ATTIVA = false;

/** Toglie dalla via il " - CAP Città (PR)" finale, che il RENTRI vuole separato. */
export function splitIndirizzoRentri(raw: string): { indirizzo: string; cap: string } {
  const testo = String(raw ?? "").trim();
  const cap = testo.match(/\b(\d{5})\b/)?.[1] ?? "";
  let via = testo;
  if (cap) {
    const idx = testo.indexOf(cap);
    via = testo.slice(0, idx).replace(/[\s,–-]+$/, "").trim();
  }
  return { indirizzo: via || testo, cap };
}

/** Nome e cognome del conducente: mai inventare il cognome copiando il nome. */
export function splitConducente(nome: string, cognome: string, completo: string): { nome: string; cognome: string } {
  const n = String(nome ?? "").trim();
  const c = String(cognome ?? "").trim();
  if (n && c) return { nome: n, cognome: c };
  const parts = String(completo ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Conducente: scrivi nome e cognome (ad esempio «MARIO ROSSI»). Il RENTRI li vuole entrambi.");
  }
  return { nome: parts[0], cognome: parts.slice(1).join(" ") };
}

/** Scostamento di Europe/Rome rispetto a UTC per una data, formato "+02:00". */
function offsetRoma(data: string, ora: string): string {
  const utc = new Date(`${data}T${ora}:00Z`);
  if (Number.isNaN(utc.getTime())) return "+01:00";
  const roma = new Date(utc.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const base = new Date(utc.toLocaleString("en-US", { timeZone: "UTC" }));
  const min = Math.round((roma.getTime() - base.getTime()) / 60000);
  const h = String(Math.floor(Math.abs(min) / 60)).padStart(2, "0");
  const m = String(Math.abs(min) % 60).padStart(2, "0");
  return `${min >= 0 ? "+" : "-"}${h}:${m}`;
}

/** Data e ora italiane, con il fuso esplicito, indipendente dal computer usato. */
export function dataOraRoma(data: string, ora: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(data ?? "")) ? data : new Date().toISOString().slice(0, 10);
  const o = /^\d{2}:\d{2}$/.test(String(ora ?? "")) ? ora : "08:00";
  return `${d}T${o}:00${offsetRoma(d, o)}`;
}

/** Il testo di vidimazione lo aggiunge il RENTRI da sé: non va nelle annotazioni. */
export function pulisciAnnotazioni(raw: string): string {
  return String(raw ?? "")
    .replace(/Validazione virtuale:[^\n]*?(MULTY PROGET S\.R\.L\.|NIYOL[^\n]*?S\.R\.L\.|\n|$)/gi, "")
    .replace(/Vid\.\s*Vir\.[^\n]*/gi, "")
    .trim();
}
