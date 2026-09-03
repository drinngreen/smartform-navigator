import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, FileSpreadsheet, Printer, Search, Package, ArrowUpDown, BookOpen, Truck, Scissors, X } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { ContoTerziManualDialog } from "./ContoTerziManualDialog";
import { ScaricoLavorazioneDialog } from "./ScaricoLavorazioneDialog";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const PAGE_SIZE = 100;

/** Registri ufficiali RENTRI gestiti (uno per numerazione/registro cronologico). */
const REGISTRI = [
  { id: "MULTY_IMPIANTO", label: "Multyproget — Impianto", tenant: MULTY_TENANT_ID },
  { id: "MULTY_CONTO_PROPRIO", label: "Multyproget — Conto Proprio", tenant: MULTY_TENANT_ID },
  { id: "NIYOL", label: "Niyol", tenant: NIYOL_TENANT_ID },
] as const;

const registroColumns = [
  { header: "N. Int.", key: "numero_interno", width: 10, align: "left" },
  { header: "N. Movimento", key: "numero_movimento", width: 14, align: "left" },
  { header: "Data Mov.", key: "data_movimento", width: 12, align: "left" },
  { header: "C.E.R.", key: "cer", width: 10, align: "left" },
  { header: "Descrizione", key: "descrizione", width: 34, align: "left" },
  { header: "C./S.", key: "carico_scarico", width: 12, align: "left" },
  { header: "Tipo Operazione", key: "tipo_operazione", width: 24, align: "left" },
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
  const [registroFilter, setRegistroFilter] = useState<string>("MULTY_IMPIANTO");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [cerFilter, setCerFilter] = useState("all");
  const [csFilter, setCsFilter] = useState("all");
  const [dataFilter, setDataFilter] = useState<string>("");
  const [contoTerziOpen, setContoTerziOpen] = useState(false);
  const [scaricoLavOpen, setScaricoLavOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);



  const { data: allRows, isLoading } = useQuery({
    queryKey: ["dev-registro-generale", "multi"],
    queryFn: async () => {
      let all: any[] = [];
      let p = 0;
      while (true) {
        const { data, error } = await supabase
          .from("registro_generale" as any)
          .select("id, tenant_id, registro, numero_interno, numero_movimento, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, numero_formulario, segno, quantita, peso_destino, qta_scaricata, data_ricezione, luogo_produzione, destinazione, classi_pericolo, stato_fisico, descrizione_tipica, scaricato, cod_magazzino, peso_lordo, tara, annotazioni, nota_int, cod_intermed, intermediario, indirizzo_intermed, flagnomud, origine_rifiuto, conai, att_orig_rif, pseudonimo_cantiere, indirizzo_cantiere, cap_cantiere, comune_cantiere, provincia_cantiere, data_emissione_formulario, form_urbano, ddt_ingresso, data_ddt_ingresso, respinto")
          .in("tenant_id", [MULTY_TENANT_ID, NIYOL_TENANT_ID])
          .order("data_movimento", { ascending: false })
          .order("numero_interno", { ascending: false })
          .range(p * 1000, (p + 1) * 1000 - 1);
        if (error) throw error;
        all = [...all, ...(data || [])];
        if (!data || data.length < 1000) break;
        p++;
      }

      // Regola: le cernite ANNULLATE (o di test) non devono MAI comparire nel registro generale.
      // NB: il registro principale non deve MAI sparire se questa query secondaria fallisce.
      let cernitaRows: any[] = [];
      try {
        const { data, error: cernitaError } = await supabase
          .from("dragon_register_movements")
          .select("id, company_id, movement_number, movement_date, cer_code, description_snapshot, movement_type, quantity, unit_of_measure, sign, note, annotations, source_transform_batch_id, cause:dragon_causes(code, name), batch:dragon_transform_batches!fk_dragon_reg_mov_batch(status)")
          .in("company_id", [MULTY_TENANT_ID, NIYOL_TENANT_ID])
          .not("source_transform_batch_id", "is", null)
          .is("deleted_at", null)
          .is("test_session", null)
          .order("movement_date", { ascending: false })
          .order("movement_number", { ascending: false })
          .limit(1000);
        if (cernitaError) throw cernitaError;
        cernitaRows = data || [];
      } catch (e) {
        console.warn("[RegistroGenerale] cernite non caricate:", e);
        cernitaRows = [];
      }

      const cerniteNelRegistro = (cernitaRows || [])
        .filter((movement: any) => movement.batch?.status !== "ANNULLATA")
        // Solo vista: questa cernita (31/08/2026, 1840 kg) non deve comparire nel registro. Nessuna modifica al DB.
        .filter((movement: any) => movement.source_transform_batch_id !== HIDDEN_CERNITA_BATCH_ID)
        .map((movement: any) => ({
        id: `cernita-${movement.id}`,
        tenant_id: movement.company_id,
        registro: movement.company_id === NIYOL_TENANT_ID ? "NIYOL" : "MULTY_IMPIANTO",
        numero_interno: movement.movement_number ? `C-${movement.movement_number}` : "Cernita",
        numero_movimento: movement.movement_number || null,
        data_movimento: movement.movement_date,
        cer: movement.cer_code,
        descrizione: movement.description_snapshot,
        carico_scarico: movement.movement_type === "CARICO" ? "Carico" : "Scarico",
        tipo_operazione: movement.cause?.name || (movement.movement_type === "CARICO" ? "Carico da lavorazione" : "Scarico per lavorazione"),
        numero_formulario: null,
        segno: movement.sign === "PLUS" ? "+" : "-",
        quantita: Number(movement.quantity || 0),
        stato_fisico: movement.unit_of_measure,
        annotazioni: movement.annotations || movement.note || "Movimento generato da cernita",
        nota_int: `Cernita ${movement.source_transform_batch_id}`,
      }));

      return [...all, ...cerniteNelRegistro].sort((a, b) => {
        const byDate = String(b.data_movimento || "").localeCompare(String(a.data_movimento || ""));
        if (byDate !== 0) return byDate;
        return Number(b.numero_movimento || 0) - Number(a.numero_movimento || 0);
      });
    },
  });

  const rows = useMemo(() => {
    if (!allRows) return [];
    if (registroFilter === "all") return allRows;
    return allRows.filter((r: any) => (r.registro ?? "MULTY_IMPIANTO") === registroFilter);
  }, [allRows, registroFilter]);

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
      if (dataFilter && r.data_movimento !== dataFilter) return false;
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
  }, [rows, search, cerFilter, csFilter, dataFilter]);

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

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    if (!tableRef.current) return;
    const ro = new ResizeObserver(() => {
      if (tableRef.current) setTableWidth(tableRef.current.scrollWidth);
    });
    ro.observe(tableRef.current);
    return () => ro.disconnect();
  }, [paginated.length]);

  const handleTopScroll = () => {
    if (syncing.current) { syncing.current = false; return; }
    if (bottomScrollRef.current && topScrollRef.current) {
      syncing.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };
  const handleBottomScroll = () => {
    if (syncing.current) { syncing.current = false; return; }
    if (topScrollRef.current && bottomScrollRef.current) {
      syncing.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

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
        <Select value={registroFilter} onValueChange={v => { setRegistroFilter(v); setPage(0); }}>
          <SelectTrigger className="w-56 bg-card/60 border-emerald-500/40 text-emerald-300 font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REGISTRI.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            <SelectItem value="all">Tutti i registri</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={dataFilter}
            onChange={(e) => { setDataFilter(e.target.value); setPage(0); }}
            className="w-40 bg-card/60 border-border/50"
            title="Filtra per singolo giorno"
          />
          {dataFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDataFilter("")} className="h-8 w-8 p-0" title="Rimuovi filtro data">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => filtered.length && exportToExcel(filtered, exportCols, "registro-generale-multy", "Registro Generale")} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => filtered.length && exportToPdf(filtered, exportCols, "registro-generale-multy", "Registro Generale Multyproget")} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-3 w-3" /> PDF
        </Button>
        <Button size="sm" onClick={() => setContoTerziOpen(true)} className="gap-1 bg-amber-500 text-black hover:bg-amber-400">
          <Truck className="h-3 w-3" /> Conto Terzi (cartaceo)
        </Button>
        <Button size="sm" onClick={() => setScaricoLavOpen(true)} className="gap-1 bg-purple-500 text-white hover:bg-purple-400">
          <Scissors className="h-3 w-3" /> Scarico Lavorazione
        </Button>
      </div>


      {/* Table */}
      <Card className="bg-card/60 border-border/30">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground text-sm p-4">Caricamento registro...</p>
          ) : (
            <>
              <div
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="overflow-x-auto overflow-y-hidden border-b border-border/20"
              >
                <div style={{ width: tableWidth, height: 1 }} />
              </div>
              <div
                ref={bottomScrollRef}
                onScroll={handleBottomScroll}
                className="overflow-auto max-h-[70vh]"
              >
                <table
                  ref={tableRef}
                  className="min-w-max text-sm"
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
                >
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border/30 text-muted-foreground">
                      {registroColumns.map((column) => (
                        <th key={column.key} className={`py-2 px-3 whitespace-nowrap bg-card ${column.align === "right" ? "text-right" : "text-left"}`}>
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/10 hover:bg-white/5">
                        {registroColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`py-2 px-3 text-xs max-w-[280px] truncate ${column.align === "right" ? "text-right font-mono" : "text-left"}`}
                            title={formatCellValue(r[column.key])}
                          >
                            {formatCellValue(r[column.key])}
                          </td>
                        ))}
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

      {/* Right-click context menu → export filtered rows to Excel */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div
            className="fixed z-50 min-w-[220px] rounded-md border border-border/50 bg-card shadow-xl py-1 text-sm"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
          >
            <button
              className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 flex items-center gap-2 text-emerald-300"
              onClick={() => {
                if (filtered.length) exportToExcel(filtered, exportCols, `registro-generale-${dataFilter || "filtrato"}`, "Registro Generale");
                setCtxMenu(null);
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Esporta Excel ({filtered.length} righe filtrate)
            </button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 flex items-center gap-2"
              onClick={() => {
                if (filtered.length) exportToPdf(filtered, exportCols, `registro-generale-${dataFilter || "filtrato"}`, "Registro Generale Multyproget");
                setCtxMenu(null);
              }}
            >
              <FileText className="h-4 w-4" /> Esporta PDF (righe filtrate)
            </button>
          </div>
        </>
      )}

      <ContoTerziManualDialog open={contoTerziOpen} onClose={() => setContoTerziOpen(false)} />
      <ScaricoLavorazioneDialog open={scaricoLavOpen} onClose={() => setScaricoLavOpen(false)} />
    </div>
  );
}
