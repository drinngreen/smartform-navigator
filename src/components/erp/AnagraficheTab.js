import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Edit2, Trash2, Building2, User, Landmark, Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { AnagraficaFormDialog } from "./AnagraficaFormDialog";
const TIPO_ICONS = {
    cliente: Building2,
    fornitore: Briefcase,
    collaboratore_piva: User,
    dipendente: Users,
    banca: Landmark,
};
const TIPO_LABELS = {
    cliente: "Cliente",
    fornitore: "Fornitore",
    collaboratore_piva: "Collaboratore P.IVA",
    dipendente: "Dipendente",
    banca: "Banca",
};
export function AnagraficheTab({ tenantId }) {
    const [search, setSearch] = useState("");
    const [filterTipo, setFilterTipo] = useState("tutti");
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const queryClient = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["erp-anagrafiche", tenantId],
        queryFn: async () => {
            const q = supabase.from("erp_anagrafiche").select("*").order("ragione_sociale");
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
            const { error } = await supabase.from("erp_anagrafiche").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["erp-anagrafiche"] });
            toast.success("Anagrafica eliminata");
        },
        onError: () => toast.error("Errore eliminazione"),
    });
    const filtered = items.filter((i) => {
        const matchSearch = !search || i.ragione_sociale?.toLowerCase().includes(search.toLowerCase()) || i.partita_iva?.includes(search) || i.codice_fiscale?.toLowerCase().includes(search.toLowerCase());
        const matchTipo = filterTipo === "tutti" || i.tipo_soggetto === filterTipo;
        return matchSearch && matchTipo;
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca per ragione sociale, P.IVA, CF...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("select", { value: filterTipo, onChange: (e) => setFilterTipo(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "tutti", children: "Tutti i tipi" }), Object.entries(TIPO_LABELS).map(([k, v]) => (_jsx("option", { value: k, children: v }, k)))] }), _jsxs("button", { onClick: () => { setEditItem(null); setShowForm(true); }, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Soggetto"] })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessuna anagrafica trovata" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Ragione Sociale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "P.IVA" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "CF" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Comune" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "PEC" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: filtered.map((item) => {
                                    const Icon = TIPO_ICONS[item.tipo_soggetto] || Building2;
                                    return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: "flex items-center gap-2 text-xs", children: [_jsx(Icon, { className: "h-3.5 w-3.5 text-muted-foreground" }), TIPO_LABELS[item.tipo_soggetto] || item.tipo_soggetto] }) }), _jsx("td", { className: "px-4 py-3 font-medium text-foreground", children: item.ragione_sociale }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.partita_iva || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.codice_fiscale || "—" }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: item.comune || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.pec || "—" }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => { setEditItem(item); setShowForm(true); }, className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors", children: _jsx(Edit2, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => { if (confirm("Eliminare?"))
                                                                deleteMutation.mutate(item.id); }, className: "p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, item.id));
                                }) })] }) })) }), showForm && (_jsx(AnagraficaFormDialog, { item: editItem, tenantId: tenantId, onClose: () => { setShowForm(false); setEditItem(null); } }))] }));
}
