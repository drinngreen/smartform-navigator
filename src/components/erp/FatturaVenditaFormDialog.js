import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
export function FatturaVenditaFormDialog({ item, tenantId, onClose }) {
    const isEdit = !!item;
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        numero: item?.numero || "",
        data_fattura: item?.data_fattura || new Date().toISOString().split("T")[0],
        tipo_documento: item?.tipo_documento || "TD01",
        cliente_id: item?.cliente_id || "",
        condizioni_pagamento: item?.condizioni_pagamento || "",
        note: item?.note || "",
        stato: item?.stato || "bozza",
    });
    const [righe, setRighe] = useState([
        { descrizione: "", quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0, aliquota_iva: 22 },
    ]);
    const { data: clienti = [] } = useQuery({
        queryKey: ["erp-anagrafiche-clienti", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_anagrafiche").select("id, ragione_sociale").eq("tipo_soggetto", "cliente").eq("attivo", true).order("ragione_sociale");
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    // Load righe if editing
    useEffect(() => {
        if (isEdit) {
            supabase.from("erp_righe_fatture_vendita").select("*").eq("fattura_id", item.id).order("riga_numero").then(({ data }) => {
                if (data && data.length > 0) {
                    setRighe(data.map((r) => ({
                        id: r.id,
                        descrizione: r.descrizione,
                        quantita: r.quantita,
                        prezzo_unitario: r.prezzo_unitario,
                        sconto_percentuale: r.sconto_percentuale || 0,
                        aliquota_iva: r.aliquota_iva,
                        cer: r.cer,
                        centro_costo: r.centro_costo,
                    })));
                }
            });
        }
    }, [isEdit, item?.id]);
    const calcRiga = (r) => {
        const imp = r.quantita * r.prezzo_unitario * (1 - (r.sconto_percentuale || 0) / 100);
        const iva = imp * (r.aliquota_iva / 100);
        return { imponibile: imp, importo_iva: iva };
    };
    const totali = righe.reduce((acc, r) => {
        const { imponibile, importo_iva } = calcRiga(r);
        return { imponibile: acc.imponibile + imponibile, iva: acc.iva + importo_iva };
    }, { imponibile: 0, iva: 0 });
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const updateRiga = (idx, field, value) => {
        setRighe((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
    const addRiga = () => setRighe((p) => [...p, { descrizione: "", quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0, aliquota_iva: 22 }]);
    const removeRiga = (idx) => setRighe((p) => p.filter((_, i) => i !== idx));
    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form,
                tenant_id: tenantId || null,
                imponibile: totali.imponibile,
                iva: totali.iva,
                totale: totali.imponibile + totali.iva,
                netto_a_pagare: totali.imponibile + totali.iva,
                cliente_id: form.cliente_id || null,
            };
            let fatturaId = item?.id;
            if (isEdit) {
                const { error } = await supabase.from("erp_fatture_vendita").update(payload).eq("id", item.id);
                if (error)
                    throw error;
                // Delete old righe and re-insert
                await supabase.from("erp_righe_fatture_vendita").delete().eq("fattura_id", item.id);
            }
            else {
                const { data, error } = await supabase.from("erp_fatture_vendita").insert(payload).select("id").single();
                if (error)
                    throw error;
                fatturaId = data.id;
            }
            // Insert righe
            if (fatturaId && righe.length > 0) {
                const righePayload = righe.map((r, i) => {
                    const { imponibile, importo_iva } = calcRiga(r);
                    return {
                        fattura_id: fatturaId,
                        riga_numero: i + 1,
                        descrizione: r.descrizione,
                        quantita: r.quantita,
                        prezzo_unitario: r.prezzo_unitario,
                        sconto_percentuale: r.sconto_percentuale,
                        imponibile,
                        aliquota_iva: r.aliquota_iva,
                        importo_iva,
                        cer: r.cer || null,
                        centro_costo: r.centro_costo || null,
                    };
                });
                const { error: righeError } = await supabase.from("erp_righe_fatture_vendita").insert(righePayload);
                if (righeError)
                    throw righeError;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-fatture-vendita"] });
            toast.success(isEdit ? "Fattura aggiornata" : "Fattura creata");
            onClose();
        },
        onError: (e) => { console.error(e); toast.error("Errore salvataggio"); },
    });
    const formatCurrency = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/30 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground", children: isEdit ? "Modifica Fattura" : "Nuova Fattura Vendita" }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg hover:bg-muted/20", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Numero *" }), _jsx("input", { value: form.numero, onChange: (e) => set("numero", e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Data" }), _jsx("input", { type: "date", value: form.data_fattura, onChange: (e) => set("data_fattura", e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Tipo Documento" }), _jsxs("select", { value: form.tipo_documento, onChange: (e) => set("tipo_documento", e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "TD01", children: "TD01 - Fattura" }), _jsx("option", { value: "TD02", children: "TD02 - Acc./Anticipo" }), _jsx("option", { value: "TD04", children: "TD04 - Nota di Credito" }), _jsx("option", { value: "TD05", children: "TD05 - Nota di Debito" }), _jsx("option", { value: "TD24", children: "TD24 - Fatt. Differita" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Cliente" }), _jsxs("select", { value: form.cliente_id, onChange: (e) => set("cliente_id", e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "", children: "\u2014 Seleziona \u2014" }), clienti.map((c) => _jsx("option", { value: c.id, children: c.ragione_sociale }, c.id))] })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h4", { className: "text-sm font-semibold text-foreground", children: "Righe Fattura" }), _jsxs("button", { onClick: addRiga, className: "flex items-center gap-1 text-xs text-primary hover:underline", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), " Aggiungi riga"] })] }), _jsx("div", { className: "space-y-2", children: righe.map((r, i) => {
                                        const { imponibile } = calcRiga(r);
                                        return (_jsxs("div", { className: "grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-background/40 border border-border/20", children: [_jsxs("div", { className: "col-span-4", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "Descrizione" }), _jsx("input", { value: r.descrizione, onChange: (e) => updateRiga(i, "descrizione", e.target.value), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }), _jsxs("div", { className: "col-span-1", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "Qt\u00E0" }), _jsx("input", { type: "number", step: "0.01", value: r.quantita, onChange: (e) => updateRiga(i, "quantita", parseFloat(e.target.value) || 0), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "Prezzo Unit." }), _jsx("input", { type: "number", step: "0.01", value: r.prezzo_unitario, onChange: (e) => updateRiga(i, "prezzo_unitario", parseFloat(e.target.value) || 0), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }), _jsxs("div", { className: "col-span-1", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "Sc.%" }), _jsx("input", { type: "number", step: "0.01", value: r.sconto_percentuale, onChange: (e) => updateRiga(i, "sconto_percentuale", parseFloat(e.target.value) || 0), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }), _jsxs("div", { className: "col-span-1", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "IVA%" }), _jsx("input", { type: "number", value: r.aliquota_iva, onChange: (e) => updateRiga(i, "aliquota_iva", parseFloat(e.target.value) || 0), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: "Imponibile" }), _jsx("div", { className: "px-2 py-1.5 rounded-lg bg-muted/20 text-xs font-mono text-foreground", children: formatCurrency(imponibile) })] }), _jsx("div", { className: "col-span-1 flex justify-center", children: righe.length > 1 && (_jsx("button", { onClick: () => removeRiga(i), className: "p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })) })] }, i));
                                    }) })] }), _jsx("div", { className: "flex justify-end", children: _jsxs("div", { className: "w-64 space-y-1 p-3 rounded-xl bg-muted/10 border border-border/20", children: [_jsxs("div", { className: "flex justify-between text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: "Imponibile" }), _jsx("span", { className: "font-mono", children: formatCurrency(totali.imponibile) })] }), _jsxs("div", { className: "flex justify-between text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: "IVA" }), _jsx("span", { className: "font-mono", children: formatCurrency(totali.iva) })] }), _jsx("div", { className: "h-px bg-border/30 my-1" }), _jsxs("div", { className: "flex justify-between text-sm font-semibold", children: [_jsx("span", { children: "Totale" }), _jsx("span", { className: "font-mono text-primary", children: formatCurrency(totali.imponibile + totali.iva) })] })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Note" }), _jsx("textarea", { value: form.note, onChange: (e) => set("note", e.target.value), rows: 2, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t border-border/30", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20 transition-colors", children: "Annulla" }), _jsx("button", { onClick: () => mutation.mutate(), disabled: !form.numero || mutation.isPending, className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50", children: mutation.isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea Fattura" })] })] }) }));
}
