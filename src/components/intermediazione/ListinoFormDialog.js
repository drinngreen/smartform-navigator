import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
export function ListinoFormDialog({ open, onOpenChange, listino, intermediari, onSaved }) {
    const { data: organizations = [] } = useQuery({
        queryKey: ["organizations-list"],
        queryFn: async () => {
            const { data } = await supabase.from("organizations").select("id, name").order("name");
            return data || [];
        },
    });
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            setForm(listino ? { ...listino } : { tipo_provvigione: "euro_ton", valore_provvigione: 0, attivo: true });
        }
    }, [open, listino]);
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                intermediario_id: form.intermediario_id,
                produttore_id: form.produttore_id || null,
                cer: form.cer || null,
                tipo_provvigione: form.tipo_provvigione,
                valore_provvigione: form.valore_provvigione,
                fee_minimo: form.fee_minimo || null,
                descrizione: form.descrizione || null,
                valido_dal: form.valido_dal || null,
                valido_al: form.valido_al || null,
                attivo: form.attivo,
            };
            if (listino) {
                const { error } = await supabase.from("listini_intermediazione").update(payload).eq("id", listino.id);
                if (error)
                    throw error;
                toast.success("Listino aggiornato");
            }
            else {
                const { error } = await supabase.from("listini_intermediazione").insert(payload);
                if (error)
                    throw error;
                toast.success("Listino creato");
            }
            onSaved();
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-lg bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: listino ? "Modifica Listino" : "Nuovo Listino" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Intermediario *" }), _jsxs(Select, { value: form.intermediario_id || "", onValueChange: v => set("intermediario_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona" }) }), _jsx(SelectContent, { children: intermediari.map(i => _jsx(SelectItem, { value: i.id, children: i.ragione_sociale }, i.id)) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Produttore (opzionale)" }), _jsxs(Select, { value: form.produttore_id || "", onValueChange: v => set("produttore_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Tutti" }) }), _jsx(SelectContent, { children: organizations.map(o => _jsx(SelectItem, { value: o.id, children: o.name }, o.id)) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "CER" }), _jsx(Input, { value: form.cer || "", onChange: e => set("cer", e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Fee" }), _jsxs(Select, { value: form.tipo_provvigione || "euro_ton", onValueChange: v => set("tipo_provvigione", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "percentuale", children: "%" }), _jsx(SelectItem, { value: "euro_ton", children: "\u20AC/ton" }), _jsx(SelectItem, { value: "forfait", children: "Forfait" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Valore" }), _jsx(Input, { type: "number", step: "0.01", value: form.valore_provvigione ?? 0, onChange: e => set("valore_provvigione", Number(e.target.value)) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Fee Minimo \u20AC" }), _jsx(Input, { type: "number", step: "0.01", value: form.fee_minimo ?? "", onChange: e => set("fee_minimo", e.target.value ? Number(e.target.value) : null) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Valido dal" }), _jsx(Input, { type: "date", value: form.valido_dal || "", onChange: e => set("valido_dal", e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Valido al" }), _jsx(Input, { type: "date", value: form.valido_al || "", onChange: e => set("valido_al", e.target.value) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione" }), _jsx(Textarea, { value: form.descrizione || "", onChange: e => set("descrizione", e.target.value), rows: 2 })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.attivo ?? true, onChange: e => set("attivo", e.target.checked), className: "rounded" }), _jsx("span", { className: "text-sm", children: "Attivo" })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Annulla" }), _jsx(Button, { type: "submit", disabled: saving, children: saving ? "Salvataggio..." : "Salva" })] })] })] }) }));
}
