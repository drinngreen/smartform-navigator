import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformBatches } from "@/hooks/dragon/useDragonTransforms";
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
import { Plus, Play, XCircle, Scissors, AlertTriangle, Trash2, ArrowDown, ArrowUp, Equal } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const statusColors: Record<string, string> = {
  BOZZA: "bg-yellow-500/20 text-yellow-300",
  CONFERMATA: "bg-emerald-500/20 text-emerald-300",
  ANNULLATA: "bg-rose-500/20 text-rose-300",
};

interface OutputRow {
  item_id: string;
  quantity: string;
}

export default function DragonCerniteBatchPage() {
  const { batches, isLoading } = useDragonTransformBatches();
  const { items } = useDragonItems();
  const { causes } = useDragonCauses();
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Form state
  const [inputItemId, setInputItemId] = useState("");
  const [inputQuantity, setInputQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [outputRows, setOutputRows] = useState<OutputRow[]>([{ item_id: "", quantity: "" }]);

  const inputItem = items.find(i => i.id === inputItemId);
  const inputQty = parseFloat(inputQuantity) || 0;

  const totalOutput = useMemo(() =>
    outputRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0),
    [outputRows]
  );
  const difference = inputQty - totalOutput;

  const activeItems = items.filter(i => i.attivo);
  // Exclude input item from output choices
  const outputItemOptions = activeItems.filter(i => i.id !== inputItemId);

  const addOutputRow = () => setOutputRows(r => [...r, { item_id: "", quantity: "" }]);
  const removeOutputRow = (idx: number) => setOutputRows(r => r.filter((_, i) => i !== idx));
  const updateOutputRow = (idx: number, field: keyof OutputRow, value: string) =>
    setOutputRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const isFormValid = inputItemId && inputQty > 0 && outputRows.every(r => r.item_id && parseFloat(r.quantity) > 0) && outputRows.length > 0;

  const resetForm = () => {
    setInputItemId("");
    setInputQuantity("");
    setNotes("");
    setOutputRows([{ item_id: "", quantity: "" }]);
  };

  // CREATE + CONFIRM in one step
  const handleCreate = async () => {
    if (!isFormValid) return;
    setCreating(true);
    try {
      const scaricoCause = causes.find(c => c.code === "SCARICO_PER_LAVORAZIONE");
      const caricoCause = causes.find(c => c.code === "CARICO_DA_LAVORAZIONE");
      if (!scaricoCause || !caricoCause) throw new Error("Causali SCARICO_PER_LAVORAZIONE / CARICO_DA_LAVORAZIONE non trovate");

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
          model_id: null as any, // no model
          source_item_id: inputItemId,
          input_quantity: inputQty,
          execution_date: today,
          notes: notes || null,
          status: "CONFERMATA" as any,
        } as any)
        .select()
        .single();
      if (batchErr) throw batchErr;
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
        } as any);

      // 2) For each output row, create movements
      for (const row of outputRows) {
        const outputItem = items.find(i => i.id === row.item_id);
        const outputQty = parseFloat(row.quantity) || 0;
        const isWaste = outputItem?.item_type === "WASTE_CER";
        const warehouseScope = (outputItem?.item_type === "MPS" || outputItem?.item_type === "MATERIAL") ? "MPS" : "WASTE";

        // Register movement (CARICO) for waste outputs
        let regMovId: string | null = null;
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
            } as any)
            .select()
            .single();
          if (caricoErr) throw caricoErr;
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
          } as any)
          .select()
          .single();
        if (stockErr) throw stockErr;

        // Batch output record
        await supabase.from("dragon_transform_batch_outputs").insert({
          batch_id: batchId,
          output_item_id: row.item_id,
          output_quantity: outputQty,
          warehouse_scope: warehouseScope,
          generated_register_movement_id: regMovId,
          generated_stock_movement_id: stockMov.id,
        } as any);
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
        } as any,
        performed_by: user?.id,
        reason: "Cernita confermata",
      } as any);

      qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-audit"] });
      toast.success("Cernita confermata — movimenti generati");
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  // CANCEL BATCH (inverse movements)
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
      } as any);

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
          } as any);
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
        } as any);
      }

      await supabase
        .from("dragon_transform_batches")
        .update({ status: "ANNULLATA" as any, updated_at: new Date().toISOString() } as any)
        .eq("id", batchId);

      await supabase.from("dragon_audit_logs").insert({
        entity_type: "transform_batch",
        entity_id: batchId,
        action_type: "CANCEL",
        before_state: { status: "CONFERMATA" } as any,
        after_state: { status: "ANNULLATA" } as any,
        performed_by: user?.id,
        reason: "Annullamento cernita con movimenti inversi",
      } as any);

      qc.invalidateQueries({ queryKey: ["dragon-transform-batches"] });
      qc.invalidateQueries({ queryKey: ["dragon-register"] });
      qc.invalidateQueries({ queryKey: ["dragon-stock"] });
      qc.invalidateQueries({ queryKey: ["dragon-audit"] });
      toast.success("Cernita annullata — movimenti inversi creati");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <MNAdminLayout title="Cernite" subtitle="Dragon — Smontaggio materiali in componenti">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><Scissors className="h-4 w-4 inline mr-1" />{batches.length} cernite totali</p>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Nuova Cernita</Button>
        </div>

        {/* Existing batches table */}
        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Data</TableHead>
                <TableHead>Input CER</TableHead>
                <TableHead className="text-right">Kg Input</TableHead>
                <TableHead className="text-right">Kg Output</TableHead>
                <TableHead>Componenti</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : batches.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessuna cernita eseguita</TableCell></TableRow>
              ) : (
                batches.map((b) => {
                  const outputsArr = (b.outputs as any[]) || [];
                  const totalOut = outputsArr.reduce((s, o) => s + (Number(o.output_quantity) || 0), 0);
                  return (
                    <TableRow key={b.id} className="border-border/10">
                      <TableCell className="text-sm">{new Date(b.execution_date).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell className="font-mono text-sm">{(b.source_item as any)?.codice_cer || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{Number(b.input_quantity).toLocaleString("it-IT")} kg</TableCell>
                      <TableCell className="text-right font-mono">{totalOut.toLocaleString("it-IT")} kg</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {outputsArr.map((o, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {(o.output_item as any)?.codice_cer || "?"} ({Number(o.output_quantity).toLocaleString("it-IT")} kg)
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[b.status] || ""}>{b.status}</Badge></TableCell>
                      <TableCell>
                        {b.status === "CONFERMATA" && (
                          <Button size="sm" variant="outline" className="text-rose-400" disabled={cancelling === b.id} onClick={() => handleCancel(b.id)}>
                            <XCircle className="h-3 w-3 mr-1" />{cancelling === b.id ? "..." : "Annulla"}
                          </Button>
                        )}
                        {b.status === "ANNULLATA" && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Annullata</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Cernita Sheet */}
      <Sheet open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Nuova Cernita — Distribuzione Materiali</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-4">

            {/* INPUT SECTION */}
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                <ArrowDown className="h-4 w-4" /> MATERIALE IN INGRESSO (da smontare)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Articolo / CER *</Label>
                  <Select value={inputItemId} onValueChange={setInputItemId}>
                    <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
                    <SelectContent>
                      {activeItems.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.codice_cer} — {i.descrizione}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantità (kg) *</Label>
                  <Input type="number" step="0.01" value={inputQuantity} onChange={e => setInputQuantity(e.target.value)} placeholder="0.00" className="font-mono" />
                </div>
              </div>
              {inputItem && (
                <p className="text-xs text-muted-foreground">
                  Tipo: <Badge variant="outline" className="text-xs">{inputItem.item_type}</Badge>
                  {inputItem.pericoloso && <Badge variant="outline" className="text-xs ml-1 text-amber-400">⚠ Pericoloso</Badge>}
                </p>
              )}
            </div>

            {/* OUTPUT SECTION — Distribution table */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <ArrowUp className="h-4 w-4" /> COMPONENTI IN USCITA (distribuisci i kg)
                </div>
                <Button size="sm" variant="outline" onClick={addOutputRow}><Plus className="h-3 w-3 mr-1" /> Riga</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Articolo / CER</TableHead>
                    <TableHead className="text-right w-32">Kg</TableHead>
                    <TableHead className="text-right w-20">%</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outputRows.map((row, idx) => {
                    const rowQty = parseFloat(row.quantity) || 0;
                    const pct = inputQty > 0 ? ((rowQty / inputQty) * 100).toFixed(1) : "0.0";
                    const rowItem = items.find(i => i.id === row.item_id);
                    return (
                      <TableRow key={idx} className="border-border/10">
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Select value={row.item_id} onValueChange={v => updateOutputRow(idx, "item_id", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                            <SelectContent>
                              {outputItemOptions.map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.codice_cer} — {i.descrizione} [{i.item_type}]</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.quantity}
                            onChange={e => updateOutputRow(idx, "quantity", e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-right font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">{pct}%</TableCell>
                        <TableCell>
                          {outputRows.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400" onClick={() => removeOutputRow(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* TOTALS */}
            <div className="p-4 rounded-xl border border-border/30 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Equal className="h-4 w-4" /> RIEPILOGO
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Kg Ingresso</p>
                  <p className="text-lg font-mono font-bold text-red-400">{inputQty.toLocaleString("it-IT")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kg Uscita Totale</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">{totalOutput.toLocaleString("it-IT")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Differenza</p>
                  <p className={`text-lg font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-400" : difference > 0 ? "text-amber-400" : "text-rose-400"}`}>
                    {difference > 0 ? "+" : ""}{difference.toLocaleString("it-IT")} kg
                  </p>
                </div>
              </div>
              {difference < -0.01 && (
                <p className="text-xs text-rose-400 text-center">⚠ L'uscita supera l'ingresso — controlla le quantità</p>
              )}
              {difference > 0.01 && inputQty > 0 && (
                <p className="text-xs text-amber-400 text-center">ℹ Restano {difference.toLocaleString("it-IT")} kg non assegnati (scarto/calo)</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Note</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note opzionali..." />
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !isFormValid}
              className="w-full"
            >
              {creating ? "Conferma in corso..." : "Conferma Cernita e Genera Movimenti"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
