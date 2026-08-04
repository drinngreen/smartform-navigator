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

/** Invia la fattura a Sibill: crea/verifica l'anagrafica e trasmette l'XML FatturaPA */
export async function inviaFatturaASibill(f: any) {
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
    body: { action: "send_invoice", fattura_id: f.id, tenant_id: f.tenant_id, xml, counterpart },
  });

  if (error) throw new Error(error.message || "Errore di rete verso Sibill");
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(`${e.title}: ${e.detail}`);
  }
  return data as { document_id: string | null };
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
