import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
const PAGE_SIZE = 100;
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
];
const formatCellValue = (value) => {
    if (value === null || value === undefined || value === "")
        return "-";
    if (typeof value === "boolean")
        return value ? "Sì" : "No";
    if (typeof value === "number")
        return value.toLocaleString("it-IT");
    return String(value);
};
export function DevRegistroGeneraleModule() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [cerFilter, setCerFilter] = useState("all");
    const [csFilter, setCsFilter] = useState("all");
    const [dataFilter, setDataFilter] = useState("");
    const [contoTerziOpen, setContoTerziOpen] = useState(false);
    const [scaricoLavOpen, setScaricoLavOpen] = useState(false);
    const [ctxMenu, setCtxMenu] = useState(null);
    const { data: rows, isLoading } = useQuery({
        queryKey: ["dev-registro-generale", MULTY_TENANT_ID],
        queryFn: async () => {
            let all = [];
            let p = 0;
            while (true) {
                const { data, error } = await supabase
                    .from("registro_generale")
                    .select("id, numero_interno, numero_movimento, data_movimento, cer, descrizione, carico_scarico, tipo_operazione, numero_formulario, segno, quantita, peso_destino, qta_scaricata, data_ricezione, luogo_produzione, destinazione, classi_pericolo, stato_fisico, descrizione_tipica, scaricato, cod_magazzino, peso_lordo, tara, annotazioni, nota_int, cod_intermed, intermediario, indirizzo_intermed, flagnomud, origine_rifiuto, conai, att_orig_rif, pseudonimo_cantiere, indirizzo_cantiere, cap_cantiere, comune_cantiere, provincia_cantiere, data_emissione_formulario, form_urbano, ddt_ingresso, data_ddt_ingresso, respinto")
                    .eq("tenant_id", MULTY_TENANT_ID)
                    .order("data_movimento", { ascending: false })
                    .order("numero_interno", { ascending: false })
                    .range(p * 1000, (p + 1) * 1000 - 1);
                if (error)
                    throw error;
                all = [...all, ...(data || [])];
                if (!data || data.length < 1000)
                    break;
                p++;
            }
            return all;
        },
    });
    const cerList = useMemo(() => {
        if (!rows)
            return [];
        return Array.from(new Set(rows
            .map((r) => (r.cer ?? "").toString().trim())
            .filter((c) => c.length > 0))).sort();
    }, [rows]);
    const filtered = useMemo(() => {
        if (!rows)
            return [];
        return rows.filter((r) => {
            if (cerFilter !== "all" && r.cer !== cerFilter)
                return false;
            if (csFilter !== "all" && r.carico_scarico !== csFilter)
                return false;
            if (dataFilter && r.data_movimento !== dataFilter)
                return false;
            if (search) {
                const s = search.toLowerCase();
                return ((r.numero_formulario || "").toLowerCase().includes(s) ||
                    (r.descrizione || "").toLowerCase().includes(s) ||
                    (r.cer || "").includes(s) ||
                    String(r.numero_interno || "").includes(s) ||
                    (r.numero_formulario || "").toLowerCase().includes(s) ||
                    (r.luogo_produzione || "").toLowerCase().includes(s) ||
                    (r.intermediario || "").toLowerCase().includes(s) ||
                    (r.comune_cantiere || "").toLowerCase().includes(s));
            }
            return true;
        });
    }, [rows, search, cerFilter, csFilter, dataFilter]);
    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const stats = useMemo(() => {
        if (!rows)
            return { totale: 0, carichi: 0, scarichi: 0, kg: 0 };
        const carichi = rows.filter((r) => r.carico_scarico === "Carico").length;
        const scarichi = rows.filter((r) => r.carico_scarico === "Scarico").length;
        const kg = rows.reduce((s, r) => s + Number(r.quantita || 0), 0);
        return { totale: rows.length, carichi, scarichi, kg };
    }, [rows]);
    const exportCols = registroColumns.map(({ header, key, width }) => ({ header, key, width }));
    const topScrollRef = useRef(null);
    const bottomScrollRef = useRef(null);
    const tableRef = useRef(null);
    const [tableWidth, setTableWidth] = useState(0);
    const syncing = useRef(false);
    useEffect(() => {
        if (!tableRef.current)
            return;
        const ro = new ResizeObserver(() => {
            if (tableRef.current)
                setTableWidth(tableRef.current.scrollWidth);
        });
        ro.observe(tableRef.current);
        return () => ro.disconnect();
    }, [paginated.length]);
    const handleTopScroll = () => {
        if (syncing.current) {
            syncing.current = false;
            return;
        }
        if (bottomScrollRef.current && topScrollRef.current) {
            syncing.current = true;
            bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
    };
    const handleBottomScroll = () => {
        if (syncing.current) {
            syncing.current = false;
            return;
        }
        if (topScrollRef.current && bottomScrollRef.current) {
            syncing.current = true;
            topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(BookOpen, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti Totali" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: stats.totale.toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowUpDown, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Carichi" }), _jsx("p", { className: "text-2xl font-bold text-blue-400", children: stats.carichi.toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowUpDown, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Scarichi" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: stats.scarichi.toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-purple-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Kg Totali" }), _jsx("p", { className: "text-2xl font-bold text-purple-400", children: Math.round(stats.kg).toLocaleString("it-IT") })] })] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs("div", { className: "relative max-w-xs flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, CER, descrizione...", value: search, onChange: e => { setSearch(e.target.value); setPage(0); }, className: "pl-10 bg-card/60 border-border/50" })] }), _jsxs(Select, { value: cerFilter, onValueChange: v => { setCerFilter(v); setPage(0); }, children: [_jsx(SelectTrigger, { className: "w-44 bg-card/60 border-border/50", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti i CER" }), cerList.map(c => _jsx(SelectItem, { value: c, children: c }, c))] })] }), _jsxs(Select, { value: csFilter, onValueChange: v => { setCsFilter(v); setPage(0); }, children: [_jsx(SelectTrigger, { className: "w-40 bg-card/60 border-border/50", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Carico/Scarico" }), _jsx(SelectItem, { value: "Carico", children: "Carico" }), _jsx(SelectItem, { value: "Scarico", children: "Scarico" })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Input, { type: "date", value: dataFilter, onChange: (e) => { setDataFilter(e.target.value); setPage(0); }, className: "w-40 bg-card/60 border-border/50", title: "Filtra per singolo giorno" }), dataFilter && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setDataFilter(""), className: "h-8 w-8 p-0", title: "Rimuovi filtro data", children: _jsx(X, { className: "h-3 w-3" }) }))] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => filtered.length && exportToExcel(filtered, exportCols, "registro-generale-multy", "Registro Generale"), className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => filtered.length && exportToPdf(filtered, exportCols, "registro-generale-multy", "Registro Generale Multyproget"), className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] }), _jsxs(Button, { size: "sm", onClick: () => setContoTerziOpen(true), className: "gap-1 bg-amber-500 text-black hover:bg-amber-400", children: [_jsx(Truck, { className: "h-3 w-3" }), " Conto Terzi (cartaceo)"] }), _jsxs(Button, { size: "sm", onClick: () => setScaricoLavOpen(true), className: "gap-1 bg-purple-500 text-white hover:bg-purple-400", children: [_jsx(Scissors, { className: "h-3 w-3" }), " Scarico Lavorazione"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm p-4", children: "Caricamento registro..." })) : (_jsxs(_Fragment, { children: [_jsx("div", { ref: topScrollRef, onScroll: handleTopScroll, className: "overflow-x-auto overflow-y-hidden border-b border-border/20", children: _jsx("div", { style: { width: tableWidth, height: 1 } }) }), _jsx("div", { ref: bottomScrollRef, onScroll: handleBottomScroll, className: "overflow-auto max-h-[70vh]", children: _jsxs("table", { ref: tableRef, className: "min-w-max text-sm", onContextMenu: (e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }, children: [_jsx("thead", { className: "sticky top-0 z-10 bg-card", children: _jsx("tr", { className: "border-b border-border/30 text-muted-foreground", children: registroColumns.map((column) => (_jsx("th", { className: `py-2 px-3 whitespace-nowrap bg-card ${column.align === "right" ? "text-right" : "text-left"}`, children: column.header }, column.key))) }) }), _jsx("tbody", { children: paginated.map((r) => (_jsx("tr", { className: "border-b border-border/10 hover:bg-white/5", children: registroColumns.map((column) => (_jsx("td", { className: `py-2 px-3 text-xs max-w-[280px] truncate ${column.align === "right" ? "text-right font-mono" : "text-left"}`, title: formatCellValue(r[column.key]), children: formatCellValue(r[column.key]) }, column.key))) }, r.id))) })] }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-border/20", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: [filtered.length.toLocaleString("it-IT"), " movimenti \u2014 Pagina ", page + 1, " di ", totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage(p => p - 1), className: "text-xs", children: "\u2190 Prec" }), _jsx(Button, { variant: "outline", size: "sm", disabled: page >= totalPages - 1, onClick: () => setPage(p => p + 1), className: "text-xs", children: "Succ \u2192" })] })] })] })) }) }), ctxMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40", onClick: () => setCtxMenu(null), onContextMenu: (e) => { e.preventDefault(); setCtxMenu(null); } }), _jsxs("div", { className: "fixed z-50 min-w-[220px] rounded-md border border-border/50 bg-card shadow-xl py-1 text-sm", style: { top: ctxMenu.y, left: ctxMenu.x }, children: [_jsxs("button", { className: "w-full text-left px-3 py-2 hover:bg-emerald-500/10 flex items-center gap-2 text-emerald-300", onClick: () => {
                                    if (filtered.length)
                                        exportToExcel(filtered, exportCols, `registro-generale-${dataFilter || "filtrato"}`, "Registro Generale");
                                    setCtxMenu(null);
                                }, children: [_jsx(FileSpreadsheet, { className: "h-4 w-4" }), "Esporta Excel (", filtered.length, " righe filtrate)"] }), _jsxs("button", { className: "w-full text-left px-3 py-2 hover:bg-emerald-500/10 flex items-center gap-2", onClick: () => {
                                    if (filtered.length)
                                        exportToPdf(filtered, exportCols, `registro-generale-${dataFilter || "filtrato"}`, "Registro Generale Multyproget");
                                    setCtxMenu(null);
                                }, children: [_jsx(FileText, { className: "h-4 w-4" }), " Esporta PDF (righe filtrate)"] })] })] })), _jsx(ContoTerziManualDialog, { open: contoTerziOpen, onClose: () => setContoTerziOpen(false) }), _jsx(ScaricoLavorazioneDialog, { open: scaricoLavOpen, onClose: () => setScaricoLavOpen(false) })] }));
}
