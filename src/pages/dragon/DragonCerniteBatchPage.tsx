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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, XCircle, Scissors, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
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
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const selectedModel = models.find(m => m.id === form.model_id);

  const handleCreate = async () => {
    if (!form.model_id || !form.input_quantity) return;
    setCreating(true);
    try {
      const model = models.find(m => m.id === form.model_id);
      if (!model) throw new Error("Modello non trovato");
      await createBatch.mutateAsync({
        model_id: form.model_id,
        source_item_id: model.input_item_id,
        input_quantity: parseFloat(form.input_quantity),
        notes: form.notes || undefined,
      });
      setShowCreate(false);
      setForm({ model_id: "", input_quantity: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  // CONFIRM BATCH: Creates register + stock movements per the plan
  const handleConfirm = async (batchId: string) => {
    setConfirming(batchId);
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) throw new Error("Batch non trovato");
      if (batch.status !== "BOZZA") throw new Error("Solo batch in BOZZA possono essere confermati");

      const model = models.find(m => m.id === batch.model_id);
      if (!model || !model.outputs?.length) throw new Error("Modello senza output definiti");

      // Find causes
      const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
      const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
      if (!scaricoCause || !caricoCause) throw new Error("Causali SCARICO_PER_LAVORAZIONE / CARICO_DA_LAVORAZIONE non trovate");

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
        } as any)
        .select()
        .single();
      if (scaricoErr) throw scaricoErr;

      // 2) For each model output, create movements
      for (const modelOutput of model.outputs || []) {
        const outputItem = items.find(i => i.id === modelOutput.output_item_id);
        const outputQty = modelOutput.quantity_mode === "PERCENT"
          ? (batch.input_quantity * modelOutput.quantity_value / 100)
          : modelOutput.quantity_value;

        // Register movement (CARICO) for WASTE_CER outputs
        let regMovId: string | null = null;
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
            } as any)
            .select()
            .single();
          if (caricoErr) throw caricoErr;
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
          } as any)
          .select()
          .single();
        if (stockErr) throw stockErr;

        // Insert batch output record
        await supabase.from("dragon_transform_batch_outputs").insert({
          batch_id: batchId,
          output_item_id: modelOutput.output_item_id,
          output_quantity: outputQty,
          warehouse_scope: warehouseScope,
          generated_register_movement_id: regMovId,
          generated_stock_movement_id: stockMov.id,
        } as any);
      }

      // Update batch status to CONFERMATA
      await supabase
        .from("dragon_transform_batches")
        .update({ status: "CONFERMATA" as any, updated_at: new Date().toISOString() } as any)
        .eq("id", batchId);

      // Audit log
      await supabase.from("dragon_audit_logs").insert({
        entity_type: "transform_batch",
        entity_id: batchId,
        action_type: "CONFIRM",
        after_state: { model: model.code, input_qty: batch.input_quantity, outputs: model.outputs?.length } as any,
        performed_by: user?.id,
        reason: "Conferma batch cernita",
      } as any);

      qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-audit"] });
      toast.success("Batch confermato — movimenti generati");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirming(null);
    }
  };

  // CANCEL BATCH: Create inverse movements (no deletes)
  const handleCancel = async (batchId: string) => {
    setCancelling(batchId);
    try {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) throw new Error("Batch non trovato");
      if (batch.status !== "CONFERMATA") throw new Error("Solo batch CONFERMATI possono essere annullati");

      const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
      const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
      if (!scaricoCause || !caricoCause) throw new Error("Causali non trovate");

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
      } as any);

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
          } as any);
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
        } as any);
      }

      // Mark batch as ANNULLATA
      await supabase
        .from("dragon_transform_batches")
        .update({ status: "ANNULLATA" as any, updated_at: new Date().toISOString() } as any)
        .eq("id", batchId);

      // Audit log
      await supabase.from("dragon_audit_logs").insert({
        entity_type: "transform_batch",
        entity_id: batchId,
        action_type: "CANCEL",
        before_state: { status: "CONFERMATA" } as any,
        after_state: { status: "ANNULLATA" } as any,
        performed_by: user?.id,
        reason: "Annullamento batch cernita con movimenti inversi",
      } as any);

      qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-audit"] });
      toast.success("Batch annullato — movimenti inversi creati");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <MNAdminLayout title="Cernite & Lavorazioni" subtitle="Dragon Rifiuti 2 — Batch di trasformazione">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><Scissors className="h-4 w-4 inline mr-1" />{batches.length} batch totali</p>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Batch</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Data</TableHead>
                <TableHead>Modello</TableHead>
                <TableHead>Input CER</TableHead>
                <TableHead className="text-right">Qty Input</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : batches.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessun batch creato</TableCell></TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.id} className="border-border/10">
                    <TableCell className="text-sm">{new Date(b.execution_date).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell className="text-sm font-medium">{(b.model as any)?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{(b.source_item as any)?.codice_cer || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(b.input_quantity).toLocaleString("it-IT")} kg</TableCell>
                    <TableCell><Badge variant="outline">{(b.outputs as any[])?.length || 0} output</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[b.status] || ""}>{b.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {b.status === "BOZZA" && (
                          <Button size="sm" variant="outline" disabled={confirming === b.id} onClick={() => handleConfirm(b.id)}>
                            <Play className="h-3 w-3 mr-1" />{confirming === b.id ? "..." : "Conferma"}
                          </Button>
                        )}
                        {b.status === "CONFERMATA" && (
                          <Button size="sm" variant="outline" className="text-rose-400" disabled={cancelling === b.id} onClick={() => handleCancel(b.id)}>
                            <XCircle className="h-3 w-3 mr-1" />{cancelling === b.id ? "..." : "Annulla"}
                          </Button>
                        )}
                        {b.status === "ANNULLATA" && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Annullato</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Batch Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Batch di Cernita</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Modello di Cernita *</Label>
              <Select value={form.model_id} onValueChange={v => setForm(f => ({ ...f, model_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona modello..." /></SelectTrigger>
                <SelectContent>
                  {models.filter(m => m.active).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedModel && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                <p><strong>Input:</strong> {(selectedModel.input_item as any)?.codice_cer} — {(selectedModel.input_item as any)?.descrizione}</p>
                <p><strong>Output definiti:</strong> {selectedModel.outputs?.length || 0}</p>
                {selectedModel.outputs?.map((o, i) => (
                  <p key={i} className="text-xs text-muted-foreground ml-2">
                    → {(o.output_item as any)?.codice_cer} ({o.quantity_mode === "PERCENT" ? `${o.quantity_value}%` : `${o.quantity_value} kg`}) [{o.output_type}]
                  </p>
                ))}
              </div>
            )}
            <div>
              <Label>Quantità Input (kg) *</Label>
              <Input type="number" step="0.01" value={form.input_quantity} onChange={e => setForm(f => ({ ...f, input_quantity: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Note opzionali..." />
            </div>
            <Button onClick={handleCreate} disabled={creating || !form.model_id || !form.input_quantity} className="w-full">
              {creating ? "Creazione..." : "Crea Batch (Bozza)"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
