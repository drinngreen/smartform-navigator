import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformBatches, useDragonTransformModels } from "@/hooks/dragon/useDragonTransforms";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, XCircle, Scissors, AlertTriangle, Trash2, ArrowDown, ArrowUp, Equal } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
const statusColors = {
    BOZZA: "bg-yellow-500/20 text-yellow-300",
    CONFERMATA: "bg-emerald-500/20 text-emerald-300",
    ANNULLATA: "bg-rose-500/20 text-rose-300",
};
export default function DragonCerniteBatchPage() {
    const { batches, isLoading } = useDragonTransformBatches();
    const { models } = useDragonTransformModels();
    const { items } = useDragonItems();
    const { causes } = useDragonCauses();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [confirming, setConfirming] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [appliedModelId, setAppliedModelId] = useState(null);
    // Form state
    const [inputItemId, setInputItemId] = useState("");
    const [inputQuantity, setInputQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const [outputRows, setOutputRows] = useState([{ item_id: "", quantity: "" }]);
    const inputItem = items.find(i => i.id === inputItemId);
    const inputQty = parseFloat(inputQuantity) || 0;
    // Find matching models for the selected input item
    const matchingModels = useMemo(() => models.filter(m => m.active && m.input_item_id === inputItemId), [models, inputItemId]);
    const totalOutput = useMemo(() => outputRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0), [outputRows]);
    const difference = inputQty - totalOutput;
    const activeItems = items.filter(i => i.attivo);
    const outputItemOptions = activeItems.filter(i => i.id !== inputItemId);
    // Apply a transform model: pre-fill output rows with the model's recipe
    const applyModel = (modelId) => {
        const model = models.find(m => m.id === modelId);
        if (!model || !model.outputs)
            return;
        const newRows = model.outputs.map((o) => {
            let qty = 0;
            if (o.quantity_mode === "PERCENT" && inputQty > 0) {
                qty = (o.quantity_value / 100) * inputQty;
            }
            else if (o.quantity_mode === "FIXED") {
                qty = o.quantity_value;
            }
            return { item_id: o.output_item_id, quantity: qty > 0 ? qty.toFixed(2) : "" };
        });
        setOutputRows(newRows.length > 0 ? newRows : [{ item_id: "", quantity: "" }]);
        setAppliedModelId(modelId);
    };
    // Auto-open from URL params (e.g. from Magazzino "Cernita" button or Registro "Avvia Lavorazione")
    useEffect(() => {
        const paramItemId = searchParams.get("item_id");
        const paramQty = searchParams.get("qty");
        if (paramItemId && items.length > 0) {
            setInputItemId(paramItemId);
            if (paramQty)
                setInputQuantity(paramQty);
            setShowCreate(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, items.length]);
    const addOutputRow = () => setOutputRows(r => [...r, { item_id: "", quantity: "" }]);
    const removeOutputRow = (idx) => setOutputRows(r => r.filter((_, i) => i !== idx));
    const updateOutputRow = (idx, field, value) => setOutputRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    const isFormValid = inputItemId && inputQty > 0 && outputRows.every(r => r.item_id && parseFloat(r.quantity) > 0) && outputRows.length > 0;
    const resetForm = () => {
        setInputItemId("");
        setInputQuantity("");
        setNotes("");
        setOutputRows([{ item_id: "", quantity: "" }]);
    };
    // CREATE + CONFIRM in one step
    const handleCreate = async () => {
        if (!isFormValid)
            return;
        setCreating(true);
        try {
            const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
            const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
            if (!scaricoCause || !caricoCause)
                throw new Error("Causali SCARICO_PER_LAVORAZIONE / CARICO_DA_LAVORAZIONE non trovate");
            const { data: registers } = await supabase
                .from("dragon_registers")
                .select("id")
                .eq("company_id", companyId)
                .eq("active", true)
                .limit(1);
            const registerId = registers?.[0]?.id || null;
            const today = new Date().toISOString().split("T")[0];
            const sourceItem = items.find(i => i.id === inputItemId);
            // Create batch record (CONFERMATA directly)
            const { data: batch, error: batchErr } = await supabase
                .from("dragon_transform_batches")
                .insert({
                company_id: companyId,
                created_by: user?.id,
                model_id: null, // no model
                source_item_id: inputItemId,
                input_quantity: inputQty,
                execution_date: today,
                notes: notes || null,
                status: "CONFERMATA",
            })
                .select()
                .single();
            if (batchErr)
                throw batchErr;
            const batchId = batch.id;
            // 1) SCARICO input (register movement)
            await supabase
                .from("dragon_register_movements")
                .insert({
                company_id: companyId,
                register_id: registerId,
                movement_date: today,
                recording_date: today,
                item_id: inputItemId,
                cer_code: sourceItem?.codice_cer || "",
                description_snapshot: sourceItem?.descrizione,
                movement_type: "SCARICO",
                cause_id: scaricoCause.id,
                quantity: inputQty,
                unit_of_measure: sourceItem?.unita_misura_default || "kg",
                sign: "MINUS",
                source_context: "UL",
                weight_status: "DEFINITIVO",
                status: "CONSOLIDATO",
                source_transform_batch_id: batchId,
                created_by: user?.id,
            });
            // 2) For each output row, create movements
            for (const row of outputRows) {
                const outputItem = items.find(i => i.id === row.item_id);
                const outputQty = parseFloat(row.quantity) || 0;
                const isWaste = outputItem?.item_type === "WASTE_CER";
                const warehouseScope = (outputItem?.item_type === "MPS" || outputItem?.item_type === "MATERIAL") ? "MPS" : "WASTE";
                // Register movement (CARICO) for waste outputs
                let regMovId = null;
                if (isWaste) {
                    const { data: caricoMov, error: caricoErr } = await supabase
                        .from("dragon_register_movements")
                        .insert({
                        company_id: companyId,
                        register_id: registerId,
                        movement_date: today,
                        recording_date: today,
                        item_id: row.item_id,
                        cer_code: outputItem?.codice_cer || "",
                        description_snapshot: outputItem?.descrizione,
                        movement_type: "CARICO",
                        cause_id: caricoCause.id,
                        quantity: outputQty,
                        unit_of_measure: outputItem?.unita_misura_default || "kg",
                        sign: "PLUS",
                        source_context: "UL",
                        weight_status: "DEFINITIVO",
                        status: "CONSOLIDATO",
                        source_transform_batch_id: batchId,
                        created_by: user?.id,
                    })
                        .select()
                        .single();
                    if (caricoErr)
                        throw caricoErr;
                    regMovId = caricoMov.id;
                }
                // Stock movement
                const { data: stockMov, error: stockErr } = await supabase
                    .from("dragon_stock_movements")
                    .insert({
                    company_id: companyId,
                    item_id: row.item_id,
                    movement_date: today,
                    cause_id: caricoCause.id,
                    quantity: outputQty,
                    sign: "PLUS",
                    warehouse_scope: warehouseScope,
                    source_transform_batch_id: batchId,
                    created_by: user?.id,
                })
                    .select()
                    .single();
                if (stockErr)
                    throw stockErr;
                // Batch output record
                await supabase.from("dragon_transform_batch_outputs").insert({
                    batch_id: batchId,
                    output_item_id: row.item_id,
                    output_quantity: outputQty,
                    warehouse_scope: warehouseScope,
                    generated_register_movement_id: regMovId,
                    generated_stock_movement_id: stockMov.id,
                });
            }
            // Audit log
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "transform_batch",
                entity_id: batchId,
                action_type: "CONFIRM",
                after_state: {
                    input: sourceItem?.codice_cer,
                    input_qty: inputQty,
                    outputs: outputRows.map(r => ({
                        item: items.find(i => i.id === r.item_id)?.codice_cer,
                        qty: parseFloat(r.quantity),
                    })),
                },
                performed_by: user?.id,
                reason: "Cernita confermata",
            });
            qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Cernita confermata — movimenti generati");
            setShowCreate(false);
            resetForm();
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setCreating(false);
        }
    };
    // CANCEL BATCH (inverse movements)
    const handleCancel = async (batchId) => {
        setCancelling(batchId);
        try {
            const batch = batches.find(b => b.id === batchId);
            if (!batch)
                throw new Error("Batch non trovato");
            if (batch.status !== "CONFERMATA")
                throw new Error("Solo batch CONFERMATI possono essere annullati");
            const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
            const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
            if (!scaricoCause || !caricoCause)
                throw new Error("Causali non trovate");
            const today = new Date().toISOString().split("T")[0];
            const sourceItem = items.find(i => i.id === batch.source_item_id);
            const { data: registers } = await supabase
                .from("dragon_registers")
                .select("id")
                .eq("company_id", companyId)
                .eq("active", true)
                .limit(1);
            const registerId = registers?.[0]?.id || null;
            // Inverse SCARICO → CARICO (re-add input)
            await supabase.from("dragon_register_movements").insert({
                company_id: companyId,
                register_id: registerId,
                movement_date: today,
                recording_date: today,
                item_id: batch.source_item_id,
                cer_code: sourceItem?.codice_cer || "",
                description_snapshot: `ANNULLAMENTO CERNITA: ${sourceItem?.descrizione}`,
                movement_type: "CARICO",
                cause_id: caricoCause.id,
                quantity: batch.input_quantity,
                unit_of_measure: sourceItem?.unita_misura_default || "kg",
                sign: "PLUS",
                source_context: "UL",
                weight_status: "DEFINITIVO",
                status: "CONSOLIDATO",
                source_transform_batch_id: batchId,
                annotations: "Annullamento cernita",
                created_by: user?.id,
            });
            // Inverse each output
            for (const output of batch.outputs || []) {
                const outputItem = items.find(i => i.id === output.output_item_id);
                if (output.generated_register_movement_id) {
                    await supabase.from("dragon_register_movements").insert({
                        company_id: companyId,
                        register_id: registerId,
                        movement_date: today,
                        recording_date: today,
                        item_id: output.output_item_id,
                        cer_code: outputItem?.codice_cer || "",
                        description_snapshot: `ANNULLAMENTO CERNITA: ${outputItem?.descrizione}`,
                        movement_type: "SCARICO",
                        cause_id: scaricoCause.id,
                        quantity: output.output_quantity,
                        unit_of_measure: outputItem?.unita_misura_default || "kg",
                        sign: "MINUS",
                        source_context: "UL",
                        weight_status: "DEFINITIVO",
                        status: "CONSOLIDATO",
                        source_transform_batch_id: batchId,
                        annotations: "Annullamento cernita",
                        created_by: user?.id,
                    });
                }
                await supabase.from("dragon_stock_movements").insert({
                    company_id: companyId,
                    item_id: output.output_item_id,
                    movement_date: today,
                    cause_id: scaricoCause.id,
                    quantity: output.output_quantity,
                    sign: "MINUS",
                    warehouse_scope: output.warehouse_scope,
                    source_transform_batch_id: batchId,
                    note: "Annullamento cernita",
                    created_by: user?.id,
                });
            }
            await supabase
                .from("dragon_transform_batches")
                .update({ status: "ANNULLATA", updated_at: new Date().toISOString() })
                .eq("id", batchId);
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "transform_batch",
                entity_id: batchId,
                action_type: "CANCEL",
                before_state: { status: "CONFERMATA" },
                after_state: { status: "ANNULLATA" },
                performed_by: user?.id,
                reason: "Annullamento cernita con movimenti inversi",
            });
            qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Cernita annullata — movimenti inversi creati");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setCancelling(null);
        }
    };
    return (_jsxs(MNAdminLayout, { title: "Cernite", subtitle: "Dragon \u2014 Smontaggio materiali in componenti", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(DragonBackButton, {}), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(Scissors, { className: "h-4 w-4 inline mr-1" }), batches.length, " cernite totali"] }), _jsxs(Button, { size: "sm", onClick: () => setShowCreate(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuova Cernita"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "Input CER" }), _jsx(TableHead, { className: "text-right", children: "Kg Input" }), _jsx(TableHead, { className: "text-right", children: "Kg Output" }), _jsx(TableHead, { children: "Componenti" }), _jsx(TableHead, { children: "Stato" }), _jsx(TableHead, { children: "Azioni" })] }) }), _jsxs(TableBody, { children: [isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : batches.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Nessuna cernita eseguita" }) })) : (batches.map((b) => {
                                            const outputsArr = b.outputs || [];
                                            const totalOut = outputsArr.reduce((s, o) => s + (Number(o.output_quantity) || 0), 0);
                                            return (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-sm", children: new Date(b.execution_date).toLocaleDateString("it-IT") }), _jsx(TableCell, { className: "font-mono text-sm", children: b.source_item?.codice_cer || "—" }), _jsxs(TableCell, { className: "text-right font-mono", children: [Number(b.input_quantity).toLocaleString("it-IT"), " kg"] }), _jsxs(TableCell, { className: "text-right font-mono", children: [totalOut.toLocaleString("it-IT"), " kg"] }), _jsx(TableCell, { children: _jsx("div", { className: "flex flex-wrap gap-1", children: outputsArr.map((o, i) => (_jsxs(Badge, { variant: "outline", className: "text-xs", children: [o.output_item?.codice_cer || "?", " (", Number(o.output_quantity).toLocaleString("it-IT"), " kg)"] }, i))) }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: statusColors[b.status] || "", children: b.status }) }), _jsxs(TableCell, { children: [b.status === "CONFERMATA" && (_jsxs(Button, { size: "sm", variant: "outline", className: "text-rose-400", disabled: cancelling === b.id, onClick: () => handleCancel(b.id), children: [_jsx(XCircle, { className: "h-3 w-3 mr-1" }), cancelling === b.id ? "..." : "Annulla"] })), b.status === "ANNULLATA" && (_jsxs("span", { className: "text-xs text-muted-foreground flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Annullata"] }))] })] }, b.id));
                                        })), matchingModels.length > 0 && (_jsxs("div", { className: "p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-blue-400", children: "\uD83D\uDCCB Modelli di lavorazione disponibili:" }), _jsx("div", { className: "flex flex-wrap gap-2", children: matchingModels.map(m => (_jsxs(Button, { size: "sm", variant: appliedModelId === m.id ? "default" : "outline", className: "text-xs", onClick: () => applyModel(m.id), children: [m.name, appliedModelId === m.id && " ✓"] }, m.id))) }), appliedModelId && (_jsx("p", { className: "text-xs text-muted-foreground", children: "Modello applicato \u2014 le quantit\u00E0 sono pre-calcolate. Puoi modificarle manualmente." }))] }))] })] }) })] }), _jsx(Sheet, { open: showCreate, onOpenChange: (open) => { setShowCreate(open); if (!open)
                    resetForm(); }, children: _jsxs(SheetContent, { className: "w-full sm:max-w-2xl overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuova Cernita \u2014 Distribuzione Materiali" }) }), _jsxs("div", { className: "space-y-5 mt-4", children: [_jsxs("div", { className: "p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-red-400", children: [_jsx(ArrowDown, { className: "h-4 w-4" }), " MATERIALE IN INGRESSO (da smontare)"] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Articolo / CER *" }), _jsxs(Select, { value: inputItemId, onValueChange: setInputItemId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: activeItems.map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione] }, i.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", step: "0.01", value: inputQuantity, onChange: e => setInputQuantity(e.target.value), placeholder: "0.00", className: "font-mono" })] })] }), inputItem && (_jsxs("p", { className: "text-xs text-muted-foreground", children: ["Tipo: ", _jsx(Badge, { variant: "outline", className: "text-xs", children: inputItem.item_type }), inputItem.pericoloso && _jsx(Badge, { variant: "outline", className: "text-xs ml-1 text-amber-400", children: "\u26A0 Pericoloso" })] }))] }), _jsxs("div", { className: "p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-emerald-400", children: [_jsx(ArrowUp, { className: "h-4 w-4" }), " COMPONENTI IN USCITA (distribuisci i kg)"] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: addOutputRow, children: [_jsx(Plus, { className: "h-3 w-3 mr-1" }), " Riga"] })] }), _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { className: "w-8", children: "#" }), _jsx(TableHead, { children: "Articolo / CER" }), _jsx(TableHead, { className: "text-right w-32", children: "Kg" }), _jsx(TableHead, { className: "text-right w-20", children: "%" }), _jsx(TableHead, { className: "w-10" })] }) }), _jsx(TableBody, { children: outputRows.map((row, idx) => {
                                                        const rowQty = parseFloat(row.quantity) || 0;
                                                        const pct = inputQty > 0 ? ((rowQty / inputQty) * 100).toFixed(1) : "0.0";
                                                        const rowItem = items.find(i => i.id === row.item_id);
                                                        return (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-xs text-muted-foreground", children: idx + 1 }), _jsx(TableCell, { children: _jsxs(Select, { value: row.item_id, onValueChange: v => updateOutputRow(idx, "item_id", v), children: [_jsx(SelectTrigger, { className: "h-8 text-xs", children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsx(SelectContent, { children: outputItemOptions.map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione, " [", i.item_type, "]"] }, i.id))) })] }) }), _jsx(TableCell, { children: _jsx(Input, { type: "number", step: "0.01", value: row.quantity, onChange: e => updateOutputRow(idx, "quantity", e.target.value), placeholder: "0.00", className: "h-8 text-right font-mono text-xs" }) }), _jsxs(TableCell, { className: "text-right text-xs text-muted-foreground font-mono", children: [pct, "%"] }), _jsx(TableCell, { children: outputRows.length > 1 && (_jsx(Button, { size: "icon", variant: "ghost", className: "h-6 w-6 text-rose-400", onClick: () => removeOutputRow(idx), children: _jsx(Trash2, { className: "h-3 w-3" }) })) })] }, idx));
                                                    }) })] })] }), _jsxs("div", { className: "p-4 rounded-xl border border-border/30 bg-muted/20 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Equal, { className: "h-4 w-4" }), " RIEPILOGO"] }), _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Kg Ingresso" }), _jsx("p", { className: "text-lg font-mono font-bold text-red-400", children: inputQty.toLocaleString("it-IT") })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Kg Uscita Totale" }), _jsx("p", { className: "text-lg font-mono font-bold text-emerald-400", children: totalOutput.toLocaleString("it-IT") })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Differenza" }), _jsxs("p", { className: `text-lg font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-400" : difference > 0 ? "text-amber-400" : "text-rose-400"}`, children: [difference > 0 ? "+" : "", difference.toLocaleString("it-IT"), " kg"] })] })] }), difference < -0.01 && (_jsx("p", { className: "text-xs text-rose-400 text-center", children: "\u26A0 L'uscita supera l'ingresso \u2014 controlla le quantit\u00E0" })), difference > 0.01 && inputQty > 0 && (_jsxs("p", { className: "text-xs text-amber-400 text-center", children: ["\u2139 Restano ", difference.toLocaleString("it-IT"), " kg non assegnati (scarto/calo)"] }))] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Input, { value: notes, onChange: e => setNotes(e.target.value), placeholder: "Note opzionali..." })] }), _jsx(Button, { onClick: handleCreate, disabled: creating || !isFormValid, className: "w-full", children: creating ? "Conferma in corso..." : "Conferma Cernita e Genera Movimenti" })] })] }) })] }));
}
