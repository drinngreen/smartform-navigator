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

/**
 * Recupera il QR ufficiale RENTRI del formulario; se non disponibile (FIR non ancora
 * registrato, RENTRI offline, ecc.) genera comunque un QR locale con il link di verifica.
 */
export async function resolveFirQrDataUrl(
  numeroFir: string,
  cliente?: PrintCliente | null,
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

  // 2) QR ufficiale via proxy RENTRI
  try {
    const { data } = await supabase.functions.invoke("rentri-get-pdf", {
      body: { firId: numeroFir, cliente: printClienteKey(cliente) },
    });
    const qr = (data as any)?.qrCode || (data as any)?.qr_code;
    if (qr) return asDataUrl(String(qr));
  } catch { /* ignore */ }

  // 3) Fallback locale (sempre presente)
  try {
    return await generateLocalFirQr(numeroFir, cliente);
  } catch {
    return null;
  }
}

export interface PrintDecorationOptions {
  numeroFir: string;
  cliente?: PrintCliente | null;
  qrDataUrl?: string | null;
  producedAt?: Date;
  /** Testo aggiuntivo da riportare in annotazioni (opzionale). */
  extraAnnotazioni?: string;
}

/**
 * HTML da inserire dentro un contenitore `position:relative` che rappresenta una pagina A4:
 * numero FIR in alto a destra e in basso a destra, dicitura vidimazione + QR 28x28 mm.
 */
export function buildPageDecorationsHtml(opts: PrintDecorationOptions): string {
  const { numeroFir, cliente, qrDataUrl, producedAt, extraAnnotazioni } = opts;
  if (!numeroFir) return "";
  const label = buildVidimazioneLabel(cliente, producedAt ?? new Date());
  const qr = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR RENTRI ${numeroFir}" style="position:absolute;right:6mm;bottom:24mm;width:28mm;height:28mm;object-fit:contain;background:#fff;" />`
    : "";
  return `
    <div style="position:absolute;top:4mm;right:6mm;font-family:'Courier New',monospace;font-weight:bold;font-size:11pt;color:#000080;letter-spacing:0.5px;">${numeroFir}</div>
    ${qr}
    <div style="position:absolute;right:6mm;bottom:18mm;width:40mm;text-align:center;font-family:'Courier New',monospace;font-weight:bold;font-size:11pt;color:#000080;">${numeroFir}</div>
    <div style="position:absolute;left:6mm;bottom:14mm;max-width:62%;font-family:Arial,Helvetica,sans-serif;font-size:6.5pt;line-height:1.25;color:#111;">
      ${label}${extraAnnotazioni ? `<br/>${extraAnnotazioni}` : ""}
    </div>`;
}
