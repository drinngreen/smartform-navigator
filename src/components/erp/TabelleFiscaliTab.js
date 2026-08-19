import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
function GenericTableManager({ table, label, fields, tenantId }) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({});
    const queryClient = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: [table, tenantId],
        queryFn: async () => {
            const q = supabase.from(table).select("*").order("codice");
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = { ...formData, tenant_id: tenantId || null };
            if (editItem) {
                const { error } = await supabase.from(table).update(payload).eq("id", editItem.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from(table).insert(payload);
                if (error)
                    throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [table] });
            toast.success(editItem ? `${label} aggiornato` : `${label} creato`);
            setShowForm(false);
            setEditItem(null);
        },
        onError: () => toast.error("Errore salvataggio"),
    });
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [table] });
            toast.success(`${label} eliminato`);
        },
    });
    const openForm = (item) => {
        if (item) {
            const data = {};
            fields.forEach((f) => (data[f.key] = item[f.key] ?? ""));
            setFormData(data);
            setEditItem(item);
        }
        else {
            const data = {};
            fields.forEach((f) => (data[f.key] = ""));
            setFormData(data);
            setEditItem(null);
        }
        setShowForm(true);
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold text-foreground", children: label }), _jsxs("button", { onClick: () => openForm(), className: "flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90", children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), " Nuovo"] })] }), showForm && (_jsxs("div", { className: "p-3 rounded-xl bg-card/80 border border-border/30 space-y-2", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2", children: fields.map((f) => (_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] font-mono text-muted-foreground mb-0.5", children: f.label }), _jsx("input", { type: f.type || "text", value: formData[f.key] ?? "", onChange: (e) => setFormData((p) => ({ ...p, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })), className: "w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" })] }, f.key))) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowForm(false), className: "px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted/20", children: "Annulla" }), _jsx("button", { onClick: () => saveMutation.mutate(), className: "px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs", children: editItem ? "Salva" : "Crea" })] })] })), _jsx("div", { className: "rounded-xl bg-card/60 border border-border/30 overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-4 text-center text-xs text-muted-foreground", children: "Caricamento..." })) : items.length === 0 ? (_jsx("div", { className: "p-4 text-center text-xs text-muted-foreground", children: "Nessun elemento" })) : (_jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [fields.map((f) => (_jsx("th", { className: "px-3 py-2 text-left font-mono uppercase text-muted-foreground", children: f.label }, f.key))), _jsx("th", { className: "px-3 py-2 text-left font-mono uppercase text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10", children: [fields.map((f) => (_jsx("td", { className: "px-3 py-2 text-foreground", children: item[f.key] ?? "—" }, f.key))), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => openForm(item), className: "p-1 rounded hover:bg-muted/20 text-muted-foreground", children: _jsx(Edit2, { className: "h-3 w-3" }) }), _jsx("button", { onClick: () => { if (confirm("Eliminare?"))
                                                        deleteMutation.mutate(item.id); }, className: "p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "h-3 w-3" }) })] }) })] }, item.id))) })] })) })] }));
}
export function TabelleFiscaliTab({ tenantId }) {
    return (_jsxs(Tabs, { defaultValue: "iva", className: "space-y-3", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 backdrop-blur-xl p-1", children: [_jsx(TabsTrigger, { value: "iva", className: "text-xs", children: "Codici IVA" }), _jsx(TabsTrigger, { value: "causali", className: "text-xs", children: "Causali Contabili" }), _jsx(TabsTrigger, { value: "pagamenti", className: "text-xs", children: "Metodi Pagamento" })] }), _jsx(TabsContent, { value: "iva", children: _jsx(GenericTableManager, { table: "erp_codici_iva", label: "Codice IVA", tenantId: tenantId, fields: [
                        { key: "codice", label: "Codice" },
                        { key: "descrizione", label: "Descrizione" },
                        { key: "aliquota", label: "Aliquota %", type: "number" },
                        { key: "natura", label: "Natura" },
                    ] }) }), _jsx(TabsContent, { value: "causali", children: _jsx(GenericTableManager, { table: "erp_causali_contabili", label: "Causale Contabile", tenantId: tenantId, fields: [
                        { key: "codice", label: "Codice" },
                        { key: "descrizione", label: "Descrizione" },
                        { key: "tipo", label: "Tipo (FV/FA/NC...)" },
                    ] }) }), _jsx(TabsContent, { value: "pagamenti", children: _jsx(GenericTableManager, { table: "erp_metodi_pagamento", label: "Metodo Pagamento", tenantId: tenantId, fields: [
                        { key: "codice", label: "Codice" },
                        { key: "descrizione", label: "Descrizione" },
                        { key: "codice_fatturapa", label: "Cod. FatturaPA" },
                        { key: "giorni_scadenza", label: "GG Scadenza", type: "number" },
                        { key: "numero_rate", label: "N. Rate", type: "number" },
                    ] }) })] }));
}
