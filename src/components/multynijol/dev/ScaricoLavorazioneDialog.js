import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Loader2, Scissors } from "lucide-react";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
/**
 * Scarico di lavorazione: sposta materiale da un CER "privati" (20xxxx)
 * a un CER aziendale (es. Ferro/Rame/Cavo R13). Genera contemporaneamente:
 *  - registro_generale: 1 Scarico (old CER) + 1 Carico (new CER)
 *  - movimenti_impianto: 1 SCARICO + 1 CARICO (TRATTAMENTO_INTERNO)
 *  - magazzino_giacenze: decrementa old, incrementa new
 */
export function ScaricoLavorazioneDialog({ open, onClose }) {
    const queryClient = useQueryClient();
    const today = new Date().toISOString().slice(0, 10);
    const [impiantoId, setImpiantoId] = useState("");
    const [giacenze, setGiacenze] = useState([]);
    const [cerFrom, setCerFrom] = useState("");
    const [cerTo, setCerTo] = useState("");
    const [descTo, setDescTo] = useState("");
    const [quantita, setQuantita] = useState("");
    const [data, setData] = useState(today);
    const [causale, setCausale] = useState("R13");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        (async () => {
            const imp = await supabase.from("impianti").select("id").eq("tenant_id", MULTY_TENANT_ID)
                .order("created_at", { ascending: true }).limit(1).maybeSingle();
            setImpiantoId(imp.data?.id || "");
            const g = await supabase.from("magazzino_giacenze")
                .select("cer, descrizione_cer, quantita_kg")
                .eq("tenant_id", MULTY_TENANT_ID).gt("quantita_kg", 0);
            setGiacenze((g.data || []).sort((a, b) => a.cer.localeCompare(b.cer)));
        })();
    }, [open]);
    const saldoFrom = giacenze.find((r) => r.cer === cerFrom)?.quantita_kg ?? 0;
    const submit = async () => {
        const qta = parseFloat((quantita || "").replace(",", "."));
        if (!cerFrom || !cerTo)
            return toast.error("CER partenza e destinazione obbligatori");
        if (!Number.isFinite(qta) || qta <= 0)
            return toast.error("Quantità (kg) obbligatoria");
        if (qta > saldoFrom)
            return toast.error(`Quantità supera il saldo disponibile (${saldoFrom} kg)`);
        if (!impiantoId)
            return toast.error("Nessun impianto disponibile");
        setBusy(true);
        try {
            const from = cerFrom.trim().toUpperCase();
            const to = cerTo.trim().toUpperCase();
            const noteFull = `Scarico lavorazione ${causale} — ${from} → ${to}${note ? " — " + note : ""}`;
            // registro_generale: 2 righe
            const regRows = [
                {
                    tenant_id: MULTY_TENANT_ID, data_movimento: data, cer: from,
                    descrizione: giacenze.find((g) => g.cer === from)?.descrizione_cer || null,
                    carico_scarico: "Scarico", tipo_operazione: `Lavorazione ${causale}`,
                    segno: "-", quantita: qta, annotazioni: noteFull,
                    raw: { scarico_lavorazione: true, cer_destinazione: to },
                },
                {
                    tenant_id: MULTY_TENANT_ID, data_movimento: data, cer: to,
                    descrizione: descTo || null,
                    carico_scarico: "Carico", tipo_operazione: `Lavorazione ${causale}`,
                    segno: "+", quantita: qta, annotazioni: noteFull,
                    raw: { scarico_lavorazione: true, cer_origine: from },
                },
            ];
            const { error: regErr } = await supabase.from("registro_generale").insert(regRows);
            if (regErr)
                throw regErr;
            // movimenti_impianto: 2 righe TRATTAMENTO_INTERNO
            const movRows = [
                {
                    impianto_id: impiantoId, tenant_id: MULTY_TENANT_ID, cer: from,
                    descrizione_rifiuto: giacenze.find((g) => g.cer === from)?.descrizione_cer || null,
                    quantita_kg: qta, data_movimento: data, tipo_movimento: "SCARICO",
                    ruolo_impianto: "TRATTAMENTO_INTERNO", origine: "lavorazione_r13",
                    note: noteFull, esito_accettazione: "accettato",
                },
                {
                    impianto_id: impiantoId, tenant_id: MULTY_TENANT_ID, cer: to,
                    descrizione_rifiuto: descTo || null,
                    quantita_kg: qta, data_movimento: data, tipo_movimento: "CARICO",
                    ruolo_impianto: "TRATTAMENTO_INTERNO", origine: "lavorazione_r13",
                    note: noteFull, esito_accettazione: "accettato",
                },
            ];
            const { error: movErr } = await supabase.from("movimenti_impianto").insert(movRows);
            if (movErr)
                throw movErr;
            toast.success(`Scaricati ${qta} kg da ${from} → ${to} (${causale})`);
            queryClient.invalidateQueries({ queryKey: ["dev-registro-generale"] });
            queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
            queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
            onClose();
        }
        catch (e) {
            toast.error("Errore scarico lavorazione: " + (e?.message || String(e)));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (o) => { if (!o)
            onClose(); }, children: _jsxs(DialogContent, { className: "max-w-2xl bg-card border-border/50", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(Scissors, { className: "h-5 w-5 text-purple-400" }), "Scarico di Lavorazione (Privati \u2192 CER Aziendale R13)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Trasferisce quantitativi dal CER dei conferimenti privati (20xxxx) al CER aziendale definitivo (es. Ferro R13)." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "CER partenza (privato) *" }), _jsxs("select", { value: cerFrom, onChange: (e) => setCerFrom(e.target.value), className: "mt-1 w-full h-10 rounded-md border border-sky-400/40 bg-sky-400/10 px-3 text-sm", children: [_jsx("option", { value: "", children: "-- seleziona --" }), giacenze.map((g) => (_jsxs("option", { value: g.cer, children: [g.cer, " \u2014 ", Number(g.quantita_kg).toLocaleString("it-IT"), " kg"] }, g.cer)))] })] }), _jsx("div", { className: "flex items-end pb-1 justify-center", children: _jsx(ArrowRightLeft, { className: "h-6 w-6 text-purple-400" }) }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "CER destinazione (aziendale) *" }), _jsx(Input, { value: cerTo, onChange: (e) => setCerTo(e.target.value), placeholder: "es. 191202 (metalli ferrosi)", className: "mt-1 bg-sky-400/10 border-sky-400/40" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Descrizione CER destinazione" }), _jsx(Input, { value: descTo, onChange: (e) => setDescTo(e.target.value), placeholder: "es. Rottame ferroso R13", className: "mt-1 bg-sky-400/10 border-sky-400/40" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { value: quantita, onChange: (e) => setQuantita(e.target.value), className: "mt-1 bg-sky-400/10 border-sky-400/40" }), cerFrom && (_jsxs("p", { className: "text-[11px] text-muted-foreground mt-1", children: ["Saldo disponibile: ", saldoFrom.toLocaleString("it-IT"), " kg"] }))] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Data" }), _jsx(Input, { type: "date", value: data, onChange: (e) => setData(e.target.value), className: "mt-1 bg-sky-400/10 border-sky-400/40" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Causale" }), _jsx("select", { value: causale, onChange: (e) => setCausale(e.target.value), className: "mt-1 w-full h-10 rounded-md border border-sky-400/40 bg-sky-400/10 px-3 text-sm", children: ["R13", "R12", "R4", "R5", "D15", "D14"].map((c) => _jsx("option", { value: c, children: c }, c)) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Note" }), _jsx(Input, { value: note, onChange: (e) => setNote(e.target.value), className: "mt-1 bg-sky-400/10 border-sky-400/40" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-3 border-t border-border/30 mt-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: busy, children: "Annulla" }), _jsxs(Button, { onClick: submit, disabled: busy, className: "gap-2 bg-purple-500 text-white hover:bg-purple-400", children: [busy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Scissors, { className: "h-4 w-4" }), "Registra scarico lavorazione"] })] })] }) }));
}
