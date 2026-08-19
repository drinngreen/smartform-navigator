import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Search, Eye, Trash2, FileCode, Send, Lock, Clock, Loader2, AlertCircle, FileText, Package, UploadCloud, CheckCircle2, XCircle, BadgeEuro, AlertTriangle, RefreshCw, } from "lucide-react";
import { toast } from "sonner";
import { NuovaFatturaDialog } from "./NuovaFatturaDialog";
import { FatturaViewerDialog } from "./FatturaViewerDialog";
import { NoleggiTab } from "./NoleggiTab";
import { SibillDocumentiPanel } from "./SibillDocumentiPanel";
import { inviaFatturaASibill, fetchSibillSync, aggiornaStatiSibill, elencaDocumentiSibill, isMockSync } from "@/lib/sibill";
const STATO_COLORS = {
    cortesia: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    inviata: "bg-blue-600/20 border-blue-500/60 text-blue-200",
    annullata: "bg-red-500/15 border-red-500/40 text-red-300",
};
const STATO_ROW = {
    cortesia: "bg-amber-500/[0.06] hover:bg-amber-500/[0.12]",
    inviata: "bg-blue-600/[0.10] hover:bg-blue-600/[0.18]",
    annullata: "bg-red-500/[0.06] hover:bg-red-500/[0.12]",
};
const STATO_LABEL = {
    cortesia: "Cortesia",
    inviata: "Inviata SdI",
    annullata: "Annullata",
};
export function FatturazioneModule({ tenantId }) {
    const [tab, setTab] = useState("fatture");
    const [search, setSearch] = useState("");
    const [filterStato, setFilterStato] = useState("tutti");
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [viewId, setViewId] = useState(null);
    const qc = useQueryClient();
    const { data: fatture = [], isLoading } = useQuery({
        queryKey: ["fatture", tenantId],
        queryFn: async () => {
            let q = supabase.from("fatture").select("*").order("anno", { ascending: false }).order("numero", { ascending: false });
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return (data || []);
        },
    });
    const { data: sibillMap = {} } = useQuery({
        queryKey: ["fatture-sibill", fatture.map((f) => f.id).join(",")],
        enabled: fatture.length > 0,
        refetchInterval: 60000,
        queryFn: async () => fetchSibillSync(fatture.map((f) => f.id)),
    });
    // Realtime: appena il webhook Sibill aggiorna il DB, la lista si ricolora da sola
    useEffect(() => {
        const channel = supabase
            .channel("fatture-sibill-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "fatture" }, () => {
            qc.invalidateQueries({ queryKey: ["fatture"] });
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "fatture_sibill_sync" }, () => {
            qc.invalidateQueries({ queryKey: ["fatture-sibill"] });
        })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [qc]);
    const [sibillMock, setSibillMock] = useState(() => localStorage.getItem("sibill_mock_mode") !== "false");
    const sibillMut = useMutation({
        mutationFn: async (f) => {
            const res = await inviaFatturaASibill(f, { mock: sibillMock });
            if (f.stato !== "inviata") {
                await supabase.from("fatture").update({
                    stato: "inviata", locked: true, inviata_at: new Date().toISOString(),
                }).eq("id", f.id);
            }
            return res;
        },
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["fatture-sibill"] });
            qc.invalidateQueries({ queryKey: ["fatture"] });
            toast.success(res?.mock ? "MOCK: fattura trasmessa (simulazione, nessun invio reale)" : "Fattura trasmessa a Sibill");
        },
        onError: (e) => toast.error(e.message || "Errore invio a Sibill", { duration: 8000 }),
    });
    // Documenti realmente presenti su Sibill (stato lato provider)
    const [docsSibill, setDocsSibill] = useState(null);
    // Allineamento stati reali da Sibill (usato anche quando si passa da MOCK a REALE)
    const refreshMut = useMutation({
        mutationFn: async () => {
            const sync = fatture.length ? await aggiornaStatiSibill(fatture.map((f) => f.id)) : { checked: 0, results: [] };
            const docs = await elencaDocumentiSibill({ mock: sibillMock });
            return { sync, docs };
        },
        onSuccess: (res) => {
            setDocsSibill(res.docs || []);
            qc.invalidateQueries({ queryKey: ["fatture-sibill"] });
            qc.invalidateQueries({ queryKey: ["fatture"] });
            toast.success(`Sincronizzazione completata: ${res.sync?.checked ?? 0} fatture locali verificate, ${res.docs?.length ?? 0} documenti su Sibill`);
        },
        onError: (e) => toast.error(e.message || "Impossibile aggiornare gli stati da Sibill", { duration: 8000 }),
    });
    const setModalita = (mockMode) => {
        setSibillMock(mockMode);
        localStorage.setItem("sibill_mock_mode", mockMode ? "true" : "false");
        setDocsSibill(null);
        setTimeout(() => refreshMut.mutate(), 0);
    };
    const sibillStats = useMemo(() => {
        const list = fatture.map((f) => sibillMap[f.id]);
        return {
            reali: list.filter(s => s && !isMockSync(s) && s.sync_status !== "errore").length,
            mock: list.filter(s => isMockSync(s)).length,
            errore: list.filter(s => s?.sync_status === "errore").length,
            nonInviate: list.filter(s => !s).length,
        };
    }, [fatture, sibillMap]);
    const delMut = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("fatture").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatture"] }); toast.success("Fattura eliminata"); },
        onError: (e) => toast.error(e.message || "Impossibile eliminare"),
    });
    const sendXmlMut = useMutation({
        mutationFn: async (f) => {
            const created = new Date(f.created_at).getTime();
            if (Date.now() - created < 24 * 3600 * 1000) {
                throw new Error("Attendere 24 ore dalla generazione prima dell'invio al Cassetto Fiscale");
            }
            const { buildFatturaPAXml, creaPrimaNotaDaFattura } = await import("@/lib/fatturaPA");
            const { data: righe } = await supabase.from("fatture_righe").select("*").eq("fattura_id", f.id).order("ordine");
            const rows = (righe || []);
            const xml = buildFatturaPAXml(f, rows.map(r => ({
                descrizione: r.descrizione, quantita: Number(r.quantita || 1),
                unita_misura: r.unita_misura || "n", prezzo_unitario: Number(r.prezzo_unitario || r.imponibile),
                imponibile: Number(r.imponibile), aliquota_iva: Number(r.aliquota_iva || 22),
                reverse_charge: !!r.reverse_charge,
            })));
            const blob = new Blob([xml], { type: "application/xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `IT${f.cliente_partita_iva || "00000000000"}_${String(f.numero).padStart(5, "0")}.xml`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            const tipo = (f.note || "").toLowerCase().includes("noleggio") ? "noleggio" : "servizi";
            try {
                await creaPrimaNotaDaFattura(f, tipo);
            }
            catch (e) {
                toast.warning(`XML generato ma Prima Nota non registrata: ${e.message}`);
            }
            const { error } = await supabase.from("fatture").update({
                stato: "inviata", locked: true, inviata_at: new Date().toISOString(), xml_generato_at: new Date().toISOString(),
            }).eq("id", f.id);
            if (error)
                throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["fatture"] }); toast.success("XML FatturaPA generato, Prima Nota registrata, fattura bloccata"); },
        onError: (e) => toast.error(e.message || "Errore invio"),
    });
    const filtered = useMemo(() => fatture.filter(f => {
        if (filterStato !== "tutti" && f.stato !== filterStato)
            return false;
        if (filterFrom && f.data_emissione < filterFrom)
            return false;
        if (filterTo && f.data_emissione > filterTo)
            return false;
        if (search) {
            const s = search.toLowerCase();
            if (!(String(f.numero_completo).includes(s) || f.cliente_ragione_sociale?.toLowerCase().includes(s)))
                return false;
        }
        return true;
    }), [fatture, filterStato, filterFrom, filterTo, search]);
    const eur = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => setTab("fatture"), className: `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "fatture" ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground"}`, children: [_jsx(FileText, { className: "h-4 w-4" }), " Fatture"] }), _jsxs("button", { onClick: () => setTab("noleggi"), className: `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "noleggi" ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground"}`, children: [_jsx(Package, { className: "h-4 w-4" }), " Noleggi (mese scorso)"] }), _jsxs("button", { onClick: () => setTab("sibill"), className: `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "sibill" ? "bg-primary/20 border-primary/40 text-primary" : "bg-card/40 border-border/30 text-muted-foreground"}`, children: [_jsx(BadgeEuro, { className: "h-4 w-4" }), " Sibill \u2014 Emesse (/P)"] }), _jsxs("button", { onClick: () => setTab("sibill_in"), className: `px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border ${tab === "sibill_in" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-card/40 border-border/30 text-muted-foreground"}`, children: [_jsx(UploadCloud, { className: "h-4 w-4 rotate-180" }), " Sibill \u2014 Ricevute (entrata)"] })] }), tab === "sibill" || tab === "sibill_in" ? (_jsx(SibillDocumentiPanel, { mock: sibillMock, tenantId: tenantId, initialMode: tab === "sibill_in" ? "IN" : "P" }, tab)) : tab === "noleggi" ? (_jsx(NoleggiTab, { tenantId: tenantId, onCreated: () => qc.invalidateQueries({ queryKey: ["fatture"] }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Numero o cliente...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsxs("select", { value: filterStato, onChange: e => setFilterStato(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm", children: [_jsx("option", { value: "tutti", children: "Tutti gli stati" }), _jsx("option", { value: "cortesia", children: "\uD83D\uDFE1 Cortesia" }), _jsx("option", { value: "inviata", children: "\uD83D\uDD35 Inviate SdI" }), _jsx("option", { value: "annullata", children: "Annullate" })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5", children: "Da (gg/mm/aaaa)" }), _jsx("input", { type: "date", lang: "it-IT", value: filterFrom, onChange: e => setFilterFrom(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5", children: "A (gg/mm/aaaa)" }), _jsx("input", { type: "date", lang: "it-IT", value: filterTo, onChange: e => setFilterTo(e.target.value), className: "px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuova Fattura"] })] }), _jsxs("div", { className: `rounded-xl border px-4 py-3 text-xs space-y-2 ${sibillMock ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsx("span", { className: "font-medium", children: "Modalit\u00E0 invio Sibill:" }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", name: "sibill_mode", checked: sibillMock, onChange: () => setModalita(true) }), _jsx("span", { className: sibillMock ? "text-amber-300 font-medium" : "text-muted-foreground", children: "MOCK \u2014 simulazione, nessun invio reale" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "radio", name: "sibill_mode", checked: !sibillMock, onChange: () => setModalita(false) }), _jsx("span", { className: !sibillMock ? "text-emerald-300 font-medium" : "text-muted-foreground", children: "REALE \u2014 invio con chiave API configurata" })] }), _jsxs("button", { onClick: () => refreshMut.mutate(), disabled: refreshMut.isPending, className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-background/40 text-foreground hover:bg-background/70 disabled:opacity-40", title: "Rilegge da Sibill lo stato reale delle fatture trasmesse e l'elenco documenti", children: [refreshMut.isPending ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(RefreshCw, { className: "h-3.5 w-3.5" }), "Aggiorna stati da Sibill"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("span", { className: "px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300", children: ["Reali sincronizzate: ", sibillStats.reali] }), _jsxs("span", { className: "px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300", children: ["Simulate MOCK: ", sibillStats.mock] }), _jsxs("span", { className: "px-2 py-1 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300", children: ["In errore: ", sibillStats.errore] }), _jsxs("span", { className: "px-2 py-1 rounded-lg border border-border/40 bg-background/40 text-muted-foreground", children: ["Mai inviate: ", sibillStats.nonInviate] }), !sibillMock && sibillStats.mock > 0 && (_jsxs("span", { className: "text-amber-300", children: ["In modalit\u00E0 REALE le ", sibillStats.mock, " fatture marcate MOCK non esistono su Sibill: vanno ritrasmesse."] }))] }), docsSibill && (_jsx("div", { className: "rounded-lg border border-border/40 bg-background/40 p-2 text-muted-foreground", children: docsSibill.length === 0 ? (_jsxs("span", { children: ["Nessun documento presente su Sibill", sibillMock ? " (mock)" : " con la chiave API configurata", "."] })) : (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-foreground font-medium", children: ["Documenti su Sibill: ", docsSibill.length] }), _jsx("div", { className: "max-h-40 overflow-y-auto space-y-0.5", children: docsSibill.map(d => (_jsxs("div", { className: "flex flex-wrap gap-2 font-mono text-[11px]", children: [_jsx("span", { className: "text-foreground", children: d.number || d.id }), _jsx("span", { children: d.date || "—" }), _jsx("span", { children: d.counterpart || "—" }), _jsx("span", { className: "text-emerald-300", children: d.status || "—" }), _jsx("span", { className: "text-blue-300", children: d.delivery_status || "—" })] }, d.id || Math.random()))) })] })) })), _jsx("div", { className: "text-muted-foreground", children: sibillMock
                                    ? "Le fatture seguono l'intero flusso reale (stati, badge, sincronizzazione) ma non vengono trasmesse a Sibill."
                                    : "ATTENZIONE: invio REALE a Sibill con la chiave API configurata." })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx(SummaryCard, { label: "Totale Fatture", value: String(fatture.length), tone: "text-foreground" }), _jsx(SummaryCard, { label: "\uD83D\uDFE1 Cortesia", value: String(fatture.filter(f => f.stato === "cortesia").length), tone: "text-amber-300" }), _jsx(SummaryCard, { label: "\uD83D\uDD35 Inviate SdI", value: String(fatture.filter(f => f.stato === "inviata").length), tone: "text-blue-300" }), _jsx(SummaryCard, { label: "Totale \u20AC", value: eur(fatture.reduce((s, f) => s + Number(f.totale || 0), 0)), tone: "text-primary" })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsxs("div", { className: "p-8 text-center text-muted-foreground flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " Caricamento..."] })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessuna fattura" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-border/30 text-left", children: ["Numero", "Data", "Cliente", "P.IVA", "Imponibile", "IVA", "Totale", "Stato", "Sibill", "Azioni"].map(h => (_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: h }, h))) }) }), _jsx("tbody", { children: filtered.map(f => {
                                            const stato = (f.stato || "cortesia");
                                            const canSendXml = stato === "cortesia" && (Date.now() - new Date(f.created_at).getTime()) >= 24 * 3600 * 1000;
                                            const sib = sibillMap[f.id];
                                            return (_jsxs("tr", { className: `border-b border-border/10 transition-colors ${STATO_ROW[stato]}`, children: [_jsx("td", { className: "px-4 py-3 font-mono font-semibold text-foreground", children: _jsxs("span", { className: "inline-flex items-center gap-1.5", children: [f.numero_completo, (sib?.sync_status === "errore" || sib?.error_title) && (_jsx("span", { title: `Scartata da Sibill: ${sib?.error_title || ""} ${sib?.error_detail || ""}`.trim(), children: _jsx(AlertTriangle, { className: "h-4 w-4 text-red-400" }) }))] }) }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: f.data_emissione }), _jsx("td", { className: "px-4 py-3 text-foreground", children: f.cliente_ragione_sociale }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: f.cliente_partita_iva || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-muted-foreground", children: eur(Number(f.imponibile)) }), _jsx("td", { className: "px-4 py-3 font-mono text-muted-foreground", children: eur(Number(f.iva)) }), _jsx("td", { className: "px-4 py-3 font-mono font-semibold", children: eur(Number(f.totale)) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("span", { className: `inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${STATO_COLORS[stato]}`, children: [stato === "inviata" ? _jsx(Lock, { className: "h-3 w-3" }) : _jsx(Clock, { className: "h-3 w-3" }), STATO_LABEL[stato]] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(SibillBadge, { sync: sib }), isMockSync(sib) && (_jsx("span", { className: "px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] font-semibold", title: "Stato generato in simulazione MOCK: non presente su Sibill", children: "MOCK" })), _jsx(IncassoBadge, { sync: sib })] }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setViewId(f.id), className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground", title: "Visualizza / PDF", children: _jsx(Eye, { className: "h-3.5 w-3.5" }) }), _jsxs("button", { onClick: () => confirm(sibillMock
                                                                        ? `MOCK: simulare l'invio della fattura ${f.numero_completo}? Nessun dato verrà inviato a Sibill.`
                                                                        : `Inviare REALMENTE la fattura ${f.numero_completo} a Sibill?`) && sibillMut.mutate(f), disabled: sibillMut.isPending || sib?.sync_status === "sincronizzata" || sib?.sync_status === "incassata", className: "p-1.5 rounded-lg text-xs flex items-center gap-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed", title: sibillMock ? "Invio simulato (MOCK)" : "Invia a Sibill", children: [sibillMut.isPending ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(UploadCloud, { className: "h-3.5 w-3.5" }), " ", sibillMock ? "Sibill (mock)" : "Sibill"] }), stato === "cortesia" && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => canSendXml
                                                                                ? (confirm(`Generare XML e bloccare fattura ${f.numero_completo}?`) && sendXmlMut.mutate(f))
                                                                                : toast.warning("Attendere 24h dalla generazione"), className: `p-1.5 rounded-lg text-xs flex items-center gap-1 ${canSendXml ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-muted/20 text-muted-foreground cursor-not-allowed"}`, title: "Invia a Cassetto Fiscale (XML)", children: [_jsx(FileCode, { className: "h-3.5 w-3.5" }), " XML"] }), _jsx("button", { onClick: () => confirm(`Eliminare fattura ${f.numero_completo}?`) && delMut.mutate(f.id), className: "p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive", title: "Elimina", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] })), stato === "inviata" && (_jsxs("span", { className: "text-xs text-blue-300 flex items-center gap-1", children: [_jsx(Send, { className: "h-3 w-3" }), "Inviata"] }))] }) })] }, f.id));
                                        }) })] }) })) }), _jsxs("div", { className: "flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/80", children: [_jsx(AlertCircle, { className: "h-4 w-4 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("strong", { className: "text-amber-300", children: "Workflow Cortesia \u2192 SdI:" }), " ogni fattura resta in stato \"Cortesia\" (modificabile) per almeno 24 ore. Al termine \u00E8 possibile generare l'XML ufficiale, che blocca la fattura in modo definitivo. Le fatture ", _jsx("span", { className: "text-blue-300 font-semibold", children: "BLU" }), " sono inviate e non modificabili; le ", _jsx("span", { className: "text-amber-300 font-semibold", children: "GIALLE" }), " sono ancora bozze di cortesia."] })] })] })), showNew && (_jsx(NuovaFatturaDialog, { tenantId: tenantId, onClose: () => setShowNew(false), onCreated: () => { setShowNew(false); qc.invalidateQueries({ queryKey: ["fatture"] }); } })), viewId && (_jsx(FatturaViewerDialog, { fatturaId: viewId, onClose: () => setViewId(null) }))] }));
}
function SibillBadge({ sync }) {
    if (!sync) {
        return _jsx("span", { className: "text-xs text-muted-foreground", children: "Non inviata" });
    }
    if (sync.sync_status === "errore") {
        return (_jsxs("span", { title: `${sync.error_title || "Errore"}: ${sync.error_detail || ""}`, className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium bg-red-500/15 border-red-500/40 text-red-300", children: [_jsx(XCircle, { className: "h-3 w-3" }), " Errore Invio"] }));
    }
    if (sync.payment_status === "PAID" || sync.sync_status === "incassata") {
        return (_jsxs("span", { title: `Incassata ${sync.payment_date || ""} ${sync.payment_method || ""}`, className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium bg-emerald-500/15 border-emerald-500/40 text-emerald-300", children: [_jsx(BadgeEuro, { className: "h-3 w-3" }), " Incassata"] }));
    }
    return (_jsxs("span", { title: `Doc ${sync.sibill_document_id || "—"} • ${sync.document_status || ""} ${sync.delivery_status || ""}`, className: "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium bg-blue-600/20 border-blue-500/60 text-blue-200", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), " Sincronizzata"] }));
}
function IncassoBadge({ sync }) {
    const incassata = sync?.payment_status === "PAID" || sync?.sync_status === "incassata";
    return (_jsxs("span", { title: incassata ? `Incassata ${sync?.payment_date || ""} ${sync?.payment_method || ""}`.trim() : "Pagamento non ancora registrato", className: `inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${incassata
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
            : "bg-red-500/15 border-red-500/40 text-red-300"}`, children: [_jsx(BadgeEuro, { className: "h-3 w-3" }), " ", incassata ? "Incassata" : "Non Incassata"] }));
}
function SummaryCard({ label, value, tone }) {
    return (_jsxs("div", { className: "p-3 rounded-xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsx("p", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: label }), _jsx("p", { className: `text-lg font-semibold ${tone}`, children: value })] }));
}
