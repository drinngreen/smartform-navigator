import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonTransformModels } from "@/hooks/dragon/useDragonTransforms";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Scissors } from "lucide-react";

export default function DragonCerniteModelliPage() {
  const { models, isLoading, createModel } = useDragonTransformModels();
  const { items } = useDragonItems();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", input_item_id: "", description: "" });

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.input_item_id) return;
    await createModel.mutateAsync(form);
    setShowForm(false);
    setForm({ code: "", name: "", input_item_id: "", description: "" });
  };

  return (
    <MNAdminLayout title="Modelli di Cernita" subtitle="Dragon Rifiuti 2 — Template lavorazioni e cernite">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><Scissors className="h-4 w-4 inline mr-1" />{models.length} modelli</p>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Modello</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Input CER</TableHead>
                <TableHead>Output</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : models.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nessun modello creato</TableCell></TableRow>
              ) : (
                models.map((m) => (
                  <TableRow key={m.id} className="border-border/10">
                    <TableCell className="font-mono text-sm">{m.code}</TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm">{(m.input_item as any)?.codice_cer || "—"} — {(m.input_item as any)?.descrizione || ""}</TableCell>
                    <TableCell><Badge variant="outline">{(m.outputs as any[])?.length || 0} output</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={m.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}>{m.active ? "Attivo" : "Inattivo"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Modello di Cernita</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Codice *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CERN-001" /></div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cernita 170904" /></div>
            <div>
              <Label>Articolo Input *</Label>
              <Select value={form.input_item_id} onValueChange={v => setForm(f => ({ ...f, input_item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona articolo..." /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.attivo).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.codice_cer} — {i.descrizione}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrizione</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button onClick={handleSubmit} disabled={createModel.isPending || !form.code || !form.name || !form.input_item_id} className="w-full">
              {createModel.isPending ? "Salvataggio..." : "Crea Modello"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
