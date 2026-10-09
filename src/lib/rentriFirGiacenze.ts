/**
 * Aggiornamento giacenze Multy Impianto dai formulari letti sul RENTRI.
 *
 * REGOLA ASSOLUTA: niente prima o al 21/09/2026. Solo formulari emessi e
 * arrivati dopo il 21/09, già accettati dal destinatario, e solo su comando
 * umano (pulsante). Il database rifiuta comunque ogni movimento ≤ 21/09.
 */
import { supabase } from "@/lib/supabaseClient";

export const GIACENZE_DATA_LIMITE = "2026-09-21";
export const MULTY_CF = "12347770013";
export const MULTY_IMPIANTO_UL = "OP2501XMQ021914-TO0001";
export const MULTY_TENANT = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
export const REGISTRO_IMPIANTO = "MULTY_IMPIANTO";

export const normFir = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const cf = (v: unknown) => String(v ?? "").replace(/\s+/g, "").toUpperCase();

export type FirGiacenzaCandidato = {
  numero_fir: string;
  data_emissione: string;
  data_arrivo: string;
  cer: string;
  kg_accettati: number;
  segno: "CARICO" | "SCARICO";
  controparte: string;
  produttore: string;
  destinatario: string;
  idoneo: boolean;
  motivo: string;
};

type Raw = Record<string, any>;

export function valutaFirPerGiacenze(raw: Raw): FirGiacenzaCandidato | null {
  const prod = raw.produttore ?? {};
  const dest = (Array.isArray(raw.destinatari) ? raw.destinatari[0] : raw.destinatario) ?? {};
  const isProd = cf(prod.codice_fiscale) === MULTY_CF && (!raw.num_iscr_sito || raw.num_iscr_sito === MULTY_IMPIANTO_UL);
  const isDest = cf(dest.codice_fiscale) === MULTY_CF;
  if (!isProd && !isDest) return null;

  const acc = raw.accettazione ?? null;
  const emissione = String(raw.data_emissione ?? "").slice(0, 10);
  const arrivo = String(acc?.data_ora_arrivo ?? "").slice(0, 10);
  let kg = Number(acc?.quantita_accettata ?? 0);
  if (String(raw.unita_misura ?? "kg").toLowerCase().startsWith("t")) kg = kg * 1000;

  let idoneo = true;
  let motivo = "Pronto da registrare";
  if (!emissione || emissione <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Emesso entro il 21/09: giacenze immutabili"; }
  else if (!acc) { idoneo = false; motivo = "Non ancora accettato dal destinatario"; }
  else if (!arrivo || arrivo <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Arrivo entro il 21/09: giacenze immutabili"; }
  else if (!(kg > 0)) { idoneo = false; motivo = "Quantità accettata assente (respinto?)"; }

  return {
    numero_fir: String(raw.numero_fir ?? ""),
    data_emissione: emissione,
    data_arrivo: arrivo,
    cer: String(raw.codice_eer ?? "").replace(/\D/g, ""),
    kg_accettati: kg,
    segno: isDest ? "CARICO" : "SCARICO",
    controparte: isDest ? String(prod.denominazione ?? "") : String(dest.denominazione ?? ""),
    produttore: String(prod.denominazione ?? ""),
    destinatario: String(dest.denominazione ?? ""),
    idoneo,
    motivo,
  };
}

export type StatoRegistro = { registrato: boolean; rigaSenzaGiacenzaId: string | null };

/** Legge (sola lettura) quali FIR sono già registrati con effetto giacenze. */
export async function leggiStatoRegistro(numeri: string[]): Promise<Map<string, StatoRegistro>> {
  const out = new Map<string, StatoRegistro>();
  const { data, error } = await supabase
    .from("registro_generale")
    .select("id, numero_formulario, incide_giacenze")
    .eq("registro", REGISTRO_IMPIANTO)
    .not("numero_formulario", "is", null);
  if (error) throw error;
  const wanted = new Set(numeri.map(normFir));
  for (const r of (data ?? []) as any[]) {
    const n = normFir(r.numero_formulario);
    if (!wanted.has(n)) continue;
    const cur = out.get(n) ?? { registrato: false, rigaSenzaGiacenzaId: null };
    if (r.incide_giacenze) cur.registrato = true;
    else if (!cur.rigaSenzaGiacenzaId) cur.rigaSenzaGiacenzaId = r.id;
    out.set(n, cur);
  }
  return out;
}

/** Registra UN formulario nelle giacenze. Rifiuta tutto ciò che non è idoneo. */
export async function registraFirInGiacenze(c: FirGiacenzaCandidato, stato?: StatoRegistro) {
  if (!c.idoneo) throw new Error(`${c.numero_fir}: ${c.motivo}`);
  if (c.data_emissione <= GIACENZE_DATA_LIMITE || c.data_arrivo <= GIACENZE_DATA_LIMITE) {
    throw new Error("Vietato: giacenze fino al 21/09/2026 immutabili");
  }
  if (stato?.registrato) return "gia_registrato" as const;

  const campi = {
    quantita: c.kg_accettati,
    peso_destino: c.kg_accettati,
    cer: c.cer,
    data_movimento: c.data_arrivo,
    incide_giacenze: true,
  };
  if (stato?.rigaSenzaGiacenzaId) {
    const { error } = await supabase.from("registro_generale").update(campi as any).eq("id", stato.rigaSenzaGiacenzaId);
    if (error) throw error;
    return "aggiornato" as const;
  }
  const { error } = await supabase.from("registro_generale").insert({
    ...campi,
    tenant_id: MULTY_TENANT,
    registro: REGISTRO_IMPIANTO,
    numero_formulario: c.numero_fir,
    data_emissione_formulario: c.data_emissione,
    carico_scarico: c.segno === "CARICO" ? "Carico" : "Scarico",
    segno: c.segno === "CARICO" ? "+" : "-",
    tipo_operazione: c.segno === "CARICO" ? "Carico da formulario FIR" : "Scarico da formulario FIR",
    destinazione: c.segno === "SCARICO" ? c.destinatario : null,
    luogo_produzione: c.produttore,
    stato_movimento: "effettivo",
    created_by_agent: false,
    annotazioni: `Da RENTRI (kg accettati dal destinatario) - registrato con pulsante il ${new Date().toLocaleDateString("it-IT")}`,
  } as any);
  if (error) throw error;
  return "inserito" as const;
}

/* ===================== NIYOL: solo registro, MAI giacenze ===================== */
export const NIYOL_CF = "09879800010";
export const NIYOL_TENANT = "819c783e-78dd-4080-8265-802e75b0d813";
export const REGISTRO_NIYOL = "NIYOL";

/**
 * Niyol registra nel proprio registro ma non ha giacenze: incide_giacenze è sempre false.
 * Se nello stesso formulario Multy è produttore o destinatario, le giacenze le muove
 * solo la registrazione Multy: così non vengono mai contate due volte.
 * Anche qui tutto ciò che è entro il 21/09 è bloccato di default.
 */
export function valutaFirPerRegistroNiyol(raw: Raw): FirGiacenzaCandidato | null {
  const prod = raw.produttore ?? {};
  const dest = (Array.isArray(raw.destinatari) ? raw.destinatari[0] : raw.destinatario) ?? {};
  const trsp = (Array.isArray(raw.trasportatori) ? raw.trasportatori[0] : raw.trasportatore) ?? {};
  const isProd = cf(prod.codice_fiscale) === NIYOL_CF;
  const isDest = cf(dest.codice_fiscale) === NIYOL_CF;
  const isTrsp = cf(trsp.codice_fiscale) === NIYOL_CF;
  if (!isProd && !isDest && !isTrsp) return null;

  const acc = raw.accettazione ?? null;
  const emissione = String(raw.data_emissione ?? "").slice(0, 10);
  const arrivo = String(acc?.data_ora_arrivo ?? "").slice(0, 10);
  let kg = Number(acc?.quantita_accettata ?? 0);
  if (String(raw.unita_misura ?? "kg").toLowerCase().startsWith("t")) kg = kg * 1000;

  let idoneo = true;
  let motivo = "Pronto da registrare (solo registro Niyol)";
  if (!emissione || emissione <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Emesso entro il 21/09: bloccato"; }
  else if (!acc) { idoneo = false; motivo = "Non ancora accettato dal destinatario"; }
  else if (!arrivo || arrivo <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Arrivo entro il 21/09: bloccato"; }
  else if (!(kg > 0)) { idoneo = false; motivo = "Quantità accettata assente (respinto?)"; }

  const segno: "CARICO" | "SCARICO" = isProd && !isDest ? "SCARICO" : "CARICO";
  return {
    numero_fir: String(raw.numero_fir ?? ""),
    data_emissione: emissione,
    data_arrivo: arrivo,
    cer: String(raw.codice_eer ?? "").replace(/\D/g, ""),
    kg_accettati: kg,
    segno,
    controparte: segno === "CARICO" ? String(prod.denominazione ?? "") : String(dest.denominazione ?? ""),
    produttore: String(prod.denominazione ?? ""),
    destinatario: String(dest.denominazione ?? ""),
    idoneo,
    motivo,
  };
}

/** Legge (sola lettura) quali FIR sono già nel registro Niyol. */
export async function leggiStatoRegistroNiyol(numeri: string[]): Promise<Map<string, StatoRegistro>> {
  const out = new Map<string, StatoRegistro>();
  const { data, error } = await supabase
    .from("registro_generale")
    .select("id, numero_formulario")
    .eq("tenant_id", NIYOL_TENANT)
    .not("numero_formulario", "is", null);
  if (error) throw error;
  const wanted = new Set(numeri.map(normFir));
  for (const r of (data ?? []) as any[]) {
    const n = normFir(r.numero_formulario);
    if (wanted.has(n)) out.set(n, { registrato: true, rigaSenzaGiacenzaId: null });
  }
  return out;
}

/** Registra UN formulario nel registro Niyol. Non tocca MAI le giacenze. */
export async function registraFirInRegistroNiyol(c: FirGiacenzaCandidato, stato?: StatoRegistro) {
  if (!c.idoneo) throw new Error(`${c.numero_fir}: ${c.motivo}`);
  if (c.data_emissione <= GIACENZE_DATA_LIMITE || c.data_arrivo <= GIACENZE_DATA_LIMITE) {
    throw new Error("Vietato: nessuna operazione entro il 21/09/2026");
  }
  if (stato?.registrato) return "gia_registrato" as const;
  const { error } = await supabase.from("registro_generale").insert({
    tenant_id: NIYOL_TENANT,
    registro: REGISTRO_NIYOL,
    numero_formulario: c.numero_fir,
    data_emissione_formulario: c.data_emissione,
    data_movimento: c.data_arrivo,
    cer: c.cer,
    quantita: c.kg_accettati,
    peso_destino: c.kg_accettati,
    carico_scarico: c.segno === "CARICO" ? "Carico" : "Scarico",
    segno: c.segno === "CARICO" ? "+" : "-",
    tipo_operazione: c.segno === "CARICO" ? "Carico da formulario FIR" : "Scarico da formulario FIR",
    destinazione: c.destinatario,
    luogo_produzione: c.produttore,
    stato_movimento: "effettivo",
    incide_giacenze: false,
    created_by_agent: false,
    annotazioni: `Da RENTRI (kg accettati) - solo registro Niyol, giacenze non toccate - registrato con pulsante il ${new Date().toLocaleDateString("it-IT")}`,
  } as any);
  if (error) throw error;
  return "inserito" as const;
}
