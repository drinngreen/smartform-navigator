import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Download, Loader2, Lock, Clock } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
export function FatturaViewerDialog({ fatturaId, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ["fattura", fatturaId],
        queryFn: async () => {
            const { data: f, error } = await supabase.from("fatture").select("*").eq("id", fatturaId).single();
            if (error)
                throw error;
            const { data: r, error: rErr } = await supabase.from("fatture_righe").select("*").eq("fattura_id", fatturaId).order("ordine");
            if (rErr)
                throw rErr;
            return { fattura: f, righe: (r || []) };
        },
    });
    const eur = (v) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
    const scaricaPdf = () => {
        if (!data)
            return;
        const { fattura, righe } = data;
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const w = 210;
        let y = 20;
        // Header cortesia
        doc.setFillColor(fattura.stato === "inviata" ? 30 : 250, fattura.stato === "inviata" ? 90 : 200, fattura.stato === "inviata" ? 200 : 50);
        doc.rect(0, 0, w, 12, "F");
        doc.setTextColor(255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(fattura.stato === "inviata" ? "FATTURA - INVIATA A CASSETTO FISCALE" : "FATTURA DI CORTESIA - non fiscalmente valida", 10, 8);
        doc.setTextColor(0);
        y = 25;
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(`Fattura N° ${fattura.numero_completo}`, 10, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        y += 6;
        doc.text(`Data emissione: ${fattura.data_emissione}`, 10, y);
        // Cliente
        y += 12;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE", 10, y);
        doc.setFont("helvetica", "normal");
        y += 5;
        doc.setFontSize(11);
        doc.text(fattura.cliente_ragione_sociale || "—", 10, y);
        y += 5;
        doc.setFontSize(9);
        doc.text(`P.IVA: ${fattura.cliente_partita_iva || "—"}  ·  CF: ${fattura.cliente_codice_fiscale || "—"}`, 10, y);
        y += 4;
        if (fattura.cliente_indirizzo) {
            doc.text(fattura.cliente_indirizzo, 10, y);
            y += 4;
        }
        if (fattura.cliente_unita_locale) {
            doc.text(`Unità locale: ${fattura.cliente_unita_locale}`, 10, y);
            y += 4;
        }
        // Righe
        y += 6;
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 4, w - 20, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("DESCRIZIONE", 12, y);
        doc.text("CER", 100, y);
        doc.text("Q.tà", 118, y);
        doc.text("Prezzo", 135, y);
        doc.text("Imp.", 155, y);
        doc.text("IVA", 175, y);
        doc.text("Totale", 190, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        for (const r of righe) {
            const imp = Number(r.imponibile);
            const iva = Number(r.iva);
            const tot = Number(r.totale);
            const lines = doc.splitTextToSize(String(r.descrizione), 85);
            doc.text(lines, 12, y);
            doc.text(String(r.cer || "—"), 100, y);
            doc.text(`${Number(r.quantita)} ${r.unita_misura}`, 118, y);
            doc.text(eur(Number(r.prezzo_unitario)), 135, y);
            doc.text(eur(imp), 155, y);
            doc.text(r.reverse_charge ? "RC" : eur(iva), 175, y);
            doc.text(eur(tot), 190, y);
            y += Math.max(5, lines.length * 4);
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
        }
        // Totali
        y += 8;
        doc.setDrawColor(200);
        doc.line(10, y, w - 10, y);
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.text(`Imponibile: ${eur(Number(fattura.imponibile))}`, 130, y);
        y += 5;
        doc.text(`IVA: ${eur(Number(fattura.iva))}${fattura.reverse_charge ? "  (Reverse Charge art.74)" : ""}`, 130, y);
        y += 5;
        doc.setFontSize(13);
        doc.text(`TOTALE: ${eur(Number(fattura.totale))}`, 130, y);
        if (fattura.note) {
            y += 12;
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text(`Note: ${fattura.note}`, 10, y);
        }
        doc.save(`Fattura_${fattura.numero_completo.replace("/", "_")}.pdf`);
        toast.success("PDF scaricato");
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/40 shadow-2xl", children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/30 bg-card", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Dettaglio Fattura" }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-muted/20", children: _jsx(X, { className: "h-4 w-4" }) })] }), isLoading || !data ? (_jsx("div", { className: "p-10 text-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin mx-auto text-muted-foreground" }) })) : (_jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: `p-3 rounded-xl border text-sm flex items-center gap-2 ${data.fattura.stato === "inviata" ? "bg-blue-600/15 border-blue-500/40 text-blue-200" : "bg-amber-500/10 border-amber-500/40 text-amber-200"}`, children: [data.fattura.stato === "inviata" ? _jsx(Lock, { className: "h-4 w-4" }) : _jsx(Clock, { className: "h-4 w-4" }), _jsxs("div", { children: [_jsx("strong", { children: data.fattura.stato === "inviata" ? "Fattura inviata al Cassetto Fiscale" : "Fattura di Cortesia (modificabile)" }), _jsxs("div", { className: "text-xs opacity-80", children: ["N\u00B0 ", data.fattura.numero_completo, " \u00B7 ", data.fattura.data_emissione] })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs font-mono uppercase text-muted-foreground", children: "Cliente" }), _jsx("div", { className: "font-semibold", children: data.fattura.cliente_ragione_sociale }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["P.IVA ", data.fattura.cliente_partita_iva || "—", " \u00B7 ", data.fattura.cliente_indirizzo || ""] })] }), _jsx("div", { className: "rounded-xl border border-border/30 overflow-hidden", children: _jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { className: "bg-muted/20", children: _jsx("tr", { children: ["Descrizione", "CER", "Q.tà", "Prezzo", "Imp.", "IVA", "Totale"].map(h => (_jsx("th", { className: "px-2 py-2 text-left text-[10px] uppercase font-mono text-muted-foreground", children: h }, h))) }) }), _jsx("tbody", { children: data.righe.map((r) => (_jsxs("tr", { className: "border-t border-border/10", children: [_jsxs("td", { className: "px-2 py-2", children: [r.descrizione, r.numero_fir && _jsxs("div", { className: "text-[10px] text-muted-foreground font-mono", children: ["FIR ", r.numero_fir] })] }), _jsx("td", { className: "px-2 py-2 font-mono", children: r.cer || "—" }), _jsxs("td", { className: "px-2 py-2", children: [Number(r.quantita), " ", r.unita_misura] }), _jsx("td", { className: "px-2 py-2 font-mono", children: eur(Number(r.prezzo_unitario)) }), _jsx("td", { className: "px-2 py-2 font-mono", children: eur(Number(r.imponibile)) }), _jsx("td", { className: "px-2 py-2 font-mono", children: r.reverse_charge ? "RC" : eur(Number(r.iva)) }), _jsx("td", { className: "px-2 py-2 font-mono font-semibold", children: eur(Number(r.totale)) })] }, r.id))) })] }) }), _jsxs("div", { className: "grid grid-cols-3 gap-3 p-3 rounded-xl bg-background/40 border border-border/30 text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Imponibile" }), _jsx("div", { className: "font-mono", children: eur(Number(data.fattura.imponibile)) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "IVA" }), _jsx("div", { className: "font-mono", children: eur(Number(data.fattura.iva)) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Totale" }), _jsx("div", { className: "font-mono font-bold text-primary", children: eur(Number(data.fattura.totale)) })] })] }), _jsx("div", { className: "flex justify-end gap-2", children: _jsxs("button", { onClick: scaricaPdf, className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-2", children: [_jsx(Download, { className: "h-4 w-4" }), " Scarica PDF Cortesia"] }) })] }))] }) }));
}
