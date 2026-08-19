import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { creaScritturaPrimaNota } from "@/lib/primaNotaService";
const emptyRiga = () => ({
    id: crypto.randomUUID(),
    conto_id: "",
    segno: "DARE",
    importo: "",
    descrizione_riga: "",
    centro_costo: "",
    commessa: "",
});
export function PrimaNotaFormDialog({ item, tenantId, onClose }) {
    const isView = !!item;
    const queryClient = useQueryClient();
    const [data, setData] = useState(item?.data_registrazione || new Date().toISOString().slice(0, 10));
    const [descrizione, setDescrizione] = useState(item?.descrizione || "");
    const [causaleId, setCausaleId] = useState(item?.causale_id || "");
    const [documentoTipo, setDocumentoTipo] = useState(item?.documento_tipo || "MANUALE");
    const [righe, setRighe] = useState([emptyRiga(), emptyRiga()]);
    const [saving, setSaving] = useState(false);
    // Load existing rows if viewing
    const { data: existingRighe } = useQuery({
        queryKey: ["erp-prima-nota-righe-detail", item?.id],
        enabled: !!item?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("erp_prima_nota_righe")
                .select("*, conto:erp_piano_conti!erp_prima_nota_righe_conto_id_fkey(codice, descrizione)")
                .eq("prima_nota_id", item.id)
                .order("created_at");
            if (error)
                throw error;
            return data;
        },
    });
    const { data: conti = [] } = useQuery({
        queryKey: ["erp-piano-conti-select", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_piano_conti").select("id, codice, descrizione, is_movimentabile").eq("is_movimentabile", true).order("codice");
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    const { data: causali = [] } = useQuery({
        queryKey: ["erp-causali-select", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_causali_contabili").select("id, codice, descrizione").eq("attivo", true).order("codice");
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    const totaleDare = useMemo(() => righe.filter(r => r.segno === "DARE").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0), [righe]);
    const totaleAvere = useMemo(() => righe.filter(r => r.segno === "AVERE").reduce((s, r) => s + (parseFloat(r.importo) || 0), 0), [righe]);
    const sbilancio = Math.abs(totaleDare - totaleAvere);
    const isBalanced = sbilancio < 0.01 && totaleDare > 0;
    const updateRiga = (id, field, value) => {
        setRighe(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };
    const addRiga = () => setRighe(prev => [...prev, emptyRiga()]);
    const removeRiga = (id) => setRighe(prev => prev.filter(r => r.id !== id));
    const handleSave = async () => {
        if (!isBalanced) {
            toast.error("La scrittura non è bilanciata (Dare ≠ Avere)");
            return;
        }
        if (!descrizione.trim()) {
            toast.error("Inserisci una descrizione");
            return;
        }
        setSaving(true);
        try {
            await creaScritturaPrimaNota({
                tenant_id: tenantId || null,
                data_registrazione: data,
                descrizione,
                causale_id: causaleId || null,
                documento_tipo: documentoTipo,
                righe: righe.filter(r => r.conto_id && parseFloat(r.importo) > 0).map(r => ({
                    conto_id: r.conto_id,
                    segno: r.segno,
                    importo: parseFloat(r.importo),
                    descrizione_riga: r.descrizione_riga,
                    centro_costo: r.centro_costo || undefined,
                    commessa: r.commessa || undefined,
                })),
            });
            toast.success("Scrittura registrata");
            queryClient.invalidateQueries({ queryKey: ["erp-prima-nota"] });
            onClose();
        }
        catch (err) {
            toast.error(err.message || "Errore salvataggio");
        }
        finally {
            setSaving(false);
        }
    };
    const formatCurrency = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/30 rounded-2xl shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsx("h2", { className: "text-lg font-semibold text-foreground", children: isView ? `Scrittura #${item.numero_registro}` : "Nuova Scrittura di Prima Nota" }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-muted/20 text-muted-foreground", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Data" }), _jsx("input", { type: "date", value: data, onChange: (e) => setData(e.target.value), disabled: isView, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Causale" }), _jsxs("select", { value: causaleId, onChange: (e) => setCausaleId(e.target.value), disabled: isView, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60", children: [_jsx("option", { value: "", children: "\u2014 Nessuna \u2014" }), causali.map((c) => _jsxs("option", { value: c.id, children: [c.codice, " \u2014 ", c.descrizione] }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Tipo Documento" }), _jsxs("select", { value: documentoTipo, onChange: (e) => setDocumentoTipo(e.target.value), disabled: isView, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60", children: [_jsx("option", { value: "MANUALE", children: "Manuale" }), _jsx("option", { value: "FATTURA_VENDITA", children: "Fattura Vendita" }), _jsx("option", { value: "FATTURA_ACQUISTO", children: "Fattura Acquisto" }), _jsx("option", { value: "INCASSO", children: "Incasso" }), _jsx("option", { value: "PAGAMENTO", children: "Pagamento" }), _jsx("option", { value: "GIROCONTO", children: "Giroconto" }), _jsx("option", { value: "STIPENDI", children: "Stipendi" }), _jsx("option", { value: "AMMORTAMENTO", children: "Ammortamento" })] })] }), _jsxs("div", { className: "col-span-2 md:col-span-1", children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Descrizione" }), _jsx("input", { value: descrizione, onChange: (e) => setDescrizione(e.target.value), disabled: isView, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground disabled:opacity-60" })] })] }), _jsx("div", { className: `flex items-center gap-2 p-3 rounded-xl border ${isBalanced ? "border-green-500/30 bg-green-500/10" : "border-yellow-500/30 bg-yellow-500/10"}`, children: isBalanced ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-green-400" }), _jsx("span", { className: "text-sm text-green-400", children: "Scrittura bilanciata" })] })) : (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "h-4 w-4 text-yellow-400" }), _jsxs("span", { className: "text-sm text-yellow-400", children: ["Sbilancio: ", formatCurrency(sbilancio), " \u2014 Dare: ", formatCurrency(totaleDare), " / Avere: ", formatCurrency(totaleAvere)] })] })) }), _jsxs("div", { className: "rounded-xl border border-border/30 overflow-hidden", children: [_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 bg-muted/10", children: [_jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground", children: "Conto" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-24", children: "Segno" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-32", children: "Importo" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground", children: "Descrizione" }), _jsx("th", { className: "px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground w-28", children: "C. Costo" }), !isView && _jsx("th", { className: "px-3 py-2 w-10" })] }) }), _jsx("tbody", { children: isView ? ((existingRighe || []).map((r) => (_jsxs("tr", { className: "border-b border-border/10", children: [_jsxs("td", { className: "px-3 py-2 text-foreground", children: [r.conto?.codice, " \u2014 ", r.conto?.descrizione] }), _jsx("td", { className: `px-3 py-2 font-mono font-bold ${r.segno === "DARE" ? "text-blue-400" : "text-green-400"}`, children: r.segno }), _jsx("td", { className: "px-3 py-2 font-mono text-foreground", children: formatCurrency(Number(r.importo)) }), _jsx("td", { className: "px-3 py-2 text-muted-foreground", children: r.descrizione_riga || "—" }), _jsx("td", { className: "px-3 py-2 text-muted-foreground text-xs", children: r.centro_costo || "—" })] }, r.id)))) : (righe.map((r) => (_jsxs("tr", { className: "border-b border-border/10", children: [_jsx("td", { className: "px-2 py-1", children: _jsxs("select", { value: r.conto_id, onChange: (e) => updateRiga(r.id, "conto_id", e.target.value), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground", children: [_jsx("option", { value: "", children: "Seleziona conto..." }), conti.map((c) => _jsxs("option", { value: c.id, children: [c.codice, " \u2014 ", c.descrizione] }, c.id))] }) }), _jsx("td", { className: "px-2 py-1", children: _jsxs("select", { value: r.segno, onChange: (e) => updateRiga(r.id, "segno", e.target.value), className: `w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs font-bold ${r.segno === "DARE" ? "text-blue-400" : "text-green-400"}`, children: [_jsx("option", { value: "DARE", children: "DARE" }), _jsx("option", { value: "AVERE", children: "AVERE" })] }) }), _jsx("td", { className: "px-2 py-1", children: _jsx("input", { type: "number", step: "0.01", min: "0", value: r.importo, onChange: (e) => updateRiga(r.id, "importo", e.target.value), placeholder: "0.00", className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground font-mono" }) }), _jsx("td", { className: "px-2 py-1", children: _jsx("input", { value: r.descrizione_riga, onChange: (e) => updateRiga(r.id, "descrizione_riga", e.target.value), placeholder: "Descrizione...", className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" }) }), _jsx("td", { className: "px-2 py-1", children: _jsx("input", { value: r.centro_costo, onChange: (e) => updateRiga(r.id, "centro_costo", e.target.value), placeholder: "\u2014", className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" }) }), _jsx("td", { className: "px-2 py-1", children: righe.length > 2 && (_jsx("button", { onClick: () => removeRiga(r.id), className: "p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })) })] }, r.id)))) })] }), !isView && (_jsx("div", { className: "p-2 border-t border-border/20", children: _jsxs("button", { onClick: addRiga, className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), " Aggiungi riga"] }) }))] }), _jsxs("div", { className: "flex justify-end gap-6 text-sm font-mono", children: [_jsxs("span", { className: "text-blue-400", children: ["Dare: ", formatCurrency(isView ? (existingRighe || []).filter((r) => r.segno === "DARE").reduce((s, r) => s + Number(r.importo), 0) : totaleDare)] }), _jsxs("span", { className: "text-green-400", children: ["Avere: ", formatCurrency(isView ? (existingRighe || []).filter((r) => r.segno === "AVERE").reduce((s, r) => s + Number(r.importo), 0) : totaleAvere)] })] }), !isView && (_jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20", children: "Annulla" }), _jsx("button", { onClick: handleSave, disabled: saving || !isBalanced, className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors", children: saving ? "Salvataggio..." : "Registra Scrittura" })] }))] })] }) }));
}
