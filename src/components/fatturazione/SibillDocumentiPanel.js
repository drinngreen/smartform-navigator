import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search, Copy, Mail, Inbox, FileSearch, CheckCircle2, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { elencaDocumentiSibillFull, scansionaDocumentiSibill } from "@/lib/sibill";
import { FattureEmesseEsitoPanel } from "./FattureEmesseEsitoPanel";
const eur = (v) => v == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const dataIt = (d) => {
    if (!d)
        return "—";
    const iso = d.slice(0, 10);
    const [y, m, g] = iso.split("-");
    return y && m && g ? `${g}/${m}/${y}` : iso;
};
/** Elenco documenti letti da Sibill (emesse "/P" e ricevute), con la stessa vista del gestionale Sibill. */
export function SibillDocumentiPanel({ mock, tenantId, initialMode = "P" }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState({});
    const [scanning, setScanning] = useState(false);
    const [scanInfo, setScanInfo] = useState(null);
    const [modo, setModo] = useState(initialMode);
    const queryKey = ["sibill-documenti-v3", !!mock, modo];
    const { data: res, isFetching, error } = useQuery({
        queryKey,
        queryFn: () => elencaDocumentiSibillFull({ mock, filter: modo }),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
    });
    const docs = res?.documents ?? [];
    /** Sincronizza l'intero archivio Sibill a blocchi (l'API non consente filtri lato server). */
    const sincronizza = async (restart = false) => {
        setScanning(true);
        try {
            let done = false;
            let first = true;
            for (let i = 0; i < 40 && !done; i++) {
                const r = await scansionaDocumentiSibill({ mock, pages: 12, restart: restart && first });
                first = false;
                done = !!r.done;
                setScanInfo(`Scansione Sibill: ${r.scanned} documenti letti, ${r.cached} in archivio${done ? " — completata" : "…"}`);
                await queryClient.invalidateQueries({ queryKey: ["sibill-documenti-v3"] });
                if (r.rate_limited) {
                    toast.warning("Sibill ha limitato le chiamate: riprendo tra poco, l'elenco è parziale.");
                    break;
                }
            }
            if (done)
                toast.success("Archivio Sibill aggiornato");
        }
        catch (e) {
            toast.error(e.message || "Errore sincronizzazione Sibill");
        }
        finally {
            setScanning(false);
        }
    };
    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s)
            return docs;
        return docs.filter((d) => (d.number || "").toLowerCase().includes(s) || (d.counterpart || "").toLowerCase().includes(s));
    }, [docs, search]);
    const totale = useMemo(() => filtered.reduce((a, d) => a + (d.gross || 0), 0), [filtered]);
    const allChecked = filtered.length > 0 && filtered.every(d => selected[d.id || ""]);
    const copia = (d) => {
        navigator.clipboard.writeText([d.number, d.counterpart, dataIt(d.date), eur(d.gross)].filter(Boolean).join(" — "));
        toast.success("Riga copiata");
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("div", { className: "flex items-center gap-1 p-1 rounded-xl bg-background/60 border border-border/30", children: [["P", "Emesse (/P)"], ["IN", "Ricevute (entrata)"]].map(([v, label]) => (_jsx("button", { onClick: () => setModo(v), className: `px-3 py-1.5 rounded-lg text-sm ${modo === v ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`, children: label }, v))) }), _jsxs("div", { className: "relative flex-1 min-w-[220px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Cerca numero documento o cliente\u2026", className: "w-full pl-9 pr-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsx("span", { className: "text-xs text-muted-foreground", children: isFetching ? "Lettura archivio…" : `${filtered.length} ${modo === "IN" ? "fatture ricevute" : "fatture /P"} — totale ${eur(totale)}` }), _jsxs("button", { onClick: () => queryClient.invalidateQueries({ queryKey }), disabled: isFetching, className: "flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/40 text-sm hover:bg-background/70 disabled:opacity-40", children: [isFetching ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(RefreshCw, { className: "h-4 w-4" }), "Aggiorna elenco"] }), _jsxs("button", { onClick: () => sincronizza(true), disabled: scanning, className: "flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/40 bg-primary/15 text-primary text-sm hover:bg-primary/25 disabled:opacity-40", children: [scanning ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(DownloadCloud, { className: "h-4 w-4" }), "Sincronizza da Sibill"] })] }), (scanInfo || (res && !res.done)) && (_jsx("div", { className: "rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-4 py-2 text-xs", children: scanInfo || "Archivio Sibill incompleto: premi «Sincronizza da Sibill» per scaricare tutti i documenti (emesse e ricevute)." })), error && (_jsxs("div", { className: "rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm", children: [error.message, /\bTroppe|429|Limite/i.test(error.message || "") && (_jsx("div", { className: "mt-1 text-xs opacity-80", children: "Sibill limita il numero di chiamate: attendi un paio di minuti e riprova." }))] })), _jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-background/60 text-[11px] uppercase tracking-wider text-muted-foreground", children: [_jsx("th", { className: "p-3 w-10", children: _jsx("input", { type: "checkbox", checked: allChecked, onChange: e => {
                                                    const next = {};
                                                    if (e.target.checked)
                                                        filtered.forEach(d => { next[d.id || ""] = true; });
                                                    setSelected(next);
                                                } }) }), _jsx("th", { className: "p-3 w-10" }), _jsx("th", { className: "p-3 text-left", children: "Numero documento" }), _jsx("th", { className: "p-3 text-left", children: "Descrizione" }), _jsx("th", { className: "p-3 text-left", children: "Data documento" }), _jsx("th", { className: "p-3 text-right", children: "Imponibile" }), _jsx("th", { className: "p-3 text-right", children: "IVA" }), _jsx("th", { className: "p-3 text-right", children: "Totale" }), _jsx("th", { className: "p-3 text-left", children: "Categoria" }), _jsx("th", { className: "p-3 text-center", children: "Stato" }), _jsx("th", { className: "p-3 text-center", children: "Copia" })] }) }), _jsxs("tbody", { children: [isFetching && filtered.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 11, className: "p-8 text-center text-muted-foreground", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin inline mr-2" }), " Lettura documenti da Sibill\u2026"] }) })), !isFetching && filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "p-8 text-center text-muted-foreground", children: modo === "IN" ? "Nessuna fattura in entrata trovata su Sibill." : "Nessuna fattura /P trovata su Sibill." }) })), filtered.map((d) => {
                                        const [base, ...rest] = (d.number || "—").split("/");
                                        const suffix = rest.length ? `/${rest.join("/")}` : "";
                                        const consegnata = !!d.delivery_date || d.status === "DELIVERED";
                                        return (_jsxs("tr", { className: "border-t border-border/20 hover:bg-background/40", children: [_jsx("td", { className: "p-3", children: _jsx("input", { type: "checkbox", checked: !!selected[d.id || ""], onChange: e => setSelected(s => ({ ...s, [d.id || ""]: e.target.checked })) }) }), _jsx("td", { className: "p-3 text-muted-foreground", children: _jsx(FileSearch, { className: "h-4 w-4" }) }), _jsxs("td", { className: "p-3", children: [_jsxs("div", { className: "font-medium", children: [base, suffix && _jsx("span", { className: "bg-amber-300/30 text-amber-200 rounded px-0.5", children: suffix })] }), _jsx("div", { className: "text-xs text-muted-foreground", children: d.type === "CREDIT_NOTE" ? "Nota di credito" : "Fattura" })] }), _jsxs("td", { className: "p-3", children: [_jsx("div", { children: d.counterpart || d.notes || "—" }), d.file_name && _jsx("div", { className: "text-[11px] text-muted-foreground truncate max-w-[220px]", children: d.file_name })] }), _jsx("td", { className: "p-3", children: dataIt(d.date) }), _jsx("td", { className: "p-3 text-right", children: eur(d.net) }), _jsx("td", { className: "p-3 text-right text-muted-foreground", children: eur(d.vat) }), _jsx("td", { className: "p-3 text-right font-semibold", children: eur(d.gross) }), _jsx("td", { className: "p-3", children: _jsx("span", { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${d.direction === "RECEIVED"
                                                            ? "bg-blue-600/20 text-blue-200 border border-blue-500/40"
                                                            : "bg-emerald-600/20 text-emerald-200 border border-emerald-500/40"}`, children: d.direction === "RECEIVED" ? "fornitore" : "cliente" }) }), _jsx("td", { className: "p-3 text-center", title: `${d.status || ""} ${d.delivery_date ? "— consegnata " + dataIt(d.delivery_date) : ""}`, children: _jsxs("span", { className: "relative inline-flex", children: [_jsx(Inbox, { className: "h-4 w-4 text-muted-foreground" }), consegnata
                                                                ? _jsx(CheckCircle2, { className: "h-3 w-3 text-emerald-400 absolute -bottom-1 -right-1" })
                                                                : _jsx("span", { className: "h-2 w-2 rounded-full bg-amber-400 absolute -bottom-0.5 -right-0.5" })] }) }), _jsxs("td", { className: "p-3 text-center", children: [_jsx("button", { onClick: () => copia(d), className: "text-muted-foreground hover:text-foreground", title: "Copia riga", children: _jsx(Copy, { className: "h-4 w-4 inline" }) }), _jsx(Mail, { className: "h-4 w-4 inline ml-2 text-muted-foreground/50" })] })] }, d.id || d.number));
                                    })] })] }) }) }), _jsx(FattureEmesseEsitoPanel, { tenantId: tenantId })] }));
}
