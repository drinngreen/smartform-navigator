/**
 * RENTRI Actions API — calls the Ngrok-exposed backend.
 */
const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";
/* ── shared log ── */
let ngrokLogs = [];
let ngrokLogListeners = [];
function addNgrokLog(entry) {
    const full = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
    };
    ngrokLogs = [full, ...ngrokLogs].slice(0, 200);
    ngrokLogListeners.forEach((fn) => fn());
    return full;
}
export function subscribeToNgrokLogs(fn) {
    ngrokLogListeners.push(fn);
    return () => { ngrokLogListeners = ngrokLogListeners.filter((l) => l !== fn); };
}
export function getNgrokLogs() { return ngrokLogs; }
/* ── generic caller ── */
async function callNgrok(endpoint, tenant, body) {
    const url = `${NGROK_BASE}${endpoint}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify(body),
        });
        let data;
        try {
            data = await res.json();
        }
        catch {
            data = { raw: "non-json response" };
        }
        const entry = addNgrokLog({
            endpoint: `[NGROK] ${endpoint}`,
            tenant,
            status: res.status,
            success: data?.success ?? res.ok,
            response: data,
            request: body,
        });
        return { ok: data?.success ?? res.ok, status: res.status, data, logEntry: entry };
    }
    catch (err) {
        const entry = addNgrokLog({
            endpoint: `[NGROK] ${endpoint}`,
            tenant,
            status: 0,
            success: false,
            response: { error: err.message },
            request: body,
        });
        return { ok: false, status: 0, data: { error: err.message }, logEntry: entry };
    }
}
/* ── Health Check ── */
export async function ngrokHealthCheck() {
    try {
        const res = await fetch(`${NGROK_BASE}/api/rentri/action/vidimazione`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ ping: true }),
        });
        // Any response (even 400) means backend is reachable
        return { ok: true };
    }
    catch {
        return { ok: false };
    }
}
/* ── 1. Vidimazione ── */
export async function richiestaVidimazioneNgrok(company, quantity) {
    return callNgrok("/api/rentri/action/vidimazione", company, { company, quantity });
}
/* ── 2. Emissione FIR (Firma Produttore) ── */
export async function emissioneFirNgrok(company, payload) {
    return callNgrok("/api/rentri/action/emissione", company, { company, payload });
}
/* ── 3. Firma Ricezione (Impianto) ── */
export async function firmaRicezioneNgrok(company, payload) {
    return callNgrok("/api/rentri/action/firma-ricezione", company, { company, payload });
}
/* ── 4. Scarica PDF ── */
export async function getPdfNgrok(company, firId) {
    return callNgrok("/api/rentri/action/get-pdf", company, { company, firId });
}
/* ── 5a. Flow Transport ── */
export async function flowTransportNgrok(company) {
    return callNgrok("/api/rentri/flow/transport", company, { company });
}
/* ── 5b. Flow Facility ── */
export async function flowFacilityNgrok() {
    return callNgrok("/api/rentri/flow/facility", "MULTY", {});
}
/* ── 5c. Flow Massive Emission ── */
export async function flowMassiveEmissionNgrok(company, quantity) {
    return callNgrok("/api/rentri/flow/massive-emission", company, { company, quantity });
}
