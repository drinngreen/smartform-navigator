const RAILWAY_BASE = "https://dragonrifiutisender-production.up.railway.app/api/rentri";

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

async function callRailway(endpoint: string, tenant: string, body: any) {
  const url = `${RAILWAY_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, isSandbox: false }),
    });
    let data: any;
    try { data = await res.json(); } catch { data = { raw: "non-json response" }; }
    const entry = addLog({ endpoint, tenant, status: res.status, success: res.ok, response: data, request: body });
    return { ok: res.ok, status: res.status, data, logEntry: entry };
  } catch (err: any) {
    const entry = addLog({ endpoint, tenant, status: 0, success: false, response: { error: err.message }, request: body });
    return { ok: false, status: 0, data: { error: err.message }, logEntry: entry };
  }
}

export async function healthCheck() {
  try {
    const res = await fetch(`${RAILWAY_BASE}/health`);
    return { ok: res.ok, status: res.status };
  } catch { return { ok: false, status: 0 }; }
}

export async function richiestaVidimazione(societaId: string, quantita: number) {
  return callRailway("/vidimate", societaId, { company: societaId, quantita });
}

export async function firmaFirProduttore(societaId: string, firData: any) {
  return callRailway("/firma-fir", societaId, { company: societaId, tipo: "produttore", ...firData });
}

export async function firmaFirDestinatario(societaId: string, firData: any) {
  return callRailway("/firma-fir", societaId, { company: societaId, tipo: "destinatario", ...firData });
}

export async function registroCarico(societaId: string, payload: any) {
  return callRailway("/registro/carico", societaId, { company: societaId, ...payload });
}

export async function registroScarico(societaId: string, payload: any) {
  return callRailway("/registro/scarico", societaId, { company: societaId, ...payload });
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
