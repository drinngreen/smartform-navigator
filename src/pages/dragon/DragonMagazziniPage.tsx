import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonWarehouses, type DragonWarehouse } from "@/hooks/dragon/useDragonWarehouses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil } from "lucide-react";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const emptyForm = { code: "", description: "", has_cer: false, has_mps: false, limit_mps_eow: "", active: true };

export default function DragonMagazziniPage() {
  const { warehouses, isLoading, create, update } = useDragonWarehouses();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (wh: DragonWarehouse) => {
    setEditId(wh.id);
    setForm({ code: wh.code, description: wh.description, has_cer: wh.has_cer, has_mps: wh.has_mps, limit_mps_eow: wh.limit_mps_eow?.toString() ?? "", active: wh.active });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.code) return;
    const payload = { code: form.code, description: form.description, has_cer: form.has_cer, has_mps: form.has_mps, limit_mps_eow: form.limit_mps_eow ? parseFloat(form.limit_mps_eow) : null, active: form.active };
    if (editId) {
      await update.mutateAsync({ id: editId, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setShowForm(false);
  };

  return (
    <MNAdminLayout title="Archivio Magazzini" subtitle="Dragon — Gestione aree di stoccaggio">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex flex-wrap justify-between items-center gap-3">
          <p className="text-sm text-muted-foreground">Configura i magazzini fisici per CER e MPS/EOW</p>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuovo Magazzino</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>CER</TableHead>
                <TableHead>MPS</TableHead>
                <TableHead>Limite MPS/EOW</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessun magazzino configurato</TableCell></TableRow>
              ) : (
                warehouses.map((wh) => (
                  <TableRow key={wh.id} className="border-border/10">
                    <TableCell className="font-mono text-sm font-semibold">{wh.code}</TableCell>
                    <TableCell className="text-sm">{wh.description}</TableCell>
                    <TableCell>{wh.has_cer ? <Badge variant="outline" className="bg-amber-500/20 text-amber-300">CER</Badge> : "—"}</TableCell>
                    <TableCell>{wh.has_mps ? <Badge variant="outline" className="bg-blue-500/20 text-blue-300">MPS</Badge> : "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{wh.limit_mps_eow != null ? `${wh.limit_mps_eow} kg` : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={wh.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}>{wh.active ? "Attivo" : "Inattivo"}</Badge></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => openEdit(wh)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{editId ? "Modifica Magazzino" : "Nuovo Magazzino"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Codice *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAG01" /></div>
            <div><Label>Descrizione</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Magazzino principale MPS" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.has_cer} onCheckedChange={v => setForm(f => ({ ...f, has_cer: v }))} /><Label>Contiene CER (Rifiuti)</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.has_mps} onCheckedChange={v => setForm(f => ({ ...f, has_mps: v }))} /><Label>Contiene MPS/EOW</Label></div>
            <div><Label>Limite Giacenza MPS/EOW (kg)</Label><Input type="number" step="0.01" value={form.limit_mps_eow} onChange={e => setForm(f => ({ ...f, limit_mps_eow: e.target.value }))} placeholder="Opzionale" /></div>
            <div className="flex items-center gap-3"><Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /><Label>Attivo</Label></div>
            <Button onClick={handleSubmit} disabled={create.isPending || update.isPending || !form.code} className="w-full">
              {(create.isPending || update.isPending) ? "Salvataggio..." : editId ? "Aggiorna" : "Crea Magazzino"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
