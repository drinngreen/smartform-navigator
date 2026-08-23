/**
 * Decorazioni di stampa comuni a TUTTI i formulari (Multyproget, Niyol, Global Reco).
 *
 * Ogni pagina stampata deve avere:
 *  - il numero FIR in alto a destra E in basso a destra;
 *  - la dicitura di vidimazione virtuale nelle annotazioni (data e ora di produzione del FIR);
 *  - il QR code 28x28 mm collegato al RENTRI (ufficiale se disponibile, altrimenti generato
 *    localmente con il link di verifica: il RENTRI lo mostrerà vuoto finché il FIR non è registrato).
 */
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";

export type PrintCliente = "multy" | "multyproget" | "niyol" | "global" | "globalreco" | string;

export interface SocietaPrintInfo {
  ragioneSociale: string;
  codiceFiscale: string;
  cameraCommercio: string;
}

const SOCIETA: Record<string, SocietaPrintInfo> = {
  multy: {
    ragioneSociale: "MULTYPROGET S.R.L.",
    codiceFiscale: "12347770013",
    cameraCommercio: "Camera di Commercio di Torino",
  },
  niyol: {
    ragioneSociale: "NIYOL S.R.L.",
    codiceFiscale: "09879800010",
    cameraCommercio: "Camera di Commercio di Torino",
  },
  global: {
    ragioneSociale: "GLOBAL RECO S.R.L.",
    codiceFiscale: "08934760961",
    cameraCommercio: "Camera di Commercio di Torino",
  },
};

export function printClienteKey(cliente?: PrintCliente | null): string {
  const n = String(cliente ?? "multy").toLowerCase();
  if (n.startsWith("multy")) return "multy";
  if (n.startsWith("global")) return "global";
  if (n.startsWith("niyol")) return "niyol";
  return "multy";
}

export function societaPrintInfo(cliente?: PrintCliente | null): SocietaPrintInfo {
  return SOCIETA[printClienteKey(cliente)] ?? SOCIETA.multy;
}

/** URL pubblico RENTRI di verifica del formulario (usato come payload del QR di fallback). */
export function rentriFirVerifyUrl(numeroFir: string, cliente?: PrintCliente | null): string {
  const info = societaPrintInfo(cliente);
  const params = new URLSearchParams({
    numero_fir: numeroFir,
    identificativo_soggetto: info.codiceFiscale,
  });
  return `https://www.rentri.gov.it/formulari/verifica?${params.toString()}`;
}

/**
 * Dicitura da riportare nel riquadro ANNOTAZIONI.
 * Es.: "Vid.Virt. del 30/07/2025 10:01 per conto della Camera di Commercio di Torino,
 *       rich. da 12347770013 - MULTYPROGET S.R.L."
 */
export function buildVidimazioneLabel(cliente?: PrintCliente | null, when: Date = new Date()): string {
  const info = societaPrintInfo(cliente);
  const dt = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(when);
  return `Vid.Virt. del ${dt.replace(",", "")} per conto della ${info.cameraCommercio}, rich. da ${info.codiceFiscale} - ${info.ragioneSociale}`;
}

/** Genera localmente un QR (data URL PNG) con il link di verifica RENTRI. */
export async function generateLocalFirQr(numeroFir: string, cliente?: PrintCliente | null): Promise<string> {
  return QRCode.toDataURL(rentriFirVerifyUrl(numeroFir, cliente), {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 320,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

const asDataUrl = (raw: string): string =>
  raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;

/* ──────────────────────────────────────────────────────────────
 * QR ufficiale RENTRI
 * Documentazione: "Interpretazione dei dati sul QR code del FIR vidimato"
 * (demoapi.rentri.gov.it/docs?page=api-flussi-operativi-formulari, §1.3.4).
 *
 * Il campo `qr_code_bytes` restituito da
 *   GET /vidimazione-formulari/v1.0/{codice_blocco}/{progressivo}
 * è la struttura firmata COSE_Sign1; la stringa da codificare nel QR Code è
 * la sua codifica Base45 (RFC 9285). La documentazione impone che, anche con
 * processi di stampa alternativi a quello RENTRI, il QR contenga ESATTAMENTE
 * questa stringa.
 * ────────────────────────────────────────────────────────────── */

const BASE45_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/** Codifica Base45 (RFC 9285) di un array di byte. */
export function base45Encode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const x = bytes[i] * 256 + bytes[i + 1];
      const e = Math.floor(x / (45 * 45));
      const rest = x % (45 * 45);
      const d = Math.floor(rest / 45);
      const c = rest % 45;
      out += BASE45_ALPHABET[c] + BASE45_ALPHABET[d] + BASE45_ALPHABET[e];
    } else {
      const x = bytes[i];
      out += BASE45_ALPHABET[x % 45] + BASE45_ALPHABET[Math.floor(x / 45)];
    }
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^,]+,/, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Estrae codice blocco e progressivo dal numero FIR (es. "FRVKM 001320 CM"). */
export function parseNumeroFir(numeroFir: string): { codiceBlocco: string; progressivo: string } | null {
  const m = String(numeroFir).toUpperCase().match(/([A-Z]{4,6})\s*[-]?\s*(\d{4,8})/);
  if (!m) return null;
  return { codiceBlocco: m[1], progressivo: m[2] };
}

/** Genera l'immagine QR (data URL) a partire dalla stringa ufficiale RENTRI. */
export async function qrImageFromPayload(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 420,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

/**
 * Recupera dal RENTRI la stringa ufficiale del QR (Base45 del COSE_Sign1)
 * leggendo il lotto di vidimazione del numero FIR.
 */
export async function fetchOfficialQrPayload(
  numeroFir: string,
  cliente?: PrintCliente | null,
): Promise<string | null> {
  const parsed = parseNumeroFir(numeroFir);
  if (!parsed) return null;
  try {
    const { leggiLotto } = await import("@/lib/rentriVpsApi");
    const res = await leggiLotto(printClienteKey(cliente) as any, parsed.codiceBlocco, String(Number(parsed.progressivo)));
    if (!res?.success) return null;
    const root: any = res.data;
    const node = Array.isArray(root) ? root[0] : (root?.data ?? root);
    const raw =
      node?.qr_code_bytes ?? node?.qrCodeBytes ?? node?.qr_code ?? node?.qrCode ?? null;
    if (!raw) return null;
    if (Array.isArray(raw)) return base45Encode(Uint8Array.from(raw as number[]));
    const str = String(raw);
    // Se il RENTRI restituisce già la stringa Base45 la usiamo tale e quale.
    if (/^[0-9A-Z $%*+\-./:]+$/.test(str) && !/[a-z=]/.test(str)) return str;
    return base45Encode(base64ToBytes(str));
  } catch {
    return null;
  }
}

/**
 * Recupera il QR ufficiale RENTRI del formulario.
 * Ordine: QR già memorizzato nel pool → lotto di vidimazione (qr_code_bytes → Base45)
 * → proxy get-pdf/get-qr. Se il RENTRI non è raggiungibile e `allowLocalFallback`
 * è attivo viene generato un QR con il link di verifica (NON conforme alla vidimazione,
 * usato solo come promemoria di stampa).
 */
export async function resolveFirQrDataUrl(
  numeroFir: string,
  cliente?: PrintCliente | null,
  options?: { allowLocalFallback?: boolean },
): Promise<string | null> {
  if (!numeroFir) return null;

  // 1) QR già memorizzato nel pool
  try {
    const { data } = await supabase
      .from("fir_number_pool")
      .select("qr_code_data")
      .eq("fir_number", numeroFir)
      .maybeSingle();
    if ((data as any)?.qr_code_data) return asDataUrl(String((data as any).qr_code_data));
  } catch { /* ignore */ }

  // 2) QR ufficiale RENTRI (Base45 del COSE_Sign1 di vidimazione)
  try {
    const payload = await fetchOfficialQrPayload(numeroFir, cliente);
    if (payload) {
      const img = await qrImageFromPayload(payload);
      try {
        await supabase
          .from("fir_number_pool")
          .update({ qr_code_data: img })
          .eq("fir_number", numeroFir);
      } catch { /* best effort */ }
      return img;
    }
  } catch { /* ignore */ }

  // 3) Proxy get-pdf / get-qr
  try {
    const { data } = await supabase.functions.invoke("rentri-get-pdf", {
      body: { firId: numeroFir, cliente: printClienteKey(cliente) },
    });
    const qr = (data as any)?.qrCode || (data as any)?.qr_code;
    if (qr) return asDataUrl(String(qr));
  } catch { /* ignore */ }

  // 4) Fallback locale (solo se richiesto esplicitamente)
  if (options?.allowLocalFallback) {
    try {
      return await generateLocalFirQr(numeroFir, cliente);
    } catch { /* ignore */ }
  }
  return null;
}

export interface PrintDecorationOptions {
  numeroFir: string;
  cliente?: PrintCliente | null;
  qrDataUrl?: string | null;
  producedAt?: Date;
  /** Testo aggiuntivo da riportare in annotazioni (opzionale). */
  extraAnnotazioni?: string;
  /** Numero di pagina del modulo ufficiale (1, 2 o 3). Default 1. */
  page?: number;
}

/**
 * Geometria dei riquadri ufficiali (percentuali sull'immagine della pagina):
 * riquadro numero FIR in alto a destra, riquadro QR e riga di vidimazione in basso.
 * Misurata direttamente sugli asset `formulario_pag_1/2.png`.
 */
const PAGE_GEOMETRY: Record<number, {
  top: { left: number; top: number; width: number; height: number };
  qr: { left: number; top: number; width: number; height: number };
  row: { top: number; height: number };
}> = {
  1: {
    top: { left: 73.4, top: 3.93, width: 22.2, height: 2.78 },
    qr: { left: 79.9, top: 80.98, width: 14.4, height: 9.27 },
    row: { top: 87.91, height: 2.56 },
  },
  2: {
    top: { left: 72.2, top: 3.33, width: 23.3, height: 2.56 },
    qr: { left: 79.8, top: 84.06, width: 14.3, height: 9.44 },
    row: { top: 90.94, height: 2.52 },
  },
};

/**
 * HTML da inserire dentro un contenitore `position:relative` che rappresenta una pagina A4:
 * numero FIR nel riquadro in alto a destra e nel riquadro in basso, dicitura di vidimazione
 * nella riga dedicata e QR 28x28 mm nel riquadro dedicato.
 */
export function buildPageDecorationsHtml(opts: PrintDecorationOptions): string {
  const { numeroFir, cliente, qrDataUrl, producedAt, extraAnnotazioni } = opts;
  if (!numeroFir) return "";
  const g = PAGE_GEOMETRY[opts.page ?? 1] ?? PAGE_GEOMETRY[1];
  const label = buildVidimazioneLabel(cliente, producedAt ?? new Date());

  const numStyle =
    "display:flex;align-items:center;justify-content:center;font-family:'Courier New',monospace;font-weight:bold;font-size:3.6mm;letter-spacing:0.6mm;color:#12275c;white-space:nowrap;";

  const qr = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR RENTRI ${numeroFir}" style="position:absolute;left:${g.qr.left}%;top:${g.qr.top}%;width:${g.qr.width}%;height:${g.qr.height}%;object-fit:contain;background:#fff;" />`
    : "";

  return `
    <div style="position:absolute;left:${g.top.left}%;top:${g.top.top}%;width:${g.top.width}%;height:${g.top.height}%;${numStyle}">${numeroFir}</div>
    ${qr}
    <div style="position:absolute;left:57.1%;top:${g.row.top}%;width:22.2%;height:${g.row.height}%;${numStyle}">${numeroFir}</div>
    <div style="position:absolute;left:5.2%;top:${g.row.top}%;width:50%;height:${g.row.height}%;display:flex;align-items:center;font-family:Arial,Helvetica,sans-serif;font-size:2.2mm;line-height:1.25;color:#12275c;">
      <span>${label}${extraAnnotazioni ? `<br/>${extraAnnotazioni}` : ""}</span>
    </div>`;
}

