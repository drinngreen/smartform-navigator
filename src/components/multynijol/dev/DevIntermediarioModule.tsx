import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Eye, FileText, TrendingUp, FileSpreadsheet, Printer } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

export function DevIntermediarioModule() {
  // Read-only view of Global Reco FIR forms
  const { data: globalFirs, isLoading } = useQuery({
    queryKey: ["dev-global-firs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fir_forms")
        .select("id, numero_fir, produttore_denominazione, destinatario_denominazione, codice_eer, quantita, status, created_at, trasportatore_targa_automezzo")
        .eq("tenant_id", GLOBAL_TENANT_ID)
        .eq("deleted_by_user", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Supabase default limit is 1000, fetch all pages if needed
      let allData = data || [];
      if (allData.length === 1000) {
        let page = 1;
        while (true) {
          const { data: more, error: moreErr } = await supabase
            .from("fir_forms")
            .select("id, numero_fir, produttore_denominazione, destinatario_denominazione, codice_eer, quantita, status, created_at, trasportatore_targa_automezzo")
            .eq("tenant_id", GLOBAL_TENANT_ID)
            .eq("deleted_by_user", false)
            .order("created_at", { ascending: false })
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (moreErr || !more?.length) break;
          allData = [...allData, ...more];
          if (more.length < 1000) break;
          page++;
        }
      }
      return allData;
    },
  });

  // Intermediazioni for Multy
  const { data: intermediazioni } = useQuery({
    queryKey: ["dev-intermediazioni", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intermediazioni")
        .select("*, intermediario:intermediari(ragione_sociale)")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    globalTotal: globalFirs?.length ?? 0,
    globalCompletati: globalFirs?.filter(f => f.status === "completato").length ?? 0,
    intermediazioni: intermediazioni?.length ?? 0,
    fatturate: intermediazioni?.filter(i => i.fatturata).length ?? 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">FIR Global Reco</p>
              <p className="text-2xl font-bold text-blue-400">{stats.globalTotal}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Completati</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.globalCompletati}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">Intermediazioni</p>
              <p className="text-2xl font-bold text-amber-400">{stats.intermediazioni}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">Fatturate</p>
              <p className="text-2xl font-bold text-purple-400">{stats.fatturate}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Reco read-only view */}
      <Card className="bg-card/60 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Global Reco (Sola Lettura)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (!globalFirs?.length) return;
                const cols = [
                  { header: "N° FIR", key: "numero_fir", width: 16 },
                  { header: "Produttore", key: "produttore_denominazione", width: 24 },
                  { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
                  { header: "CER", key: "codice_eer", width: 12 },
                  { header: "Targa", key: "trasportatore_targa_automezzo", width: 14 },
                  { header: "Stato", key: "status", width: 12 },
                  { header: "Data", key: "created_at", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
                ];
                exportToExcel(globalFirs, cols, "global-reco-fir", "FIR Global Reco");
              }} className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (!globalFirs?.length) return;
                const cols = [
                  { header: "N° FIR", key: "numero_fir", width: 16 },
                  { header: "Produttore", key: "produttore_denominazione", width: 24 },
                  { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
                  { header: "CER", key: "codice_eer", width: 12 },
                  { header: "Targa", key: "trasportatore_targa_automezzo", width: 14 },
                  { header: "Stato", key: "status", width: 12 },
                  { header: "Data", key: "created_at", width: 12, format: (v: any) => new Date(v).toLocaleDateString("it-IT") },
                ];
                exportToPdf(globalFirs, cols, "global-reco-fir", "FIR Global Reco");
              }} className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Printer className="h-3 w-3" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Caricamento...</p>
          ) : !globalFirs?.length ? (
            <p className="text-muted-foreground text-sm">Nessun FIR Global Reco disponibile.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-3">N° FIR</th>
                    <th className="text-left py-2 px-3">Produttore</th>
                    <th className="text-left py-2 px-3">Destinatario</th>
                    <th className="text-left py-2 px-3">CER</th>
                    <th className="text-left py-2 px-3">Targa</th>
                    <th className="text-left py-2 px-3">Stato</th>
                    <th className="text-left py-2 px-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {globalFirs.map((f) => (
                    <tr key={f.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="py-2 px-3 font-mono text-blue-300">{f.numero_fir || "-"}</td>
                      <td className="py-2 px-3">{f.produttore_denominazione || "-"}</td>
                      <td className="py-2 px-3">{f.destinatario_denominazione || "-"}</td>
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

      {/* Intermediazioni Multy */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Intermediazioni Multyproget ({intermediazioni?.length ?? 0})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (!intermediazioni?.length) return;
                const cols = [
                  { header: "Intermediario", key: "intermediario_nome", width: 22 },
                  { header: "CER", key: "cer", width: 12 },
                  { header: "Q.tà (kg)", key: "quantita_effettiva_kg", width: 14 },
                  { header: "Provvigione", key: "importo_provvigione", width: 14, format: (v: any) => `€${Number(v || 0).toFixed(2)}` },
                  { header: "Stato", key: "stato", width: 12 },
                  { header: "Fatturata", key: "fatturata", width: 10, format: (v: any) => v ? "Sì" : "No" },
                ];
                const rows = intermediazioni.map(i => ({ ...i, intermediario_nome: (i as any).intermediario?.ragione_sociale || "-" }));
                exportToExcel(rows, cols, "intermediazioni-multy-dev", "Intermediazioni");
              }} className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (!intermediazioni?.length) return;
                const cols = [
                  { header: "Intermediario", key: "intermediario_nome", width: 22 },
                  { header: "CER", key: "cer", width: 12 },
                  { header: "Q.tà (kg)", key: "quantita_effettiva_kg", width: 14 },
                  { header: "Provvigione", key: "importo_provvigione", width: 14, format: (v: any) => `€${Number(v || 0).toFixed(2)}` },
                  { header: "Stato", key: "stato", width: 12 },
                  { header: "Fatturata", key: "fatturata", width: 10, format: (v: any) => v ? "Sì" : "No" },
                ];
                const rows = intermediazioni.map(i => ({ ...i, intermediario_nome: (i as any).intermediario?.ragione_sociale || "-" }));
                exportToPdf(rows, cols, "intermediazioni-multy-dev", "Intermediazioni Multyproget");
              }} className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                <Printer className="h-3 w-3" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!intermediazioni?.length ? (
            <p className="text-muted-foreground text-sm">Nessuna intermediazione registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-2 px-3">Intermediario</th>
                    <th className="text-left py-2 px-3">CER</th>
                    <th className="text-right py-2 px-3">Q.tà (kg)</th>
                    <th className="text-right py-2 px-3">Provvigione</th>
                    <th className="text-left py-2 px-3">Stato</th>
                    <th className="text-left py-2 px-3">Fatturata</th>
                  </tr>
                </thead>
                <tbody>
                  {intermediazioni.map((i) => (
                    <tr key={i.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="py-2 px-3">{(i as any).intermediario?.ragione_sociale || "-"}</td>
                      <td className="py-2 px-3 font-mono">{i.cer || "-"}</td>
                      <td className="py-2 px-3 text-right">{i.quantita_effettiva_kg || i.quantita_stimata_kg || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold text-amber-400">€{Number(i.importo_provvigione || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">{i.stato}</td>
                      <td className="py-2 px-3">
                        <span className={i.fatturata ? "text-emerald-400" : "text-muted-foreground"}>
                          {i.fatturata ? "✓" : "—"}
                        </span>
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
