import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformBatches, useDragonTransformModels } from "@/hooks/dragon/useDragonTransforms";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Play, XCircle, Scissors, AlertTriangle, Trash2, ArrowDown, ArrowUp, Equal, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { DragonCerSelector } from "@/components/dragon/DragonCerSelector";

const statusColors: Record<string, string> = {
  BOZZA: "bg-yellow-500/20 text-yellow-300",
  PENDENTE: "bg-orange-500/20 text-orange-300",
  CONFERMATA: "bg-emerald-500/20 text-emerald-300",
  ANNULLATA: "bg-rose-500/20 text-rose-300",
};

interface OutputRow {
  id: string;
  item_id: string;
  quantity: string;
  lot_code: string;
}

const createOutputRow = (): OutputRow => ({
  id: crypto.randomUUID(),
  item_id: "",
  quantity: "",
  lot_code: "",
});

export default function DragonCerniteBatchPage() {
  const { batches, isLoading, executeCernita, completeCernita, cancelCernita } = useDragonTransformBatches();
  const { models } = useDragonTransformModels();
  const { items } = useDragonItems();
  const { balances: wasteBalances } = useDragonStock("WASTE");
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [appliedModelId, setAppliedModelId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [confirmationMode, setConfirmationMode] = useState<"execute" | "deferred" | null>(null);

  // Form state
  const [inputItemId, setInputItemId] = useState("");
  const [inputQuantity, setInputQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [outputRows, setOutputRows] = useState<OutputRow[]>(() => [createOutputRow()]);

  const inputItem = items.find(i => i.id === inputItemId);
  const inputQty = parseFloat(inputQuantity) || 0;
  const availableQty = wasteBalances.find((balance) => balance.item_id === inputItemId)?.balance ?? 0;

  // Find matching models for the selected input item
  const matchingModels = useMemo(() =>
    models.filter(m => m.active && m.input_item_id === inputItemId),
    [models, inputItemId]
  );

  const totalOutput = useMemo(() =>
    outputRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0),
    [outputRows]
  );
  const difference = inputQty - totalOutput;

  // Apply a transform model: pre-fill output rows with the model's recipe
  const applyModel = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model || !model.outputs) return;
    const newRows: OutputRow[] = (model.outputs as any[]).map((o: any) => {
      let qty = 0;
      if (o.quantity_mode === "PERCENT" && inputQty > 0) {
        qty = (o.quantity_value / 100) * inputQty;
      } else if (o.quantity_mode === "FIXED") {
        qty = o.quantity_value;
      }
      return { id: crypto.randomUUID(), item_id: o.output_item_id, quantity: qty > 0 ? qty.toFixed(2) : "", lot_code: "" };
    });
    setOutputRows(newRows.length > 0 ? newRows : [createOutputRow()]);
    setAppliedModelId(modelId);
  };

  // Auto-open from URL params (e.g. from Magazzino "Cernita" button or Registro "Avvia Lavorazione")
  useEffect(() => {
    const paramItemId = searchParams.get("item_id");
    const paramQty = searchParams.get("qty");
    if (paramItemId && items.length > 0) {
      setInputItemId(paramItemId);
      if (paramQty) setInputQuantity(paramQty);
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, items.length]);

  const addOutputRow = () => setOutputRows(rows => [...rows, createOutputRow()]);
  const removeOutputRow = (rowId: string) => setOutputRows(rows => rows.filter(row => row.id !== rowId));
  const updateOutputRow = (rowId: string, field: keyof Omit<OutputRow, "id">, value: string) =>
    setOutputRows(rows => rows.map(row => row.id === rowId ? { ...row, [field]: value } : row));

  const hasEnoughStock = inputQty <= availableQty;
  const isFormValid = inputItemId && inputQty > 0 && hasEnoughStock && totalOutput <= inputQty && outputRows.every(r => r.item_id && parseFloat(r.quantity) > 0) && outputRows.length > 0;

  const resetForm = () => {
    setInputItemId("");
    setInputQuantity("");
    setNotes("");
    setOutputRows([createOutputRow()]);
    setAppliedModelId(null);
    setEditingBatchId(null);
    setConfirmationMode(null);
  };

  const serializeOutputs = () => outputRows.map((row) => ({
    item_id: row.item_id,
    quantity: Number(row.quantity),
    lot_code: row.lot_code.trim() || undefined,
  }));

  const requestConfirmation = (deferred = false) => {
    if (!inputItemId || inputQty <= 0 || (!deferred && !isFormValid)) return;
    setConfirmationMode(deferred ? "deferred" : "execute");
  };

  const handleCreate = async () => {
    if (!confirmationMode) return;
    const deferred = confirmationMode === "deferred";
    setCreating(true);
    try {
      if (editingBatchId) {
        await completeCernita.mutateAsync({ batchId: editingBatchId, outputs: serializeOutputs() });
        toast.success("Cernita pendente completata — lotti e movimenti generati");
      } else {
        await executeCernita.mutateAsync({
          source_item_id: inputItemId,
          input_quantity: inputQty,
          outputs: deferred ? [] : serializeOutputs(),
          model_id: appliedModelId,
          notes,
          deferred,
        });
        toast.success(deferred ? "Cernita pendente aperta — ingresso scaricato" : "Cernita confermata — lotti e movimenti generati");
      }
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
      await cancelCernita.mutateAsync(batchId);
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
                        {b.status === "PENDENTE" && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingBatchId(b.id);
                            setInputItemId(b.source_item_id);
                            setInputQuantity(String(b.input_quantity));
                            setNotes(b.notes || "");
                            setOutputRows([createOutputRow()]);
                            setShowCreate(true);
                          }}><Play className="h-3 w-3 mr-1" />Completa</Button>
                        )}
                        {(b.status === "CONFERMATA" || b.status === "PENDENTE") && (
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
              {/* Model suggestion */}
              {matchingModels.length > 0 && (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-2">
                  <p className="text-xs font-medium text-blue-400">📋 Modelli di lavorazione disponibili:</p>
                  <div className="flex flex-wrap gap-2">
                    {matchingModels.map(m => (
                      <Button
                        key={m.id}
                        size="sm"
                        variant={appliedModelId === m.id ? "default" : "outline"}
                        className="text-xs"
                        onClick={() => applyModel(m.id)}
                      >
                        {m.name}
                        {appliedModelId === m.id && " ✓"}
                      </Button>
                    ))}
                  </div>
                  {appliedModelId && (
                    <p className="text-xs text-muted-foreground">
                      Modello applicato — le quantità sono pre-calcolate. Puoi modificarle manualmente.
                    </p>
                  )}
                </div>
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
                  <DragonCerSelector value={inputItemId} onChange={setInputItemId} />
                </div>
                <div>
                  <Label>Quantità (kg) *</Label>
                  <Input type="number" step="0.01" value={inputQuantity} onChange={e => setInputQuantity(e.target.value)} placeholder="0.00" className="font-mono" />
                  {inputItem && (
                    <button
                      type="button"
                      onClick={() => setInputQuantity(String(availableQty))}
                      className="mt-1 text-[11px] underline text-muted-foreground hover:text-foreground"
                    >
                      Usa tutta la giacenza ({availableQty.toLocaleString("it-IT")} kg)
                    </button>
                  )}
                </div>

              </div>
              {inputItem && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Tipo: <Badge variant="outline" className="text-xs">{inputItem.item_type}</Badge></span>
                  {inputItem.pericoloso && <Badge variant="outline" className="text-xs text-amber-400">⚠ Pericoloso</Badge>}
                  <Badge variant="outline" className={availableQty > 0 ? "text-emerald-400" : "text-rose-400"}>
                    Disponibili per cernita: {availableQty.toLocaleString("it-IT")} kg
                  </Badge>
                </div>
              )}
              {inputItem && inputQty > availableQty && (
                <p className="text-xs font-medium text-rose-400">
                  Quantità non disponibile: richiesti {inputQty.toLocaleString("it-IT")} kg, disponibili {availableQty.toLocaleString("it-IT")} kg nel magazzino Dragon.
                </p>
              )}
            </div>

            {/* OUTPUT SECTION — Distribution table */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <ArrowUp className="h-4 w-4" /> COMPONENTI IN USCITA (distribuisci i kg)
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addOutputRow}><Plus className="h-3 w-3 mr-1" /> Riga</Button>
              </div>

              <div className="space-y-2">
                {outputRows.map((row, idx) => {
                  const rowQty = parseFloat(row.quantity) || 0;
                  const pct = inputQty > 0 ? ((rowQty / inputQty) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={row.id} className="rounded-lg border border-border/30 bg-background/40 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <DragonCerSelector value={row.item_id} onChange={v => updateOutputRow(row.id, "item_id", v)} placeholder="Seleziona output..." />
                        </div>
                        <Button type="button" size="icon" variant="destructive" className="h-9 w-9 shrink-0 p-0" onClick={() => removeOutputRow(row.id)} aria-label={`Elimina riga ${idx + 1}`} title="Elimina riga">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={e => updateOutputRow(row.id, "quantity", e.target.value)}
                          placeholder="Kg"
                          className="h-9 text-right font-mono"
                        />
                        <Input value={row.lot_code} onChange={e => updateOutputRow(row.id, "lot_code", e.target.value)} placeholder="Lotto" className="h-9" />
                        <span className="col-span-2 text-right font-mono text-xs text-muted-foreground sm:col-span-1">{pct}% dell'ingresso</span>
                      </div>
                    </div>
                  );
                })}
                {outputRows.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Nessuna riga — aggiungine una con "+ Riga"</p>
                )}
              </div>

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
                  <p className="text-xs text-muted-foreground">Calo peso</p>
                  <p className={`text-lg font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-emerald-400" : difference > 0 ? "text-amber-400" : "text-rose-400"}`}>
                    {difference > 0 ? "+" : ""}{difference.toLocaleString("it-IT")} kg
                  </p>
                </div>
              </div>
              {inputItem && inputQty > 0 && (
                <div className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-1 text-xs">
                  <p className="font-mono font-bold text-red-400">➖ VERRANNO TOLTI {inputQty.toLocaleString("it-IT")} kg da {inputItem.codice_cer} — {inputItem.descrizione}</p>
                  {!editingBatchId && outputRows.filter(r => r.item_id && parseFloat(r.quantity) > 0).map((r) => {
                    const it = items.find(i => i.id === r.item_id);
                    return (
                      <p key={r.id} className="font-mono font-bold text-emerald-400">➕ VERRANNO AGGIUNTI {(parseFloat(r.quantity) || 0).toLocaleString("it-IT")} kg su {it?.codice_cer ?? "?"} — {it?.descrizione ?? ""}</p>
                    );
                  })}
                </div>
              )}
              {difference < -0.01 && (
                <p className="text-xs text-rose-400 text-center">⚠ L'uscita supera l'ingresso — controlla le quantità</p>
              )}
              {difference > 0.01 && inputQty > 0 && (
                <p className="text-xs text-amber-400 text-center">ℹ Calo peso di {difference.toLocaleString("it-IT")} kg (umidità, polveri, scarti dispersi): consentito, viene registrato sulla lavorazione</p>
              )}
              <p className="text-[11px] text-muted-foreground text-center border-t border-border/30 pt-2">
                Movimento interno all'impianto: nessun FIR, trasportatore o soggetto terzo richiesto. La provenienza dei materiali ottenuti è lo scarico di lavorazione del CER padre.
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label>Note</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note opzionali..." />
            </div>

            {confirmationMode ? (
              <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Conferma definitiva
                </div>
                <p className="text-sm">
                  Verranno tolti <strong>{inputQty.toLocaleString("it-IT")} kg</strong> da <strong>{inputItem?.codice_cer}</strong>
                  {confirmationMode === "deferred" ? " e la lavorazione resterà pendente." : " e verranno caricati gli output indicati sopra."}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline" disabled={creating} onClick={() => setConfirmationMode(null)}>Indietro</Button>
                  <Button type="button" disabled={creating} onClick={handleCreate}>
                    {creating ? "Registrazione in corso..." : "Sì, esegui la cernita"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {!editingBatchId && <Button variant="outline" onClick={() => requestConfirmation(true)} disabled={creating || !inputItemId || inputQty <= 0}>Salva come Pendente</Button>}
                <Button onClick={() => requestConfirmation(false)} disabled={creating || !isFormValid} className={editingBatchId ? "col-span-2" : ""}>
                  {editingBatchId ? "Completa Cernita" : "Conferma e Genera Movimenti"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
