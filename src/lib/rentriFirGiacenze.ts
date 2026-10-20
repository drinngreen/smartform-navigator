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

/** Impianto Multy: Via Rivarossa 18/20, Piscina (comune ISTAT 001195). */
export const MULTY_IMPIANTO_COMUNE_ID = "001195";
export const MOTIVO_CANTIERE = "Cantiere diverso dall'impianto: va solo nel registro, le giacenze NON cambiano";
export const NOTA_CANTIERE = "cantiere diverso dall'impianto";

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
  /** true = Multy produttore con luogo di produzione (cantiere) diverso dall'impianto: MAI giacenze. */
  cantiere_diverso: boolean;
  /** false = per uno scarico non è ancora stato letto il dettaglio RENTRI con il luogo di produzione. */
  cantiere_verificato: boolean;
  luogo_produzione: string;
};

type Raw = Record<string, any>;

/**
 * REGOLA: se Multy è produttore e il luogo di produzione (cantiere) letto dal RENTRI
 * è diverso dall'impianto di Piscina, il formulario NON cambia le giacenze.
 * Il luogo di produzione c'è solo nel dettaglio RENTRI (dati_partenza), non nell'elenco:
 * senza dettaglio il cantiere è "non verificato" e la registrazione è rifiutata.
 */
export function valutaCantiere(raw: Raw): { verificato: boolean; diverso: boolean; descrizione: string } {
  const prodDet = raw?.dati_partenza?.produttore;
  const luogo = prodDet?.luogo_produzione ?? raw?.produttore?.luogo_produzione ?? raw?.luogo_produzione ?? null;
  const verificato = !!prodDet || !!luogo;
  if (!luogo) return { verificato, diverso: false, descrizione: "" };
  const comune = String(luogo?.citta?.comune_id ?? luogo?.comune_id ?? "");
  const via = String(luogo?.indirizzo ?? "");
  const descrizione = [via, luogo?.civico, luogo?.citta?.nome_comune].filter(Boolean).join(" ").trim();
  const ugualeImpianto = comune === MULTY_IMPIANTO_COMUNE_ID && /rivarossa/i.test(via);
  return { verificato: true, diverso: !ugualeImpianto, descrizione };
}

export function valutaFirPerGiacenze(raw: Raw): FirGiacenzaCandidato | null {
  const det = raw?.dati_partenza ?? null;
  const prod = det?.produttore ?? raw.produttore ?? {};
  const dest = det?.destinatario ?? (Array.isArray(raw.destinatari) ? raw.destinatari[0] : raw.destinatario) ?? {};
  const isProd = cf(prod.codice_fiscale) === MULTY_CF && (!raw.num_iscr_sito || raw.num_iscr_sito === MULTY_IMPIANTO_UL);
  const isDest = cf(dest.codice_fiscale) === MULTY_CF;
  if (!isProd && !isDest) return null;

  const accDet = raw.dati_accettazione ?? null;
  const acc = raw.accettazione ?? (accDet ? {
    data_ora_arrivo: accDet.data_ora_arrivo,
    quantita_accettata: accDet.quantita_accettata?.valore ?? accDet.quantita_accettata,
  } : null);
  const emissione = String(raw.data_emissione ?? det?.data_emissione ?? "").slice(0, 10);
  const arrivo = String(acc?.data_ora_arrivo ?? "").slice(0, 10);
  let kg = Number(typeof acc?.quantita_accettata === "object" ? acc?.quantita_accettata?.valore : acc?.quantita_accettata ?? 0);
  const um = String(raw.unita_misura ?? accDet?.quantita_accettata?.unita_misura ?? "kg");
  if (um.toLowerCase().startsWith("t")) kg = kg * 1000;

  // Il cantiere conta solo per gli scarichi (Multy produttore). Nei carichi il rifiuto arriva in impianto.
  const segno: "CARICO" | "SCARICO" = isDest ? "CARICO" : "SCARICO";
  const cant = segno === "SCARICO" ? valutaCantiere(raw) : { verificato: true, diverso: false, descrizione: "" };

  let idoneo = true;
  let motivo = "Pronto da registrare";
  if (!emissione || emissione <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Emesso entro il 21/09: giacenze immutabili"; }
  else if (!acc) { idoneo = false; motivo = "Non ancora accettato dal destinatario"; }
  else if (!arrivo || arrivo <= GIACENZE_DATA_LIMITE) { idoneo = false; motivo = "Arrivo entro il 21/09: giacenze immutabili"; }
  else if (!(kg > 0)) { idoneo = false; motivo = "Quantità accettata assente (respinto?)"; }
  else if (cant.diverso) motivo = MOTIVO_CANTIERE;
  else if (!cant.verificato) motivo = "Cantiere da verificare sul dettaglio RENTRI prima di registrare";

  const codiceEer = raw.codice_eer ?? det?.rifiuto?.codice_eer ?? "";
  return {
    numero_fir: String(raw.numero_fir ?? det?.numero_fir ?? ""),
    data_emissione: emissione,
    data_arrivo: arrivo,
    cer: String(codiceEer).replace(/\D/g, ""),
    kg_accettati: kg,
    segno,
    controparte: isDest ? String(prod.denominazione ?? "") : String(dest.denominazione ?? ""),
    produttore: String(prod.denominazione ?? ""),
    destinatario: String(dest.denominazione ?? ""),
    idoneo,
    motivo,
    cantiere_diverso: cant.diverso,
    cantiere_verificato: cant.verificato,
    luogo_produzione: cant.descrizione,
  };
}

/**
 * Rilegge il dettaglio RENTRI (sola lettura) per gli scarichi con cantiere non ancora verificato
 * e rivaluta il formulario. Da chiamare SEMPRE prima di registrare.
 */
export async function verificaCantierePrimaDiRegistrare(
  c: FirGiacenzaCandidato,
  leggiDettaglio: (numeroFir: string) => Promise<{ success: boolean; data?: unknown; error?: string | null; userMessage?: string | null }>,
): Promise<FirGiacenzaCandidato> {
  if (c.segno !== "SCARICO" || c.cantiere_verificato) return c;
  const res = await leggiDettaglio(c.numero_fir);
  if (!res.success || !res.data || typeof res.data !== "object") {
    throw new Error(`dettaglio RENTRI non leggibile, cantiere non verificato: non registro (${res.userMessage || res.error || "errore"})`);
  }
  const nuovo = valutaFirPerGiacenze({ numero_fir: c.numero_fir, ...(res.data as Raw) });
  if (!nuovo || !nuovo.cantiere_verificato) throw new Error("cantiere non verificabile dal dettaglio RENTRI: non registro");
  return nuovo;
}


export type StatoRegistro = {
  registrato: boolean;
  rigaSenzaGiacenzaId: string | null;
  /** Riga già nel registro e marcata "cantiere diverso": non deve MAI passare alle giacenze. */
  cantiereDiverso?: boolean;
};

/** Legge (sola lettura) quali FIR sono già registrati con effetto giacenze. */
export async function leggiStatoRegistro(numeri: string[]): Promise<Map<string, StatoRegistro>> {
  const out = new Map<string, StatoRegistro>();
  const { data, error } = await supabase
    .from("registro_generale")
    .select("id, numero_formulario, incide_giacenze, annotazioni")
    .eq("registro", REGISTRO_IMPIANTO)
    .not("numero_formulario", "is", null);
  if (error) throw error;
  const wanted = new Set(numeri.map(normFir));
  for (const r of (data ?? []) as any[]) {
    const n = normFir(r.numero_formulario);
    if (!wanted.has(n)) continue;
    const cur = out.get(n) ?? { registrato: false, rigaSenzaGiacenzaId: null };
    const cantiere = String(r.annotazioni ?? "").toLowerCase().includes(NOTA_CANTIERE);
    if (r.incide_giacenze) cur.registrato = true;
    else if (cantiere) { cur.registrato = true; cur.cantiereDiverso = true; }
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
  if (c.segno === "SCARICO" && !c.cantiere_verificato) {
    throw new Error("Cantiere non verificato sul dettaglio RENTRI: non registro");
  }
  if (stato?.registrato || stato?.cantiereDiverso) return "gia_registrato" as const;

  // Cantiere diverso dall'impianto: SOLO registro, le giacenze NON si cambiano.
  const incide = !c.cantiere_diverso;
  const campi = {
    quantita: c.kg_accettati,
    peso_destino: c.kg_accettati,
    cer: c.cer,
    data_movimento: c.data_arrivo,
    incide_giacenze: incide,
  };
  const nota = c.cantiere_diverso
    ? ` | ${NOTA_CANTIERE} (${c.luogo_produzione || "luogo di produzione dal RENTRI"}) - NON incide sulle giacenze`
    : "";
  if (stato?.rigaSenzaGiacenzaId) {
    if (!incide) return "gia_registrato" as const; // la riga c'è già e resta senza effetto giacenze
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
    luogo_produzione: c.cantiere_diverso && c.luogo_produzione ? c.luogo_produzione : c.produttore,
    stato_movimento: "effettivo",
    created_by_agent: false,
    annotazioni: `Da RENTRI (kg accettati dal destinatario) - registrato con pulsante il ${new Date().toLocaleDateString("it-IT")}${nota}`,
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
