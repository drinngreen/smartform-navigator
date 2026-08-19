import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntermediari, useCreateIntermediario, useUpdateIntermediario, useDeleteIntermediario } from "@/hooks/useIntermediari";
import { IntermediarioFormDialog } from "./IntermediarioFormDialog";
export function IntermediariTab() {
    const { data: intermediari = [], isLoading } = useIntermediari();
    const createMut = useCreateIntermediario();
    const updateMut = useUpdateIntermediario();
    const deleteMut = useDeleteIntermediario();
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const filtered = intermediari.filter(i => `${i.ragione_sociale} ${i.codice_fiscale} ${i.partita_iva} ${i.comune}`.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca intermediari...", value: search, onChange: e => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => { setEditing(null); setShowForm(true); }, className: "gap-2", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Intermediario"] })] }), isLoading ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [_jsx(Building2, { className: "h-12 w-12 mx-auto mb-3 opacity-30" }), _jsx("p", { children: "Nessun intermediario trovato" })] })) : (_jsx("div", { className: "grid gap-3", children: filtered.map(item => (_jsxs("div", { className: "flex items-center gap-4 p-4 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "font-medium text-foreground truncate", children: item.ragione_sociale }), item.attivo ? (_jsx("span", { className: "px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400", children: "Attivo" })) : (_jsx("span", { className: "px-2 py-0.5 text-[10px] rounded-full bg-destructive/20 text-destructive", children: "Inattivo" }))] }), _jsxs("div", { className: "flex gap-4 mt-1 text-xs text-muted-foreground", children: [item.partita_iva && _jsxs("span", { children: ["P.IVA: ", item.partita_iva] }), item.numero_iscrizione_albo && _jsxs("span", { children: ["Albo Cat.8: ", item.numero_iscrizione_albo] }), item.comune && _jsxs("span", { children: [item.comune, " (", item.provincia, ")"] }), item.cer_autorizzati?.length > 0 && _jsxs("span", { children: [item.cer_autorizzati.length, " CER autorizzati"] })] })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "icon", variant: "ghost", onClick: () => { setEditing(item); setShowForm(true); }, children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", className: "text-destructive", onClick: () => { if (confirm("Eliminare?"))
                                        deleteMut.mutate(item.id); }, children: _jsx(Trash2, { className: "h-4 w-4" }) })] })] }, item.id))) })), _jsx(IntermediarioFormDialog, { open: showForm, onOpenChange: setShowForm, intermediario: editing, onSave: async (values) => {
                    if (editing) {
                        await updateMut.mutateAsync({ id: editing.id, ...values });
                    }
                    else {
                        await createMut.mutateAsync(values);
                    }
                    setShowForm(false);
                } })] }));
}
