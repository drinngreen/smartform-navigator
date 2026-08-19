import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ricercaFir, firmaRicezione } from "@/lib/rentriVpsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PenTool, CheckCircle, XCircle, Loader2, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
export function DevFirmaDigitaleModule() {
    const [searchNum, setSearchNum] = useState("");
    const [searching, setSearching] = useState(false);
    const [firData, setFirData] = useState(null);
    const [searchError, setSearchError] = useState(null);
    // Reception form
    const [kgPesata, setKgPesata] = useState("");
    const [dataArrivo, setDataArrivo] = useState(new Date().toISOString().slice(0, 10));
    const [oraArrivo, setOraArrivo] = useState(new Date().toISOString().slice(11, 16));
    const [esito, setEsito] = useState("accettato");
    const [motivazione, setMotivazione] = useState("");
    const [signing, setSigning] = useState(false);
    const [timeline, setTimeline] = useState([]);
    const addEvent = (label, success) => {
        setTimeline(prev => [{ time: new Date().toLocaleTimeString("it-IT"), label, success }, ...prev]);
    };
    const handleSearch = async () => {
        if (!searchNum.trim())
            return;
        setSearching(true);
        setFirData(null);
        setSearchError(null);
        try {
            const res = await ricercaFir("multy", searchNum.trim());
            if (!res.success)
                throw new Error(res.error || "FIR non trovato");
            const d = res.data || {};
            const fir = d.fir || d.formulario || d;
            setFirData({
                raw: fir,
                numero_fir: fir.numero_fir || fir.numeroFir || searchNum,
                produttore: fir.produttore?.denominazione || fir.dati_partenza?.produttore?.denominazione || "—",
                trasportatore: fir.trasportatore?.denominazione || fir.dati_partenza?.trasportatori?.[0]?.denominazione || "—",
                destinatario: fir.destinatario?.denominazione || fir.dati_partenza?.destinatario?.denominazione || "—",
                cer: fir.rifiuto?.codice_eer || fir.dati_partenza?.rifiuto?.codice_eer || "—",
                quantita: String(fir.rifiuto?.quantita?.valore || fir.dati_partenza?.rifiuto?.quantita?.valore || "—"),
                stato: fir.stato || fir.stato_fir || "—",
            });
            addEvent(`Ricerca FIR ${searchNum} completata`, true);
        }
        catch (err) {
            setSearchError(err.message);
            addEvent(`Ricerca FIR ${searchNum} fallita: ${err.message}`, false);
        }
        finally {
            setSearching(false);
        }
    };
    const handleFirmaRicezione = async () => {
        if (!firData || !kgPesata) {
            toast.error("Compila i campi obbligatori");
            return;
        }
        setSigning(true);
        try {
            const payload = {
                dati_arrivo: {
                    numero_fir: firData.numero_fir,
                    data_ora_arrivo: `${dataArrivo}T${oraArrivo}:00`,
                    accettazione: {
                        accettato: esito !== "respinto",
                        parziale: esito === "parziale",
                        quantita_ricevuta: { valore: parseFloat(kgPesata), unita_misura: "kg" },
                        motivazione: motivazione || undefined,
                    },
                },
            };
            const res = await firmaRicezione("multy", payload);
            if (!res.success)
                throw new Error(res.error || "Errore firma ricezione");
            addEvent(`Firma ricezione ${firData.numero_fir} completata`, true);
            toast.success("✅ Firma ricezione completata!");
        }
        catch (err) {
            addEvent(`Firma ricezione fallita: ${err.message}`, false);
            toast.error("Errore: " + err.message);
        }
        finally {
            setSigning(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(Search, { className: "h-5 w-5" }), " Ricerca FIR su RENTRI"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-3", children: [_jsx(Input, { value: searchNum, onChange: e => setSearchNum(e.target.value), placeholder: "Numero FIR (es. ZRZXR 000001 TO)", className: "font-mono flex-1 bg-background/80 border-border/30", onKeyDown: e => e.key === "Enter" && handleSearch() }), _jsxs(Button, { onClick: handleSearch, disabled: searching || !searchNum.trim(), className: "gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30", children: [searching ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Search, { className: "h-4 w-4" }), " Cerca"] })] }), searchError && (_jsxs("div", { className: "flex items-center gap-2 text-destructive text-sm", children: [_jsx(XCircle, { className: "h-4 w-4" }), " ", searchError] }))] })] }), firData && (_jsxs(Card, { className: "bg-card/60 border-emerald-500/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(FileText, { className: "h-5 w-5" }), " FIR: ", firData.numero_fir] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Produttore:" }), _jsx("p", { className: "font-semibold text-foreground", children: firData.produttore })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Trasportatore:" }), _jsx("p", { className: "font-semibold text-foreground", children: firData.trasportatore })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Destinatario:" }), _jsx("p", { className: "font-semibold text-foreground", children: firData.destinatario })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "CER:" }), _jsx("p", { className: "font-mono font-semibold text-amber-300", children: firData.cer })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Quantit\u00E0:" }), _jsxs("p", { className: "font-semibold text-foreground", children: [firData.quantita, " kg"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-muted-foreground", children: "Stato:" }), _jsx("p", { className: "font-semibold text-foreground", children: firData.stato })] })] }), _jsxs("div", { className: "border-t border-border/30 pt-4 space-y-4", children: [_jsxs("h4", { className: "text-sm font-display uppercase tracking-wider text-emerald-400 flex items-center gap-2", children: [_jsx(PenTool, { className: "h-4 w-4" }), " Firma Ricezione"] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Kg Pesata *" }), _jsx(Input, { type: "number", value: kgPesata, onChange: e => setKgPesata(e.target.value), placeholder: "0", className: "bg-background/80 border-border/30 font-mono" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Data Arrivo" }), _jsx(Input, { type: "date", value: dataArrivo, onChange: e => setDataArrivo(e.target.value), className: "bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Ora Arrivo" }), _jsx(Input, { type: "time", value: oraArrivo, onChange: e => setOraArrivo(e.target.value), className: "bg-background/80 border-border/30" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Esito" }), _jsxs(Select, { value: esito, onValueChange: (v) => setEsito(v), children: [_jsx(SelectTrigger, { className: "bg-background/80 border-border/30", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "accettato", children: "\u2705 Accettato" }), _jsx(SelectItem, { value: "parziale", children: "\u26A0\uFE0F Parziale" }), _jsx(SelectItem, { value: "respinto", children: "\u274C Respinto" })] })] })] })] }), esito !== "accettato" && (_jsxs("div", { children: [_jsx(Label, { className: "text-xs text-muted-foreground", children: "Motivazione" }), _jsx(Textarea, { value: motivazione, onChange: e => setMotivazione(e.target.value), placeholder: "Motivo accettazione parziale/rifiuto...", className: "bg-background/80 border-border/30", rows: 2 })] })), _jsxs(Button, { onClick: handleFirmaRicezione, disabled: signing || !kgPesata, className: "gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30", children: [signing ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(PenTool, { className: "h-4 w-4" }), " FIRMA RICEZIONE"] })] }), _jsxs("details", { className: "text-xs", children: [_jsx("summary", { className: "cursor-pointer text-muted-foreground font-mono", children: "Dati grezzi RENTRI" }), _jsx("pre", { className: "mt-2 p-3 bg-background/80 rounded-lg overflow-x-auto text-muted-foreground font-mono text-[10px] max-h-60 overflow-y-auto", children: JSON.stringify(firData.raw, null, 2) })] })] })] })), timeline.length > 0 && (_jsxs(Card, { className: "bg-card/60 border-border/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-muted-foreground flex items-center gap-2 text-sm", children: [_jsx(Clock, { className: "h-4 w-4" }), " Timeline Eventi"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2", children: timeline.map((ev, i) => (_jsxs("div", { className: "flex items-center gap-3 text-xs", children: [ev.success ? _jsx(CheckCircle, { className: "h-3.5 w-3.5 text-emerald-400 shrink-0" }) : _jsx(XCircle, { className: "h-3.5 w-3.5 text-destructive shrink-0" }), _jsx("span", { className: "font-mono text-muted-foreground", children: ev.time }), _jsx("span", { className: "text-foreground", children: ev.label })] }, i))) }) })] }))] }));
}
