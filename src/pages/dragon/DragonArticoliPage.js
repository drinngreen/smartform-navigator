import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
const typeLabels = { WASTE_CER: "Rifiuto CER", MPS: "MPS", MATERIAL: "Materiale" };
const typeColors = { WASTE_CER: "bg-amber-500/20 text-amber-300", MPS: "bg-blue-500/20 text-blue-300", MATERIAL: "bg-violet-500/20 text-violet-300" };
export default function DragonArticoliPage() {
    const { items, isLoading, create } = useDragonItems();
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState("");
    const [form, setForm] = useState({ codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER", unita_misura_default: "kg" });
    const filtered = items.filter(i => i.codice_cer.includes(filter) || i.descrizione.toLowerCase().includes(filter.toLowerCase()));
    const handleSubmit = async () => {
        if (!form.codice_cer || !form.descrizione)
            return;
        await create.mutateAsync(form);
        setShowForm(false);
        setForm({ codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER", unita_misura_default: "kg" });
    };
    return (_jsxs(MNAdminLayout, { title: "Articoli / CER / MPS", subtitle: "Dragon Rifiuti 2 \u2014 Anagrafica articoli ambientali", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap justify-between items-center gap-3", children: [_jsx(Input, { placeholder: "Cerca codice o descrizione...", className: "w-64 h-9", value: filter, onChange: e => setFilter(e.target.value) }), _jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Articolo"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Descrizione" }), _jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { children: "U.M." }), _jsx(TableHead, { children: "HP" }), _jsx(TableHead, { children: "Stato" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-12 text-muted-foreground", children: "Nessun articolo trovato" }) })) : (filtered.map((item) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "font-mono text-sm", children: item.codice_cer }), _jsx(TableCell, { className: "text-sm", children: item.descrizione }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: typeColors[item.item_type], children: typeLabels[item.item_type] }) }), _jsx(TableCell, { className: "text-sm", children: item.unita_misura_default }), _jsx(TableCell, { children: item.pericoloso ? _jsx(Badge, { variant: "outline", className: "bg-rose-500/20 text-rose-300", children: "\u26A0 Pericoloso" }) : "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: item.attivo ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground", children: item.attivo ? "Attivo" : "Inattivo" }) })] }, item.id)))) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Articolo" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice CER *" }), _jsx(Input, { value: form.codice_cer, onChange: e => setForm(f => ({ ...f, codice_cer: e.target.value })), placeholder: "170904" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione *" }), _jsx(Input, { value: form.descrizione, onChange: e => setForm(f => ({ ...f, descrizione: e.target.value })), placeholder: "Rifiuti misti dell'attivit\u00E0 di costruzione..." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo" }), _jsxs(Select, { value: form.item_type, onValueChange: v => setForm(f => ({ ...f, item_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: Object.entries(typeLabels).map(([k, v]) => _jsx(SelectItem, { value: k, children: v }, k)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Unit\u00E0 di Misura" }), _jsx(Input, { value: form.unita_misura_default, onChange: e => setForm(f => ({ ...f, unita_misura_default: e.target.value })) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: form.pericoloso, onCheckedChange: v => setForm(f => ({ ...f, pericoloso: v })) }), _jsx(Label, { children: "Pericoloso" })] }), _jsx(Button, { onClick: handleSubmit, disabled: create.isPending || !form.codice_cer || !form.descrizione, className: "w-full", children: create.isPending ? "Salvataggio..." : "Crea Articolo" })] })] }) })] }));
}
