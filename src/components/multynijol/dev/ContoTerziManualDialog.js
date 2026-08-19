import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Truck } from "lucide-react";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
/**
 * Manual insertion of a paper-based ("cartaceo") FIR brought by a third-party
 * client (Conto Terzi). Emulates firFinalSync — updates registro_generale,
 * movimenti_impianto, and magazzino_giacenze at once — WITHOUT touching the
 * existing sync logic.
 */
export function ContoTerziManualDialog({ open, onClose, onSaved }) {
    const queryClient = useQueryClient();
    const today = new Date().toISOString().slice(0, 10);
    const [impiantoId, setImpiantoId] = useState("");
    const [form, setForm] = useState({
        data: today,
        numero_fir_cartaceo: "",
        cer: "",
        descrizione: "",
        quantita: "",
        peso_lordo: "",
        tara: "",
        produttore: "",
        produttore_cf: "",
        trasportatore: "",
        trasportatore_targa: "",
        trasportatore_conducente: "",
        luogo_produzione: "",
        annotazioni: "",
    });
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        (async () => {
            const { data } = await supabase
                .from("impianti")
                .select("id")
                .eq("tenant_id", MULTY_TENANT_ID)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            setImpiantoId(data?.id || "");
        })();
    }, [open]);
    const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const reset = () => {
        setForm({
            data: today,
            numero_fir_cartaceo: "",
            cer: "",
            descrizione: "",
            quantita: "",
            peso_lordo: "",
            tara: "",
            produttore: "",
            produttore_cf: "",
            trasportatore: "",
            trasportatore_targa: "",
            trasportatore_conducente: "",
            luogo_produzione: "",
            annotazioni: "",
        });
    };
    const submit = async () => {
        const qta = parseFloat((form.quantita || "").replace(",", "."));
        if (!form.numero_fir_cartaceo.trim())
            return toast.error("Numero formulario cartaceo obbligatorio");
        if (!form.cer.trim())
            return toast.error("CER obbligatorio");
        if (!Number.isFinite(qta) || qta <= 0)
            return toast.error("Quantità (kg) obbligatoria");
        if (!impiantoId)
            return toast.error("Nessun impianto Multyproget disponibile");
        setBusy(true);
        try {
            const numFir = form.numero_fir_cartaceo.trim().toUpperCase();
            const cerNorm = form.cer.trim().toUpperCase();
            const noteExtra = [
                form.trasportatore_targa && `Targa: ${form.trasportatore_targa}`,
                form.trasportatore_conducente && `Conducente: ${form.trasportatore_conducente}`,
                form.annotazioni,
            ].filter(Boolean).join(" — ");
            // 1) registro_generale — Carico (destinatario Multyproget)
            const { error: regErr } = await supabase.from("registro_generale").insert({
                tenant_id: MULTY_TENANT_ID,
                data_movimento: form.data,
                data_ricezione: form.data,
                data_emissione_formulario: form.data,
                cer: cerNorm,
                descrizione: form.descrizione || null,
                carico_scarico: "Carico",
                tipo_operazione: "Carico Conto Terzi (cartaceo)",
                numero_formulario: numFir,
                segno: "+",
                quantita: qta,
                peso_destino: qta,
                peso_lordo: form.peso_lordo ? parseFloat(form.peso_lordo.replace(",", ".")) : null,
                tara: form.tara ? parseFloat(form.tara.replace(",", ".")) : null,
                luogo_produzione: form.luogo_produzione || form.produttore || null,
                destinazione: "MULTY PROGET S.R.L.",
                annotazioni: noteExtra || "Formulario cartaceo Conto Terzi",
                al_rentri: false,
                raw: { conto_terzi_cartaceo: true, form_input: form },
            });
            if (regErr)
                throw regErr;
            // 2) movimenti_impianto — CARICO / DESTINATARIO
            const { error: movErr } = await supabase.from("movimenti_impianto").insert({
                impianto_id: impiantoId,
                tenant_id: MULTY_TENANT_ID,
                cer: cerNorm,
                descrizione_rifiuto: form.descrizione || null,
                quantita_kg: qta,
                data_movimento: form.data,
                tipo_movimento: "CARICO",
                ruolo_impianto: "DESTINATARIO",
                origine: "conto_terzi_cartaceo",
                numero_fir: numFir,
                produttore_denominazione: form.produttore || null,
                trasportatore_denominazione: form.trasportatore || null,
                destinatario_denominazione: "MULTY PROGET S.R.L.",
                esito_accettazione: "accettato",
                note: `Conto Terzi cartaceo — FIR ${numFir}${noteExtra ? " — " + noteExtra : ""}`,
            });
            if (movErr)
                throw movErr;
            toast.success(`FIR cartaceo ${numFir} registrato — +${qta} kg su ${cerNorm}`);
            queryClient.invalidateQueries({ queryKey: ["dev-registro-generale"] });
            queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
            queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
            reset();
            onSaved?.();
            onClose();
        }
        catch (e) {
            toast.error("Errore registrazione FIR cartaceo: " + (e?.message || String(e)));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (o) => { if (!o)
            onClose(); }, children: _jsxs(DialogContent, { className: "max-w-3xl bg-card border-border/50 max-h-[92vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(Truck, { className: "h-5 w-5 text-amber-400" }), "Caricamento Formulari Conto Terzi (Cartaceo)"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Registra un formulario cartaceo portato fisicamente dal cliente. Aggiorna registro, movimenti e giacenze." })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3", children: [_jsx(Field, { label: "Data", type: "date", value: form.data, onChange: (v) => setF("data", v) }), _jsx(Field, { label: "N\u00B0 Formulario cartaceo *", value: form.numero_fir_cartaceo, onChange: (v) => setF("numero_fir_cartaceo", v), placeholder: "es. AA123456" }), _jsx(Field, { label: "CER *", value: form.cer, onChange: (v) => setF("cer", v), placeholder: "es. 170405" }), _jsx("div", { className: "col-span-2 md:col-span-3", children: _jsx(Field, { label: "Descrizione rifiuto", value: form.descrizione, onChange: (v) => setF("descrizione", v) }) }), _jsx(Field, { label: "Quantit\u00E0 netta (kg) *", value: form.quantita, onChange: (v) => setF("quantita", v), placeholder: "10000" }), _jsx(Field, { label: "Peso lordo (kg)", value: form.peso_lordo, onChange: (v) => setF("peso_lordo", v) }), _jsx(Field, { label: "Tara (kg)", value: form.tara, onChange: (v) => setF("tara", v) }), _jsx(Field, { label: "Produttore", value: form.produttore, onChange: (v) => setF("produttore", v), placeholder: "Mario Rossi" }), _jsx(Field, { label: "CF/PIVA produttore", value: form.produttore_cf, onChange: (v) => setF("produttore_cf", v) }), _jsx(Field, { label: "Luogo di produzione", value: form.luogo_produzione, onChange: (v) => setF("luogo_produzione", v) }), _jsx(Field, { label: "Trasportatore", value: form.trasportatore, onChange: (v) => setF("trasportatore", v) }), _jsx(Field, { label: "Targa automezzo", value: form.trasportatore_targa, onChange: (v) => setF("trasportatore_targa", v) }), _jsx(Field, { label: "Conducente", value: form.trasportatore_conducente, onChange: (v) => setF("trasportatore_conducente", v) }), _jsxs("div", { className: "col-span-2 md:col-span-3", children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Annotazioni" }), _jsx("textarea", { value: form.annotazioni, onChange: (e) => setF("annotazioni", e.target.value), rows: 2, className: "mt-1 w-full bg-sky-400/10 border border-sky-400/40 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-sky-300" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-3 border-t border-border/30 mt-4", children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: busy, children: "Annulla" }), _jsxs(Button, { onClick: submit, disabled: busy, className: "gap-2 bg-amber-500 text-black hover:bg-amber-400", children: [busy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(FileText, { className: "h-4 w-4" }), "Registra FIR cartaceo"] })] })] }) }));
}
function Field({ label, value, onChange, placeholder, type = "text" }) {
    return (_jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono text-muted-foreground", children: label }), _jsx(Input, { type: type, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: "mt-1 bg-sky-400/10 border-sky-400/40 focus-visible:ring-sky-300" })] }));
}
