import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, FileText } from "lucide-react";
import { useState } from "react";
const docTypeLabels = { FIR: "FIR", DDT_IN: "DDT Entrata", DDT_OUT: "DDT Uscita", FORMULARIO_MODELLO: "Formulario", ALTRO: "Altro" };
export default function DragonDocumentiPage() {
    const { documents, isLoading, create } = useDragonDocuments();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ document_type: "FIR", number: "", document_date: new Date().toISOString().split("T")[0], notes: "" });
    const handleSubmit = async () => {
        if (!form.number)
            return;
        await create.mutateAsync(form);
        setShowForm(false);
        setForm({ document_type: "FIR", number: "", document_date: new Date().toISOString().split("T")[0], notes: "" });
    };
    return (_jsxs(MNAdminLayout, { title: "Documenti", subtitle: "Dragon Rifiuti 2 \u2014 Archivio FIR, DDT e documenti", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(FileText, { className: "h-4 w-4 inline mr-1" }), documents.length, " documenti"] }), _jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Documento"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { children: "Numero" }), _jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "Stato" }), _jsx(TableHead, { children: "Note" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : documents.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Nessun documento" }) })) : (documents.map((d) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { children: _jsx(Badge, { variant: "outline", children: docTypeLabels[d.document_type] || d.document_type }) }), _jsx(TableCell, { className: "font-mono text-sm", children: d.number || "—" }), _jsx(TableCell, { className: "text-sm", children: d.document_date ? new Date(d.document_date).toLocaleDateString("it-IT") : "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: "bg-emerald-500/20 text-emerald-300", children: d.status }) }), _jsx(TableCell, { className: "text-sm text-muted-foreground truncate max-w-[200px]", children: d.notes || "—" })] }, d.id)))) })] }) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Documento" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Tipo" }), _jsxs(Select, { value: form.document_type, onValueChange: v => setForm(f => ({ ...f, document_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: Object.entries(docTypeLabels).map(([k, v]) => _jsx(SelectItem, { value: k, children: v }, k)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Numero *" }), _jsx(Input, { value: form.number, onChange: e => setForm(f => ({ ...f, number: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Data" }), _jsx(Input, { type: "date", value: form.document_date, onChange: e => setForm(f => ({ ...f, document_date: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Input, { value: form.notes, onChange: e => setForm(f => ({ ...f, notes: e.target.value })) })] }), _jsx(Button, { onClick: handleSubmit, disabled: create.isPending || !form.number, className: "w-full", children: create.isPending ? "Salvataggio..." : "Crea Documento" })] })] }) })] }));
}
