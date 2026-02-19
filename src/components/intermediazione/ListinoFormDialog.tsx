import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Intermediario } from "@/hooks/useIntermediari";
import type { Listino } from "./ListiniTab";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listino: Listino | null;
  intermediari: Intermediario[];
  onSaved: () => void;
}

export function ListinoFormDialog({ open, onOpenChange, listino, intermediari, onSaved }: Props) {
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      return data || [];
    },
  });
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(listino ? { ...listino } : { tipo_provvigione: "euro_ton", valore_provvigione: 0, attivo: true });
    }
  }, [open, listino]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        intermediario_id: form.intermediario_id,
        produttore_id: form.produttore_id || null,
        cer: form.cer || null,
        tipo_provvigione: form.tipo_provvigione,
        valore_provvigione: form.valore_provvigione,
        fee_minimo: form.fee_minimo || null,
        descrizione: form.descrizione || null,
        valido_dal: form.valido_dal || null,
        valido_al: form.valido_al || null,
        attivo: form.attivo,
      };
      if (listino) {
        const { error } = await supabase.from("listini_intermediazione" as any).update(payload as any).eq("id", listino.id);
        if (error) throw error;
        toast.success("Listino aggiornato");
      } else {
        const { error } = await supabase.from("listini_intermediazione" as any).insert(payload as any);
        if (error) throw error;
        toast.success("Listino creato");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border/50">
        <DialogHeader><DialogTitle>{listino ? "Modifica Listino" : "Nuovo Listino"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Intermediario *</Label>
            <Select value={form.intermediario_id || ""} onValueChange={v => set("intermediario_id", v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>{intermediari.map(i => <SelectItem key={i.id} value={i.id}>{i.ragione_sociale}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Produttore (opzionale)</Label>
            <Select value={form.produttore_id || ""} onValueChange={v => set("produttore_id", v)}>
              <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
              <SelectContent>{organizations.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>CER</Label><Input value={form.cer || ""} onChange={e => set("cer", e.target.value)} /></div>
            <div>
              <Label>Tipo Fee</Label>
              <Select value={form.tipo_provvigione || "euro_ton"} onValueChange={v => set("tipo_provvigione", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentuale">%</SelectItem>
                  <SelectItem value="euro_ton">€/ton</SelectItem>
                  <SelectItem value="forfait">Forfait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valore</Label><Input type="number" step="0.01" value={form.valore_provvigione ?? 0} onChange={e => set("valore_provvigione", Number(e.target.value))} /></div>
            <div><Label>Fee Minimo €</Label><Input type="number" step="0.01" value={form.fee_minimo ?? ""} onChange={e => set("fee_minimo", e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label>Valido dal</Label><Input type="date" value={form.valido_dal || ""} onChange={e => set("valido_dal", e.target.value)} /></div>
            <div><Label>Valido al</Label><Input type="date" value={form.valido_al || ""} onChange={e => set("valido_al", e.target.value)} /></div>
          </div>
          <div><Label>Descrizione</Label><Textarea value={form.descrizione || ""} onChange={e => set("descrizione", e.target.value)} rows={2} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.attivo ?? true} onChange={e => set("attivo", e.target.checked)} className="rounded" /><span className="text-sm">Attivo</span></label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
