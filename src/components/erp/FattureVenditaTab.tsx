import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Eye, Trash2, FileCode, CheckCircle2, AlertCircle, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { FatturaVenditaFormDialog } from "./FatturaVenditaFormDialog";

const STATO_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  bozza: { icon: Clock, color: "text-yellow-400", label: "Bozza" },
  emessa: { icon: Send, color: "text-blue-400", label: "Emessa" },
  inviata_sdi: { icon: Send, color: "text-cyan-400", label: "Inviata SdI" },
  consegnata: { icon: CheckCircle2, color: "text-green-400", label: "Consegnata" },
  accettata: { icon: CheckCircle2, color: "text-emerald-400", label: "Accettata" },
  scartata: { icon: AlertCircle, color: "text-red-400", label: "Scartata" },
  annullata: { icon: AlertCircle, color: "text-red-300", label: "Annullata" },
};

interface FattureVenditaTabProps {
  tenantId?: string;
}

export function FattureVenditaTab({ tenantId }: FattureVenditaTabProps) {
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState("tutti");
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: fatture = [], isLoading } = useQuery({
    queryKey: ["erp-fatture-vendita", tenantId],
    queryFn: async () => {
      const q = supabase.from("erp_fatture_vendita" as any).select("*, cliente:erp_anagrafiche!erp_fatture_vendita_cliente_id_fkey(ragione_sociale)").order("data_fattura", { ascending: false });
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_fatture_vendita" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-fatture-vendita"] });
      toast.success("Fattura eliminata");
    },
    onError: () => toast.error("Errore eliminazione"),
  });

  const filtered = fatture.filter((f: any) => {
    const matchSearch = !search || f.numero?.includes(search) || f.cliente?.ragione_sociale?.toLowerCase().includes(search.toLowerCase());
    const matchStato = filterStato === "tutti" || f.stato === filterStato;
    return matchSearch && matchStato;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per numero o cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
        >
          <option value="tutti">Tutti gli stati</option>
          {Object.entries(STATO_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={() => { setViewItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuova Fattura
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totale Fatture", value: fatture.length, color: "text-foreground" },
          { label: "Bozze", value: fatture.filter((f: any) => f.stato === "bozza").length, color: "text-yellow-400" },
          { label: "Consegnate", value: fatture.filter((f: any) => f.stato === "consegnata" || f.stato === "accettata").length, color: "text-green-400" },
          { label: "Totale €", value: formatCurrency(fatture.reduce((s: number, f: any) => s + (f.totale || 0), 0)), color: "text-primary" },
        ].map((c) => (
          <div key={c.label} className="p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-semibold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nessuna fattura trovata</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left">
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Numero</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Imponibile</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">IVA</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Totale</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Stato</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f: any) => {
                  const stato = STATO_CONFIG[f.stato] || STATO_CONFIG.bozza;
                  const StatoIcon = stato.icon;
                  return (
                    <tr key={f.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">{f.numero}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.data_fattura}</td>
                      <td className="px-4 py-3 text-foreground">{f.cliente?.ragione_sociale || "—"}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{formatCurrency(f.imponibile)}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{formatCurrency(f.iva)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">{formatCurrency(f.totale)}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 text-xs ${stato.color}`}>
                          <StatoIcon className="h-3.5 w-3.5" />
                          {stato.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setViewItem(f); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors" title="Modifica">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {f.stato === "bozza" && (
                            <button onClick={() => { if (confirm("Eliminare?")) deleteMutation.mutate(f.id); }} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Elimina">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
        <FatturaVenditaFormDialog
          item={viewItem}
          tenantId={tenantId}
          onClose={() => { setShowForm(false); setViewItem(null); }}
        />
      )}
    </div>
  );
}
