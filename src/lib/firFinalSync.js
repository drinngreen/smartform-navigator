import { supabase } from "@/lib/supabaseClient";
import { logAgentActivity } from "@/stores/agentActivityStore";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const MULTY_CF = "12347770013";
const NIYOL_CF = "09879800010";
const norm = (v) => {
    const compact = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return /^IT\d{11}$/.test(compact) ? compact.slice(2) : compact;
};
const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
const numberValue = (...values) => {
    const value = firstValue(...values);
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    const parsed = parseFloat(String(value || "").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
};
export const signedInventoryQuantity = (movementType, quantity) => {
    const amount = Number(quantity) || 0;
    return String(movementType).toUpperCase() === "CARICO" ? amount : -amount;
};
export const inventoryCorrection = (desiredSignedQuantity, currentSignedQuantity) => {
    const delta = desiredSignedQuantity - currentSignedQuantity;
    if (Math.abs(delta) < 0.001)
        return null;
    return {
        tipoMovimento: delta > 0 ? "CARICO" : "SCARICO",
        quantitaKg: Math.abs(delta),
    };
};
async function recalculateMultyStock(impiantoId, cer) {
    const { error: stockError } = await supabase.rpc("recalculate_magazzino_giacenza", {
        p_tenant_id: MULTY_TENANT_ID,
        p_impianto_id: impiantoId,
        p_cer: cer,
    });
    if (stockError)
        throw stockError;
}
async function upsertRegistro(tenantId, numeroFir, row) {
    const { data: found } = await supabase
        .from("registro_generale")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("numero_formulario", numeroFir)
        .limit(1)
        .maybeSingle();
    const foundRow = found;
    const payload = { ...row, tenant_id: tenantId };
    const { error } = foundRow?.id
        ? await supabase.from("registro_generale").update(payload).eq("id", foundRow.id)
        : await supabase.from("registro_generale").insert(payload);
    if (error)
        throw error;
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
export async function syncFirFinalToRegistryAndInventory(params) {
    const { firId } = params;
    if (!firId)
        throw new Error("firId mancante");
    logAgentActivity("Sincronizzazione FIR su registri e giacenze", "info", `FIR ${firId}`);
    const { data: fir, error } = await supabase
        .from("fir_forms")
        .select("*")
        .eq("id", firId)
        .maybeSingle();
    if (error)
        throw error;
    if (!fir)
        throw new Error("Formulario non trovato");
    const numeroFir = fir.numero_fir;
    const formData = (fir.form_data || {});
    const cer = firstValue(fir.codice_eer, formData.codice_eer, formData.codiceEER, formData.cer);
    const desc = firstValue(fir.descrizione_rifiuto, formData.descrizione_rifiuto, formData.descrizione);
    const qtaValid = numberValue(fir.quantita, formData.quantita, formData.quantita_partenza, formData.quantita_origine);
    const qtaDestinazione = numberValue(formData.quantita_destino, formData.quantita_accettata, formData.peso_ricevuto, formData.peso_destino);
    const prodDen = fir.produttore_denominazione || formData.produttore_denominazione || null;
    const destDen = fir.destinatario_denominazione || formData.destinatario_denominazione || null;
    const trspDen = fir.trasportatore_denominazione || formData.trasportatore_denominazione || null;
    const prodCf = norm(firstValue(fir.produttore_codice_fiscale, formData.produttore_codice_fiscale, formData.produttoreCodiceFiscale, formData.produttoreCF));
    const destCf = norm(firstValue(fir.destinatario_codice_fiscale, formData.destinatario_codice_fiscale, formData.destinatarioCodiceFiscale, formData.destinatarioCF));
    const trspCf = norm(firstValue(fir.trasportatore_codice_fiscale, formData.trasportatore_codice_fiscale, formData.trasportatoreCodiceFiscale, formData.trasportatoreCF));
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
    let warning;
    const today = new Date().toISOString().slice(0, 10);
    const movementDate = String(firstValue(formData.data_emissione, formData.dataEmissione, today)).slice(0, 10);
    const baseRow = (regType) => ({
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
        annotazioni: "Salvataggio definitivo FIR (Modulo Standard)",
        data_emissione_formulario: movementDate,
        raw: { fir_form_id: firId, form_data: formData },
    });
    // === REGISTRO — Multyproget (producer o destinatario) ===
    if (numeroFir && isMultyInvolved) {
        try {
            const regType = isMultyDestinatario ? "Carico" : "Scarico";
            await upsertRegistro(MULTY_TENANT_ID, numeroFir, baseRow(regType));
            registryOk = true;
        }
        catch (e) {
            warning = "Registro Multy non aggiornato: " + (e?.message || String(e));
        }
    }
    // === REGISTRO — Niyol (producer / destinatario / trasportatore) ===
    if (numeroFir && isNiyolInvolved) {
        try {
            const regType = isNiyolDestinatario
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
        }
        catch (e) {
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
    }
    else if (isMultyInvolved && inventoryQuantity <= 0) {
        warning = (warning ? warning + " · " : "") + "Quantità valida mancante: giacenze non aggiornate";
    }
    if (isMultyInvolved && inventoryQuantity > 0 && cer) {
        try {
            const directImpiantoId = params.impiantoId?.trim() ||
                (formData.impianto_id ? String(formData.impianto_id) : "");
            const impiantoId = directImpiantoId ||
                (await supabase
                    .from("impianti")
                    .select("id")
                    .eq("tenant_id", MULTY_TENANT_ID)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle()).data?.id;
            if (!impiantoId) {
                warning =
                    (warning ? warning + " · " : "") +
                        "Nessun impianto Multyproget disponibile per giacenze";
            }
            else {
                // Riconcilia sempre l'effetto netto completo del FIR, compensazioni incluse.
                const { data: existingRows, error: existingError } = await supabase
                    .from("movimenti_impianto")
                    .select("id, impianto_id, cer, quantita_kg, tipo_movimento, origine")
                    .eq("fir_id", firId)
                    .order("created_at", { ascending: true });
                if (existingError)
                    throw existingError;
                const tipo = isMultyDestinatario ? "CARICO" : "SCARICO";
                const ruolo = isMultyDestinatario ? "DESTINATARIO" : "PRODUTTORE";
                const desiredSignedQuantity = signedInventoryQuantity(tipo, inventoryQuantity);
                const rows = existingRows || [];
                const currentSignedQuantity = rows.reduce((total, row) => total + signedInventoryQuantity(row.tipo_movimento, row.quantita_kg), 0);
                const correction = inventoryCorrection(desiredSignedQuantity, currentSignedQuantity);
                if (correction) {
                    const { error: movementError } = await supabase.from("movimenti_impianto").insert({
                        impianto_id: impiantoId,
                        tenant_id: MULTY_TENANT_ID,
                        cer,
                        descrizione_rifiuto: desc,
                        quantita_kg: correction.quantitaKg,
                        data_movimento: movementDate,
                        tipo_movimento: correction.tipoMovimento,
                        ruolo_impianto: ruolo,
                        origine: rows.length === 0 ? "fir_final" : "fir_adjust",
                        fir_id: firId,
                        numero_fir: numeroFir,
                        produttore_denominazione: prodDen,
                        destinatario_denominazione: destDen,
                        note: rows.length === 0
                            ? "Salvataggio definitivo FIR (Modulo Standard)"
                            : `Riconciliazione automatica FIR: effetto netto richiesto ${desiredSignedQuantity} kg, precedente ${currentSignedQuantity} kg`,
                    });
                    if (movementError)
                        throw movementError;
                }
                const touched = new Map();
                for (const row of rows) {
                    touched.set(`${row.impianto_id}|${normalizeCer(row.cer)}`, {
                        impiantoId: row.impianto_id,
                        cer: normalizeCer(row.cer),
                    });
                }
                for (const item of touched.values()) {
                    if (item.impiantoId !== impiantoId || item.cer !== cer) {
                        await recalculateMultyStock(item.impiantoId, item.cer);
                    }
                }
                await recalculateMultyStock(impiantoId, cer);
                inventoryOk = true;
            }
        }
        catch (e) {
            warning =
                (warning ? warning + " · " : "") +
                    "Giacenze non aggiornate: " +
                    (e?.message || String(e));
        }
    }
    return { registry: registryOk, inventory: inventoryOk, warning };
}
/**
 * Reverts every inventory/registry effect produced by a FIR (draft or final).
 * Used when a formulario is deleted: the giacenze must go back exactly to the
 * value they had before the FIR was saved.
 */
export async function revertFirFromRegistryAndInventory(firId) {
    if (!firId)
        return;
    logAgentActivity("Storno FIR da registri e giacenze", "info", `FIR ${firId}`);
    // 1) Inventory movements generated by this FIR
    const { data: movements } = await supabase
        .from("movimenti_impianto")
        .select("id, impianto_id, cer")
        .eq("fir_id", firId)
        .in("origine", ["fir_final", "fir_adjust"]);
    const rows = (movements || []);
    if (rows.length > 0) {
        await supabase
            .from("movimenti_impianto")
            .delete()
            .in("id", rows.map((r) => r.id));
        const touched = new Map();
        for (const r of rows)
            touched.set(`${r.impianto_id}|${r.cer}`, { impiantoId: r.impianto_id, cer: r.cer });
        for (const { impiantoId, cer } of touched.values()) {
            try {
                await recalculateMultyStock(impiantoId, cer);
            }
            catch { /* keep going */ }
        }
    }
    // 2) Registry rows generated by this FIR (both tenants)
    await supabase
        .from("registro_generale")
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
};
export const MULTY_TENANT_ID_CONST = MULTY_TENANT_ID;
export const NIYOL_TENANT_ID_CONST = NIYOL_TENANT_ID;
