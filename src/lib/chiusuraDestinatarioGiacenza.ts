/**
 * Punto unico per il carico in impianto alla chiusura del formulario da parte
 * del destinatario.
 *
 * Perché esiste: prima ogni schermata usava una chiave documento diversa
 * ("FIR:...:CHIUSURA_DESTINATARIO", "FIR_DESTINO:...:ACCETTAZIONE",
 * "RENTRI:...:ACCETTAZIONE_DESTINATARIO"). L'idempotenza della RPC si basa su
 * quella stringa: chiavi diverse per lo stesso formulario significano doppio
 * carico a magazzino se lo stesso FIR viene chiuso da due schermate.
 *
 * Qui la chiave è una sola, e prima di applicare si verificano anche le chiavi
 * storiche, così i formulari già registrati non vengono contati due volte.
 */
import { supabase } from "@/lib/supabaseClient";

export const normalizzaNumeroDocumento = (numeroFir: string): string =>
  String(numeroFir ?? "").toUpperCase().replace(/\s+/g, "");

/** Chiave unica dell'evento "chiusura del destinatario" per un formulario. */
export const documentoChiusuraDestinatario = (numeroFir: string): string =>
  `FIR:${normalizzaNumeroDocumento(numeroFir)}:CHIUSURA_DESTINATARIO`;

/** Chiavi usate in passato dalle singole schermate, riconosciute in lettura. */
export const documentiChiusuraStorici = (numeroFir: string): string[] => {
  const n = normalizzaNumeroDocumento(numeroFir);
  const grezzo = String(numeroFir ?? "").trim();
  return [
    ...new Set([
      `FIR:${n}:CHIUSURA_DESTINATARIO`,
      `FIR:${grezzo}:CHIUSURA_DESTINATARIO`,
      `FIR_DESTINO:${n}:ACCETTAZIONE`,
      `FIR_DESTINO:${grezzo}:ACCETTAZIONE`,
      `RENTRI:${n}:ACCETTAZIONE_DESTINATARIO`,
      `RENTRI:${grezzo}:ACCETTAZIONE_DESTINATARIO`,
    ]),
  ].filter(Boolean);
};

/** true quando il carico di questo formulario risulta già applicato. */
export async function chiusuraGiaApplicata(numeroFir: string): Promise<boolean> {
  const chiavi = documentiChiusuraStorici(numeroFir);
  if (chiavi.length === 0) return false;
  const { data, error } = await supabase
    .from("giacenze_applicazioni" as never)
    .select("id")
    .in("documento", chiavi)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export interface ChiusuraDestinatarioInput {
  tenantId: string;
  impiantoId: string;
  numeroFir: string;
  cer: string;
  quantitaKg: number;
  /** Esito dichiarato dall'impianto: il respinto non entra mai in giacenza. */
  esito: "accettato" | "parziale" | "respinto";
  descrizione?: string | null;
  firId?: string | null;
  causale?: string;
}

export type ChiusuraDestinatarioEsito =
  | { applicato: true }
  | { applicato: false; motivo: string };

/**
 * Applica il carico in impianto dopo la chiusura certificata del destinatario.
 * Non decide nulla da sola: viene chiamata solo dopo una conferma umana e,
 * nel digitale, solo dopo l'esito positivo del RENTRI.
 */
export async function applicaChiusuraDestinatario(
  input: ChiusuraDestinatarioInput,
): Promise<ChiusuraDestinatarioEsito> {
  if (input.esito === "respinto")
    return { applicato: false, motivo: "Carico respinto: nessun movimento di giacenza, il rifiuto resta al trasportatore." };

  const cer = String(input.cer ?? "").toUpperCase().replace(/\s+/g, "");
  if (!cer) return { applicato: false, motivo: "Codice CER mancante: giacenze non aggiornate." };

  const quantita = Number(input.quantitaKg);
  if (!Number.isFinite(quantita) || quantita <= 0)
    return { applicato: false, motivo: "Peso verificato a destino mancante o non valido: giacenze non aggiornate." };

  const numero = normalizzaNumeroDocumento(input.numeroFir);
  if (!numero) return { applicato: false, motivo: "Numero formulario mancante: giacenze non aggiornate." };

  if (await chiusuraGiaApplicata(numero))
    return { applicato: false, motivo: "Carico già registrato per questo formulario: nessun doppio movimento." };

  const { error } = await (supabase as never as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).rpc("applica_movimento_giacenza", {
    p_tenant_id: input.tenantId,
    p_impianto_id: input.impiantoId,
    p_cer: cer,
    p_quantita_kg: quantita,
    p_segno: "CARICO",
    p_causale: input.causale ?? "FIR_DIGITALE_CHIUSO_DESTINATARIO",
    p_documento: documentoChiusuraDestinatario(numero),
    p_attore: "human",
    p_descrizione: input.descrizione ?? null,
    p_fir_id: input.firId ?? null,
    p_numero_fir: numero,
  });
  if (error) throw new Error(error.message);
  return { applicato: true };
}
