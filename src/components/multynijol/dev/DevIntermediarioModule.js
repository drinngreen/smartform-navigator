import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
            if (error)
                throw error;
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
                    if (moreErr || !more?.length)
                        break;
                    allData = [...allData, ...more];
                    if (more.length < 1000)
                        break;
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
            if (error)
                throw error;
            return data;
        },
    });
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
    // Unique CER list from movements
    const cerList = useMemo(() => {
        if (!movimentiData)
            return [];
        const set = new Set(movimentiData.map((m) => m.cer));
        return Array.from(set).sort();
    }, [movimentiData]);
    // Filtered movements
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
    // Stats
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
    const stats = {
        globalTotal: globalFirs?.length ?? 0,
        globalCompletati: globalFirs?.filter(f => f.status === "completato").length ?? 0,
        intermediazioni: intermediazioni?.length ?? 0,
        fatturate: intermediazioni?.filter((i) => i.fatturata).length ?? 0,
    };
    return (_jsx("div", { className: "space-y-4", children: _jsxs(Tabs, { defaultValue: "movimenti", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 p-1", children: [_jsxs(TabsTrigger, { value: "movimenti", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(ArrowLeftRight, { className: "h-4 w-4" }), " Movimenti (", movStats.totale.toLocaleString("it-IT"), ")"] }), _jsxs(TabsTrigger, { value: "global", className: "gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400", children: [_jsx(Eye, { className: "h-4 w-4" }), " Global Reco"] }), _jsxs(TabsTrigger, { value: "intermediazioni", className: "gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400", children: [_jsx(TrendingUp, { className: "h-4 w-4" }), " Intermediazioni"] })] }), _jsxs(TabsContent, { value: "movimenti", className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowLeftRight, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti Totali" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: movStats.totale.toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Kg Totali" }), _jsx("p", { className: "text-2xl font-bold text-blue-400", children: Math.round(movStats.kgTotali).toLocaleString("it-IT") })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(FileText, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER Unici" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: movStats.cerUnici })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Globe, { className: "h-8 w-8 text-purple-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Produttori" }), _jsx("p", { className: "text-2xl font-bold text-purple-400", children: movStats.produttoriUnici })] })] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsxs("div", { className: "relative max-w-xs flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, produttore, destinatario...", value: movSearch, onChange: e => { setMovSearch(e.target.value); setMovPage(0); }, className: "pl-10 bg-card/60 border-border/50" })] }), _jsxs(Select, { value: cerFilter, onValueChange: v => { setCerFilter(v); setMovPage(0); }, children: [_jsx(SelectTrigger, { className: "w-48 bg-card/60 border-border/50", children: _jsx(SelectValue, { placeholder: "Tutti i CER" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti i CER" }), cerList.map(c => _jsx(SelectItem, { value: c, children: c }, c))] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
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
                                    }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] }), _jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: movLoading ? (_jsxs("p", { className: "text-muted-foreground text-sm p-4", children: ["Caricamento ", movStats.totale > 0 ? movStats.totale.toLocaleString("it-IT") : "", " movimenti..."] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "Data" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-left py-2 px-3", children: "Descrizione" }), _jsx("th", { className: "text-right py-2 px-3", children: "Kg" }), _jsx("th", { className: "text-left py-2 px-3", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left py-2 px-3", children: "Produttore" }), _jsx("th", { className: "text-left py-2 px-3", children: "Destinatario" })] }) }), _jsx("tbody", { children: paginatedMovimenti.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3 text-xs text-muted-foreground", children: m.data_movimento }), _jsx("td", { className: "py-2 px-3 font-mono text-emerald-300", children: m.cer }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[200px] truncate", children: m.descrizione_rifiuto || "-" }), _jsx("td", { className: "py-2 px-3 text-right font-mono font-bold", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-3 font-mono text-blue-300 text-xs", children: m.numero_fir || "-" }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[180px] truncate", children: m.produttore_denominazione || "-" }), _jsx("td", { className: "py-2 px-3 text-xs max-w-[180px] truncate", children: m.destinatario_denominazione || "-" })] }, m.id))) })] }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-border/20", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: [filteredMovimenti.length.toLocaleString("it-IT"), " movimenti \u2014 Pagina ", movPage + 1, " di ", totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: movPage === 0, onClick: () => setMovPage(p => p - 1), className: "text-xs", children: "\u2190 Prec" }), _jsx(Button, { variant: "outline", size: "sm", disabled: movPage >= totalPages - 1, onClick: () => setMovPage(p => p + 1), className: "text-xs", children: "Succ \u2192" })] })] })] })) }) })] }), _jsxs(TabsContent, { value: "global", className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-blue-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Globe, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "FIR Global Reco" }), _jsx("p", { className: "text-2xl font-bold text-blue-400", children: stats.globalTotal })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(FileText, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Completati" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: stats.globalCompletati })] })] }) })] }), _jsxs(Card, { className: "bg-card/60 border-blue-500/30", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs(CardTitle, { className: "text-blue-400 flex items-center gap-2", children: [_jsx(Eye, { className: "h-5 w-5" }), " Vista Global Reco (Sola Lettura)"] }), _jsx("div", { className: "flex gap-2", children: _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                        if (!globalFirs?.length)
                                                            return;
                                                        const cols = [
                                                            { header: "N° FIR", key: "numero_fir", width: 16 },
                                                            { header: "Produttore", key: "produttore_denominazione", width: 24 },
                                                            { header: "Destinatario", key: "destinatario_denominazione", width: 24 },
                                                            { header: "CER", key: "codice_eer", width: 12 },
                                                            { header: "Targa", key: "trasportatore_targa_automezzo", width: 14 },
                                                            { header: "Stato", key: "status", width: 12 },
                                                            { header: "Data", key: "created_at", width: 12, format: (v) => new Date(v).toLocaleDateString("it-IT") },
                                                        ];
                                                        exportToExcel(globalFirs, cols, "global-reco-fir", "FIR Global Reco");
                                                    }, className: "gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }) })] }) }), _jsx(CardContent, { children: isLoading ? _jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." }) : !globalFirs?.length ? _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun FIR." }) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left py-2 px-3", children: "Produttore" }), _jsx("th", { className: "text-left py-2 px-3", children: "Destinatario" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-left py-2 px-3", children: "Targa" }), _jsx("th", { className: "text-left py-2 px-3", children: "Stato" }), _jsx("th", { className: "text-left py-2 px-3", children: "Data" })] }) }), _jsx("tbody", { children: globalFirs.map((f) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3 font-mono text-blue-300", children: f.numero_fir || "-" }), _jsx("td", { className: "py-2 px-3", children: f.produttore_denominazione || "-" }), _jsx("td", { className: "py-2 px-3", children: f.destinatario_denominazione || "-" }), _jsx("td", { className: "py-2 px-3", children: f.codice_eer || "-" }), _jsx("td", { className: "py-2 px-3 font-mono", children: f.trasportatore_targa_automezzo || "-" }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: `px-2 py-0.5 rounded text-xs ${f.status === "completato" ? "bg-emerald-500/20 text-emerald-400" : f.status === "in_viaggio" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"}`, children: f.status }) }), _jsx("td", { className: "py-2 px-3 text-muted-foreground text-xs", children: new Date(f.created_at).toLocaleDateString("it-IT") })] }, f.id))) })] }) })) })] })] }), _jsxs(TabsContent, { value: "intermediazioni", className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-amber-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(TrendingUp, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Intermediazioni" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: stats.intermediazioni })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Eye, { className: "h-8 w-8 text-purple-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Fatturate" }), _jsx("p", { className: "text-2xl font-bold text-purple-400", children: stats.fatturate })] })] }) })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-amber-400 flex items-center gap-2", children: [_jsx(TrendingUp, { className: "h-5 w-5" }), " Intermediazioni Multyproget (", intermediazioni?.length ?? 0, ")"] }) }), _jsx(CardContent, { children: !intermediazioni?.length ? _jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna intermediazione registrata." }) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "Intermediario" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-right py-2 px-3", children: "Q.t\u00E0 (kg)" }), _jsx("th", { className: "text-right py-2 px-3", children: "Provvigione" }), _jsx("th", { className: "text-left py-2 px-3", children: "Stato" }), _jsx("th", { className: "text-left py-2 px-3", children: "Fatturata" })] }) }), _jsx("tbody", { children: intermediazioni.map((i) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3", children: i.intermediario?.ragione_sociale || "-" }), _jsx("td", { className: "py-2 px-3 font-mono", children: i.cer || "-" }), _jsx("td", { className: "py-2 px-3 text-right", children: i.quantita_effettiva_kg || i.quantita_stimata_kg || "-" }), _jsxs("td", { className: "py-2 px-3 text-right font-bold text-amber-400", children: ["\u20AC", Number(i.importo_provvigione || 0).toFixed(2)] }), _jsx("td", { className: "py-2 px-3", children: i.stato }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: i.fatturata ? "text-emerald-400" : "text-muted-foreground", children: i.fatturata ? "✓" : "—" }) })] }, i.id))) })] }) })) })] })] })] }) }));
}
