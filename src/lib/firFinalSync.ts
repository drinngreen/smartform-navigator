import { supabase } from "@/lib/supabaseClient";
import { logAgentActivity } from "@/stores/agentActivityStore";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";

const norm = (v: unknown) => {
  const compact = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^IT\d{11}$/.test(compact) ? compact.slice(2) : compact;
};

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");

/**
 * I moduli permettono di scrivere il CER con spazi ("15 01 01"): le giacenze
 * e il magazzino usano invece la forma compatta ("150101", "200140-FE").
 */
const normalizeCer = (value: unknown) => {
  const raw = String(value ?? "").toUpperCase().trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");
  // Il suffisso materiale può essere più lungo di 4 caratteri (es. "CAVO", "MIX"):
  // deve combaciare con public.normalize_cer lato database.
  const match = compact.match(/^(\d{6})(?:[-_/]?([A-Z0-9]+))?/);
  if (!match) return compact;
  return match[2] ? `${match[1]}-${match[2]}` : match[1];
};

const numberValue = (...values: unknown[]) => {
  const value = firstValue(...values);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const signedInventoryQuantity = (movementType: unknown, quantity: unknown) => {
  const amount = Number(quantity) || 0;
  return String(movementType).toUpperCase() === "CARICO" ? amount : -amount;
};

export const inventoryCorrection = (desiredSignedQuantity: number, currentSignedQuantity: number) => {
  const delta = desiredSignedQuantity - currentSignedQuantity;
  if (Math.abs(delta) < 0.001) return null;
  return {
    tipoMovimento: delta > 0 ? "CARICO" as const : "SCARICO" as const,
    quantitaKg: Math.abs(delta),
  };
};

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
 *  - applica la giacenza Multy solo alla chiusura digitale certificata,
 *    attraverso l'unica RPC autorizzata.
 *
 * Idempotente per tenant e documento di applicazione della giacenza.
 */
export async function syncFirFinalToRegistryAndInventory(params: {
  firId: string;
  impiantoId?: string | null;
  registryMovementType?: "Carico" | "Scarico";
  /**
   * Un movimento pesa sulle giacenze SOLO quando è effettivo, cioè quando il
   * peso è stato certificato dal destinatario (firma digitale) oppure
   * confermato a mano da un operatore (formulario cartaceo).
   * Finché è potenziale resta visibile e tracciato, ma non conta nei saldi.
   */
  effettivo?: boolean;
}): Promise<{ registry: boolean; registryApplicable: boolean; inventory: boolean; warning?: string }> {
  const { firId } = params;
  const effettivo = params.effettivo === true;
  const statoMovimento = effettivo ? "effettivo" : "potenziale";
  if (!firId) throw new Error("firId mancante");
  logAgentActivity("Sincronizzazione FIR su registri e giacenze", "info", `FIR ${firId}`);

  const { data: fir, error } = await supabase
    .from("fir_forms")
    .select("*")
    .eq("id", firId)
    .maybeSingle();
  if (error) throw error;
  if (!fir) throw new Error("Formulario non trovato");

  const numeroFir = (fir as any).numero_fir as string | null;
  const formData = ((fir as any).form_data || {}) as Record<string, any>;

  const cer =
    normalizeCer(
      firstValue((fir as any).codice_eer, formData.codice_eer, formData.codiceEER, formData.cer)
    ) || undefined;
  const desc = firstValue((fir as any).descrizione_rifiuto, formData.descrizione_rifiuto, formData.descrizione) as string | undefined;
  const qtaValid = numberValue((fir as any).quantita, formData.quantita, formData.quantita_partenza, formData.quantita_origine);
  const qtaDestinazione = numberValue(
    formData.quantita_destino,
    formData.quantita_accettata,
    formData.peso_ricevuto,
    formData.peso_destino
  );

  const prodDen = (fir as any).produttore_denominazione || formData.produttore_denominazione || null;
  const destDen = (fir as any).destinatario_denominazione || formData.destinatario_denominazione || null;
  const trspDen = (fir as any).trasportatore_denominazione || formData.trasportatore_denominazione || null;
  const prodCf = norm(firstValue((fir as any).produttore_codice_fiscale, formData.produttore_codice_fiscale, formData.produttoreCodiceFiscale, formData.produttoreCF));
  const destCf = norm(firstValue((fir as any).destinatario_codice_fiscale, formData.destinatario_codice_fiscale, formData.destinatarioCodiceFiscale, formData.destinatarioCF));
  const trspCf = norm(firstValue((fir as any).trasportatore_codice_fiscale, formData.trasportatore_codice_fiscale, formData.trasportatoreCodiceFiscale, formData.trasportatoreCF));

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
  const movementDate = String(firstValue(formData.data_emissione, formData.dataEmissione, today)).slice(0, 10);
  const baseRow = (regType: "Carico" | "Scarico"): Record<string, any> => ({
    data_movimento: movementDate,
    cer,
    descrizione: desc,
    carico_scarico: regType,
    tipo_operazione: regType === "Scarico" ? "Scarico da formulario FIR" : "Carico da formulario FIR",
    al_rentri: false,
    numero_formulario: numeroFir,
    segno: regType === "Scarico" ? "-" : "+",
    quantita: qtaValid,
    peso_destino: qtaDestinazione || qtaValid,
    luogo_produzione: prodDen,
    destinazione: destDen,
    annotazioni: effettivo
      ? "Salvataggio definitivo FIR (Modulo Standard)"
      : "FIR in viaggio: movimento potenziale, in attesa del peso certificato dal destinatario",
    data_emissione_formulario: movementDate,
    stato_movimento: statoMovimento,
    raw: { fir_form_id: firId, form_data: formData },
  });

  // === REGISTRO — Multyproget (producer o destinatario) ===
  if (numeroFir && isMultyInvolved) {
    try {
      const regType: "Carico" | "Scarico" = isMultyDestinatario ? "Carico" : "Scarico";
      await upsertRegistro(MULTY_TENANT_ID, numeroFir, { ...baseRow(regType), registro: "MULTY_IMPIANTO" });
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
      const row: Record<string, any> = { ...baseRow(regType), registro: "NIYOL" };
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
  const inventoryQuantity = isMultyDestinatario && qtaDestinazione > 0 ? qtaDestinazione : qtaValid;
  if (isMultyInvolved && !cer) {
    warning = (warning ? warning + " · " : "") + "Codice CER mancante: giacenze non aggiornate";
  } else if (isMultyInvolved && inventoryQuantity <= 0) {
    warning = (warning ? warning + " · " : "") + "Quantità valida mancante: giacenze non aggiornate";
  }
  if (effettivo && isMultyInvolved && inventoryQuantity > 0 && cer) {
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
        const tipo = isMultyDestinatario ? "CARICO" : "SCARICO";
        const { error: movementError } = await (supabase as any).rpc("applica_movimento_giacenza", {
          p_tenant_id: MULTY_TENANT_ID,
          p_impianto_id: impiantoId,
          p_cer: cer,
          p_quantita_kg: inventoryQuantity,
          p_segno: tipo,
          p_causale: "FIR_DIGITALE_CHIUSO",
          p_documento: `FIR:${numeroFir || firId}:CHIUSURA_DESTINATARIO`,
          p_attore: "human",
          p_descrizione: desc || null,
          p_fir_id: firId,
          p_numero_fir: numeroFir,
        });
        if (movementError) throw movementError;
        inventoryOk = true;
      }
    } catch (e: any) {
      warning =
        (warning ? warning + " · " : "") +
        "Giacenze non aggiornate: " +
        (e?.message || String(e));
    }
  }

  return { registry: registryOk, registryApplicable: isMultyInvolved || isNiyolInvolved, inventory: inventoryOk, warning };
}

/**
 * Elimina soltanto le righe di registro ancora reversibili. Le giacenze
 * effettive richiedono sempre un nuovo storno umano e tracciato.
 */
export async function revertFirFromRegistryAndInventory(firId: string): Promise<void> {
  if (!firId) return;
  logAgentActivity("Storno FIR da registri e giacenze", "info", `FIR ${firId}`);

  // Le giacenze effettive non vengono mai riscritte o cancellate automaticamente.
  // Un eventuale storno deve essere un nuovo movimento inverso, confermato da una persona.
  await supabase
    .from("registro_generale" as any)
    .delete()
    .filter("raw->>fir_form_id", "eq", firId);
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
