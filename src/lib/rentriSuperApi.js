/**
 * RENTRI Super Admin API — routes through VPS proxy.
 */
import { inviaOperazioneRentri, emissioneFir, firmaRicezione } from "@/lib/rentriVpsApi";
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
async function callVps(operazione, tenant, body) {
    const cliente = tenant.toLowerCase();
    try {
        const res = await inviaOperazioneRentri({
            cliente,
            tipo_operazione: operazione,
            payload: body,
        });
        const entry = addLog({
            endpoint: `[VPS] ${operazione}`,
            tenant,
            status: res.status,
            success: res.success,
            response: res.data,
            request: body,
        });
        return { ok: res.success, status: res.status, data: res.data, logEntry: entry };
    }
    catch (err) {
        const entry = addLog({
            endpoint: `[VPS] ${operazione}`,
            tenant,
            status: 0,
            success: false,
            response: { error: err.message },
            request: body,
        });
        return { ok: false, status: 0, data: { error: err.message }, logEntry: entry };
    }
}
export async function healthCheck() {
    try {
        const res = await inviaOperazioneRentri({
            cliente: "multy",
            tipo_operazione: "LISTA_BLOCCHI",
            payload: {},
        });
        return { ok: res.success, status: res.status };
    }
    catch {
        return { ok: false, status: 0 };
    }
}
export async function richiestaVidimazione(societaId, quantita) {
    return callVps("VIDIMAZIONE", societaId, { quantita });
}
export async function firmaFirProduttore(societaId, firData) {
    const cliente = societaId.toLowerCase();
    const res = await emissioneFir(cliente, firData);
    const entry = addLog({
        endpoint: "[VPS] FIR_EMISSIONE",
        tenant: societaId,
        status: res.status,
        success: res.success,
        response: res.data,
        request: firData,
    });
    return { ok: res.success, status: res.status, data: res.data, logEntry: entry };
}
export async function firmaFirDestinatario(societaId, firData) {
    const cliente = societaId.toLowerCase();
    const res = await firmaRicezione(cliente, firData);
    const entry = addLog({
        endpoint: "[VPS] FIRMA_RICEZIONE",
        tenant: societaId,
        status: res.status,
        success: res.success,
        response: res.data,
        request: firData,
    });
    return { ok: res.success, status: res.status, data: res.data, logEntry: entry };
}
export async function registroCarico(societaId, payload) {
    return callVps("REGISTRO", societaId, { movimenti: [{ tipo: "carico", ...payload }] });
}
export async function registroScarico(societaId, payload) {
    return callVps("REGISTRO", societaId, { movimenti: [{ tipo: "scarico", ...payload }] });
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
