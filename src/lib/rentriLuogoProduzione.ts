import { elenchiComuni, normalizzaNomeComune as norm } from "@/lib/comuneIstat";

/**
 * Luogo di produzione (cantiere) per il RENTRI.
 * Separa via, civico, CAP e comune e NON indovina mai il comune dal solo CAP
 * (molti CAP sono condivisi da più comuni: l'indovinare cambiava il cantiere).
 */
export interface LuogoProduzioneRentri {
  indirizzo: string;
  civico?: string;
  cap?: string;
  citta: { comune_id: string };
}

const VIA = /^(VIA|VIALE|V\.LE|CORSO|C\.SO|PIAZZA|P\.ZZA|PIAZZALE|STRADA|STR\.?|STRADALE|REGIONE|REG\.?|LOCALITA'?|LOCALITÀ|LOC\.?|FRAZIONE|FRAZ\.?|BORGATA|VICOLO|LARGO|LUNGO\w*|CONTRADA|SS|SP|SR|STATALE|PROVINCIALE)$/i;
const CIVICO = /^(N\.?|NR\.?)?\d+[A-Z]?(\/[A-Z0-9]+)?$/i;

function levenshtein(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export async function luogoProduzioneRentri(
  testo: string, comune = "", provincia = "", cap = "",
): Promise<LuogoProduzioneRentri | undefined> {
  const raw = String(testo ?? "").trim();
  if (!raw && !comune.trim() && !cap.trim()) return undefined;
  if (!raw) throw new Error("Indirizzo del cantiere mancante: completa il luogo di produzione");

  const { byName, byCap } = await elenchiComuni();
  const sigle = new Set(Object.keys(byName).filter((k) => k.includes("|")).map((k) => k.split("|")[1]));

  const tok = raw.replace(/[,;]/g, " ").replace(/\s+-\s+/g, " ").split(/\s+/).filter(Boolean);
  const usati = new Set<number>();

  // CAP
  let capTrovato = cap.trim();
  tok.forEach((t, i) => { if (/^\d{5}$/.test(t)) { if (!capTrovato) capTrovato = t; usati.add(i); } });

  // Sigla provincia: "(TO)" oppure ultima parola di 2 lettere
  let sigla = provincia.trim().toUpperCase();
  tok.forEach((t, i) => {
    const m = t.match(/^\(([A-Za-z]{2})\)$/);
    if (m) { if (!sigla) sigla = m[1].toUpperCase(); usati.add(i); }
  });
  const ultimo = tok.length - 1;
  if (ultimo > 0 && /^[A-Za-z]{2}$/.test(tok[ultimo]) && sigle.has(tok[ultimo].toUpperCase()) && !usati.has(ultimo)) {
    if (!sigla) sigla = tok[ultimo].toUpperCase();
    usati.add(ultimo);
  }

  const kwIdx = tok.findIndex((t) => VIA.test(t));
  const civIdx = tok.findIndex((t, i) => i > kwIdx && CIVICO.test(t) && !/^\d{5}$/.test(t));

  let comuneId = "";
  const cerca = (k: string) => (sigla ? byName[`${k}|${sigla}`] : byName[k]) || "";

  if (comune.trim()) {
    comuneId = cerca(norm(comune)) || byName[norm(comune)] || "";
    if (!comuneId) throw new Error(`Comune del cantiere «${comune}» non riconosciuto: controlla nome e provincia`);
    // Togli dal testo il nome del comune se è stato ripetuto nell'indirizzo
    const nc = norm(comune);
    for (let n = 4; n >= 1; n--) for (let i = 0; i + n <= tok.length; i++)
      if (norm(tok.slice(i, i + n).join("")) === nc) for (let j = i; j < i + n; j++) usati.add(j);
  } else {
    // Cerca il nome del comune nel testo (fuori dalla parte via+civico)
    type Cand = { i: number; n: number; id: string };
    const cand: Cand[] = [];
    for (let n = 4; n >= 1; n--) for (let i = 0; i + n <= tok.length; i++) {
      const idx = Array.from({ length: n }, (_, k) => i + k);
      if (idx.some((j) => usati.has(j) || /\d/.test(tok[j]))) continue;
      if (kwIdx >= 0 && civIdx > kwIdx && i >= kwIdx && i < civIdx) continue;
      if (kwIdx >= 0 && civIdx < 0 && i >= kwIdx && i <= kwIdx + 1) continue; // senza civico: esclusi solo tipo via + primo nome
      const id = cerca(norm(tok.slice(i, i + n).join("")));
      if (id) cand.push({ i, n, id });
    }
    const capIdx = tok.findIndex((t) => /^\d{5}$/.test(t));
    const vicino = (c: Cand) => capIdx >= 0 && (c.i + c.n === capIdx || c.i === capIdx + 1);
    const scelto = cand.find(vicino) ?? cand.sort((a, b) => b.n - a.n || b.i - a.i)[0];
    if (scelto) {
      comuneId = scelto.id;
      for (let j = scelto.i; j < scelto.i + scelto.n; j++) usati.add(j);
    } else if (capTrovato && byCap[capTrovato]) {
      // Solo CAP: accettato SOLO se nel testo c'è il nome del comune (anche con un errore di battitura)
      const id = byCap[capTrovato];
      const nomi = Object.entries(byName).filter(([k, v]) => v === id && !k.includes("|")).map(([k]) => k);
      for (let n = 3; n >= 1 && !comuneId; n--) for (let i = 0; i + n <= tok.length && !comuneId; i++) {
        if (tok.slice(i, i + n).some((t) => /\d/.test(t))) continue;
        const k = norm(tok.slice(i, i + n).join(""));
        if (k.length >= 4 && nomi.some((nome) => levenshtein(k, nome) <= 2)) {
          comuneId = id;
          for (let j = i; j < i + n; j++) usati.add(j);
        }
      }
    }
    if (!comuneId) throw new Error("Comune del cantiere non riconosciuto: completa il luogo di produzione con comune, provincia e CAP");
  }

  // Via e civico
  const inizio = kwIdx >= 0 ? kwIdx : 0;
  const resto = tok.map((t, i) => ({ t, i })).filter(({ i }) => i >= inizio && !usati.has(i));
  const ci = resto.findIndex(({ t }) => CIVICO.test(t));
  const via = (ci >= 0 ? resto.slice(0, ci) : resto).map(({ t }) => t).join(" ").trim();
  const civico = ci >= 0 ? resto[ci].t.replace(/^(N\.?|NR\.?)/i, "") : "";
  if (!via) throw new Error("Via del cantiere mancante: scrivi l'indirizzo del luogo di produzione");

  return {
    indirizzo: via,
    ...(civico ? { civico } : {}),
    ...(capTrovato ? { cap: capTrovato } : {}),
    citta: { comune_id: comuneId },
  };
}
