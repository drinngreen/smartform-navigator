// Descrizione CER "completa": capitolo + sottocapitolo + voce
import { CER_CATALOG } from "./cerCatalog";

export const CER_CAPITOLI: Record<string, string> = {
  "01": "Rifiuti derivanti da prospezione, estrazione da miniera o cava, nonché dal trattamento fisico o chimico di minerali",
  "02": "Rifiuti prodotti da agricoltura, orticoltura, acquacoltura, selvicoltura, caccia e pesca, trattamento e preparazione di alimenti",
  "03": "Rifiuti della lavorazione del legno e della produzione di pannelli, mobili, polpa, carta e cartone",
  "04": "Rifiuti della lavorazione di pelli e pellicce, e dell'industria tessile",
  "05": "Rifiuti della raffinazione del petrolio, purificazione del gas naturale e trattamento pirolitico del carbone",
  "06": "Rifiuti dei processi chimici inorganici",
  "07": "Rifiuti dei processi chimici organici",
  "08": "Rifiuti della produzione, formulazione, fornitura ed uso di rivestimenti (pitture, vernici e smalti vetrati), adesivi, sigillanti e inchiostri per stampa",
  "09": "Rifiuti dell'industria fotografica",
  "10": "Rifiuti prodotti da processi termici",
  "11": "Rifiuti prodotti dal trattamento chimico superficiale e dal rivestimento di metalli ed altri materiali; idrometallurgia non ferrosa",
  "12": "Rifiuti prodotti dalla lavorazione e dal trattamento fisico e meccanico superficiale di metalli e plastica",
  "13": "Oli esauriti e residui di combustibili liquidi",
  "14": "Solventi organici, refrigeranti e propellenti di scarto",
  "15": "Rifiuti di imballaggio, assorbenti, stracci, materiali filtranti e indumenti protettivi",
  "16": "Rifiuti non specificati altrimenti nell'elenco",
  "17": "Rifiuti delle operazioni di costruzione e demolizione (compreso il terreno proveniente da siti contaminati)",
  "18": "Rifiuti prodotti dal settore sanitario e veterinario o da attività di ricerca collegate",
  "19": "Rifiuti prodotti da impianti di trattamento dei rifiuti, impianti di trattamento delle acque reflue fuori sito, nonché dalla potabilizzazione dell'acqua e dalla sua preparazione per uso industriale",
  "20": "Rifiuti urbani (rifiuti domestici e assimilabili prodotti da attività commerciali e industriali nonché dalle istituzioni) inclusi i rifiuti della raccolta differenziata",
};

export const CER_SOTTOCAPITOLI: Record<string, string> = {
  "1201": "Rifiuti prodotti dalla lavorazione e dal trattamento fisico e meccanico superficiale di metalli e plastiche",
  "1203": "Rifiuti prodotti da processi di sgrassatura ad acqua e vapore",
  "1301": "Scarti di oli per circuiti idraulici",
  "1302": "Scarti di olio motore, olio per ingranaggi e oli lubrificanti",
  "1501": "Imballaggi (compresi i rifiuti urbani di imballaggio oggetto di raccolta differenziata)",
  "1502": "Assorbenti, materiali filtranti, stracci e indumenti protettivi",
  "1601": "Veicoli fuori uso appartenenti a diversi modi di trasporto e rifiuti prodotti dallo smantellamento di veicoli fuori uso e dalla manutenzione di veicoli",
  "1602": "Rifiuti provenienti da apparecchiature elettriche ed elettroniche",
  "1606": "Batterie ed accumulatori",
  "1701": "Cemento, mattoni, mattonelle e ceramiche",
  "1702": "Legno, vetro e plastica",
  "1703": "Miscele bituminose, catrame di carbone e prodotti contenenti catrame",
  "1704": "Metalli (incluse le loro leghe)",
  "1705": "Terra (compresa quella escavata da siti contaminati), rocce e fanghi di dragaggio",
  "1706": "Materiali isolanti e materiali da costruzione contenenti amianto",
  "1708": "Materiali da costruzione a base di gesso",
  "1709": "Altri rifiuti dell'attività di costruzione e demolizione",
  "1902": "Rifiuti prodotti da trattamenti chimico-fisici dei rifiuti (comprese decromatazione, decianizzazione, neutralizzazione)",
  "1912": "Rifiuti prodotti dal trattamento meccanico dei rifiuti (ad esempio selezione, triturazione, compattazione, riduzione in pellet) non specificati altrimenti",
  "2001": "Frazioni oggetto di raccolta differenziata (tranne 15 01)",
  "2002": "Rifiuti prodotti da giardini e parchi (inclusi i rifiuti provenienti da cimiteri)",
  "2003": "Altri rifiuti urbani",
};

const clean = (cer: unknown) => String(cer ?? "").replace(/\D/g, "");

/** Ritorna la descrizione estesa del CER: voce + sottocapitolo + capitolo. */
export function getCerDescrizioneCompleta(cer: unknown): string {
  const code = clean(cer);
  if (!code) return "";
  const voce = CER_CATALOG.find((c) => c.codice === code)?.descrizione;
  const sotto = CER_SOTTOCAPITOLI[code.slice(0, 4)];
  const capitolo = CER_CAPITOLI[code.slice(0, 2)];
  const parti = [voce, sotto, capitolo].filter(Boolean) as string[];
  if (!parti.length) return `Rifiuto CER ${code}`;
  return parti.join(" — ");
}

/**
 * Descrizione da usare nelle giacenze e nelle stampe ufficiali.
 * Il catalogo normativo prevale sempre sui testi salvati nei movimenti, che
 * possono essere vuoti, abbreviati o contenere note tecniche di rettifica.
 */
export function getCerDescrizionePerStampa(cer: unknown, descrizioneSalvata?: string | null): string {
  const code = clean(cer);
  if (!code) return "";

  const presenteNelCatalogo = CER_CATALOG.some((entry) => entry.codice === code);
  if (presenteNelCatalogo) return getCerDescrizioneCompleta(code);

  const salvata = descrizioneSalvata?.trim() ?? "";
  const descrizioneTecnica = /rettifica di allineamento|allineamento ufficiale|import registro|storno/i.test(salvata);
  return salvata && !descrizioneTecnica ? salvata : `Rifiuto CER ${code}`;
}
