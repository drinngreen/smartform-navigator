import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { Check, ChevronRight, MapPin, FileText, Package, ArrowRight } from "lucide-react";
import { TUTTI_CODICI_OPERAZIONE } from "@/lib/codiciRecuperoSmaltimento";
const STEPS = ["Articolo & Quantità", "Cantiere", "Documento FIR", "Riepilogo"];
export function DragonCaricoScaricoWizard({ onSubmit, isLoading, onCancel }) {
    const { items } = useDragonItems();
    const { sites } = useDragonSites();
    const { documents } = useDragonDocuments();
    const { causes } = useDragonCauses();
    const [step, setStep] = useState(0);
    const [itemId, setItemId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
    const [siteId, setSiteId] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [note, setNote] = useState("");
    const [operationCode, setOperationCode] = useState("");
    const [physicalState, setPhysicalState] = useState("solido_non_pulverulento");
    const selectedItem = items.find(i => i.id === itemId);
    const selectedSite = sites.find(s => s.id === siteId);
    const selectedDoc = documents.find(d => d.id === documentId);
    const causeCarico = causes.find(c => c.code === "CARICO_PRODUZIONE_FUORI_UL");
    const causeScarico = causes.find(c => c.code === "SCARICO_USCITA_FORMULARIO");
    const canNext = () => {
        if (step === 0)
            return !!itemId && !!quantity && parseFloat(quantity) > 0;
        if (step === 1)
            return !!siteId;
        if (step === 2)
            return !!documentId;
        return true;
    };
    const handleSubmit = async () => {
        if (!causeCarico || !causeScarico || !selectedItem)
            return;
        const base = {
            item_id: itemId,
            cer_code: selectedItem.codice_cer,
            description_snapshot: selectedItem.descrizione,
            quantity: parseFloat(quantity),
            unit_of_measure: selectedItem.unita_misura_default || "kg",
            movement_date: movementDate,
            recording_date: new Date().toISOString().split("T")[0],
            physical_state: physicalState || selectedItem.stato_fisico_default,
            hp_codes: selectedItem.classi_hp || [],
            note: note || null,
            operation_code: operationCode || null,
            weight_status: "DEFINITIVO",
            status: "BOZZA",
        };
        await onSubmit({
            carico: {
                ...base,
                cause_id: causeCarico.id,
                movement_type: "CARICO",
                sign: "PLUS",
                source_context: "FUORI_UL",
                source_site_id: siteId,
                linked_document_id: null,
            },
            scarico: {
                ...base,
                cause_id: causeScarico.id,
                movement_type: "SCARICO",
                sign: "MINUS",
                source_context: "FUORI_UL",
                source_site_id: siteId,
                linked_document_id: documentId,
            },
        });
    };
    return (_jsxs("div", { className: "space-y-6 mt-4", children: [_jsx("div", { className: "flex items-center gap-1", children: STEPS.map((s, i) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: `flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`, children: i < step ? _jsx(Check, { className: "h-3.5 w-3.5" }) : i + 1 }), _jsx("span", { className: `text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`, children: s }), i < STEPS.length - 1 && _jsx(ChevronRight, { className: "h-3 w-3 text-muted-foreground mx-1" })] }, i))) }), step === 0 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Package, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Seleziona articolo e quantit\u00E0" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Articolo / CER *" }), _jsxs(Select, { value: itemId, onValueChange: setItemId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo && i.item_type === "WASTE_CER").map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione, " ", i.pericoloso ? "⚠️" : ""] }, i.id))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", step: "0.01", min: "0", value: quantity, onChange: e => setQuantity(e.target.value), placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Data Movimento" }), _jsx(Input, { type: "date", value: movementDate, onChange: e => setMovementDate(e.target.value) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato Fisico" }), _jsxs(Select, { value: physicalState, onValueChange: setPhysicalState, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "solido_pulverulento", children: "Solido pulverulento" }), _jsx(SelectItem, { value: "solido_non_pulverulento", children: "Solido non pulverulento" }), _jsx(SelectItem, { value: "fangoso_palabile", children: "Fangoso palabile" }), _jsx(SelectItem, { value: "liquido", children: "Liquido" })] })] })] })] })), step === 1 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(MapPin, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Luogo di produzione fuori U.L." })] }), _jsxs("div", { children: [_jsx(Label, { children: "Cantiere *" }), _jsxs(Select, { value: siteId, onValueChange: setSiteId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona cantiere..." }) }), _jsx(SelectContent, { children: sites.filter(s => s.active).map(s => (_jsxs(SelectItem, { value: s.id, children: [s.site_code, " \u2014 ", s.name, " (", s.municipality, ", ", s.province, ")"] }, s.id))) })] })] }), selectedSite && (_jsxs("div", { className: "bg-muted/30 border border-border/30 rounded-lg p-3 text-sm space-y-1", children: [_jsx("p", { className: "font-medium", children: selectedSite.name }), _jsxs("p", { className: "text-muted-foreground", children: [selectedSite.address, ", ", selectedSite.municipality, " (", selectedSite.province, ")"] }), _jsx(Badge, { variant: "outline", className: "text-xs", children: selectedSite.activity_type })] }))] })), step === 2 && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FileText, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "font-semibold", children: "Documento FIR collegato" })] }), _jsxs("div", { children: [_jsx(Label, { children: "FIR / Formulario *" }), _jsxs(Select, { value: documentId, onValueChange: setDocumentId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona documento..." }) }), _jsx(SelectContent, { children: documents.filter(d => d.document_type === "FIR").map(d => (_jsxs(SelectItem, { value: d.id, children: [d.document_type, " \u2014 ", d.number || "Senza numero", " (", d.document_date ? new Date(d.document_date).toLocaleDateString("it-IT") : "", ")"] }, d.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Codice Operazione (R/D)" }), _jsxs(Select, { value: operationCode, onValueChange: setOperationCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona operazione..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "Nessuno" }), TUTTI_CODICI_OPERAZIONE.map(op => (_jsxs(SelectItem, { value: op.codice, children: [op.codice, " \u2014 ", op.descrizione] }, op.codice)))] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: note, onChange: e => setNote(e.target.value), rows: 3, placeholder: "Note opzionali..." })] })] })), step === 3 && (_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "font-semibold", children: "Riepilogo operazione" }), _jsxs("div", { className: "bg-muted/20 border border-border/30 rounded-xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", children: "CARICO" }), _jsx(ArrowRight, { className: "h-4 w-4 text-muted-foreground" }), _jsx(Badge, { className: "bg-rose-500/20 text-rose-300 border-rose-500/30", children: "SCARICO" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Articolo" }), _jsxs("p", { className: "font-mono", children: [selectedItem?.codice_cer, " \u2014 ", selectedItem?.descrizione] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0" }), _jsxs("p", { className: "font-mono font-bold", children: [parseFloat(quantity || "0").toLocaleString("it-IT"), " kg"] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Cantiere" }), _jsxs("p", { children: [selectedSite?.site_code, " \u2014 ", selectedSite?.name] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "FIR" }), _jsx("p", { children: selectedDoc?.number || "—" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Data" }), _jsx("p", { children: new Date(movementDate).toLocaleDateString("it-IT") })] }), operationCode && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Operazione R/D" }), _jsx("p", { className: "font-mono", children: operationCode })] }))] }), _jsx("div", { className: "border-t border-border/20 pt-3 text-xs text-muted-foreground", children: _jsxs("p", { children: ["Verranno creati ", _jsx("strong", { children: "2 movimenti" }), " di registro (carico + scarico) collegati, con i relativi movimenti di magazzino."] }) })] })] })), _jsxs("div", { className: "flex gap-2 pt-2", children: [step > 0 && (_jsx(Button, { variant: "outline", onClick: () => setStep(s => s - 1), children: "Indietro" })), _jsx(Button, { variant: "outline", onClick: onCancel, className: "ml-auto", children: "Annulla" }), step < STEPS.length - 1 ? (_jsx(Button, { onClick: () => setStep(s => s + 1), disabled: !canNext(), children: "Avanti" })) : (_jsx(Button, { onClick: handleSubmit, disabled: isLoading, children: isLoading ? "Salvataggio..." : "Conferma e Registra" }))] })] }));
}
