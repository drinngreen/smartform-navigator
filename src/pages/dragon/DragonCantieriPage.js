import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MapPin } from "lucide-react";
const activityLabels = {
    ND: "Non definita",
    MANUTENZIONE: "Manutenzione",
    ASSISTENZA_SANITARIA: "Assistenza sanitaria",
    CANTIERE_TEMPORANEO_MOBILE: "Cantiere temporaneo mobile",
    BONIFICA_AMIANTO: "Bonifica amianto",
};
export default function DragonCantieriPage() {
    const { sites, isLoading, create, update } = useDragonSites();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ site_code: "", name: "", address: "", municipality: "", province: "", notes: "", activity_type: "ND" });
    const handleSubmit = async () => {
        if (!form.site_code || !form.name)
            return;
        await create.mutateAsync(form);
        setShowForm(false);
        setForm({ site_code: "", name: "", address: "", municipality: "", province: "", notes: "", activity_type: "ND" });
    };
    return (_jsxs(MNAdminLayout, { title: "Cantieri / Luoghi Produzione", subtitle: "Dragon Rifiuti 2 \u2014 Siti produzione fuori U.L.", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(MapPin, { className: "h-4 w-4 inline mr-1" }), sites.length, " cantieri registrati"] }), _jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Cantiere"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Nome" }), _jsx(TableHead, { children: "Indirizzo" }), _jsx(TableHead, { children: "Comune" }), _jsx(TableHead, { children: "Prov." }), _jsx(TableHead, { children: "Attivit\u00E0" }), _jsx(TableHead, { children: "Stato" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : sites.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Nessun cantiere registrato" }) })) : (sites.map((s) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "font-mono text-sm", children: s.site_code }), _jsx(TableCell, { className: "font-medium", children: s.name }), _jsx(TableCell, { className: "text-sm", children: s.address || "—" }), _jsx(TableCell, { className: "text-sm", children: s.municipality || "—" }), _jsx(TableCell, { className: "text-sm", children: s.province || "—" }), _jsx(TableCell, { className: "text-xs", children: activityLabels[s.activity_type] || s.activity_type }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: s.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground", children: s.active ? "Attivo" : "Inattivo" }) })] }, s.id)))) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Cantiere" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice *" }), _jsx(Input, { value: form.site_code, onChange: e => setForm(f => ({ ...f, site_code: e.target.value })), placeholder: "CANT-001" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Nome *" }), _jsx(Input, { value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "Cantiere Via Roma" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Indirizzo" }), _jsx(Input, { value: form.address, onChange: e => setForm(f => ({ ...f, address: e.target.value })) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Comune" }), _jsx(Input, { value: form.municipality, onChange: e => setForm(f => ({ ...f, municipality: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Provincia" }), _jsx(Input, { value: form.province, onChange: e => setForm(f => ({ ...f, province: e.target.value })), placeholder: "TO" })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Attivit\u00E0" }), _jsxs(Select, { value: form.activity_type, onValueChange: v => setForm(f => ({ ...f, activity_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: Object.entries(activityLabels).map(([k, v]) => _jsx(SelectItem, { value: k, children: v }, k)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: form.notes, onChange: e => setForm(f => ({ ...f, notes: e.target.value })), rows: 3 })] }), _jsx(Button, { onClick: handleSubmit, disabled: create.isPending || !form.site_code || !form.name, className: "w-full", children: create.isPending ? "Salvataggio..." : "Crea Cantiere" })] })] }) })] }));
}
