import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Edit2, Trash2, Building2, User, Landmark, Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { AnagraficaFormDialog } from "./AnagraficaFormDialog";

const TIPO_ICONS: Record<string, typeof Building2> = {
  cliente: Building2,
  fornitore: Briefcase,
  collaboratore_piva: User,
  dipendente: Users,
  banca: Landmark,
};

const TIPO_LABELS: Record<string, string> = {
  cliente: "Cliente",
  fornitore: "Fornitore",
  collaboratore_piva: "Collaboratore P.IVA",
  dipendente: "Dipendente",
  banca: "Banca",
};

interface AnagraficheTabProps {
  tenantId?: string;
}

export function AnagraficheTab({ tenantId }: AnagraficheTabProps) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("tutti");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["erp-anagrafiche", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_anagrafiche" as any).select("*").order("ragione_sociale");
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_anagrafiche" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-anagrafiche"] });
      toast.success("Anagrafica eliminata");
    },
    onError: () => toast.error("Errore eliminazione"),
  });

  const filtered = items.filter((i: any) => {
    const matchSearch = !search || i.ragione_sociale?.toLowerCase().includes(search.toLowerCase()) || i.partita_iva?.includes(search) || i.codice_fiscale?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "tutti" || i.tipo_soggetto === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per ragione sociale, P.IVA, CF..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
        >
          <option value="tutti">Tutti i tipi</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuovo Soggetto
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nessuna anagrafica trovata</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left">
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Ragione Sociale</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">P.IVA</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">CF</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Comune</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">PEC</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => {
                  const Icon = TIPO_ICONS[item.tipo_soggetto] || Building2;
                  return (
                    <tr key={item.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-xs">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {TIPO_LABELS[item.tipo_soggetto] || item.tipo_soggetto}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.ragione_sociale}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.partita_iva || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.codice_fiscale || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.comune || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.pec || "—"}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <AnagraficaFormDialog
          item={editItem}
          tenantId={tenantId}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
