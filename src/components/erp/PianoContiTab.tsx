import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  attivo: "Attivo",
  passivo: "Passivo",
  costo: "Costo",
  ricavo: "Ricavo",
  ordine: "Ordine",
};

interface PianoContiTabProps {
  tenantId?: string;
}

export function PianoContiTab({ tenantId }: PianoContiTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState({ codice: "", descrizione: "", tipo: "attivo", livello: 1, parent_id: "" });
  const queryClient = useQueryClient();

  const { data: conti = [], isLoading } = useQuery({
    queryKey: ["erp-piano-conti", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_piano_conti" as any).select("*").order("codice");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...formData, tenant_id: tenantId || null, parent_id: formData.parent_id || null, livello: Number(formData.livello) };
      if (editItem) {
        const { error } = await supabase.from("erp_piano_conti" as any).update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("erp_piano_conti" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-piano-conti"] });
      toast.success(editItem ? "Conto aggiornato" : "Conto creato");
      setShowForm(false);
      setEditItem(null);
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_piano_conti" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-piano-conti"] });
      toast.success("Conto eliminato");
    },
  });

  const openForm = (item?: any) => {
    if (item) {
      setFormData({ codice: item.codice, descrizione: item.descrizione, tipo: item.tipo, livello: item.livello, parent_id: item.parent_id || "" });
      setEditItem(item);
    } else {
      setFormData({ codice: "", descrizione: "", tipo: "attivo", livello: 1, parent_id: "" });
      setEditItem(null);
    }
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <h3 className="text-sm font-semibold text-foreground">Piano dei Conti</h3>
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Nuovo Conto
        </button>
      </div>

      {showForm && (
        <div className="p-4 rounded-2xl bg-card/80 border border-border/30 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Codice</label>
              <input value={formData.codice} onChange={(e) => setFormData((p) => ({ ...p, codice: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Descrizione</label>
              <input value={formData.descrizione} onChange={(e) => setFormData((p) => ({ ...p, descrizione: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Tipo</label>
              <select value={formData.tipo} onChange={(e) => setFormData((p) => ({ ...p, tipo: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground">
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Livello</label>
              <input type="number" min={1} max={4} value={formData.livello} onChange={(e) => setFormData((p) => ({ ...p, livello: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/20">Annulla</button>
            <button onClick={() => saveMutation.mutate()} disabled={!formData.codice || !formData.descrizione} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50">{editItem ? "Salva" : "Crea"}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card/60 border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
        ) : conti.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nessun conto. Crea il piano dei conti base.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">Codice</th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">Descrizione</th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">Lv.</th>
                <th className="px-4 py-3 text-left text-xs font-mono uppercase text-muted-foreground">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {conti.map((c: any) => (
                <tr key={c.id} className="border-b border-border/10 hover:bg-muted/10">
                  <td className="px-4 py-2 font-mono text-foreground" style={{ paddingLeft: `${(c.livello - 1) * 20 + 16}px` }}>
                    {c.livello > 1 && <ChevronRight className="inline h-3 w-3 mr-1 text-muted-foreground" />}
                    {c.codice}
                  </td>
                  <td className="px-4 py-2 text-foreground">{c.descrizione}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{TIPO_LABELS[c.tipo]}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{c.livello}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openForm(c)} className="p-1 rounded hover:bg-muted/20 text-muted-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Eliminare?")) deleteMutation.mutate(c.id); }} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
