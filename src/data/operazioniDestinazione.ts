/**
 * Operazioni di recupero (Allegato C) e smaltimento (Allegato B) alla Parte IV
 * del D.Lgs. 152/2006: sono gli unici codici di destinazione accettati dal RENTRI
 * (R1–R13, D1–D15).
 */
export const OPERAZIONI_DESTINAZIONE: { codice: string; descrizione: string }[] = [
  { codice: "R1", descrizione: "Utilizzo principale come combustibile o per produrre energia" },
  { codice: "R2", descrizione: "Rigenerazione / recupero di solventi" },
  { codice: "R3", descrizione: "Riciclo / recupero di sostanze organiche non usate come solventi" },
  { codice: "R4", descrizione: "Riciclo / recupero dei metalli e dei composti metallici" },
  { codice: "R5", descrizione: "Riciclo / recupero di altre sostanze inorganiche" },
  { codice: "R6", descrizione: "Rigenerazione degli acidi o delle basi" },
  { codice: "R7", descrizione: "Recupero dei prodotti che servono a ridurre l'inquinamento" },
  { codice: "R8", descrizione: "Recupero dei prodotti provenienti dai catalizzatori" },
  { codice: "R9", descrizione: "Rigenerazione o altri reimpieghi degli oli" },
  { codice: "R10", descrizione: "Spandimento sul suolo a beneficio dell'agricoltura o dell'ecologia" },
  { codice: "R11", descrizione: "Utilizzo di rifiuti ottenuti da operazioni da R1 a R10" },
  { codice: "R12", descrizione: "Scambio di rifiuti per sottoporli a operazioni da R1 a R11" },
  { codice: "R13", descrizione: "Messa in riserva prima di operazioni da R1 a R12" },
  { codice: "D1", descrizione: "Deposito sul o nel suolo (es. discarica)" },
  { codice: "D2", descrizione: "Trattamento in ambiente terrestre" },
  { codice: "D3", descrizione: "Iniezioni in profondità" },
  { codice: "D4", descrizione: "Lagunaggio" },
  { codice: "D5", descrizione: "Messa in discarica specialmente allestita" },
  { codice: "D6", descrizione: "Scarico nell'ambiente idrico eccetto l'immersione" },
  { codice: "D7", descrizione: "Immersione, compreso il seppellimento nel sottosuolo marino" },
  { codice: "D8", descrizione: "Trattamento biologico" },
  { codice: "D9", descrizione: "Trattamento fisico-chimico" },
  { codice: "D10", descrizione: "Incenerimento a terra" },
  { codice: "D11", descrizione: "Incenerimento in mare" },
  { codice: "D12", descrizione: "Deposito permanente" },
  { codice: "D13", descrizione: "Raggruppamento preliminare prima di operazioni da D1 a D12" },
  { codice: "D14", descrizione: "Ricondizionamento preliminare prima di operazioni da D1 a D13" },
  { codice: "D15", descrizione: "Deposito preliminare prima di operazioni da D1 a D14" },
];

/** "R 13", "r13", "R013" → "R13"; stringa vuota se non è un codice valido. */
export function normalizzaCodiceOperazione(raw: string): string {
  const m = String(raw ?? "").toUpperCase().match(/^\s*([RD])\s*0*(\d{1,2})\s*$/);
  if (!m) return "";
  const codice = `${m[1]}${Number(m[2])}`;
  return OPERAZIONI_DESTINAZIONE.some((o) => o.codice === codice) ? codice : "";
}
