import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
            let allData = [];
            let page = 0;
            while (true) {
                const { data, error } = await supabase
                    .from("movimenti_intermediario")
                    .select("id, data_movimento, cer, descrizione_rifiuto, quantita_kg, numero_fir, produttore_denominazione, destinatario_denominazione, tipo_movimento")
                    .eq("tenant_id", MULTY_TENANT_ID)
                    .order("data_movimento", { ascending: false })
                    .range(page * 1000, (page + 1) * 1000 - 1);
                if (error)
                    throw error;
                allData = [...allData, ...(data || [])];
                if (!data || data.length < 1000)
                    break;
                page++;
            }
            return allData;
        },
    });
    const cerList = useMemo(() => {
        if (!movimentiData)
            return [];
        const set = new Set(movimentiData.map((m) => m.cer));
        return Array.from(set).sort();
    }, [movimentiData]);
    const filteredMovimenti = useMemo(() => {
        if (!movimentiData)
            return [];
        return movimentiData.filter((m) => {
            if (cerFilter !== "all" && m.cer !== cerFilter)
                return false;
            if (movSearch) {
                const s = movSearch.toLowerCase();
                return ((m.numero_fir || "").toLowerCase().includes(s) ||
                    (m.produttore_denominazione || "").toLowerCase().includes(s) ||
                    (m.destinatario_denominazione || "").toLowerCase().includes(s) ||
                    (m.cer || "").includes(s));
            }
            return true;
        });
    }, [movimentiData, movSearch, cerFilter]);
    const paginatedMovimenti = filteredMovimenti.slice(movPage * PAGE_SIZE, (movPage + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filteredMovimenti.length / PAGE_SIZE);
    const movStats = useMemo(() => {
        if (!movimentiData)
            return { totale: 0, kgTotali: 0, cerUnici: 0, produttoriUnici: 0 };
        const prods = new Set(movimentiData.map((m) => m.produttore_denominazione));
        return {
            totale: movimentiData.length,
            kgTotali: movimentiData.reduce((s, m) => s + Number(m.quantita_kg || 0), 0),
            cerUnici: cerList.length,
            produttoriUnici: prods.size,
        };
    }, [movimentiData, cerList]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowLeftRight, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti Totali" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: movStats.totale.toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Kg Totali" }), _jsx("p", { className: "text-2xl font-bold text-blue-400", children: Math.round(movStats.kgTotali).toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(FileText, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER Unici" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: movStats.cerUnici })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Globe, { className: "h-8 w-8 text-purple-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Produttori" }), _jsx("p", { className: "text-2xl font-bold text-purple-400", children: movStats.produttoriUnici })] })] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs("div", { className: "relative max-w-xs flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, produttore, destinatario...", value: movSearch, onChange: e => { setMovSearch(e.target.value); setMovPage(0); }, className: "pl-10 bg-card/60 border-border/50" })] }), _jsxs(Select, { value: cerFilter, onValueChange: v => { setCerFilter(v); setMovPage(0); }, children: [_jsx(SelectTrigger, { className: "w-48 bg-card/60 border-border/50", children: _jsx(SelectValue, { placeholder: "Tutti i CER" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti i CER" }), cerList.map(c => _jsx(SelectItem, { value: c, children: c }, c))] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filteredMovimenti.length)
                                return;
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
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filteredMovimenti.length)
                                return;
                            const cols = [
                                { header: "Data", key: "data_movimento", width: 12 },
                                { header: "CER", key: "cer", width: 10 },
                                { header: "Kg", key: "quantita_kg", width: 12 },
                                { header: "N° FIR", key: "numero_fir", width: 16 },
                                { header: "Produttore", key: "produttore_denominazione", width: 24 },
                                { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
                            ];
                            exportToPdf(filteredMovimenti, cols, "movimenti-intermediario-multy", "Movimenti Intermediario Multyproget");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: movLoading ? (_jsxs("p", { className: "text-muted-foreground text-sm p-4", children: ["Caricamento ", movStats.totale > 0 ? movStats.totale.toLocaleString("it-IT") : "", " movimenti..."] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "Data" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-left py-2 px-3", children: "Descrizione" }), _jsx("th", { className: "text-right py-2 px-3", children: "Kg" }), _jsx("th", { className: "text-left py-2 px-3", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left py-2 px-3", children: "Produttore" }), _jsx("th", { className: "text-left py-2 px-3", children: "Destinatario" })] }) }), _jsx("tbody", { children: paginatedMovimenti.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3 text-xs text-muted-foreground", children: m.data_movimento }), _jsx("td", { className: "py-2 px-3 font-mono text-emerald-300", children: m.cer }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[200px] truncate", children: m.descrizione_rifiuto || "-" }), _jsx("td", { className: "py-2 px-3 text-right font-mono font-bold", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-3 font-mono text-blue-300 text-xs", children: m.numero_fir || "-" }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[180px] truncate", children: m.produttore_denominazione || "-" }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[180px] truncate", children: m.destinatario_denominazione || "-" })] }, m.id))) })] }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-border/20", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: [filteredMovimenti.length.toLocaleString("it-IT"), " movimenti \u2014 Pagina ", movPage + 1, " di ", totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: movPage === 0, onClick: () => setMovPage(p => p - 1), className: "text-xs", children: "\u2190 Prec" }), _jsx(Button, { variant: "outline", size: "sm", disabled: movPage >= totalPages - 1, onClick: () => setMovPage(p => p + 1), className: "text-xs", children: "Succ \u2192" })] })] })] })) }) })] }));
}
