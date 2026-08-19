import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonWarehouses } from "@/hooks/dragon/useDragonWarehouses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil } from "lucide-react";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
const emptyForm = { code: "", description: "", has_cer: false, has_mps: false, limit_mps_eow: "", active: true };
export default function DragonMagazziniPage() {
    const { warehouses, isLoading, create, update } = useDragonWarehouses();
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const openNew = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (wh) => {
        setEditId(wh.id);
        setForm({ code: wh.code, description: wh.description, has_cer: wh.has_cer, has_mps: wh.has_mps, limit_mps_eow: wh.limit_mps_eow?.toString() ?? "", active: wh.active });
        setShowForm(true);
    };
    const handleSubmit = async () => {
        if (!form.code)
            return;
        const payload = { code: form.code, description: form.description, has_cer: form.has_cer, has_mps: form.has_mps, limit_mps_eow: form.limit_mps_eow ? parseFloat(form.limit_mps_eow) : null, active: form.active };
        if (editId) {
            await update.mutateAsync({ id: editId, ...payload });
        }
        else {
            await create.mutateAsync(payload);
        }
        setShowForm(false);
    };
    return (_jsxs(MNAdminLayout, { title: "Archivio Magazzini", subtitle: "Dragon \u2014 Gestione aree di stoccaggio", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(DragonBackButton, {}), _jsxs("div", { className: "flex flex-wrap justify-between items-center gap-3", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Configura i magazzini fisici per CER e MPS/EOW" }), _jsxs(Button, { size: "sm", onClick: openNew, children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Magazzino"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Descrizione" }), _jsx(TableHead, { children: "CER" }), _jsx(TableHead, { children: "MPS" }), _jsx(TableHead, { children: "Limite MPS/EOW" }), _jsx(TableHead, { children: "Stato" }), _jsx(TableHead, {})] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : warehouses.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Nessun magazzino configurato" }) })) : (warehouses.map((wh) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "font-mono text-sm font-semibold", children: wh.code }), _jsx(TableCell, { className: "text-sm", children: wh.description }), _jsx(TableCell, { children: wh.has_cer ? _jsx(Badge, { variant: "outline", className: "bg-amber-500/20 text-amber-300", children: "CER" }) : "—" }), _jsx(TableCell, { children: wh.has_mps ? _jsx(Badge, { variant: "outline", className: "bg-blue-500/20 text-blue-300", children: "MPS" }) : "—" }), _jsx(TableCell, { className: "text-sm font-mono", children: wh.limit_mps_eow != null ? `${wh.limit_mps_eow} kg` : "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: wh.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground", children: wh.active ? "Attivo" : "Inattivo" }) }), _jsx(TableCell, { children: _jsx(Button, { size: "icon", variant: "ghost", onClick: () => openEdit(wh), children: _jsx(Pencil, { className: "h-4 w-4" }) }) })] }, wh.id)))) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: editId ? "Modifica Magazzino" : "Nuovo Magazzino" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice *" }), _jsx(Input, { value: form.code, onChange: e => setForm(f => ({ ...f, code: e.target.value })), placeholder: "MAG01" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione" }), _jsx(Input, { value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })), placeholder: "Magazzino principale MPS" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: form.has_cer, onCheckedChange: v => setForm(f => ({ ...f, has_cer: v })) }), _jsx(Label, { children: "Contiene CER (Rifiuti)" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: form.has_mps, onCheckedChange: v => setForm(f => ({ ...f, has_mps: v })) }), _jsx(Label, { children: "Contiene MPS/EOW" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Limite Giacenza MPS/EOW (kg)" }), _jsx(Input, { type: "number", step: "0.01", value: form.limit_mps_eow, onChange: e => setForm(f => ({ ...f, limit_mps_eow: e.target.value })), placeholder: "Opzionale" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: form.active, onCheckedChange: v => setForm(f => ({ ...f, active: v })) }), _jsx(Label, { children: "Attivo" })] }), _jsx(Button, { onClick: handleSubmit, disabled: create.isPending || update.isPending || !form.code, className: "w-full", children: (create.isPending || update.isPending) ? "Salvataggio..." : editId ? "Aggiorna" : "Crea Magazzino" })] })] }) })] }));
}
