import { supabase } from "@/lib/supabaseClient";
export async function inviaOperazioneRentri(request) {
    try {
        const { data, error } = await supabase.functions.invoke("rentri-vps-proxy", {
            body: request,
        });
        if (error) {
            return { success: false, status: 0, data: null, error: error.message };
        }
        return data;
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, status: 0, data: null, error: message };
    }
}
/* ── Helper functions ── */
export function listaBlocchi(cliente) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "LISTA_BLOCCHI", payload: {} });
}
export function richiestaVidimazione(cliente, quantita, codiceBlocco, numIscrSito) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "VIDIMAZIONE",
        payload: { quantita, codice_blocco: codiceBlocco, num_iscr_sito: numIscrSito },
    });
}
export function leggiLotto(cliente, codiceBlocco, progressivo) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "LOTTO",
        payload: { codice_blocco: codiceBlocco, progressivo },
    });
}
export function scaricaPdfLotto(cliente, codiceBlocco, progressivo) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "LOTTO_PDF",
        payload: { codice_blocco: codiceBlocco, progressivo },
    });
}
export function emissioneFir(cliente, firPayload) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "FIR_EMISSIONE", payload: firPayload });
}
export function dettaglioFir(cliente, uuidFir) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "DETTAGLIO_FIR", payload: { uuid_fir: uuidFir } });
}
export function ricercaFir(cliente, numeroFir) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "RICERCA_FIR", payload: { numero_fir: numeroFir } });
}
export function inserimentoMovimento(cliente, movimenti) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "REGISTRO", payload: { movimenti } });
}
export function ricercaMovimenti(cliente, dataDa, dataA) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "RICERCA_MOVIMENTI", payload: { data_da: dataDa, data_a: dataA } });
}
export function statoTransazioneRegistro(cliente, transazioneId) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "TRANSAZIONE_REGISTRO", payload: { transazione_id: transazioneId } });
}
export function statoTransazioneFir(cliente, transazioneId) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "TRANSAZIONE_FIR", payload: { transazione_id: transazioneId } });
}
export function firmaRicezione(cliente, firPayload) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "FIRMA_RICEZIONE", payload: firPayload });
}
