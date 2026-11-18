/**
 * Ordine delle autorizzazioni proposte nei formulari: prima quelle in corso di
 * validità (la più recente per data di rilascio), poi quelle senza scadenza
 * registrata, in fondo quelle scadute (la scaduta più di recente per prima).
 *
 * Il database ordina le date "decrescenti" mettendo in cima le righe senza
 * scadenza, e una vecchia autorizzazione ancora formalmente valida poteva
 * precedere quella rinnovata: per questo l'ordine si decide qui.
 */
export interface RigaAutorizzazione {
  data_inizio?: string | null;
  data_scadenza?: string | null;
}

const oggiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const giorno = (v: unknown) => String(v ?? "").slice(0, 10);

/** 0 = valida, 1 = scadenza non registrata, 2 = scaduta. */
export const statoAutorizzazione = (a: RigaAutorizzazione, oggi = oggiIso()): 0 | 1 | 2 => {
  const s = giorno(a.data_scadenza);
  if (!s) return 1;
  return s >= oggi ? 0 : 2;
};

export const isAutorizzazioneScaduta = (a: RigaAutorizzazione, oggi = oggiIso()) => statoAutorizzazione(a, oggi) === 2;

export const ordinaAutorizzazioni = <T extends RigaAutorizzazione>(rows: T[], oggi = oggiIso()): T[] =>
  [...rows].sort((a, b) => {
    const sa = statoAutorizzazione(a, oggi);
    const sb = statoAutorizzazione(b, oggi);
    if (sa !== sb) return sa - sb;
    if (sa === 2) return giorno(b.data_scadenza).localeCompare(giorno(a.data_scadenza));
    // Valide o senza scadenza: la più recente (rinnovo) prima, poi la scadenza più lontana
    const perRilascio = giorno(b.data_inizio).localeCompare(giorno(a.data_inizio));
    if (perRilascio !== 0) return perRilascio;
    return giorno(b.data_scadenza).localeCompare(giorno(a.data_scadenza));
  });

/** Prima autorizzazione da proporre (eventualmente tra quelle che soddisfano `preferisci`). */
export const scegliAutorizzazione = <T extends RigaAutorizzazione>(
  rows: T[],
  preferisci?: (a: T) => boolean,
  oggi = oggiIso(),
): T | null => {
  const ordinate = ordinaAutorizzazioni(rows, oggi);
  if (preferisci) {
    const preferite = ordinate.filter(preferisci);
    // La preferenza (es. titolo di impianto) vale solo se non porta a una scaduta
    // quando esiste un'alternativa valida.
    if (preferite.length && (statoAutorizzazione(preferite[0], oggi) <= statoAutorizzazione(ordinate[0], oggi))) return preferite[0];
  }
  return ordinate[0] ?? null;
};
