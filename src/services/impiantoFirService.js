import { ricercaFir, firmaRicezione } from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
/**
 * Search a FIR on RENTRI by number
 */
export async function searchXFir(cliente, numeroFir) {
    return ricercaFir(cliente, numeroFir);
}
/**
 * Import an xFIR into the local impianto_fir_inbox
 */
export async function importXFir(impiantoAccountId, firData, tenantId) {
    const { data, error } = await supabase
        .from("impianto_fir_inbox")
        .insert({
        impianto_account_id: impiantoAccountId,
        fir_number: firData.numero_fir || firData.numeroFir || "",
        stato: "importato",
        rentri_data: firData,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
    })
        .select("id")
        .single();
    if (error)
        return { success: false, error: error.message };
    return { success: true, id: data?.id };
}
/**
 * Sign reception (firma ricezione) on RENTRI
 */
export async function signReceptionXFir(cliente, payload) {
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
export async function signDestinationXFir(cliente, payload) {
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
export function parseRentriToSummary(raw) {
    const d = raw;
    return {
        numero_fir: d.numero_fir || d.numeroFir || d.numero || "",
        produttore: d.produttore?.denominazione || d.produttore_denominazione || "",
        trasportatore: d.trasportatore?.denominazione || d.trasportatore_denominazione || "",
        destinatario: d.destinatario?.denominazione || d.destinatario_denominazione || "",
        cer: d.codice_eer || d.rifiuto?.codice_eer || "",
        quantita: Number(d.quantita || d.rifiuto?.quantita || 0),
        unita_misura: d.unita_misura || d.rifiuto?.unita_misura || "kg",
    };
}
