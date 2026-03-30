import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            if (error)
                throw error;
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
    const stats = {
        globalTotal: globalFirs?.length ?? 0,
        globalCompletati: globalFirs?.filter(f => f.status === "completato").length ?? 0,
        intermediazioni: intermediazioni?.length ?? 0,
        fatturate: intermediazioni?.filter(i => i.fatturata).length ?? 0,
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Globe, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "FIR Global Reco" }), _jsx("p", { className: "text-2xl font-bold text-blue-400", children: stats.globalTotal })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(FileText, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Completati" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: stats.globalCompletati })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(TrendingUp, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Intermediazioni" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: stats.intermediazioni })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Eye, { className: "h-8 w-8 text-purple-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Fatturate" }), _jsx("p", { className: "text-2xl font-bold text-purple-400", children: stats.fatturate })] })] }) })] }), _jsxs(Card, { className: "bg-card/60 border-blue-500/30", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs(CardTitle, { className: "text-blue-400 flex items-center gap-2", children: [_jsx(Eye, { className: "h-5 w-5" }), "Vista Global Reco (Sola Lettura)"] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
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
                                            }, className: "gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
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
                                                exportToPdf(globalFirs, cols, "global-reco-fir", "FIR Global Reco");
                                            }, className: "gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] })] }) }), _jsx(CardContent, { children: isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." })) : !globalFirs?.length ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessun FIR Global Reco disponibile." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left py-2 px-3", children: "Produttore" }), _jsx("th", { className: "text-left py-2 px-3", children: "Destinatario" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-left py-2 px-3", children: "Targa" }), _jsx("th", { className: "text-left py-2 px-3", children: "Stato" }), _jsx("th", { className: "text-left py-2 px-3", children: "Data" })] }) }), _jsx("tbody", { children: globalFirs.map((f) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3 font-mono text-blue-300", children: f.numero_fir || "-" }), _jsx("td", { className: "py-2 px-3", children: f.produttore_denominazione || "-" }), _jsx("td", { className: "py-2 px-3", children: f.destinatario_denominazione || "-" }), _jsx("td", { className: "py-2 px-3", children: f.codice_eer || "-" }), _jsx("td", { className: "py-2 px-3 font-mono", children: f.trasportatore_targa_automezzo || "-" }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: `px-2 py-0.5 rounded text-xs ${f.status === "completato" ? "bg-emerald-500/20 text-emerald-400" :
                                                            f.status === "in_viaggio" ? "bg-blue-500/20 text-blue-400" :
                                                                "bg-amber-500/20 text-amber-400"}`, children: f.status }) }), _jsx("td", { className: "py-2 px-3 text-muted-foreground text-xs", children: new Date(f.created_at).toLocaleDateString("it-IT") })] }, f.id))) })] }) })) })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs(CardTitle, { className: "text-amber-400 flex items-center gap-2", children: [_jsx(TrendingUp, { className: "h-5 w-5" }), "Intermediazioni Multyproget (", intermediazioni?.length ?? 0, ")"] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                if (!intermediazioni?.length)
                                                    return;
                                                const cols = [
                                                    { header: "Intermediario", key: "intermediario_nome", width: 22 },
                                                    { header: "CER", key: "cer", width: 12 },
                                                    { header: "Q.tà (kg)", key: "quantita_effettiva_kg", width: 14 },
                                                    { header: "Provvigione", key: "importo_provvigione", width: 14, format: (v) => `€${Number(v || 0).toFixed(2)}` },
                                                    { header: "Stato", key: "stato", width: 12 },
                                                    { header: "Fatturata", key: "fatturata", width: 10, format: (v) => v ? "Sì" : "No" },
                                                ];
                                                const rows = intermediazioni.map(i => ({ ...i, intermediario_nome: i.intermediario?.ragione_sociale || "-" }));
                                                exportToExcel(rows, cols, "intermediazioni-multy-dev", "Intermediazioni");
                                            }, className: "gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                                                if (!intermediazioni?.length)
                                                    return;
                                                const cols = [
                                                    { header: "Intermediario", key: "intermediario_nome", width: 22 },
                                                    { header: "CER", key: "cer", width: 12 },
                                                    { header: "Q.tà (kg)", key: "quantita_effettiva_kg", width: 14 },
                                                    { header: "Provvigione", key: "importo_provvigione", width: 14, format: (v) => `€${Number(v || 0).toFixed(2)}` },
                                                    { header: "Stato", key: "stato", width: 12 },
                                                    { header: "Fatturata", key: "fatturata", width: 10, format: (v) => v ? "Sì" : "No" },
                                                ];
                                                const rows = intermediazioni.map(i => ({ ...i, intermediario_nome: i.intermediario?.ragione_sociale || "-" }));
                                                exportToPdf(rows, cols, "intermediazioni-multy-dev", "Intermediazioni Multyproget");
                                            }, className: "gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] })] }) }), _jsx(CardContent, { children: !intermediazioni?.length ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna intermediazione registrata." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "Intermediario" }), _jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-right py-2 px-3", children: "Q.t\u00E0 (kg)" }), _jsx("th", { className: "text-right py-2 px-3", children: "Provvigione" }), _jsx("th", { className: "text-left py-2 px-3", children: "Stato" }), _jsx("th", { className: "text-left py-2 px-3", children: "Fatturata" })] }) }), _jsx("tbody", { children: intermediazioni.map((i) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3", children: i.intermediario?.ragione_sociale || "-" }), _jsx("td", { className: "py-2 px-3 font-mono", children: i.cer || "-" }), _jsx("td", { className: "py-2 px-3 text-right", children: i.quantita_effettiva_kg || i.quantita_stimata_kg || "-" }), _jsxs("td", { className: "py-2 px-3 text-right font-bold text-amber-400", children: ["\u20AC", Number(i.importo_provvigione || 0).toFixed(2)] }), _jsx("td", { className: "py-2 px-3", children: i.stato }), _jsx("td", { className: "py-2 px-3", children: _jsx("span", { className: i.fatturata ? "text-emerald-400" : "text-muted-foreground", children: i.fatturata ? "✓" : "—" }) })] }, i.id))) })] }) })) })] })] }));
}
