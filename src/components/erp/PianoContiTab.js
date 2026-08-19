import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Edit2, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
const TIPO_LABELS = {
    attivo: "Attivo",
    passivo: "Passivo",
    costo: "Costo",
    ricavo: "Ricavo",
    ordine: "Ordine",
};
export function PianoContiTab({ tenantId }) {
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({ codice: "", descrizione: "", tipo: "attivo", livello: 1, parent_id: "" });
    const queryClient = useQueryClient();
    const { data: conti = [], isLoading } = useQuery({
        queryKey: ["erp-piano-conti", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_piano_conti").select("*").order("codice");
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
            const payload = { ...formData, tenant_id: tenantId || null, parent_id: formData.parent_id || null, livello: Number(formData.livello) };
            if (editItem) {
                const { error } = await supabase.from("erp_piano_conti").update(payload).eq("id", editItem.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from("erp_piano_conti").insert(payload);
                if (error)
                    throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-piano-conti"] });
            toast.success(editItem ? "Conto aggiornato" : "Conto creato");
            setShowForm(false);
            setEditItem(null);
        },
        onError: () => toast.error("Errore salvataggio"),
    });
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("erp_piano_conti").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-piano-conti"] });
            toast.success("Conto eliminato");
        },
    });
    const openForm = (item) => {
        if (item) {
            setFormData({ codice: item.codice, descrizione: item.descrizione, tipo: item.tipo, livello: item.livello, parent_id: item.parent_id || "" });
            setEditItem(item);
        }
        else {
            setFormData({ codice: "", descrizione: "", tipo: "attivo", livello: 1, parent_id: "" });
            setEditItem(null);
        }
        setShowForm(true);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground", children: "Piano dei Conti" }), _jsxs("button", { onClick: () => openForm(), className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Conto"] })] }), showForm && (_jsxs("div", { className: "p-4 rounded-2xl bg-card/80 border border-border/30 space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Codice" }), _jsx("input", { value: formData.codice, onChange: (e) => setFormData((p) => ({ ...p, codice: e.target.value })), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Descrizione" }), _jsx("input", { value: formData.descrizione, onChange: (e) => setFormData((p) => ({ ...p, descrizione: e.target.value })), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Tipo" }), _jsx("select", { value: formData.tipo, onChange: (e) => setFormData((p) => ({ ...p, tipo: e.target.value })), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: Object.entries(TIPO_LABELS).map(([k, v]) => _jsx("option", { value: k, children: v }, k)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono text-muted-foreground mb-1", children: "Livello" }), _jsx("input", { type: "number", min: 1, max: 4, value: formData.livello, onChange: (e) => setFormData((p) => ({ ...p, livello: parseInt(e.target.value) || 1 })), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowForm(false), className: "px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/20", children: "Annulla" }), _jsx("button", { onClick: () => saveMutation.mutate(), disabled: !formData.codice || !formData.descrizione, className: "px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50", children: editItem ? "Salva" : "Crea" })] })] })), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : conti.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessun conto. Crea il piano dei conti base." })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground", children: "Codice" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground", children: "Descrizione" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground", children: "Lv." }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: conti.map((c) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10", children: [_jsxs("td", { className: "px-4 py-2 font-mono text-foreground", style: { paddingLeft: `${(c.livello - 1) * 20 + 16}px` }, children: [c.livello > 1 && _jsx(ChevronRight, { className: "inline h-3 w-3 mr-1 text-muted-foreground" }), c.codice] }), _jsx("td", { className: "px-4 py-2 text-foreground", children: c.descrizione }), _jsx("td", { className: "px-4 py-2 text-xs text-muted-foreground", children: TIPO_LABELS[c.tipo] }), _jsx("td", { className: "px-4 py-2 text-xs text-muted-foreground", children: c.livello }), _jsx("td", { className: "px-4 py-2", children: _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => openForm(c), className: "p-1 rounded hover:bg-muted/20 text-muted-foreground", children: _jsx(Edit2, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => { if (confirm("Eliminare?"))
                                                        deleteMutation.mutate(c.id); }, className: "p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, c.id))) })] })) })] }));
}
