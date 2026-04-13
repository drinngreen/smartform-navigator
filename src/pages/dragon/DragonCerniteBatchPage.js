import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformBatches } from "@/hooks/dragon/useDragonTransforms";
import { useDragonTransformModels } from "@/hooks/dragon/useDragonTransforms";
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
import { Plus, Play, XCircle, Scissors, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
const statusColors = {
    BOZZA: "bg-yellow-500/20 text-yellow-300",
    CONFERMATA: "bg-emerald-500/20 text-emerald-300",
    ANNULLATA: "bg-rose-500/20 text-rose-300",
};
export default function DragonCerniteBatchPage() {
    const { batches, isLoading, createBatch } = useDragonTransformBatches();
    const { models } = useDragonTransformModels();
    const { items } = useDragonItems();
    const { causes } = useDragonCauses();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ model_id: "", input_quantity: "", notes: "" });
    const [confirming, setConfirming] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const selectedModel = models.find(m => m.id === form.model_id);
    const handleCreate = async () => {
        if (!form.model_id || !form.input_quantity)
            return;
        setCreating(true);
        try {
            const model = models.find(m => m.id === form.model_id);
            if (!model)
                throw new Error("Modello non trovato");
            await createBatch.mutateAsync({
                model_id: form.model_id,
                source_item_id: model.input_item_id,
                input_quantity: parseFloat(form.input_quantity),
                notes: form.notes || undefined,
            });
            setShowCreate(false);
            setForm({ model_id: "", input_quantity: "", notes: "" });
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setCreating(false);
        }
    };
    // CONFIRM BATCH: Creates register + stock movements per the plan
    const handleConfirm = async (batchId) => {
        setConfirming(batchId);
        try {
            const batch = batches.find(b => b.id === batchId);
            if (!batch)
                throw new Error("Batch non trovato");
            if (batch.status !== "BOZZA")
                throw new Error("Solo batch in BOZZA possono essere confermati");
            const model = models.find(m => m.id === batch.model_id);
            if (!model || !model.outputs?.length)
                throw new Error("Modello senza output definiti");
            // Find causes
            const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
            const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
            if (!scaricoCause || !caricoCause)
                throw new Error("Causali SCARICO_PER_LAVORAZIONE / CARICO_DA_LAVORAZIONE non trovate");
            // Find a register
            const { data: registers } = await supabase
                .from("dragon_registers")
                .select("id")
                .eq("company_id", companyId)
                .eq("active", true)
                .limit(1);
            const registerId = registers?.[0]?.id || null;
            const today = new Date().toISOString().split("T")[0];
            const sourceItem = items.find(i => i.id === batch.source_item_id);
            // 1) SCARICO input (register movement)
            const { data: scaricoMov, error: scaricoErr } = await supabase
                .from("dragon_register_movements")
                .insert({
                company_id: companyId,
                register_id: registerId,
                movement_date: today,
                recording_date: today,
                item_id: batch.source_item_id,
                cer_code: sourceItem?.codice_cer || "",
                description_snapshot: sourceItem?.descrizione,
                movement_type: "SCARICO",
                cause_id: scaricoCause.id,
                quantity: batch.input_quantity,
                unit_of_measure: sourceItem?.unita_misura_default || "kg",
                sign: "MINUS",
                source_context: "UL",
                weight_status: "DEFINITIVO",
                status: "CONSOLIDATO",
                source_transform_batch_id: batchId,
                created_by: user?.id,
            })
                .select()
                .single();
            if (scaricoErr)
                throw scaricoErr;
            // 2) For each model output, create movements
            for (const modelOutput of model.outputs || []) {
                const outputItem = items.find(i => i.id === modelOutput.output_item_id);
                const outputQty = modelOutput.quantity_mode === "PERCENT"
                    ? (batch.input_quantity * modelOutput.quantity_value / 100)
                    : modelOutput.quantity_value;
                // Register movement (CARICO) for WASTE_CER outputs
                let regMovId = null;
                if (modelOutput.output_type === "WASTE_CER") {
                    const { data: caricoMov, error: caricoErr } = await supabase
                        .from("dragon_register_movements")
                        .insert({
                        company_id: companyId,
                        register_id: registerId,
                        movement_date: today,
                        recording_date: today,
                        item_id: modelOutput.output_item_id,
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
                // Stock movement for MPS/MATERIAL outputs (or all outputs go to stock)
                const warehouseScope = (modelOutput.output_type === "MPS" || modelOutput.output_type === "MATERIAL") ? "MPS" : "WASTE";
                const { data: stockMov, error: stockErr } = await supabase
                    .from("dragon_stock_movements")
                    .insert({
                    company_id: companyId,
                    item_id: modelOutput.output_item_id,
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
                // Insert batch output record
                await supabase.from("dragon_transform_batch_outputs").insert({
                    batch_id: batchId,
                    output_item_id: modelOutput.output_item_id,
                    output_quantity: outputQty,
                    warehouse_scope: warehouseScope,
                    generated_register_movement_id: regMovId,
                    generated_stock_movement_id: stockMov.id,
                });
            }
            // Update batch status to CONFERMATA
            await supabase
                .from("dragon_transform_batches")
                .update({ status: "CONFERMATA", updated_at: new Date().toISOString() })
                .eq("id", batchId);
            // Audit log
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "transform_batch",
                entity_id: batchId,
                action_type: "CONFIRM",
                after_state: { model: model.code, input_qty: batch.input_quantity, outputs: model.outputs?.length },
                performed_by: user?.id,
                reason: "Conferma batch cernita",
            });
            qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Batch confermato — movimenti generati");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setConfirming(null);
        }
    };
    // CANCEL BATCH: Create inverse movements (no deletes)
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
            // Inverse of SCARICO input → CARICO (re-add input)
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
                annotations: "Annullamento batch cernita",
                created_by: user?.id,
            });
            // Inverse of each output
            for (const output of batch.outputs || []) {
                const outputItem = items.find(i => i.id === output.output_item_id);
                const warehouseScope = output.warehouse_scope;
                // SCARICO (remove output from register if it was WASTE)
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
                        annotations: "Annullamento batch cernita",
                        created_by: user?.id,
                    });
                }
                // Inverse stock movement
                await supabase.from("dragon_stock_movements").insert({
                    company_id: companyId,
                    item_id: output.output_item_id,
                    movement_date: today,
                    cause_id: scaricoCause.id,
                    quantity: output.output_quantity,
                    sign: "MINUS",
                    warehouse_scope: warehouseScope,
                    source_transform_batch_id: batchId,
                    note: "Annullamento batch cernita",
                    created_by: user?.id,
                });
            }
            // Mark batch as ANNULLATA
            await supabase
                .from("dragon_transform_batches")
                .update({ status: "ANNULLATA", updated_at: new Date().toISOString() })
                .eq("id", batchId);
            // Audit log
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "transform_batch",
                entity_id: batchId,
                action_type: "CANCEL",
                before_state: { status: "CONFERMATA" },
                after_state: { status: "ANNULLATA" },
                performed_by: user?.id,
                reason: "Annullamento batch cernita con movimenti inversi",
            });
            qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Batch annullato — movimenti inversi creati");
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setCancelling(null);
        }
    };
    return (_jsxs(MNAdminLayout, { title: "Cernite & Lavorazioni", subtitle: "Dragon Rifiuti 2 \u2014 Batch di trasformazione", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: "text-sm text-muted-foreground", children: [_jsx(Scissors, { className: "h-4 w-4 inline mr-1" }), batches.length, " batch totali"] }), _jsxs(Button, { size: "sm", onClick: () => setShowCreate(true), children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), " Nuovo Batch"] })] }), _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "Modello" }), _jsx(TableHead, { children: "Input CER" }), _jsx(TableHead, { className: "text-right", children: "Qty Input" }), _jsx(TableHead, { children: "Output" }), _jsx(TableHead, { children: "Stato" }), _jsx(TableHead, { children: "Azioni" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : batches.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Nessun batch creato" }) })) : (batches.map((b) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-sm", children: new Date(b.execution_date).toLocaleDateString("it-IT") }), _jsx(TableCell, { className: "text-sm font-medium", children: b.model?.name || "—" }), _jsx(TableCell, { className: "font-mono text-sm", children: b.source_item?.codice_cer || "—" }), _jsxs(TableCell, { className: "text-right font-mono", children: [Number(b.input_quantity).toLocaleString("it-IT"), " kg"] }), _jsx(TableCell, { children: _jsxs(Badge, { variant: "outline", children: [b.outputs?.length || 0, " output"] }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: statusColors[b.status] || "", children: b.status }) }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-1", children: [b.status === "BOZZA" && (_jsxs(Button, { size: "sm", variant: "outline", disabled: confirming === b.id, onClick: () => handleConfirm(b.id), children: [_jsx(Play, { className: "h-3 w-3 mr-1" }), confirming === b.id ? "..." : "Conferma"] })), b.status === "CONFERMATA" && (_jsxs(Button, { size: "sm", variant: "outline", className: "text-rose-400", disabled: cancelling === b.id, onClick: () => handleCancel(b.id), children: [_jsx(XCircle, { className: "h-3 w-3 mr-1" }), cancelling === b.id ? "..." : "Annulla"] })), b.status === "ANNULLATA" && (_jsxs("span", { className: "text-xs text-muted-foreground flex items-center gap-1", children: [_jsx(AlertTriangle, { className: "h-3 w-3" }), " Annullato"] }))] }) })] }, b.id)))) })] }) })] }), _jsx(Sheet, { open: showCreate, onOpenChange: setShowCreate, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuovo Batch di Cernita" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Modello di Cernita *" }), _jsxs(Select, { value: form.model_id, onValueChange: v => setForm(f => ({ ...f, model_id: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona modello..." }) }), _jsx(SelectContent, { children: models.filter(m => m.active).map(m => (_jsxs(SelectItem, { value: m.id, children: [m.code, " \u2014 ", m.name] }, m.id))) })] })] }), selectedModel && (_jsxs("div", { className: "p-3 bg-muted/30 rounded-lg text-sm space-y-1", children: [_jsxs("p", { children: [_jsx("strong", { children: "Input:" }), " ", selectedModel.input_item?.codice_cer, " \u2014 ", selectedModel.input_item?.descrizione] }), _jsxs("p", { children: [_jsx("strong", { children: "Output definiti:" }), " ", selectedModel.outputs?.length || 0] }), selectedModel.outputs?.map((o, i) => (_jsxs("p", { className: "text-xs text-muted-foreground ml-2", children: ["\u2192 ", o.output_item?.codice_cer, " (", o.quantity_mode === "PERCENT" ? `${o.quantity_value}%` : `${o.quantity_value} kg`, ") [", o.output_type, "]"] }, i)))] })), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 Input (kg) *" }), _jsx(Input, { type: "number", step: "0.01", value: form.input_quantity, onChange: e => setForm(f => ({ ...f, input_quantity: e.target.value })), placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Input, { value: form.notes, onChange: e => setForm(f => ({ ...f, notes: e.target.value })), placeholder: "Note opzionali..." })] }), _jsx(Button, { onClick: handleCreate, disabled: creating || !form.model_id || !form.input_quantity, className: "w-full", children: creating ? "Creazione..." : "Crea Batch (Bozza)" })] })] }) })] }));
}
