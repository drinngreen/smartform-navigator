import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useDragonWarehouses } from "@/hooks/dragon/useDragonWarehouses";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
export function DragonNewMovementForm({ open, onOpenChange }) {
    const { items } = useDragonItems();
    const { causes } = useDragonCauses();
    const { warehouses } = useDragonWarehouses();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const stockCauses = causes.filter(c => c.scope === "STOCK" || c.scope === "BOTH");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [causeId, setCauseId] = useState("");
    const [warehouseId, setWarehouseId] = useState("");
    const [operationCode, setOperationCode] = useState("");
    const [lines, setLines] = useState([{ item_id: "", quantity: "", note: "" }]);
    const [submitting, setSubmitting] = useState(false);
    const addLine = () => setLines(l => [...l, { item_id: "", quantity: "", note: "" }]);
    const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) => setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
    const handleSubmit = async () => {
        if (!causeId || lines.every(l => !l.item_id || !l.quantity)) {
            toast.error("Compila causale e almeno una riga");
            return;
        }
        setSubmitting(true);
        try {
            const cause = causes.find(c => c.id === causeId);
            if (!cause)
                throw new Error("Causale non trovata");
            const sign = cause.stock_sign === "MINUS" ? "MINUS" : "PLUS";
            const validLines = lines.filter(l => l.item_id && l.quantity && parseFloat(l.quantity) > 0);
            const inserts = validLines.map(l => {
                const item = items.find(it => it.id === l.item_id);
                const ws = item?.item_type === "WASTE_CER" ? "WASTE" : "MPS";
                return {
                    company_id: companyId,
                    item_id: l.item_id,
                    movement_date: date,
                    cause_id: causeId,
                    quantity: parseFloat(l.quantity),
                    sign,
                    warehouse_scope: ws,
                    warehouse_id: warehouseId || null,
                    created_by: user?.id,
                    note: l.note || null,
                };
            });
            const { error } = await supabase.from("dragon_stock_movements").insert(inserts);
            if (error)
                throw error;
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            toast.success(`${validLines.length} moviment${validLines.length > 1 ? "i" : "o"} registrat${validLines.length > 1 ? "i" : "o"}`);
            onOpenChange(false);
            setLines([{ item_id: "", quantity: "", note: "" }]);
            setCauseId("");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(Sheet, { open: open, onOpenChange: onOpenChange, children: _jsxs(SheetContent, { className: "w-full sm:max-w-lg overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Movimento Magazzino" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Data Registrazione *" }), _jsx(Input, { type: "date", value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Causale *" }), _jsxs(Select, { value: causeId, onValueChange: setCauseId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona causale..." }) }), _jsx(SelectContent, { children: stockCauses.map(c => (_jsxs(SelectItem, { value: c.id, children: [c.code, " \u2014 ", c.name] }, c.id))) })] })] }), warehouses.length > 0 && (_jsxs("div", { children: [_jsx(Label, { children: "Magazzino" }), _jsxs(Select, { value: warehouseId, onValueChange: setWarehouseId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Tutti i magazzini" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno specifico" }), warehouses.filter(w => w.active).map(w => (_jsxs(SelectItem, { value: w.id, children: [w.code, " \u2014 ", w.description] }, w.id)))] })] })] })), _jsxs("div", { children: [_jsx(Label, { children: "Codice Operazione (R/D)" }), _jsxs(Select, { value: operationCode, onValueChange: setOperationCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona operazione..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), TUTTI_CODICI_OPERAZIONE.map(op => (_jsxs(SelectItem, { value: op.codice, children: [op.codice, " \u2014 ", op.descrizione] }, op.codice)))] })] })] }), _jsxs("div", { className: "border-t border-border/30 pt-3", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx(Label, { className: "text-sm font-semibold", children: "Righe Movimento" }), _jsxs(Button, { size: "sm", variant: "outline", onClick: addLine, children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Riga"] })] }), _jsx("div", { className: "space-y-3", children: lines.map((line, i) => (_jsxs("div", { className: "border border-border/20 rounded-lg p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs text-muted-foreground font-semibold", children: ["Riga ", i + 1] }), lines.length > 1 && (_jsx(Button, { size: "icon", variant: "ghost", className: "h-6 w-6", onClick: () => removeLine(i), children: _jsx(Trash2, { className: "h-3 w-3 text-rose-400" }) }))] }), _jsxs(Select, { value: line.item_id, onValueChange: v => updateLine(i, "item_id", v), children: [_jsx(SelectTrigger, { className: "h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Articolo..." }) }), _jsx(SelectContent, { children: items.filter(it => it.attivo).map(it => (_jsxs(SelectItem, { value: it.id, children: [it.codice_cer, " \u2014 ", it.descrizione] }, it.id))) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { type: "number", step: "0.01", className: "h-8 text-xs", placeholder: "Quantit\u00E0", value: line.quantity, onChange: e => updateLine(i, "quantity", e.target.value) }), _jsx(Input, { className: "h-8 text-xs", placeholder: "Note (opz.)", value: line.note, onChange: e => updateLine(i, "note", e.target.value) })] })] }, i))) })] }), _jsx(Button, { onClick: handleSubmit, disabled: submitting || !causeId, className: "w-full", children: submitting ? "Registrazione..." : "Registra Movimento" })] })] }) }));
}
