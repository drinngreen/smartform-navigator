import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabelleFiscaliTabProps {
  tenantId?: string;
}

function GenericTableManager({ table, label, fields, tenantId }: { table: string; label: string; fields: { key: string; label: string; type?: string }[]; tenantId?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [table, tenantId],
    queryFn: async () => {
      const q = supabase.from(table as any).select("*").order("codice");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...formData, tenant_id: tenantId || null };
      if (editItem) {
        const { error } = await supabase.from(table as any).update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success(editItem ? `${label} aggiornato` : `${label} creato`);
      setShowForm(false);
      setEditItem(null);
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success(`${label} eliminato`);
    },
  });

  const openForm = (item?: any) => {
    if (item) {
      const data: Record<string, any> = {};
      fields.forEach((f) => (data[f.key] = item[f.key] ?? ""));
      setFormData(data);
      setEditItem(item);
    } else {
      const data: Record<string, any> = {};
      fields.forEach((f) => (data[f.key] = ""));
      setFormData(data);
      setEditItem(null);
    }
    setShowForm(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <button onClick={() => openForm()} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Nuovo
        </button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl bg-card/80 border border-border/30 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={formData[f.key] ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted/20">Annulla</button>
            <button onClick={() => saveMutation.mutate()} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs">{editItem ? "Salva" : "Crea"}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card/60 border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Caricamento...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Nessun elemento</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {fields.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-left font-mono uppercase text-muted-foreground">{f.label}</th>
                ))}
                <th className="px-3 py-2 text-left font-mono uppercase text-muted-foreground">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-border/10 hover:bg-muted/10">
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2 text-foreground">{item[f.key] ?? "—"}</td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openForm(item)} className="p-1 rounded hover:bg-muted/20 text-muted-foreground"><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => { if (confirm("Eliminare?")) deleteMutation.mutate(item.id); }} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
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

export function TabelleFiscaliTab({ tenantId }: TabelleFiscaliTabProps) {
  return (
    <Tabs defaultValue="iva" className="space-y-3">
      <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1">
        <TabsTrigger value="iva" className="text-xs">Codici IVA</TabsTrigger>
        <TabsTrigger value="causali" className="text-xs">Causali Contabili</TabsTrigger>
        <TabsTrigger value="pagamenti" className="text-xs">Metodi Pagamento</TabsTrigger>
      </TabsList>

      <TabsContent value="iva">
        <GenericTableManager
          table="erp_codici_iva"
          label="Codice IVA"
          tenantId={tenantId}
          fields={[
            { key: "codice", label: "Codice" },
            { key: "descrizione", label: "Descrizione" },
            { key: "aliquota", label: "Aliquota %", type: "number" },
            { key: "natura", label: "Natura" },
          ]}
        />
      </TabsContent>

      <TabsContent value="causali">
        <GenericTableManager
          table="erp_causali_contabili"
          label="Causale Contabile"
          tenantId={tenantId}
          fields={[
            { key: "codice", label: "Codice" },
            { key: "descrizione", label: "Descrizione" },
            { key: "tipo", label: "Tipo (FV/FA/NC...)" },
          ]}
        />
      </TabsContent>

      <TabsContent value="pagamenti">
        <GenericTableManager
          table="erp_metodi_pagamento"
          label="Metodo Pagamento"
          tenantId={tenantId}
          fields={[
            { key: "codice", label: "Codice" },
            { key: "descrizione", label: "Descrizione" },
            { key: "codice_fatturapa", label: "Cod. FatturaPA" },
            { key: "giorni_scadenza", label: "GG Scadenza", type: "number" },
            { key: "numero_rate", label: "N. Rate", type: "number" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
