import {
  accettaFirInArrivoDestinatario,
  isRentriOfflineResponse,
  listaFirInArrivoDestinatario,
  ricercaFir,
  firmaRicezione,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
import type { FirSummary, FirDetail, FirDestinatarioPayload, FirEvent, FirStatusInterno } from "@/types/impiantoFir";

function extractRentriFirItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const candidates = [
    record.formulari,
    record.items,
    record.results,
    record.content,
    record.data,
    record.firs,
    record.lista,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
  }

  return [];
}

function toIsoDateTime(dataArrivo: string, oraArrivo: string): string {
  const raw = `${dataArrivo}T${oraArrivo}:00`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}

function mapEsitoConferimento(esito: FirDestinatarioPayload["esito"]): string {
  switch (esito) {
    case "parziale":
      return "ACCETTATO_PARZIALMENTE";
    case "respinto":
      return "RESPINTO";
    case "accettato":
    default:
      return "ACCETTATO_TOTALMENTE";
  }
}

/**
 * Search a FIR on RENTRI by number
 */
export async function searchXFir(cliente: RentriCliente, numeroFir: string): Promise<RentriVpsResponse> {
  return ricercaFir(cliente, numeroFir);
}

function normalizzaCf(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, "").toUpperCase();
}

/** Il formulario è destinato all'impianto che sta guardando l'elenco? */
function isDestinatario(raw: Record<string, unknown>, cfImpianto: string): boolean {
  if (!cfImpianto) return true;
  const lista = Array.isArray(raw.destinatari) ? (raw.destinatari as Record<string, unknown>[]) : [];
  const singolo = (raw.destinatario ?? null) as Record<string, unknown> | null;
  const cf = normalizzaCf(cfImpianto);
  return (
    lista.some((d) => normalizzaCf(d.codice_fiscale) === cf) ||
    normalizzaCf(singolo?.codice_fiscale) === cf ||
    normalizzaCf(raw.destinatario_codice_fiscale) === cf
  );
}

/**
 * Stato interno derivato dallo stato ufficiale RENTRI.
 * "Accettato" (o accettazione presente) = chiuso dal destinatario.
 * Qualsiasi stato di firma alla partenza = firmato dal trasportatore e in attesa di ricezione.
 */
function statoInternoDaRentri(raw: Record<string, unknown>): FirStatusInterno {
  const stato = String(raw.stato ?? raw.stato_fir ?? "").toLowerCase();
  const accettazione = raw.accettazione as Record<string, unknown> | null | undefined;
  if (stato.includes("accett") || accettazione) return "firmato_destinatario";
  if (stato.includes("firma") || stato.includes("trasport")) return "attesa_firma_ricezione";
  if (stato.includes("annull") || stato.includes("error")) return "errore";
  return "importato";
}

export async function listIncomingXFir(
  cliente: RentriCliente,
  identificativoSoggetto: string,
  numIscrSito?: string,
): Promise<FirSummary[]> {
  const res = await listaFirInArrivoDestinatario(cliente, identificativoSoggetto, numIscrSito);
  if (!res.success) {
    if (isRentriOfflineResponse(res)) return [];
    throw new Error(res.error || "Errore recupero FIR in arrivo");
  }

  return extractRentriFirItems(res.data)
    .filter((raw) => isDestinatario(raw, identificativoSoggetto))
    .map((raw, index) => mapRentriToFirSummary(raw, index))
    .filter((item) => Boolean(item.id && item.numero_fir));
}

/** Mappa un formulario RENTRI grezzo nel riepilogo usato dall'impianto. */
export function mapRentriToFirSummary(raw: Record<string, unknown>, index = 0): FirSummary {
  const d = raw as Record<string, unknown>;
  const summary = parseRentriToSummary(d);
  const accettazione = d.accettazione as Record<string, unknown> | null | undefined;
  const uuid = String(d.uuid ?? d.id ?? d.uuid_fir ?? d.firId ?? summary.numero_fir ?? `incoming-${index}`);
  const dataRicezione = String(
    accettazione?.data_ora_arrivo ?? d.data_ora_ricezione ?? d.data_arrivo ?? d.data_emissione ?? d.created_at ?? new Date().toISOString(),
  );
  const dataAccettazione = accettazione?.data_ora_arrivo ? String(accettazione.data_ora_arrivo) : null;

  return {
    id: uuid,
    numero_fir: summary.numero_fir || "",
    produttore: summary.produttore || "",
    trasportatore: summary.trasportatore || "",
    destinatario: summary.destinatario || "",
    cer: summary.cer || "",
    quantita: Number(summary.quantita || 0),
    unita_misura: summary.unita_misura || "kg",
    stato_interno: statoInternoDaRentri(d),
    stato_rentri: String(d.stato ?? d.stato_fir ?? d.esito ?? "IN_ARRIVO"),
    data_ricezione: dataRicezione,
    firma_ricezione_at: dataAccettazione,
    firma_destinatario_at: dataAccettazione,
  } satisfies FirSummary;
}

/**
 * Ricerca in SOLA LETTURA sul RENTRI di un formulario per numero (e opzionalmente per CER).
 * Serve a permettere all'impianto di aprire e chiudere anche i formulari che non
 * compaiono nell'elenco "in arrivo": nessuna scrittura, nessun invio.
 */
export async function cercaFirRentriPerNumero(
  cliente: RentriCliente,
  numeroFir: string,
  opzioni?: { cer?: string },
): Promise<FirSummary[]> {
  const numero = String(numeroFir || "").trim();
  if (!numero) return [];

  const res = await ricercaFir(cliente, numero);
  if (!res.success) {
    if (isRentriOfflineResponse(res)) return [];
    throw new Error(res.error || "Formulario non trovato sul RENTRI");
  }

  const items = extractRentriFirItems(res.data);
  const grezzi = items.length > 0
    ? items
    : (res.data && typeof res.data === "object" ? [res.data as Record<string, unknown>] : []);

  const cerFiltro = String(opzioni?.cer || "").replace(/[\s.]/g, "").toLowerCase();

  return grezzi
    .map((raw, index) => mapRentriToFirSummary(raw, index))
    .filter((item) => Boolean(item.id && item.numero_fir))
    .filter((item) => !cerFiltro || String(item.cer || "").replace(/[\s.]/g, "").toLowerCase().includes(cerFiltro));
}

export async function signIncomingXFir(
  cliente: RentriCliente,
  uuidFir: string,
  payload: FirDestinatarioPayload,
  numIscrSito: string,
): Promise<RentriVpsResponse> {
  return accettaFirInArrivoDestinatario(cliente, uuidFir, {
    data_ora_ricezione: toIsoDateTime(payload.data_arrivo, payload.ora_arrivo),
    quantita_ricevuta: {
      valore: payload.kg_pesata,
      unita_misura: "kg",
    },
    esito_conferimento: mapEsitoConferimento(payload.esito),
    num_iscr_sito: numIscrSito,
    motivazione: payload.motivazione || undefined,
  });
}

/**
 * Import an xFIR into the local impianto_fir_inbox
 */
export async function importXFir(
  impiantoAccountId: string,
  firData: Record<string, unknown>,
  tenantId: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from("impianto_fir_inbox" as any)
    .insert({
      impianto_account_id: impiantoAccountId,
      fir_number: firData.numero_fir || firData.numeroFir || "",
      stato: "importato",
      rentri_data: firData,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
    } as any)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: (data as any)?.id };
}

/**
 * Sign reception (firma ricezione) on RENTRI
 */
export async function signReceptionXFir(
  cliente: RentriCliente,
  payload: FirDestinatarioPayload,
): Promise<RentriVpsResponse> {
  return firmaRicezione(cliente, {
    numero_fir: payload.numero_fir,
    quantita_accettata: payload.kg_pesata,
    data_arrivo: payload.data_arrivo,
    ora_arrivo: payload.ora_arrivo,
    esito_verifica: payload.esito,
    motivazione_rifiuto: payload.motivazione || undefined,
    firma_ricezione: true,
    firma_destinatario: false,
  });
}

/**
 * Sign destination (firma destinatario = final closure) on RENTRI
 */
export async function signDestinationXFir(
  cliente: RentriCliente,
  payload: FirDestinatarioPayload,
): Promise<RentriVpsResponse> {
  return firmaRicezione(cliente, {
    numero_fir: payload.numero_fir,
    quantita_accettata: payload.kg_pesata,
    data_arrivo: payload.data_arrivo,
    ora_arrivo: payload.ora_arrivo,
    esito_verifica: payload.esito,
    motivazione_rifiuto: payload.motivazione || undefined,
    firma_ricezione: true,
    firma_destinatario: true,
  });
}

/**
 * Parse RENTRI response into a FirSummary
 */
export function parseRentriToSummary(raw: Record<string, unknown>): Partial<FirSummary> {
  const d = raw as any;
  return {
    numero_fir: d.numero_fir || d.numeroFir || d.numero || "",
    produttore: d.produttore?.denominazione || d.produttore_denominazione || "",
    trasportatore:
      d.trasportatore?.denominazione ||
      d.trasportatori?.[0]?.denominazione ||
      d.trasportatore_denominazione ||
      "",
    destinatario:
      d.destinatario?.denominazione ||
      d.destinatari?.[0]?.denominazione ||
      d.destinatario_denominazione ||
      "",
    cer: d.codice_eer || d.rifiuto?.codice_eer || "",
    quantita: Number(d.quantita || d.rifiuto?.quantita || 0),
    unita_misura: d.unita_misura || d.rifiuto?.unita_misura || "kg",
  };
}
