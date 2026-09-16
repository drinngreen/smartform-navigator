/**
 * Scarico di magazzino dai formulari RENTRI in cui Multyproget è PRODUTTORE.
 *
 * Regole non negoziabili:
 *  - vale SOLO per i formulari digitali datati da OGGI alle 08:00 (ora italiana)
 *    in poi — MAI prima: altrimenti si alterano saldi già consolidati;
 *  - vale SOLO se il produttore è Multyproget;
 *  - non parte mai da solo: la funzione viene chiamata da un'azione umana esplicita;
 *  - passa unicamente dal punto autorizzato `applica_movimento_giacenza`;
 *  - è idempotente: lo stesso numero FIR non può scaricare due volte.
 */

import { supabase } from "@/lib/supabaseClient";

export const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
export const MULTY_IMPIANTO_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
export const MULTY_CF = "12347770013";
export const NIYOL_CF = "09879800010";

export const normalizzaCf = (v: unknown) => {
  const compact = String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^IT\d{11}$/.test(compact) ? compact.slice(2) : compact;
};

export const normalizzaNumeroFir = (v: unknown) =>
  String(v ?? "").toUpperCase().replace(/\s+/g, "");

export const oggiIso = () => new Date().toISOString().slice(0, 10);

export const dataFir = (riga: { data_emissione?: unknown; data_creazione?: unknown }) =>
  String(riga.data_emissione ?? riga.data_creazione ?? "").slice(0, 10);

/** Data odierna nel fuso italiano (Europe/Rome), formato YYYY-MM-DD. */
export const oggiRomaIso = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/**
 * Istante di inizio validità: OGGI alle 08:00 ora italiana.
 * Le giacenze si aggiornano solo dai formulari digitali datati da questo
 * istante in poi; tutto ciò che è precedente è storico e non si tocca.
 */
export const cutoffGiacenzeDaFir = (oggi = oggiRomaIso()): Date => {
  const mezzogiornoUtc = Date.parse(`${oggi}T12:00:00Z`);
  const romaString = new Date(mezzogiornoUtc).toLocaleString("en-US", { timeZone: "Europe/Rome" });
  const offsetMs = new Date(romaString).getTime() - mezzogiornoUtc;
  return new Date(Date.parse(`${oggi}T08:00:00Z`) - offsetMs);
};

/** Timestamp completo del formulario (data_emissione o, in mancanza, data_creazione). */
export const istanteFir = (riga: { data_emissione?: unknown; data_creazione?: unknown }): number | null => {
  const raw = String(riga.data_emissione ?? riga.data_creazione ?? "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(ms) ? null : ms;
};

/** Ruoli del formulario calcolati su TUTTI i codici fiscali aziendali, non solo su quello letto. */
export function ruoliFir(
  riga: { produttore_cf?: unknown; trasportatore_cf?: unknown; destinatario_cf?: unknown },
  soggetti: { cf: string; label: string }[],
): string[] {
  const prod = normalizzaCf(riga.produttore_cf);
  const tras = normalizzaCf(riga.trasportatore_cf);
  const dest = normalizzaCf(riga.destinatario_cf);
  const out: string[] = [];
  for (const s of soggetti) {
    const cf = normalizzaCf(s.cf);
    if (!cf) continue;
    if (prod === cf) out.push(`${s.label} produttore`);
    if (tras === cf) out.push(`${s.label} trasportatore`);
    if (dest === cf) out.push(`${s.label} destinatario`);
  }
  return out;
}

export interface FirProduttoreCandidato {
  numero_fir: string;
  codice_eer: string;
  quantita: number;
  produttore_cf: string;
  data_emissione?: string;
  data_creazione?: string;
  descrizione?: string;
}

/**
 * true solo se: produttore Multyproget + formulario datato da oggi alle 08:00
 * (ora italiana) in poi + CER e quantità utilizzabili. Mai lo storico.
 */
export function scaricoProduttoreAmmesso(
  fir: FirProduttoreCandidato,
  cutoff = cutoffGiacenzeDaFir(),
): { ok: boolean; motivo?: string } {
  if (normalizzaCf(fir.produttore_cf) !== MULTY_CF)
    return { ok: false, motivo: "Il produttore non è Multyproget: nessun effetto sulle giacenze." };
  const istante = istanteFir(fir);
  if (istante === null)
    return { ok: false, motivo: "Formulario senza data/ora leggibile: nessun effetto sulle giacenze." };
  if (istante < cutoff.getTime())
    return {
      ok: false,
      motivo: "Formulario precedente a oggi ore 08:00: storico, nessun effetto sulle giacenze.",
    };
  if (!String(fir.codice_eer ?? "").trim()) return { ok: false, motivo: "Codice CER mancante." };
  if (!(Number(fir.quantita) > 0)) return { ok: false, motivo: "Quantità non valida." };
  return { ok: true };
}

export const documentoScaricoProduttore = (numeroFir: string) =>
  `FIR:${normalizzaNumeroFir(numeroFir)}:USCITA_PRODUTTORE`;

export async function scaricoGiaRegistrato(numeroFir: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("giacenze_applicazioni" as never)
    .select("id")
    .eq("documento", documentoScaricoProduttore(numeroFir))
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Registra lo scarico dal magazzino Multyproget. Solo da conferma umana esplicita. */
export async function registraScaricoProduttore(fir: FirProduttoreCandidato): Promise<void> {
  const verdetto = scaricoProduttoreAmmesso(fir);
  if (!verdetto.ok) throw new Error(verdetto.motivo);

  if (await scaricoGiaRegistrato(fir.numero_fir))
    throw new Error("Scarico già registrato per questo formulario: nessun doppio movimento.");

  const numero = normalizzaNumeroFir(fir.numero_fir);
  const { error } = await (supabase as never as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).rpc("applica_movimento_giacenza", {
    p_tenant_id: MULTY_TENANT_ID,
    p_impianto_id: MULTY_IMPIANTO_ID,
    p_cer: String(fir.codice_eer).toUpperCase().replace(/\s+/g, ""),
    p_quantita_kg: Number(fir.quantita),
    p_segno: "SCARICO",
    p_causale: "FIR_PRODUTTORE_MULTY",
    p_documento: documentoScaricoProduttore(numero),
    p_attore: "human",
    p_descrizione: fir.descrizione || `Uscita da magazzino Multyproget — FIR ${numero}`,
    p_fir_id: null,
    p_numero_fir: numero,
  });
  if (error) throw new Error(error.message);
}
