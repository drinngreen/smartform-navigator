/**
 * Risoluzione del codice ISTAT del comune (`comune_id`), obbligatorio per il RENTRI
 * negli indirizzi di produttore e destinatario.
 *
 * L'elenco completo viene caricato solo quando serve (import dinamico), per non
 * appesantire l'avvio dell'applicazione.
 */

let cache: { byName: Record<string, string>; byCap: Record<string, string> } | null = null;

async function load() {
  if (!cache) {
    const mod = await import("@/data/comuniIstat");
    cache = { byName: mod.COMUNI_BY_NAME, byCap: mod.COMUNI_BY_CAP };
  }
  return cache;
}

function norm(v: string): string {
  return v
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
}

/**
 * Cerca il codice ISTAT partendo da un testo libero (indirizzo o nome comune)
 * ed eventualmente dal CAP. Restituisce stringa vuota se non è determinabile:
 * non viene mai inventato un codice.
 */
export async function resolveComuneId(testo: string, cap?: string, sigla?: string): Promise<string> {
  const { byName, byCap } = await load();

  if (sigla && testo) {
    const direct = byName[`${norm(testo)}|${sigla.toUpperCase()}`];
    if (direct) return direct;
  }

  const capPulito = (cap || testo.match(/\b(\d{5})\b/)?.[1] || "").trim();

  // Nome comune fra parentesi oppure dopo il CAP: "Via X 1, 10100 Torino (TO)"
  if (testo) {
    const conSigla = testo.match(/(?:\d{5}\s+)?([A-Za-zÀ-ÿ'\s.-]{2,40})\s*\(([A-Za-z]{2})\)/);
    if (conSigla) {
      const k = byName[`${norm(conSigla[1])}|${conSigla[2].toUpperCase()}`];
      if (k) return k;
    }
    const dopoCap = testo.match(/\d{5}\s+([A-Za-zÀ-ÿ'\s.-]{2,40})/);
    if (dopoCap) {
      const k = byName[norm(dopoCap[1])];
      if (k) return k;
    }
    const solo = byName[norm(testo)];
    if (solo) return solo;
  }

  if (capPulito && byCap[capPulito]) return byCap[capPulito];
  return "";
}
