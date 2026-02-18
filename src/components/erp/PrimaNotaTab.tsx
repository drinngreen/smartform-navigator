import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Trash2, Eye, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PrimaNotaFormDialog } from "./PrimaNotaFormDialog";
import { MastrinoDialog } from "./MastrinoDialog";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

interface PrimaNotaTabProps {
  tenantId?: string;
}

const DOC_LABELS: Record<string, string> = {
  FATTURA_VENDITA: "Fatt. Vendita",
  FATTURA_ACQUISTO: "Fatt. Acquisto",
  INCASSO: "Incasso",
  PAGAMENTO: "Pagamento",
  GIROCONTO: "Giroconto",
  STIPENDI: "Stipendi",
  AMMORTAMENTO: "Ammortamento",
  MANUALE: "Manuale",
};

export function PrimaNotaTab({ tenantId }: PrimaNotaTabProps) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("tutti");
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState<any>(null);
  const [mastrinoContoId, setMastrinoContoId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: scritture = [], isLoading } = useQuery({
    queryKey: ["erp-prima-nota", tenantId],
    queryFn: async () => {
      const q = supabase
        .from("erp_prima_nota" as any)
        .select("*, causale:erp_causali_contabili!erp_prima_nota_causale_id_fkey(codice, descrizione)")
        .order("data_registrazione", { ascending: false })
        .order("numero_registro", { ascending: false });
      if (tenantId) (q as any).eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: righeMap = {} } = useQuery({
    queryKey: ["erp-prima-nota-righe", scritture.map((s: any) => s.id).join(",")],
    enabled: scritture.length > 0,
    queryFn: async () => {
      const ids = scritture.map((s: any) => s.id);
      const { data, error } = await supabase
        .from("erp_prima_nota_righe" as any)
        .select("*, conto:erp_piano_conti!erp_prima_nota_righe_conto_id_fkey(codice, descrizione)")
        .in("prima_nota_id", ids);
      if (error) throw error;
      const map: Record<string, any[]> = {};
      (data as any[]).forEach((r: any) => {
        if (!map[r.prima_nota_id]) map[r.prima_nota_id] = [];
        map[r.prima_nota_id].push(r);
      });
      return map;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erp_prima_nota" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-prima-nota"] });
      toast.success("Scrittura eliminata");
    },
    onError: () => toast.error("Errore eliminazione"),
  });

  const filtered = scritture.filter((s: any) => {
    const matchSearch = !search || s.descrizione?.toLowerCase().includes(search.toLowerCase()) || String(s.numero_registro).includes(search);
    const matchTipo = filterTipo === "tutti" || s.documento_tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);

  const totaleDare = Object.values(righeMap).flat().filter((r: any) => r.segno === "DARE").reduce((s: number, r: any) => s + Number(r.importo), 0);
  const totaleAvere = Object.values(righeMap).flat().filter((r: any) => r.segno === "AVERE").reduce((s: number, r: any) => s + Number(r.importo), 0);

  const exportColumns = [
    { header: "N. Reg.", key: "numero_registro", width: 8 },
    { header: "Data", key: "data_registrazione", width: 12 },
    { header: "Descrizione", key: "descrizione", width: 40 },
    { header: "Tipo", key: "documento_tipo", width: 15, format: (v: string) => DOC_LABELS[v] || v || "—" },
    { header: "Causale", key: "causale", width: 15, format: (_: any, row: any) => row.causale?.descrizione || "—" },
  ];

  const handleExportExcel = () => exportToExcel(filtered, exportColumns, "prima-nota", "Prima Nota");
  const handleExportPdf = () => exportToPdf(filtered, exportColumns, "prima-nota", "Prima Nota");

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per descrizione o numero..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground"
        >
          <option value="tutti">Tutti i tipi</option>
          {Object.entries(DOC_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={handleExportExcel} className="p-2 rounded-xl bg-background/60 border border-border/30 text-muted-foreground hover:text-foreground transition-colors" title="Esporta Excel">
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setViewItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuova Scrittura
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Scritture", value: scritture.length, color: "text-foreground" },
          { label: "Manuali", value: scritture.filter((s: any) => s.documento_tipo === "MANUALE").length, color: "text-yellow-400" },
          { label: "Totale Dare", value: formatCurrency(totaleDare), color: "text-blue-400" },
          { label: "Totale Avere", value: formatCurrency(totaleAvere), color: "text-green-400" },
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
          <div className="p-8 text-center text-muted-foreground">Nessuna scrittura trovata</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-left">
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">N.</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Descrizione</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Causale</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Dare</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Avere</th>
                  <th className="px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const righe = righeMap[s.id] || [];
                  const dare = righe.filter((r: any) => r.segno === "DARE").reduce((sum: number, r: any) => sum + Number(r.importo), 0);
                  const avere = righe.filter((r: any) => r.segno === "AVERE").reduce((sum: number, r: any) => sum + Number(r.importo), 0);
                  return (
                    <tr key={s.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">{s.numero_registro}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.data_registrazione}</td>
                      <td className="px-4 py-3 text-foreground max-w-[300px] truncate">{s.descrizione}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{DOC_LABELS[s.documento_tipo] || s.documento_tipo || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.causale?.descrizione || "—"}</td>
                      <td className="px-4 py-3 font-mono text-blue-400">{formatCurrency(dare)}</td>
                      <td className="px-4 py-3 font-mono text-green-400">{formatCurrency(avere)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setViewItem(s); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors" title="Dettaglio">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {righe.length > 0 && (
                            <button onClick={() => setMastrinoContoId(righe[0]?.conto_id)} className="p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors" title="Mastrino">
                              <BookOpen className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => { if (confirm("Eliminare questa scrittura?")) deleteMutation.mutate(s.id); }} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Elimina">
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
        <PrimaNotaFormDialog
          item={viewItem}
          tenantId={tenantId}
          onClose={() => { setShowForm(false); setViewItem(null); }}
        />
      )}

      {mastrinoContoId && (
        <MastrinoDialog
          contoId={mastrinoContoId}
          tenantId={tenantId}
          onClose={() => setMastrinoContoId(null)}
        />
      )}
    </div>
  );
}
