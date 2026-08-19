import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonWarehouses } from "@/hooks/dragon/useDragonWarehouses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
const typeLabels = { WASTE_CER: "Rifiuto CER", MPS: "MPS", MATERIAL: "Materiale" };
const typeColors = { WASTE_CER: "bg-amber-500/20 text-amber-300", MPS: "bg-blue-500/20 text-blue-300", MATERIAL: "bg-violet-500/20 text-violet-300" };
const emptyForm = {
    codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER",
    unita_misura_default: "kg", fattore_conversione: "1", tipo_mps_eow: "", tipo_mps_eow_desc: "", default_warehouse_id: "",
};
export default function DragonArticoliPage() {
    const { items, isLoading, create, update } = useDragonItems();
    const { warehouses } = useDragonWarehouses();
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [filter, setFilter] = useState("");
    const [form, setForm] = useState(emptyForm);
    const filtered = items.filter(i => i.codice_cer.includes(filter) || i.descrizione.toLowerCase().includes(filter.toLowerCase()));
    const openNew = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (item) => {
        setEditId(item.id);
        setForm({
            codice_cer: item.codice_cer, descrizione: item.descrizione, pericoloso: item.pericoloso,
            item_type: item.item_type, unita_misura_default: item.unita_misura_default,
            fattore_conversione: (item.fattore_conversione ?? 1).toString(),
            tipo_mps_eow: item.tipo_mps_eow ?? "", tipo_mps_eow_desc: item.tipo_mps_eow_desc ?? "",
            default_warehouse_id: item.default_warehouse_id ?? "",
        });
        setShowForm(true);
    };
    const handleSubmit = async () => {
        if (!form.codice_cer || !form.descrizione)
            return;
        const payload = {
            ...form,
            fattore_conversione: parseFloat(form.fattore_conversione) || 1,
            tipo_mps_eow: form.tipo_mps_eow || null,
            tipo_mps_eow_desc: form.tipo_mps_eow_desc || null,
            default_warehouse_id: form.default_warehouse_id || null,
        };
        if (editId) {
            await update.mutateAsync({ id: editId, ...payload });
        }
        else {
            await create.mutateAsync(payload);
        }
        setShowForm(false);
    };
    const showConversion = form.unita_misura_default.toLowerCase() !== "kg";
    const showMpsSection = form.item_type === "MPS" || form.item_type === "MATERIAL";
    return (_jsxs(MNAdminLayout, { title: "Articoli / CER / MPS", subtitle: "Dragon Rifiuti 2 \u2014 Anagrafica articoli ambientali", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(DragonBackButton, {}), _jsxs("div", { className: "flex flex-wrap justify-between items-center gap-3", children: [_jsx(Input, { placeholder: "Cerca codice o descrizione...", className: "w-64 h-9", value: filter, onChange: e => setFilter(e.target.value) }), _jsxs(Button, { size: "sm", onClick: openNew, children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Articolo"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Descrizione" }), _jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { children: "U.M." }), _jsx(TableHead, { children: "Conv." }), _jsx(TableHead, { children: "HP" }), _jsx(TableHead, { children: "Stato" }), _jsx(TableHead, {})] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 8, className: "text-center py-12 text-muted-foreground", children: "Nessun articolo trovato" }) })) : (filtered.map((item) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "font-mono text-sm", children: item.codice_cer }), _jsx(TableCell, { className: "text-sm", children: item.descrizione }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: typeColors[item.item_type], children: typeLabels[item.item_type] }) }), _jsx(TableCell, { className: "text-sm", children: item.unita_misura_default }), _jsx(TableCell, { className: "text-xs font-mono", children: item.fattore_conversione && item.fattore_conversione !== 1 ? item.fattore_conversione : "—" }), _jsx(TableCell, { children: item.pericoloso ? _jsx(Badge, { variant: "outline", className: "bg-rose-500/20 text-rose-300", children: "\u26A0 Pericoloso" }) : "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: item.attivo ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground", children: item.attivo ? "Attivo" : "Inattivo" }) }), _jsx(TableCell, { children: _jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(item), children: _jsx(Pencil, { className: "h-4 w-4" }) }) })] }, item.id)))) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: editId ? "Modifica Articolo" : "Nuovo Articolo" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice CER *" }), _jsx(Input, { value: form.codice_cer, onChange: e => setForm(f => ({ ...f, codice_cer: e.target.value })), placeholder: "170904" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione *" }), _jsx(Input, { value: form.descrizione, onChange: e => setForm(f => ({ ...f, descrizione: e.target.value })), placeholder: "Rifiuti misti dell'attivit\u00E0 di costruzione..." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo" }), _jsxs(Select, { value: form.item_type, onValueChange: v => setForm(f => ({ ...f, item_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: Object.entries(typeLabels).map(([k, v]) => _jsx(SelectItem, { value: k, children: v }, k)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Unit\u00E0 di Misura" }), _jsx(Input, { value: form.unita_misura_default, onChange: e => setForm(f => ({ ...f, unita_misura_default: e.target.value })) })] }), showConversion && (_jsxs("div", { children: [_jsx(Label, { children: "Fattore di Conversione (\u2192 kg)" }), _jsx(Input, { type: "number", step: "0.001", value: form.fattore_conversione, onChange: e => setForm(f => ({ ...f, fattore_conversione: e.target.value })), placeholder: "1" })] })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: form.pericoloso, onCheckedChange: v => setForm(f => ({ ...f, pericoloso: v })) }), _jsx(Label, { children: "Pericoloso" })] }), showMpsSection && (_jsxs("div", { className: "border-t border-border/30 pt-3 space-y-3", children: [_jsx("p", { className: "text-xs font-semibold text-muted-foreground", children: "Comunicazione Enti" }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo MPS/EOW" }), _jsxs(Select, { value: form.tipo_mps_eow, onValueChange: v => setForm(f => ({ ...f, tipo_mps_eow: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), _jsx(SelectItem, { value: "MPS", children: "MPS" }), _jsx(SelectItem, { value: "EOW", children: "EOW (End of Waste)" }), _jsx(SelectItem, { value: "ALTRO", children: "Altro" })] })] })] }), form.tipo_mps_eow === "ALTRO" && (_jsxs("div", { children: [_jsx(Label, { children: "Descrizione Tipo" }), _jsx(Input, { value: form.tipo_mps_eow_desc, onChange: e => setForm(f => ({ ...f, tipo_mps_eow_desc: e.target.value })), placeholder: "Descrizione..." })] }))] })), warehouses.length > 0 && (_jsxs("div", { children: [_jsx(Label, { children: "Magazzino Predefinito" }), _jsxs(Select, { value: form.default_warehouse_id, onValueChange: v => setForm(f => ({ ...f, default_warehouse_id: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Nessuno" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), warehouses.filter(w => w.active).map(w => _jsxs(SelectItem, { value: w.id, children: [w.code, " \u2014 ", w.description] }, w.id))] })] })] })), _jsx(Button, { onClick: handleSubmit, disabled: create.isPending || update.isPending || !form.codice_cer || !form.descrizione, className: "w-full", children: (create.isPending || update.isPending) ? "Salvataggio..." : editId ? "Aggiorna Articolo" : "Crea Articolo" })] })] }) })] }));
}
