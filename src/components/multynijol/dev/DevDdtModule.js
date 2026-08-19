import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Printer, Loader2, X, Truck } from "lucide-react";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const CAUSALI = [
    "Conto proprio",
    "Vendita",
    "Reso",
    "Trasferimento cassone vuoto",
    "Trasferimento cassone pieno",
    "Riparazione",
    "Manutenzione",
    "Comodato d'uso",
    "Altro",
];
export function DevDdtModule({ tenantId = MULTY_TENANT_ID, tenantLabel = "Multyproget" }) {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [printing, setPrinting] = useState(null);
    const [form, setForm] = useState({
        data: new Date().toISOString().slice(0, 10),
        causale_trasporto: "Conto proprio",
    });
    const { data: ddts, isLoading } = useQuery({
        queryKey: ["ddt", tenantId],
        queryFn: async () => {
            const { data, error } = await supabase.from("ddt_forms").select("*").eq("tenant_id", tenantId).order("data", { ascending: false });
            if (error)
                throw error;
            return (data || []);
        },
    });
    const invalidate = () => qc.invalidateQueries({ queryKey: ["ddt", tenantId] });
    const create = useMutation({
        mutationFn: async (p) => {
            if (!p.cliente_destinatario || !p.descrizione_bene)
                throw new Error("Cliente e descrizione bene sono obbligatori");
            const anno = new Date(p.data || new Date()).getFullYear();
            const { data: numData, error: numErr } = await supabase.rpc("next_ddt_number", { p_tenant_id: tenantId, p_anno: anno });
            if (numErr)
                throw numErr;
            const payload = { ...p, tenant_id: tenantId, anno, numero_ddt: numData };
            const { data, error } = await supabase.from("ddt_forms").insert(payload).select().single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: (d) => {
            toast.success(`DDT ${d.numero_ddt} creato`);
            setShowForm(false);
            setForm({ data: new Date().toISOString().slice(0, 10), causale_trasporto: "Conto proprio" });
            invalidate();
        },
        onError: (e) => toast.error(e.message),
    });
    const del = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("ddt_forms").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => { toast.success("DDT eliminato"); invalidate(); },
        onError: (e) => toast.error(e.message),
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-2xl border border-border/30 bg-card/60 p-4 flex flex-wrap items-center gap-3", children: [_jsx(FileText, { className: "h-6 w-6 text-blue-400" }), _jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Documenti di Trasporto (DDT)" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Emissione occasionale per movimentazioni interne, spostamento cassoni, comodati." })] }), _jsxs("button", { onClick: () => setShowForm(true), className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo DDT"] })] }), _jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: isLoading ? (_jsxs("div", { className: "p-8 text-center text-muted-foreground flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " Caricamento..."] })) : (_jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-background/60", children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "text-left p-3", children: "N\u00B0 DDT" }), _jsx("th", { className: "text-left p-3", children: "Data" }), _jsx("th", { className: "text-left p-3", children: "Destinatario" }), _jsx("th", { className: "text-left p-3", children: "Bene" }), _jsx("th", { className: "text-left p-3", children: "Causale" }), _jsx("th", { className: "text-left p-3", children: "Mezzo" }), _jsx("th", { className: "text-right p-3", children: "Azioni" })] }) }), _jsxs("tbody", { children: [(ddts || []).map(d => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3 font-mono font-semibold", children: d.numero_ddt }), _jsx("td", { className: "p-3", children: new Date(d.data).toLocaleDateString("it-IT") }), _jsx("td", { className: "p-3", children: d.cliente_destinatario }), _jsx("td", { className: "p-3 text-muted-foreground truncate max-w-[220px]", children: d.descrizione_bene }), _jsx("td", { className: "p-3 text-xs", children: d.causale_trasporto }), _jsx("td", { className: "p-3 font-mono text-xs", children: d.targa_mezzo || "—" }), _jsx("td", { className: "p-3 text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx("button", { onClick: () => setPrinting(d), className: "p-1.5 rounded hover:bg-blue-500/20 text-blue-400", title: "Stampa PDF", children: _jsx(Printer, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => confirm(`Eliminare DDT ${d.numero_ddt}?`) && del.mutate(d.id), className: "p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", title: "Elimina", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, d.id))), !ddts?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "p-8 text-center text-muted-foreground text-sm", children: "Nessun DDT emesso" }) }))] })] })) }) }), showForm && (_jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4", onClick: () => setShowForm(false), children: _jsxs("div", { className: "bg-card border border-border/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsxs("h3", { className: "text-lg font-semibold flex items-center gap-2", children: [_jsx(Truck, { className: "h-5 w-5" }), " Nuovo DDT"] }), _jsx("button", { onClick: () => setShowForm(false), className: "p-2 rounded-lg hover:bg-muted/30", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "p-4 space-y-3 overflow-y-auto", children: [_jsx(FormField, { label: "Data DDT *", children: _jsx("input", { type: "date", value: form.data || "", onChange: e => setForm({ ...form, data: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" }) }), _jsx(FormField, { label: "Cliente / Destinatario *", children: _jsx("input", { value: form.cliente_destinatario || "", onChange: e => setForm({ ...form, cliente_destinatario: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm", placeholder: "Ragione sociale destinatario" }) }), _jsx(FormField, { label: "Indirizzo di destinazione", children: _jsx("input", { value: form.indirizzo_destinazione || "", onChange: e => setForm({ ...form, indirizzo_destinazione: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm", placeholder: "Via, citt\u00E0, CAP" }) }), _jsx(FormField, { label: "Descrizione bene trasportato *", children: _jsx("textarea", { value: form.descrizione_bene || "", onChange: e => setForm({ ...form, descrizione_bene: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm min-h-[70px]", placeholder: "Es. Cassone scarrabile 20mc vuoto" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(FormField, { label: "Quantit\u00E0", children: _jsx("input", { value: form.quantita || "", onChange: e => setForm({ ...form, quantita: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm", placeholder: "Es. 1 pezzo" }) }), _jsx(FormField, { label: "Causale trasporto *", children: _jsx("select", { value: form.causale_trasporto || "Conto proprio", onChange: e => setForm({ ...form, causale_trasporto: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm", children: CAUSALI.map(c => _jsx("option", { value: c, children: c }, c)) }) }), _jsx(FormField, { label: "Targa mezzo", children: _jsx("input", { value: form.targa_mezzo || "", onChange: e => setForm({ ...form, targa_mezzo: e.target.value.toUpperCase() }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm font-mono" }) }), _jsx(FormField, { label: "Conducente", children: _jsx("input", { value: form.conducente || "", onChange: e => setForm({ ...form, conducente: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm" }) })] }), _jsx(FormField, { label: "Note", children: _jsx("textarea", { value: form.note || "", onChange: e => setForm({ ...form, note: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm min-h-[60px]" }) })] }), _jsxs("div", { className: "p-4 border-t border-border/30 flex justify-end gap-2", children: [_jsx("button", { onClick: () => setShowForm(false), className: "px-4 py-2 rounded-lg text-sm hover:bg-muted/30", children: "Annulla" }), _jsxs("button", { onClick: () => create.mutate(form), disabled: create.isPending, className: "flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50", children: [create.isPending ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Plus, { className: "h-4 w-4" }), " Emetti DDT"] })] })] }) })), printing && _jsx(DdtPrintDialog, { ddt: printing, tenantLabel: tenantLabel, onClose: () => setPrinting(null) })] }));
}
function FormField({ label, children }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-muted-foreground mb-1", children: label }), children] }));
}
function DdtPrintDialog({ ddt, tenantLabel, onClose }) {
    const printRef = useRef(null);
    const doPrint = () => {
        const html = printRef.current?.innerHTML;
        if (!html)
            return;
        const w = window.open("", "_blank", "width=900,height=1200");
        if (!w)
            return;
        w.document.write(`<!doctype html><html><head><title>DDT ${ddt.numero_ddt}</title>
<style>
body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm;font-size:11pt;}
h1{font-size:16pt;margin:0 0 4px 0;}
h2{font-size:12pt;margin:8px 0;border-bottom:1px solid #000;padding-bottom:2px;}
table{width:100%;border-collapse:collapse;margin:6px 0;}
td,th{border:1px solid #000;padding:6px;text-align:left;vertical-align:top;font-size:10pt;}
th{background:#f0f0f0;}
.header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px;}
.big{font-size:14pt;font-weight:bold;}
.firma{border:1px solid #000;height:60px;padding:4px;font-size:9pt;color:#666;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
@media print{@page{size:A4;margin:15mm;} body{padding:0;}}
</style></head><body>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),400);}</script></body></html>`);
        w.document.close();
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4", onClick: onClose, children: _jsxs("div", { className: "bg-white text-black rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-3 border-b bg-gray-100", children: [_jsxs("h3", { className: "text-sm font-semibold", children: ["Anteprima DDT ", ddt.numero_ddt] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: doPrint, className: "flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs", children: [_jsx(Printer, { className: "h-3.5 w-3.5" }), " Stampa / PDF"] }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded hover:bg-gray-200", children: _jsx(X, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "overflow-y-auto p-6", ref: printRef, children: [_jsxs("div", { className: "header", children: [_jsxs("div", { children: [_jsx("div", { className: "big", children: tenantLabel.toUpperCase() }), _jsx("div", { style: { fontSize: "9pt" }, children: "Documento di Trasporto (DDT)" })] }), _jsxs("div", { style: { textAlign: "right" }, children: [_jsxs("div", { children: [_jsx("strong", { children: "N\u00B0 DDT:" }), " ", ddt.numero_ddt] }), _jsxs("div", { children: [_jsx("strong", { children: "Data:" }), " ", new Date(ddt.data).toLocaleDateString("it-IT")] })] })] }), _jsx("h2", { children: "Destinatario" }), _jsx("table", { children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { style: { width: "30%" }, children: "Ragione sociale" }), _jsx("td", { children: ddt.cliente_destinatario })] }), _jsxs("tr", { children: [_jsx("th", { children: "Indirizzo di consegna" }), _jsx("td", { children: ddt.indirizzo_destinazione || "—" })] })] }) }), _jsx("h2", { children: "Bene trasportato" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: "70%" }, children: "Descrizione" }), _jsx("th", { children: "Quantit\u00E0" })] }) }), _jsx("tbody", { children: _jsxs("tr", { children: [_jsx("td", { children: ddt.descrizione_bene }), _jsx("td", { children: ddt.quantita || "—" })] }) })] }), _jsx("h2", { children: "Trasporto" }), _jsx("table", { children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { style: { width: "30%" }, children: "Causale trasporto" }), _jsx("td", { children: ddt.causale_trasporto })] }), _jsxs("tr", { children: [_jsx("th", { children: "Targa mezzo" }), _jsx("td", { children: ddt.targa_mezzo || "—" })] }), _jsxs("tr", { children: [_jsx("th", { children: "Conducente" }), _jsx("td", { children: ddt.conducente || "—" })] }), _jsxs("tr", { children: [_jsx("th", { children: "Note" }), _jsx("td", { children: ddt.note || "—" })] })] }) }), _jsxs("div", { className: "grid2", style: { marginTop: "20px" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: "9pt", marginBottom: "4px" }, children: "Firma vettore" }), _jsx("div", { className: "firma" })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: "9pt", marginBottom: "4px" }, children: "Firma destinatario per ricevuta" }), _jsx("div", { className: "firma" })] })] })] })] }) }));
}
