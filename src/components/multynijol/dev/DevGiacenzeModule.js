import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, RefreshCw, Package, ArrowDown, ArrowUp, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
export function DevGiacenzeModule() {
    const queryClient = useQueryClient();
    const [searchCer, setSearchCer] = useState("");
    // Fetch giacenze
    const { data: giacenze, isLoading } = useQuery({
        queryKey: ["dev-giacenze", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("magazzino_giacenze")
                .select("*, impianto:impianti(nome)")
                .eq("tenant_id", MULTY_TENANT_ID)
                .order("cer");
            if (error)
                throw error;
            return data;
        },
    });
    // Fetch movimenti for real-time calculation
    const { data: movimenti } = useQuery({
        queryKey: ["dev-movimenti-impianto", MULTY_TENANT_ID],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("movimenti_impianto")
                .select("cer, tipo_movimento, quantita_kg, impianto_id")
                .eq("tenant_id", MULTY_TENANT_ID);
            if (error)
                throw error;
            return data;
        },
    });
    // Recalculate from movements
    const recalculate = useMutation({
        mutationFn: async () => {
            if (!movimenti)
                return;
            const stock = {};
            for (const m of movimenti) {
                const key = `${m.impianto_id}_${m.cer}`;
                if (!stock[key])
                    stock[key] = { cer: m.cer, impianto_id: m.impianto_id, carico: 0, scarico: 0 };
                if (m.tipo_movimento === "CARICO")
                    stock[key].carico += Number(m.quantita_kg);
                else
                    stock[key].scarico += Number(m.quantita_kg);
            }
            for (const [, v] of Object.entries(stock)) {
                const qty = v.carico - v.scarico;
                const { error } = await supabase.from("magazzino_giacenze").upsert({
                    tenant_id: MULTY_TENANT_ID,
                    impianto_id: v.impianto_id,
                    cer: v.cer,
                    quantita_kg: qty,
                    ultimo_carico_at: new Date().toISOString(),
                }, { onConflict: "tenant_id,impianto_id,cer" });
                if (error)
                    throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
            toast.success("Giacenze ricalcolate dai movimenti");
        },
        onError: (e) => toast.error("Errore: " + e.message),
    });
    const handlePrintPDF = () => {
        const filtered = filteredGiacenze;
        if (!filtered?.length)
            return toast.error("Nessuna giacenza da stampare");
        // Simple PDF via printable page
        const w = window.open("", "_blank");
        if (!w)
            return;
        w.document.write(`
      <html><head><title>Giacenze Multyproget</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #16a34a; color: white; }
        h1 { color: #16a34a; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style></head><body>
      <h1>📦 Giacenze Magazzino — Multyproget</h1>
      <p>Data: ${new Date().toLocaleDateString("it-IT")}</p>
      <table>
        <thead><tr><th>CER</th><th>Impianto</th><th>Quantità (kg)</th></tr></thead>
        <tbody>
          ${filtered.map(g => `<tr><td>${g.cer}</td><td>${g.impianto?.nome || "-"}</td><td>${Number(g.quantita_kg).toLocaleString("it-IT")}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="footer">Generato da Multy Niyol — Centro di Comando</div>
      </body></html>
    `);
        w.document.close();
        w.print();
    };
    const filteredGiacenze = giacenze?.filter(g => !searchCer || g.cer.includes(searchCer));
    const totaleKg = filteredGiacenze?.reduce((sum, g) => sum + Number(g.quantita_kg), 0) ?? 0;
    const positiveCers = filteredGiacenze?.filter(g => Number(g.quantita_kg) > 0).length ?? 0;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-8 w-8 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Codici CER in Stock" }), _jsx("p", { className: "text-2xl font-bold text-emerald-400", children: positiveCers })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowDown, { className: "h-8 w-8 text-blue-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Totale in Giacenza" }), _jsxs("p", { className: "text-2xl font-bold text-blue-400", children: [totaleKg.toLocaleString("it-IT"), " kg"] })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(ArrowUp, { className: "h-8 w-8 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Movimenti Totali" }), _jsx("p", { className: "text-2xl font-bold text-amber-400", children: movimenti?.length ?? 0 })] })] }) })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx(Input, { placeholder: "Filtra per CER...", value: searchCer, onChange: (e) => setSearchCer(e.target.value), className: "max-w-xs bg-card/60 border-border/50" }), _jsxs(Button, { variant: "outline", onClick: () => recalculate.mutate(), disabled: recalculate.isPending, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Ricalcola Giacenze"] }), _jsxs(Button, { variant: "outline", onClick: handlePrintPDF, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-4 w-4" }), "Stampa Giacenze"] }), _jsxs(Button, { variant: "outline", onClick: () => {
                            if (!filteredGiacenze?.length)
                                return toast.error("Nessuna giacenza");
                            const cols = [
                                { header: "CER", key: "cer", width: 14 },
                                { header: "Impianto", key: "impianto_nome", width: 22 },
                                { header: "Quantità (kg)", key: "quantita_kg", width: 16, format: (v) => Number(v).toLocaleString("it-IT") },
                                { header: "Aggiornamento", key: "updated_at", width: 14, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                            ];
                            const rows = filteredGiacenze.map(g => ({ ...g, impianto_nome: g.impianto?.nome || "-" }));
                            exportToExcel(rows, cols, "giacenze-multyproget-dev", "Giacenze");
                        }, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-4 w-4" }), " Excel"] }), _jsxs(Button, { variant: "outline", onClick: () => {
                            if (!filteredGiacenze?.length)
                                return toast.error("Nessuna giacenza");
                            const cols = [
                                { header: "CER", key: "cer", width: 14 },
                                { header: "Impianto", key: "impianto_nome", width: 22 },
                                { header: "Quantità (kg)", key: "quantita_kg", width: 16, format: (v) => Number(v).toLocaleString("it-IT") },
                                { header: "Aggiornamento", key: "updated_at", width: 14, format: (v) => v ? new Date(v).toLocaleDateString("it-IT") : "-" },
                            ];
                            const rows = filteredGiacenze.map(g => ({ ...g, impianto_nome: g.impianto?.nome || "-" }));
                            exportToPdf(rows, cols, "giacenze-multyproget-dev", "Giacenze Magazzino — Multyproget Dev");
                        }, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-4 w-4" }), " PDF"] })] }), _jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-emerald-400", children: "\uD83D\uDCE6 Stock per Codice CER" }) }), _jsx(CardContent, { children: isLoading ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Caricamento..." })) : !filteredGiacenze?.length ? (_jsx("p", { className: "text-muted-foreground text-sm", children: "Nessuna giacenza trovata. Clicca \"Ricalcola Giacenze\" per popolare dai movimenti." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left py-2 px-3", children: "CER" }), _jsx("th", { className: "text-left py-2 px-3", children: "Impianto" }), _jsx("th", { className: "text-right py-2 px-3", children: "Quantit\u00E0 (kg)" }), _jsx("th", { className: "text-left py-2 px-3", children: "Ultimo Aggiornamento" })] }) }), _jsx("tbody", { children: filteredGiacenze.map((g) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "py-2 px-3 font-mono text-emerald-300", children: g.cer }), _jsx("td", { className: "py-2 px-3", children: g.impianto?.nome || "-" }), _jsx("td", { className: `py-2 px-3 text-right font-bold ${Number(g.quantita_kg) > 0 ? "text-emerald-400" : Number(g.quantita_kg) < 0 ? "text-red-400" : "text-muted-foreground"}`, children: Number(g.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "py-2 px-3 text-muted-foreground text-xs", children: g.updated_at ? new Date(g.updated_at).toLocaleDateString("it-IT") : "-" })] }, g.id))) })] }) })) })] })] }));
}
