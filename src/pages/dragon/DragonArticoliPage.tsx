import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import type { DragonItemType } from "@/types/dragon";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const typeLabels: Record<string, string> = { WASTE_CER: "Rifiuto CER", MPS: "MPS", MATERIAL: "Materiale" };
const typeColors: Record<string, string> = { WASTE_CER: "bg-amber-500/20 text-amber-300", MPS: "bg-blue-500/20 text-blue-300", MATERIAL: "bg-violet-500/20 text-violet-300" };

export default function DragonArticoliPage() {
  const { items, isLoading, create } = useDragonItems();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER" as DragonItemType, unita_misura_default: "kg" });

  const filtered = items.filter(i => i.codice_cer.includes(filter) || i.descrizione.toLowerCase().includes(filter.toLowerCase()));

  const handleSubmit = async () => {
    if (!form.codice_cer || !form.descrizione) return;
    await create.mutateAsync(form);
    setShowForm(false);
    setForm({ codice_cer: "", descrizione: "", pericoloso: false, item_type: "WASTE_CER", unita_misura_default: "kg" });
  };

  return (
    <MNAdminLayout title="Articoli / CER / MPS" subtitle="Dragon Rifiuti 2 — Anagrafica articoli ambientali">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex flex-wrap justify-between items-center gap-3">
          <Input placeholder="Cerca codice o descrizione..." className="w-64 h-9" value={filter} onChange={e => setFilter(e.target.value)} />
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Articolo</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>U.M.</TableHead>
                <TableHead>HP</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nessun articolo trovato</TableCell></TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="border-border/10">
                    <TableCell className="font-mono text-sm">{item.codice_cer}</TableCell>
                    <TableCell className="text-sm">{item.descrizione}</TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[item.item_type]}>{typeLabels[item.item_type]}</Badge></TableCell>
                    <TableCell className="text-sm">{item.unita_misura_default}</TableCell>
                    <TableCell>{item.pericoloso ? <Badge variant="outline" className="bg-rose-500/20 text-rose-300">⚠ Pericoloso</Badge> : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={item.attivo ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}>{item.attivo ? "Attivo" : "Inattivo"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Articolo</SheetTitle></SheetHeader>
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
            <div className="flex items-center gap-3"><Switch checked={form.pericoloso} onCheckedChange={v => setForm(f => ({ ...f, pericoloso: v }))} /><Label>Pericoloso</Label></div>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.codice_cer || !form.descrizione} className="w-full">
              {create.isPending ? "Salvataggio..." : "Crea Articolo"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
