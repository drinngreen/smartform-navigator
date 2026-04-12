import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Search, Download, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { searchXFir, parseRentriToSummary } from "@/services/impiantoFirService";
import { toast } from "sonner";
export function ImpiantoFirSearch({ cliente, color, onImport }) {
    const [numero, setNumero] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [found, setFound] = useState(null);
    const [error, setError] = useState(null);
    const handleSearch = async () => {
        if (!numero.trim())
            return;
        setLoading(true);
        setFound(null);
        setError(null);
        try {
            const res = await searchXFir(cliente, numero.trim());
            if (res.success && res.data) {
                setFound(res.data);
            }
            else {
                setError(res.error || "FIR non trovato");
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleImport = async () => {
        if (!found)
            return;
        setImporting(true);
        try {
            await onImport(found);
            toast.success("FIR importato con successo");
            setFound(null);
            setNumero("");
        }
        catch (err) {
            toast.error("Errore importazione: " + err.message);
        }
        finally {
            setImporting(false);
        }
    };
    const summary = found ? parseRentriToSummary(found) : null;
    return (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", style: { color: `rgb(${color})` }, children: [_jsx(Search, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider uppercase", children: "Cerca FIR su RENTRI" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("input", { value: numero, onChange: (e) => setNumero(e.target.value.toUpperCase()), placeholder: "XNQLK 052508 QS", className: "flex-1 px-4 py-3 bg-background/80 border border-border/30 rounded-xl text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1", style: { ["--tw-ring-color"]: `rgba(${color}, 0.5)` }, onKeyDown: (e) => e.key === "Enter" && handleSearch() }), _jsxs("button", { onClick: handleSearch, disabled: loading || !numero.trim(), className: "px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2", style: { background: `rgba(${color}, 0.2)`, borderColor: `rgba(${color}, 0.3)`, color: `rgb(${color})`, border: "1px solid" }, children: [loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Search, { className: "h-4 w-4" }), "CERCA"] })] }), error && (_jsxs("div", { className: "flex items-center gap-2 text-destructive text-sm p-3 rounded-xl bg-destructive/10 border border-destructive/30", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " ", error] })), summary && (_jsxs("div", { className: "rounded-xl border p-4 space-y-3", style: { borderColor: `rgba(${color}, 0.3)`, background: `rgba(${color}, 0.05)` }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "h-5 w-5", style: { color: `rgb(${color})` } }), _jsx("span", { className: "font-display text-sm tracking-wider", style: { color: `rgb(${color})` }, children: "FIR TROVATO" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Numero:" }), _jsx("br", {}), _jsx("strong", { className: "font-mono", children: summary.numero_fir })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "CER:" }), _jsx("br", {}), _jsx("strong", { className: "font-mono", children: summary.cer })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Produttore:" }), _jsx("br", {}), summary.produttore || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Trasportatore:" }), _jsx("br", {}), summary.trasportatore || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Quantit\u00E0:" }), _jsx("br", {}), _jsxs("strong", { children: [summary.quantita?.toLocaleString("it-IT"), " ", summary.unita_misura] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Destinatario:" }), _jsx("br", {}), summary.destinatario || "—"] })] }), _jsxs("button", { onClick: handleImport, disabled: importing, className: "w-full py-3 rounded-xl font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2", style: { background: `rgb(${color})` }, children: [importing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Download, { className: "h-4 w-4" }), "IMPORTA FIR"] })] }))] }));
}
