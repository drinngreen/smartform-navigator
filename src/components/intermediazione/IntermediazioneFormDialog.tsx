import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediari } from "@/hooks/useIntermediari";
import { useCreateIntermediazione, useUpdateIntermediazione, Intermediazione } from "@/hooks/useIntermediazioni";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  intermediazione: Intermediazione | null;
  onSave: () => Promise<void>;
}

export function IntermediazioneFormDialog({ open, onOpenChange, intermediazione, onSave }: Props) {
  const { data: intermediari = [] } = useIntermediari();
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      return data || [];
    },
  });
  const createMut = useCreateIntermediazione();
  const updateMut = useUpdateIntermediazione();
  const [form, setForm] = useState<Partial<Intermediazione>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(intermediazione ? { ...intermediazione } : {
        stato: "bozza",
        tipo_provvigione: "euro_ton",
        valore_provvigione: 0,
        fatturata: false,
      });
    }
  }, [open, intermediazione]);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (intermediazione) {
        await updateMut.mutateAsync({ id: intermediazione.id, ...form });
      } else {
        await createMut.mutateAsync(form);
      }
      await onSave();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{intermediazione ? "Modifica Intermediazione" : "Nuova Intermediazione"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Intermediario */}
            <div className="col-span-2">
              <Label>Intermediario *</Label>
              <Select value={form.intermediario_id || ""} onValueChange={v => set("intermediario_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona intermediario" /></SelectTrigger>
                <SelectContent>
                  {intermediari.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.ragione_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produttore */}
            <div>
              <Label>Produttore</Label>
              <Select value={form.produttore_id || ""} onValueChange={v => set("produttore_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {organizations.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destinatario */}
            <div>
              <Label>Destinatario</Label>
              <Select value={form.destinatario_id || ""} onValueChange={v => set("destinatario_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {organizations.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trasportatore */}
            <div>
              <Label>Trasportatore</Label>
              <Select value={form.trasportatore_id || ""} onValueChange={v => set("trasportatore_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {organizations.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stato */}
            <div>
              <Label>Stato</Label>
              <Select value={form.stato || "bozza"} onValueChange={v => set("stato", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bozza">Bozza</SelectItem>
                  <SelectItem value="attiva">Attiva</SelectItem>
                  <SelectItem value="completata">Completata</SelectItem>
                  <SelectItem value="fatturata">Fatturata</SelectItem>
                  <SelectItem value="annullata">Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CER & Rifiuto */}
            <div><Label>CER</Label><Input value={form.cer || ""} onChange={e => set("cer", e.target.value)} placeholder="es. 170904" /></div>
            <div><Label>Descrizione Rifiuto</Label><Input value={form.descrizione_rifiuto || ""} onChange={e => set("descrizione_rifiuto", e.target.value)} /></div>

            {/* Quantità */}
            <div><Label>Qty Stimata (kg)</Label><Input type="number" value={form.quantita_stimata_kg ?? ""} onChange={e => set("quantita_stimata_kg", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label>Qty Effettiva (kg)</Label><Input type="number" value={form.quantita_effettiva_kg ?? ""} onChange={e => set("quantita_effettiva_kg", e.target.value ? Number(e.target.value) : null)} /></div>

            {/* Provvigione */}
            <div>
              <Label>Tipo Provvigione</Label>
              <Select value={form.tipo_provvigione || "euro_ton"} onValueChange={v => set("tipo_provvigione", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentuale">Percentuale %</SelectItem>
                  <SelectItem value="euro_ton">€/ton</SelectItem>
                  <SelectItem value="forfait">Forfait €</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valore Provvigione</Label><Input type="number" step="0.01" value={form.valore_provvigione ?? 0} onChange={e => set("valore_provvigione", Number(e.target.value))} /></div>

            {/* Contratto */}
            <div><Label>Rif. Contratto</Label><Input value={form.contratto_ref || ""} onChange={e => set("contratto_ref", e.target.value)} /></div>
            <div><Label>Condizioni Economiche</Label><Input value={form.condizioni_economiche || ""} onChange={e => set("condizioni_economiche", e.target.value)} /></div>
          </div>

          <div><Label>Note</Label><Textarea value={form.note || ""} onChange={e => set("note", e.target.value)} rows={2} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
