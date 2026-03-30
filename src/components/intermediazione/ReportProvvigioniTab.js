import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediazioni } from "@/hooks/useIntermediazioni";
import { useIntermediari } from "@/hooks/useIntermediari";
export function ReportProvvigioniTab() {
    const { data: items = [] } = useIntermediazioni();
    const { data: intermediari = [] } = useIntermediari();
    const [filtroIntermediario, setFiltroIntermediario] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const filtered = useMemo(() => {
        return items.filter(i => {
            if (filtroIntermediario && i.intermediario_id !== filtroIntermediario)
                return false;
            if (dateFrom && i.created_at < dateFrom)
                return false;
            if (dateTo && i.created_at > dateTo + "T23:59:59")
                return false;
            return true;
        });
    }, [items, filtroIntermediario, dateFrom, dateTo]);
    // Aggregations
    const totaleProvvigioni = filtered.reduce((s, i) => s + (i.importo_provvigione || 0), 0);
    const totaleFatturate = filtered.filter(i => i.fatturata).reduce((s, i) => s + (i.importo_provvigione || 0), 0);
    const totaleDaFatturare = filtered.filter(i => !i.fatturata && i.stato === "completata").reduce((s, i) => s + (i.importo_provvigione || 0), 0);
    const totaleKg = filtered.reduce((s, i) => s + (i.quantita_effettiva_kg || i.quantita_stimata_kg || 0), 0);
    // Group by intermediario
    const byIntermediario = useMemo(() => {
        const map = new Map();
        filtered.forEach(i => {
            const name = i.intermediario?.ragione_sociale || "N/D";
            const existing = map.get(i.intermediario_id) || { name, count: 0, provvigioni: 0, kg: 0 };
            existing.count++;
            existing.provvigioni += i.importo_provvigione || 0;
            existing.kg += i.quantita_effettiva_kg || i.quantita_stimata_kg || 0;
            map.set(i.intermediario_id, existing);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].provvigioni - a[1].provvigioni);
    }, [filtered]);
    // Group by CER
    const byCER = useMemo(() => {
        const map = new Map();
        filtered.forEach(i => {
            const cer = i.cer || "N/D";
            const existing = map.get(cer) || { count: 0, provvigioni: 0, kg: 0 };
            existing.count++;
            existing.provvigioni += i.importo_provvigione || 0;
            existing.kg += i.quantita_effettiva_kg || i.quantita_stimata_kg || 0;
            map.set(cer, existing);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].provvigioni - a[1].provvigioni);
    }, [filtered]);
    const exportCSV = () => {
        const headers = ["Intermediario", "Produttore", "Destinatario", "CER", "Qty kg", "Tipo Fee", "Valore", "Provvigione €", "Stato", "Fatturata"];
        const rows = filtered.map(i => [
            i.intermediario?.ragione_sociale || "", i.produttore?.name || "", i.destinatario?.name || "",
            i.cer || "", i.quantita_effettiva_kg ?? i.quantita_stimata_kg ?? "",
            i.tipo_provvigione, i.valore_provvigione, i.importo_provvigione?.toFixed(2) ?? "",
            i.stato, i.fatturata ? "Sì" : "No",
        ]);
        const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "report_provvigioni.csv";
        a.click();
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-end gap-3 flex-wrap", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Intermediario" }), _jsxs(Select, { value: filtroIntermediario, onValueChange: setFiltroIntermediario, children: [_jsx(SelectTrigger, { className: "w-52 bg-card/60 border-border/30", children: _jsx(SelectValue, { placeholder: "Tutti" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Tutti" }), intermediari.map(i => _jsx(SelectItem, { value: i.id, children: i.ragione_sociale }, i.id))] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Da" }), _jsx(Input, { type: "date", value: dateFrom, onChange: e => setDateFrom(e.target.value), className: "w-40 bg-card/60 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "A" }), _jsx(Input, { type: "date", value: dateTo, onChange: e => setDateTo(e.target.value), className: "w-40 bg-card/60 border-border/30" })] }), _jsxs(Button, { variant: "outline", onClick: exportCSV, className: "gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), " Esporta"] })] }), _jsx("div", { className: "grid grid-cols-4 gap-3", children: [
                    { label: "Totale Provvigioni", value: `€${totaleProvvigioni.toFixed(2)}`, color: "text-primary" },
                    { label: "Fatturate", value: `€${totaleFatturate.toFixed(2)}`, color: "text-emerald-400" },
                    { label: "Da Fatturare", value: `€${totaleDaFatturare.toFixed(2)}`, color: "text-yellow-400" },
                    { label: "Totale Kg", value: totaleKg.toLocaleString("it-IT"), color: "text-blue-400" },
                ].map(s => (_jsxs("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30 text-center", children: [_jsx("div", { className: `text-xl font-bold ${s.color}`, children: s.value }), _jsx("div", { className: "text-xs text-muted-foreground mt-1", children: s.label })] }, s.label))) }), _jsxs("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsxs("h3", { className: "text-sm font-medium text-foreground mb-3 flex items-center gap-2", children: [_jsx(BarChart3, { className: "h-4 w-4" }), " Per Intermediario"] }), byIntermediario.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun dato" })) : (_jsx("div", { className: "space-y-2", children: byIntermediario.map(([id, d]) => (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-foreground", children: d.name }), _jsxs("div", { className: "flex gap-6 text-xs text-muted-foreground", children: [_jsxs("span", { children: [d.count, " op."] }), _jsxs("span", { children: [d.kg.toLocaleString("it-IT"), " kg"] }), _jsxs("span", { className: "text-primary font-medium", children: ["\u20AC", d.provvigioni.toFixed(2)] })] })] }, id))) }))] }), _jsxs("div", { className: "p-4 rounded-xl bg-card/60 border border-border/30", children: [_jsx("h3", { className: "text-sm font-medium text-foreground mb-3", children: "Per CER" }), byCER.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Nessun dato" })) : (_jsx("div", { className: "space-y-2", children: byCER.map(([cer, d]) => (_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "font-mono text-foreground", children: cer }), _jsxs("div", { className: "flex gap-6 text-xs text-muted-foreground", children: [_jsxs("span", { children: [d.count, " op."] }), _jsxs("span", { children: [d.kg.toLocaleString("it-IT"), " kg"] }), _jsxs("span", { className: "text-primary font-medium", children: ["\u20AC", d.provvigioni.toFixed(2)] })] })] }, cer))) }))] })] }));
}
