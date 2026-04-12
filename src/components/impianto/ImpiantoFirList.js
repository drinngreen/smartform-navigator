import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Search, Eye } from "lucide-react";
const STATUS_MAP = {
    bozza: { label: "Bozza", cls: "bg-muted/30 text-muted-foreground border-border/30" },
    importato: { label: "Importato", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
    attesa_firma_ricezione: { label: "Attesa Ricezione", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    firmato_ricezione: { label: "Firmato Ricezione", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    firmato_destinatario: { label: "Chiuso", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    errore: { label: "Errore", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
};
export function ImpiantoFirList({ items, loading, color, onSelect }) {
    const [search, setSearch] = useState("");
    const [filterStato, setFilterStato] = useState("all");
    const filtered = items.filter((item) => {
        if (filterStato !== "all" && item.stato_interno !== filterStato)
            return false;
        if (!search)
            return true;
        const s = search.toLowerCase();
        return item.numero_fir?.toLowerCase().includes(s) ||
            item.cer?.toLowerCase().includes(s) ||
            item.produttore?.toLowerCase().includes(s) ||
            item.trasportatore?.toLowerCase().includes(s);
    });
    return (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: [_jsxs("div", { className: "p-4 border-b border-border/20 space-y-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca FIR, CER, produttore...", className: "w-full pl-9 pr-4 py-2 bg-background/80 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1" })] }), _jsx("div", { className: "flex gap-1 flex-wrap", children: ["all", "importato", "attesa_firma_ricezione", "firmato_ricezione", "firmato_destinatario"].map((s) => (_jsx("button", { onClick: () => setFilterStato(s), className: `px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${filterStato === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-background/50 text-muted-foreground border border-border/20 hover:bg-primary/10"}`, children: s === "all" ? "Tutti" : STATUS_MAP[s]?.label || s }, s))) })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase font-mono", children: [_jsx("th", { className: "p-3 text-left", children: "N\u00B0 FIR" }), _jsx("th", { className: "p-3 text-left", children: "Produttore" }), _jsx("th", { className: "p-3 text-left", children: "Trasportatore" }), _jsx("th", { className: "p-3 text-left", children: "CER" }), _jsx("th", { className: "p-3 text-right", children: "Quantit\u00E0" }), _jsx("th", { className: "p-3 text-center", children: "Stato" }), _jsx("th", { className: "p-3 text-center", children: "Firme" }), _jsx("th", { className: "p-3 text-center", children: "Azioni" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-muted-foreground", children: "Nessun FIR trovato" }) })) : (filtered.map((item) => {
                                const st = STATUS_MAP[item.stato_interno] || STATUS_MAP.bozza;
                                return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-accent/5", children: [_jsx("td", { className: "p-3 font-mono text-xs font-bold", style: { color: `rgb(${color})` }, children: item.numero_fir || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[140px] truncate", children: item.produttore || "—" }), _jsx("td", { className: "p-3 text-xs max-w-[140px] truncate", children: item.trasportatore || "—" }), _jsx("td", { className: "p-3 font-mono", children: item.cer || "—" }), _jsxs("td", { className: "p-3 text-right font-bold", children: [item.quantita?.toLocaleString("it-IT"), " ", item.unita_misura] }), _jsx("td", { className: "p-3 text-center", children: _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`, children: st.label }) }), _jsx("td", { className: "p-3 text-center", children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx("span", { className: `w-2.5 h-2.5 rounded-full ${item.firma_ricezione_at ? "bg-emerald-400" : "bg-muted-foreground/30"}`, title: "Ricezione" }), _jsx("span", { className: `w-2.5 h-2.5 rounded-full ${item.firma_destinatario_at ? "bg-emerald-400" : "bg-muted-foreground/30"}`, title: "Destinatario" })] }) }), _jsx("td", { className: "p-3 text-center", children: _jsxs("button", { onClick: () => onSelect(item), className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", style: { borderColor: `rgba(${color}, 0.3)`, color: `rgb(${color})` }, children: [_jsx(Eye, { className: "h-3 w-3" }), " Dettagli"] }) })] }, item.id));
                            })) })] }) })] }));
}
