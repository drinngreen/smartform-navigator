/**
 * Converte i dati del formulario dell'app (store MN FIR) nel payload
 * strutturato richiesto da RENTRI per l'emissione (POST /formulari/v1.0).
 *
 * Il RENTRI rifiuta i campi "piatti": richiede `dati_partenza` con produttore,
 * destinatario, trasportatori, rifiuto e dati di trasporto.
 */

import { TENANT_RENTRI } from "@/lib/rentriBlockCodes";
import { normalizeHpList } from "@/data/hpCaratteristiche";
import type { RentriCliente } from "@/lib/rentriVpsApi";
import { resolveComuneId } from "@/lib/comuneIstat";
import { normalizzaNumeroFir, normalizzaCF } from "@/lib/rentriValidazione";

type Bag = Record<string, unknown>;

// Codifica ufficiale RENTRI verificata in produzione:
// S = solido, SP = solido pulverulento, FP = fangoso palabile,
// L = liquido, VS = vischioso sciropposo, GA = gassoso compresso o liquefatto.
const STATO_FISICO_MAP: Record<string, string> = {
  solido: "S",
  "solido non pulverulento": "S",
  "solido pulverulento": "SP",
  polverulento: "SP",
  fangoso: "FP",
  "fangoso palabile": "FP",
  liquido: "L",
  vischioso: "VS",
  "vischioso sciropposo": "VS",
  gassoso: "GA",
};

function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function splitIndirizzo(raw: string): { indirizzo: string; cap: string } {
  const cap = raw.match(/\b(\d{5})\b/)?.[1] ?? "";
  return { indirizzo: raw, cap };
}

function splitNome(raw: string): { nome: string; cognome: string } {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nome: "", cognome: "" };
  if (parts.length === 1) return { nome: parts[0], cognome: parts[0] };
  return { nome: parts[0], cognome: parts.slice(1).join(" ") };
}

function statoFisico(raw: string): string {
  return STATO_FISICO_MAP[raw.trim().toLowerCase()] || "S";
}

/**
 * Valori ufficiali RENTRI (rentri-enum-1.0.xsd, simpleType TipoAutorizzazione).
 * Qualsiasi altra dicitura viene rifiutata dal RENTRI con "sys.invalid".
 */
const TIPI_AUTORIZZAZIONE = [
  "RecSmalArt208",
  "RecSmalImpMobiliArt208",
  "RicercaSperimentazione",
  "AIA",
  "RecProcSemplificata",
  "OpBonifica",
  "Straordinario",
  "ComTrattamentoAcqueReflue",
  "AutTrattamentoAcqueReflue",
] as const;

const ALIAS_AUTORIZZAZIONE: Record<string, string> = {
  aia: "AIA",
  "art208": "RecSmalArt208",
  "art.208": "RecSmalArt208",
  "articolo208": "RecSmalArt208",
  "208": "RecSmalArt208",
  "recuperosmaltimentoart208": "RecSmalArt208",
  "impiantimobili": "RecSmalImpMobiliArt208",
  "art208mobili": "RecSmalImpMobiliArt208",
  "ricercasperimentazione": "RicercaSperimentazione",
  "proceduresemplificate": "RecProcSemplificata",
  "procedurasemplificata": "RecProcSemplificata",
  "art216": "RecProcSemplificata",
  "art.216": "RecProcSemplificata",
  "216": "RecProcSemplificata",
  "bonifica": "OpBonifica",
  "straordinario": "Straordinario",
  "acquereflue": "AutTrattamentoAcqueReflue",
};

/** Restituisce il codice ufficiale oppure "" se la dicitura non è riconducibile. */
function tipoAutorizzazione(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const esatto = TIPI_AUTORIZZAZIONE.find((t) => t.toLowerCase() === v.toLowerCase());
  if (esatto) return esatto;
  const k = v.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALIAS_AUTORIZZAZIONE[k] ?? "";
}

const ELENCO_TIPI_LEGGIBILE =
  "Art. 208, Art. 208 impianti mobili, Ricerca e sperimentazione, AIA, Art. 216 (procedura semplificata), Operazioni di bonifica, Straordinario, Comunicazione/Autorizzazione trattamento acque reflue";

/**
 * Blocco autorizzazione conforme. Il RENTRI richiede numero e tipo insieme
 * (sys.required): se mancano o il tipo non è ufficiale l'invio viene bloccato
 * qui con un messaggio chiaro, invece di farlo rifiutare dal RENTRI.
 */
function bloccoAutorizzazione(
  numero: string,
  tipo: string,
  ruolo: string,
  obbligatorio: boolean,
): Bag | null {
  const num = numero.trim();
  const t = tipoAutorizzazione(tipo);
  if (!num && !tipo.trim()) {
    if (!obbligatorio) return null;
    throw new Error(
      `Autorizzazione del ${ruolo} mancante: inserisci numero e tipo di autorizzazione (valori ammessi: ${ELENCO_TIPI_LEGGIBILE}).`,
    );
  }
  if (!num) {
    throw new Error(`Numero di autorizzazione del ${ruolo} mancante: il RENTRI lo richiede insieme al tipo.`);
  }
  if (!t) {
    throw new Error(
      `Tipo di autorizzazione del ${ruolo} non valido per il RENTRI («${tipo.trim()}»). Usa uno dei valori ufficiali: ${ELENCO_TIPI_LEGGIBILE}.`,
    );
  }
  return { numero: num, tipo: t };
}

/**
 * Operazione R/D del destinatario: pattern ufficiale [RD][0-9]+ limitato a
 * R1..R13 / D1..D15 (rentri-formulario-1.0.xsd, OperazioneRecuperoSmaltimento).
 */
function attivitaDestinatario(raw: string, fallbackSmaltimento: boolean): string {
  const m = raw.toUpperCase().match(/([RD])\s*0*(\d{1,2})/);
  if (m) {
    const lettera = m[1];
    const n = Number(m[2]);
    const max = lettera === "R" ? 13 : 15;
    if (n >= 1 && n <= max) return `${lettera}${n}`;
  }
  return fallbackSmaltimento ? "D15" : "R13";
}

function dataOraTrasporto(d: Bag): string {
  const data = s(d.dataEmissione) || new Date().toISOString().slice(0, 10);
  const ora = s(d.oraInizioTrasporto) || s(d.oraDataInizioTrasporto).slice(11, 16) || "08:00";
  const iso = new Date(`${data}T${/^\d{2}:\d{2}$/.test(ora) ? ora : "08:00"}:00`);
  return Number.isNaN(iso.getTime()) ? new Date().toISOString() : iso.toISOString();
}

export interface MapStoreOptions {
  /** true = firma produttore + trasportatore; false = solo trasportatore */
  firmaComeProduttore?: boolean;
}

export async function mapStoreToRentriFirPayload(
  cliente: RentriCliente,
  data: Bag,
  options: MapStoreOptions = {},
): Promise<Bag> {
  const key = String(cliente).toLowerCase();
  const cfg = (TENANT_RENTRI as Record<string, { unitId?: string; issuer?: string }>)[key] ?? {};

  const prodTesto = s(data.produttoreUnitaLocale) || s(data.cantiereIndirizzo);
  const destTesto = s(data.destinatarioUnitaLocale);
  const prodAddr = splitIndirizzo(prodTesto);
  const destAddr = splitIndirizzo(destTesto);
  const prodComuneId = await resolveComuneId(
    prodTesto || s(data.cantiereComune),
    prodAddr.cap || s(data.cantiereCAP),
    s(data.cantiereProvincia) || undefined,
  );
  const destComuneId = await resolveComuneId(destTesto, destAddr.cap);
  const conducente = splitNome(s(data.conducenteNomeCognome) || s(data.trasportatoreNomeAutista));

  const eerRaw = s(data.codiceEER);
  const hp = normalizeHpList(
    Array.isArray(data.caratteristicheHP) ? (data.caratteristicheHP as string[]).join(" ") : s(data.caratteristicheHP),
  );
  const quantita = Number(String(data.quantita ?? "").replace(",", "."));
  const operazione = attivitaDestinatario(
    s(data.destinatarioCodiceOperazione),
    s(data.destinatarioOperazione).toUpperCase().startsWith("D"),
  );
  const autProduttore = bloccoAutorizzazione(s(data.produttoreNumeroAut), s(data.produttoreTipoAut));
  const autDestinatario = bloccoAutorizzazione(s(data.destinatarioNumeroAut), s(data.destinatarioTipoAut));

  return {
    num_iscr_sito: cfg.unitId,
    dati_partenza: {
      numero_fir: normalizzaNumeroFir(s(data.selectedFirNumber)),
      produttore: {
        denominazione: s(data.produttoreDenominazione),
        codice_fiscale: normalizzaCF(s(data.produttoreCF)),
        nazione_id: "IT",
        indirizzo: {
          citta: { comune_id: prodComuneId },
          indirizzo: prodAddr.indirizzo,
          cap: prodAddr.cap,
        },
        ...(autProduttore ? { autorizzazione: autProduttore } : {}),
      },
      destinatario: {
        denominazione: s(data.destinatarioDenominazione),
        codice_fiscale: normalizzaCF(s(data.destinatarioCF)),
        nazione_id: "IT",
        attivita: operazione,
        indirizzo: {
          citta: { comune_id: destComuneId },
          indirizzo: destAddr.indirizzo,
          cap: destAddr.cap,
        },
        ...(autDestinatario ? { autorizzazione: autDestinatario } : {}),
      },
      trasportatori: [
        {
          denominazione: s(data.trasportatoreDenominazione) || s(cfg.issuer),
          codice_fiscale: normalizzaCF(s(data.trasportatoreCF)) || s(cfg.issuer),
          nazione_id: "IT",
          tipo_trasporto: "Terrestre",
          ...(s(data.trasportatoreNumeroAlbo)
            ? { numero_iscrizione_albo: s(data.trasportatoreNumeroAlbo) }
            : {}),
        },
      ],
      ...(s(data.intermediarioDenominazione)
        ? {
            intermediario: {
              denominazione: s(data.intermediarioDenominazione),
              codice_fiscale: s(data.intermediarioCF),
              nazione_id: "IT",
              ...(s(data.intermediarioNumeroAlbo)
                ? { numero_iscrizione_albo: s(data.intermediarioNumeroAlbo) }
                : {}),
            },
          }
        : {}),
      rifiuto: {
        codice_eer: eerRaw.replace(/[.\s*]/g, ""),
        descrizione: s(data.descrizione),
        // Codifica RENTRI: "U" = urbano, "S" = speciale
        provenienza: s(data.provenienza).toLowerCase() === "urbano" ? "U" : "S",
        stato_fisico: statoFisico(s(data.statoFisico)),
        pericoloso: hp.length > 0 || eerRaw.includes("*"),
        quantita: {
          valore: Number.isFinite(quantita) && quantita > 0 ? quantita : 1,
          unita_misura: s(data.unitaMisura) === "lt" ? "lt" : "kg",
        },
        caratteristiche_pericolo: hp,
      },
      dati_trasporto_partenza: {
        conducente: { nome: conducente.nome, cognome: conducente.cognome },
        targa_automezzo: s(data.targaAutomezzo),
        ...(s(data.targaRimorchio) ? { targa_rimorchio: s(data.targaRimorchio) } : {}),
        data_ora_inizio_trasporto: dataOraTrasporto(data),
      },
      ...(s(data.annotazioni) ? { annotazioni: s(data.annotazioni) } : {}),
    },
    firma_produttore: options.firmaComeProduttore ?? true,
    firma_trasportatore: true,
  };
}
