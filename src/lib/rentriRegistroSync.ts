import { supabase } from "@/lib/supabaseClient";
import {
  inviaMovimentiRegistroVerificato,
  statoTransazioneRegistro,
  registriDisponibili,
  rentriConfigKey,
  RENTRI_UNITA_LOCALI,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

export interface MovimentoImpiantoRow {
  id: string;
  cer: string | null;
  descrizione_rifiuto: string | null;
  quantita_kg: number | null;
  data_movimento: string | null;
  tipo_movimento: string | null;
  numero_fir: string | null;
  produttore_denominazione: string | null;
  destinatario_denominazione: string | null;
  stato_movimento: string | null;
}

export interface MovimentoRentri {
  tipo_movimento: "CARICO" | "SCARICO";
  data_registrazione: string;
  codice_eer: string;
  descrizione: string;
  quantita: number;
  unita_misura: "kg";
  num_iscr_sito: string;
  numero_fir?: string | null;
  riferimento_interno: string;
}

/** Converte i movimenti di impianto salvati a DB nel payload movimenti RENTRI. */
export function mapMovimentiToRentri(
  rows: MovimentoImpiantoRow[],
  cliente: RentriCliente,
): MovimentoRentri[] {
  const unita = RENTRI_UNITA_LOCALI[rentriConfigKey(cliente)] ?? "";
  return rows
    .filter((r) => r.cer && Number(r.quantita_kg) > 0)
    .map((r) => ({
      tipo_movimento: (String(r.tipo_movimento).toUpperCase() === "SCARICO" ? "SCARICO" : "CARICO") as
        | "CARICO"
        | "SCARICO",
      data_registrazione: r.data_movimento ?? new Date().toISOString().slice(0, 10),
      codice_eer: String(r.cer).replace(/\D/g, ""),
      descrizione: r.descrizione_rifiuto ?? "",
      quantita: Number(r.quantita_kg),
      unita_misura: "kg" as const,
      num_iscr_sito: unita,
      numero_fir: r.numero_fir,
      riferimento_interno: r.id,
    }));
}

/** Id dei movimenti già presenti negli invii archiviati: non vanno mai inviati due volte. */
async function movimentiGiaInviati(tenantId: string): Promise<Set<string>> {
  const inviati = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("rentri_invii_registri")
      .select("movimenti")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const movs = (row as { movimenti?: unknown }).movimenti;
      if (!Array.isArray(movs)) continue;
      for (const m of movs) {
        const rif = (m as Record<string, unknown>)?.riferimento_interno;
        if (typeof rif === "string" && rif) inviati.add(rif);
      }
    }
    if ((data?.length ?? 0) < pageSize) break;
  }
  return inviati;
}

/**
 * Carica i movimenti candidati all'invio per un intervallo di date.
 * Solo movimenti EFFETTIVI (peso certificato) e mai già inviati: nessun doppione,
 * nulla di non certificato va al RENTRI.
 */
export async function caricaMovimentiCandidati(
  tenantId: string,
  dataDa: string,
  dataA: string,
): Promise<MovimentoImpiantoRow[]> {
  const [{ data, error }, inviati] = await Promise.all([
    supabase
      .from("movimenti_impianto")
      .select(
        "id, cer, descrizione_rifiuto, quantita_kg, data_movimento, tipo_movimento, numero_fir, produttore_denominazione, destinatario_denominazione, stato_movimento",
      )
      .eq("tenant_id", tenantId)
      .eq("stato_movimento", "effettivo")
      .gte("data_movimento", dataDa)
      .lte("data_movimento", dataA)
      .order("data_movimento", { ascending: true }),
    movimentiGiaInviati(tenantId),
  ]);

  if (error) throw error;
  return ((data ?? []) as MovimentoImpiantoRow[]).filter((r) => !inviati.has(r.id));
}

function estraiTransazioneId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const candidate =
    r.transazione_id ?? r.transazioneId ?? r.id_transazione ?? r.identificativo ?? r.id;
  return candidate ? String(candidate) : null;
}

/**
 * Schema reale accettato dal RENTRI per le registrazioni di registro C/S:
 * un ARRAY di oggetti annidati (riferimenti + rifiuto), non un oggetto piatto.
 * Inviare `{ movimenti: [...] }` con campi piatti produce `movimenti: sys.invalid`.
 */
export function toRegistrazioneRentri(
  m: MovimentoRentri,
  progressivo: number,
): Record<string, unknown> {
  const data = String(m.data_registrazione ?? "").slice(0, 10);
  const dataOra = data ? `${data}T12:00:00Z` : new Date().toISOString();
  const anno = Number(dataOra.slice(0, 4));
  return {
    riferimenti: {
      numero_registrazione: { anno, progressivo },
      data_ora_registrazione: dataOra,
      causale_operazione: "RE",
    },
    rifiuto: {
      codice_eer: String(m.codice_eer ?? "").replace(/\D/g, ""),
      stato_fisico: "S",
      quantita: { valore: Number(m.quantita), unita_misura: m.unita_misura ?? "kg" },
    },
    annotazioni: m.numero_fir ? `Rif. FIR ${m.numero_fir}` : (m.descrizione ?? ""),
  };
}

/** Prossimo progressivo libero per l'anno, letto dal RENTRI (sola lettura). */
async function prossimoProgressivo(
  cliente: RentriCliente,
  registroId: string,
  anno: number,
): Promise<number> {
  try {
    const { movimenti } = await leggiMovimentiRegistroRentri(
      cliente,
      registroId,
      `${anno}-01-01`,
      `${anno}-12-31`,
    );
    const max = movimenti.reduce(
      (acc, m) => (m.anno === anno && Number(m.progressivo) > acc ? Number(m.progressivo) : acc),
      0,
    );
    return max + 1;
  } catch {
    return 1;
  }
}

export interface InvioRegistroResult {
  response: RentriVpsResponse;
  transazioneId: string | null;
  invioId: string | null;
  esitoFinale: "IN_VERIFICA" | "CONFERMATO" | "DA_ANALIZZARE";
  motivoScarto?: string | null;
}

/** Invia i movimenti al registro RENTRI, verifica davvero l'esito e archivia tutto. */
export async function inviaRegistroRentri(params: {
  cliente: RentriCliente;
  registroId: string;
  tenantId: string;
  movimenti: MovimentoRentri[];
}): Promise<InvioRegistroResult> {
  const { cliente, registroId, tenantId, movimenti } = params;
  const registro = registriDisponibili(cliente).find((r) => r.id === registroId);

  const esito = await inviaMovimentiRegistroVerificato(cliente, movimenti, registroId, {
    tentativi: 5,
    attesaMs: 3000,
  });
  const transazioneId = esito.transazioneId ?? estraiTransazioneId(esito.invio.data);

  const motivoScarto = esito.esitoFinale === "DA_ANALIZZARE"
    ? esito.dettaglioTransazione?.error
      ?? esito.invio.error
      ?? esito.invio.userMessage
      ?? "Il RENTRI ha segnalato un errore senza dettagli: controllare la transazione."
    : null;

  const stato = esito.esitoFinale === "CONFERMATO"
    ? "CONFERMATO"
    : esito.esitoFinale === "IN_VERIFICA"
      ? "IN_ATTESA"
      : "ERRORE";

  const { data: inserted } = await supabase
    .from("rentri_invii_registri")
    .insert({
      tenant_id: tenantId,
      cliente: String(cliente),
      registro_id: registroId,
      registro_nome: registro?.nome ?? null,
      tipo: movimenti[0]?.tipo_movimento ?? null,
      movimenti: movimenti as unknown as Record<string, unknown>[],
      num_movimenti: movimenti.length,
      transazione_id: transazioneId,
      stato,
      http_status: esito.invio.status,
      error_message: motivoScarto ?? (esito.invio.success ? null : esito.invio.error ?? esito.invio.userMessage ?? null),
    } as never)
    .select("id")
    .maybeSingle();

  return {
    response: esito.invio,
    transazioneId,
    invioId: inserted?.id ?? null,
    esitoFinale: esito.esitoFinale,
    motivoScarto,
  };
}

function esitoDaTesto(testo: string): "CONFERMATO" | "DA_ANALIZZARE" | null {
  if (/ERRORE|SCARTAT|RIFIUTAT|KO\b/.test(testo)) return "DA_ANALIZZARE";
  if (/CONCLUS|COMPLETAT|ACQUISIT|REGISTRAT|OK\b/.test(testo)) return "CONFERMATO";
  return null;
}

/**
 * Ricontrolla poco dopo l'invio se il RENTRI ha davvero acquisito i movimenti.
 * Riconosce gli esiti reali della transazione, non solo il successo dell'API.
 */
export async function aggiornaStatoInvio(
  invioId: string,
  cliente: RentriCliente,
  transazioneId: string,
  registroId: string,
): Promise<RentriVpsResponse> {
  const tentativi = 5;
  const attesaMs = 3000;
  let ultimo: RentriVpsResponse | undefined;

  for (let i = 0; i < tentativi; i++) {
    await new Promise((r) => setTimeout(r, attesaMs));
    ultimo = await statoTransazioneRegistro(cliente, transazioneId, registroId);
    if (!ultimo.success) continue;
    const esito = esitoDaTesto(JSON.stringify(ultimo.data ?? {}).toUpperCase());
    if (esito === "CONFERMATO") {
      await supabase
        .from("rentri_invii_registri")
        .update({ stato: "CONFERMATO", http_status: ultimo.status, error_message: null })
        .eq("id", invioId);
      return ultimo;
    }
    if (esito === "DA_ANALIZZARE") {
      const motivo = ultimo.error ?? ultimo.userMessage ?? "Il RENTRI ha scartato l'invio senza dettagli.";
      await supabase
        .from("rentri_invii_registri")
        .update({ stato: "ERRORE", http_status: ultimo.status, error_message: motivo })
        .eq("id", invioId);
      return ultimo;
    }
  }

  await supabase
    .from("rentri_invii_registri")
    .update({ stato: "IN_ATTESA", http_status: ultimo?.status ?? null })
    .eq("id", invioId);
  return ultimo ?? { success: false, status: 0, data: null };
}
