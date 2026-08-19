import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Eye, Trash2, CheckCircle2, AlertCircle, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { FatturaVenditaFormDialog } from "./FatturaVenditaFormDialog";
const STATO_CONFIG = {
    bozza: { icon: Clock, color: "text-yellow-400", label: "Bozza" },
    emessa: { icon: Send, color: "text-blue-400", label: "Emessa" },
    inviata_sdi: { icon: Send, color: "text-cyan-400", label: "Inviata SdI" },
    consegnata: { icon: CheckCircle2, color: "text-green-400", label: "Consegnata" },
    accettata: { icon: CheckCircle2, color: "text-emerald-400", label: "Accettata" },
    scartata: { icon: AlertCircle, color: "text-red-400", label: "Scartata" },
    annullata: { icon: AlertCircle, color: "text-red-300", label: "Annullata" },
};
export function FattureVenditaTab({ tenantId }) {
    const [search, setSearch] = useState("");
    const [filterStato, setFilterStato] = useState("tutti");
    const [showForm, setShowForm] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const queryClient = useQueryClient();
    const { data: fatture = [], isLoading } = useQuery({
        queryKey: ["erp-fatture-vendita", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_fatture_vendita").select("*, cliente:erp_anagrafiche!erp_fatture_vendita_cliente_id_fkey(ragione_sociale)").order("data_fattura", { ascending: false });
            if (tenantId)
                q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return data;
        },
    });
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("erp_fatture_vendita").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-fatture-vendita"] });
            toast.success("Fattura eliminata");
        },
        onError: () => toast.error("Errore eliminazione"),
    });
    const filtered = fatture.filter((f) => {
        const matchSearch = !search || f.numero?.includes(search) || f.cliente?.ragione_sociale?.toLowerCase().includes(search.toLowerCase());
        const matchStato = filterStato === "tutti" || f.stato === filterStato;
        return matchSearch && matchStato;
    });
    const formatCurrency = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca per numero o cliente...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("select", { value: filterStato, onChange: (e) => setFilterStato(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "tutti", children: "Tutti gli stati" }), Object.entries(STATO_CONFIG).map(([k, v]) => (_jsx("option", { value: k, children: v.label }, k)))] }), _jsxs("button", { onClick: () => { setViewItem(null); setShowForm(true); }, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuova Fattura"] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                    { label: "Totale Fatture", value: fatture.length, color: "text-foreground" },
                    { label: "Bozze", value: fatture.filter((f) => f.stato === "bozza").length, color: "text-yellow-400" },
                    { label: "Consegnate", value: fatture.filter((f) => f.stato === "consegnata" || f.stato === "accettata").length, color: "text-green-400" },
                    { label: "Totale €", value: formatCurrency(fatture.reduce((s, f) => s + (f.totale || 0), 0)), color: "text-primary" },
                ].map((c) => (_jsxs("div", { className: "p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: c.label }), _jsx("p", { className: `text-lg font-semibold ${c.color}`, children: c.value })] }, c.label))) }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessuna fattura trovata" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Numero" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Data" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Cliente" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Imponibile" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "IVA" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Totale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Stato" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: filtered.map((f) => {
                                    const stato = STATO_CONFIG[f.stato] || STATO_CONFIG.bozza;
                                    const StatoIcon = stato.icon;
                                    return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-mono font-medium text-foreground", children: f.numero }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: f.data_fattura }), _jsx("td", { className: "px-4 py-3 text-foreground", children: f.cliente?.ragione_sociale || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-muted-foreground", children: formatCurrency(f.imponibile) }), _jsx("td", { className: "px-4 py-3 font-mono text-muted-foreground", children: formatCurrency(f.iva) }), _jsx("td", { className: "px-4 py-3 font-mono font-semibold text-foreground", children: formatCurrency(f.totale) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: `flex items-center gap-1.5 text-xs ${stato.color}`, children: [_jsx(StatoIcon, { className: "h-3.5 w-3.5" }), stato.label] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => { setViewItem(f); setShowForm(true); }, className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors", title: "Modifica", children: _jsx(Eye, { className: "h-3.5 w-3.5" }) }), f.stato === "bozza" && (_jsx("button", { onClick: () => { if (confirm("Eliminare?"))
                                                                deleteMutation.mutate(f.id); }, className: "p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors", title: "Elimina", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }))] }) })] }, f.id));
                                }) })] }) })) }), showForm && (_jsx(FatturaVenditaFormDialog, { item: viewItem, tenantId: tenantId, onClose: () => { setShowForm(false); setViewItem(null); } }))] }));
}
