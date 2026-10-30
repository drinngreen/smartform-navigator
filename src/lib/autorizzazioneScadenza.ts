/** Scadenza = data di emissione + durata in anni (accetta decimali, es. 0,5 = 6 mesi). */
export function calcolaScadenza(emissione: string, durataAnni: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(emissione)) return null;
  const n = Number(String(durataAnni).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const [y, m, d] = emissione.split("-").map(Number);
  const mesi = Math.round(n * 12);
  const dt = new Date(Date.UTC(y, m - 1 + mesi, d));
  // Se il giorno non esiste nel mese finale (es. 31), usa l'ultimo giorno del mese
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}
