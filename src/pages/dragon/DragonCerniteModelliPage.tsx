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
import type { DragonItemType, DragonQuantityMode, DragonWarehouseScope } from "@/types/dragon";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { DragonCerSelector } from "@/components/dragon/DragonCerSelector";

export default function DragonCerniteModelliPage() {
  const { models, isLoading, createModel } = useDragonTransformModels();
  const { items } = useDragonItems();
  const companyId = useMNContextStore((s) => s.activeContext.tenantId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", input_item_id: "", description: "" });
  const [showOutputForm, setShowOutputForm] = useState<string | null>(null);
  const [outputForm, setOutputForm] = useState({
    output_item_id: "",
    output_type: "WASTE_CER" as DragonItemType,
    quantity_mode: "PERCENT" as DragonQuantityMode,
    quantity_value: "",
    warehouse_scope: "WASTE" as DragonWarehouseScope,
    notes: "",
  });

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.input_item_id) return;
    await createModel.mutateAsync(form);
    setShowForm(false);
    setForm({ code: "", name: "", input_item_id: "", description: "" });
  };

  const handleAddOutput = async () => {
    if (!showOutputForm || !outputForm.output_item_id || !outputForm.quantity_value) return;
    try {
      const { error } = await supabase.from("dragon_transform_model_outputs").insert({
        model_id: showOutputForm,
        output_item_id: outputForm.output_item_id,
        output_type: outputForm.output_type,
        quantity_mode: outputForm.quantity_mode,
        quantity_value: parseFloat(outputForm.quantity_value),
        warehouse_scope: outputForm.warehouse_scope,
        notes: outputForm.notes || null,
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["dragon-transform-models"] });
      toast.success("Output aggiunto al modello");
      setShowOutputForm(null);
      setOutputForm({ output_item_id: "", output_type: "WASTE_CER", quantity_mode: "PERCENT", quantity_value: "", warehouse_scope: "WASTE", notes: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteOutput = async (outputId: string) => {
    const { error } = await supabase.from("dragon_transform_model_outputs").delete().eq("id", outputId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["dragon-transform-models"] });
    toast.success("Output rimosso");
  };

  return (
    <MNAdminLayout title="Modelli di Cernita" subtitle="Dragon Rifiuti 2 — Template lavorazioni e cernite">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><Scissors className="h-4 w-4 inline mr-1" />{models.length} modelli</p>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Modello</Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nessun modello creato</div>
          ) : (
            models.map((m) => (
              <div key={m.id} className="bg-card/60 border border-border/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-muted-foreground mr-2">{m.code}</span>
                    <span className="font-medium">{m.name}</span>
                    <Badge variant="outline" className={`ml-2 ${m.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {m.active ? "Attivo" : "Inattivo"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setShowOutputForm(m.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Output
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Input: <span className="font-mono">{(m.input_item as any)?.codice_cer}</span> — {(m.input_item as any)?.descrizione}
                </p>
                {(m.outputs as any[])?.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/20">
                        <TableHead>Output CER</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantità</TableHead>
                        <TableHead>Ambito</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(m.outputs as any[])?.map((o: any) => (
                        <TableRow key={o.id} className="border-border/10">
                          <TableCell className="font-mono text-sm">{o.output_item?.codice_cer} — {o.output_item?.descrizione}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{o.output_type}</Badge></TableCell>
                          <TableCell className="font-mono">{o.quantity_mode === "PERCENT" ? `${o.quantity_value}%` : `${o.quantity_value} kg`}</TableCell>
                          <TableCell><Badge variant="outline" className={o.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>{o.warehouse_scope}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteOutput(o.id)}><Trash2 className="h-3 w-3 text-rose-400" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Model Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Modello di Cernita</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Codice *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CERN-001" /></div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cernita 170904" /></div>
            <div>
              <Label>Articolo Input *</Label>
              <DragonCerSelector value={form.input_item_id} onChange={v => setForm(f => ({ ...f, input_item_id: v }))} />
            </div>
            <div><Label>Descrizione</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button onClick={handleSubmit} disabled={createModel.isPending || !form.code || !form.name || !form.input_item_id} className="w-full">
              {createModel.isPending ? "Salvataggio..." : "Crea Modello"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Output Sheet */}
      <Sheet open={!!showOutputForm} onOpenChange={() => setShowOutputForm(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Aggiungi Output al Modello</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Articolo Output *</Label>
              <DragonCerSelector value={outputForm.output_item_id} onChange={v => setOutputForm(f => ({ ...f, output_item_id: v }))} />
            </div>
            <div>
              <Label>Tipo Output</Label>
              <Select value={outputForm.output_type} onValueChange={(v: DragonItemType) => setOutputForm(f => ({ ...f, output_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WASTE_CER">Rifiuto (WASTE_CER)</SelectItem>
                  <SelectItem value="MPS">Materia Prima Secondaria (MPS)</SelectItem>
                  <SelectItem value="MATERIAL">Materiale recuperato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modalità Quantità</Label>
              <Select value={outputForm.quantity_mode} onValueChange={(v: DragonQuantityMode) => setOutputForm(f => ({ ...f, quantity_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percentuale (%)</SelectItem>
                  <SelectItem value="FIXED">Quantità fissa (kg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{outputForm.quantity_mode === "PERCENT" ? "Percentuale *" : "Quantità (kg) *"}</Label>
              <Input type="number" step="0.01" value={outputForm.quantity_value} onChange={e => setOutputForm(f => ({ ...f, quantity_value: e.target.value }))} placeholder={outputForm.quantity_mode === "PERCENT" ? "Es: 30" : "Es: 500"} />
            </div>
            <div>
              <Label>Ambito Magazzino</Label>
              <Select value={outputForm.warehouse_scope} onValueChange={(v: DragonWarehouseScope) => setOutputForm(f => ({ ...f, warehouse_scope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WASTE">Rifiuti (WASTE)</SelectItem>
                  <SelectItem value="MPS">MPS / Materiali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Note</Label><Input value={outputForm.notes} onChange={e => setOutputForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleAddOutput} disabled={!outputForm.output_item_id || !outputForm.quantity_value} className="w-full">
              Aggiungi Output
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
