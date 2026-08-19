import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonSites } from "@/hooks/dragon/useDragonSites";
import { useDragonDocuments } from "@/hooks/dragon/useDragonDocuments";
export function DragonMovementForm({ causes, onSubmit, isLoading }) {
    const { items } = useDragonItems();
    const { sites } = useDragonSites();
    const { documents } = useDragonDocuments();
    const [causeId, setCauseId] = useState("");
    const [itemId, setItemId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
    const [siteId, setSiteId] = useState("");
    const [documentId, setDocumentId] = useState("");
    const [note, setNote] = useState("");
    const [physicalState, setPhysicalState] = useState("");
    const selectedCause = causes.find(c => c.id === causeId);
    const selectedItem = items.find(i => i.id === itemId);
    const movementType = selectedCause?.config?.movement_type === "SCARICO" ? "SCARICO" : "CARICO";
    const sign = movementType === "CARICO" ? "PLUS" : "MINUS";
    const sourceContext = selectedCause?.requires_site ? "FUORI_UL" : "UL";
    const handleSubmit = async () => {
        if (!causeId || !itemId || !quantity)
            return;
        await onSubmit({
            cause_id: causeId,
            item_id: itemId,
            cer_code: selectedItem?.codice_cer || "",
            description_snapshot: selectedItem?.descrizione || "",
            quantity: parseFloat(quantity),
            unit_of_measure: selectedItem?.unita_misura_default || "kg",
            movement_date: movementDate,
            recording_date: new Date().toISOString().split("T")[0],
            movement_type: movementType,
            sign,
            source_context: sourceContext,
            source_site_id: siteId || null,
            linked_document_id: documentId || null,
            physical_state: physicalState || selectedItem?.stato_fisico_default || null,
            hp_codes: selectedItem?.classi_hp || [],
            note: note || null,
            status: "BOZZA",
            weight_status: "DEFINITIVO",
        });
    };
    return (_jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Causale *" }), _jsxs(Select, { value: causeId, onValueChange: setCauseId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona causale..." }) }), _jsx(SelectContent, { children: causes.filter(c => c.scope !== "STOCK").map(c => (_jsx(SelectItem, { value: c.id, children: c.name }, c.id))) })] }), selectedCause && (_jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [selectedCause.direction, " \u2022 ", selectedCause.requires_fir ? "🔗 Richiede FIR" : "", " ", selectedCause.requires_site ? "📍 Richiede cantiere" : ""] }))] }), _jsxs("div", { children: [_jsx(Label, { children: "Articolo / CER *" }), _jsxs(Select, { value: itemId, onValueChange: setItemId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo).map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione, " ", i.pericoloso ? "⚠" : ""] }, i.id))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 *" }), _jsx(Input, { type: "number", step: "0.01", value: quantity, onChange: e => setQuantity(e.target.value), placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Data Movimento" }), _jsx(Input, { type: "date", value: movementDate, onChange: e => setMovementDate(e.target.value) })] })] }), selectedCause?.requires_site && (_jsxs("div", { children: [_jsx(Label, { children: "Cantiere / Luogo Produzione *" }), _jsxs(Select, { value: siteId, onValueChange: setSiteId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona cantiere..." }) }), _jsx(SelectContent, { children: sites.filter(s => s.active).map(s => (_jsxs(SelectItem, { value: s.id, children: [s.site_code, " \u2014 ", s.name] }, s.id))) })] })] })), selectedCause?.requires_fir && (_jsxs("div", { children: [_jsx(Label, { children: "Documento collegato *" }), _jsxs(Select, { value: documentId, onValueChange: setDocumentId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona documento..." }) }), _jsx(SelectContent, { children: documents.map(d => (_jsxs(SelectItem, { value: d.id, children: [d.document_type, " \u2014 ", d.number || "Senza numero"] }, d.id))) })] })] })), _jsxs("div", { children: [_jsx(Label, { children: "Stato Fisico" }), _jsxs(Select, { value: physicalState, onValueChange: setPhysicalState, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "solido_pulverulento", children: "Solido pulverulento" }), _jsx(SelectItem, { value: "solido_non_pulverulento", children: "Solido non pulverulento" }), _jsx(SelectItem, { value: "fangoso_palabile", children: "Fangoso palabile" }), _jsx(SelectItem, { value: "liquido", children: "Liquido" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: note, onChange: e => setNote(e.target.value), rows: 3 })] }), causeId && itemId && quantity && (_jsxs("div", { className: "bg-muted/30 border border-border/30 rounded-lg p-3 space-y-1", children: [_jsx("p", { className: "text-xs font-medium text-foreground", children: "Riepilogo" }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [movementType, " ", sign === "PLUS" ? "➕" : "➖", " ", quantity, " ", selectedItem?.unita_misura_default || "kg", " di ", selectedItem?.codice_cer] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Causale: ", selectedCause?.name] }), sourceContext === "FUORI_UL" && _jsx("p", { className: "text-xs text-muted-foreground", children: "\uD83D\uDCCD Fuori U.L." })] })), _jsx(Button, { onClick: handleSubmit, disabled: isLoading || !causeId || !itemId || !quantity, className: "w-full", children: isLoading ? "Salvataggio..." : "Registra Movimento" })] }));
}
