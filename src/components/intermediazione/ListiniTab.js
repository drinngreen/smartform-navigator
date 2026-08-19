import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useIntermediari } from "@/hooks/useIntermediari";
import { ListinoFormDialog } from "./ListinoFormDialog";
export function ListiniTab() {
    const qc = useQueryClient();
    const { data: intermediari = [] } = useIntermediari();
    const { data: listini = [], isLoading } = useQuery({
        queryKey: ["listini_intermediazione"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("listini_intermediazione")
                .select(`*, intermediario:intermediari(ragione_sociale), produttore:organizations!listini_intermediazione_produttore_id_fkey(name)`)
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return (data || []);
        },
    });
    const deleteMut = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("listini_intermediazione").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["listini_intermediazione"] }); toast.success("Listino eliminato"); },
    });
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const filtered = listini.filter(l => `${l.intermediario?.ragione_sociale} ${l.produttore?.name} ${l.cer} ${l.descrizione}`.toLowerCase().includes(search.toLowerCase()));
    const tipoLabels = { percentuale: "%", euro_ton: "€/ton", forfait: "Forfait" };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca listini...", value: search, onChange: e => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => { setEditing(null); setShowForm(true); }, className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Listino"] })] }), isLoading ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [_jsx(ListChecks, { className: "h-12 w-12 mx-auto mb-3 opacity-30" }), _jsx("p", { children: "Nessun listino trovato" })] })) : (_jsx("div", { className: "grid gap-3", children: filtered.map(item => (_jsxs("div", { className: "flex items-center gap-4 p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium text-foreground", children: item.intermediario?.ragione_sociale || "—" }), _jsxs("div", { className: "flex gap-4 mt-1 text-xs text-muted-foreground", children: [item.produttore?.name && _jsxs("span", { children: ["Prod: ", item.produttore.name] }), item.cer && _jsxs("span", { children: ["CER: ", item.cer] }), _jsxs("span", { children: ["Fee: ", item.valore_provvigione, " ", tipoLabels[item.tipo_provvigione]] }), item.fee_minimo != null && _jsxs("span", { children: ["Min: \u20AC", item.fee_minimo] }), item.valido_dal && _jsxs("span", { children: ["Dal: ", item.valido_dal] }), item.valido_al && _jsxs("span", { children: ["Al: ", item.valido_al] })] }), item.descrizione && _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: item.descrizione })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "icon", variant: "ghost", onClick: () => { setEditing(item); setShowForm(true); }, children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", className: "text-destructive", onClick: () => { if (confirm("Eliminare?"))
                                        deleteMut.mutate(item.id); }, children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] }, item.id))) })), _jsx(ListinoFormDialog, { open: showForm, onOpenChange: setShowForm, listino: editing, intermediari: intermediari, onSaved: () => { setShowForm(false); qc.invalidateQueries({ queryKey: ["listini_intermediazione"] }); } })] }));
}
