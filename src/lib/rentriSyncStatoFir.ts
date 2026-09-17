/**
 * Allineamento dello stato di un formulario locale alla verità del RENTRI.
 *
 * Regola: la fonte è SEMPRE una lettura fresca del RENTRI. Nessuno stato viene
 * dedotto da log, HTTP 202, transazioni o PDF. Se il RENTRI non risponde, il
 * record locale resta invariato.
 */
import { supabase } from "@/integrations/supabase/client";
import { inviaOperazioneRentriCustom, type RentriCliente } from "@/lib/rentriVpsApi";

export type StatoViaggioFir = "bozza" | "da-firmare" | "in-viaggio" | "chiuso";

/** Mappa lo stato RENTRI sullo stato di viaggio mostrato nell'app. */
export function statoViaggioDaRentri(statoFormulario: string | null | undefined): StatoViaggioFir {
  const s = String(statoFormulario ?? "").trim();
  if (!s) return "bozza";
  if (/^InserimentoTrasporto/i.test(s)) return "bozza";
  if (/^Firma(Produttore|Trasportatore)/i.test(s)) return "da-firmare";
  if (/^(InserimentoAccettazione|FirmaDestinatario|Accettazione)/i.test(s)) return "in-viaggio";
  if (/(Concluso|Chiuso|Completato|Respinto)/i.test(s)) return "chiuso";
  return "bozza";
}

export interface SyncStatoFirResult {
  ok: boolean;
  statoRentri?: string;
  versione?: number;
  statoViaggio?: StatoViaggioFir;
  aggiornato: boolean;
  errore?: string;
  dettaglio?: Record<string, unknown>;
}

const normalizza = (n: string) => String(n ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Legge dal RENTRI il dettaglio del formulario. Nessuna scrittura. */
export async function leggiStatoFirRentri(cliente: RentriCliente, numeroFir: string) {
  return inviaOperazioneRentriCustom(cliente, "GET", `/formulari/v1.0/${normalizza(numeroFir)}`);
}

/**
 * Legge il RENTRI e, se il formulario risulta firmato/partito, allinea il
 * record locale (stato + riferimenti RENTRI). Non tocca giacenze né registri.
 */
export async function sincronizzaStatoFirDaRentri(
  cliente: RentriCliente,
  numeroFir: string,
  formId: string,
): Promise<SyncStatoFirResult> {
  const res = await leggiStatoFirRentri(cliente, numeroFir);
  if (!res.success || !res.data) {
    return { ok: false, aggiornato: false, errore: res.error || "RENTRI non raggiungibile" };
  }

  const d = res.data as Record<string, any>;
  const statoRentri = String(d.stato_formulario ?? "");
  const versione = Number(d.versione ?? 0) || undefined;
  const statoViaggio = statoViaggioDaRentri(statoRentri);

  if (statoViaggio === "bozza" || statoViaggio === "da-firmare") {
    return { ok: true, statoRentri, versione, statoViaggio, aggiornato: false, dettaglio: d };
  }

  const { data: row, error: readErr } = await supabase
    .from("fir_forms")
    .select("id, status, form_data")
    .eq("id", formId)
    .maybeSingle();
  if (readErr || !row) {
    return { ok: false, statoRentri, versione, statoViaggio, aggiornato: false, errore: "Formulario locale non trovato" };
  }

  const firmaProduttore = d?.dati_partenza?.dati_firma_produttore ?? {};
  const formData = {
    ...((row.form_data as Record<string, unknown>) ?? {}),
    rentri_fir_id: numeroFir,
    rentri_stato: statoRentri,
    rentri_versione: versione ?? null,
    rentri_data_firma: firmaProduttore?.data_firma ?? null,
    rentri_credentials_id: firmaProduttore?.credentials_id ?? null,
    rentri_sync_at: new Date().toISOString(),
  };

  const status = statoViaggio === "chiuso" ? "completato" : "inviato";
  const { error: updErr } = await supabase
    .from("fir_forms")
    .update({
      status,
      form_data: formData as never,
      submitted_at: firmaProduttore?.data_firma ?? new Date().toISOString(),
    })
    .eq("id", formId);

  if (updErr) {
    return { ok: false, statoRentri, versione, statoViaggio, aggiornato: false, errore: updErr.message };
  }

  return { ok: true, statoRentri, versione, statoViaggio, aggiornato: true, dettaglio: d };
}
