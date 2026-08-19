import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { Info, ArrowDownCircle } from "lucide-react";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";
export function DragonScaricoCumulativo({ pendingCarichi, onSubmit, isLoading, onCancel }) {
    const { documents } = useDragonDocuments();
    const { causes } = useDragonCauses();
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [totalQuantity, setTotalQuantity] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [note, setNote] = useState("");
    const [operationCode, setOperationCode] = useState("");
    const causeScarico = causes.find(c => c.code === "SCARICO_USCITA_FORMULARIO");
    // Group carichi by CER
    const cerGroups = useMemo(() => {
        const map = new Map();
        for (const c of pendingCarichi) {
            const key = c.cer_code;
            if (!map.has(key))
                map.set(key, []);
            map.get(key).push(c);
        }
        return map;
    }, [pendingCarichi]);
    const [filterCer, setFilterCer] = useState("");
    const cerCodes = Array.from(cerGroups.keys()).sort();
    const filteredCarichi = useMemo(() => {
        let list = pendingCarichi.filter(c => c.movement_type === "CARICO" && c.status === "CONSOLIDATO");
        if (filterCer)
            list = list.filter(c => c.cer_code === filterCer);
        return list.sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());
    }, [pendingCarichi, filterCer]);
    const selectedTotal = useMemo(() => {
        return filteredCarichi.filter(c => selectedIds.has(c.id)).reduce((sum, c) => sum + Number(c.quantity), 0);
    }, [filteredCarichi, selectedIds]);
    const toggleId = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const selectAll = () => {
        if (selectedIds.size === filteredCarichi.length) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(filteredCarichi.map(c => c.id)));
        }
    };
    // FIFO allocation
    const computeAllocations = () => {
        const qty = parseFloat(totalQuantity);
        if (!qty || qty <= 0)
            return [];
        const sorted = filteredCarichi
            .filter(c => selectedIds.has(c.id))
            .sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());
        const allocations = [];
        let remaining = qty;
        for (const c of sorted) {
            if (remaining <= 0)
                break;
            const alloc = Math.min(remaining, Number(c.quantity));
            allocations.push({ in_movement_id: c.id, allocated_quantity: alloc });
            remaining -= alloc;
        }
        return allocations;
    };
    const allocations = computeAllocations();
    const firstSelected = filteredCarichi.find(c => selectedIds.has(c.id));
    const qty = parseFloat(totalQuantity || "0");
    const handleSubmit = async () => {
        if (!causeScarico || !firstSelected || allocations.length === 0)
            return;
        await onSubmit({
            scarico: {
                cause_id: causeScarico.id,
                item_id: firstSelected.item_id,
                cer_code: firstSelected.cer_code,
                description_snapshot: firstSelected.description_snapshot,
                quantity: qty,
                unit_of_measure: firstSelected.unit_of_measure,
                movement_date: new Date().toISOString().split("T")[0],
                recording_date: new Date().toISOString().split("T")[0],
                movement_type: "SCARICO",
                sign: "MINUS",
                source_context: "UL",
                linked_document_id: documentId || null,
                physical_state: firstSelected.physical_state,
                hp_codes: firstSelected.hp_codes || [],
                note: note || null,
                operation_code: operationCode || null,
                weight_status: "DEFINITIVO",
                status: "BOZZA",
            },
            allocations,
        });
    };
    return (_jsxs("div", { className: "space-y-5 mt-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 border border-border/20 rounded-lg p-3", children: [_jsx(Info, { className: "h-4 w-4 shrink-0" }), _jsx("p", { children: "Seleziona i carichi pendenti da scaricare. Il sistema alloca le quantit\u00E0 in ordine FIFO (dal pi\u00F9 vecchio)." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Filtra per CER" }), _jsxs(Select, { value: filterCer, onValueChange: setFilterCer, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Tutti i CER" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Tutti" }), cerCodes.map(cer => (_jsx(SelectItem, { value: cer, children: cer }, cer)))] })] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { className: "w-10", children: _jsx(Checkbox, { checked: selectedIds.size === filteredCarichi.length && filteredCarichi.length > 0, onCheckedChange: selectAll }) }), _jsx(TableHead, { className: "w-16", children: "N\u00B0" }), _jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "CER" }), _jsx(TableHead, { children: "Cantiere" }), _jsx(TableHead, { className: "text-right", children: "Quantit\u00E0" })] }) }), _jsx(TableBody, { children: filteredCarichi.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-8 text-muted-foreground", children: "Nessun carico consolidato disponibile" }) })) : (filteredCarichi.map(c => (_jsxs(TableRow, { className: `border-border/10 cursor-pointer ${selectedIds.has(c.id) ? "bg-primary/5" : ""}`, onClick: () => toggleId(c.id), children: [_jsx(TableCell, { children: _jsx(Checkbox, { checked: selectedIds.has(c.id) }) }), _jsx(TableCell, { className: "font-mono text-xs", children: c.movement_number }), _jsx(TableCell, { className: "text-sm", children: new Date(c.movement_date).toLocaleDateString("it-IT") }), _jsx(TableCell, { className: "font-mono text-sm", children: c.cer_code }), _jsx(TableCell, { className: "text-xs", children: c.source_site?.name || "U.L." }), _jsxs(TableCell, { className: "text-right font-mono", children: [Number(c.quantity).toLocaleString("it-IT"), " ", c.unit_of_measure] })] }, c.id)))) })] }) }), selectedIds.size > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-muted/20 border border-border/20 rounded-lg p-3 flex items-center justify-between", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: [selectedIds.size, " carichi selezionati"] }), _jsxs("span", { className: "font-mono font-bold", children: [selectedTotal.toLocaleString("it-IT"), " kg disponibili"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 da scaricare *" }), _jsx(Input, { type: "number", step: "0.01", min: "0", max: selectedTotal, value: totalQuantity, onChange: e => setTotalQuantity(e.target.value), placeholder: "0.00" }), qty > selectedTotal && (_jsxs("p", { className: "text-xs text-destructive mt-1", children: ["Quantit\u00E0 superiore alla disponibilit\u00E0 (", selectedTotal.toLocaleString("it-IT"), " kg)"] }))] }), _jsxs("div", { children: [_jsx(Label, { children: "FIR / Documento" }), _jsxs(Select, { value: documentId, onValueChange: setDocumentId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Opzionale..." }) }), _jsx(SelectContent, { children: documents.filter(d => d.document_type === "FIR").map(d => (_jsx(SelectItem, { value: d.id, children: d.number || d.id.slice(0, 8) }, d.id))) })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Operazione (R/D)" }), _jsxs(Select, { value: operationCode, onValueChange: setOperationCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona operazione..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), TUTTI_CODICI_OPERAZIONE.map(op => (_jsxs(SelectItem, { value: op.codice, children: [op.codice, " \u2014 ", op.descrizione] }, op.codice)))] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: note, onChange: e => setNote(e.target.value), rows: 2 })] }), allocations.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-muted-foreground", children: "Allocazione FIFO" }), allocations.map((a, i) => {
                                const src = filteredCarichi.find(c => c.id === a.in_movement_id);
                                return (_jsxs("div", { className: "flex items-center gap-2 text-xs bg-muted/20 rounded-md px-3 py-1.5", children: [_jsx(ArrowDownCircle, { className: "h-3.5 w-3.5 text-rose-400" }), _jsxs("span", { className: "font-mono", children: ["Mov #", src?.movement_number] }), _jsxs("span", { className: "text-muted-foreground", children: ["(", new Date(src?.movement_date || "").toLocaleDateString("it-IT"), ")"] }), _jsxs("span", { className: "ml-auto font-mono font-bold", children: [a.allocated_quantity.toLocaleString("it-IT"), " kg"] })] }, i));
                            })] }))] })), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx(Button, { variant: "outline", onClick: onCancel, children: "Annulla" }), _jsx(Button, { className: "ml-auto", disabled: isLoading || allocations.length === 0 || qty > selectedTotal || qty <= 0, onClick: handleSubmit, children: isLoading ? "Salvataggio..." : "Registra Scarico Cumulativo" })] })] }));
}
