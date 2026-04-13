import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, FileText } from "lucide-react";
import { useState } from "react";
import type { DragonDocumentType } from "@/types/dragon";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";

const docTypeLabels: Record<string, string> = { FIR: "FIR", DDT_IN: "DDT Entrata", DDT_OUT: "DDT Uscita", FORMULARIO_MODELLO: "Formulario", ALTRO: "Altro" };

export default function DragonDocumentiPage() {
  const { documents, isLoading, create } = useDragonDocuments();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_type: "FIR" as DragonDocumentType, number: "", document_date: new Date().toISOString().split("T")[0], notes: "" });

  const handleSubmit = async () => {
    if (!form.number) return;
    await create.mutateAsync(form);
    setShowForm(false);
    setForm({ document_type: "FIR", number: "", document_date: new Date().toISOString().split("T")[0], notes: "" });
  };

  return (
    <MNAdminLayout title="Documenti" subtitle="Dragon Rifiuti 2 — Archivio FIR, DDT e documenti">
      <div className="space-y-4">
        <DragonBackButton />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground"><FileText className="h-4 w-4 inline mr-1" />{documents.length} documenti</p>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Nuovo Documento</Button>
        </div>

        <div className="bg-card/60 border border-border/30 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20">
                <TableHead>Tipo</TableHead>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : documents.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nessun documento</TableCell></TableRow>
              ) : (
                documents.map((d) => (
                  <TableRow key={d.id} className="border-border/10">
                    <TableCell><Badge variant="outline">{docTypeLabels[d.document_type] || d.document_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{d.number || "—"}</TableCell>
                    <TableCell className="text-sm">{d.document_date ? new Date(d.document_date).toLocaleDateString("it-IT") : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-emerald-500/20 text-emerald-300">{d.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{d.notes || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Nuovo Documento</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Tipo</Label>
              <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v as DragonDocumentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(docTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Numero *</Label><Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} /></div>
            <div><Label>Data</Label><Input type="date" value={form.document_date} onChange={e => setForm(f => ({ ...f, document_date: e.target.value }))} /></div>
            <div><Label>Note</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleSubmit} disabled={create.isPending || !form.number} className="w-full">
              {create.isPending ? "Salvataggio..." : "Crea Documento"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </MNAdminLayout>
  );
}
