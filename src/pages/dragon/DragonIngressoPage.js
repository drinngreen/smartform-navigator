import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useDragonRegisters } from "@/hooks/dragon/useDragonRegisters";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronRight, FileText, Package, Scale } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";
const STEPS = ["Dati FIR", "Articolo & Quantità", "Peso a Destino", "Riepilogo"];
const CAUSALI_INGRESSO = [
    { code: "INGRESSO_UL", label: "Ingresso da Unità Locale (produttore diretto)" },
    { code: "INGRESSO_MIO_CANTIERE", label: "Ingresso da mio cantiere (fuori UL propria)" },
    { code: "INGRESSO_CANTIERE_TERZI", label: "Ingresso da cantiere di terzi" },
];
export default function DragonIngressoPage() {
    const { context } = useParams();
    const navigate = useNavigate();
    const { items } = useDragonItems();
    const { causes } = useDragonCauses();
    const { registers } = useDragonRegisters();
    const { documents } = useDragonDocuments();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const [step, setStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    // Step 0: Dati FIR
    const [firNumber, setFirNumber] = useState("");
    const [produttore, setProduttore] = useState("");
    const [trasportatore, setTrasportatore] = useState("");
    const [dataRicezione, setDataRicezione] = useState(new Date().toISOString().split("T")[0]);
    const [causaleCode, setCausaleCode] = useState("INGRESSO_UL");
    // Step 1: Articolo
    const [itemId, setItemId] = useState("");
    const [quantitaOrigine, setQuantitaOrigine] = useState("");
    const [operationCode, setOperationCode] = useState("");
    const [physicalState, setPhysicalState] = useState("solido_non_pulverulento");
    const [note, setNote] = useState("");
    // Step 2: Peso a destino
    const [hasPesoDestino, setHasPesoDestino] = useState(true);
    const [quantitaDestino, setQuantitaDestino] = useState("");
    const selectedItem = items.find(i => i.id === itemId);
    const destinatarioRegister = registers.find(r => r.subject_type === "DESTINATARIO");
    const selectedCause = causes.find(c => c.code === causaleCode);
    const canNext = () => {
        if (step === 0)
            return !!firNumber && !!produttore && !!dataRicezione;
        if (step === 1)
            return !!itemId && !!quantitaOrigine && parseFloat(quantitaOrigine) > 0;
        if (step === 2)
            return !hasPesoDestino || (!!quantitaDestino && parseFloat(quantitaDestino) > 0);
        return true;
    };
    const handleSubmit = async () => {
        if (!selectedItem || !selectedCause || !destinatarioRegister) {
            toast.error("Configurazione mancante: registro destinatario o causale non trovati");
            return;
        }
        setSubmitting(true);
        try {
            const qtyFinal = hasPesoDestino ? parseFloat(quantitaDestino) : parseFloat(quantitaOrigine);
            const weightStatus = hasPesoDestino ? "DEFINITIVO" : "DA_VERIFICARE_A_DESTINO";
            const movStatus = hasPesoDestino ? "BOZZA" : "BOZZA";
            // Create FIR document record
            const { data: doc, error: docErr } = await supabase
                .from("dragon_documents")
                .insert({
                company_id: companyId,
                document_type: "FIR",
                number: firNumber,
                document_date: dataRicezione,
                notes: `Produttore: ${produttore} | Trasportatore: ${trasportatore}`,
                status: hasPesoDestino ? "COMPLETO" : "IN_ATTESA_PESO",
                metadata: {
                    produttore,
                    trasportatore,
                    quantita_origine: parseFloat(quantitaOrigine),
                    quantita_destino: hasPesoDestino ? parseFloat(quantitaDestino) : null,
                },
            })
                .select()
                .single();
            if (docErr)
                throw docErr;
            // Create CARICO movement on the Destinatario register
            const { error: movErr } = await supabase
                .from("dragon_register_movements")
                .insert({
                company_id: companyId,
                register_id: destinatarioRegister.id,
                movement_date: dataRicezione,
                recording_date: new Date().toISOString().split("T")[0],
                item_id: itemId,
                cer_code: selectedItem.codice_cer,
                description_snapshot: selectedItem.descrizione,
                movement_type: "CARICO",
                cause_id: selectedCause.id,
                quantity: qtyFinal,
                unit_of_measure: selectedItem.unita_misura_default || "kg",
                sign: "PLUS",
                source_context: "UL",
                physical_state: physicalState || selectedItem.stato_fisico_default,
                hp_codes: selectedItem.classi_hp || [],
                weight_status: weightStatus,
                status: movStatus,
                linked_document_id: doc.id,
                operation_code: operationCode || null,
                note: note || null,
                created_by: user?.id,
            });
            if (movErr)
                throw movErr;
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-documents"] });
            if (!hasPesoDestino) {
                toast.success("FIR registrato — In attesa del peso a destino (evidenziato in giallo)");
            }
            else {
                toast.success("FIR registrato con peso a destino — Movimento di carico creato");
            }
            navigate(`/mn/admin/${context}/dragon/registro`);
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(MNAdminLayout, { title: "Ingresso FIR Destinatario", subtitle: "Dragon \u2014 Accettazione rifiuti in ingresso", children: _jsxs("div", { className: "max-w-2xl mx-auto space-y-4", children: [_jsx(DragonBackButton, {}), _jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-6 space-y-6", children: [_jsx("div", { className: "flex items-center gap-1", children: STEPS.map((s, i) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: `flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: i < step ? _jsx(Check, { className: "h-3.5 w-3.5" }) : i + 1 }), _jsx("span", { className: `text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`, children: s }), i < STEPS.length - 1 && _jsx(ChevronRight, { className: "h-3 w-3 text-muted-foreground mx-1" })] }, i))) }), step === 0 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FileText, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Dati del Formulario in ingresso" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Numero FIR / Formulario *" }), _jsx(Input, { value: firNumber, onChange: e => setFirNumber(e.target.value), placeholder: "Es: ABCDE 123456 FG" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Produttore (ragione sociale) *" }), _jsx(Input, { value: produttore, onChange: e => setProduttore(e.target.value), placeholder: "Ragione sociale produttore" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Trasportatore" }), _jsx(Input, { value: trasportatore, onChange: e => setTrasportatore(e.target.value), placeholder: "Ragione sociale trasportatore" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Data Ricezione *" }), _jsx(Input, { type: "date", value: dataRicezione, onChange: e => setDataRicezione(e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Causale Ingresso" }), _jsxs(Select, { value: causaleCode, onValueChange: setCausaleCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CAUSALI_INGRESSO.map(c => (_jsx(SelectItem, { value: c.code, children: c.label }, c.code))) })] })] })] })), step === 1 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Package, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Articolo e quantit\u00E0 all'origine" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Articolo / CER *" }), _jsxs(Select, { value: itemId, onValueChange: setItemId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo && i.item_type === "WASTE_CER").map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione, " ", i.pericoloso ? "⚠️" : ""] }, i.id))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 all'origine (kg) *" }), _jsx(Input, { type: "number", step: "0.01", min: "0", value: quantitaOrigine, onChange: e => setQuantitaOrigine(e.target.value), placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato Fisico" }), _jsxs(Select, { value: physicalState, onValueChange: setPhysicalState, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "solido_pulverulento", children: "Solido pulverulento" }), _jsx(SelectItem, { value: "solido_non_pulverulento", children: "Solido non pulverulento" }), _jsx(SelectItem, { value: "fangoso_palabile", children: "Fangoso palabile" }), _jsx(SelectItem, { value: "liquido", children: "Liquido" })] })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Operazione (R/D)" }), _jsxs(Select, { value: operationCode, onValueChange: setOperationCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona operazione..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), TUTTI_CODICI_OPERAZIONE.map(op => (_jsxs(SelectItem, { value: op.codice, children: [op.codice, " \u2014 ", op.descrizione] }, op.codice)))] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: note, onChange: e => setNote(e.target.value), rows: 2, placeholder: "Note opzionali..." })] })] })), step === 2 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Scale, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Peso a destino" })] }), _jsxs("div", { className: "bg-muted/30 border border-border/30 rounded-lg p-4 space-y-3", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Il movimento di carico diventer\u00E0 \"ufficiale\" solo quando inserisci il peso verificato nel tuo impianto. Se non hai ancora pesato, puoi procedere senza \u2014 il FIR sar\u00E0 evidenziato in giallo nel registro." }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Switch, { checked: hasPesoDestino, onCheckedChange: setHasPesoDestino }), _jsx(Label, { className: "cursor-pointer", children: "Ho il peso a destino" })] }), hasPesoDestino && (_jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 a destino (kg) *" }), _jsx(Input, { type: "number", step: "0.01", min: "0", value: quantitaDestino, onChange: e => setQuantitaDestino(e.target.value), placeholder: "0.00" })] })), !hasPesoDestino && (_jsx(Badge, { className: "bg-amber-500/20 text-amber-300 border-amber-500/30", children: "\u2696\uFE0F In attesa di peso a destino" }))] })] })), step === 3 && (_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "font-semibold", children: "Riepilogo Ingresso" }), _jsxs("div", { className: "bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", children: "CARICO DESTINATARIO" }), !hasPesoDestino && _jsx(Badge, { className: "bg-amber-500/20 text-amber-300 border-amber-500/30", children: "\u2696\uFE0F Peso provvisorio" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "N\u00B0 FIR" }), _jsx("p", { className: "font-mono", children: firNumber })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Produttore" }), _jsx("p", { children: produttore })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER" }), _jsxs("p", { className: "font-mono", children: [selectedItem?.codice_cer, " \u2014 ", selectedItem?.descrizione] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 origine" }), _jsxs("p", { className: "font-mono", children: [parseFloat(quantitaOrigine || "0").toLocaleString("it-IT"), " kg"] })] }), hasPesoDestino && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0 a destino" }), _jsxs("p", { className: "font-mono font-bold text-emerald-400", children: [parseFloat(quantitaDestino || "0").toLocaleString("it-IT"), " kg"] })] })), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Data" }), _jsx("p", { children: new Date(dataRicezione).toLocaleDateString("it-IT") })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Causale" }), _jsx("p", { className: "text-xs", children: CAUSALI_INGRESSO.find(c => c.code === causaleCode)?.label })] }), trasportatore && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Trasportatore" }), _jsx("p", { children: trasportatore })] }))] })] })] })), _jsxs("div", { className: "flex gap-2 pt-2", children: [step > 0 && _jsx(Button, { variant: "outline", onClick: () => setStep(s => s - 1), children: "Indietro" }), _jsx(Button, { variant: "outline", onClick: () => navigate(`/mn/admin/${context}/dragon/registro`), className: "ml-auto", children: "Annulla" }), step < STEPS.length - 1 ? (_jsx(Button, { onClick: () => setStep(s => s + 1), disabled: !canNext(), children: "Avanti" })) : (_jsx(Button, { onClick: handleSubmit, disabled: submitting, children: submitting ? "Salvataggio..." : "Conferma Ingresso" }))] })] })] }) }));
}
