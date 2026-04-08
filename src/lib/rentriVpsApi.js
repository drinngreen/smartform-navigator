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
const FIR_NUMBER_REGEX = /^[A-Z]{5}\s+\d{6}\s+[A-Z]{2}$/;
function formatProgressivo(value) {
    const raw = String(value ?? "").trim();
    if (!raw)
        return "";
    return /^\d+$/.test(raw) ? raw.padStart(6, "0") : raw;
}
function normalizeFirNumber(value) {
    const normalized = String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
    return FIR_NUMBER_REGEX.test(normalized) ? normalized : "";
}
function readBlockProgressivo(blocchiRes, codiceBlocco) {
    const payload = blocchiRes.data;
    const blocchi = Array.isArray(payload?.blocchi)
        ? payload.blocchi
        : Array.isArray(payload)
            ? payload
            : [];
    const blocco = blocchi.find((b) => b?.codice_blocco === codiceBlocco);
    const progressivo = Number(blocco?.numero_fir_vidimati ?? blocco?.progressivo ?? 0);
    return Number.isFinite(progressivo) ? progressivo : 0;
}
function collectFirNumbers(value, found = new Set()) {
    if (value == null)
        return found;
    if (typeof value === "string") {
        const normalized = normalizeFirNumber(value);
        if (normalized)
            found.add(normalized);
        return found;
    }
    if (Array.isArray(value)) {
        for (const item of value)
            collectFirNumbers(item, found);
        return found;
    }
    if (typeof value === "object") {
        const record = value;
        for (const key of ["numero_fir", "numeroFir", "firNumber", "numero"]) {
            const normalized = normalizeFirNumber(record[key]);
            if (normalized)
                found.add(normalized);
        }
        for (const nested of Object.values(record)) {
            collectFirNumbers(nested, found);
        }
    }
    return found;
}
/**
 * Orchestrates the full async vidimazione flow:
 * 1. Read LISTA_BLOCCHI to get current count
 * 2. Send VIDIMAZIONE request
 * 3. If numbers returned immediately → use them
 * 4. Otherwise poll transaction + LOTTO until RENTRI really exposes all requested numbers
 */
export async function vidimaFIRAsync(cliente, quantita, codiceBlocco, numIscrSito, onProgress) {
    onProgress?.("Lettura stato blocco…");
    const blocchiRes = await listaBlocchi(cliente);
    const startProgressivo = readBlockProgressivo(blocchiRes, codiceBlocco);
    onProgress?.("Invio richiesta vidimazione…");
    const vidRes = await richiestaVidimazione(cliente, quantita, codiceBlocco, numIscrSito);
    const vidData = vidRes.data || {};
    const transazioneId = vidData.transazione_id || vidData.transazioneId || vidData.id_transazione || undefined;
    const numeri = extractFirNumbers(vidData);
    const knownNumbers = new Set(numeri);
    const retrievedProgressivi = new Set();
    let maxProgressivoToRead = startProgressivo;
    if (numeri.length >= quantita) {
        return {
            numeri: numeri.slice(0, quantita),
            transazione_id: transazioneId,
            pending: false,
            partial: false,
        };
    }
    if (!transazioneId && !vidRes.success && numeri.length === 0) {
        return { numeri: [], transazione_id: undefined, pending: false, partial: false };
    }
    onProgress?.("Richiesta accettata, recupero numeri in corso…");
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries && numeri.length < quantita; attempt++) {
        if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 4000));
        }
        try {
            const blocchiPollRes = await listaBlocchi(cliente);
            const currentProgressivo = readBlockProgressivo(blocchiPollRes, codiceBlocco);
            maxProgressivoToRead = Math.max(maxProgressivoToRead, currentProgressivo);
        }
        catch {
            // keep last known progressivo window
        }
        if (transazioneId) {
            try {
                const txRes = await statoTransazioneFir(cliente, transazioneId);
                if (txRes.success) {
                    for (const firNum of extractFirNumbers(txRes.data)) {
                        if (!knownNumbers.has(firNum)) {
                            knownNumbers.add(firNum);
                            numeri.push(firNum);
                        }
                    }
                    const txData = txRes.data || {};
                    const txProgressivo = Number(txData.numero_fir_vidimati ??
                        txData.progressivo ??
                        txData.ultimo_progressivo ??
                        txData.progressivo_finale ??
                        txData.max_progressivo ??
                        0);
                    if (Number.isFinite(txProgressivo) && txProgressivo > 0) {
                        maxProgressivoToRead = Math.max(maxProgressivoToRead, txProgressivo);
                    }
                }
            }
            catch {
                // transaction endpoint may lag behind LOTTO exposure
            }
        }
        const releasedCount = Math.max(0, maxProgressivoToRead - startProgressivo);
        const cappedMaxProgressivo = Math.min(startProgressivo + quantita, maxProgressivoToRead);
        onProgress?.(`Recupero numeri… ${numeri.length}/${quantita} (rilasciati ${Math.min(releasedCount, quantita)}/${quantita}, tentativo ${attempt + 1}/${maxRetries})`);
        for (let p = startProgressivo + 1; p <= cappedMaxProgressivo && numeri.length < quantita; p++) {
            if (retrievedProgressivi.has(p))
                continue;
            try {
                const lottoRes = await leggiLotto(cliente, codiceBlocco, formatProgressivo(p));
                if (!lottoRes.success)
                    continue;
                const lottoNumbers = extractFirNumbers(lottoRes.data);
                if (lottoNumbers.length === 0)
                    continue;
                retrievedProgressivi.add(p);
                for (const firNum of lottoNumbers) {
                    if (!knownNumbers.has(firNum)) {
                        knownNumbers.add(firNum);
                        numeri.push(firNum);
                    }
                }
            }
            catch {
                // specific progressivo not ready yet, retry on next cycle
            }
        }
    }
    return {
        numeri: numeri.slice(0, quantita),
        transazione_id: transazioneId,
        pending: numeri.length === 0,
        partial: numeri.length > 0 && numeri.length < quantita,
    };
}
/** Extract FIR numbers from any response shape */
function extractFirNumbers(data) {
    return Array.from(collectFirNumbers(data));
}
