import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformModels } from "@/hooks/dragon/useDragonTransforms";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useMNContextStore } from "@/stores/mnContextStore";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
export default function DragonCerniteModelliPage() {
    const { models, isLoading, createModel } = useDragonTransformModels();
    const { items } = useDragonItems();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ code: "", name: "", input_item_id: "", description: "" });
    const [showOutputForm, setShowOutputForm] = useState(null);
    const [outputForm, setOutputForm] = useState({
        output_item_id: "",
        output_type: "WASTE_CER",
        quantity_mode: "PERCENT",
        quantity_value: "",
        warehouse_scope: "WASTE",
        notes: "",
    });
    const handleSubmit = async () => {
        if (!form.code || !form.name || !form.input_item_id)
            return;
        await createModel.mutateAsync(form);
        setShowForm(false);
        setForm({ code: "", name: "", input_item_id: "", description: "" });
    };
    const handleAddOutput = async () => {
        if (!showOutputForm || !outputForm.output_item_id || !outputForm.quantity_value)
            return;
        try {
            const { error } = await supabase.from("dragon_transform_model_outputs").insert({
                model_id: showOutputForm,
                output_item_id: outputForm.output_item_id,
                output_type: outputForm.output_type,
                quantity_mode: outputForm.quantity_mode,
                quantity_value: parseFloat(outputForm.quantity_value),
                warehouse_scope: outputForm.warehouse_scope,
                notes: outputForm.notes || null,
            });
            if (error)
                throw error;
            qc.invalidateQueries({ queryKey: ["dragon-transform-models"] });
            toast.success("Output aggiunto al modello");
            setShowOutputForm(null);
            setOutputForm({ output_item_id: "", output_type: "WASTE_CER", quantity_mode: "PERCENT", quantity_value: "", warehouse_scope: "WASTE", notes: "" });
        }
        catch (e) {
            toast.error(e.message);
        }
    };
    const handleDeleteOutput = async (outputId) => {
        const { error } = await supabase.from("dragon_transform_model_outputs").delete().eq("id", outputId);
        if (error) {
            toast.error(error.message);
            return;
        }
        qc.invalidateQueries({ queryKey: ["dragon-transform-models"] });
        toast.success("Output rimosso");
    };
    return (_jsxs(MNAdminLayout, { title: "Modelli di Cernita", subtitle: "Dragon Rifiuti 2 \u2014 Template lavorazioni e cernite", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(Scissors, { className: "h-4 w-4 inline mr-1" }), models.length, " modelli"] }), _jsxs(Button, { size: "sm", onClick: () => setShowForm(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Modello"] })] }), _jsx("div", { className: "space-y-4", children: isLoading ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Caricamento..." })) : models.length === 0 ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Nessun modello creato" })) : (models.map((m) => (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "font-mono text-sm text-muted-foreground mr-2", children: m.code }), _jsx("span", { className: "font-medium", children: m.name }), _jsx(Badge, { variant: "outline", className: `ml-2 ${m.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}`, children: m.active ? "Attivo" : "Inattivo" })] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => setShowOutputForm(m.id), children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Output"] })] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Input: ", _jsx("span", { className: "font-mono", children: m.input_item?.codice_cer }), " \u2014 ", m.input_item?.descrizione] }), m.outputs?.length > 0 && (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Output CER" }), _jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { children: "Quantit\u00E0" }), _jsx(TableHead, { children: "Ambito" }), _jsx(TableHead, {})] }) }), _jsx(TableBody, { children: m.outputs?.map((o) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsxs(TableCell, { className: "font-mono text-sm", children: [o.output_item?.codice_cer, " \u2014 ", o.output_item?.descrizione] }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: "text-xs", children: o.output_type }) }), _jsx(TableCell, { className: "font-mono", children: o.quantity_mode === "PERCENT" ? `${o.quantity_value}%` : `${o.quantity_value} kg` }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: o.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300", children: o.warehouse_scope }) }), _jsx(TableCell, { children: _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDeleteOutput(o.id), children: _jsx(Trash2, { className: "h-3 w-3 text-rose-400" }) }) })] }, o.id))) })] }))] }, m.id)))) })] }), _jsx(Sheet, { open: showForm, onOpenChange: setShowForm, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Modello di Cernita" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice *" }), _jsx(Input, { value: form.code, onChange: e => setForm(f => ({ ...f, code: e.target.value })), placeholder: "CERN-001" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Nome *" }), _jsx(Input, { value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), placeholder: "Cernita 170904" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Articolo Input *" }), _jsxs(Select, { value: form.input_item_id, onValueChange: v => setForm(f => ({ ...f, input_item_id: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo).map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione] }, i.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione" }), _jsx(Input, { value: form.description, onChange: e => setForm(f => ({ ...f, description: e.target.value })) })] }), _jsx(Button, { onClick: handleSubmit, disabled: createModel.isPending || !form.code || !form.name || !form.input_item_id, className: "w-full", children: createModel.isPending ? "Salvataggio..." : "Crea Modello" })] })] }) }), _jsx(Sheet, { open: !!showOutputForm, onOpenChange: () => setShowOutputForm(null), children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Aggiungi Output al Modello" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Articolo Output *" }), _jsxs(Select, { value: outputForm.output_item_id, onValueChange: v => setOutputForm(f => ({ ...f, output_item_id: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo).map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione] }, i.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Output" }), _jsxs(Select, { value: outputForm.output_type, onValueChange: (v) => setOutputForm(f => ({ ...f, output_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "WASTE_CER", children: "Rifiuto (WASTE_CER)" }), _jsx(SelectItem, { value: "MPS", children: "Materia Prima Secondaria (MPS)" }), _jsx(SelectItem, { value: "MATERIAL", children: "Materiale recuperato" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Modalit\u00E0 Quantit\u00E0" }), _jsxs(Select, { value: outputForm.quantity_mode, onValueChange: (v) => setOutputForm(f => ({ ...f, quantity_mode: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "PERCENT", children: "Percentuale (%)" }), _jsx(SelectItem, { value: "FIXED", children: "Quantit\u00E0 fissa (kg)" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: outputForm.quantity_mode === "PERCENT" ? "Percentuale *" : "Quantità (kg) *" }), _jsx(Input, { type: "number", step: "0.01", value: outputForm.quantity_value, onChange: e => setOutputForm(f => ({ ...f, quantity_value: e.target.value })), placeholder: outputForm.quantity_mode === "PERCENT" ? "Es: 30" : "Es: 500" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Ambito Magazzino" }), _jsxs(Select, { value: outputForm.warehouse_scope, onValueChange: (v) => setOutputForm(f => ({ ...f, warehouse_scope: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "WASTE", children: "Rifiuti (WASTE)" }), _jsx(SelectItem, { value: "MPS", children: "MPS / Materiali" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Input, { value: outputForm.notes, onChange: e => setOutputForm(f => ({ ...f, notes: e.target.value })) })] }), _jsx(Button, { onClick: handleAddOutput, disabled: !outputForm.output_item_id || !outputForm.quantity_value, className: "w-full", children: "Aggiungi Output" })] })] }) })] }));
}
