/**
 * RENTRI Actions API — calls the Ngrok-exposed backend.
 */

import { type RENTRILogEntry } from "./rentriSuperApi";

const NGROK_BASE = "https://hierurgical-undefinable-magdalene.ngrok-free.dev";

/* ── shared log ── */

let ngrokLogs: RENTRILogEntry[] = [];
let ngrokLogListeners: Array<() => void> = [];

function addNgrokLog(entry: Omit<RENTRILogEntry, "id" | "timestamp">) {
  const full: RENTRILogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  ngrokLogs = [full, ...ngrokLogs].slice(0, 200);
  ngrokLogListeners.forEach((fn) => fn());
  return full;
}

export function subscribeToNgrokLogs(fn: () => void) {
  ngrokLogListeners.push(fn);
  return () => { ngrokLogListeners = ngrokLogListeners.filter((l) => l !== fn); };
}

export function getNgrokLogs() { return ngrokLogs; }

/* ── generic caller ── */

async function callNgrok(endpoint: string, tenant: string, body: any) {
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
    let data: any;
    try { data = await res.json(); } catch { data = { raw: "non-json response" }; }
    const entry = addNgrokLog({
      endpoint: `[NGROK] ${endpoint}`,
      tenant,
      status: res.status,
      success: data?.success ?? res.ok,
      response: data,
      request: body,
    });
    return { ok: data?.success ?? res.ok, status: res.status, data, logEntry: entry };
  } catch (err: any) {
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

export async function ngrokHealthCheck(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${NGROK_BASE}/api/rentri/health`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 1. Vidimazione ── */

export async function richiestaVidimazioneNgrok(company: string, quantity: number) {
  return callNgrok("/api/rentri/action/vidimazione", company, { company, quantity });
}

/* ── 2. Emissione FIR (Firma Produttore) ── */

export async function emissioneFirNgrok(company: string, payload: any) {
  return callNgrok("/api/rentri/action/emissione", company, { company, payload });
}

/* ── 3. Firma Ricezione (Impianto) ── */

export async function firmaRicezioneNgrok(company: string, payload: any) {
  return callNgrok("/api/rentri/action/firma-ricezione", company, { company, payload });
}

/* ── 4. Scarica PDF ── */

export async function getPdfNgrok(company: string, firId: string) {
  return callNgrok("/api/rentri/action/get-pdf", company, { company, firId });
}

/* ── 5a. Flow Transport ── */

export async function flowTransportNgrok(company: string) {
  return callNgrok("/api/rentri/flow/transport", company, { company });
}

/* ── 5b. Flow Facility ── */

export async function flowFacilityNgrok() {
  return callNgrok("/api/rentri/flow/facility", "MULTY", {});
}

/* ── 5c. Flow Massive Emission ── */

export async function flowMassiveEmissionNgrok(company: string, quantity: number) {
  return callNgrok("/api/rentri/flow/massive-emission", company, { company, quantity });
}
