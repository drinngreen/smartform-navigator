import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Intermediario } from "@/hooks/useIntermediari";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  intermediario: Intermediario | null;
  onSave: (values: Partial<Intermediario>) => Promise<void>;
}

export function IntermediarioFormDialog({ open, onOpenChange, intermediario, onSave }: Props) {
  const [form, setForm] = useState<Partial<Intermediario>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(intermediario ? { ...intermediario } : { attivo: true, nazione: "IT", categoria_albo: "8", cer_autorizzati: [] });
    }
  }, [open, intermediario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{intermediario ? "Modifica Intermediario" : "Nuovo Intermediario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Ragione Sociale *</Label>
              <Input required value={form.ragione_sociale || ""} onChange={e => set("ragione_sociale", e.target.value)} />
            </div>
            <div><Label>Nome</Label><Input value={form.nome || ""} onChange={e => set("nome", e.target.value)} /></div>
            <div><Label>Cognome</Label><Input value={form.cognome || ""} onChange={e => set("cognome", e.target.value)} /></div>
            <div><Label>Codice Fiscale</Label><Input value={form.codice_fiscale || ""} onChange={e => set("codice_fiscale", e.target.value)} /></div>
            <div><Label>Partita IVA</Label><Input value={form.partita_iva || ""} onChange={e => set("partita_iva", e.target.value)} /></div>
            <div className="col-span-2"><Label>Indirizzo</Label><Input value={form.indirizzo || ""} onChange={e => set("indirizzo", e.target.value)} /></div>
            <div><Label>CAP</Label><Input value={form.cap || ""} onChange={e => set("cap", e.target.value)} /></div>
            <div><Label>Comune</Label><Input value={form.comune || ""} onChange={e => set("comune", e.target.value)} /></div>
            <div><Label>Provincia</Label><Input value={form.provincia || ""} onChange={e => set("provincia", e.target.value)} /></div>
            <div><Label>Nazione</Label><Input value={form.nazione || "IT"} onChange={e => set("nazione", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
            <div><Label>PEC</Label><Input value={form.pec || ""} onChange={e => set("pec", e.target.value)} /></div>
            <div><Label>Telefono</Label><Input value={form.telefono || ""} onChange={e => set("telefono", e.target.value)} /></div>
            <div><Label>Cod. Destinatario</Label><Input value={(form as any).codice_destinatario || "0000000"} onChange={e => set("codice_destinatario", e.target.value)} /></div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Dati Albo Gestori — Cat. 8</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>N° Iscrizione Albo</Label><Input value={form.numero_iscrizione_albo || ""} onChange={e => set("numero_iscrizione_albo", e.target.value)} /></div>
              <div><Label>Categoria</Label><Input value={form.categoria_albo || "8"} onChange={e => set("categoria_albo", e.target.value)} /></div>
              <div><Label>Data Iscrizione</Label><Input type="date" value={form.data_iscrizione_albo || ""} onChange={e => set("data_iscrizione_albo", e.target.value)} /></div>
              <div><Label>Data Scadenza</Label><Input type="date" value={form.data_scadenza_albo || ""} onChange={e => set("data_scadenza_albo", e.target.value)} /></div>
              <div className="col-span-2">
                <Label>CER Autorizzati (separati da virgola)</Label>
                <Input
                  value={(form.cer_autorizzati || []).join(", ")}
                  onChange={e => set("cer_autorizzati", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  placeholder="es. 170904, 191212, 200301"
                />
              </div>
            </div>
          </div>

          <div><Label>Note</Label><Textarea value={form.note || ""} onChange={e => set("note", e.target.value)} rows={2} /></div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.attivo ?? true} onChange={e => set("attivo", e.target.checked)} className="rounded" />
            <span className="text-sm">Attivo</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
