import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Eye, FileText, TrendingUp, FileSpreadsheet, Printer, Search, Package, ArrowLeftRight } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const GLOBAL_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const PAGE_SIZE = 100;

export function DevIntermediarioModule() {
  const [movSearch, setMovSearch] = useState("");
  const [movPage, setMovPage] = useState(0);
  const [cerFilter, setCerFilter] = useState("all");

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
        .from("intermediazioni" as any)
        .select("*, intermediario:intermediari(ragione_sociale)")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Movimenti intermediario - fetch all with pagination
  const { data: movimentiData, isLoading: movLoading } = useQuery({
    queryKey: ["dev-movimenti-intermediario", MULTY_TENANT_ID],
    queryFn: async () => {
      let allData: any[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("movimenti_intermediario" as any)
          .select("id, data_movimento, cer, descrizione_rifiuto, quantita_kg, numero_fir, produttore_denominazione, destinatario_denominazione, tipo_movimento")
          .eq("tenant_id", MULTY_TENANT_ID)
          .order("data_movimento", { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        allData = [...allData, ...(data || [])];
        if (!data || data.length < 1000) break;
        page++;
      }
      return allData as any[];
    },
  });

  // Unique CER list from movements
  const cerList = useMemo(() => {
    if (!movimentiData) return [];
    const set = new Set(movimentiData.map((m: any) => m.cer));
    return Array.from(set).sort();
  }, [movimentiData]);

  // Filtered movements
  const filteredMovimenti = useMemo(() => {
    if (!movimentiData) return [];
    return movimentiData.filter((m: any) => {
      if (cerFilter !== "all" && m.cer !== cerFilter) return false;
      if (movSearch) {
        const s = movSearch.toLowerCase();
        return (
          (m.numero_fir || "").toLowerCase().includes(s) ||
          (m.produttore_denominazione || "").toLowerCase().includes(s) ||
          (m.destinatario_denominazione || "").toLowerCase().includes(s) ||
          (m.cer || "").includes(s)
        );
      }
      return true;
    });
  }, [movimentiData, movSearch, cerFilter]);

  const paginatedMovimenti = filteredMovimenti.slice(movPage * PAGE_SIZE, (movPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredMovimenti.length / PAGE_SIZE);

  // Stats
  const movStats = useMemo(() => {
    if (!movimentiData) return { totale: 0, kgTotali: 0, cerUnici: 0, produttoriUnici: 0 };
    const prods = new Set(movimentiData.map((m: any) => m.produttore_denominazione));
    return {
      totale: movimentiData.length,
      kgTotali: movimentiData.reduce((s: number, m: any) => s + Number(m.quantita_kg || 0), 0),
      cerUnici: cerList.length,
      produttoriUnici: prods.size,
    };
  }, [movimentiData, cerList]);

  const stats = {
    globalTotal: globalFirs?.length ?? 0,
    globalCompletati: globalFirs?.filter(f => f.status === "completato").length ?? 0,
    intermediazioni: intermediazioni?.length ?? 0,
    fatturate: intermediazioni?.filter((i: any) => i.fatturata).length ?? 0,
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="movimenti">
        <TabsList className="bg-card/60 border border-border/30 p-1">
          <TabsTrigger value="movimenti" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
            <ArrowLeftRight className="h-4 w-4" /> Movimenti ({movStats.totale.toLocaleString("it-IT")})
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
            <Eye className="h-4 w-4" /> Global Reco
          </TabsTrigger>
          <TabsTrigger value="intermediazioni" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <TrendingUp className="h-4 w-4" /> Intermediazioni
          </TabsTrigger>
        </TabsList>

        {/* MOVIMENTI TAB */}
        <TabsContent value="movimenti" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><ArrowLeftRight className="h-8 w-8 text-emerald-400" /><div><p className="text-xs text-muted-foreground">Movimenti Totali</p><p className="text-2xl font-bold text-emerald-400">{movStats.totale.toLocaleString("it-IT")}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><Package className="h-8 w-8 text-blue-400" /><div><p className="text-xs text-muted-foreground">Kg Totali</p><p className="text-2xl font-bold text-blue-400">{Math.round(movStats.kgTotali).toLocaleString("it-IT")}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><FileText className="h-8 w-8 text-amber-400" /><div><p className="text-xs text-muted-foreground">CER Unici</p><p className="text-2xl font-bold text-amber-400">{movStats.cerUnici}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><Globe className="h-8 w-8 text-purple-400" /><div><p className="text-xs text-muted-foreground">Produttori</p><p className="text-2xl font-bold text-purple-400">{movStats.produttoriUnici}</p></div></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca FIR, produttore, destinatario..." value={movSearch} onChange={e => { setMovSearch(e.target.value); setMovPage(0); }} className="pl-10 bg-card/60 border-border/50" />
            </div>
            <Select value={cerFilter} onValueChange={v => { setCerFilter(v); setMovPage(0); }}>
              <SelectTrigger className="w-48 bg-card/60 border-border/50"><SelectValue placeholder="Tutti i CER" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i CER</SelectItem>
                {cerList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => {
              if (!filteredMovimenti.length) return;
              const cols = [
                { header: "Data", key: "data_movimento", width: 12 },
                { header: "CER", key: "cer", width: 10 },
                { header: "Descrizione", key: "descrizione_rifiuto", width: 22 },
                { header: "Kg", key: "quantita_kg", width: 12 },
                { header: "N° FIR", key: "numero_fir", width: 16 },
                { header: "Produttore", key: "produttore_denominazione", width: 24 },
                { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
              ];
              exportToExcel(filteredMovimenti, cols, "movimenti-intermediario-multy", "Movimenti Intermediario");
            }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <FileSpreadsheet className="h-3 w-3" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (!filteredMovimenti.length) return;
              const cols = [
                { header: "Data", key: "data_movimento", width: 12 },
                { header: "CER", key: "cer", width: 10 },
                { header: "Kg", key: "quantita_kg", width: 12 },
                { header: "N° FIR", key: "numero_fir", width: 16 },
                { header: "Produttore", key: "produttore_denominazione", width: 24 },
                { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
              ];
              exportToPdf(filteredMovimenti, cols, "movimenti-intermediario-multy", "Movimenti Intermediario Multyproget");
            }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <Printer className="h-3 w-3" /> PDF
            </Button>
          </div>

          {/* Table */}
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-0">
              {movLoading ? (
                <p className="text-muted-foreground text-sm p-4">Caricamento {movStats.totale > 0 ? movStats.totale.toLocaleString("it-IT") : ""} movimenti...</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30 text-muted-foreground">
                          <th className="text-left py-2 px-3">Data</th>
                          <th className="text-left py-2 px-3">CER</th>
                          <th className="text-left py-2 px-3">Descrizione</th>
                          <th className="text-right py-2 px-3">Kg</th>
                          <th className="text-left py-2 px-3">N° FIR</th>
                          <th className="text-left py-2 px-3">Produttore</th>
                          <th className="text-left py-2 px-3">Destinatario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedMovimenti.map((m: any) => (
                          <tr key={m.id} className="border-b border-border/10 hover:bg-white/5">
                            <td className="py-2 px-3 text-xs text-muted-foreground">{m.data_movimento}</td>
                            <td className="py-2 px-3 font-mono text-emerald-300">{m.cer}</td>
                            <td className="py-2 px-3 text-xs max-w-[200px] truncate">{m.descrizione_rifiuto || "-"}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{Number(m.quantita_kg).toLocaleString("it-IT")}</td>
                            <td className="py-2 px-3 font-mono text-blue-300 text-xs">{m.numero_fir || "-"}</td>
                            <td className="py-2 px-3 text-xs max-w-[180px] truncate">{m.produttore_denominazione || "-"}</td>
                            <td className="py-2 px-3 text-xs max-w-[180px] truncate">{m.destinatario_denominazione || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
                    <p className="text-xs text-muted-foreground">
                      {filteredMovimenti.length.toLocaleString("it-IT")} movimenti — Pagina {movPage + 1} di {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={movPage === 0} onClick={() => setMovPage(p => p - 1)} className="text-xs">← Prec</Button>
                      <Button variant="outline" size="sm" disabled={movPage >= totalPages - 1} onClick={() => setMovPage(p => p + 1)} className="text-xs">Succ →</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GLOBAL RECO TAB */}
        <TabsContent value="global" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-blue-500/30"><CardContent className="p-4 flex items-center gap-3"><Globe className="h-8 w-8 text-blue-400" /><div><p className="text-xs text-muted-foreground">FIR Global Reco</p><p className="text-2xl font-bold text-blue-400">{stats.globalTotal}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><FileText className="h-8 w-8 text-emerald-400" /><div><p className="text-xs text-muted-foreground">Completati</p><p className="text-2xl font-bold text-emerald-400">{stats.globalCompletati}</p></div></CardContent></Card>
          </div>
          <Card className="bg-card/60 border-blue-500/30">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-blue-400 flex items-center gap-2"><Eye className="h-5 w-5" /> Vista Global Reco (Sola Lettura)</CardTitle>
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
                  }} className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"><FileSpreadsheet className="h-3 w-3" /> Excel</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <p className="text-muted-foreground text-sm">Caricamento...</p> : !globalFirs?.length ? <p className="text-muted-foreground text-sm">Nessun FIR.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-2 px-3">N° FIR</th><th className="text-left py-2 px-3">Produttore</th><th className="text-left py-2 px-3">Destinatario</th><th className="text-left py-2 px-3">CER</th><th className="text-left py-2 px-3">Targa</th><th className="text-left py-2 px-3">Stato</th><th className="text-left py-2 px-3">Data</th>
                    </tr></thead>
                    <tbody>
                      {globalFirs.map((f) => (
                        <tr key={f.id} className="border-b border-border/10 hover:bg-white/5">
                          <td className="py-2 px-3 font-mono text-blue-300">{f.numero_fir || "-"}</td>
                          <td className="py-2 px-3">{f.produttore_denominazione || "-"}</td>
                          <td className="py-2 px-3">{f.destinatario_denominazione || "-"}</td>
                          <td className="py-2 px-3">{f.codice_eer || "-"}</td>
                          <td className="py-2 px-3 font-mono">{f.trasportatore_targa_automezzo || "-"}</td>
                          <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${f.status === "completato" ? "bg-emerald-500/20 text-emerald-400" : f.status === "in_viaggio" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`}>{f.status}</span></td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{new Date(f.created_at).toLocaleDateString("it-IT")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTERMEDIAZIONI TAB */}
        <TabsContent value="intermediazioni" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-amber-500/30"><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-amber-400" /><div><p className="text-xs text-muted-foreground">Intermediazioni</p><p className="text-2xl font-bold text-amber-400">{stats.intermediazioni}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><Eye className="h-8 w-8 text-purple-400" /><div><p className="text-xs text-muted-foreground">Fatturate</p><p className="text-2xl font-bold text-purple-400">{stats.fatturate}</p></div></CardContent></Card>
          </div>
          <Card className="bg-card/60 border-border/30">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Intermediazioni Multyproget ({intermediazioni?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!intermediazioni?.length ? <p className="text-muted-foreground text-sm">Nessuna intermediazione registrata.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-2 px-3">Intermediario</th><th className="text-left py-2 px-3">CER</th><th className="text-right py-2 px-3">Q.tà (kg)</th><th className="text-right py-2 px-3">Provvigione</th><th className="text-left py-2 px-3">Stato</th><th className="text-left py-2 px-3">Fatturata</th>
                    </tr></thead>
                    <tbody>
                      {intermediazioni.map((i: any) => (
                        <tr key={i.id} className="border-b border-border/10 hover:bg-white/5">
                          <td className="py-2 px-3">{i.intermediario?.ragione_sociale || "-"}</td>
                          <td className="py-2 px-3 font-mono">{i.cer || "-"}</td>
                          <td className="py-2 px-3 text-right">{i.quantita_effettiva_kg || i.quantita_stimata_kg || "-"}</td>
                          <td className="py-2 px-3 text-right font-bold text-amber-400">€{Number(i.importo_provvigione || 0).toFixed(2)}</td>
                          <td className="py-2 px-3">{i.stato}</td>
                          <td className="py-2 px-3"><span className={i.fatturata ? "text-emerald-400" : "text-muted-foreground"}>{i.fatturata ? "✓" : "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
