import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { useDragonRegister } from "@/hooks/dragon/useDragonRegister";
import { useDragonRegisters } from "@/hooks/dragon/useDragonRegisters";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, TrendingDown, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { DragonBackButton } from "@/components/dragon/DragonBackButton";
export default function DragonScaricoUscitaPage() {
    const { context } = useParams();
    const navigate = useNavigate();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const { balances } = useDragonStock();
    const { causes } = useDragonCauses();
    const { items } = useDragonItems();
    const { registers } = useDragonRegisters();
    const { movements: allCarichi } = useDragonRegister({ movementType: "CARICO", status: "CONSOLIDATO" });
    const [step, setStep] = useState("select");
    const [selectedItemId, setSelectedItemId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [operationCode, setOperationCode] = useState("");
    const [destinationType, setDestinationType] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Only show CER items with positive waste balance
    const itemsWithBalance = useMemo(() => {
        return balances
            .filter(b => b.warehouse_scope === "WASTE" && b.balance > 0)
            .map(b => ({
            ...b,
            item: items.find(i => i.id === b.item_id) || b.item,
        }))
            .sort((a, b) => (a.item?.codice_cer || "").localeCompare(b.item?.codice_cer || ""));
    }, [balances, items]);
    const selectedBalance = itemsWithBalance.find(b => b.item_id === selectedItemId);
    const selectedItem = selectedBalance?.item;
    const maxQty = selectedBalance?.balance || 0;
    const qty = parseFloat(quantity) || 0;
    // FIFO: get CARICO movements for this CER, oldest first
    const carichiForItem = useMemo(() => {
        if (!selectedItemId)
            return [];
        return allCarichi
            .filter(m => m.item_id === selectedItemId && m.sign === "PLUS")
            .sort((a, b) => new Date(a.movement_date).getTime() - new Date(b.movement_date).getTime());
    }, [allCarichi, selectedItemId]);
    // Calculate FIFO allocation
    const fifoAllocation = useMemo(() => {
        if (qty <= 0 || carichiForItem.length === 0)
            return [];
        let remaining = qty;
        const allocations = [];
        for (const m of carichiForItem) {
            if (remaining <= 0)
                break;
            const available = Number(m.quantity); // simplified — ideally check already-allocated
            const alloc = Math.min(remaining, available);
            allocations.push({
                movement_id: m.id,
                movement_number: m.movement_number,
                date: m.movement_date,
                allocated: alloc,
            });
            remaining -= alloc;
        }
        return allocations;
    }, [qty, carichiForItem]);
    const scaricoCause = causes.find(c => c.code === "SCARICO_USCITA_FORMULARIO" || c.code === "SCARICO_USCITA_FIR" || c.code === "SCARICO_USCITA");
    const produttoreRegister = registers.find(r => r.subject_type === "PRODUTTORE");
    const handleSubmit = async () => {
        if (!selectedItemId || qty <= 0 || !scaricoCause)
            return;
        setSubmitting(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            // Create FIR document
            const { data: doc, error: docErr } = await supabase
                .from("dragon_documents")
                .insert({
                company_id: companyId,
                document_type: "FIR",
                document_date: today,
                status: "BOZZA",
                notes: notes || null,
            })
                .select()
                .single();
            if (docErr)
                throw docErr;
            // Create SCARICO register movement
            const { data: scarico, error: scarErr } = await supabase
                .from("dragon_register_movements")
                .insert({
                company_id: companyId,
                register_id: produttoreRegister?.id || null,
                movement_date: today,
                recording_date: today,
                item_id: selectedItemId,
                cer_code: selectedItem?.codice_cer || "",
                description_snapshot: selectedItem?.descrizione,
                movement_type: "SCARICO",
                cause_id: scaricoCause.id,
                quantity: qty,
                unit_of_measure: selectedItem?.unita_misura_default || "kg",
                sign: "MINUS",
                source_context: "UL",
                weight_status: "DEFINITIVO",
                status: "CONSOLIDATO",
                linked_document_id: doc.id,
                operation_code: operationCode || null,
                destination_type: destinationType || null,
                note: notes || null,
                created_by: user?.id,
            })
                .select()
                .single();
            if (scarErr)
                throw scarErr;
            // Create FIFO allocations
            for (const alloc of fifoAllocation) {
                await supabase.from("dragon_movement_allocations").insert({
                    in_movement_id: alloc.movement_id,
                    out_movement_id: scarico.id,
                    allocated_quantity: alloc.allocated,
                });
            }
            // Audit
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "register_movement",
                entity_id: scarico.id,
                action_type: "CREATE",
                after_state: {
                    type: "SCARICO_USCITA_FIR",
                    cer: selectedItem?.codice_cer,
                    qty,
                    fifo_allocations: fifoAllocation.length,
                    document_id: doc.id,
                },
                performed_by: user?.id,
                reason: "Scarico uscita con FIR e abbinamento FIFO",
            });
            qc.invalidateQueries({ queryKey: ["dragon-register"] });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Scarico uscita registrato con abbinamento FIFO");
            navigate(`/mn/admin/${context}/dragon/registro`);
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const rCodes = ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10", "R11", "R12", "R13"];
    const dCodes = ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13", "D14", "D15"];
    return (_jsx(MNAdminLayout, { title: "Scarico Uscita con FIR", subtitle: "Dragon \u2014 Emissione formulario e abbinamento FIFO", children: _jsxs("div", { className: "max-w-2xl mx-auto space-y-4", children: [_jsx(DragonBackButton, {}), step === "select" && (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Package, { className: "h-4 w-4 text-amber-400" }), " Seleziona CER da scaricare"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Solo i codici CER con giacenza positiva sono disponibili." }), itemsWithBalance.length === 0 ? (_jsx("p", { className: "text-sm text-muted-foreground py-8 text-center", children: "Nessun rifiuto in giacenza" })) : (_jsx("div", { className: "space-y-2", children: itemsWithBalance.map(b => (_jsx("button", { className: `w-full text-left p-3 rounded-lg border transition-all ${selectedItemId === b.item_id
                                    ? "border-emerald-500/50 bg-emerald-500/10"
                                    : "border-border/30 hover:border-border/60 bg-card/40"}`, onClick: () => setSelectedItemId(b.item_id), children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("span", { className: "font-mono text-sm", children: b.item?.codice_cer }), _jsx("span", { className: "text-xs text-muted-foreground ml-2", children: b.item?.descrizione })] }), _jsxs(Badge, { variant: "outline", className: "font-mono", children: [Math.round(b.balance).toLocaleString("it-IT"), " kg"] })] }) }, b.item_id))) })), _jsx(Button, { className: "w-full", disabled: !selectedItemId, onClick: () => setStep("quantity"), children: "Continua" })] })), step === "quantity" && selectedItem && (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(TrendingDown, { className: "h-4 w-4 text-rose-400" }), " Quantit\u00E0 e dettagli scarico"] }), _jsxs("div", { className: "p-3 rounded-lg border border-border/20 bg-muted/20", children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER selezionato" }), _jsxs("p", { className: "font-mono text-sm", children: [selectedItem.codice_cer, " \u2014 ", selectedItem.descrizione] }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: ["Giacenza disponibile: ", _jsxs("span", { className: "font-mono font-bold", children: [Math.round(maxQty).toLocaleString("it-IT"), " kg"] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 da scaricare (kg) *" }), _jsx(Input, { type: "number", step: "0.01", max: maxQty, value: quantity, onChange: e => setQuantity(e.target.value), placeholder: "0.00", className: "font-mono" }), qty > maxQty && _jsx("p", { className: "text-xs text-rose-400 mt-1", children: "\u26A0 Supera la giacenza disponibile" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { children: "Operazione R/D" }), _jsxs(Select, { value: operationCode, onValueChange: setOperationCode, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsxs(SelectContent, { children: [rCodes.map(c => _jsx(SelectItem, { value: c, children: c }, c)), dCodes.map(c => _jsx(SelectItem, { value: c, children: c }, c))] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo destinazione" }), _jsxs(Select, { value: destinationType, onValueChange: setDestinationType, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona..." }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "IMPIANTO_RECUPERO", children: "Impianto Recupero" }), _jsx(SelectItem, { value: "IMPIANTO_SMALTIMENTO", children: "Impianto Smaltimento" }), _jsx(SelectItem, { value: "DISCARICA", children: "Discarica" }), _jsx(SelectItem, { value: "ALTRO", children: "Altro" })] })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: notes, onChange: e => setNotes(e.target.value), placeholder: "Note opzionali...", rows: 2 })] }), qty > 0 && fifoAllocation.length > 0 && (_jsxs("div", { className: "p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-blue-400", children: "\uD83D\uDCCB Abbinamento FIFO ai carichi:" }), fifoAllocation.map((a, i) => (_jsxs("div", { className: "flex justify-between text-xs", children: [_jsxs("span", { children: ["Mov. #", a.movement_number, " del ", new Date(a.date).toLocaleDateString("it-IT")] }), _jsxs("span", { className: "font-mono", children: [a.allocated.toLocaleString("it-IT"), " kg"] })] }, i)))] })), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => setStep("select"), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-1" }), " Indietro"] }), _jsx(Button, { className: "flex-1", disabled: qty <= 0 || qty > maxQty, onClick: () => setStep("confirm"), children: "Conferma e genera scarico" })] })] })), step === "confirm" && selectedItem && (_jsxs("div", { className: "bg-card/60 border border-border/30 rounded-xl p-6 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-emerald-400", children: [_jsx(CheckCircle, { className: "h-4 w-4" }), " Riepilogo scarico uscita"] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "CER" }), _jsx("p", { className: "font-mono", children: selectedItem.codice_cer })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Quantit\u00E0" }), _jsxs("p", { className: "font-mono", children: [qty.toLocaleString("it-IT"), " kg"] })] }), operationCode && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Operazione" }), _jsx("p", { children: operationCode })] }), destinationType && _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Destinazione" }), _jsx("p", { children: destinationType })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Abbinamenti FIFO" }), _jsxs("p", { children: [fifoAllocation.length, " carichi"] })] })] }), _jsx("div", { className: "p-3 rounded-lg border border-amber-500/20 bg-amber-500/5", children: _jsxs("p", { className: "text-xs text-amber-400", children: [_jsx(FileText, { className: "h-3 w-3 inline mr-1" }), "Verr\u00E0 creato un documento FIR in bozza. Dovrai completarlo con destinatario e trasportatore."] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", onClick: () => setStep("quantity"), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-1" }), " Modifica"] }), _jsx(Button, { className: "flex-1", disabled: submitting, onClick: handleSubmit, children: submitting ? "Registrazione..." : "Conferma Scarico e Crea FIR" })] })] }))] }) }));
}
