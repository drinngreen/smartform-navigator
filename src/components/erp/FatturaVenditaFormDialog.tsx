import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Riga {
  id?: string;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  sconto_percentuale: number;
  aliquota_iva: number;
  cer?: string;
  centro_costo?: string;
}

interface Props {
  item?: any;
  tenantId?: string;
  onClose: () => void;
}

export function FatturaVenditaFormDialog({ item, tenantId, onClose }: Props) {
  const isEdit = !!item;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    numero: item?.numero || "",
    data_fattura: item?.data_fattura || new Date().toISOString().split("T")[0],
    tipo_documento: item?.tipo_documento || "TD01",
    cliente_id: item?.cliente_id || "",
    condizioni_pagamento: item?.condizioni_pagamento || "",
    note: item?.note || "",
    stato: item?.stato || "bozza",
  });

  const [righe, setRighe] = useState<Riga[]>([
    { descrizione: "", quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0, aliquota_iva: 22 },
  ]);

  const { data: clienti = [] } = useQuery({
    queryKey: ["erp-anagrafiche-clienti", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_anagrafiche" as any).select("id, ragione_sociale").eq("tipo_soggetto", "cliente").eq("attivo", true).order("ragione_sociale");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  // Load righe if editing
  useEffect(() => {
    if (isEdit) {
      supabase.from("erp_righe_fatture_vendita" as any).select("*").eq("fattura_id", item.id).order("riga_numero").then(({ data }) => {
        if (data && data.length > 0) {
          setRighe(data.map((r: any) => ({
            id: r.id,
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario,
            sconto_percentuale: r.sconto_percentuale || 0,
            aliquota_iva: r.aliquota_iva,
            cer: r.cer,
            centro_costo: r.centro_costo,
          })));
        }
      });
    }
  }, [isEdit, item?.id]);

  const calcRiga = (r: Riga) => {
    const imp = r.quantita * r.prezzo_unitario * (1 - (r.sconto_percentuale || 0) / 100);
    const iva = imp * (r.aliquota_iva / 100);
    return { imponibile: imp, importo_iva: iva };
  };

  const totali = righe.reduce(
    (acc, r) => {
      const { imponibile, importo_iva } = calcRiga(r);
      return { imponibile: acc.imponibile + imponibile, iva: acc.iva + importo_iva };
    },
    { imponibile: 0, iva: 0 }
  );

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const updateRiga = (idx: number, field: string, value: any) => {
    setRighe((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRiga = () => setRighe((p) => [...p, { descrizione: "", quantita: 1, prezzo_unitario: 0, sconto_percentuale: 0, aliquota_iva: 22 }]);
  const removeRiga = (idx: number) => setRighe((p) => p.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        tenant_id: tenantId || null,
        imponibile: totali.imponibile,
        iva: totali.iva,
        totale: totali.imponibile + totali.iva,
        netto_a_pagare: totali.imponibile + totali.iva,
        cliente_id: form.cliente_id || null,
      };

      let fatturaId = item?.id;
      if (isEdit) {
        const { error } = await supabase.from("erp_fatture_vendita" as any).update(payload).eq("id", item.id);
        if (error) throw error;
        // Delete old righe and re-insert
        await supabase.from("erp_righe_fatture_vendita" as any).delete().eq("fattura_id", item.id);
      } else {
        const { data, error } = await supabase.from("erp_fatture_vendita" as any).insert(payload).select("id").single();
        if (error) throw error;
        fatturaId = (data as any).id;
      }

      // Insert righe
      if (fatturaId && righe.length > 0) {
        const righePayload = righe.map((r, i) => {
          const { imponibile, importo_iva } = calcRiga(r);
          return {
            fattura_id: fatturaId,
            riga_numero: i + 1,
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario,
            sconto_percentuale: r.sconto_percentuale,
            imponibile,
            aliquota_iva: r.aliquota_iva,
            importo_iva,
            cer: r.cer || null,
            centro_costo: r.centro_costo || null,
          };
        });
        const { error: righeError } = await supabase.from("erp_righe_fatture_vendita" as any).insert(righePayload);
        if (righeError) throw righeError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-fatture-vendita"] });
      toast.success(isEdit ? "Fattura aggiornata" : "Fattura creata");
      onClose();
    },
    onError: (e) => { console.error(e); toast.error("Errore salvataggio"); },
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/30 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="text-lg font-semibold text-foreground">{isEdit ? "Modifica Fattura" : "Nuova Fattura Vendita"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/20"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Numero *</label>
              <input value={form.numero} onChange={(e) => set("numero", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Data</label>
              <input type="date" value={form.data_fattura} onChange={(e) => set("data_fattura", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tipo Documento</label>
              <select value={form.tipo_documento} onChange={(e) => set("tipo_documento", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground">
                <option value="TD01">TD01 - Fattura</option>
                <option value="TD02">TD02 - Acc./Anticipo</option>
                <option value="TD04">TD04 - Nota di Credito</option>
                <option value="TD05">TD05 - Nota di Debito</option>
                <option value="TD24">TD24 - Fatt. Differita</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Cliente</label>
              <select value={form.cliente_id} onChange={(e) => set("cliente_id", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground">
                <option value="">— Seleziona —</option>
                {clienti.map((c: any) => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
              </select>
            </div>
          </div>

          {/* Righe fattura */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">Righe Fattura</h4>
              <button onClick={addRiga} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Aggiungi riga
              </button>
            </div>
            <div className="space-y-2">
              {righe.map((r, i) => {
                const { imponibile } = calcRiga(r);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-background/40 border border-border/20">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Descrizione</label>
                      <input value={r.descrizione} onChange={(e) => updateRiga(i, "descrizione", e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Qtà</label>
                      <input type="number" step="0.01" value={r.quantita} onChange={(e) => updateRiga(i, "quantita", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Prezzo Unit.</label>
                      <input type="number" step="0.01" value={r.prezzo_unitario} onChange={(e) => updateRiga(i, "prezzo_unitario", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Sc.%</label>
                      <input type="number" step="0.01" value={r.sconto_percentuale} onChange={(e) => updateRiga(i, "sconto_percentuale", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">IVA%</label>
                      <input type="number" value={r.aliquota_iva} onChange={(e) => updateRiga(i, "aliquota_iva", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs text-foreground" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-mono text-muted-foreground mb-0.5">Imponibile</label>
                      <div className="px-2 py-1.5 rounded-lg bg-muted/20 text-xs font-mono text-foreground">{formatCurrency(imponibile)}</div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {righe.length > 1 && (
                        <button onClick={() => removeRiga(i)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totali */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 p-3 rounded-xl bg-muted/10 border border-border/20">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Imponibile</span><span className="font-mono">{formatCurrency(totali.imponibile)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(totali.iva)}</span></div>
              <div className="h-px bg-border/30 my-1" />
              <div className="flex justify-between text-sm font-semibold"><span>Totale</span><span className="font-mono text-primary">{formatCurrency(totali.imponibile + totali.iva)}</span></div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Note</label>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border/30">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20 transition-colors">Annulla</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.numero || mutation.isPending}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea Fattura"}
          </button>
        </div>
      </div>
    </div>
  );
}
