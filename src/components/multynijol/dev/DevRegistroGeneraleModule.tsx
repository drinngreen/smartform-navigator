import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, Printer, Search, Package, ArrowUpDown, BookOpen } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const PAGE_SIZE = 100;

const registroColumns = [
  { header: "N. Int.", key: "numero_interno", width: 10, align: "left" },
  { header: "N. Movimento", key: "numero_movimento", width: 14, align: "left" },
  { header: "Data Mov.", key: "data_movimento", width: 12, align: "left" },
  { header: "C.E.R.", key: "cer", width: 10, align: "left" },
  { header: "Descrizione", key: "descrizione", width: 34, align: "left" },
  { header: "C./S.", key: "carico_scarico", width: 12, align: "left" },
  { header: "Tipo Operazione", key: "tipo_operazione", width: 24, align: "left" },
  { header: "Al RENTRI", key: "al_rentri", width: 10, align: "left" },
  { header: "N° Formulario", key: "numero_formulario", width: 18, align: "left" },
  { header: "+/-", key: "segno", width: 8, align: "left" },
  { header: "Quantità", key: "quantita", width: 12, align: "right" },
  { header: "Peso Destino", key: "peso_destino", width: 14, align: "right" },
  { header: "Qta. Scaricata", key: "qta_scaricata", width: 14, align: "right" },
  { header: "Data Ricezione", key: "data_ricezione", width: 14, align: "left" },
  { header: "Luogo di Produzione", key: "luogo_produzione", width: 30, align: "left" },
  { header: "Destinazione", key: "destinazione", width: 14, align: "left" },
  { header: "Classi Pericolo", key: "classi_pericolo", width: 18, align: "left" },
  { header: "Stato fisico", key: "stato_fisico", width: 12, align: "left" },
  { header: "Descrizione Tipica", key: "descrizione_tipica", width: 20, align: "left" },
  { header: "Scaricato", key: "scaricato", width: 12, align: "left" },
  { header: "Cod. Magazzino", key: "cod_magazzino", width: 14, align: "left" },
  { header: "Peso Lordo", key: "peso_lordo", width: 12, align: "right" },
  { header: "Tara", key: "tara", width: 10, align: "right" },
  { header: "Annotazioni", key: "annotazioni", width: 24, align: "left" },
  { header: "Nota Int.", key: "nota_int", width: 22, align: "left" },
  { header: "Cod. Intermed.", key: "cod_intermed", width: 14, align: "left" },
  { header: "Intermediario", key: "intermediario", width: 28, align: "left" },
  { header: "Indirizzo Intermed.", key: "indirizzo_intermed", width: 34, align: "left" },
  { header: "FlagNoMud", key: "flagnomud", width: 12, align: "left" },
  { header: "Origine Rifiuto", key: "origine_rifiuto", width: 16, align: "left" },
  { header: "CONAI", key: "conai", width: 10, align: "left" },
  { header: "Att. Orig. Rif.", key: "att_orig_rif", width: 28, align: "left" },
  { header: "Pseudonimo Cantiere", key: "pseudonimo_cantiere", width: 24, align: "left" },
  { header: "Indirizzo Cantiere", key: "indirizzo_cantiere", width: 30, align: "left" },
  { header: "CAP Cantiere", key: "cap_cantiere", width: 12, align: "left" },
  { header: "Comune Cantiere", key: "comune_cantiere", width: 20, align: "left" },
  { header: "Provincia Cantiere", key: "provincia_cantiere", width: 12, align: "left" },
  { header: "Emissione Formulario", key: "data_emissione_formulario", width: 18, align: "left" },
  { header: "Form. Urbano", key: "form_urbano", width: 12, align: "left" },
  { header: "DDT di Ingresso", key: "ddt_ingresso", width: 18, align: "left" },
  { header: "Data DDT di Ingresso", key: "data_ddt_ingresso", width: 20, align: "left" },
  { header: "Respinto", key: "respinto", width: 12, align: "left" },
] as const;

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (typeof value === "number") return value.toLocaleString("it-IT");
  return String(value);
};

export function DevRegistroGeneraleModule() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [cerFilter, setCerFilter] = useState("all");
  const [csFilter, setCsFilter] = useState("all");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["dev-registro-generale", MULTY_TENANT_ID],
    queryFn: async () => {
      let all: any[] = [];
      let p = 0;
      while (true) {
        const { data, error } = await supabase
          .from("registro_generale" as any)
          .select("id, numero_interno, numero_movimento, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, al_rentri, numero_formulario, segno, quantita, peso_destino, qta_scaricata, data_ricezione, luogo_produzione, destinazione, classi_pericolo, stato_fisico, descrizione_tipica, scaricato, cod_magazzino, peso_lordo, tara, annotazioni, nota_int, cod_intermed, intermediario, indirizzo_intermed, flagnomud, origine_rifiuto, conai, att_orig_rif, pseudonimo_cantiere, indirizzo_cantiere, cap_cantiere, comune_cantiere, provincia_cantiere, data_emissione_formulario, form_urbano, ddt_ingresso, data_ddt_ingresso, respinto")
          .eq("tenant_id", MULTY_TENANT_ID)
          .order("data_movimento", { ascending: false })
          .order("numero_interno", { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1);
        if (error) throw error;
        all = [...all, ...(data || [])];
        if (!data || data.length < 1000) break;
        p++;
      }
      return all as any[];
    },
  });

  const cerList = useMemo(() => {
    if (!rows) return [];
    return Array.from(
      new Set(
        rows
          .map((r: any) => (r.cer ?? "").toString().trim())
          .filter((c: string) => c.length > 0)
      )
    ).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r: any) => {
      if (cerFilter !== "all" && r.cer !== cerFilter) return false;
      if (csFilter !== "all" && r.carico_scarico !== csFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (r.numero_formulario || "").toLowerCase().includes(s) ||
          (r.descrizione || "").toLowerCase().includes(s) ||
          (r.cer || "").includes(s) ||
          String(r.numero_interno || "").includes(s) ||
          (r.numero_formulario || "").toLowerCase().includes(s) ||
          (r.luogo_produzione || "").toLowerCase().includes(s) ||
          (r.intermediario || "").toLowerCase().includes(s) ||
          (r.comune_cantiere || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, search, cerFilter, csFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const stats = useMemo(() => {
    if (!rows) return { totale: 0, carichi: 0, scarichi: 0, kg: 0 };
    const carichi = rows.filter((r: any) => r.carico_scarico === "Carico").length;
    const scarichi = rows.filter((r: any) => r.carico_scarico === "Scarico").length;
    const kg = rows.reduce((s: number, r: any) => s + Number(r.quantita || 0), 0);
    return { totale: rows.length, carichi, scarichi, kg };
  }, [rows]);

  const exportCols = registroColumns.map(({ header, key, width }) => ({ header, key, width }));

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><BookOpen className="h-8 w-8 text-emerald-400" /><div><p className="text-xs text-muted-foreground">Movimenti Totali</p><p className="text-2xl font-bold text-emerald-400">{stats.totale.toLocaleString("it-IT")}</p></div></CardContent></Card>
        <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><ArrowUpDown className="h-8 w-8 text-blue-400" /><div><p className="text-xs text-muted-foreground">Carichi</p><p className="text-2xl font-bold text-blue-400">{stats.carichi.toLocaleString("it-IT")}</p></div></CardContent></Card>
        <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><ArrowUpDown className="h-8 w-8 text-amber-400" /><div><p className="text-xs text-muted-foreground">Scarichi</p><p className="text-2xl font-bold text-amber-400">{stats.scarichi.toLocaleString("it-IT")}</p></div></CardContent></Card>
        <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><Package className="h-8 w-8 text-purple-400" /><div><p className="text-xs text-muted-foreground">Kg Totali</p><p className="text-2xl font-bold text-purple-400">{Math.round(stats.kg).toLocaleString("it-IT")}</p></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca FIR, CER, descrizione..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10 bg-card/60 border-border/50" />
        </div>
        <Select value={cerFilter} onValueChange={v => { setCerFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44 bg-card/60 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i CER</SelectItem>
            {cerList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={csFilter} onValueChange={v => { setCsFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40 bg-card/60 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Carico/Scarico</SelectItem>
            <SelectItem value="Carico">Carico</SelectItem>
            <SelectItem value="Scarico">Scarico</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => filtered.length && exportToExcel(filtered, exportCols, "registro-generale-multy", "Registro Generale")} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => filtered.length && exportToPdf(filtered, exportCols, "registro-generale-multy", "Registro Generale Multyproget")} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-3 w-3" /> PDF
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card/60 border-border/30">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Caricamento registro...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-2 px-3">N. Int.</th>
                      <th className="text-left py-2 px-3">Data</th>
                      <th className="text-left py-2 px-3">CER</th>
                      <th className="text-left py-2 px-3">Descrizione</th>
                      <th className="text-left py-2 px-3">C./S.</th>
                      <th className="text-left py-2 px-3">Tipo Operazione</th>
                      <th className="text-left py-2 px-3">N° FIR</th>
                      <th className="text-right py-2 px-3">Qty</th>
                      <th className="text-left py-2 px-3">Dest.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/10 hover:bg-white/5">
                        <td className="py-2 px-3 font-mono text-xs">{r.numero_interno || "-"}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{r.data_movimento}</td>
                        <td className="py-2 px-3 font-mono text-emerald-300">{r.cer}</td>
                        <td className="py-2 px-3 text-xs max-w-[260px] truncate">{r.descrizione || "-"}</td>
                        <td className={`py-2 px-3 text-xs font-semibold ${r.carico_scarico === "Carico" ? "text-blue-400" : "text-amber-400"}`}>{r.carico_scarico || "-"}</td>
                        <td className="py-2 px-3 text-xs max-w-[180px] truncate">{r.tipo_operazione || "-"}</td>
                        <td className="py-2 px-3 font-mono text-blue-300 text-xs">{r.numero_formulario || "-"}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{Number(r.quantita || 0).toLocaleString("it-IT")}</td>
                        <td className="py-2 px-3 text-xs">{r.destinazione || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
                <p className="text-xs text-muted-foreground">
                  {filtered.length.toLocaleString("it-IT")} movimenti — Pagina {page + 1} di {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs">← Prec</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs">Succ →</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
