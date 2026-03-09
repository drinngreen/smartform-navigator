import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Truck, FileText, Printer, FileSpreadsheet } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

export function DevLogisticaModule() {
  const [targa, setTarga] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");

  // Search FIR by targa
  const { data: firResults, isLoading } = useQuery({
    queryKey: ["dev-fir-targa", searchTrigger],
    queryFn: async () => {
      if (!searchTrigger) return [];
      const { data, error } = await supabase
        .from("fir_forms")
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .or(`trasportatore_targa_automezzo.ilike.%${searchTrigger}%,trasportatore_targa_rimorchio.ilike.%${searchTrigger}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!searchTrigger,
  });

  // Closed FIRs for invoicing
  const { data: closedFirs } = useQuery({
    queryKey: ["dev-fir-closed", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fir_forms")
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("status", "completato")
        .order("completed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleSearch = () => {
    if (targa.trim().length >= 2) setSearchTrigger(targa.trim().toUpperCase());
  };

  const handleGenerateInvoice = (fir: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Fattura da FIR</title>
      <style>
        body { font-family: Arial; padding: 30px; }
        .header { border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
        .header h1 { color: #16a34a; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f0fdf4; }
        .totals { text-align: right; font-size: 18px; margin-top: 20px; }
      </style></head><body>
      <div class="header">
        <h1>MULTYPROGET S.R.L.</h1>
        <p>Fattura Proforma da FIR</p>
      </div>
      <p><strong>Cliente:</strong> ${fir.produttore_denominazione || "N/D"}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString("it-IT")}</p>
      <p><strong>FIR N°:</strong> ${fir.numero_fir || "N/D"}</p>
      <table>
        <thead><tr><th>Descrizione</th><th>CER</th><th>Quantità (kg)</th><th>Prezzo</th></tr></thead>
        <tbody>
          <tr>
            <td>Trasporto e smaltimento rifiuti</td>
            <td>${fir.codice_eer || "-"}</td>
            <td>${fir.quantita || "-"}</td>
            <td>Da definire</td>
          </tr>
        </tbody>
      </table>
      <div class="totals"><strong>Targa:</strong> ${fir.trasportatore_targa_automezzo || "-"}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="bg-card/60 border-emerald-500/30">
        <CardHeader><CardTitle className="text-emerald-400 flex items-center gap-2"><Search className="h-5 w-5" /> Ricerca per Targa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Es. AB123CD"
              value={targa}
              onChange={(e) => setTarga(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-xs bg-card/60 border-border/50 font-mono"
            />
            <Button onClick={handleSearch} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Search className="h-4 w-4" />
              Cerca
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchTrigger && (
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-400" />
                Risultati per "{searchTrigger}" — {firResults?.length ?? 0} FIR trovati
              </CardTitle>
              {firResults && firResults.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const cols = [
                      { header: "N° FIR", key: "numero_fir", width: 16 },
                      { header: "Produttore", key: "produttore_denominazione", width: 24 },
                      { header: "CER", key: "codice_eer", width: 12 },
                      { header: "Targa", key: "trasportatore_targa_automezzo", width: 14 },
                      { header: "Stato", key: "status", width: 12 },
                      { header: "Data", key: "created_at", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
                    ];
                    exportToExcel(firResults, cols, `fir-targa-${searchTrigger}`, "Ricerca Targa");
                  }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                    <FileSpreadsheet className="h-3 w-3" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const cols = [
                      { header: "N° FIR", key: "numero_fir", width: 16 },
                      { header: "Produttore", key: "produttore_denominazione", width: 24 },
                      { header: "CER", key: "codice_eer", width: 12 },
                      { header: "Targa", key: "trasportatore_targa_automezzo", width: 14 },
                      { header: "Stato", key: "status", width: 12 },
                      { header: "Data", key: "created_at", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
                    ];
                    exportToPdf(firResults, cols, `fir-targa-${searchTrigger}`, `FIR per Targa ${searchTrigger}`);
                  }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                    <Printer className="h-3 w-3" /> PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Ricerca in corso...</p>
            ) : !firResults?.length ? (
              <p className="text-muted-foreground text-sm">Nessun FIR trovato per questa targa.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-2 px-3">N° FIR</th>
                      <th className="text-left py-2 px-3">Produttore</th>
                      <th className="text-left py-2 px-3">CER</th>
                      <th className="text-left py-2 px-3">Targa</th>
                      <th className="text-left py-2 px-3">Stato</th>
                      <th className="text-left py-2 px-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firResults.map((f) => (
                      <tr key={f.id} className="border-b border-border/10 hover:bg-white/5">
                        <td className="py-2 px-3 font-mono text-emerald-300">{f.numero_fir || "-"}</td>
                        <td className="py-2 px-3">{f.produttore_denominazione || "-"}</td>
                        <td className="py-2 px-3">{f.codice_eer || "-"}</td>
                        <td className="py-2 px-3 font-mono">{f.trasportatore_targa_automezzo || "-"}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            f.status === "completato" ? "bg-emerald-500/20 text-emerald-400" :
                            f.status === "in_viaggio" ? "bg-blue-500/20 text-blue-400" :
                            "bg-amber-500/20 text-amber-400"
                          }`}>{f.status}</span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {new Date(f.created_at).toLocaleDateString("it-IT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fatturazione from closed FIR */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              FIR Chiusi — Pronti per Fatturazione ({closedFirs?.length ?? 0})
            </CardTitle>
            {closedFirs && closedFirs.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const cols = [
                    { header: "N° FIR", key: "numero_fir", width: 16 },
                    { header: "Produttore", key: "produttore_denominazione", width: 24 },
                    { header: "CER", key: "codice_eer", width: 12 },
                    { header: "Peso (kg)", key: "quantita", width: 14 },
                    { header: "Completato", key: "completed_at", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                  ];
                  exportToExcel(closedFirs, cols, "fir-chiusi-dev", "FIR Chiusi");
                }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const cols = [
                    { header: "N° FIR", key: "numero_fir", width: 16 },
                    { header: "Produttore", key: "produttore_denominazione", width: 24 },
                    { header: "CER", key: "codice_eer", width: 12 },
                    { header: "Peso (kg)", key: "quantita", width: 14 },
                    { header: "Completato", key: "completed_at", width: 14, format: (v: any) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                  ];
                  exportToPdf(closedFirs, cols, "fir-chiusi-dev", "FIR Chiusi — Pronti per Fatturazione");
                }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <Printer className="h-3 w-3" /> PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!closedFirs?.length ? (
            <p className="text-muted-foreground text-sm">Nessun FIR completato disponibile per la fatturazione.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-3">N° FIR</th>
                    <th className="text-left py-2 px-3">Produttore</th>
                    <th className="text-left py-2 px-3">CER</th>
                    <th className="text-right py-2 px-3">Peso (kg)</th>
                    <th className="text-left py-2 px-3">Completato</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {closedFirs.slice(0, 20).map((f) => (
                    <tr key={f.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="py-2 px-3 font-mono text-emerald-300">{f.numero_fir || "-"}</td>
                      <td className="py-2 px-3">{f.produttore_denominazione || "-"}</td>
                      <td className="py-2 px-3">{f.codice_eer || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold">{f.quantita || "-"}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {f.completed_at ? new Date(f.completed_at).toLocaleDateString("it-IT") : "-"}
                      </td>
                      <td className="py-2 px-3">
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateInvoice(f)} className="gap-1 text-emerald-400 hover:text-emerald-300">
                          <Printer className="h-3 w-3" /> Fattura
                        </Button>
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
