import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
function PrivatoFormDialog({ item, tenantId, onClose }) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const [form, setForm] = useState({
        nome: item?.nome || "",
        cognome: item?.cognome || "",
        codice_fiscale: item?.codice_fiscale || "",
        comune_residenza: item?.comune_residenza || "",
        numero_tessera: item?.numero_tessera || "",
        tipo_utenza: item?.tipo_utenza || "domestica",
        note: item?.note || "",
        automezzo: item?.automezzo || "",
        targa_automezzo: item?.targa_automezzo || "",
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const mutation = useMutation({
        mutationFn: async () => {
            const payload = { ...form, tenant_id: tenantId, attivo: true };
            if (isEdit) {
                const { error } = await supabase.from("anagrafica_privati").update(payload).eq("id", item.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from("anagrafica_privati").insert(payload);
                if (error)
                    throw error;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["mn-anagrafica-privati"] });
            toast.success(isEdit ? "Privato aggiornato" : "Privato creato");
            onClose();
        },
        onError: () => toast.error("Errore salvataggio"),
    });
    const Field = ({ label, field, span = 1 }) => (_jsxs("div", { className: span === 2 ? "col-span-2" : "", children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: label }), _jsx("input", { value: form[field] || "", onChange: e => set(field, e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }));
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/30 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground", children: isEdit ? "Modifica Privato" : "Nuovo Privato" }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground", children: "\u2715" })] }), _jsxs("div", { className: "p-4 grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Cognome", field: "cognome" }), _jsx(Field, { label: "Nome", field: "nome" }), _jsx(Field, { label: "Codice Fiscale", field: "codice_fiscale", span: 2 }), _jsx(Field, { label: "Comune Residenza", field: "comune_residenza" }), _jsx(Field, { label: "N\u00B0 Tessera", field: "numero_tessera" }), _jsx(Field, { label: "Automezzo", field: "automezzo" }), _jsx(Field, { label: "Targa Automezzo", field: "targa_automezzo" }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Tipo Utenza" }), _jsxs("select", { value: form.tipo_utenza, onChange: e => set("tipo_utenza", e.target.value), className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground", children: [_jsx("option", { value: "domestica", children: "Domestica" }), _jsx("option", { value: "non_domestica", children: "Non Domestica" }), _jsx("option", { value: "produttore_speciali", children: "Produttore Speciali" })] })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1", children: "Note" }), _jsx("textarea", { value: form.note, onChange: e => set("note", e.target.value), rows: 2, className: "w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t border-border/30", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/20 transition-colors", children: "Annulla" }), _jsx("button", { onClick: () => mutation.mutate(), disabled: !form.cognome || !form.codice_fiscale || mutation.isPending, className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50", children: mutation.isPending ? "Salvataggio..." : isEdit ? "Salva" : "Crea" })] })] }) }));
}
const TENANT_ID = "dc2a6046-d9a8-4549-8e45-82367d695ac6";
export default function MNAnagraficaPrivatiPage() {
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const qc = useQueryClient();
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["mn-anagrafica-privati"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("anagrafica_privati")
                .select("*")
                .eq("tenant_id", TENANT_ID)
                .order("cognome");
            if (error)
                throw error;
            return data;
        },
    });
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("anagrafica_privati").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["mn-anagrafica-privati"] });
            toast.success("Privato eliminato");
        },
        onError: () => toast.error("Errore eliminazione"),
    });
    const filtered = items.filter(i => {
        if (!search)
            return true;
        const s = search.toLowerCase();
        return `${i.cognome} ${i.nome} ${i.codice_fiscale} ${i.comune_residenza || ""}`.toLowerCase().includes(s);
    });
    return (_jsx(MNAdminLayout, { title: "Anagrafica", subtitle: "Privati Cittadini", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Cerca per cognome, nome, CF, comune...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" })] }), _jsxs("span", { className: "text-xs font-mono text-muted-foreground", children: [filtered.length, " / ", items.length] }), _jsxs("button", { onClick: () => { setEditItem(null); setShowForm(true); }, className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo Privato"] })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl overflow-hidden", children: isLoading ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Caricamento..." })) : filtered.length === 0 ? (_jsx("div", { className: "p-8 text-center text-muted-foreground", children: "Nessun privato trovato" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-left", children: [_jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Cognome" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Nome" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Codice Fiscale" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Comune" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Tessera" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Automezzo" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Targa" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Azioni" })] }) }), _jsx("tbody", { children: filtered.map(item => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-muted/10 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-medium text-foreground", children: item.cognome }), _jsx("td", { className: "px-4 py-3 text-foreground", children: item.nome }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.codice_fiscale }), _jsx("td", { className: "px-4 py-3 text-muted-foreground", children: item.comune_residenza || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.numero_tessera || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground", children: item.automezzo || "—" }), _jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: item.targa_automezzo || "—" }), _jsx("td", { className: "px-4 py-3 text-xs text-muted-foreground capitalize", children: item.tipo_utenza?.replace("_", " ") }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => { setEditItem(item); setShowForm(true); }, className: "p-1.5 rounded-lg hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors", children: _jsx(Edit2, { className: "h-3.5 w-3.5" }) }), _jsx("button", { onClick: () => { if (confirm("Eliminare?"))
                                                                deleteMutation.mutate(item.id); }, className: "p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, item.id))) })] }) })) }), showForm && (_jsx(PrivatoFormDialog, { item: editItem || undefined, tenantId: TENANT_ID, onClose: () => { setShowForm(false); setEditItem(null); } }))] }) }));
}
