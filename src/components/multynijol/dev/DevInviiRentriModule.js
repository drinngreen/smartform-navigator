import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Send, Filter } from "lucide-react";
import inviiData from "@/data/inviiRentriMulty.json";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
const dataset = inviiData;
const formatDate = (s) => {
    if (!s)
        return "—";
    try {
        const d = new Date(s);
        return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    catch {
        return s;
    }
};
export function DevInviiRentriModule() {
    const [search, setSearch] = useState("");
    const [registroFilter, setRegistroFilter] = useState("all");
    const [causaleFilter, setCausaleFilter] = useState("all");
    const registri = useMemo(() => {
        const s = new Set();
        dataset.forEach((r) => r.registro_nome && s.add(r.registro_nome));
        return Array.from(s).sort();
    }, []);
    const causali = useMemo(() => {
        const s = new Set();
        dataset.forEach((r) => r.causale && s.add(r.causale));
        return Array.from(s).sort();
    }, []);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return dataset.filter((r) => {
            if (registroFilter !== "all" && r.registro_nome !== registroFilter)
                return false;
            if (causaleFilter !== "all" && r.causale !== causaleFilter)
                return false;
            if (!q)
                return true;
            const hay = [
                r.rentri_id, r.progressivo, r.causale, r.cer, r.produttore, r.destinatario, r.note, r.registro_nome,
            ].filter(Boolean).join(" ").toLowerCase();
            return hay.includes(q);
        });
    }, [search, registroFilter, causaleFilter]);
    const exportCols = [
        { header: "Registro", key: "registro_nome", width: 28 },
        { header: "ID RENTRI", key: "rentri_id", width: 24 },
        { header: "Anno/Progr.", key: "progressivo", width: 14 },
        { header: "Data", key: "data", width: 12, format: (v) => formatDate(v) },
        { header: "Causale", key: "causale", width: 14 },
        { header: "CER", key: "cer", width: 10 },
        { header: "Stato", key: "stato", width: 8 },
        { header: "Quantità", key: "quantita", width: 12 },
        { header: "Produttore", key: "produttore", width: 28 },
        { header: "Destinatario", key: "destinatario", width: 28 },
        { header: "Annotazioni", key: "note", width: 30 },
    ];
    const totals = useMemo(() => {
        const tot = filtered.length;
        const conFir = filtered.filter((r) => r.note && /FIR/i.test(r.note)).length;
        const carichi = filtered.filter((r) => r.causale && /carico/i.test(r.causale) && !/scarico/i.test(r.causale)).length;
        const scarichi = filtered.filter((r) => r.causale && /scarico/i.test(r.causale)).length;
        return { tot, conFir, carichi, scarichi };
    }, [filtered]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 flex-wrap", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg font-semibold text-violet-300 flex items-center gap-2", children: [_jsx(Send, { className: "h-4 w-4" }), "Invii al RENTRI \u2014 Multyproget"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Report dettagliato delle registrazioni inviate al portale RENTRI \u00B7 Febbraio \u2013 Marzo 2026" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", disabled: !filtered.length, onClick: () => exportToExcel(filtered, exportCols, "invii-rentri-multy", "Invii RENTRI"), className: "gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10", children: [_jsx(Download, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", disabled: !filtered.length, onClick: () => exportToPdf(filtered, exportCols, "invii-rentri-multy", "Invii RENTRI Multyproget — Feb/Mar 2026"), className: "gap-1 border-violet-500/30 text-violet-400 hover:bg-violet-500/10", children: [_jsx(FileText, { className: "h-3 w-3" }), " PDF"] })] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
                    { label: "Totale Invii", value: totals.tot, color: "text-violet-300" },
                    { label: "Con FIR", value: totals.conFir, color: "text-cyan-300" },
                    { label: "Carichi", value: totals.carichi, color: "text-emerald-300" },
                    { label: "Scarichi", value: totals.scarichi, color: "text-rose-300" },
                ].map((s) => (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-3", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: s.label }), _jsx("p", { className: `text-2xl font-bold ${s.color}`, children: s.value.toLocaleString("it-IT") })] }, s.label))) }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx(Filter, { className: "h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per ID RENTRI, FIR, CER, soggetto\u2026", value: search, onChange: (e) => setSearch(e.target.value), className: "w-72 h-9" }), _jsxs(Select, { value: registroFilter, onValueChange: setRegistroFilter, children: [_jsx(SelectTrigger, { className: "w-56 h-9", children: _jsx(SelectValue, { placeholder: "Registro" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutti i registri" }), registri.map((r) => _jsx(SelectItem, { value: r, children: r }, r))] })] }), _jsxs(Select, { value: causaleFilter, onValueChange: setCausaleFilter, children: [_jsx(SelectTrigger, { className: "w-44 h-9", children: _jsx(SelectValue, { placeholder: "Causale" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Tutte le causali" }), causali.map((c) => _jsx(SelectItem, { value: c, children: c }, c))] })] }), (search || registroFilter !== "all" || causaleFilter !== "all") && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => { setSearch(""); setRegistroFilter("all"); setCausaleFilter("all"); }, children: "Reset" }))] }), _jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: [_jsx("div", { className: "overflow-auto max-h-[65vh]", children: _jsxs("table", { className: "w-full min-w-max text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-card border-b border-border/30", children: _jsxs("tr", { className: "text-xs text-muted-foreground", children: [_jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Registro" }), _jsx("th", { className: "text-left px-3 py-2 font-mono font-medium", children: "ID RENTRI" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Anno/Progr." }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Data" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Causale" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "CER" }), _jsx("th", { className: "text-center px-3 py-2 font-medium", children: "Stato" }), _jsx("th", { className: "text-right px-3 py-2 font-medium", children: "Quantit\u00E0" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Produttore" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Destinatario" }), _jsx("th", { className: "text-left px-3 py-2 font-medium", children: "Annotazioni" })] }) }), _jsx("tbody", { children: filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "text-center py-12 text-muted-foreground", children: "Nessun invio trovato con i filtri attuali" }) })) : (filtered.map((r, i) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-violet-500/5", children: [_jsx("td", { className: "px-3 py-2 text-xs", children: r.registro_nome || "—" }), _jsx("td", { className: "px-3 py-2 font-mono text-xs text-violet-300", children: r.rentri_id || "—" }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.progressivo || "—" }), _jsx("td", { className: "px-3 py-2 text-xs", children: formatDate(r.data) }), _jsx("td", { className: "px-3 py-2 text-xs", children: r.causale ? (_jsx(Badge, { variant: "outline", className: /scarico/i.test(r.causale)
                                                        ? "border-rose-500/30 text-rose-300"
                                                        : /carico/i.test(r.causale)
                                                            ? "border-emerald-500/30 text-emerald-300"
                                                            : "", children: r.causale })) : "—" }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.cer || "—" }), _jsx("td", { className: "px-3 py-2 text-center text-xs", children: r.stato || "—" }), _jsx("td", { className: "px-3 py-2 text-right font-mono text-xs", children: r.quantita != null ? Number(r.quantita).toLocaleString("it-IT") : "—" }), _jsx("td", { className: "px-3 py-2 text-xs max-w-[200px] truncate", title: r.produttore || "", children: r.produttore || "—" }), _jsx("td", { className: "px-3 py-2 text-xs max-w-[200px] truncate", title: r.destinatario || "", children: r.destinatario || "—" }), _jsx("td", { className: "px-3 py-2 text-xs max-w-[260px] truncate", title: r.note || "", children: r.note || "—" })] }, `${r.rentri_id}-${i}`)))) })] }) }), _jsxs("div", { className: "px-3 py-2 border-t border-border/20 text-xs text-muted-foreground bg-card/40", children: [filtered.length.toLocaleString("it-IT"), " di ", dataset.length.toLocaleString("it-IT"), " invii"] })] })] }));
}
