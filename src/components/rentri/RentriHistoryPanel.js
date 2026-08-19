import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useRentriHistory } from "@/hooks/useRentriHistory";
import { rentriUserMessage } from "@/lib/rentriErrorMessages";
import { Loader2, History, RefreshCw, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
const CLIENTI = ["all", "multyproget", "multy", "niyol", "global"];
function statoLeggibile(row) {
    if (row.success)
        return row.mode === "dry_run" ? "Verifica riuscita" : "Operazione completata";
    return rentriUserMessage(Number(row.http_status ?? 0));
}
export function RentriHistoryPanel({ defaultCliente = "all" }) {
    const [cliente, setCliente] = useState(defaultCliente);
    const [esito, setEsito] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const { rows, loading, error, reload } = useRentriHistory({
        cliente,
        esito,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    });
    return (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", "data-testid": "rentri-history", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(History, { size: 16, className: "text-primary" }), _jsx("h3", { className: "text-base font-display tracking-wider", children: "Cronologia operazioni RENTRI" }), _jsxs("button", { onClick: () => void reload(), className: "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/50 border border-border/50 hover:bg-secondary", children: [_jsx(RefreshCw, { size: 13 }), " Aggiorna"] })] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-xs", children: [_jsx("select", { "aria-label": "Filtra per cliente", value: cliente, onChange: (e) => setCliente(e.target.value), className: "rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5", children: CLIENTI.map((c) => (_jsx("option", { value: c, children: c === "all" ? "Tutti i clienti" : c }, c))) }), _jsxs("select", { "aria-label": "Filtra per esito", value: esito, onChange: (e) => setEsito(e.target.value), className: "rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5", children: [_jsx("option", { value: "all", children: "Tutti gli esiti" }), _jsx("option", { value: "success", children: "Solo riuscite" }), _jsx("option", { value: "error", children: "Solo fallite" })] }), _jsx("input", { "aria-label": "Data inizio", type: "date", value: from, onChange: (e) => setFrom(e.target.value), className: "rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5" }), _jsx("input", { "aria-label": "Data fine", type: "date", value: to, onChange: (e) => setTo(e.target.value), className: "rounded-lg bg-secondary/50 border border-border/50 px-3 py-1.5" })] }), loading && (_jsxs("div", { "data-testid": "history-loading", className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(Loader2, { size: 14, className: "animate-spin" }), " Caricamento cronologia\u2026"] })), !loading && error && (_jsxs("div", { "data-testid": "history-error", className: "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive", children: ["Impossibile caricare la cronologia. ", error] })), !loading && !error && rows.length === 0 && (_jsx("p", { "data-testid": "history-empty", className: "text-sm text-muted-foreground", children: "Nessuna operazione registrata." })), !loading && !error && rows.length > 0 && (_jsx("ul", { className: "space-y-2", children: rows.map((row) => (_jsxs("li", { "data-testid": "history-row", className: "rounded-xl border border-border/40 bg-secondary/30 px-4 py-3 text-sm", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [row.success
                                    ? _jsx(CheckCircle2, { size: 14, className: "text-primary" })
                                    : _jsx(XCircle, { size: 14, className: "text-destructive" }), _jsx("span", { className: "font-semibold", children: row.tipo_operazione }), _jsx("span", { className: "text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase", children: row.cliente }), row.mode === "dry_run" && (_jsxs("span", { className: "flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-muted-foreground", children: [_jsx(ShieldCheck, { size: 11 }), " verifica"] })), _jsx("span", { className: "ml-auto text-xs text-muted-foreground", children: new Date(row.created_at).toLocaleString("it-IT") })] }), _jsx("p", { className: "mt-1 text-muted-foreground", children: statoLeggibile(row) }), _jsxs("details", { className: "mt-1", children: [_jsx("summary", { className: "cursor-pointer text-xs text-muted-foreground", children: "Dettagli tecnici" }), _jsxs("div", { className: "mt-1 text-xs font-mono text-muted-foreground break-all", children: ["HTTP ", row.http_status ?? "—", " \u00B7 ", row.error_code ?? "OK", " \u00B7 ", row.rentri_method ?? "—", " ", row.rentri_path ?? "—", row.error_message ? ` · ${row.error_message}` : ""] })] })] }, row.id))) }))] }));
}
export default RentriHistoryPanel;
