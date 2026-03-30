import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Loader2, Send, Download, Truck, Factory, Zap, FileText, CheckCircle2, XCircle, List, Search } from "lucide-react";
import { listaBlocchi, richiestaVidimazione, emissioneFir, firmaRicezione, scaricaPdfLotto, statoTransazioneFir, statoTransazioneRegistro, } from "@/lib/rentriVpsApi";
import { getBlocksForTenant, getPrimaryBlock } from "@/lib/rentriBlockCodes";
const COMPANY_MAP = {
    global: "GLOBAL",
    multy: "MULTY",
    niyol: "NIYOL",
};
function ResultBanner({ result }) {
    if (!result)
        return null;
    return (_jsxs("div", { className: `mt-3 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-auto border ${result.ok ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`, children: [_jsxs("div", { className: "flex items-center gap-1 mb-1 font-semibold", children: [result.ok ? _jsx(CheckCircle2, { size: 14 }) : _jsx(XCircle, { size: 14 }), result.ok ? "Successo" : "Errore"] }), JSON.stringify(result.data, null, 2)] }));
}
export function RENTRIActionsPanel({ tenant }) {
    const company = COMPANY_MAP[tenant] || "GLOBAL";
    const cliente = (tenant.toLowerCase());
    const blocks = getBlocksForTenant(tenant);
    const primary = getPrimaryBlock(tenant);
    /* ── Lista Blocchi ── */
    const [lbLoading, setLbLoading] = useState(false);
    const [lbResult, setLbResult] = useState(null);
    /* ── Vidimazione ── */
    const [vidQty, setVidQty] = useState(5);
    const [vidBlock, setVidBlock] = useState(primary?.code ?? "");
    const [vidLoading, setVidLoading] = useState(false);
    const [vidResult, setVidResult] = useState(null);
    /* ── Emissione ── */
    const [emPayload, setEmPayload] = useState("{}");
    const [emLoading, setEmLoading] = useState(false);
    const [emResult, setEmResult] = useState(null);
    /* ── Firma Ricezione ── */
    const [frPayload, setFrPayload] = useState("{}");
    const [frLoading, setFrLoading] = useState(false);
    const [frResult, setFrResult] = useState(null);
    /* ── Scarica PDF ── */
    const [pdfBlock, setPdfBlock] = useState(primary?.code ?? "");
    const [pdfProg, setPdfProg] = useState("");
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfResult, setPdfResult] = useState(null);
    /* ── Transazione ── */
    const [txnId, setTxnId] = useState("");
    const [txnType, setTxnType] = useState("fir");
    const [txnLoading, setTxnLoading] = useState(false);
    const [txnResult, setTxnResult] = useState(null);
    const cardClass = "rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3";
    const btnClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40";
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Zap, { size: 18, className: "text-primary" }), _jsx("h2", { className: "text-lg font-display tracking-wider", children: "Azioni RENTRI \u2014 VPS Proxy" }), _jsxs("span", { className: "text-xs text-muted-foreground ml-2", children: ["Tenant: ", _jsx("strong", { className: "text-foreground", children: company })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(List, { size: 14, className: "text-primary" }), " Lista Blocchi Attivi"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Interroga RENTRI per i blocchi vidimazione disponibili." }), _jsxs("button", { disabled: lbLoading, className: `${btnClass} bg-primary text-primary-foreground hover:bg-primary/80`, onClick: async () => { setLbLoading(true); setLbResult(null); const r = await listaBlocchi(cliente); setLbResult({ ok: r.success, data: r.data }); setLbLoading(false); }, children: [lbLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(List, { size: 14 }), " Interroga"] }), _jsx(ResultBanner, { result: lbResult })] }), _jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(FileText, { size: 14, className: "text-primary" }), " Richiedi Nuovi FIR (Vidimazione)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Richiede un nuovo numero FIR dal RENTRI." }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Blocco:" }), _jsx("select", { value: vidBlock, onChange: (e) => setVidBlock(e.target.value), className: "rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm", children: blocks.map(b => _jsxs("option", { value: b.code, children: [b.code, " \u2014 ", b.label] }, b.code)) }), _jsx("label", { className: "text-xs text-muted-foreground", children: "Qt\u00E0:" }), _jsx("input", { type: "number", min: 1, max: 500, value: vidQty, onChange: (e) => setVidQty(Number(e.target.value)), className: "w-20 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" }), _jsxs("button", { disabled: vidLoading, className: `${btnClass} bg-primary text-primary-foreground hover:bg-primary/80`, onClick: async () => {
                                            setVidLoading(true);
                                            setVidResult(null);
                                            const block = blocks.find(b => b.code === vidBlock);
                                            const r = await richiestaVidimazione(cliente, vidQty, vidBlock, block?.sito ?? undefined);
                                            setVidResult({ ok: r.success, data: r.data });
                                            setVidLoading(false);
                                        }, children: [vidLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Send, { size: 14 }), " Invia"] })] }), _jsx(ResultBanner, { result: vidResult })] }), _jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(Truck, { size: 14, className: "text-cyan-400" }), " Emetti FIR (Firma Partenza)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Firma digitalmente il FIR e lo invia al RENTRI." }), _jsx("textarea", { value: emPayload, onChange: (e) => setEmPayload(e.target.value), rows: 3, placeholder: '{"produttore": {...}, "rifiuto": {...}}', className: "w-full rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-mono" }), _jsxs("button", { disabled: emLoading, className: `${btnClass} bg-cyan-600 text-white hover:bg-cyan-700`, onClick: async () => {
                                    setEmLoading(true);
                                    setEmResult(null);
                                    try {
                                        const p = JSON.parse(emPayload);
                                        const r = await emissioneFir(cliente, p);
                                        setEmResult({ ok: r.success, data: r.data });
                                    }
                                    catch {
                                        setEmResult({ ok: false, data: { error: "JSON non valido" } });
                                    }
                                    setEmLoading(false);
                                }, children: [emLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Send, { size: 14 }), " Emetti"] }), _jsx(ResultBanner, { result: emResult })] }), _jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(Factory, { size: 14, className: "text-orange-400" }), " Firma Ricezione (Impianto)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Firma l'accettazione del rifiuto in impianto." }), _jsx("textarea", { value: frPayload, onChange: (e) => setFrPayload(e.target.value), rows: 3, placeholder: '{"arrivo": {...}, "accettazione": {...}}', className: "w-full rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-mono" }), _jsxs("button", { disabled: frLoading, className: `${btnClass} bg-orange-600 text-white hover:bg-orange-700`, onClick: async () => {
                                    setFrLoading(true);
                                    setFrResult(null);
                                    try {
                                        const p = JSON.parse(frPayload);
                                        const r = await firmaRicezione(cliente, p);
                                        setFrResult({ ok: r.success, data: r.data });
                                    }
                                    catch {
                                        setFrResult({ ok: false, data: { error: "JSON non valido" } });
                                    }
                                    setFrLoading(false);
                                }, children: [frLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Send, { size: 14 }), " Firma Ricezione"] }), _jsx(ResultBanner, { result: frResult })] }), _jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(Download, { size: 14, className: "text-green-400" }), " Scarica PDF (QR Code)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Recupera il PDF vidimato con QR Code dal RENTRI." }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("select", { value: pdfBlock, onChange: (e) => setPdfBlock(e.target.value), className: "rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm", children: blocks.map(b => _jsx("option", { value: b.code, children: b.code }, b.code)) }), _jsx("input", { type: "text", value: pdfProg, onChange: (e) => setPdfProg(e.target.value), placeholder: "Progressivo", className: "w-28 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" }), _jsxs("button", { disabled: pdfLoading || !pdfProg.trim(), className: `${btnClass} bg-green-600 text-white hover:bg-green-700`, onClick: async () => { setPdfLoading(true); setPdfResult(null); const r = await scaricaPdfLotto(cliente, pdfBlock, pdfProg.trim()); setPdfResult({ ok: r.success, data: r.data }); setPdfLoading(false); }, children: [pdfLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Download, { size: 14 }), " Scarica"] })] }), _jsx(ResultBanner, { result: pdfResult })] }), _jsxs("div", { className: cardClass, children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(Search, { size: 14, className: "text-yellow-400" }), " Stato Transazione"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Verifica l'esito di una transazione asincrona RENTRI." }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("select", { value: txnType, onChange: (e) => setTxnType(e.target.value), className: "rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm", children: [_jsx("option", { value: "fir", children: "FIR" }), _jsx("option", { value: "registro", children: "Registro" })] }), _jsx("input", { type: "text", value: txnId, onChange: (e) => setTxnId(e.target.value), placeholder: "Transazione ID", className: "flex-1 min-w-[180px] rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm" }), _jsxs("button", { disabled: txnLoading || !txnId.trim(), className: `${btnClass} bg-yellow-600 text-white hover:bg-yellow-700`, onClick: async () => {
                                            setTxnLoading(true);
                                            setTxnResult(null);
                                            const r = txnType === "fir"
                                                ? await statoTransazioneFir(cliente, txnId.trim())
                                                : await statoTransazioneRegistro(cliente, txnId.trim());
                                            setTxnResult({ ok: r.success, data: r.data });
                                            setTxnLoading(false);
                                        }, children: [txnLoading ? _jsx(Loader2, { size: 14, className: "animate-spin" }) : _jsx(Search, { size: 14 }), " Verifica"] })] }), _jsx(ResultBanner, { result: txnResult })] })] })] }));
}
