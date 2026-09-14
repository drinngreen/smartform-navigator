import { supabase } from "@/lib/supabaseClient";
import {
  inserimentoMovimento,
  statoTransazioneRegistro,
  estraiTransazioneId,
  rentriConfigKey,
  RENTRI_UNITA_LOCALI,
  type RentriCliente,
  type RentriVpsResponse,
} from "@/lib/rentriVpsApi";

/** Registro di destinazione per i conferimenti dei privati (impianto Multyproget). */
export const REGISTRO_PRIVATI_ID = "RAH20NP7O40";

export interface InvioPrivatoRow {
  id: string;
  tenant_id: string;
  conferimento_id: string | null;
  numero_riga: number | null;
  data_movimento: string;
  cer: string;
  kg: number;
  produttore: string | null;
  mezzo: string | null;
  progressivo_rentri: string | null;
  transazione_id: string | null;
  id_ricevuta: string | null;
  esito: string | null;
  data_invio: string | null;
  stato: string;
  origine: string;
  created_at: string;
}

export interface ConferimentoPrivatoRow {
  id: string;
  data: string;
  cer: string;
  kg_pesati: number | null;
  nome_privato: string | null;
  targa_automezzo: string | null;
  modello_automezzo: string | null;
  numero_progressivo: number | null;
}

/** Chiave di confronto usata per capire se un conferimento è già stato inviato. */
export function chiaveConferimento(data: string, cer: string, kg: number | null): string {
  const d = data.slice(0, 10);
  return `${d}|${String(cer).toUpperCase()}|${Math.round(Number(kg ?? 0))}`;
}

/** Archivio completo degli invii privati (terminale + app). */
export async function caricaInviiPrivati(tenantId: string): Promise<InvioPrivatoRow[]> {
  const { data, error } = await supabase
    .from("rentri_invii_privati")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("data_movimento", { ascending: false })
    .order("numero_riga", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvioPrivatoRow[];
}

/** Conferimenti privati che non risultano ancora inviati al RENTRI. */
export async function caricaPrivatiDaInviare(
  tenantId: string,
  invii: InvioPrivatoRow[],
): Promise<ConferimentoPrivatoRow[]> {
  const { data, error } = await supabase
    .from("privati_conferimenti")
    .select("id, data, cer, kg_pesati, nome_privato, targa_automezzo, modello_automezzo, numero_progressivo")
    .eq("tenant_id", tenantId)
    .order("data", { ascending: false })
    .limit(500);
  if (error) throw error;

  const idsInviati = new Set(invii.map((i) => i.conferimento_id).filter(Boolean) as string[]);
  const chiaviInviate = new Set(invii.map((i) => chiaveConferimento(i.data_movimento, i.cer, i.kg)));

  return ((data ?? []) as unknown as ConferimentoPrivatoRow[]).filter(
    (c) =>
      !idsInviati.has(c.id) &&
      !chiaviInviate.has(chiaveConferimento(String(c.data), c.cer ?? "", c.kg_pesati)),
  );
}

/** Conferimento privato → movimento di carico nel registro RENTRI. */
export function mapConferimentoToMovimento(c: ConferimentoPrivatoRow, cliente: RentriCliente) {
  const unita = RENTRI_UNITA_LOCALI[rentriConfigKey(cliente)] ?? "";
  return {
    tipo_movimento: "CARICO" as const,
    data_registrazione: String(c.data).slice(0, 10),
    codice_eer: String(c.cer ?? "").replace(/\D/g, "").slice(0, 6),
    descrizione: `Conferimento privato — ${c.nome_privato ?? ""}`.trim(),
    quantita: Number(c.kg_pesati ?? 0),
    unita_misura: "kg" as const,
    num_iscr_sito: unita,
    riferimento_interno: c.id,
  };
}

export interface EsitoInvioPrivato {
  response: RentriVpsResponse;
  transazioneId: string | null;
  inseriti: number;
}

/**
 * Invia al RENTRI (via bridge VPS) i conferimenti privati selezionati e
 * archivia l'esito nel solo elenco `rentri_invii_privati`.
 * Nessuna scrittura su conferimenti, ricevute, movimenti o giacenze.
 */
export async function inviaConferimentiPrivati(params: {
  cliente: RentriCliente;
  tenantId: string;
  conferimenti: ConferimentoPrivatoRow[];
  registroId?: string;
}): Promise<EsitoInvioPrivato> {
  const { cliente, tenantId, conferimenti } = params;
  const registroId = params.registroId ?? REGISTRO_PRIVATI_ID;
  const movimenti = conferimenti.map((c) => mapConferimentoToMovimento(c, cliente));

  const response = await inserimentoMovimento(cliente, movimenti, registroId);
  const transazioneId = estraiTransazioneId(response.data);

  const righe = conferimenti.map((c) => ({
    tenant_id: tenantId,
    conferimento_id: c.id,
    data_movimento: String(c.data).slice(0, 10),
    cer: String(c.cer ?? "").toUpperCase(),
    kg: Number(c.kg_pesati ?? 0),
    produttore: c.nome_privato,
    mezzo: [c.modello_automezzo, c.targa_automezzo].filter(Boolean).join(" "),
    transazione_id: transazioneId,
    data_invio: new Date().toISOString().slice(0, 10),
    esito: response.success
      ? `Inviato dall'app (HTTP ${response.status}). In attesa di verifica.`
      : (response.userMessage ?? response.error ?? "Invio non riuscito"),
    stato: response.success ? "IN_VERIFICA" : "ERRORE",
    origine: "APP",
    unique_key: `APP-${c.id}`,
  }));

  const { data: inserted } = await supabase
    .from("rentri_invii_privati")
    .upsert(righe as never, { onConflict: "unique_key" })
    .select("id");

  return { response, transazioneId, inseriti: inserted?.length ?? 0 };
}

/** Richiede al RENTRI lo stato della transazione e aggiorna la riga d'archivio. */
export async function verificaInvioPrivato(
  riga: InvioPrivatoRow,
  cliente: RentriCliente,
  registroId = REGISTRO_PRIVATI_ID,
): Promise<RentriVpsResponse | null> {
  if (!riga.transazione_id) return null;
  const res = await statoTransazioneRegistro(cliente, riga.transazione_id, registroId);
  const testo = JSON.stringify(res.data ?? {}).toUpperCase();
  let stato = riga.stato;
  if (!res.success || /ERRORE|SCARTAT|RIFIUTAT|KO\b/.test(testo)) stato = "DA_ANALIZZARE";
  else if (/CONCLUS|COMPLETAT|ACQUISIT|REGISTRAT|OK\b/.test(testo)) stato = "CONFERMATO";
  else stato = "IN_VERIFICA";

  await supabase
    .from("rentri_invii_privati")
    .update({
      stato,
      esito: res.success
        ? `Verifica transazione: ${stato.toLowerCase().replace("_", " ")}.`
        : (res.userMessage ?? res.error ?? "Verifica non riuscita"),
    } as never)
    .eq("id", riga.id);

  return res;
}
