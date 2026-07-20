import { supabase } from "@/lib/supabaseClient";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";

const norm = (v: unknown) => String(v || "").replace(/\s+/g, "").toUpperCase();

/**
 * After a FIR is saved as "final/completato", ensure that:
 *  - registro_generale has a row for it (upsert by numero_formulario)
 *  - movimenti_impianto has a fir_final row iff the tenant (Multy) is
 *    producer or destinatario. Role determines CARICO vs SCARICO on inventory.
 *
 * Idempotent: if a fir_final movement already exists it is left alone.
 */
export async function syncFirFinalToRegistryAndInventory(params: {
  firId: string;
  impiantoId?: string | null;
  registryMovementType?: "Carico" | "Scarico";
}): Promise<{ registry: boolean; inventory: boolean; warning?: string }> {
  const { firId } = params;
  if (!firId) throw new Error("firId mancante");

  const { data: fir, error } = await supabase
    .from("fir_forms")
    .select("*")
    .eq("id", firId)
    .maybeSingle();
  if (error) throw error;
  if (!fir) throw new Error("Formulario non trovato");

  const tenantId = (fir as any).tenant_id as string | undefined;
  const numeroFir = (fir as any).numero_fir as string | null;
  const formData = ((fir as any).form_data || {}) as Record<string, any>;

  const cer = (fir as any).codice_eer || formData.codice_eer || formData.cer || null;
  const desc = (fir as any).descrizione_rifiuto || formData.descrizione_rifiuto || null;
  const qtaRaw = (fir as any).quantita ?? formData.quantita ?? formData.quantita_partenza ?? null;
  const qta = typeof qtaRaw === "number" ? qtaRaw : parseFloat(String(qtaRaw || "").replace(",", "."));
  const qtaValid = Number.isFinite(qta) ? qta : 0;

  const prodDen = (fir as any).produttore_denominazione || null;
  const destDen = (fir as any).destinatario_denominazione || null;
  const prodCf = norm((fir as any).produttore_codice_fiscale || formData.produttore_codice_fiscale);
  const destCf = norm((fir as any).destinatario_codice_fiscale || formData.destinatario_codice_fiscale);

  // Determine role of the OWNING tenant (currently only Multyproget owns inventory)
  const isMultyProducer = tenantId === MULTY_TENANT_ID && (prodCf === MULTY_CF);
  const isMultyDestinatario = tenantId === MULTY_TENANT_ID && (destCf === MULTY_CF);

  // Registry movement type: from param or inferred
  const inferredRegType: "Carico" | "Scarico" = params.registryMovementType
    ?? (isMultyDestinatario ? "Carico" : isMultyProducer ? "Scarico" : "Carico");

  let registryOk = false;
  let inventoryOk = false;
  let warning: string | undefined;

  // === REGISTRO ===
  if (tenantId && numeroFir) {
    try {
      const row: Record<string, any> = {
        tenant_id: tenantId,
        data_movimento: new Date().toISOString().slice(0, 10),
        cer: cer,
        descrizione: desc,
        carico_scarico: inferredRegType,
        tipo_operazione: inferredRegType === "Scarico" ? "Scarico da formulario FIR" : "Carico da formulario FIR",
        al_rentri: false,
        numero_formulario: numeroFir,
        segno: inferredRegType === "Scarico" ? "-" : "+",
        quantita: qtaValid,
        peso_destino: qtaValid,
        luogo_produzione: prodDen,
        destinazione: destDen,
        annotazioni: "Salvataggio definitivo FIR (Modulo Standard)",
        data_emissione_formulario: new Date().toISOString().slice(0, 10),
        raw: { fir_form_id: firId, form_data: formData },
      };
      const { data: found } = await supabase
        .from("registro_generale" as any)
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("numero_formulario", numeroFir)
        .limit(1)
        .maybeSingle();
      const foundRow = found as { id?: string } | null;
      const regErr = foundRow?.id
        ? (await supabase.from("registro_generale" as any).update(row).eq("id", foundRow.id)).error
        : (await supabase.from("registro_generale" as any).insert(row)).error;
      if (regErr) throw regErr;
      registryOk = true;
    } catch (e: any) {
      warning = "Registro non aggiornato: " + (e?.message || String(e));
    }
  }

  // === GIACENZE (only if Multy is producer or destinatario) ===
  if ((isMultyProducer || isMultyDestinatario) && qtaValid > 0 && cer) {
    try {
      const directImpiantoId = params.impiantoId?.trim() || (formData.impianto_id ? String(formData.impianto_id) : "");
      const impiantoId = directImpiantoId || (
        ((await supabase.from("impianti" as any).select("id").eq("tenant_id", MULTY_TENANT_ID).order("created_at", { ascending: true }).limit(1).maybeSingle()).data as any)?.id
      );
      if (!impiantoId) {
        warning = (warning ? warning + " · " : "") + "Nessun impianto Multyproget disponibile per giacenze";
      } else {
        const { data: existing } = await supabase
          .from("movimenti_impianto" as any)
          .select("id")
          .eq("fir_id", firId)
          .eq("origine", "fir_final")
          .limit(1)
          .maybeSingle();
        if (!existing) {
          const tipo = isMultyDestinatario ? "CARICO" : "SCARICO";
          const ruolo = isMultyDestinatario ? "DESTINATARIO" : "PRODUTTORE";
          const { error: mErr } = await supabase.from("movimenti_impianto" as any).insert({
            impianto_id: impiantoId,
            tenant_id: MULTY_TENANT_ID,
            cer,
            descrizione_rifiuto: desc,
            quantita_kg: qtaValid,
            data_movimento: new Date().toISOString().slice(0, 10),
            tipo_movimento: tipo,
            ruolo_impianto: ruolo,
            origine: "fir_final",
            fir_id: firId,
            numero_fir: numeroFir,
            produttore_denominazione: prodDen,
            destinatario_denominazione: destDen,
            note: "Salvataggio definitivo FIR (Modulo Standard)",
          } as any);
          if (mErr) throw mErr;
        }
        inventoryOk = true;
      }
    } catch (e: any) {
      warning = (warning ? warning + " · " : "") + "Giacenze non aggiornate: " + (e?.message || String(e));
    }
  }

  return { registry: registryOk, inventory: inventoryOk, warning };
}

/**
 * Anagrafica presets for the two owning legal entities, used to prefill
 * the standard FIR form when the fields are empty.
 */
export const COMPANY_PRESETS = {
  multy: {
    ragione_sociale: "MULTY PROGET S.R.L.",
    codice_fiscale: MULTY_CF,
    partita_iva: MULTY_CF,
    indirizzo: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
  },
  niyol: {
    ragione_sociale: "NIYOL ETICONS LOGISTICA SRL SB",
    codice_fiscale: NIYOL_CF,
    partita_iva: NIYOL_CF,
    indirizzo: "VIA RIVAROSSA 18/20 - 10060 Piscina (TO)",
  },
} as const;

export const MULTY_TENANT_ID_CONST = MULTY_TENANT_ID;
