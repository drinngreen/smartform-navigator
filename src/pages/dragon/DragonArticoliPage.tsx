import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonWarehouses } from "@/hooks/dragon/useDragonWarehouses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import type { DragonItemType } from "@/types/dragon";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const typeLabels: Record<string, string> = { WASTE_CER: "Rifiuto CER", MPS: "MPS", MATERIAL: "Materiale" };
const typeColors: Record<string, string> = { WASTE_CER: "bg-amber-500/20 text-amber-300", MPS: "bg-blue-500/20 text-blue-300", MATERIAL: "bg-violet-500/20 text-violet-300" };

const emptyForm = {
  codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER" as DragonItemType,
  unita_misura_default: "kg", fattore_conversione: "1", tipo_mps_eow: "", tipo_mps_eow_desc: "", default_warehouse_id: "",
};

export default function DragonArticoliPage() {
  const { items, isLoading, create, update } = useDragonItems();
  const { warehouses } = useDragonWarehouses();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(emptyForm);

  const filtered = items.filter(i => i.codice_cer.includes(filter) || i.descrizione.toLowerCase().includes(filter.toLowerCase()));

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      codice_cer: item.codice_cer, descrizione: item.descrizione, pericoloso: item.pericoloso,
      item_type: item.item_type, unita_misura_default: item.unita_misura_default,
      fattore_conversione: (item.fattore_conversione ?? 1).toString(),
      tipo_mps_eow: item.tipo_mps_eow ?? "", tipo_mps_eow_desc: item.tipo_mps_eow_desc ?? "",
      default_warehouse_id: item.default_warehouse_id ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.codice_cer || !form.descrizione) return;
    const payload: any = {
      ...form,
      fattore_conversione: parseFloat(form.fattore_conversione) || 1,
      tipo_mps_eow: form.tipo_mps_eow || null,
      tipo_mps_eow_desc: form.tipo_mps_eow_desc || null,
      default_warehouse_id: form.default_warehouse_id || null,
    };
    if (editId) {
      await update.mutateAsync({ id: editId, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setShowForm(false);
  };

  const showConversion = form.unita_misura_default.toLowerCase() !== "kg";
  const showMpsSection = form.item_type === "MPS" || form.item_type === "MATERIAL";

  return (
    <MNAdminLayout title="Articoli / CER / MPS" subtitle="Dragon Rifiuti 2 — Anagrafica articoli ambientali">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex flex-wrap justify-between items-center gap-3">
          <Input placeholder="Cerca codice o descrizione..." className="w-64 h-9" value={filter} onChange={e => setFilter(e.target.value)} />
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuovo Articolo</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>U.M.</TableHead>
                <TableHead>Conv.</TableHead>
                <TableHead>HP</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nessun articolo trovato</TableCell></TableRow>
              ) : (
                filtered.map((item: any) => (
                  <TableRow key={item.id} className="border-border/10">
                    <TableCell className="font-mono text-sm">{item.codice_cer}</TableCell>
                    <TableCell className="text-sm">{item.descrizione}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[item.item_type]}>{typeLabels[item.item_type]}</Badge></TableCell>
                    <TableCell className="text-sm">{item.unita_misura_default}</TableCell>
                    <TableCell className="text-xs font-mono">{item.fattore_conversione && item.fattore_conversione !== 1 ? item.fattore_conversione : "—"}</TableCell>
                    <TableCell>{item.pericoloso ? <Badge variant="outline" className="bg-rose-500/20 text-rose-300">⚠ Pericoloso</Badge> : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={item.attivo ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}>{item.attivo ? "Attivo" : "Inattivo"}</Badge></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{editId ? "Modifica Articolo" : "Nuovo Articolo"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Codice CER *</Label><Input value={form.codice_cer} onChange={e => setForm(f => ({ ...f, codice_cer: e.target.value }))} placeholder="170904" /></div>
            <div><Label>Descrizione *</Label><Input value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} placeholder="Rifiuti misti dell'attività di costruzione..." /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v as DragonItemType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unità di Misura</Label><Input value={form.unita_misura_default} onChange={e => setForm(f => ({ ...f, unita_misura_default: e.target.value }))} /></div>
            
            {showConversion && (
              <div><Label>Fattore di Conversione (→ kg)</Label><Input type="number" step="0.001" value={form.fattore_conversione} onChange={e => setForm(f => ({ ...f, fattore_conversione: e.target.value }))} placeholder="1" /></div>
            )}

            <div className="flex items-center gap-3"><Switch checked={form.pericoloso} onCheckedChange={v => setForm(f => ({ ...f, pericoloso: v }))} /><Label>Pericoloso</Label></div>

            {/* Comunicazione Enti section */}
            {showMpsSection && (
              <div className="border-t border-border/30 pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Comunicazione Enti</p>
                <div>
                  <Label>Tipo MPS/EOW</Label>
                  <Select value={form.tipo_mps_eow} onValueChange={v => setForm(f => ({ ...f, tipo_mps_eow: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nessuno</SelectItem>
                      <SelectItem value="MPS">MPS</SelectItem>
                      <SelectItem value="EOW">EOW (End of Waste)</SelectItem>
                      <SelectItem value="ALTRO">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.tipo_mps_eow === "ALTRO" && (
                  <div><Label>Descrizione Tipo</Label><Input value={form.tipo_mps_eow_desc} onChange={e => setForm(f => ({ ...f, tipo_mps_eow_desc: e.target.value }))} placeholder="Descrizione..." /></div>
                )}
              </div>
            )}

            {/* Default warehouse */}
            {warehouses.length > 0 && (
              <div>
                <Label>Magazzino Predefinito</Label>
                <Select value={form.default_warehouse_id} onValueChange={v => setForm(f => ({ ...f, default_warehouse_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nessuno</SelectItem>
                    {warehouses.filter(w => w.active).map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={create.isPending || update.isPending || !form.codice_cer || !form.descrizione} className="w-full">
              {(create.isPending || update.isPending) ? "Salvataggio..." : editId ? "Aggiorna Articolo" : "Crea Articolo"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
