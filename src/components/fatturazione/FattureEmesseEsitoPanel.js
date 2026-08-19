import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Clock, XCircle, Send, FileText, Search, Loader2 } from "lucide-react";
const eur = (v) => v == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const dataIt = (d) => {
    if (!d)
        return "—";
    const [y, m, g] = d.slice(0, 10).split("-");
    return y && m && g ? `${g}/${m}/${y}` : d;
};
const TONE = {
    ok: "bg-emerald-600/20 text-emerald-200 border-emerald-500/40",
    wait: "bg-amber-500/15 text-amber-200 border-amber-500/40",
    err: "bg-red-500/15 text-red-200 border-red-500/40",
    idle: "bg-muted/30 text-muted-foreground border-border/40",
};
/** Fatture emesse dal gestionale (comprese quelle di cortesia) con l'esito reale lato Sibill/SdI. */
export function FattureEmesseEsitoPanel({ tenantId }) {
    const [search, setSearch] = useState("");
    const { data, isLoading } = useQuery({
        queryKey: ["fatture-esito-sibill", tenantId],
        refetchInterval: 120000,
        queryFn: async () => {
            let q = supabase.from("fatture").select("*")
                .order("anno", { ascending: false }).order("numero", { ascending: false }).limit(500);
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            const { data: fatture } = await q;
            const list = (fatture || []);
            const ids = list.map((f) => f.id);
            const { data: sync } = ids.length
                ? await supabase.from("fatture_sibill_sync").select("*").in("fattura_id", ids)
                : { data: [] };
            const syncMap = new Map((sync || []).map((s) => [s.fattura_id, s]));
            const docIds = (sync || []).map((s) => s.sibill_document_id).filter(Boolean);
            const numeri = list.map((f) => f.numero_completo).filter(Boolean);
            const { data: docs } = (docIds.length || numeri.length)
                ? await supabase.from("sibill_documents_cache").select("*")
                    .or([
                    docIds.length ? `doc_id.in.(${docIds.join(",")})` : null,
                    numeri.length ? `number.in.(${numeri.map((n) => `"${n}"`).join(",")})` : null,
                ].filter(Boolean).join(","))
                : { data: [] };
            const byDocId = new Map((docs || []).map((d) => [d.doc_id, d]));
            const byNumber = new Map((docs || []).map((d) => [d.number, d]));
            return list.map((f) => {
                const s = syncMap.get(f.id);
                const doc = (s?.sibill_document_id && byDocId.get(s.sibill_document_id)) || byNumber.get(f.numero_completo) || null;
                return { f, s, doc };
            });
        },
    });
    const rows = useMemo(() => {
        const s = search.trim().toLowerCase();
        const all = data || [];
        if (!s)
            return all;
        return all.filter((r) => String(r.f.numero_completo || "").toLowerCase().includes(s) ||
            String(r.f.cliente_ragione_sociale || "").toLowerCase().includes(s));
    }, [data, search]);
    const esito = (r) => {
        const { f, s, doc } = r;
        const stato = String(doc?.status || "").toUpperCase();
        const delivery = String(doc?.delivery_status || "").toUpperCase();
        const mock = !!s?.sibill_document_id?.includes("_mock_");
        if (doc?.delivery_date || stato === "DELIVERED" || delivery === "DELIVERED") {
            return { label: "Consegnata al cassetto fiscale", tone: "ok", icon: CheckCircle2, detail: dataIt(doc?.delivery_date) };
        }
        if (stato === "NOT_DELIVERED") {
            return { label: "Non recapitata — in area riservata", tone: "wait", icon: Clock, detail: doc?.delivery_status || undefined };
        }
        if (["REJECTED", "DISCARDED", "ERROR", "FAILED"].includes(stato) || s?.sync_status === "errore") {
            return { label: "Scartata / errore SdI", tone: "err", icon: XCircle, detail: s?.error_title || stato || delivery };
        }
        if (mock)
            return { label: "Simulazione (MOCK)", tone: "idle", icon: FileText };
        if (s?.sibill_document_id || doc)
            return { label: "Trasmessa — in attesa esito", tone: "wait", icon: Clock, detail: stato || delivery || undefined };
        if (f.stato === "cortesia")
            return { label: "Cortesia — non trasmessa", tone: "idle", icon: FileText };
        return { label: "Non trasmessa a Sibill", tone: "idle", icon: Send };
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Fatture emesse dal gestionale (incl. cortesia)" }), _jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Cerca numero o cliente\u2026", className: "w-full pl-9 pr-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [rows.length, " fatture"] })] }), _jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-background/60 text-[11px] uppercase tracking-wider text-muted-foreground", children: [_jsx("th", { className: "p-3 text-left", children: "Numero" }), _jsx("th", { className: "p-3 text-left", children: "Cliente" }), _jsx("th", { className: "p-3 text-left", children: "Data" }), _jsx("th", { className: "p-3 text-right", children: "Imponibile" }), _jsx("th", { className: "p-3 text-right", children: "Totale" }), _jsx("th", { className: "p-3 text-left", children: "Tipo" }), _jsx("th", { className: "p-3 text-left", children: "Esito Sibill / SdI" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "p-8 text-center text-muted-foreground", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin inline mr-2" }), " Caricamento fatture\u2026"] }) })), !isLoading && rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "p-8 text-center text-muted-foreground", children: "Nessuna fattura emessa dal gestionale." }) })), rows.map((r) => {
                                        const e = esito(r);
                                        const Icon = e.icon;
                                        return (_jsxs("tr", { className: "border-t border-border/20 hover:bg-background/40", children: [_jsx("td", { className: "p-3 font-medium", children: r.f.numero_completo || `${r.f.numero}/${r.f.anno}` }), _jsx("td", { className: "p-3", children: r.f.cliente_ragione_sociale || "—" }), _jsx("td", { className: "p-3", children: dataIt(r.f.data_emissione || r.f.created_at) }), _jsx("td", { className: "p-3 text-right", children: eur(Number(r.f.imponibile ?? 0)) }), _jsx("td", { className: "p-3 text-right font-semibold", children: eur(Number(r.f.totale ?? 0)) }), _jsx("td", { className: "p-3", children: _jsx("span", { className: `inline-flex px-2.5 py-1 rounded-full text-xs border ${r.f.stato === "cortesia"
                                                            ? "bg-amber-500/15 text-amber-200 border-amber-500/40"
                                                            : r.f.stato === "annullata"
                                                                ? "bg-red-500/15 text-red-200 border-red-500/40"
                                                                : "bg-blue-600/20 text-blue-200 border-blue-500/40"}`, children: r.f.stato === "cortesia" ? "Cortesia" : r.f.stato === "annullata" ? "Annullata" : "Elettronica" }) }), _jsxs("td", { className: "p-3", children: [_jsxs("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${TONE[e.tone]}`, title: e.detail || "", children: [_jsx(Icon, { className: "h-3.5 w-3.5" }), e.label] }), e.detail && _jsx("div", { className: "text-[11px] text-muted-foreground mt-1", children: e.detail })] })] }, r.f.id));
                                    })] })] }) }) })] }));
}
