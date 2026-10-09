import {
  inviaOperazioneRentriCustom,
  RENTRI_CF_SOGGETTO,
  rentriConfigKey,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

/**
 * Lettura SOLA LETTURA dei formulari RENTRI in cui la nostra società compare
 * come INTERMEDIARIO. Nessun invio, nessuna scrittura: solo GET al RENTRI.
 *
 * Schema reale restituito da RENTRI (/formulari/v1.0):
 *   { numero_fir, codice_eer, quantita, unita_misura, stato,
 *     data_emissione, data_creazione,
 *     produttore: {...}, destinatari: [...], trasportatori: [...], intermediari: [...] }
 */

export interface FirIntermediarioRow {
  numeroFir: string;
  data: string | null;
  produttore: string | null;
  destinatario: string | null;
  trasportatore: string | null;
  intermediario: string | null;
  intermediarioCf: string | null;
  eer: string | null;
  quantitaKg: number | null;
  stato: string | null;
  /** true solo se nel formulario risulta il nostro codice fiscale come intermediario. */
  siamoIntermediario: boolean;
  raw: unknown;
}

export interface MovimentoIntermediazioneRentri {
  id: string;
  cer: string | null;
  descrizione_rifiuto: string | null;
  quantita_kg: number | null;
  data_movimento: string | null;
  tipo_movimento: "CARICO";
  numero_fir: string;
  produttore_denominazione: string | null;
  destinatario_denominazione: string | null;
  stato_movimento: "rentri_intermediario";
}

const soloCifreLettere = (v: unknown) =>
  String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const testo = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

type Rec = Record<string, unknown>;

const asRec = (v: unknown): Rec | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null;

const asArray = (v: unknown): Rec[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Rec[]) : [];

/** Elenco soggetti sotto una chiave che può essere oggetto singolo o array. */
export function elencoSoggetti(row: Rec, chiavi: string[]): Rec[] {
  const out: Rec[] = [];
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase();
    if (!chiavi.some((c) => key.includes(c))) continue;
    const obj = asRec(v);
    if (obj) out.push(obj);
    out.push(...asArray(v));
  }
  return out;
}

const denominazione = (s: Rec | undefined): string | null =>
  s ? testo(s.denominazione ?? s.ragione_sociale ?? s.nome) : null;

/** Estrae gli elementi formulario da una risposta RENTRI, comunque impacchettati. */
export function estraiElencoFormulari(data: unknown): Rec[] {
  if (Array.isArray(data)) return asArray(data);
  const rec = asRec(data);
  if (!rec) return [];
  for (const key of ["formulari", "items", "elenco", "content", "risultati", "data", "value"]) {
    const found = estraiElencoFormulari(rec[key]);
    if (found.length) return found;
  }
  return [];
}

/** Interpreta un singolo formulario RENTRI nella riga mostrata in tabella. */
export function interpretaFormulario(row: Rec, cfNostro: string): FirIntermediarioRow {
  const intermediari = elencoSoggetti(row, ["intermediar"]);
  const cfTarget = soloCifreLettere(cfNostro);
  const nostro = intermediari.find((i) => soloCifreLettere(i.codice_fiscale) === cfTarget);
  const primo = nostro ?? intermediari[0];

  const quantita = row.quantita ?? asRec(row.rifiuto)?.quantita ?? null;
  const quantitaValore = asRec(quantita)?.valore ?? quantita;

  return {
    numeroFir: String(row.numero_fir ?? row.numeroFir ?? row.identificativo ?? "").trim(),
    data: testo(row.data_emissione ?? row.data_creazione ?? row.data),
    produttore: denominazione(asRec(row.produttore) ?? elencoSoggetti(row, ["produttor"])[0]),
    destinatario: denominazione(elencoSoggetti(row, ["destinatar"])[0]),
    trasportatore: denominazione(elencoSoggetti(row, ["trasportator"])[0]),
    intermediario: denominazione(primo),
    intermediarioCf: primo ? testo(primo.codice_fiscale) : null,
    eer: testo(row.codice_eer ?? row.eer ?? row.cer),
    quantitaKg:
      quantitaValore === null || quantitaValore === undefined || quantitaValore === ""
        ? null
        : Number(quantitaValore),
    stato: testo(row.stato),
    siamoIntermediario: Boolean(cfTarget) && Boolean(nostro),
    raw: row,
  };
}

export interface ElencoFirIntermediarioResult {
  response: RentriVpsResponse;
  righe: FirIntermediarioRow[];
}

/** Filtra per data (il RENTRI ignora i parametri di periodo su questo endpoint). */
export function filtraPerPeriodo(
  righe: FirIntermediarioRow[],
  dataDa?: string,
  dataA?: string,
): FirIntermediarioRow[] {
  return righe.filter((r) => {
    if (!r.data) return true;
    const giorno = String(r.data).slice(0, 10);
    if (dataDa && giorno < dataDa) return false;
    if (dataA && giorno > dataA) return false;
    return true;
  });
}

/**
 * Candidati per il registro d'intermediazione: esclusivamente FIR digitali
 * letti dal RENTRI dove il CF della società compare davvero tra gli intermediari.
 */
export function movimentiIntermediazioneDaFirRentri(
  righe: FirIntermediarioRow[],
): MovimentoIntermediazioneRentri[] {
  return righe
    .filter((r) => r.siamoIntermediario && Boolean(r.numeroFir))
    .map((r) => ({
      id: soloCifreLettere(r.numeroFir),
      cer: r.eer,
      descrizione_rifiuto: [r.produttore, r.destinatario].filter(Boolean).join(" → ") || null,
      quantita_kg: r.quantitaKg,
      data_movimento: r.data ? String(r.data).slice(0, 10) : null,
      tipo_movimento: "CARICO",
      numero_fir: r.numeroFir,
      produttore_denominazione: r.produttore,
      destinatario_denominazione: r.destinatario,
      stato_movimento: "rentri_intermediario",
    }));
}

/**
 * Elenco dei formulari visibili al soggetto sul RENTRI,
 * con evidenza di quelli dove risultiamo INTERMEDIARIO. Sola lettura.
 */
export async function elencoFirIntermediario(
  cliente: RentriCliente,
  opts: { dataDa?: string; dataA?: string; codiceFiscale?: string } = {},
): Promise<ElencoFirIntermediarioResult> {
  const key = rentriConfigKey(cliente);
  const cf = opts.codiceFiscale || RENTRI_CF_SOGGETTO[key] || "";
  const params = new URLSearchParams({ identificativo_soggetto: cf });
  const { response, items } = await leggiTutteLePagineFormulari(
    cliente, `/formulari/v1.0?${params.toString()}`, opts.dataDa || "2026-09-01", opts.dataA || undefined,
  );
  const tutte = items.map((r) => interpretaFormulario(r, cf));
  return { response, righe: filtraPerPeriodo(tutte, opts.dataDa, opts.dataA) };
}

/**
 * Legge l'elenco formulari RENTRI per finestre di date (sola lettura).
 * Verificato il 09/10/2026: il RENTRI ignora page/page_size ma rispetta
 * data_emissione_da / data_emissione_a. Si legge quindi a finestre di 7 giorni;
 * se una finestra è molto piena si rilegge giorno per giorno.
 */
export async function leggiTutteLePagineFormulari(
  cliente: RentriCliente,
  basePath: string,
  dal = "2026-09-22",
  al = new Date().toISOString().slice(0, 10),
): Promise<{ response: RentriVpsResponse; items: Rec[]; pagine: number }> {
  const visti = new Set<string>();
  const items: Rec[] = [];
  let response: RentriVpsResponse | null = null;
  let pagine = 0;
  const base = basePath.replace(/[?&]data_emissione_(da|a)=[^&]*/g, "");
  const sep = base.includes("?") ? "&" : "?";
  const add = (d: string, n: number) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const leggi = async (da: string, a: string): Promise<Rec[] | null> => {
    const res = await inviaOperazioneRentriCustom(cliente, "GET", `${base}${sep}data_emissione_da=${da}&data_emissione_a=${a}`, null);
    pagine++;
    if (!res.success) { if (!response) response = res; return null; }
    if (!response || !response.success) response = res;
    return estraiElencoFormulari(res.data);
  };
  for (let da = dal; da <= al; da = add(da, 7)) {
    const a = add(da, 6) > al ? al : add(da, 6);
    let lista = await leggi(da, a);
    if (lista === null) { if (!items.length && pagine === 1) return { response: response!, items, pagine }; throw new Error(response?.userMessage || response?.error || `Lettura RENTRI non riuscita (${da} → ${a})`); }
    if (lista.length >= 50 && da !== a) {
      lista = [];
      for (let g = da; g <= a; g = add(g, 1)) lista.push(...((await leggi(g, g)) ?? []));
    }
    for (const r of lista) {
      const k = soloCifreLettere(r.numero_fir ?? r.numeroFir ?? JSON.stringify(r));
      if (visti.has(k)) continue;
      visti.add(k); items.push(r);
    }
  }
  return { response: response!, items, pagine };
}
