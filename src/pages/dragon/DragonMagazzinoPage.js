import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { useDragonStock } from "@/hooks/dragon/useDragonStock";
import { useDragonItems } from "@/hooks/dragon/useDragonItems";
import { useDragonCauses } from "@/hooks/dragon/useDragonCauses";
import { useMNContextStore } from "@/stores/mnContextStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Package, Recycle, Plus, Minus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
export default function DragonMagazzinoPage() {
    const [scope, setScope] = useState(undefined);
    const { balances, stockMovements, isLoading } = useDragonStock(scope);
    const { items } = useDragonItems();
    const { causes } = useDragonCauses();
    const companyId = useMNContextStore((s) => s.activeContext.tenantId);
    const { user } = useAuth();
    const qc = useQueryClient();
    const [showAdjust, setShowAdjust] = useState(false);
    const [adjustForm, setAdjustForm] = useState({
        item_id: "",
        adjustment_type: "POSITIVE",
        quantity: "",
        reason: "",
        warehouse_scope: "WASTE",
    });
    const [submitting, setSubmitting] = useState(false);
    const handleAdjust = async () => {
        if (!adjustForm.item_id || !adjustForm.quantity || !adjustForm.reason) {
            toast.error("Compila tutti i campi obbligatori");
            return;
        }
        setSubmitting(true);
        try {
            const adjustCauseCode = adjustForm.adjustment_type === "POSITIVE" ? "RETTIFICA_GIACENZA_POSITIVA" : "RETTIFICA_GIACENZA_NEGATIVA";
            const adjustCause = causes.find(c => c.code === adjustCauseCode);
            if (!adjustCause)
                throw new Error(`Causale ${adjustCauseCode} non trovata`);
            const qty = parseFloat(adjustForm.quantity);
            if (isNaN(qty) || qty <= 0)
                throw new Error("Quantità non valida");
            // Create stock movement for adjustment
            const { data: stockMov, error: stockErr } = await supabase
                .from("dragon_stock_movements")
                .insert({
                company_id: companyId,
                item_id: adjustForm.item_id,
                movement_date: new Date().toISOString().split("T")[0],
                cause_id: adjustCause.id,
                quantity: qty,
                sign: adjustForm.adjustment_type === "POSITIVE" ? "PLUS" : "MINUS",
                warehouse_scope: adjustForm.warehouse_scope,
                created_by: user?.id,
                note: `Rettifica: ${adjustForm.reason}`,
            })
                .select()
                .single();
            if (stockErr)
                throw stockErr;
            // Create inventory adjustment record
            const { error: adjErr } = await supabase
                .from("dragon_inventory_adjustments")
                .insert({
                company_id: companyId,
                item_id: adjustForm.item_id,
                adjustment_type: adjustForm.adjustment_type,
                quantity: qty,
                reason: adjustForm.reason,
                related_stock_movement_id: stockMov.id,
                created_by: user?.id,
            });
            if (adjErr)
                throw adjErr;
            // Create audit log
            await supabase.from("dragon_audit_logs").insert({
                entity_type: "inventory_adjustment",
                entity_id: stockMov.id,
                action_type: "ADJUST",
                after_state: { item_id: adjustForm.item_id, type: adjustForm.adjustment_type, quantity: qty, scope: adjustForm.warehouse_scope },
                performed_by: user?.id,
                reason: adjustForm.reason,
            });
            qc.invalidateQueries({ queryKey: ["dragon-stock"] });
            qc.invalidateQueries({ queryKey: ["dragon-audit"] });
            toast.success("Rettifica registrata");
            setShowAdjust(false);
            setAdjustForm({ item_id: "", adjustment_type: "POSITIVE", quantity: "", reason: "", warehouse_scope: "WASTE" });
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(MNAdminLayout, { title: "Magazzino", subtitle: "Dragon Rifiuti 2 \u2014 Giacenze e movimenti fisici", children: [_jsxs(Tabs, { defaultValue: "balances", className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "balances", children: "Saldi" }), _jsx(TabsTrigger, { value: "ledger", children: "Ledger Movimenti" }), _jsx(TabsTrigger, { value: "adjustments", children: "Rettifiche" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: scope === undefined ? "default" : "outline", size: "sm", onClick: () => setScope(undefined), children: "Tutti" }), _jsxs(Button, { variant: scope === "WASTE" ? "default" : "outline", size: "sm", onClick: () => setScope("WASTE"), children: [_jsx(Recycle, { className: "h-4 w-4 mr-1" }), " Rifiuti"] }), _jsxs(Button, { variant: scope === "MPS" ? "default" : "outline", size: "sm", onClick: () => setScope("MPS"), children: [_jsx(Package, { className: "h-4 w-4 mr-1" }), " MPS"] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => setShowAdjust(true), children: [_jsx(RotateCcw, { className: "h-4 w-4 mr-1" }), " Rettifica"] })] })] }), _jsx(TabsContent, { value: "balances", children: _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Descrizione" }), _jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { children: "Ambito" }), _jsx(TableHead, { className: "text-right", children: "Giacenza" }), _jsx(TableHead, { children: "U.M." })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : balances.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-12 text-muted-foreground", children: "Nessuna giacenza" }) })) : (balances.map((b, i) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "font-mono text-sm", children: b.item?.codice_cer }), _jsx(TableCell, { className: "text-sm", children: b.item?.descrizione }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: "text-xs", children: b.item?.item_type }) }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: b.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300", children: b.warehouse_scope }) }), _jsx(TableCell, { className: `text-right font-mono font-bold ${b.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`, children: Number(b.balance).toLocaleString("it-IT") }), _jsx(TableCell, { className: "text-xs text-muted-foreground", children: b.item?.unita_misura_default })] }, `${b.item_id}-${b.warehouse_scope}-${i}`)))) })] }) }) }), _jsx(TabsContent, { value: "ledger", children: _jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "Codice" }), _jsx(TableHead, { children: "Causale" }), _jsx(TableHead, { children: "Ambito" }), _jsx(TableHead, { className: "text-right", children: "+/\u2212" }), _jsx(TableHead, { className: "text-right", children: "Quantit\u00E0" }), _jsx(TableHead, { children: "Note" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : stockMovements.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-12 text-muted-foreground", children: "Nessun movimento" }) })) : (stockMovements.map((m) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-sm", children: new Date(m.movement_date).toLocaleDateString("it-IT") }), _jsx(TableCell, { className: "font-mono text-sm", children: m.item?.codice_cer }), _jsx(TableCell, { className: "text-xs", children: m.cause?.name || "—" }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: m.warehouse_scope === "WASTE" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300", children: m.warehouse_scope }) }), _jsx(TableCell, { className: "text-right", children: m.sign === "PLUS" ? _jsx("span", { className: "text-emerald-400", children: "+" }) : _jsx("span", { className: "text-rose-400", children: "\u2212" }) }), _jsx(TableCell, { className: "text-right font-mono", children: Number(m.quantity).toLocaleString("it-IT") }), _jsx(TableCell, { className: "text-xs text-muted-foreground truncate max-w-[150px]", children: m.note || "—" })] }, m.id)))) })] }) }) }), _jsx(TabsContent, { value: "adjustments", children: _jsx(AdjustmentsTab, { companyId: companyId }) })] }), _jsx(Sheet, { open: showAdjust, onOpenChange: setShowAdjust, children: _jsxs(SheetContent, { className: "w-full sm:max-w-md overflow-y-auto", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: "Nuova Rettifica Magazzino" }) }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Articolo *" }), _jsxs(Select, { value: adjustForm.item_id, onValueChange: v => setAdjustForm(f => ({ ...f, item_id: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona articolo..." }) }), _jsx(SelectContent, { children: items.filter(i => i.attivo).map(i => (_jsxs(SelectItem, { value: i.id, children: [i.codice_cer, " \u2014 ", i.descrizione] }, i.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Rettifica *" }), _jsxs(Select, { value: adjustForm.adjustment_type, onValueChange: (v) => setAdjustForm(f => ({ ...f, adjustment_type: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsxs(SelectItem, { value: "POSITIVE", children: [_jsx(Plus, { className: "h-3 w-3 inline mr-1" }), "Aggiunta (inventariale positiva)"] }), _jsxs(SelectItem, { value: "NEGATIVE", children: [_jsx(Minus, { className: "h-3 w-3 inline mr-1" }), "Sottrazione (inventariale negativa)"] })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Ambito *" }), _jsxs(Select, { value: adjustForm.warehouse_scope, onValueChange: (v) => setAdjustForm(f => ({ ...f, warehouse_scope: v })), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "WASTE", children: "Rifiuti (WASTE)" }), _jsx(SelectItem, { value: "MPS", children: "MPS / Materiali recuperati" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0 (kg) *" }), _jsx(Input, { type: "number", step: "0.01", value: adjustForm.quantity, onChange: e => setAdjustForm(f => ({ ...f, quantity: e.target.value })), placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Motivo (obbligatorio) *" }), _jsx(Input, { value: adjustForm.reason, onChange: e => setAdjustForm(f => ({ ...f, reason: e.target.value })), placeholder: "Es: Inventario fisico Q1 2026" })] }), _jsx(Button, { onClick: handleAdjust, disabled: submitting || !adjustForm.item_id || !adjustForm.quantity || !adjustForm.reason, className: "w-full", children: submitting ? "Registrazione..." : "Registra Rettifica" })] })] }) })] }));
}
function AdjustmentsTab({ companyId }) {
    const { data: adjustments = [], isLoading } = useAdjustments(companyId);
    return (_jsx("div", { className: "bg-card/60 border border-border/30 rounded-xl overflow-hidden", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-border/20", children: [_jsx(TableHead, { children: "Data" }), _jsx(TableHead, { children: "Articolo" }), _jsx(TableHead, { children: "Tipo" }), _jsx(TableHead, { className: "text-right", children: "Quantit\u00E0" }), _jsx(TableHead, { children: "Motivo" })] }) }), _jsx(TableBody, { children: isLoading ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Caricamento..." }) })) : adjustments.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-12 text-muted-foreground", children: "Nessuna rettifica" }) })) : (adjustments.map((a) => (_jsxs(TableRow, { className: "border-border/10", children: [_jsx(TableCell, { className: "text-sm", children: new Date(a.created_at).toLocaleDateString("it-IT") }), _jsxs(TableCell, { className: "font-mono text-sm", children: [a.item?.codice_cer, " \u2014 ", a.item?.descrizione] }), _jsx(TableCell, { children: _jsx(Badge, { variant: "outline", className: a.adjustment_type === "POSITIVE" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300", children: a.adjustment_type === "POSITIVE" ? "+Aggiunta" : "−Sottrazione" }) }), _jsxs(TableCell, { className: "text-right font-mono", children: [Number(a.quantity).toLocaleString("it-IT"), " kg"] }), _jsx(TableCell, { className: "text-sm text-muted-foreground", children: a.reason })] }, a.id)))) })] }) }));
}
import { useQuery } from "@tanstack/react-query";
function useAdjustments(companyId) {
    return useQuery({
        queryKey: ["dragon-adjustments", companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("dragon_inventory_adjustments")
                .select("*, item:dragon_items(*)")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false })
                .limit(200);
            if (error)
                throw error;
            return data;
        },
    });
}
