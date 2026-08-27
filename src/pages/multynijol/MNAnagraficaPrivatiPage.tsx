import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Plus, Search, Edit2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface Privato {
  id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  comune_residenza: string | null;
  numero_tessera: string | null;
  tipo_utenza: string;
  note: string | null;
  attivo: boolean;
  automezzo: string | null;
  targa_automezzo: string | null;
  cellulare: string | null;
  telefono: string | null;
}

function PrivatoFormDialog({ item, tenantId, onClose }: { item?: Privato; tenantId: string; onClose: () => void }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: item?.nome || "",
    cognome: item?.cognome || "",
    codice_fiscale: item?.codice_fiscale || "",
    comune_residenza: item?.comune_residenza || "",
    numero_tessera: item?.numero_tessera || "",
    tipo_utenza: item?.tipo_utenza || "domestica",
    note: item?.note || "",
    automezzo: item?.automezzo || "",
    targa_automezzo: item?.targa_automezzo || "",
    cellulare: item?.cellulare || "",
    telefono: item?.telefono || "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, tenant_id: tenantId, attivo: true };
      if (isEdit) {
        const { error } = await supabase.from("anagrafica_privati").update(payload).eq("id", item!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("anagrafica_privati").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mn-anagrafica-privati"] });
      toast.success(isEdit ? "Privato aggiornato" : "Privato creato");
      onClose();
    },
    onError: () => toast.error("Errore salvataggio"),
  });

  const Field = ({ label, field, span = 1 }: { label: string; field: string; span?: number }) => (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</label>
      <input value={(form as any)[field] || ""} onChange={e => set(field, e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/30 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="text-lg font-semibold text-foreground">{isEdit ? "Modifica Privato" : "Nuovo Privato"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground">✕</button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <Field label="Cognome" field="cognome" />
          <Field label="Nome" field="nome" />
          <Field label="Codice Fiscale" field="codice_fiscale" span={2} />
          <Field label="Comune Residenza" field="comune_residenza" />
          <Field label="N° Tessera" field="numero_tessera" />
          <Field label="Cellulare" field="cellulare" />
          <Field label="Telefono" field="telefono" />
          <Field label="Automezzo" field="automezzo" />
          <Field label="Targa Automezzo" field="targa_automezzo" />
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tipo Utenza</label>
            <select value={form.tipo_utenza} onChange={e => set("tipo_utenza", e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground">
              <option value="domestica">Domestica</option>
              <option value="non_domestica">Non Domestica</option>
              <option value="produttore_speciali">Produttore Speciali</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Note</label>
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border/30">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20 transition-colors">Annulla</button>
          <button onClick={() => mutation.mutate()} disabled={!form.cognome || !form.codice_fiscale || mutation.isPending}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mutation.isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea"}
          </button>
        </div>
      </div>
    </div>
  );
}

const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";

export default function MNAnagraficaPrivatiPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Privato | null>(null);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mn-anagrafica-privati"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anagrafica_privati")
        .select("*")
        .eq("tenant_id", TENANT_ID)
        .order("cognome");
      if (error) throw error;
      return data as Privato[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("anagrafica_privati").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mn-anagrafica-privati"] });
      toast.success("Privato eliminato");
    },
    onError: () => toast.error("Errore eliminazione"),
  });

  const filtered = items.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${i.cognome} ${i.nome} ${i.codice_fiscale} ${i.comune_residenza || ""}`.toLowerCase().includes(s);
  });

  return (
    <MNAdminLayout title="Anagrafica" subtitle="Privati Cittadini">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per cognome, nome, CF, comune..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">{filtered.length} / {items.length}</span>
          <button onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Nuovo Privato
          </button>
        </div>

        <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nessun privato trovato</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left">
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Cognome</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Nome</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Codice Fiscale</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Comune</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Tessera</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Cellulare</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Automezzo</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Targa</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{item.cognome}</td>
                      <td className="px-4 py-3 text-foreground">{item.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.codice_fiscale}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.comune_residenza || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.numero_tessera || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.cellulare || item.telefono || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.automezzo || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.targa_automezzo || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{item.tipo_utenza?.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditItem(item); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { if (confirm("Eliminare?")) deleteMutation.mutate(item.id); }} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <PrivatoFormDialog
            item={editItem || undefined}
            tenantId={TENANT_ID}
            onClose={() => { setShowForm(false); setEditItem(null); }}
          />
        )}
      </div>
    </MNAdminLayout>
  );
}
