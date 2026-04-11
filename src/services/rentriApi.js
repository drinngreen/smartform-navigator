/**
 * RENTRI API Service – routes through VPS proxy (rentri-vps-proxy edge function).
 */
import { inviaOperazioneRentri, emissioneFir, firmaRicezione, richiestaVidimazione, scaricaPdfLotto } from "@/lib/rentriVpsApi";
// ─── Tenant → company mapping ─────────────────────────────
const TENANT_MAP = {
    "167d07ad-9184-484e-85a6-da5ceafa42a3": "global",
    "dc2a6046-d9a8-4549-8e45-82367d695ac6": "multy",
    "77ec9a3d-602e-438f-97bf-1c69abd8f691": "multy",
    "819c783e-78dd-4080-8265-802e75b0d813": "niyol",
};
const MN_CONTEXT_MAP = {
    multyproget: "multy",
    "multyproget-intermediario": "multy",
    "multyproget-impianto": "multy",
    niyol: "niyol",
};
/**
 * Resolve the company name from the user's profile / tenant.
 */
export function resolveSocietaId(tenantId, mnContext) {
    if (mnContext && MN_CONTEXT_MAP[mnContext]) {
        return MN_CONTEXT_MAP[mnContext];
    }
    if (tenantId && TENANT_MAP[tenantId]) {
        return TENANT_MAP[tenantId];
    }
    return "global";
}
// ─── Helper ──────────────────────────────────────────────────
function parseIndirizzo(raw) {
    const match = raw.match(/^(.+?),?\s*(\d{5})?\s+(.+?)(?:\s*\((\w+)\))?$/);
    if (match) {
        return {
            via: match[1]?.trim() || raw,
            cap: match[2] || "",
            comune: match[3]?.trim() || "",
            provincia: match[4] || "",
            nazione_id: "IT",
        };
    }
    return { via: raw, cap: "", comune: "", provincia: "", nazione_id: "IT" };
}
function parseLottoReference(raw) {
    const normalized = raw.trim().replace(/\s+/g, " ").toUpperCase();
    const match = normalized.match(/^([A-Z]{5})\s*(\d{1,6})(?:\s+[A-Z]{2})?$/);
    if (!match)
        return null;
    return {
        codiceBlocco: match[1],
        progressivo: match[2].padStart(6, "0"),
    };
}
// ─── API Functions ───────────────────────────────────────────
export async function checkRentriHealth() {
    try {
        // Use a lightweight VPS call to check health
        const res = await inviaOperazioneRentri({
            cliente: "global",
            tipo_operazione: "LISTA_BLOCCHI",
            payload: {},
        });
        return { ok: res.success, url: "VPS Proxy", status: res.status, body: res.success ? "OK" : (res.error || "Error") };
    }
    catch (err) {
        return { ok: false, url: "VPS Proxy", status: 0, body: err.message || String(err) };
    }
}
/**
 * 1. EMISSIONE — Send FIR data for signature via VPS proxy.
 */
export async function inviaFirmaRentri(payload) {
    const cliente = (payload.societaId.toLowerCase());
    const res = await emissioneFir(cliente, payload.payloadFir);
    if (res.success) {
        const root = res.data || {};
        const firId = root.firId || root.numero_fir || root.fir_id || "";
        return {
            ...root,
            numero_fir: firId,
            firId,
            pdf_content: root.pdf_content || root.pdfContent || root.pdf_base64 || root.pdfBase64 || undefined,
            qr_code: root.qr_code || root.qrCodeBytes || root.qrCode || root.qr_base64 || root.qrBase64 || undefined,
        };
    }
    // Build meaningful error message from model_state if available
    const errData = res.data || {};
    const modelState = errData?.model_state || {};
    const modelErrors = Object.entries(modelState)
        .map(([field, msgs]) => `${translateFieldName(field)}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
        .join("; ");
    const errMsg = modelErrors || res.error || errData?.error || errData?.details || `Errore server (${res.status})`;
    throw new Error(errMsg);
}
/** Translate RENTRI model_state field names to Italian for user-friendly errors */
function translateFieldName(field) {
    const map = {
        "dati_partenza.rifiuto.stato_fisico": "Stato fisico rifiuto",
        "dati_partenza.produttore.indirizzo": "Indirizzo produttore",
        "dati_partenza.produttore.codice_fiscale": "CF produttore",
        "dati_partenza.destinatario.indirizzo": "Indirizzo destinatario",
        "dati_partenza.destinatario.codice_fiscale": "CF destinatario",
        "dati_partenza.destinatario.attivita": "Operazione destinatario (R/D)",
        "dati_partenza.trasportatori[0].numero_iscrizione_albo": "Iscrizione albo trasportatore",
        "num_iscr_sito": "Numero iscrizione sito",
    };
    return map[field] || field;
}
/**
 * 2. GET-PDF — Fetch PDF/QR via VPS proxy.
 */
export async function getRentriPdf(company, firId) {
    const cliente = (company.toLowerCase());
    const lottoRef = parseLottoReference(firId);
    if (!lottoRef) {
        throw new Error("Numero FIR non valido per il recupero PDF/QR");
    }
    const res = await scaricaPdfLotto(cliente, lottoRef.codiceBlocco, lottoRef.progressivo);
    const root = res.data || {};
    const normalized = {
        ...root,
        qrCode: root.qrCode || root.qr_code || root.qrCodeBytes || root.qr_base64 || root.qrBase64 || undefined,
        pdfBase64: root.pdfBase64 || root.pdf_base64 || root.pdf_content || root.pdfContent || root.content || undefined,
        pdfUrl: root.pdfUrl || root.pdf_url || root.url || undefined,
    };
    if (!res.success) {
        const errMsg = res.error || root?.error || `Errore server (${res.status})`;
        throw new Error(errMsg);
    }
    return normalized;
}
/**
 * 3. FIRMA RICEZIONE — Close FIR at destination via VPS proxy.
 */
export async function chiudiFirRentri(payload) {
    const firPayload = {
        dati_arrivo: {
            numero_fir: payload.numero_fir,
            data_ora_arrivo: payload.data_arrivo || new Date().toISOString(),
            destinatario: {
                denominazione: payload.destinatario_denominazione || "",
                codice_fiscale: payload.destinatario_codice_fiscale || "",
                indirizzo: parseIndirizzo(payload.destinatario_indirizzo || ""),
                autorizzazione: {
                    tipo: payload.destinatario_tipo_aut || "AIA",
                    numero: payload.destinatario_numero_aut || "",
                },
            },
            accettazione: {
                accettato: true,
                quantita_ricevuta: {
                    valore: payload.peso_accettato,
                    unita_misura: payload.unita_misura || "kg",
                },
            },
        },
    };
    const cliente = ((payload.societaId || "global").toLowerCase());
    const res = await firmaRicezione(cliente, firPayload);
    if (!res.success) {
        const errMsg = res.error || `Errore server (${res.status})`;
        throw new Error(errMsg);
    }
    return res.data || {};
}
/**
 * 4. VIDIMAZIONE — Request new vidimated FIR numbers via VPS proxy.
 */
export async function richiediNuoviNumeri(company, quantity = 5) {
    const cliente = (company.toLowerCase());
    const res = await richiestaVidimazione(cliente, quantity);
    if (!res.success) {
        throw new Error(res.error || `Errore server (${res.status})`);
    }
    const data = res.data || {};
    let numeri = [];
    if (Array.isArray(data.numeri))
        numeri = data.numeri;
    else if (typeof data.numeri === "string")
        numeri = [data.numeri];
    else if (typeof data.firNumber === "string")
        numeri = [data.firNumber];
    else if (Array.isArray(data.firNumbers))
        numeri = data.firNumbers;
    else if (Array.isArray(data.firCodes))
        numeri = data.firCodes;
    return { ...data, numeri };
}
// ─── URL builders (now use VPS proxy, return empty since PDF is fetched via API) ───
export function getRentriPdfUrl(_numeroFir) {
    return ""; // PDF is fetched via getRentriPdf() API call
}
export function getRentriXfirUrl(_numeroFir) {
    return ""; // xFIR is fetched via API call
}
export function getRentriQrUrl(_numeroFir) {
    return ""; // QR is fetched via API call
}
