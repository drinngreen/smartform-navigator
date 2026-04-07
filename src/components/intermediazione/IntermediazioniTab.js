import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Plus, Search, ArrowRightLeft, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useIntermediazioni, useDeleteIntermediazione } from "@/hooks/useIntermediazioni";
import { IntermediazioneFormDialog } from "./IntermediazioneFormDialog";
const statoColors = {
    bozza: "bg-yellow-500/20 text-yellow-400",
    attiva: "bg-blue-500/20 text-blue-400",
    completata: "bg-emerald-500/20 text-emerald-400",
    fatturata: "bg-purple-500/20 text-purple-400",
    annullata: "bg-destructive/20 text-destructive",
};
const tipoProvvigioneLabels = {
    percentuale: "%",
    euro_ton: "€/ton",
    forfait: "Forfait",
};
export function IntermediazioniTab() {
    const { data: items = [], isLoading } = useIntermediazioni();
    const deleteMut = useDeleteIntermediazione();
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const filtered = items.filter(i => {
        const text = `${i.intermediario?.ragione_sociale} ${i.produttore?.name} ${i.destinatario?.name} ${i.cer} ${i.stato}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });
    // Stats
    const totale = items.length;
    const attive = items.filter(i => i.stato === "attiva").length;
    const completate = items.filter(i => i.stato === "completata").length;
    const daFatturare = items.filter(i => i.stato === "completata" && !i.fatturata).length;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-4 gap-3", children: [
                    { label: "Totale", value: totale, color: "text-foreground" },
                    { label: "Attive", value: attive, color: "text-blue-400" },
                    { label: "Completate", value: completate, color: "text-emerald-400" },
                    { label: "Da Fatturare", value: daFatturare, color: "text-yellow-400" },
                ].map(s => (_jsxs("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30 text-center", children: [_jsx("div", { className: `text-2xl font-bold ${s.color}`, children: s.value }), _jsx("div", { className: "text-xs text-muted-foreground mt-1", children: s.label })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca intermediazioni...", value: search, onChange: e => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => { setEditing(null); setShowForm(true); }, className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuova Intermediazione"] })] }), isLoading ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [_jsx(ArrowRightLeft, { className: "h-12 w-12 mx-auto mb-3 opacity-30" }), _jsx("p", { children: "Nessuna intermediazione trovata" })] })) : (_jsx("div", { className: "space-y-3", children: filtered.map(item => (_jsx("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Badge, { variant: "outline", className: statoColors[item.stato] || "", children: item.stato.toUpperCase() }), item.cer && _jsxs("span", { className: "text-xs font-mono text-muted-foreground", children: ["CER ", item.cer] }), item.fatturata && _jsx(Check, { className: "h-3.5 w-3.5 text-emerald-400" })] }), _jsx("div", { className: "text-sm text-foreground font-medium", children: item.intermediario?.ragione_sociale || "—" }), _jsxs("div", { className: "flex gap-4 mt-1 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Prod: ", item.produttore?.name || "—"] }), _jsxs("span", { children: ["Dest: ", item.destinatario?.name || "—"] }), _jsxs("span", { children: ["Trasp: ", item.trasportatore?.name || "—"] })] }), _jsxs("div", { className: "flex gap-4 mt-1 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Qty: ", item.quantita_effettiva_kg ?? item.quantita_stimata_kg ?? "—", " kg"] }), _jsxs("span", { children: ["Fee: ", item.valore_provvigione, " ", tipoProvvigioneLabels[item.tipo_provvigione]] }), item.importo_provvigione != null && _jsxs("span", { className: "text-primary font-medium", children: ["Provv: \u20AC", item.importo_provvigione.toFixed(2)] })] })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => { setEditing(item); setShowForm(true); }, children: _jsx(FileText, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-destructive", onClick: () => { if (confirm("Eliminare?"))
                                            deleteMut.mutate(item.id); }, children: _jsx(X, { className: "h-4 w-4" }) })] })] }) }, item.id))) })), _jsx(IntermediazioneFormDialog, { open: showForm, onOpenChange: setShowForm, intermediazione: editing, onSave: async () => setShowForm(false) })] }));
}
