/**
 * Caratteristiche di pericolo HP (Hazardous Properties) — Allegato III
 * Direttiva quadro rifiuti UE, come aggiornato dai Reg. UE 1357/2014 e 2017/997.
 *
 * Le HP sono riferite al RIFIUTO (non alle sostanze): le frasi H (H314, H400, H350...)
 * sono le indicazioni di pericolo CLP delle sostanze/miscele contenute nel rifiuto.
 * Un rifiuto può presentare più HP contemporaneamente.
 */

export interface HpCaratteristica {
  codice: string;
  nome: string;
  significato: string;
}

export const HP_CARATTERISTICHE: HpCaratteristica[] = [
  { codice: "HP1", nome: "Esplosivo", significato: "Può esplodere o sviluppare gas con effetti dannosi" },
  { codice: "HP2", nome: "Comburente", significato: "Può provocare o intensificare la combustione di altri materiali" },
  { codice: "HP3", nome: "Infiammabile", significato: "Può incendiarsi facilmente" },
  { codice: "HP4", nome: "Irritante", significato: "Può causare irritazione cutanea o danni/irritazione agli occhi" },
  { codice: "HP5", nome: "STOT / per aspirazione", significato: "Può danneggiare organi bersaglio o risultare nocivo se aspirato" },
  { codice: "HP6", nome: "Tossicità acuta", significato: "Può provocare effetti tossici acuti per ingestione, contatto o inalazione" },
  { codice: "HP7", nome: "Cancerogeno", significato: "Può causare o aumentare l'incidenza del cancro" },
  { codice: "HP8", nome: "Corrosivo", significato: "Può provocare corrosione della pelle" },
  { codice: "HP9", nome: "Infettivo", significato: "Contiene microrganismi o tossine capaci di provocare malattie" },
  { codice: "HP10", nome: "Tossico per la riproduzione", significato: "Può danneggiare fertilità, funzione sessuale o sviluppo della progenie" },
  { codice: "HP11", nome: "Mutageno", significato: "Può provocare mutazioni genetiche" },
  { codice: "HP12", nome: "Liberazione di gas a tossicità acuta", significato: "A contatto con acqua o acidi può liberare gas tossici" },
  { codice: "HP13", nome: "Sensibilizzante", significato: "Può provocare sensibilizzazione cutanea o respiratoria" },
  { codice: "HP14", nome: "Ecotossico", significato: "Può produrre rischi immediati o differiti per uno o più comparti ambientali" },
  { codice: "HP15", nome: "Pericolo successivo", significato: "Non manifesta direttamente una HP, ma può svilupparla in seguito" },
];

export const HP_CODES = HP_CARATTERISTICHE.map((h) => h.codice);

const HP_BY_CODE = new Map(HP_CARATTERISTICHE.map((h) => [h.codice, h]));

export function getHp(codice: string): HpCaratteristica | undefined {
  return HP_BY_CODE.get(normalizeHpCode(codice) || "");
}

/** "hp 4", "Hp-04", "HP4" → "HP4"; ritorna null se non riconosciuto. */
export function normalizeHpCode(raw: string): string | null {
  const m = String(raw || "").toUpperCase().replace(/\s|-|_/g, "").match(/^HP0?(\d{1,2})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 15) return null;
  return `HP${n}`;
}

/** Normalizza e deduplica una lista (o stringa separata da virgole) di HP. */
export function normalizeHpList(input: string | string[] | null | undefined): string[] {
  const parts = Array.isArray(input) ? input : String(input || "").split(/[,;\s]+/);
  const out: string[] = [];
  for (const p of parts) {
    const c = normalizeHpCode(p);
    if (c && !out.includes(c)) out.push(c);
  }
  return out.sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10));
}

export function formatHpLabel(codice: string): string {
  const hp = getHp(codice);
  return hp ? `${hp.codice} — ${hp.nome}` : codice;
}

/** Un CER con asterisco (o flag pericoloso) richiede almeno una HP dichiarata. */
export function isCerPericoloso(codice: string): boolean {
  return String(codice || "").includes("*");
}
