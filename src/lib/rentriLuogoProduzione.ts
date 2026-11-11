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

  // Ogni parola conserva la forma scritta (con virgole e trattini) per ricomporre
  // l'indirizzo fedelmente; la forma pulita serve solo a riconoscere CAP, comune e civico.
  const orig: string[] = [];
  const tok: string[] = [];
  for (const parola of raw.replace(/([,;])(?=\S)/g, "$1 ").split(/\s+/).filter(Boolean)) {
    const pulita = parola.replace(/^[,;]+|[,;]+$/g, "");
    if (!pulita || pulita === "-") {
      if (orig.length) orig[orig.length - 1] += pulita === "-" ? " -" : parola;
      continue;
    }
    orig.push(parola);
    tok.push(pulita);
  }
  const usati = new Set<number>();

  // CAP
  let capTrovato = cap.trim();
  tok.forEach((t, i) => { if (/^\d{5}$/.test(t)) { if (!capTrovato) capTrovato = t; usati.add(i); } });

  // Sigla provincia: "(TO)" oppure ultima parola di 2 lettere.
  // Una provincia scritta per esteso («Torino») non è una sigla: non va usata come filtro.
  let sigla = provincia.trim().toUpperCase();
  if (sigla && !sigle.has(sigla)) sigla = "";
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
    comuneId = cerca(norm(comune)) || "";
    if (!comuneId && sigla && byName[norm(comune)]) {
      // Il comune esiste ma in un'altra provincia: non si cambia la provincia scritta.
      throw new Error(`Il comune del cantiere «${comune}» non risulta in provincia di ${sigla}: controlla comune e provincia`);
    }
    if (!comuneId) comuneId = byName[norm(comune)] || "";
    if (!comuneId) {
      // Nome abbreviato (es. «San Lazzaro» → «San Lazzaro di Savena»): accettato solo se unico
      // per provincia, oppure confermato dal CAP indicato.
      const nc = norm(comune);
      const ids = new Set<string>();
      for (const [k, v] of Object.entries(byName)) {
        const [nome, sg] = k.split("|");
        if (!nome.startsWith(nc) || nome === nc) continue;
        if (sigla ? sg === sigla : !k.includes("|")) ids.add(v);
      }
      let lista = [...ids];
      if (lista.length > 1 && capTrovato && byCap[capTrovato]) lista = lista.filter((id) => id === byCap[capTrovato]);
      if (lista.length === 1) comuneId = lista[0];
      else throw new Error(`Comune del cantiere «${comune}» non riconosciuto: scrivi il nome completo del comune (es. «San Lazzaro di Savena») e la provincia`);
    }
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

  // Civico: il primo numero dopo il tipo di via (senza tipo di via, il primo numero libero)
  let civPos = kwIdx >= 0
    ? civIdx
    : tok.findIndex((t, i) => !usati.has(i) && CIVICO.test(t) && !/^\d{5}$/.test(t));
  // Se dopo il civico è scritto altro (es. «capannone B»), il civico resta al suo posto
  // nel testo: separarlo cambierebbe l'ordine di ciò che è stato scritto.
  if (civPos >= 0 && tok.some((_, i) => i > civPos && !usati.has(i))) civPos = -1;
  const civico = civPos >= 0 ? tok[civPos].replace(/^(N\.?|NR\.?)/i, "") : "";
  if (civPos >= 0) {
    usati.add(civPos);
    // «n. 5» / «N° 5»: la sigla del numero civico non resta nell'indirizzo
    if (civPos > 0 && /^(N|NR|NUM|N°)\.?$/i.test(tok[civPos - 1]) && !usati.has(civPos - 1)) usati.add(civPos - 1);
  }

  // Indirizzo fedele a quanto scritto: ragione sociale o nome del cantiere, via e note
  // restano come sono; si tolgono solo CAP, comune, sigla provincia e civico, che il
  // RENTRI riceve nei propri campi.
  const via = orig
    .filter((_, i) => !usati.has(i))
    .join(" ")
    .replace(/^[\s,;-]+|[\s,;-]+$/g, "")
    .replace(/\s+/g, " ");
  if (!via) throw new Error("Via del cantiere mancante: scrivi l'indirizzo del luogo di produzione");

  return {
    indirizzo: via,
    ...(civico ? { civico } : {}),
    ...(capTrovato ? { cap: capTrovato } : {}),
    citta: { comune_id: comuneId },
  };
}
