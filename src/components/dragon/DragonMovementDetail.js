import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, ArrowDown, ArrowUp, FileText, Scissors, Package } from "lucide-react";
export function DragonMovementDetail({ movement, open, onClose }) {
    const [chain, setChain] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!movement || !open) {
            setChain(null);
            return;
        }
        loadTraceChain(movement);
    }, [movement?.id, open]);
    const loadTraceChain = async (m) => {
        setLoading(true);
        try {
            const result = {
                firDocument: null,
                registerMovement: null,
                transformBatch: null,
                batchOutputs: [],
                parentMovement: null,
                childMovements: [],
                allocations: [],
            };
            // 1. Load linked register movement
            if (m.source_register_movement_id) {
                const { data } = await supabase
                    .from("dragon_register_movements")
                    .select("*, cause:dragon_causes(*), item:dragon_items(*), linked_document:dragon_documents(*), register:dragon_registers(*)")
                    .eq("id", m.source_register_movement_id)
                    .single();
                if (data) {
                    result.registerMovement = data;
                    // Get FIR document from register movement
                    if (data.linked_document_id) {
                        result.firDocument = data.linked_document;
                    }
                    // Get parent movement (e.g. carico that led to this scarico)
                    if (data.parent_movement_id) {
                        const { data: parent } = await supabase
                            .from("dragon_register_movements")
                            .select("*, cause:dragon_causes(*), item:dragon_items(*)")
                            .eq("id", data.parent_movement_id)
                            .single();
                        result.parentMovement = parent;
                    }
                    // Get child movements
                    const { data: children } = await supabase
                        .from("dragon_register_movements")
                        .select("*, cause:dragon_causes(*), item:dragon_items(*)")
                        .eq("parent_movement_id", m.source_register_movement_id)
                        .is("deleted_at", null);
                    result.childMovements = children || [];
                    // Get FIFO allocations
                    const { data: allocsOut } = await supabase
                        .from("dragon_movement_allocations")
                        .select("*, in_mov:dragon_register_movements!dragon_movement_allocations_in_movement_id_fkey(movement_number, movement_date, quantity, cer_code)")
                        .eq("out_movement_id", m.source_register_movement_id);
                    const { data: allocsIn } = await supabase
                        .from("dragon_movement_allocations")
                        .select("*, out_mov:dragon_register_movements!dragon_movement_allocations_out_movement_id_fkey(movement_number, movement_date, quantity, cer_code)")
                        .eq("in_movement_id", m.source_register_movement_id);
                    result.allocations = [...(allocsOut || []), ...(allocsIn || [])];
                }
            }
            // 2. Load transform batch
            if (m.source_transform_batch_id) {
                const { data: batch } = await supabase
                    .from("dragon_transform_batches")
                    .select("*, source_item:dragon_items!dragon_transform_batches_source_item_id_fkey(*), model:dragon_transform_models(*)")
                    .eq("id", m.source_transform_batch_id)
                    .single();
                if (batch) {
                    result.transformBatch = batch;
                    const { data: outputs } = await supabase
                        .from("dragon_transform_batch_outputs")
                        .select("*, output_item:dragon_items!dragon_transform_batch_outputs_output_item_id_fkey(*)")
                        .eq("batch_id", m.source_transform_batch_id);
                    result.batchOutputs = outputs || [];
                }
            }
            // 3. If no register movement link, try to find via document
            if (!result.firDocument && m.source_document_id) {
                const { data: doc } = await supabase
                    .from("dragon_documents")
                    .select("*")
                    .eq("id", m.source_document_id)
                    .single();
                result.firDocument = doc;
            }
            setChain(result);
        }
        catch (e) {
            console.error("Trace chain error:", e);
        }
        finally {
            setLoading(false);
        }
    };
    if (!movement)
        return null;
    const m = movement;
    const item = m.item;
    const cause = m.cause;
    return (_jsx(Dialog, { open: open, onOpenChange: (v) => !v && onClose(), children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Dettaglio Movimento & Tracciabilit\u00E0" }) }), _jsxs("div", { className: "space-y-4 text-sm", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Row, { label: "Data", value: new Date(m.movement_date).toLocaleDateString("it-IT") }), _jsx(Row, { label: "Articolo", value: `${item?.codice_cer} — ${item?.descrizione}` }), _jsx(Row, { label: "Causale", value: cause?.name || cause?.code || "—" }), _jsx(Row, { label: "Segno", value: m.sign === "PLUS" ? "+CARICO" : "−SCARICO" }), _jsx(Row, { label: "Quantit\u00E0", value: `${Number(m.quantity).toLocaleString("it-IT")} ${item?.unita_misura_default || "kg"}` }), _jsx(Row, { label: "Ambito", value: m.warehouse_scope }), m.lot_reference && _jsx(Row, { label: "Lotto", value: m.lot_reference }), m.note && _jsx(Row, { label: "Note", value: m.note })] }), _jsxs("div", { className: "border-t border-border/30 pt-3", children: [_jsx("p", { className: "text-sm font-semibold mb-3 flex items-center gap-2", children: "\uD83D\uDD0D Tracciabilit\u00E0 (Rintraccia)" }), loading ? (_jsxs("div", { className: "flex items-center gap-2 text-muted-foreground py-4 justify-center", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " Caricamento catena..."] })) : chain ? (_jsxs("div", { className: "space-y-3", children: [chain.firDocument && (_jsx(TraceBlock, { icon: _jsx(FileText, { className: "h-4 w-4" }), title: "Documento FIR", color: "blue", items: [
                                                `Tipo: ${chain.firDocument.document_type}`,
                                                chain.firDocument.number ? `N°: ${chain.firDocument.number}` : null,
                                                chain.firDocument.document_date ? `Data: ${new Date(chain.firDocument.document_date).toLocaleDateString("it-IT")}` : null,
                                                `Stato: ${chain.firDocument.status}`,
                                            ] })), chain.registerMovement && (_jsx(TraceBlock, { icon: chain.registerMovement.movement_type === "CARICO" ? _jsx(ArrowDown, { className: "h-4 w-4" }) : _jsx(ArrowUp, { className: "h-4 w-4" }), title: `Registro: ${chain.registerMovement.movement_type} #${chain.registerMovement.movement_number}`, color: chain.registerMovement.movement_type === "CARICO" ? "emerald" : "rose", items: [
                                                `CER: ${chain.registerMovement.cer_code}`,
                                                `Quantità: ${Number(chain.registerMovement.quantity).toLocaleString("it-IT")} ${chain.registerMovement.unit_of_measure}`,
                                                `Causale: ${chain.registerMovement.cause?.name || "—"}`,
                                                `Stato: ${chain.registerMovement.status}`,
                                                chain.registerMovement.register ? `Registro: ${chain.registerMovement.register.register_code}` : null,
                                            ] })), chain.parentMovement && (_jsx(TraceBlock, { icon: _jsx(ArrowDown, { className: "h-4 w-4" }), title: `Movimento Origine: ${chain.parentMovement.movement_type} #${chain.parentMovement.movement_number}`, color: "amber", items: [
                                                `CER: ${chain.parentMovement.cer_code}`,
                                                `${Number(chain.parentMovement.quantity).toLocaleString("it-IT")} kg`,
                                                `Causale: ${chain.parentMovement.cause?.name || "—"}`,
                                            ] })), chain.transformBatch && (_jsx(TraceBlock, { icon: _jsx(Scissors, { className: "h-4 w-4" }), title: `Cernita/Lavorazione — ${chain.transformBatch.status}`, color: "violet", items: [
                                                `Input: ${chain.transformBatch.source_item?.codice_cer} — ${Number(chain.transformBatch.input_quantity).toLocaleString("it-IT")} kg`,
                                                chain.transformBatch.model ? `Modello: ${chain.transformBatch.model.name}` : "Manuale (senza modello)",
                                                `Data: ${new Date(chain.transformBatch.execution_date).toLocaleDateString("it-IT")}`,
                                                ...chain.batchOutputs.map((o) => `→ ${o.output_item?.codice_cer} (${o.warehouse_scope}): ${Number(o.output_quantity).toLocaleString("it-IT")} kg`),
                                            ] })), chain.childMovements.length > 0 && (_jsx(TraceBlock, { icon: _jsx(ArrowUp, { className: "h-4 w-4" }), title: `Movimenti Collegati (${chain.childMovements.length})`, color: "cyan", items: chain.childMovements.map((c) => `${c.movement_type} #${c.movement_number}: ${c.cer_code} — ${Number(c.quantity).toLocaleString("it-IT")} kg (${c.cause?.name || "—"})`) })), chain.allocations.length > 0 && (_jsx(TraceBlock, { icon: _jsx(Package, { className: "h-4 w-4" }), title: `Abbinamenti FIFO (${chain.allocations.length})`, color: "orange", items: chain.allocations.map((a) => {
                                                const linked = a.in_mov || a.out_mov;
                                                return linked
                                                    ? `Mov. #${linked.movement_number} (${new Date(linked.movement_date).toLocaleDateString("it-IT")}): ${Number(a.allocated_quantity).toLocaleString("it-IT")} kg`
                                                    : `${Number(a.allocated_quantity).toLocaleString("it-IT")} kg`;
                                            }) })), !chain.firDocument && !chain.registerMovement && !chain.transformBatch && chain.allocations.length === 0 && (_jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "Nessun collegamento trovato per questo movimento" }))] })) : (_jsxs("div", { className: "text-xs text-muted-foreground", children: [_jsx(TraceRow, { label: "Mov. Registro", id: m.source_register_movement_id }), _jsx(TraceRow, { label: "Batch Trasformazione", id: m.source_transform_batch_id }), _jsx(TraceRow, { label: "Documento", id: m.source_document_id })] }))] })] })] }) }));
}
function TraceBlock({ icon, title, color, items }) {
    const filtered = items.filter(Boolean);
    return (_jsxs("div", { className: `p-3 rounded-lg border border-${color}-500/20 bg-${color}-500/5`, children: [_jsxs("div", { className: `flex items-center gap-2 text-xs font-semibold text-${color}-400 mb-1`, children: [icon, " ", title] }), _jsx("ul", { className: "space-y-0.5", children: filtered.map((item, i) => (_jsx("li", { className: "text-xs text-muted-foreground", children: item }, i))) })] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: label }), _jsx("span", { className: "font-medium text-right", children: value })] }));
}
function TraceRow({ label, id }) {
    return (_jsxs("div", { className: "flex justify-between text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: label }), id ? (_jsxs(Badge, { variant: "outline", className: "bg-emerald-500/10 text-emerald-400 font-mono text-[10px]", children: [id.slice(0, 8), "\u2026"] })) : (_jsx("span", { className: "text-muted-foreground/50", children: "\u2014" }))] }));
}
