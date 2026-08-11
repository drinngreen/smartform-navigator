/**
 * RENTRI Super Admin API — routes through VPS proxy.
 */

import { inviaOperazioneRentri, emissioneFir, firmaRicezione, type RentriCliente } from "@/lib/rentriVpsApi";

export interface RENTRILogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  tenant: string;
  status: number;
  success: boolean;
  response: any;
  request: any;
}

let logEntries: RENTRILogEntry[] = [];
let logListeners: Array<() => void> = [];

function addLog(entry: Omit<RENTRILogEntry, "id" | "timestamp">) {
  const full: RENTRILogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  logEntries = [full, ...logEntries].slice(0, 200);
  logListeners.forEach((fn) => fn());
  return full;
}

export function subscribeToLogs(fn: () => void) {
  logListeners.push(fn);
  return () => { logListeners = logListeners.filter((l) => l !== fn); };
}

export function getLogs() { return logEntries; }

async function callVps(operazione: string, tenant: string, body: any) {
  const cliente = tenant.toLowerCase() as RentriCliente;
  try {
    const res = await inviaOperazioneRentri({
      cliente,
      tipo_operazione: operazione as any,
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
  } catch (err: any) {
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
  } catch { return { ok: false, status: 0 }; }
}

export async function richiestaVidimazione(societaId: string, quantita: number) {
  return callVps("VIDIMAZIONE", societaId, { quantita });
}

export async function firmaFirProduttore(societaId: string, firData: any) {
  const cliente = societaId.toLowerCase() as RentriCliente;
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

export async function firmaFirDestinatario(societaId: string, firData: any) {
  const cliente = societaId.toLowerCase() as RentriCliente;
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

export async function registroCarico(societaId: string, payload: any) {
  return callVps("REGISTRO", societaId, { movimenti: [{ tipo: "carico", ...payload }] });
}

export async function registroScarico(societaId: string, payload: any) {
  return callVps("REGISTRO", societaId, { movimenti: [{ tipo: "scarico", ...payload }] });
}

export function downloadCSV(numbers: string[], filename: string) {
  const csv = "numero_fir\n" + numbers.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
