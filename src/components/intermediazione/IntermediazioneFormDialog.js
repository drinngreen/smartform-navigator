import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntermediari } from "@/hooks/useIntermediari";
import { useCreateIntermediazione, useUpdateIntermediazione } from "@/hooks/useIntermediazioni";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
export function IntermediazioneFormDialog({ open, onOpenChange, intermediazione, onSave }) {
    const { data: intermediari = [] } = useIntermediari();
    const { data: organizations = [] } = useQuery({
        queryKey: ["organizations-list"],
        queryFn: async () => {
            const { data } = await supabase.from("organizations").select("id, name").order("name");
            return data || [];
        },
    });
    const createMut = useCreateIntermediazione();
    const updateMut = useUpdateIntermediazione();
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            setForm(intermediazione ? { ...intermediazione } : {
                stato: "bozza",
                tipo_provvigione: "euro_ton",
                valore_provvigione: 0,
                fatturata: false,
            });
        }
    }, [open, intermediazione]);
    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (intermediazione) {
                await updateMut.mutateAsync({ id: intermediazione.id, ...form });
            }
            else {
                await createMut.mutateAsync(form);
            }
            await onSave();
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: intermediazione ? "Modifica Intermediazione" : "Nuova Intermediazione" }) }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Intermediario *" }), _jsxs(Select, { value: form.intermediario_id || "", onValueChange: v => set("intermediario_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona intermediario" }) }), _jsx(SelectContent, { children: intermediari.map(i => (_jsx(SelectItem, { value: i.id, children: i.ragione_sociale }, i.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Produttore" }), _jsxs(Select, { value: form.produttore_id || "", onValueChange: v => set("produttore_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona" }) }), _jsx(SelectContent, { children: organizations.map(o => (_jsx(SelectItem, { value: o.id, children: o.name }, o.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Destinatario" }), _jsxs(Select, { value: form.destinatario_id || "", onValueChange: v => set("destinatario_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona" }) }), _jsx(SelectContent, { children: organizations.map(o => (_jsx(SelectItem, { value: o.id, children: o.name }, o.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Trasportatore" }), _jsxs(Select, { value: form.trasportatore_id || "", onValueChange: v => set("trasportatore_id", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Seleziona" }) }), _jsx(SelectContent, { children: organizations.map(o => (_jsx(SelectItem, { value: o.id, children: o.name }, o.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato" }), _jsxs(Select, { value: form.stato || "bozza", onValueChange: v => set("stato", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "bozza", children: "Bozza" }), _jsx(SelectItem, { value: "attiva", children: "Attiva" }), _jsx(SelectItem, { value: "completata", children: "Completata" }), _jsx(SelectItem, { value: "fatturata", children: "Fatturata" }), _jsx(SelectItem, { value: "annullata", children: "Annullata" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "CER" }), _jsx(Input, { value: form.cer || "", onChange: e => set("cer", e.target.value), placeholder: "es. 170904" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Descrizione Rifiuto" }), _jsx(Input, { value: form.descrizione_rifiuto || "", onChange: e => set("descrizione_rifiuto", e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Qty Stimata (kg)" }), _jsx(Input, { type: "number", value: form.quantita_stimata_kg ?? "", onChange: e => set("quantita_stimata_kg", e.target.value ? Number(e.target.value) : null) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Qty Effettiva (kg)" }), _jsx(Input, { type: "number", value: form.quantita_effettiva_kg ?? "", onChange: e => set("quantita_effettiva_kg", e.target.value ? Number(e.target.value) : null) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Tipo Provvigione" }), _jsxs(Select, { value: form.tipo_provvigione || "euro_ton", onValueChange: v => set("tipo_provvigione", v), children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "percentuale", children: "Percentuale %" }), _jsx(SelectItem, { value: "euro_ton", children: "\u20AC/ton" }), _jsx(SelectItem, { value: "forfait", children: "Forfait \u20AC" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Valore Provvigione" }), _jsx(Input, { type: "number", step: "0.01", value: form.valore_provvigione ?? 0, onChange: e => set("valore_provvigione", Number(e.target.value)) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Rif. Contratto" }), _jsx(Input, { value: form.contratto_ref || "", onChange: e => set("contratto_ref", e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Condizioni Economiche" }), _jsx(Input, { value: form.condizioni_economiche || "", onChange: e => set("condizioni_economiche", e.target.value) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: form.note || "", onChange: e => set("note", e.target.value), rows: 2 })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => onOpenChange(false), children: "Annulla" }), _jsx(Button, { type: "submit", disabled: saving, children: saving ? "Salvataggio..." : "Salva" })] })] })] }) }));
}
