import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, Printer, Search, Package, ArrowLeftRight, Globe } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const PAGE_SIZE = 100;

export function DevIntermediarioModule() {
  const [movSearch, setMovSearch] = useState("");
  const [movPage, setMovPage] = useState(0);
  const [cerFilter, setCerFilter] = useState("all");

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

  const cerList = useMemo(() => {
    if (!movimentiData) return [];
    const set = new Set(movimentiData.map((m: any) => m.cer));
    return Array.from(set).sort();
  }, [movimentiData]);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
}
