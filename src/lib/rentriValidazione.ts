/**
 * Normalizzazione e validazione pre-invio del payload FIR verso RENTRI.
 *
 * Le regole derivano dalle risposte REALI del RENTRI (model_state, loggati in
 * rentri_operazioni): numero_fir blocco+6 cifre, CF con checksum valido,
 * stato_fisico sulla codifica ufficiale (S/SP/FP/L/VS/GA), provenienza U/S,
 * comune_id obbligatorio negli indirizzi.
 */

import { isValidCerCode } from "@/lib/cerValidation";

export const STATO_FISICO_RENTRI = ["S", "SP", "FP", "L", "VS", "GA"] as const;

/** Alias liberi → codici ufficiali RENTRI (verificati sulle risposte reali). */
const STATO_FISICO_ALIAS: Record<string, string> = {
  s: "S",
  solido: "S",
  "solido non pulverulento": "S",
  "solido non polverulento": "S",
  sp: "SP",
  "solido pulverulento": "SP",
  "solido polverulento": "SP",
  polverulento: "SP",
  fp: "FP",
  fangoso: "FP",
  "fangoso palabile": "FP",
  l: "L",
  liquido: "L",
  li: "L",
  lq: "L",
  vs: "VS",
  vischioso: "VS",
  "vischioso sciropposo": "VS",
  ga: "GA",
  gassoso: "GA",
  gs: "GA",
};

/** Converte qualsiasi testo/codice nel codice ufficiale RENTRI; "" se ignoto. */
export function statoFisicoRentri(raw: unknown): string {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "";
  return STATO_FISICO_ALIAS[v] ?? "";
}

/** Provenienza: solo "U" (urbano) o "S" (speciale). */
export function provenienzaRentri(raw: unknown): string {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v.startsWith("U") || v === "URBANO") return "U";
  if (v.startsWith("S") || v === "SPECIALE") return "S";
  return "";
}

/** Numero FIR: 5 lettere (blocco) + 6 cifre, opzionale suffisso 2 lettere. */
export function normalizzaNumeroFir(raw: unknown): string {
  const v = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const m = v.match(/^([A-Z]{5})(\d{1,6})([A-Z]{0,2})$/);
  if (!m) return v; // lascia com'è: la validazione lo segnalerà
  return `${m[1]}${m[2].padStart(6, "0")}${m[3]}`;
}

export function formatoNumeroFirValido(raw: unknown): boolean {
  return /^[A-Z]{5}\d{6}([A-Z]{2})?$/.test(String(raw ?? "").trim().toUpperCase().replace(/\s+/g, ""));
}

/** Pulisce un codice fiscale / partita IVA: maiuscolo, solo alfanumerici. */
export function normalizzaCF(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Checksum partita IVA (11 cifre). */
/** Checksum partita IVA (11 cifre). */
function pivaValida11(v: string): boolean {
  if (!/^\d{11}$/.test(v)) return false;
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(v[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  const atteso = (10 - (soma % 10)) % 10;
  return atteso === Number(v[10]);
}

/** Checksum codice fiscale (16 caratteri). */
function cfValido16(v: string): boolean {
  const odd = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const even: Record<string, number> = {
    "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
    K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 13, R: 1, S: 2, T: 10,
    U: 21, V: 2, W: 4, X: 18, Y: 20, Z: 21,
  };
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = v[i];
    sum += i % 2 === 0 ? (even[c] ?? 0) : odd.indexOf(c);
  }
  return odd[sum % 26] === v[15];
}

/** Codice fiscale o partita IVA italiani con checksum valido. */
export function cfValido(raw: unknown): boolean {
  const v = normalizzaCF(raw);
  if (/^\d{11}$/.test(v)) return pivaValida11(v);
  if (v.length === 16) return cfValido16(v);
  return false;
}

export interface ErroreValidazione {
  campo: string;
  messaggio: string;
}

function cfLeggibile(raw: unknown): string {
  return normalizzaCF(raw) || "—";
}

/**
 * Valida il payload strutturato dell'emissione FIR (POST /formulari/v1.0)
 * e restituisce l'elenco dei problemi in italiano. Vuoto = pronto all'invio.
 */
export function validaPayloadFirRentri(payload: Record<string, unknown>): ErroreValidazione[] {
  const errori: ErroreValidazione[] = [];
  const dp = (payload.dati_partenza ?? {}) as Record<string, unknown>;
  const rifiuto = (dp.rifiuto ?? {}) as Record<string, unknown>;
  const produttore = (dp.produttore ?? {}) as Record<string, unknown>;
  const destinatario = (dp.destinatario ?? {}) as Record<string, unknown>;
  const trasportatori = Array.isArray(dp.trasportatori) ? (dp.trasportatori as Record<string, unknown>[]) : [];
  const trasporto = (dp.dati_trasporto_partenza ?? {}) as Record<string, unknown>;
  const quantita = (rifiuto.quantita ?? {}) as Record<string, unknown>;

  // Numero FIR
  const numeroFir = normalizzaNumeroFir(dp.numero_fir);
  if (!numeroFir) errori.push({ campo: "dati_partenza.numero_fir", messaggio: "Numero formulario mancante" });
  else if (!formatoNumeroFirValido(numeroFir))
    errori.push({ campo: "dati_partenza.numero_fir", messaggio: `Numero formulario «${numeroFir}» non nel formato previsto (blocco + 6 cifre, es. ZRZXR000001)` });

  // Produttore
  if (!String(produttore.denominazione ?? "").trim())
    errori.push({ campo: "dati_partenza.produttore.denominazione", messaggio: "Denominazione produttore mancante" });
  const prodCf = normalizzaCF(produttore.codice_fiscale);
  if (!prodCf) errori.push({ campo: "dati_partenza.produttore.codice_fiscale", messaggio: "Codice fiscale produttore mancante" });
  else if (!cfValido(prodCf))
    errori.push({ campo: "dati_partenza.produttore.codice_fiscale", messaggio: `Codice fiscale produttore «${cfLeggibile(produttore.codice_fiscale)}» non valido (controllo ufficiale non superato)` });
  const prodComune = (produttore.indirizzo as Record<string, unknown>)?.citta as Record<string, unknown> | undefined;
  if (!String(prodComune?.comune_id ?? "").trim())
    errori.push({ campo: "dati_partenza.produttore.indirizzo.citta.comune_id", messaggio: "Comune dell'unità locale del produttore non riconosciuto (serve per il RENTRI)" });

  // Destinatario
  if (!String(destinatario.denominazione ?? "").trim())
    errori.push({ campo: "dati_partenza.destinatario.denominazione", messaggio: "Denominazione destinatario mancante" });
  const destCf = normalizzaCF(destinatario.codice_fiscale);
  if (!destCf) errori.push({ campo: "dati_partenza.destinatario.codice_fiscale", messaggio: "Codice fiscale destinatario mancante" });
  else if (!cfValido(destCf))
    errori.push({ campo: "dati_partenza.destinatario.codice_fiscale", messaggio: `Codice fiscale destinatario «${cfLeggibile(destinatario.codice_fiscale)}» non valido (controllo ufficiale non superato)` });
  const destComune = (destinatario.indirizzo as Record<string, unknown>)?.citta as Record<string, unknown> | undefined;
  if (!String(destComune?.comune_id ?? "").trim())
    errori.push({ campo: "dati_partenza.destinatario.indirizzo.citta.comune_id", messaggio: "Comune dell'unità locale del destinatario non riconosciuto (serve per il RENTRI)" });
  if (!String(destinatario.attivita ?? "").trim())
    errori.push({ campo: "dati_partenza.destinatario.attivita", messaggio: "Operazione del destinatario (R/D) mancante" });

  // Trasportatore
  const trasp = trasportatori[0];
  if (!trasp) {
    errori.push({ campo: "dati_partenza.trasportatori[0]", messaggio: "Trasportatore mancante" });
  } else {
    const traspCf = normalizzaCF(trasp.codice_fiscale);
    if (!traspCf) errori.push({ campo: "dati_partenza.trasportatori[0].codice_fiscale", messaggio: "Codice fiscale trasportatore mancante" });
    else if (!cfValido(traspCf))
      errori.push({ campo: "dati_partenza.trasportatori[0].codice_fiscale", messaggio: `Codice fiscale trasportatore «${cfLeggibile(trasp.codice_fiscale)}» non valido (controllo ufficiale non superato)` });
    if (!String(trasp.numero_iscrizione_albo ?? "").trim())
      errori.push({ campo: "dati_partenza.trasportatori[0].numero_iscrizione_albo", messaggio: "Numero iscrizione albo trasportatore mancante" });
  }

  // Rifiuto
  const eer = String(rifiuto.codice_eer ?? "").replace(/\D/g, "");
  if (eer.length !== 6)
    errori.push({ campo: "dati_partenza.rifiuto.codice_eer", messaggio: `Codice CER «${String(rifiuto.codice_eer ?? "")}» non valido: devono essere 6 cifre` });
  else if (!isValidCerCode(eer))
    // Il RENTRI accetta solo codici presenti nel catalogo europeo (altrimenti sys.invalid).
    errori.push({ campo: "dati_partenza.rifiuto.codice_eer", messaggio: `Codice CER «${eer}» inesistente nel catalogo europeo dei rifiuti` });
  const sf = String(rifiuto.stato_fisico ?? "").toUpperCase();
  if (!STATO_FISICO_RENTRI.includes(sf as (typeof STATO_FISICO_RENTRI)[number]))
    errori.push({ campo: "dati_partenza.rifiuto.stato_fisico", messaggio: `Stato fisico «${String(rifiuto.stato_fisico ?? "")}» non nella codifica RENTRI (valori ammessi: ${STATO_FISICO_RENTRI.join(", ")})` });
  const prov = String(rifiuto.provenienza ?? "").toUpperCase();
  if (prov !== "U" && prov !== "S")
    errori.push({ campo: "dati_partenza.rifiuto.provenienza", messaggio: "Provenienza non valida: deve essere Urbano (U) o Speciale (S)" });
  const valore = Number(quantita.valore);
  if (!Number.isFinite(valore) || valore <= 0)
    errori.push({ campo: "dati_partenza.rifiuto.quantita", messaggio: "Quantità mancante o non positiva" });
  if (!String(rifiuto.descrizione ?? "").trim())
    errori.push({ campo: "dati_partenza.rifiuto.descrizione", messaggio: "Descrizione del rifiuto mancante" });

  // Trasporto
  if (!String(trasporto.targa_automezzo ?? "").trim())
    errori.push({ campo: "dati_partenza.dati_trasporto_partenza.targa_automezzo", messaggio: "Targa dell'automezzo mancante" });
  const dataOra = String(trasporto.data_ora_inizio_trasporto ?? "");
  if (!dataOra || Number.isNaN(Date.parse(dataOra)))
    errori.push({ campo: "dati_partenza.dati_trasporto_partenza.data_ora_inizio_trasporto", messaggio: "Data/ora inizio trasporto mancante o non valida" });

  return errori;
}

/** Messaggio unico leggibile a partire dall'elenco dei problemi. */
export function messaggioValidazione(errori: ErroreValidazione[]): string {
  return "Invio bloccato: dati incompleti o non conformi. " +
    errori.map((e) => `• ${e.messaggio}`).join(" ");
}

/**
 * Normalizza in profondità il payload (numero_fir con 6 cifre, codici fiscali
 * ripuliti, stato_fisico sulla codifica ufficiale) senza toccare l'originale.
 */
export function normalizzaPayloadFirRentri(payload: Record<string, unknown>): Record<string, unknown> {
  const p = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const dp = (p.dati_partenza ?? {}) as Record<string, unknown>;
  dp.numero_fir = normalizzaNumeroFir(dp.numero_fir);

  const fixCf = (soggetto: Record<string, unknown>) => {
    soggetto.codice_fiscale = normalizzaCF(soggetto.codice_fiscale);
  };
  const produttore = dp.produttore as Record<string, unknown> | undefined;
  const destinatario = dp.destinatario as Record<string, unknown> | undefined;
  if (produttore) fixCf(produttore);
  if (destinatario) fixCf(destinatario);
  if (Array.isArray(dp.trasportatori)) (dp.trasportatori as Record<string, unknown>[]).forEach(fixCf);
  if (dp.intermediario) fixCf(dp.intermediario as Record<string, unknown>);

  const rifiuto = dp.rifiuto as Record<string, unknown> | undefined;
  if (rifiuto) {
    if (rifiuto.stato_fisico) {
      const codice = statoFisicoRentri(rifiuto.stato_fisico);
      if (codice) rifiuto.stato_fisico = codice;
    }
    if (rifiuto.provenienza) {
      const prov = provenienzaRentri(rifiuto.provenienza);
      if (prov) rifiuto.provenienza = prov;
    }
    const q = rifiuto.quantita as Record<string, unknown> | undefined;
    if (q && typeof q.valore === "string") {
      // Formato italiano: "1.200,5" → togli i separatori delle migliaia e usa il punto decimale
      let s = String(q.valore).trim();
      if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
      const n = Number(s);
      if (Number.isFinite(n)) q.valore = n;
    }
  }
  p.dati_partenza = dp;
  return p;
}
