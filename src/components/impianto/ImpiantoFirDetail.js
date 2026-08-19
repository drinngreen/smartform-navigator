import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { PenTool, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImpiantoFirTimeline } from "./ImpiantoFirTimeline";
import { toast } from "sonner";
export function ImpiantoFirDetail({ item, events, color, onClose, onSignReception, onSignDestination, forceDestinationOnly = false, destinationActionLabel = "FIRMA DESTINATARIO", }) {
    const [form, setForm] = useState({ kg: "", data: new Date().toISOString().slice(0, 10), ora: new Date().toTimeString().slice(0, 5), esito: "accettato", motivazione: "" });
    const [signing, setSigning] = useState(false);
    const [confirmDestinazione, setConfirmDestinazione] = useState(false);
    const [confermaText, setConfermaText] = useState("");
    if (!item)
        return null;
    const canSignReception = !forceDestinationOnly && (item.stato_interno === "importato" || item.stato_interno === "attesa_firma_ricezione");
    const canSignDestination = forceDestinationOnly || item.stato_interno === "firmato_ricezione";
    const handleSign = async (type) => {
        if (!form.kg) {
            toast.error("Inserisci il peso della pesata");
            return;
        }
        if (type === "destination" && confermaText !== "CONFERMO") {
            toast.error("Digita CONFERMO per procedere");
            return;
        }
        setSigning(true);
        try {
            const payload = {
                kg_pesata: parseFloat(form.kg),
                data_arrivo: form.data,
                ora_arrivo: form.ora,
                esito: form.esito,
                motivazione: form.motivazione || undefined,
            };
            if (type === "reception")
                await onSignReception(payload);
            else
                await onSignDestination(payload);
            toast.success(type === "reception" ? "Firma ricezione eseguita!" : "Firma destinatario eseguita — FIR chiuso!");
            setConfirmDestinazione(false);
            setConfermaText("");
        }
        catch (err) {
            toast.error("Errore firma: " + err.message);
        }
        finally {
            setSigning(false);
        }
    };
    return (_jsx(Dialog, { open: !!item, onOpenChange: (open) => { if (!open)
            onClose(); }, children: _jsxs(DialogContent, { className: "max-w-2xl bg-card border-border/50 max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(PenTool, { className: "h-5 w-5", style: { color: `rgb(${color})` } }), "Dettaglio xFIR \u2014 ", item.numero_fir] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: `px-3 py-1 rounded-full text-xs font-semibold border ${item.firma_ricezione_at ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border/30"}`, children: ["Firma Ricezione ", item.firma_ricezione_at ? "✓" : "—"] }), _jsxs("span", { className: `px-3 py-1 rounded-full text-xs font-semibold border ${item.firma_destinatario_at ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border/30"}`, children: ["Firma Destinatario ", item.firma_destinatario_at ? "✓" : "—"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "CER:" }), _jsx("br", {}), _jsx("strong", { className: "font-mono", children: item.cer })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Quantit\u00E0 dichiarata:" }), _jsx("br", {}), _jsxs("strong", { children: [item.quantita?.toLocaleString("it-IT"), " ", item.unita_misura] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Produttore:" }), _jsx("br", {}), item.produttore || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Trasportatore:" }), _jsx("br", {}), item.trasportatore || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Destinatario:" }), _jsx("br", {}), item.destinatario || "—"] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground text-xs", children: "Data ricezione:" }), _jsx("br", {}), new Date(item.data_ricezione).toLocaleDateString("it-IT")] })] }), (canSignReception || canSignDestination) && (_jsxs("div", { className: "rounded-xl border p-4 space-y-3", style: { borderColor: `rgba(${color}, 0.3)`, background: `rgba(${color}, 0.05)` }, children: [_jsx("h4", { className: "font-display text-sm tracking-wider", style: { color: `rgb(${color})` }, children: canSignReception ? "Presa in Carico" : forceDestinationOnly ? "Accettazione e Firma Scarico" : "Chiusura Definitiva" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Peso pesata (kg)" }), _jsx("input", { type: "number", value: form.kg, onChange: (e) => setForm(p => ({ ...p, kg: e.target.value })), placeholder: "0.00", className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Esito" }), _jsxs("select", { value: form.esito, onChange: (e) => setForm(p => ({ ...p, esito: e.target.value })), className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground", children: [_jsx("option", { value: "accettato", children: "Accettato" }), _jsx("option", { value: "parziale", children: "Parzialmente accettato" }), _jsx("option", { value: "respinto", children: "Respinto" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Data arrivo" }), _jsx("input", { type: "date", value: form.data, onChange: (e) => setForm(p => ({ ...p, data: e.target.value })), className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Ora arrivo" }), _jsx("input", { type: "time", value: form.ora, onChange: (e) => setForm(p => ({ ...p, ora: e.target.value })), className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground font-mono" })] })] }), form.esito !== "accettato" && (_jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Motivazione" }), _jsx("textarea", { value: form.motivazione, onChange: (e) => setForm(p => ({ ...p, motivazione: e.target.value })), rows: 2, className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-border/30 text-foreground resize-none" })] })), _jsxs("div", { className: "flex gap-2", children: [canSignReception && (_jsxs("button", { onClick: () => handleSign("reception"), disabled: signing, className: "flex-1 py-3 rounded-xl font-display font-semibold tracking-wider text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2", style: { background: `rgb(${color})` }, children: [signing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(PenTool, { className: "h-4 w-4" }), "FIRMA RICEZIONE"] })), canSignDestination && (_jsxs("button", { onClick: () => setConfirmDestinazione(true), disabled: signing, className: "flex-1 py-3 rounded-xl font-display font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2", children: [_jsx(CheckCircle, { className: "h-4 w-4" }), " ", destinationActionLabel] }))] })] })), confirmDestinazione && (_jsxs("div", { className: "rounded-xl border border-red-500/50 bg-red-500/10 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-red-400", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), _jsx("span", { className: "font-display text-sm tracking-wider", children: "CONFERMA CHIUSURA DEFINITIVA" })] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["La firma destinatario chiude definitivamente il FIR su RENTRI. Questa operazione \u00E8 ", _jsx("strong", { children: "irreversibile" }), "."] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Digita \"CONFERMO\" per procedere" }), _jsx("input", { value: confermaText, onChange: (e) => setConfermaText(e.target.value.toUpperCase()), className: "w-full mt-1 px-3 py-2 rounded-lg bg-background/80 border border-red-500/30 text-foreground font-mono" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setConfirmDestinazione(false); setConfermaText(""); }, className: "flex-1 py-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors", children: "Annulla" }), _jsxs("button", { onClick: () => handleSign("destination"), disabled: signing || confermaText !== "CONFERMO", className: "flex-1 py-2 rounded-lg bg-emerald-600 text-white font-display font-semibold disabled:opacity-50 flex items-center justify-center gap-2", children: [signing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(CheckCircle, { className: "h-4 w-4" }), "CHIUDI FIR"] })] })] })), _jsxs("div", { children: [_jsx("h4", { className: "font-display text-sm tracking-wider text-muted-foreground mb-3", children: "TIMELINE EVENTI" }), _jsx(ImpiantoFirTimeline, { events: events, color: color })] })] })] }) }));
}
