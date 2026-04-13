import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MapPin } from "lucide-react";
import type { DragonSiteActivity } from "@/types/dragon";

const activityLabels: Record<string, string> = {
  ND: "Non definita",
  MANUTENZIONE: "Manutenzione",
  ASSISTENZA_SANITARIA: "Assistenza sanitaria",
  CANTIERE_TEMPORANEO_MOBILE: "Cantiere temporaneo mobile",
  BONIFICA_AMIANTO: "Bonifica amianto",
};

export default function DragonCantieriPage() {
  const { sites, isLoading, create, update } = useDragonSites();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ site_code: "", name: "", address: "", municipality: "", province: "", notes: "", activity_type: "ND" as DragonSiteActivity });

  const handleSubmit = async () => {
    if (!form.site_code || !form.name) return;
    await create.mutateAsync(form);
    setShowForm(false);
    setForm({ site_code: "", name: "", address: "", municipality: "", province: "", notes: "", activity_type: "ND" });
  };

  return (
    <MNAdminLayout title="Cantieri / Luoghi Produzione" subtitle="Dragon Rifiuti 2 — Siti produzione fuori U.L.">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><MapPin className="h-4 w-4 inline mr-1" />{sites.length} cantieri registrati</p>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Cantiere</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Codice</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Comune</TableHead>
                <TableHead>Prov.</TableHead>
                <TableHead>Attività</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : sites.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nessun cantiere registrato</TableCell></TableRow>
              ) : (
                sites.map((s) => (
                  <TableRow key={s.id} className="border-border/10">
                    <TableCell className="font-mono text-sm">{s.site_code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.address || "—"}</TableCell>
                    <TableCell className="text-sm">{s.municipality || "—"}</TableCell>
                    <TableCell className="text-sm">{s.province || "—"}</TableCell>
                    <TableCell className="text-xs">{activityLabels[s.activity_type] || s.activity_type}</TableCell>
                    <TableCell><Badge variant="outline" className={s.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}>{s.active ? "Attivo" : "Inattivo"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Cantiere</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Codice *</Label><Input value={form.site_code} onChange={e => setForm(f => ({ ...f, site_code: e.target.value }))} placeholder="CANT-001" /></div>
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cantiere Via Roma" /></div>
            <div><Label>Indirizzo</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comune</Label><Input value={form.municipality} onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))} /></div>
              <div><Label>Provincia</Label><Input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="TO" /></div>
            </div>
            <div>
              <Label>Tipo Attività</Label>
              <Select value={form.activity_type} onValueChange={v => setForm(f => ({ ...f, activity_type: v as DragonSiteActivity }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(activityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Note</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.site_code || !form.name} className="w-full">
              {create.isPending ? "Salvataggio..." : "Crea Cantiere"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
