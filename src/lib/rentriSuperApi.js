/**
 * RENTRI Super Admin API — now routes through Ngrok backend.
 */
const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";
let logEntries = [];
let logListeners = [];
function addLog(entry) {
    const full = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
    };
    logEntries = [full, ...logEntries].slice(0, 200);
    logListeners.forEach((fn) => fn());
    return full;
}
export function subscribeToLogs(fn) {
    logListeners.push(fn);
    return () => { logListeners = logListeners.filter((l) => l !== fn); };
}
export function getLogs() { return logEntries; }
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
        const entry = addLog({ endpoint, tenant, status: res.status, success: data?.success ?? res.ok, response: data, request: body });
        return { ok: data?.success ?? res.ok, status: res.status, data, logEntry: entry };
    }
    catch (err) {
        const entry = addLog({ endpoint, tenant, status: 0, success: false, response: { error: err.message }, request: body });
        return { ok: false, status: 0, data: { error: err.message }, logEntry: entry };
    }
}
export async function healthCheck() {
    try {
        const res = await fetch(`${NGROK_BASE}/api/rentri/health`, {
            headers: { "ngrok-skip-browser-warning": "true" },
        });
        return { ok: res.ok, status: res.status };
    }
    catch {
        return { ok: false, status: 0 };
    }
}
export async function richiestaVidimazione(societaId, quantita) {
    return callNgrok("/api/rentri/action/vidimazione", societaId, { company: societaId, quantity: quantita });
}
export async function firmaFirProduttore(societaId, firData) {
    return callNgrok("/api/rentri/action/emissione", societaId, { company: societaId, payload: firData });
}
export async function firmaFirDestinatario(societaId, firData) {
    return callNgrok("/api/rentri/action/firma-ricezione", societaId, { company: societaId, payload: firData });
}
export async function registroCarico(societaId, payload) {
    return callNgrok("/api/rentri/action/emissione", societaId, { company: societaId, payload });
}
export async function registroScarico(societaId, payload) {
    return callNgrok("/api/rentri/action/firma-ricezione", societaId, { company: societaId, payload });
}
export function downloadCSV(numbers, filename) {
    const csv = "numero_fir\n" + numbers.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
