import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Search, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediari } from "@/hooks/useIntermediari";
import { useMovimentiIntermediario } from "@/hooks/useIntermediazioni";
export function RegistroIntermediarioTab() {
    const { data: intermediari = [] } = useIntermediari();
    const [selectedId, setSelectedId] = useState("");
    const [search, setSearch] = useState("");
    const { data: movimenti = [], isLoading } = useMovimentiIntermediario(selectedId || undefined);
    const filtered = movimenti.filter(m => `${m.cer} ${m.produttore_denominazione} ${m.destinatario_denominazione} ${m.numero_fir}`.toLowerCase().includes(search.toLowerCase()));
    const exportCSV = () => {
        const headers = ["Data", "CER", "Produttore", "Destinatario", "Qty kg", "N° FIR", "Note"];
        const rows = filtered.map((m) => [
            m.data_movimento, m.cer, m.produttore_denominazione || "", m.destinatario_denominazione || "",
            m.quantita_kg, m.numero_fir || "", m.note || "",
        ]);
        const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `registro_intermediario_${selectedId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs(Select, { value: selectedId, onValueChange: setSelectedId, children: [_jsx(SelectTrigger, { className: "w-64 bg-card/60 border-border/30", children: _jsx(SelectValue, { placeholder: "Seleziona intermediario" }) }), _jsx(SelectContent, { children: intermediari.map(i => (_jsx(SelectItem, { value: i.id, children: i.ragione_sociale }, i.id))) })] }), _jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca nel registro...", value: search, onChange: e => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { variant: "outline", onClick: exportCSV, disabled: filtered.length === 0, className: "gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), " Esporta CSV"] })] }), !selectedId ? (_jsxs("div", { className: "text-center py-12 text-muted-foreground", children: [_jsx(BookOpen, { className: "h-12 w-12 mx-auto mb-3 opacity-30" }), _jsx("p", { children: "Seleziona un intermediario per visualizzare il registro" })] })) : isLoading ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "text-center py-12 text-muted-foreground", children: "Nessun movimento trovato" })) : (_jsx("div", { className: "overflow-x-auto rounded-xl border border-border/30", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-card/80", children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "Data" }), _jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "CER" }), _jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "Produttore" }), _jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "Destinatario" }), _jsx("th", { className: "text-right px-4 py-3 text-muted-foreground font-medium", children: "Qty (kg)" }), _jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left px-4 py-3 text-muted-foreground font-medium", children: "Note" })] }) }), _jsx("tbody", { children: filtered.map((m) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-card/40", children: [_jsx("td", { className: "px-4 py-3 font-mono text-xs", children: m.data_movimento }), _jsx("td", { className: "px-4 py-3 font-mono", children: m.cer }), _jsx("td", { className: "px-4 py-3", children: m.produttore_denominazione || "—" }), _jsx("td", { className: "px-4 py-3", children: m.destinatario_denominazione || "—" }), _jsx("td", { className: "px-4 py-3 text-right font-mono", children: Number(m.quantita_kg).toLocaleString("it-IT") }), _jsx("td", { className: "px-4 py-3 font-mono text-xs", children: m.numero_fir || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: m.note || "" })] }, m.id))) })] }) }))] }));
}
