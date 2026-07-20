import { supabase } from "@/lib/supabaseClient";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";

const norm = (v: unknown) => String(v || "").replace(/\s+/g, "").toUpperCase();

async function upsertRegistro(
  tenantId: string,
  numeroFir: string,
  row: Record<string, any>
) {
  const { data: found } = await supabase
    .from("registro_generale" as any)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("numero_formulario", numeroFir)
    .limit(1)
    .maybeSingle();
  const foundRow = found as { id?: string } | null;
  const payload = { ...row, tenant_id: tenantId };
  const { error } = foundRow?.id
    ? await supabase.from("registro_generale" as any).update(payload).eq("id", foundRow.id)
    : await supabase.from("registro_generale" as any).insert(payload);
  if (error) throw error;
}

/**
 * After a FIR is saved as "final/completato":
 *  - upsert registro_generale for EACH tenant involved (Multy producer/dest,
 *    Niyol producer/dest/transporter), independently of the tenant that
 *    owns the fir_forms row.
 *  - upsert movimenti_impianto (giacenze) for Multyproget when it is
 *    producer or destinatario.
 *
 * Idempotent per tenant (upsert by tenant_id + numero_formulario) and per
 * inventory movement (unique on fir_id + origine='fir_final').
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

  const numeroFir = (fir as any).numero_fir as string | null;
  const formData = ((fir as any).form_data || {}) as Record<string, any>;

  const cer = (fir as any).codice_eer || formData.codice_eer || formData.cer || null;
  const desc = (fir as any).descrizione_rifiuto || formData.descrizione_rifiuto || null;
  const qtaRaw = (fir as any).quantita ?? formData.quantita ?? formData.quantita_partenza ?? null;
  const qta = typeof qtaRaw === "number" ? qtaRaw : parseFloat(String(qtaRaw || "").replace(",", "."));
  const qtaValid = Number.isFinite(qta) ? qta : 0;

  const prodDen = (fir as any).produttore_denominazione || formData.produttore_denominazione || null;
  const destDen = (fir as any).destinatario_denominazione || formData.destinatario_denominazione || null;
  const trspDen = (fir as any).trasportatore_denominazione || formData.trasportatore_denominazione || null;
  const prodCf = norm((fir as any).produttore_codice_fiscale || formData.produttore_codice_fiscale);
  const destCf = norm((fir as any).destinatario_codice_fiscale || formData.destinatario_codice_fiscale);
  const trspCf = norm((fir as any).trasportatore_codice_fiscale || formData.trasportatore_codice_fiscale);

  // CF-based role detection (independent of the owning tenant)
  const isMultyProducer = prodCf === MULTY_CF;
  const isMultyDestinatario = destCf === MULTY_CF;
  const isMultyInvolved = isMultyProducer || isMultyDestinatario;

  const isNiyolProducer = prodCf === NIYOL_CF;
  const isNiyolDestinatario = destCf === NIYOL_CF;
  const isNiyolTransporter = trspCf === NIYOL_CF;
  const isNiyolInvolved = isNiyolProducer || isNiyolDestinatario || isNiyolTransporter;

  let registryOk = false;
  let inventoryOk = false;
  let warning: string | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const baseRow = (regType: "Carico" | "Scarico"): Record<string, any> => ({
    data_movimento: today,
    cer,
    descrizione: desc,
    carico_scarico: regType,
    tipo_operazione: regType === "Scarico" ? "Scarico da formulario FIR" : "Carico da formulario FIR",
    al_rentri: false,
    numero_formulario: numeroFir,
    segno: regType === "Scarico" ? "-" : "+",
    quantita: qtaValid,
    peso_destino: qtaValid,
    luogo_produzione: prodDen,
    destinazione: destDen,
    annotazioni: "Salvataggio definitivo FIR (Modulo Standard)",
    data_emissione_formulario: today,
    raw: { fir_form_id: firId, form_data: formData },
  });

  // === REGISTRO — Multyproget (producer o destinatario) ===
  if (numeroFir && isMultyInvolved) {
    try {
      const regType: "Carico" | "Scarico" =
        params.registryMovementType ?? (isMultyDestinatario ? "Carico" : "Scarico");
      await upsertRegistro(MULTY_TENANT_ID, numeroFir, baseRow(regType));
      registryOk = true;
    } catch (e: any) {
      warning = "Registro Multy non aggiornato: " + (e?.message || String(e));
    }
  }

  // === REGISTRO — Niyol (producer / destinatario / trasportatore) ===
  if (numeroFir && isNiyolInvolved) {
    try {
      const regType: "Carico" | "Scarico" = isNiyolDestinatario
        ? "Carico"
        : isNiyolProducer
        ? "Scarico"
        : "Carico";
      const row = baseRow(regType);
      if (!isNiyolProducer && !isNiyolDestinatario) {
        row.annotazioni = `Transito come trasportatore (${trspDen || "Niyol"}) — FIR Standard`;
      }
      await upsertRegistro(NIYOL_TENANT_ID, numeroFir, row);
      registryOk = true;
    } catch (e: any) {
      warning =
        (warning ? warning + " · " : "") +
        "Registro Niyol non aggiornato: " +
        (e?.message || String(e));
    }
  }

  // === GIACENZE (Multy inventory only when Multy is producer or destinatario) ===
  if (isMultyInvolved && qtaValid > 0 && cer) {
    try {
      const directImpiantoId =
        params.impiantoId?.trim() ||
        (formData.impianto_id ? String(formData.impianto_id) : "");
      const impiantoId =
        directImpiantoId ||
        (
          (
            await supabase
              .from("impianti" as any)
              .select("id")
              .eq("tenant_id", MULTY_TENANT_ID)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle()
          ).data as any
        )?.id;
      if (!impiantoId) {
        warning =
          (warning ? warning + " · " : "") +
          "Nessun impianto Multyproget disponibile per giacenze";
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
            data_movimento: today,
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
      warning =
        (warning ? warning + " · " : "") +
        "Giacenze non aggiornate: " +
        (e?.message || String(e));
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
export const NIYOL_TENANT_ID_CONST = NIYOL_TENANT_ID;
