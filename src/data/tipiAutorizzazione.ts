/**
 * Le 9 tipologie ufficiali di autorizzazione previste dal formulario
 * (stesse voci della tendina del gestionale ufficiale) con il codice
 * corrispondente atteso dal RENTRI (rentri-enum-1.0.xsd, TipoAutorizzazione).
 */
export interface TipoAutorizzazioneUfficiale {
  /** Dicitura estesa mostrata all'utente e riportata sul formulario. */
  testo: string;
  /** Etichetta breve per le tendine strette. */
  breve: string;
  /** Codice ufficiale RENTRI. */
  codice: string;
}

export const TIPI_AUTORIZZAZIONE_UFFICIALI: TipoAutorizzazioneUfficiale[] = [
  {
    breve: "Art. 208 — autorizzazione unica",
    testo:
      "Autorizzazione unica per i nuovi impianti di recupero/smaltimento - art. 208 decreto legislativo 3 aprile 2006, n. 152.",
    codice: "RecSmalArt208",
  },
  {
    breve: "Art. 208 c.15 — impianti mobili",
    testo:
      "Autorizzazione all'esercizio di operazioni di recupero e/o smaltimento dei rifiuti con impianti mobili - art. 208, comma 15 del decreto legislativo 3 aprile 2006, n. 152.",
    codice: "RecSmalImpMobiliArt208",
  },
  {
    breve: "Art. 211 — ricerca e sperimentazione",
    testo:
      "Autorizzazione alla realizzazione di impianti di ricerca e sperimentazione - art. 211 del decreto legislativo 3 aprile 2006, n. 152.",
    codice: "RicercaSperimentazione",
  },
  {
    breve: "AIA — artt. 29-ter e 213",
    testo:
      "Autorizzazione Integrata Ambientale - artt. 29-ter e 213 del decreto legislativo 3 aprile 2006, n. 152.",
    codice: "AIA",
  },
  {
    breve: "Artt. 214-216 — procedura semplificata / AUA",
    testo:
      "Operazioni di recupero mediante Comunicazione in 'Procedura Semplificata' - artt. 214 e 216 del decreto legislativo 3 aprile 2006, n. 152 e autorizzazione unica ambientale (AUA) – Decreto Presidente Repubblica n. 59 del 13 marzo 2013.",
    codice: "RecProcSemplificata",
  },
  {
    breve: "Art. 242 — operazioni di bonifica",
    testo:
      "Provvedimenti che autorizzano le operazioni di bonifica, ai sensi del comma 7 dell'art. 242 del decreto legislativo 3 aprile 2006, n. 152.",
    codice: "OpBonifica",
  },
  {
    breve: "Art. 191 — autorizzazioni straordinarie",
    testo:
      "Autorizzazioni 'straordinarie' art. 191 del decreto legislativo 3 aprile 2006, n. 152 (attività svolte in regime di ordinanza contingibile e urgente).",
    codice: "Straordinario",
  },
  {
    breve: "Art. 110 c.3 — comunicazione acque reflue",
    testo:
      "Comunicazione al trattamento di rifiuti e materiali in impianti di trattamento di acque reflue urbane - art. 110 c.3 del D.Lgs. 152/2006.",
    codice: "ComTrattamentoAcqueReflue",
  },
  {
    breve: "Art. 110 c.2 — autorizzazione acque reflue",
    testo:
      "Autorizzazione al trattamento di rifiuti liquidi in impianti di trattamento di acque reflue urbane - artt. 110 c.2 con provvedimento secondo artt. 208 oppure 29-ter e 213 del D.Lgs. 152/2006.",
    codice: "AutTrattamentoAcqueReflue",
  },
];

/** Codice RENTRI a partire dalla dicitura ufficiale scelta nella tendina. */
export function codiceDaTestoUfficiale(testo: string): string {
  const v = String(testo ?? "").trim().toLowerCase();
  return TIPI_AUTORIZZAZIONE_UFFICIALI.find((t) => t.testo.toLowerCase() === v)?.codice ?? "";
}
