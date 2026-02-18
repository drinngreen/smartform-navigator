import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportUtils";

interface MastrinoDialogProps {
  contoId: string;
  tenantId?: string;
  onClose: () => void;
}

export function MastrinoDialog({ contoId, tenantId, onClose }: MastrinoDialogProps) {
  const { data: conto } = useQuery({
    queryKey: ["erp-conto-detail", contoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("erp_piano_conti" as any).select("*").eq("id", contoId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: righe = [], isLoading } = useQuery({
    queryKey: ["erp-mastrino", contoId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("erp_prima_nota_righe" as any)
        .select("*, prima_nota:erp_prima_nota!erp_prima_nota_righe_prima_nota_id_fkey(data_registrazione, numero_registro, descrizione, tenant_id)")
        .eq("conto_id", contoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      let filtered = data as any[];
      if (tenantId) {
        filtered = filtered.filter((r: any) => r.prima_nota?.tenant_id === tenantId);
      }
      return filtered;
    },
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

  // Calculate progressive balance
  let saldoProgressivo = 0;
  const rows = righe.map((r: any) => {
    const dare = r.segno === "DARE" ? Number(r.importo) : 0;
    const avere = r.segno === "AVERE" ? Number(r.importo) : 0;
    saldoProgressivo += dare - avere;
    return { ...r, dare, avere, saldo: saldoProgressivo };
  });

  const handleExport = () => {
    exportToExcel(rows, [
      { header: "Data", key: "prima_nota", width: 12, format: (_: any, row: any) => row.prima_nota?.data_registrazione || "" },
      { header: "N. Reg.", key: "prima_nota", width: 8, format: (_: any, row: any) => String(row.prima_nota?.numero_registro || "") },
      { header: "Descrizione", key: "prima_nota", width: 35, format: (_: any, row: any) => row.prima_nota?.descrizione || "" },
      { header: "Dare", key: "dare", width: 14, format: (v: number) => v > 0 ? v.toFixed(2) : "" },
      { header: "Avere", key: "avere", width: 14, format: (v: number) => v > 0 ? v.toFixed(2) : "" },
      { header: "Saldo", key: "saldo", width: 14, format: (v: number) => v.toFixed(2) },
    ], `mastrino-${conto?.codice || "conto"}`, "Mastrino");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card border border-border/30 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Mastrino: {conto?.codice} — {conto?.descrizione}
            </h2>
            <p className="text-xs text-muted-foreground">Saldo finale: {formatCurrency(saldoProgressivo)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground" title="Esporta">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/20 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Caricamento...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nessun movimento per questo conto</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground">N.</th>
                    <th className="px-3 py-2 text-left text-xs font-mono uppercase text-muted-foreground">Descrizione</th>
                    <th className="px-3 py-2 text-right text-xs font-mono uppercase text-blue-400">Dare</th>
                    <th className="px-3 py-2 text-right text-xs font-mono uppercase text-green-400">Avere</th>
                    <th className="px-3 py-2 text-right text-xs font-mono uppercase text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => (
                    <tr key={r.id} className={`border-b border-border/10 ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="px-3 py-2 text-muted-foreground">{r.prima_nota?.data_registrazione}</td>
                      <td className="px-3 py-2 font-mono text-foreground">{r.prima_nota?.numero_registro}</td>
                      <td className="px-3 py-2 text-foreground">{r.descrizione_riga || r.prima_nota?.descrizione || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-400">{r.dare > 0 ? formatCurrency(r.dare) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono text-green-400">{r.avere > 0 ? formatCurrency(r.avere) : ""}</td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${r.saldo >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
