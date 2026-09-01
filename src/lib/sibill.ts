import { supabase } from "@/lib/supabaseClient";
import { buildFatturaPAXml } from "@/lib/fatturaPA";

export type SibillSync = {
  id: string;
  fattura_id: string;
  sibill_document_id: string | null;
  sync_status: string;
  delivery_status: string | null;
  document_status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_date: string | null;
  error_title: string | null;
  error_detail: string | null;
  last_sync_at: string | null;
};

/** Costruisce il payload anagrafica (counterpart) per Sibill a partire dalla fattura + archivio aziende */
async function buildCounterpart(f: any) {
  const piva = (f.cliente_partita_iva || "").toString().replace(/\s/g, "");
  const cf = (f.cliente_codice_fiscale || "").toString().replace(/\s/g, "");

  let azienda: any = null;
  if (piva || cf) {
    const { data } = await supabase
      .from("anagrafica_aziende_mp" as any)
      .select("*")
      .or([piva ? `partita_iva.eq.${piva}` : null, cf ? `codice_fiscale.eq.${cf}` : null].filter(Boolean).join(","))
      .limit(1)
      .maybeSingle();
    azienda = data || null;
  }

  return {
    azienda_id: azienda?.id || null,
    company_name: f.cliente_ragione_sociale || azienda?.ragione_sociale || "",
    vat_number: piva || azienda?.partita_iva || null,
    tax_number: cf || azienda?.codice_fiscale || null,
    address: f.cliente_indirizzo || azienda?.indirizzo || null,
    city: azienda?.comune || azienda?.citta || null,
    postal_code: azienda?.cap || null,
    province_code: (azienda?.provincia || "").toString().slice(0, 2).toUpperCase() || null,
    country: "IT",
    destination_code: f.cliente_codice_destinatario || azienda?.codice_destinatario || null,
    identity_type: "COMPANY" as const,
  };
}

/** Invia la fattura a Sibill: crea/verifica l'anagrafica e trasmette l'XML FatturaPA.
 *  Con `{ mock: true }` la Edge Function simula la risposta di Sibill senza chiamare l'API reale:
 *  stessi stati, stesse scritture su `fatture_sibill_sync`, nessuna chiamata esterna. */
export async function inviaFatturaASibill(f: any, opts: { mock?: boolean } = {}) {
  const { data: righe } = await supabase
    .from("fatture_righe" as any)
    .select("*")
    .eq("fattura_id", f.id)
    .order("ordine");

  const rows = ((righe || []) as any[]).map((r) => ({
    descrizione: r.descrizione,
    quantita: Number(r.quantita || 1),
    unita_misura: r.unita_misura || "n",
    prezzo_unitario: Number(r.prezzo_unitario || r.imponibile),
    imponibile: Number(r.imponibile),
    aliquota_iva: Number(r.aliquota_iva || 22),
    reverse_charge: !!r.reverse_charge,
  }));

  const xml = buildFatturaPAXml(f, rows);
  const counterpart = await buildCounterpart(f);

  const { data, error } = await supabase.functions.invoke("sibill-integration", {
    body: { action: "send_invoice", fattura_id: f.id, tenant_id: f.tenant_id, xml, counterpart, mock: !!opts.mock },
  });

  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  return data as { document_id: string | null; mock?: boolean };
}


export async function fetchSibillSync(fatturaIds: string[]) {
  if (!fatturaIds.length) return {} as Record<string, SibillSync>;
  const { data } = await supabase
    .from("fatture_sibill_sync" as any)
    .select("*")
    .in("fattura_id", fatturaIds);
  const map: Record<string, SibillSync> = {};
  ((data || []) as any[]).forEach((r) => (map[r.fattura_id] = r as SibillSync));
  return map;
}

/** Rilegge da Sibill lo stato reale dei documenti già trasmessi (utile passando da MOCK a REALE). */
export async function aggiornaStatiSibill(fatturaIds: string[]) {
  if (!fatturaIds.length) return { checked: 0, results: [] as any[] };
  const { data, error } = await supabase.functions.invoke("sibill-integration", {
    body: { action: "refresh_status", fattura_ids: fatturaIds },
  });
  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  return data as { checked: number; results: any[] };
}

/** true se lo stato salvato proviene da una simulazione MOCK */
export function isMockSync(s?: SibillSync | null) {
  return !!s?.sibill_document_id?.includes("_mock_");
}

export type SibillDocumento = {
  id: string | null;
  number: string | null;
  type: string | null;
  status: string | null;
  delivery_status: string | null;
  delivery_date: string | null;
  gross: number | null;
  vat: number | null;
  net: number | null;
  currency: string | null;
  date: string | null;
  direction: string | null;
  counterpart: string | null;
  notes?: string | null;
  is_e_invoice?: boolean;
  file_name?: string | null;

};

export type SibillElenco = {
  documents: SibillDocumento[];
  scanned: number;
  done: boolean;
  warning: string | null;
};

/** Elenca i documenti Sibill dalla cache locale (popolata da `scansionaDocumentiSibill`).
 *  `filter: "P"` = fatture emesse con numero "/P", `filter: "IN"` = fatture ricevute (entrata). */
export async function elencaDocumentiSibillFull(
  opts: { mock?: boolean; filter?: "P" | "IN" | "all"; force?: boolean } = {},
): Promise<SibillElenco> {
  const { data, error } = await supabase.functions.invoke("sibill-integration", {
    body: { action: "list_documents", mock: !!opts.mock, filter: opts.filter || "P", force: !!opts.force },
  });
  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  const d = data as any;
  return { documents: (d.documents || []) as SibillDocumento[], scanned: d.scanned || 0, done: !!d.done, warning: d.warning || null };
}

/** Rilegge da Sibill soltanto i documenti più recenti (aggiornamento rapido, senza scansione completa). */
export async function sincronizzaRecentiSibill(opts: { mock?: boolean; pages?: number } = {}) {
  const { data, error } = await supabase.functions.invoke("sibill-integration", {
    body: { action: "sync_recent", mock: !!opts.mock, pages: opts.pages || 3 },
  });
  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  return data as { ok: boolean; scanned: number; cached?: number };
}

export async function elencaDocumentiSibill(opts: { mock?: boolean; filter?: "P" | "IN" | "all"; force?: boolean } = {}) {
  return (await elencaDocumentiSibillFull(opts)).documents;
}

/** Avanza di alcune pagine la scansione dei documenti Sibill (l'API non offre filtri lato server). */
export async function scansionaDocumentiSibill(opts: { mock?: boolean; pages?: number; restart?: boolean } = {}) {
  const { data, error } = await supabase.functions.invoke("sibill-integration", {
    body: { action: "scan_documents", mock: !!opts.mock, pages: opts.pages || 12, restart: !!opts.restart },
  });
  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  return data as { done: boolean; scanned: number; cached: number; rate_limited?: boolean };
}

