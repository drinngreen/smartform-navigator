/** Ordinamento e ricerca della tendina targhe dei formulari.
 *
 *  In anagrafica l'autista di un mezzo sta in `cliente_targhe.conducente_default`
 *  nel formato importato da Prometeo "COGNOME NOME" (es. "AHMETOVIC BRAJM"),
 *  mentre la tendina era ordinata per targa: per trovare un autista bisognava
 *  conoscerne il mezzo. Qui il cognome (prima parola) diventa la chiave di
 *  ordinamento e la ricerca accetta sia il cognome sia la targa. */

/** Upper-case, accenti e punteggiatura rimossi: "Via dell'Age, 3" → "VIA DELL AGE 3". */
export const normalizzaTargaTesto = (v: unknown): string =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Cognome dell'autista: prima parola di `conducente_default` ("" se assente). */
export const cognomeDaConducente = (conducente: unknown): string =>
  normalizzaTargaTesto(conducente).split(" ").filter(Boolean)[0] ?? "";

export interface RigaTargaBase {
  targa?: string | null;
  conducente_default?: string | null;
}

/** Ordina per cognome alfabetico; i mezzi senza autista restano in coda per targa. */
export const ordinaTarghePerCognome = <T extends RigaTargaBase>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    const ca = cognomeDaConducente(a.conducente_default);
    const cb = cognomeDaConducente(b.conducente_default);
    if (!ca && cb) return 1;
    if (ca && !cb) return -1;
    const perCognome = ca.localeCompare(cb, "it");
    if (perCognome !== 0) return perCognome;
    const perTarga = normalizzaTargaTesto(a.targa).localeCompare(normalizzaTargaTesto(b.targa), "it");
    if (perTarga !== 0) return perTarga;
    return normalizzaTargaTesto(a.conducente_default).localeCompare(normalizzaTargaTesto(b.conducente_default), "it");
  });

/** Filtro per cognome e/o targa: ogni parola della query deve comparire nel testo
 *  "targa + autista" ("ahmet br" → AHMETOVIC BRAJM · DT852GM). */
export const filtraTarghe = <T extends RigaTargaBase>(rows: T[], query: string): T[] => {
  const termini = normalizzaTargaTesto(query).split(" ").filter(Boolean);
  if (termini.length === 0) return rows;
  return rows.filter((r) => {
    const testo = `${normalizzaTargaTesto(r.targa)} ${normalizzaTargaTesto(r.conducente_default)}`;
    return termini.every((t) => testo.includes(t));
  });
};
