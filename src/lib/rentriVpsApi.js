import { supabase } from "@/lib/supabaseClient";
import { rentriErrorCodeForStatus, rentriUserMessage, sanitizeRentriMessage, } from "@/lib/rentriErrorMessages";
const RENTRI_OFFLINE_MESSAGE = "RENTRI momentaneamente non raggiungibile: puoi continuare a compilare, modificare e salvare i FIR localmente.";
export function isRentriConnectivityError(message) {
    return /No route to host|Connection timed out|tcp connect error|Connection refused|client error \(Connect\)|Edge function returned 500|network|aborted|timeout|offline|failed to fetch|relay/i.test(message);
}
export function isRentriOfflineResponse(response) {
    const data = response?.data;
    const dataError = typeof data?.error === "string" ? data.error : "";
    return Boolean(response?.rentri_offline || data?.rentri_offline || isRentriConnectivityError(`${response?.error ?? ""} ${dataError}`));
}
function normalizeRentriResponse(data) {
    if (data && typeof data === "object" && "success" in data) {
        const record = data;
        const nested = record.data;
        const success = Boolean(record.success);
        const status = Number(record.status ?? (record.rentri_offline ? 503 : success ? 200 : 0));
        const technical = typeof record.error === "string" ? sanitizeRentriMessage(record.error) : undefined;
        return {
            success,
            status,
            data: record.data ?? null,
            error: technical,
            userMessage: success ? "Operazione completata." : rentriUserMessage(status, technical),
            errorCode: (typeof record.error_code === "string"
                ? record.error_code
                : rentriErrorCodeForStatus(status)),
            mode: record.mode === "dry_run" ? "dry_run" : "real",
            preview: record.preview ?? undefined,
            validation: record.validation ?? undefined,
            errori: Array.isArray(record.errori) ? record.errori : undefined,
            rentri_offline: Boolean(record.rentri_offline || nested?.rentri_offline),
            retry_after_ms: typeof record.retry_after_ms === "number" ? record.retry_after_ms : undefined,
        };
    }
    return {
        success: false,
        status: 0,
        data: data ?? null,
        error: "Risposta RENTRI non valida",
        userMessage: "Risposta del servizio non valida. Riprovare più tardi.",
        errorCode: "UNKNOWN",
    };
}
/** Legge il body strutturato dalla Response allegata agli errori non-2xx di functions.invoke */
async function readInvokeError(error) {
    const context = error?.context;
    if (!context || typeof context.text !== "function") {
        return { status: 0, body: null, text: null };
    }
    const status = Number(context.status ?? 0);
    try {
        const text = await context.clone().text();
        try {
            const parsed = JSON.parse(text);
            return {
                status,
                body: parsed && typeof parsed === "object" ? parsed : null,
                text,
            };
        }
        catch {
            return { status, body: null, text };
        }
    }
    catch {
        return { status, body: null, text: null };
    }
}
export async function inviaOperazioneRentri(request) {
    try {
        const { data, error } = await supabase.functions.invoke("rentri-vps-proxy", {
            body: request,
        });
        if (error) {
            const { status, body } = await readInvokeError(error);
            // FunctionsHttpError con body JSON strutturato dalla Edge Function
            if (body && "success" in body) {
                const normalized = normalizeRentriResponse(body);
                return { ...normalized, success: false, status: normalized.status || status };
            }
            // FunctionsHttpError con body non JSON → status HTTP ancora utilizzabile
            if (status >= 400) {
                return {
                    success: false,
                    status,
                    data: null,
                    error: sanitizeRentriMessage(error.message),
                    userMessage: rentriUserMessage(status),
                    errorCode: rentriErrorCodeForStatus(status),
                    rentri_offline: status === 502 || status === 503 || status === 504,
                };
            }
            // FunctionsRelayError / FunctionsFetchError: nessuna Response utilizzabile
            const offline = isRentriConnectivityError(error.message ?? "");
            return {
                success: false,
                status: offline ? 503 : 0,
                data: null,
                error: sanitizeRentriMessage(error.message),
                userMessage: offline ? RENTRI_OFFLINE_MESSAGE : "Operazione non riuscita: servizio non raggiungibile.",
                errorCode: offline ? "BRIDGE_UNAVAILABLE" : "NETWORK_ERROR",
                rentri_offline: offline,
            };
        }
        return normalizeRentriResponse(data);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const offline = isRentriConnectivityError(message);
        return {
            success: false,
            status: offline ? 503 : 0,
            data: null,
            error: sanitizeRentriMessage(message),
            userMessage: offline ? RENTRI_OFFLINE_MESSAGE : "Operazione non riuscita.",
            errorCode: offline ? "BRIDGE_UNAVAILABLE" : "NETWORK_ERROR",
            rentri_offline: offline,
        };
    }
}
/* ── Dry-run: verifica configurazione, nessun invio ── */
/**
 * Verifica la configurazione RENTRI senza inviare nulla al bridge.
 * La Edge Function in modalità dry_run non esegue alcuna fetch esterna.
 */
export function verificaConfigurazioneRentri(cliente, tipoOperazione = "LISTA_BLOCCHI", payload = null, route) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: tipoOperazione,
        payload,
        dry_run: true,
        ...(route ? { rentri_method: route.method, rentri_path: route.path } : {}),
    });
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
export const RENTRI_UNITA_LOCALI = {
    multy: "OP2501XMQ021914-TO0001",
    niyol: "OP2501SXW021767-TO0001",
    global: "OP2501RMK022692-TO0001",
};
export const RENTRI_ISSUERS = {
    multy: "12347770013",
    niyol: "09879800010",
    global: "08934760961",
};
/** Blocco di vidimazione corrente per ciascuna società. */
export const RENTRI_BLOCCO_CORRENTE = {
    multy: "ZRZXR",
    niyol: "BPJMG",
};
export const RENTRI_REGISTRI = {
    multy: [
        { id: "RAH20NP7O40", nome: "Registro Impianto / Produttore", tipo: "IMPIANTO" },
        { id: "RQCTGTP7NT0", nome: "Registro Trasporto (Conto Proprio)", tipo: "TRASPORTO" },
        { id: "RQEL39R7NS0", nome: "Registro Intermediario", tipo: "INTERMEDIARIO" },
    ],
    niyol: [{ id: "RTR31497PX0", nome: "Registro Trasporto", tipo: "TRASPORTO" }],
    global: [{ id: "R6QSWHZ6HJV", nome: "Registro Global Reco", tipo: "IMPIANTO" }],
};
/** Normalizza `multyproget` → `multy` per la lettura del catalogo. */
export function rentriConfigKey(cliente) {
    const n = String(cliente).toLowerCase();
    if (n === "multyproget")
        return "multy";
    if (n === "globalreco")
        return "global";
    return n;
}
export function registriDisponibili(cliente) {
    return RENTRI_REGISTRI[rentriConfigKey(cliente)] ?? [];
}
export function inserimentoMovimento(cliente, movimenti, registroId) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "REGISTRO",
        payload: { movimenti, ...(registroId ? { registro_id: registroId } : {}) },
    });
}
export function ricercaMovimenti(cliente, dataDa, dataA, registroId) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "RICERCA_MOVIMENTI",
        payload: { data_da: dataDa, data_a: dataA, ...(registroId ? { registro_id: registroId } : {}) },
    });
}
export function statoTransazioneRegistro(cliente, transazioneId, registroId) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "TRANSAZIONE_REGISTRO",
        payload: { transazione_id: transazioneId, ...(registroId ? { registro_id: registroId } : {}) },
    });
}
export function statoTransazioneFir(cliente, transazioneId) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "TRANSAZIONE_FIR", payload: { transazione_id: transazioneId } });
}
/** Stato di una transazione di VIDIMAZIONE (endpoint diverso da quello dei formulari) */
export function statoTransazioneVidimazione(cliente, transazioneId) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "TRANSAZIONE_VIDIMAZIONE",
        payload: { transazione_id: transazioneId },
    });
}
export function firmaRicezione(cliente, firPayload) {
    return inviaOperazioneRentri({ cliente, tipo_operazione: "FIRMA_RICEZIONE", payload: firPayload });
}
export function inviaOperazioneRentriCustom(cliente, method, path, payload = null) {
    return inviaOperazioneRentri({
        cliente,
        tipo_operazione: "CUSTOM",
        rentri_method: method,
        rentri_path: path,
        payload,
    });
}
/** Codice fiscale ufficiale usato come `identificativo_soggetto` nelle API Formulari RENTRI */
export const RENTRI_CF_SOGGETTO = {
    multy: "12347770013",
    niyol: "09879800010",
    global: "08934760961",
};
function soggettoQuery(cliente, codiceFiscale, numIscrSito) {
    const key = rentriConfigKey(cliente);
    return new URLSearchParams({
        identificativo_soggetto: codiceFiscale || RENTRI_CF_SOGGETTO[key] || "",
        num_iscr_sito: numIscrSito || RENTRI_UNITA_LOCALI[key] || "",
    });
}
/** Elenco formulari RENTRI visibili al soggetto (produttore/destinatario/trasportatore) */
export function elencoFormulariRentri(cliente, codiceFiscale, numIscrSito) {
    return inviaOperazioneRentriCustom(cliente, "GET", `/formulari/v1.0?${soggettoQuery(cliente, codiceFiscale, numIscrSito).toString()}`, null);
}
/** Dettaglio completo di un formulario RENTRI (numero senza spazi) */
export function dettaglioFormularioRentri(cliente, numeroFir, codiceFiscale, numIscrSito) {
    const id = numeroFir.replace(/\s+/g, "");
    return inviaOperazioneRentriCustom(cliente, "GET", `/formulari/v1.0/${id}?${soggettoQuery(cliente, codiceFiscale, numIscrSito).toString()}`, null);
}
export function listaFirInArrivoDestinatario(cliente, codiceFiscale, numIscrSito) {
    return elencoFormulariRentri(cliente, codiceFiscale, numIscrSito);
}
export function accettaFirInArrivoDestinatario(cliente, idFir, payload, codiceFiscale) {
    const id = idFir.replace(/\s+/g, "");
    return inviaOperazioneRentriCustom(cliente, "POST", `/formulari/v1.0/${id}/accettazione?${soggettoQuery(cliente, codiceFiscale, payload.num_iscr_sito).toString()}`, payload);
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
                const txRes = await statoTransazioneVidimazione(cliente, transazioneId);
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
