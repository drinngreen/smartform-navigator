import { supabase } from "@/lib/supabaseClient";
/**
 * Validates that DARE === AVERE totals, then inserts header + rows in sequence.
 */
export async function creaScritturaPrimaNota(params) {
    const totaleDare = params.righe.filter(r => r.segno === "DARE").reduce((s, r) => s + r.importo, 0);
    const totaleAvere = params.righe.filter(r => r.segno === "AVERE").reduce((s, r) => s + r.importo, 0);
    if (Math.abs(totaleDare - totaleAvere) > 0.01) {
        throw new Error(`Sbilancio: Dare ${totaleDare.toFixed(2)} ≠ Avere ${totaleAvere.toFixed(2)}`);
    }
    // Get next progressive number
    const anno = new Date(params.data_registrazione).getFullYear();
    const { data: numData } = await supabase.rpc("next_prima_nota_number", {
        p_tenant_id: params.tenant_id,
        p_anno: anno,
    });
    const { data: header, error: headerErr } = await supabase
        .from("erp_prima_nota")
        .insert({
        tenant_id: params.tenant_id,
        data_registrazione: params.data_registrazione,
        numero_registro: numData || 1,
        descrizione: params.descrizione,
        causale_id: params.causale_id || null,
        documento_tipo: params.documento_tipo || "MANUALE",
        documento_id: params.documento_id || null,
        created_by: params.created_by || null,
    })
        .select("id")
        .single();
    if (headerErr)
        throw headerErr;
    const righePayload = params.righe.map(r => ({
        prima_nota_id: header.id,
        conto_id: r.conto_id,
        segno: r.segno,
        importo: r.importo,
        descrizione_riga: r.descrizione_riga || "",
        centro_costo: r.centro_costo || null,
        commessa: r.commessa || null,
    }));
    const { error: righeErr } = await supabase
        .from("erp_prima_nota_righe")
        .insert(righePayload);
    if (righeErr)
        throw righeErr;
    return header.id;
}
/**
 * Auto-generate journal entry from a sales invoice.
 * Requires configured account IDs for the tenant (clienti, ricavi, IVA).
 */
export async function creaScritturaDaFatturaVendita(opts) {
    const righe = [
        { conto_id: opts.conto_cliente_id, segno: "DARE", importo: opts.totale, descrizione_riga: `Credito vs ${opts.cliente_nome}` },
        { conto_id: opts.conto_ricavi_id, segno: "AVERE", importo: opts.imponibile, descrizione_riga: "Ricavi vendita" },
        { conto_id: opts.conto_iva_id, segno: "AVERE", importo: opts.iva, descrizione_riga: "IVA a debito" },
    ];
    if (opts.ritenuta_acconto && opts.ritenuta_acconto > 0 && opts.conto_ritenuta_id) {
        // Ritenuta reduces what the client owes, so AVERE on cliente and DARE on ritenuta
        righe[0].importo = opts.totale - opts.ritenuta_acconto;
        righe.push({ conto_id: opts.conto_ritenuta_id, segno: "AVERE", importo: opts.ritenuta_acconto, descrizione_riga: "Ritenuta d'acconto" });
        // Rebalance: total DARE must equal total AVERE
        // DARE: (totale - ritenuta)
        // AVERE: imponibile + iva + ritenuta = totale
        // So we need DARE = totale, let's just keep it as totale
        righe[0].importo = opts.totale;
        righe.push({ conto_id: opts.conto_ritenuta_id, segno: "DARE", importo: opts.ritenuta_acconto, descrizione_riga: "Ritenuta d'acconto subita" });
        // Remove the previous AVERE ritenuta
        righe.splice(3, 1);
    }
    return creaScritturaPrimaNota({
        tenant_id: opts.tenant_id,
        data_registrazione: new Date().toISOString().slice(0, 10),
        descrizione: `Fattura vendita ${opts.numero_fattura} — ${opts.cliente_nome}`,
        causale_id: opts.causale_id,
        documento_tipo: "FATTURA_VENDITA",
        documento_id: opts.fattura_id,
        created_by: opts.created_by,
        righe,
    });
}
/**
 * Auto-generate journal entry from a payment/collection.
 */
export async function creaScritturaDaIncasso(opts) {
    return creaScritturaPrimaNota({
        tenant_id: opts.tenant_id,
        data_registrazione: new Date().toISOString().slice(0, 10),
        descrizione: opts.descrizione,
        causale_id: opts.causale_id,
        documento_tipo: "INCASSO",
        documento_id: opts.documento_id,
        created_by: opts.created_by,
        righe: [
            { conto_id: opts.conto_banca_id, segno: "DARE", importo: opts.importo, descrizione_riga: "Incasso su c/c" },
            { conto_id: opts.conto_cliente_id, segno: "AVERE", importo: opts.importo, descrizione_riga: "Chiusura credito cliente" },
        ],
    });
}
