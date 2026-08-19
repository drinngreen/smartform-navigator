import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, PenLine, Search } from "lucide-react";
import { elencoFormulariRentri, dettaglioFormularioRentri, accettaFirInArrivoDestinatario, rentriConfigKey, RENTRI_CF_SOGGETTO, RENTRI_UNITA_LOCALI, } from "@/lib/rentriVpsApi";
function mapRow(d) {
    const dest = Array.isArray(d.destinatari) ? d.destinatari[0] ?? {} : d.destinatario ?? {};
    const tras = Array.isArray(d.trasportatori) ? d.trasportatori[0] ?? {} : {};
    return {
        numero_fir: String(d.numero_fir ?? ""),
        codice_eer: String(d.codice_eer ?? ""),
        quantita: Number(d.quantita ?? 0),
        unita_misura: String(d.unita_misura ?? "kg"),
        stato: String(d.stato ?? ""),
        data_creazione: String(d.data_creazione ?? ""),
        data_emissione: d.data_emissione ? String(d.data_emissione) : undefined,
        produttore_nome: String(d.produttore?.denominazione ?? ""),
        destinatario_nome: String(dest.denominazione ?? ""),
        destinatario_cf: String(dest.codice_fiscale ?? ""),
        trasportatore_nome: String(tras.denominazione ?? ""),
        accettato: Boolean(d.accettazione) || String(d.stato ?? "").toLowerCase().startsWith("accett"),
        raw: d,
    };
}
function fmtDate(v) {
    if (!v)
        return "—";
    const dt = new Date(v);
    return Number.isNaN(dt.getTime()) ? v : dt.toLocaleString("it-IT");
}
export function RentriFirDaFirmarePanel({ cliente }) {
    const configKey = rentriConfigKey(cliente);
    const cfSoggetto = RENTRI_CF_SOGGETTO[configKey] ?? "";
    const unitaLocale = RENTRI_UNITA_LOCALI[configKey] ?? "";
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [filtro, setFiltro] = useState("da_firmare");
    const [q, setQ] = useState("");
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    // firma
    const [firmaFir, setFirmaFir] = useState(null);
    const [kg, setKg] = useState("");
    const [dataArrivo, setDataArrivo] = useState(() => new Date().toISOString().slice(0, 10));
    const [oraArrivo, setOraArrivo] = useState(() => new Date().toTimeString().slice(0, 5));
    const [esito, setEsito] = useState("accettato");
    const [motivazione, setMotivazione] = useState("");
    const [firmando, setFirmando] = useState(false);
    const carica = async () => {
        setLoading(true);
        try {
            const res = await elencoFormulariRentri(cliente, cfSoggetto, unitaLocale);
            if (!res.success)
                throw new Error(res.error || "Errore RENTRI");
            const raw = res.data;
            const list = Array.isArray(raw) ? raw : raw?.formulari ?? raw?.items ?? raw?.content ?? [];
            setRows((Array.isArray(list) ? list : []).map(mapRow));
            toast.success(`${Array.isArray(list) ? list.length : 0} formulari letti da RENTRI`);
        }
        catch (e) {
            toast.error(`RENTRI: ${e.message}`);
            setRows([]);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        carica();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cliente]);
    const visibili = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows
            .filter((r) => (filtro === "tutti" ? true : !r.accettato && r.destinatario_cf === cfSoggetto))
            .filter((r) => !term
            ? true
            : [r.numero_fir, r.codice_eer, r.produttore_nome, r.destinatario_nome, r.trasportatore_nome]
                .join(" ")
                .toLowerCase()
                .includes(term));
    }, [rows, filtro, q, cfSoggetto]);
    const apriDettaglio = async (r) => {
        setDetailLoading(true);
        setDetail({ numero: r.numero_fir, data: null });
        try {
            const res = await dettaglioFormularioRentri(cliente, r.numero_fir, cfSoggetto, unitaLocale);
            if (!res.success)
                throw new Error(res.error || "Errore RENTRI");
            setDetail({ numero: r.numero_fir, data: res.data });
        }
        catch (e) {
            toast.error(`Dettaglio: ${e.message}`);
            setDetail(null);
        }
        finally {
            setDetailLoading(false);
        }
    };
    const apriFirma = (r) => {
        setFirmaFir(r);
        setKg(String(r.quantita || ""));
        setEsito("accettato");
        setMotivazione("");
    };
    const confermaFirma = async () => {
        if (!firmaFir)
            return;
        if (!kg || Number(kg) <= 0)
            return toast.error("Inserisci i kg pesati a destino");
        if (!window.confirm(`Firmare l'accettazione del FIR ${firmaFir.numero_fir} su RENTRI?`))
            return;
        setFirmando(true);
        try {
            const res = await accettaFirInArrivoDestinatario(cliente, firmaFir.numero_fir, {
                data_ora_ricezione: new Date(`${dataArrivo}T${oraArrivo}:00`).toISOString(),
                quantita_ricevuta: { valore: Number(kg), unita_misura: "kg" },
                esito_conferimento: esito === "parziale"
                    ? "ACCETTATO_PARZIALMENTE"
                    : esito === "respinto"
                        ? "RESPINTO"
                        : "ACCETTATO_TOTALMENTE",
                num_iscr_sito: unitaLocale,
                motivazione: motivazione || undefined,
            }, cfSoggetto);
            if (!res.success)
                throw new Error(res.error || "Errore firma");
            toast.success(`FIR ${firmaFir.numero_fir} accettato su RENTRI`);
            setFirmaFir(null);
            carica();
        }
        catch (e) {
            toast.error(`Firma non riuscita: ${e.message}`);
        }
        finally {
            setFirmando(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("button", { onClick: carica, disabled: loading, className: "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60", children: [loading ? _jsx(Loader2, { className: "animate-spin", size: 14 }) : _jsx(RefreshCw, { size: 14 }), "Cerca su RENTRI"] }), _jsx("div", { className: "flex overflow-hidden rounded-md border border-border", children: ["da_firmare", "tutti"].map((f) => (_jsx("button", { onClick: () => setFiltro(f), className: `px-3 py-2 text-xs font-semibold ${filtro === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`, children: f === "da_firmare" ? "Da firmare" : "Tutti" }, f))) }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 14, className: "absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" }), _jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Cerca numero, CER, ditta\u2026", className: "rounded-md border border-border bg-background py-2 pl-7 pr-3 text-sm" })] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: ["Soggetto: ", cfSoggetto, " \u00B7 U.L. ", unitaLocale, " \u00B7 ", visibili.length, " risultati"] })] }), _jsx("div", { className: "overflow-x-auto rounded-lg border border-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-muted/50 text-xs uppercase text-muted-foreground", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Numero FIR" }), _jsx("th", { className: "px-3 py-2 text-left", children: "CER" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Produttore" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Trasportatore" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Destinatario" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Q.t\u00E0" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Stato" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Emissione" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Azioni" })] }) }), _jsxs("tbody", { children: [visibili.map((r) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs font-bold", children: r.numero_fir }), _jsx("td", { className: "px-3 py-2 font-mono text-xs", children: r.codice_eer }), _jsx("td", { className: "px-3 py-2 text-xs", children: r.produttore_nome }), _jsx("td", { className: "px-3 py-2 text-xs", children: r.trasportatore_nome }), _jsx("td", { className: "px-3 py-2 text-xs", children: r.destinatario_nome }), _jsxs("td", { className: "px-3 py-2 text-right font-mono text-xs", children: [r.quantita.toLocaleString("it-IT"), " ", r.unita_misura] }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded px-2 py-0.5 text-[11px] font-semibold ${r.accettato ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`, children: r.stato || (r.accettato ? "Accettato" : "Da firmare") }) }), _jsx("td", { className: "px-3 py-2 text-xs", children: fmtDate(r.data_emissione ?? r.data_creazione) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx("button", { onClick: () => apriDettaglio(r), className: "rounded border border-border px-2 py-1 text-[11px]", children: "Dettaglio" }), !r.accettato && r.destinatario_cf === cfSoggetto && (_jsxs("button", { onClick: () => apriFirma(r), className: "inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-1 text-[11px] font-semibold text-black", children: [_jsx(PenLine, { size: 11 }), " Firma"] }))] }) })] }, r.numero_fir))), visibili.length === 0 && !loading && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "px-3 py-6 text-center text-sm text-muted-foreground", children: "Nessun formulario trovato su RENTRI con questo filtro." }) }))] })] }) }), detail && (_jsx("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4", onClick: () => setDetail(null), onKeyDown: (e) => e.key === "Escape" && setDetail(null), children: _jsxs("div", { className: "max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-card p-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("h3", { className: "font-bold", children: ["Dettaglio RENTRI \u00B7 ", detail.numero] }), _jsx("button", { type: "button", onClick: () => setDetail(null), className: "rounded border border-border bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground", children: "\u2715 Chiudi" })] }), detailLoading ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "animate-spin", size: 14 }), " Caricamento\u2026"] })) : (_jsx("pre", { className: "whitespace-pre-wrap break-all rounded bg-muted/40 p-3 text-[11px]", children: JSON.stringify(detail.data, null, 2) }))] }) })), firmaFir && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4", children: _jsxs("div", { className: "w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-4", children: [_jsxs("h3", { className: "font-bold", children: ["Firma accettazione \u00B7 ", firmaFir.numero_fir] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("label", { className: "text-xs", children: ["Data arrivo", _jsx("input", { type: "date", value: dataArrivo, onChange: (e) => setDataArrivo(e.target.value), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" })] }), _jsxs("label", { className: "text-xs", children: ["Ora arrivo", _jsx("input", { type: "time", value: oraArrivo, onChange: (e) => setOraArrivo(e.target.value), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" })] })] }), _jsxs("label", { className: "block text-xs", children: ["Kg accettati a destino", _jsx("input", { type: "number", value: kg, onChange: (e) => setKg(e.target.value), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" })] }), _jsxs("label", { className: "block text-xs", children: ["Esito", _jsxs("select", { value: esito, onChange: (e) => setEsito(e.target.value), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm", children: [_jsx("option", { value: "accettato", children: "Accettato totalmente" }), _jsx("option", { value: "parziale", children: "Accettato parzialmente" }), _jsx("option", { value: "respinto", children: "Respinto" })] })] }), esito !== "accettato" && (_jsxs("label", { className: "block text-xs", children: ["Motivazione", _jsx("input", { value: motivazione, onChange: (e) => setMotivazione(e.target.value), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm" })] })), _jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [_jsx("button", { onClick: () => setFirmaFir(null), className: "rounded border border-border px-3 py-1.5 text-sm", children: "Annulla" }), _jsxs("button", { onClick: confermaFirma, disabled: firmando, className: "inline-flex items-center gap-2 rounded bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60", children: [firmando ? _jsx(Loader2, { className: "animate-spin", size: 14 }) : _jsx(PenLine, { size: 14 }), "Firma su RENTRI"] })] })] }) }))] }));
}
