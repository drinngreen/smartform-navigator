/**
 * Maps FIR Alternative Form field values (keyed by template field names)
 * to RENTRI API FIR_EMISSIONE payload structure.
 *
 * The form uses UUID keys internally, but FIRRentriActions receives
 * `formData` which may contain either UUIDs or field names as keys.
 * This mapper works with field NAMES (normalized).
 */

import { TENANT_RENTRI, type TenantRentriConfig } from "@/lib/rentriBlockCodes";
import { normalizeHpList } from "@/data/hpCaratteristiche";
import type { RentriCliente } from "@/lib/rentriVpsApi";

/** Known field name → normalized lookup key */
const FIELD_MAP: Record<string, string> = {
  // Numero FIR
  "numero_fir": "numero_fir",
  "numero_formulario": "numero_fir",
  // Date
  "data_emissione": "data_emissione",
  // Produttore
  "denominazione_produttore": "prod_denominazione",
  "codice_fiscale_produttore": "prod_cf",
  "unita_locale_produttore": "prod_indirizzo",
  "luogo_di_produzione_se_diverso_produttore": "prod_luogo_produzione",
  "numero_iscrizione_albo_produttore": "prod_iscrizione_albo",
  "numero_aut_comunicazione_produttore": "prod_autorizzazione",
  "tipologia_autorizzazione_ambientale_produttore": "prod_tipo_aut",
  // Destinatario
  "denominazione_destinatario": "dest_denominazione",
  "codice_fiscale_destinatario": "dest_cf",
  "unita_locale_destinatario": "dest_indirizzo",
  "numero_iscrizione_albo_destinatario": "dest_iscrizione_albo",
  "numero_aut_comunicazione_destinatario": "dest_autorizzazione",
  "tipologia_autorizzazione_ambientale_destinatario": "dest_tipo_aut",
  // Trasportatore
  "denominazione_trasportatore": "trasp_denominazione",
  "codice_fiscale_trasportatore": "trasp_cf",
  "numero_iscrizione_albo_trasportatore": "trasp_iscrizione_albo",
  // Intermediario
  "denominazione_intermediario": "inter_denominazione",
  "codice_fiscale_intermediario": "inter_cf",
  "numero_iscrizione_albo_intermediario": "inter_iscrizione_albo",
  // Rifiuto
  "codice_eer": "codice_eer",
  "descrizione_rifiuto": "descrizione_rifiuto",
  "stato_fisico": "stato_fisico",
  "caratteristiche_di_pericolo": "caratteristiche_pericolo",
  "quantita": "quantita",
  "peso_verificato_in_partenza": "peso_partenza",
  "peso_verificato_a_destino": "peso_destino",
  "litri": "litri",
  "numero_colli_contenitori": "numero_colli",
  "alla_rinfusa": "alla_rinfusa",
  // Provenienza
  "speciale": "provenienza_speciale",
  "urbano": "provenienza_urbano",
  // Operazione
  "smaltimento": "smaltimento",
  "recupero": "recupero",
  // Trasporto
  "targa_automezzo": "targa_automezzo",
  "targa_rimorchio": "targa_rimorchio",
  "conducente": "conducente",
  "data_inizio_trasporto": "data_inizio_trasporto",
  "ora_inizio_trasporto": "ora_inizio_trasporto",
  "percorso": "percorso",
  // Annotazioni
  "annotazioni": "annotazioni",
  "note": "annotazioni",
};

function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseAddress(raw: string): { indirizzo: string; cap: string; citta: string; provincia: string } {
  // Try to parse "VIA XXX - CAP CITTA (PROV)" format
  const match = raw.match(/^(.+?)\s*[-–]\s*(\d{5})?\s*(.+?)(?:\s*\((\w{2})\))?$/);
  if (match) {
    return {
      indirizzo: match[1]?.trim() || raw,
      cap: match[2] || "",
      citta: match[3]?.trim() || "",
      provincia: match[4] || "",
    };
  }
  return { indirizzo: raw, cap: "", citta: "", provincia: "" };
}

interface NormalizedFormData {
  [key: string]: string | boolean;
}

function normalizeFormData(
  formData: Record<string, string | boolean>,
  templateFields?: Array<{ id: string; name: string }>
): NormalizedFormData {
  const result: NormalizedFormData = {};

  for (const [key, value] of Object.entries(formData)) {
    // If key is a UUID and we have template fields, resolve the name
    let fieldName = key;
    if (templateFields && /^[0-9a-f-]{36}$/.test(key)) {
      const field = templateFields.find(f => f.id === key);
      if (field) fieldName = field.name;
    }

    const normalized = normalizeFieldName(fieldName);
    const mappedKey = FIELD_MAP[normalized];
    if (mappedKey) {
      result[mappedKey] = value;
    } else {
      // Store with normalized name as fallback
      result[normalized] = value;
    }
  }
  return result;
}

export function mapFormToRentriPayload(
  cliente: RentriCliente,
  formData: Record<string, string | boolean>,
  options?: {
    firmaComeProduttore?: boolean;
    templateFields?: Array<{ id: string; name: string }>;
  }
): Record<string, unknown> {
  const cfg = TENANT_RENTRI[cliente];
  if (!cfg) throw new Error(`Configurazione RENTRI non trovata per: ${cliente}`);

  const data = normalizeFormData(formData, options?.templateFields);
  const str = (key: string) => String(data[key] || "").trim();
  const bool = (key: string) => data[key] === true || data[key] === "true" || str(key).toLowerCase() === "si";

  // Parse addresses
  const prodAddr = parseAddress(str("prod_indirizzo"));
  const destAddr = parseAddress(str("dest_indirizzo"));

  // Determine provenienza
  const provenienza = bool("provenienza_urbano") ? "U" : "S";

  // Build quantity
  const qtyStr = str("quantita") || str("peso_partenza");
  const qty = parseFloat(qtyStr.replace(",", "."));

  // Build date/time
  const dataInizio = str("data_inizio_trasporto") || str("data_emissione") || new Date().toISOString().slice(0, 10);
  const oraInizio = str("ora_inizio_trasporto") || new Date().toISOString().slice(11, 16);
  const dataOraInizio = `${dataInizio}T${oraInizio}:00+01:00`;

  // Build conducente
  const conducenteRaw = str("conducente");
  const conducenteParts = conducenteRaw.split(/\s+/);
  const conducenteNome = conducenteParts[0] || "";
  const conducenteCognome = conducenteParts.slice(1).join(" ") || "";

  // Stato fisico mapping
  const statoFisicoRaw = str("stato_fisico").toUpperCase();
  const statoFisicoMap: Record<string, string> = {
    "SOLIDO POLVERULENTO": "SP",
    "SOLIDO NON POLVERULENTO": "SNP",
    "FANGOSO PALABILE": "FP",
    "LIQUIDO": "LQ",
    "GASSOSO": "GS",
    "ALTRO": "AL",
    "SP": "SP", "SNP": "SNP", "FP": "FP", "LQ": "LQ", "GS": "GS", "AL": "AL",
  };
  const statoFisico = statoFisicoMap[statoFisicoRaw] || "SNP";

  // Build RENTRI-compatible payload
  const payload: Record<string, unknown> = {
    num_iscr_sito: cfg.unitId,
    dati_partenza: {
      numero_fir: str("numero_fir"),
      produttore: {
        // Mai sostituire il produttore con l'emittente RENTRI: sono soggetti
        // distinti e il fallback generava dati non dichiarati nel formulario.
        denominazione: str("prod_denominazione"),
        codice_fiscale: str("prod_cf"),
        nazione_id: "IT",
        indirizzo: {
          citta: { comune_id: "" },
          indirizzo: prodAddr.indirizzo,
          cap: prodAddr.cap,
        },
        ...(str("prod_autorizzazione") ? {
          autorizzazione: {
            numero: str("prod_autorizzazione"),
            tipo: str("prod_tipo_aut") || "AIA",
          },
        } : {}),
      },
      destinatario: {
        denominazione: str("dest_denominazione"),
        codice_fiscale: str("dest_cf"),
        nazione_id: "IT",
        attivita: bool("recupero") ? "R13" : (bool("smaltimento") ? "D15" : "R13"),
        indirizzo: {
          citta: { comune_id: "" },
          indirizzo: destAddr.indirizzo,
          cap: destAddr.cap,
        },
        ...(str("dest_autorizzazione") ? {
          autorizzazione: {
            numero: str("dest_autorizzazione"),
            tipo: str("dest_tipo_aut") || "AIA",
          },
        } : {}),
      },
      trasportatori: [
        {
          denominazione: str("trasp_denominazione") || cfg.issuer,
          codice_fiscale: str("trasp_cf") || cfg.issuer,
          nazione_id: "IT",
          tipo_trasporto: "Terrestre",
          ...(str("trasp_iscrizione_albo") ? {
            numero_iscrizione_albo: str("trasp_iscrizione_albo"),
          } : {}),
        },
      ],
      rifiuto: (() => {
        const hp = normalizeHpList(str("caratteristiche_pericolo"));
        const eerRaw = str("codice_eer");
        return {
          codice_eer: eerRaw.replace(/[.\s*]/g, ""),
          descrizione: str("descrizione_rifiuto"),
          provenienza,
          stato_fisico: statoFisico,
          pericoloso: hp.length > 0 || eerRaw.includes("*"),
          quantita: {
            valore: Number.isFinite(qty) ? qty : 1,
            unita_misura: str("litri") ? "lt" : "kg",
          },
          caratteristiche_pericolo: hp,
        };
      })(),

      dati_trasporto_partenza: {
        conducente: {
          nome: conducenteNome,
          cognome: conducenteCognome,
        },
        targa_automezzo: str("targa_automezzo"),
        ...(str("targa_rimorchio") ? { targa_rimorchio: str("targa_rimorchio") } : {}),
        data_ora_inizio_trasporto: dataOraInizio,
      },
      ...(str("annotazioni") ? { annotazioni: str("annotazioni") } : {}),
    },
    // Firma flags
    firma_produttore: options?.firmaComeProduttore ?? true,
    firma_trasportatore: true,
  };

  return payload;
}
