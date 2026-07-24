import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Package, Plus, FileText, Trash2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface Props { tenantId?: string; onCreated: () => void }

type Noleggio = {
  id: string; tenant_id: string; cliente_id: string | null;
  cliente_ragione_sociale: string; cliente_partita_iva: string | null;
  cassone_id: string | null; cassone_descrizione: string | null;
  tariffa_mensile: number; mese_riferimento: string;
  fatturato_stato: "da_fatturare" | "fatturato" | "annullato";
  fattura_id: string | null; note: string | null;
};

const eur = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

export function NoleggiTab({ tenantId, onCreated }: Props) {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const oggi = new Date();
  const meseScorsoInizio = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const meseScorsoFine = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
  const meseLabel = meseScorsoInizio.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const isoFrom = meseScorsoInizio.toISOString().slice(0, 10);
  const isoTo = meseScorsoFine.toISOString().slice(0, 10);

  const { data: noleggi = [], isLoading } = useQuery<Noleggio[]>({
    queryKey: ["noleggi", tenantId, isoFrom],
    queryFn: async () => {
      let q = supabase.from("noleggi" as any).select("*")
        .eq("fatturato_stato", "da_fatturare")
        .gte("mese_riferimento", isoFrom).lte("mese_riferimento", isoTo)
        .order("cliente_ragione_sociale");
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any;
    },
  });

  const grouped = useMemo(() => {
    const m = new Map<string, { cliente: string; piva: string | null; cliente_id: string | null; items: Noleggio[] }>();
    noleggi.forEach(n => {
      const key = n.cliente_id || n.cliente_ragione_sociale;
      const g = m.get(key) || { cliente: n.cliente_ragione_sociale, piva: n.cliente_partita_iva, cliente_id: n.cliente_id, items: [] };
      g.items.push(n); m.set(key, g);
    });
    return Array.from(m.values());
  }, [noleggi]);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };
  const toggleGroup = (items: Noleggio[]) => {
    const s = new Set(selected);
    const all = items.every(i => s.has(i.id));
    items.forEach(i => (all ? s.delete(i.id) : s.add(i.id)));
    setSelected(s);
  };

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("noleggi" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["noleggi"] }); toast.success("Noleggio eliminato"); },
    onError: (e: any) => toast.error(e.message),
  });

  const generaMut = useMutation({
    mutationFn: async (items: Noleggio[]) => {
      if (!items.length) throw new Error("Nessun noleggio selezionato");
      const cliente = items[0];
      if (!items.every(i => (i.cliente_id || i.cliente_ragione_sociale) === (cliente.cliente_id || cliente.cliente_ragione_sociale))) {
        throw new Error("Seleziona noleggi dello stesso cliente");
      }
      const anno = oggi.getFullYear();
      const { data: numRes, error: nErr } = await supabase.rpc("next_fattura_number" as any, { p_tenant_id: cliente.tenant_id, p_anno: anno });
      if (nErr) throw nErr;
      const numero = Number(numRes);
      const imponibile = items.reduce((s, i) => s + Number(i.tariffa_mensile), 0);
      const iva = +(imponibile * 0.22).toFixed(2);
      const totale = +(imponibile + iva).toFixed(2);

      const { data: fatt, error: fErr } = await supabase.from("fatture" as any).insert({
        tenant_id: cliente.tenant_id,
        numero, anno,
        data_emissione: new Date().toISOString().slice(0, 10),
        cliente_id: cliente.cliente_id,
        cliente_ragione_sociale: cliente.cliente_ragione_sociale,
        cliente_partita_iva: cliente.cliente_partita_iva,
        imponibile, iva, totale,
        stato: "cortesia", locked: false,
        note: `Noleggio cassoni ${meseLabel}`,
      }).select("id").single();
      if (fErr) throw fErr;

      const righe = items.map((i, idx) => ({
        fattura_id: (fatt as any).id,
        ordine: idx + 1,
        descrizione: `Noleggio ${i.cassone_descrizione || i.cassone_id || "cassone"} — ${new Date(i.mese_riferimento).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}`,
        quantita: 1, unita_misura: "mese",
        prezzo_unitario: Number(i.tariffa_mensile),
        imponibile: Number(i.tariffa_mensile),
        aliquota_iva: 22,
        reverse_charge: false,
      }));
      const { error: rErr } = await supabase.from("fatture_righe" as any).insert(righe);
      if (rErr) throw rErr;

      const { error: uErr } = await supabase.from("noleggi" as any)
        .update({ fatturato_stato: "fatturato", fattura_id: (fatt as any).id })
        .in("id", items.map(i => i.id));
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["noleggi"] });
      qc.invalidateQueries({ queryKey: ["fatture"] });
      setSelected(new Set());
      toast.success("Fattura di cortesia generata");
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedItems = noleggi.filter(n => selected.has(n.id));
  const selectedTotal = selectedItems.reduce((s, n) => s + Number(n.tariffa_mensile), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30">
            <Package className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <h3 className="font-semibold">Noleggi da fatturare — <span className="capitalize text-orange-300">{meseLabel}</span></h3>
            <p className="text-xs text-muted-foreground">Solo il mese precedente. Selezione multipla per cliente = fattura cumulativa.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={() => generaMut.mutate(selectedItems)}
              disabled={generaMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm font-medium hover:bg-amber-500/30">
              <FileText className="h-4 w-4" />
              Genera fattura ({selected.size} voci — {eur(selectedTotal)})
            </button>
          )}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nuovo noleggio
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Info className="h-6 w-6" />
            Nessun noleggio da fatturare per {meseLabel}
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {grouped.map(g => {
              const totale = g.items.reduce((s, i) => s + Number(i.tariffa_mensile), 0);
              const allSelected = g.items.every(i => selected.has(i.id));
              return (
                <div key={g.cliente + (g.piva || "")} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(g.items)} />
                      <span className="font-semibold text-foreground">{g.cliente}</span>
                      {g.piva && <span className="text-xs font-mono text-muted-foreground">P.IVA {g.piva}</span>}
                    </label>
                    <span className="text-sm font-mono text-amber-300">{eur(totale)}</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {g.items.map(i => (
                      <div key={i.id} className="flex items-center justify-between text-sm py-1">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                          <span className="text-foreground">{i.cassone_descrizione || i.cassone_id || "Cassone"}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(i.mese_riferimento).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
                          </span>
                        </label>
                        <span className="font-mono text-muted-foreground w-24 text-right">{eur(Number(i.tariffa_mensile))}</span>
                        <button onClick={() => confirm("Eliminare noleggio?") && delMut.mutate(i.id)}
                          className="ml-2 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <NuovoNoleggioDialog tenantId={tenantId} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ["noleggi"] }); }} />}
    </div>
  );
}

function NuovoNoleggioDialog({ tenantId, onClose, onCreated }: { tenantId?: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    cliente_ragione_sociale: "", cliente_partita_iva: "",
    cassone_id: "", cassone_descrizione: "",
    tariffa_mensile: "", mese_riferimento: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10),
    note: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.cliente_ragione_sociale || !form.tariffa_mensile) throw new Error("Cliente e tariffa obbligatori");
      const { error } = await supabase.from("noleggi" as any).insert({
        tenant_id: tenantId,
        cliente_ragione_sociale: form.cliente_ragione_sociale,
        cliente_partita_iva: form.cliente_partita_iva || null,
        cassone_id: form.cassone_id || null,
        cassone_descrizione: form.cassone_descrizione || null,
        tariffa_mensile: Number(form.tariffa_mensile),
        mese_riferimento: form.mese_riferimento,
        note: form.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Noleggio registrato"); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border/40 rounded-2xl p-6 w-full max-w-lg space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Nuovo noleggio cassone</h3>
        <input placeholder="Cliente (ragione sociale)" value={form.cliente_ragione_sociale}
          onChange={e => setForm({ ...form, cliente_ragione_sociale: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        <input placeholder="P.IVA (opzionale)" value={form.cliente_partita_iva}
          onChange={e => setForm({ ...form, cliente_partita_iva: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="ID cassone" value={form.cassone_id}
            onChange={e => setForm({ ...form, cassone_id: e.target.value })}
            className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
          <input placeholder="Descrizione cassone" value={form.cassone_descrizione}
            onChange={e => setForm({ ...form, cassone_descrizione: e.target.value })}
            className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" step="0.01" placeholder="Tariffa mensile €" value={form.tariffa_mensile}
            onChange={e => setForm({ ...form, tariffa_mensile: e.target.value })}
            className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
          <input type="date" value={form.mese_riferimento}
            onChange={e => setForm({ ...form, mese_riferimento: e.target.value })}
            className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" />
        </div>
        <textarea placeholder="Note" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" rows={2} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-muted/30 text-sm">Annulla</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            {save.isPending ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
