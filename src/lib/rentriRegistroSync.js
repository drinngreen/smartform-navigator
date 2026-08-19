import { supabase } from "@/lib/supabaseClient";
import { inserimentoMovimento, statoTransazioneRegistro, registriDisponibili, rentriConfigKey, RENTRI_UNITA_LOCALI, } from "@/lib/rentriVpsApi";
/** Converte i movimenti di impianto salvati a DB nel payload movimenti RENTRI. */
export function mapMovimentiToRentri(rows, cliente) {
    const unita = RENTRI_UNITA_LOCALI[rentriConfigKey(cliente)] ?? "";
    return rows
        .filter((r) => r.cer && Number(r.quantita_kg) > 0)
        .map((r) => ({
        tipo_movimento: (String(r.tipo_movimento).toUpperCase() === "SCARICO" ? "SCARICO" : "CARICO"),
        data_registrazione: r.data_movimento ?? new Date().toISOString().slice(0, 10),
        codice_eer: String(r.cer).replace(/\D/g, ""),
        descrizione: r.descrizione_rifiuto ?? "",
        quantita: Number(r.quantita_kg),
        unita_misura: "kg",
        num_iscr_sito: unita,
        numero_fir: r.numero_fir,
        riferimento_interno: r.id,
    }));
}
/** Carica i movimenti candidati all'invio per un intervallo di date. */
export async function caricaMovimentiCandidati(tenantId, dataDa, dataA) {
    const { data, error } = await supabase
        .from("movimenti_impianto")
        .select("id, cer, descrizione_rifiuto, quantita_kg, data_movimento, tipo_movimento, numero_fir, produttore_denominazione, destinatario_denominazione")
        .eq("tenant_id", tenantId)
        .gte("data_movimento", dataDa)
        .lte("data_movimento", dataA)
        .order("data_movimento", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
}
function estraiTransazioneId(data) {
    if (!data || typeof data !== "object")
        return null;
    const r = data;
    const candidate = r.transazione_id ?? r.transazioneId ?? r.id_transazione ?? r.identificativo ?? r.id;
    return candidate ? String(candidate) : null;
}
/** Invia i movimenti al registro RENTRI e archivia l'esito. */
export async function inviaRegistroRentri(params) {
    const { cliente, registroId, tenantId, movimenti } = params;
    const registro = registriDisponibili(cliente).find((r) => r.id === registroId);
    const response = await inserimentoMovimento(cliente, movimenti, registroId);
    const transazioneId = estraiTransazioneId(response.data);
    const { data: inserted } = await supabase
        .from("rentri_invii_registri")
        .insert({
        tenant_id: tenantId,
        cliente: String(cliente),
        registro_id: registroId,
        registro_nome: registro?.nome ?? null,
        tipo: movimenti[0]?.tipo_movimento ?? null,
        movimenti: movimenti,
        num_movimenti: movimenti.length,
        transazione_id: transazioneId,
        stato: response.success ? (transazioneId ? "IN_ATTESA" : "INVIATO") : "ERRORE",
        http_status: response.status,
        error_message: response.success ? null : response.error ?? response.userMessage ?? null,
    })
        .select("id")
        .maybeSingle();
    return { response, transazioneId, invioId: inserted?.id ?? null };
}
/** Aggiorna lo stato di un invio interrogando la transazione RENTRI. */
export async function aggiornaStatoInvio(invioId, cliente, transazioneId, registroId) {
    const res = await statoTransazioneRegistro(cliente, transazioneId, registroId);
    const stato = res.success ? "CONFERMATO" : "ERRORE";
    await supabase
        .from("rentri_invii_registri")
        .update({
        stato,
        http_status: res.status,
        error_message: res.success ? null : res.error ?? res.userMessage ?? null,
    })
        .eq("id", invioId);
    return res;
}
