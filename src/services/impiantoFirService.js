import { accettaFirInArrivoDestinatario, listaFirInArrivoDestinatario, ricercaFir, firmaRicezione, } from "@/lib/rentriVpsApi";
import { supabase } from "@/lib/supabaseClient";
function extractRentriFirItems(data) {
    if (Array.isArray(data))
        return data;
    if (!data || typeof data !== "object")
        return [];
    const record = data;
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
        if (Array.isArray(candidate))
            return candidate;
    }
    return [];
}
function toIsoDateTime(dataArrivo, oraArrivo) {
    const raw = `${dataArrivo}T${oraArrivo}:00`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
}
function mapEsitoConferimento(esito) {
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
export async function searchXFir(cliente, numeroFir) {
    return ricercaFir(cliente, numeroFir);
}
export async function listIncomingXFir(cliente, identificativoSoggetto) {
    const res = await listaFirInArrivoDestinatario(cliente, identificativoSoggetto);
    if (!res.success) {
        throw new Error(res.error || "Errore recupero FIR in arrivo");
    }
    return extractRentriFirItems(res.data)
        .map((raw, index) => {
        const d = raw;
        const summary = parseRentriToSummary(d);
        const uuid = String(d.uuid ?? d.id ?? d.uuid_fir ?? d.firId ?? summary.numero_fir ?? `incoming-${index}`);
        const dataRicezione = String(d.data_ora_ricezione ?? d.data_arrivo ?? d.created_at ?? new Date().toISOString());
        return {
            id: uuid,
            numero_fir: summary.numero_fir || "",
            produttore: summary.produttore || "",
            trasportatore: summary.trasportatore || "",
            destinatario: summary.destinatario || "",
            cer: summary.cer || "",
            quantita: Number(summary.quantita || 0),
            unita_misura: summary.unita_misura || "kg",
            stato_interno: "attesa_firma_ricezione",
            stato_rentri: String(d.stato ?? d.stato_fir ?? d.esito ?? "IN_ARRIVO"),
            data_ricezione: dataRicezione,
            firma_ricezione_at: null,
            firma_destinatario_at: null,
        };
    })
        .filter((item) => Boolean(item.id && item.numero_fir));
}
export async function signIncomingXFir(cliente, uuidFir, payload, numIscrSito) {
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
