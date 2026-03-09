import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, RefreshCw, Package, ArrowDown, ArrowUp, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

export function DevGiacenzeModule() {
  const queryClient = useQueryClient();
  const [searchCer, setSearchCer] = useState("");

  // Fetch giacenze
  const { data: giacenze, isLoading } = useQuery({
    queryKey: ["dev-giacenze", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("magazzino_giacenze")
        .select("*, impianto:impianti(nome)")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("cer");
      if (error) throw error;
      return data;
    },
  });

  // Fetch movimenti for real-time calculation
  const { data: movimenti } = useQuery({
    queryKey: ["dev-movimenti-impianto", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_impianto")
        .select("cer, tipo_movimento, quantita_kg, impianto_id")
        .eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return data;
    },
  });

  // Recalculate from movements
  const recalculate = useMutation({
    mutationFn: async () => {
      if (!movimenti) return;
      const stock: Record<string, { cer: string; impianto_id: string; carico: number; scarico: number }> = {};
      for (const m of movimenti) {
        const key = `${m.impianto_id}_${m.cer}`;
        if (!stock[key]) stock[key] = { cer: m.cer, impianto_id: m.impianto_id, carico: 0, scarico: 0 };
        if (m.tipo_movimento === "CARICO") stock[key].carico += Number(m.quantita_kg);
        else stock[key].scarico += Number(m.quantita_kg);
      }
      for (const [, v] of Object.entries(stock)) {
        const qty = v.carico - v.scarico;
        const { error } = await supabase.from("magazzino_giacenze").upsert({
          tenant_id: MULTY_TENANT_ID,
          impianto_id: v.impianto_id,
          cer: v.cer,
          quantita_kg: qty,
          ultimo_carico_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,impianto_id,cer" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
      toast.success("Giacenze ricalcolate dai movimenti");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const handlePrintPDF = () => {
    const filtered = filteredGiacenze;
    if (!filtered?.length) return toast.error("Nessuna giacenza da stampare");
    
    // Simple PDF via printable page
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Giacenze Multyproget</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #16a34a; color: white; }
        h1 { color: #16a34a; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style></head><body>
      <h1>📦 Giacenze Magazzino — Multyproget</h1>
      <p>Data: ${new Date().toLocaleDateString("it-IT")}</p>
      <table>
        <thead><tr><th>CER</th><th>Impianto</th><th>Quantità (kg)</th></tr></thead>
        <tbody>
          ${filtered.map(g => `<tr><td>${g.cer}</td><td>${(g as any).impianto?.nome || "-"}</td><td>${Number(g.quantita_kg).toLocaleString("it-IT")}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="footer">Generato da Multy Niyol — Centro di Comando</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const filteredGiacenze = giacenze?.filter(g =>
    !searchCer || g.cer.includes(searchCer)
  );

  const totaleKg = filteredGiacenze?.reduce((sum, g) => sum + Number(g.quantita_kg), 0) ?? 0;
  const positiveCers = filteredGiacenze?.filter(g => Number(g.quantita_kg) > 0).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Codici CER in Stock</p>
              <p className="text-2xl font-bold text-emerald-400">{positiveCers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDown className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Totale in Giacenza</p>
              <p className="text-2xl font-bold text-blue-400">{totaleKg.toLocaleString("it-IT")} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUp className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Movimenti Totali</p>
              <p className="text-2xl font-bold text-amber-400">{movimenti?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Filtra per CER..."
          value={searchCer}
          onChange={(e) => setSearchCer(e.target.value)}
          className="max-w-xs bg-card/60 border-border/50"
        />
        <Button variant="outline" onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <RefreshCw className="h-4 w-4" />
          Ricalcola Giacenze
        </Button>
        <Button variant="outline" onClick={handlePrintPDF} className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-4 w-4" />
          Stampa Giacenze
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader><CardTitle className="text-emerald-400">📦 Stock per Codice CER</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : !filteredGiacenze?.length ? (
            <p className="text-muted-foreground text-sm">Nessuna giacenza trovata. Clicca "Ricalcola Giacenze" per popolare dai movimenti.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-3">CER</th>
                    <th className="text-left py-2 px-3">Impianto</th>
                    <th className="text-right py-2 px-3">Quantità (kg)</th>
                    <th className="text-left py-2 px-3">Ultimo Aggiornamento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiacenze.map((g) => (
                    <tr key={g.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="py-2 px-3 font-mono text-emerald-300">{g.cer}</td>
                      <td className="py-2 px-3">{(g as any).impianto?.nome || "-"}</td>
                      <td className={`py-2 px-3 text-right font-bold ${Number(g.quantita_kg) > 0 ? "text-emerald-400" : Number(g.quantita_kg) < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {Number(g.quantita_kg).toLocaleString("it-IT")}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {g.updated_at ? new Date(g.updated_at).toLocaleDateString("it-IT") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
