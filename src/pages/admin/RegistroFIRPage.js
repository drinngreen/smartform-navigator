import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Send, Eye, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const isDraft = (s) => s === "draft" || s === "bozza";
const isSubmitted = (s) => s === "submitted" || s === "inviato";
const isCompleted = (s) => s === "completed" || s === "completato";
export default function RegistroFIRPage() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [editDialog, setEditDialog] = useState({ open: false, form: null });
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);
    const fetchForms = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "list_fir_forms" },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            setForms(data.forms || []);
        }
        catch (e) {
            toast.error("Errore caricamento: " + e.message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchForms(); }, [fetchForms]);
    useEffect(() => {
        const channel = supabase
            .channel("registro-fir-forms")
            .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { fetchForms(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchForms]);
    const openEdit = (form) => {
        setEditData({
            codice_eer: form.codice_eer || "",
            descrizione_rifiuto: form.descrizione_rifiuto || "",
            quantita: form.quantita ?? "",
            unita_misura: form.unita_misura || "",
            stato_fisico: form.stato_fisico || "",
            produttore_denominazione: form.produttore_denominazione || "",
            trasportatore_denominazione: form.trasportatore_denominazione || "",
            destinatario_denominazione: form.destinatario_denominazione || "",
            note: form.note || "",
        });
        setEditDialog({ open: true, form });
    };
    const handleSave = async () => {
        if (!editDialog.form)
            return;
        setSaving(true);
        try {
            const updates = {};
            for (const [k, v] of Object.entries(editData)) {
                updates[k] = k === "quantita" ? (v ? parseFloat(v) : null) : (v || null);
            }
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "update_fir_form", form_id: editDialog.form.id, updates },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Formulario aggiornato");
            setEditDialog({ open: false, form: null });
            fetchForms();
        }
        catch (e) {
            toast.error("Errore: " + e.message);
        }
        finally {
            setSaving(false);
        }
    };
    const filtered = forms.filter((f) => {
        const q = search.toLowerCase();
        const match = f.numero_fir?.toLowerCase().includes(q) ||
            f.codice_eer?.toLowerCase().includes(q) ||
            f.produttore_denominazione?.toLowerCase().includes(q) ||
            f.trasportatore_denominazione?.toLowerCase().includes(q) ||
            f.destinatario_denominazione?.toLowerCase().includes(q) ||
            f.user_profile?.nome?.toLowerCase().includes(q) ||
            f.user_profile?.cognome?.toLowerCase().includes(q) ||
            f.descrizione_rifiuto?.toLowerCase().includes(q);
        if (tab === "draft")
            return match && isDraft(f.status);
        if (tab === "submitted")
            return match && isSubmitted(f.status);
        if (tab === "completed")
            return match && isCompleted(f.status);
        return match;
    });
    const stats = {
        total: forms.length,
        draft: forms.filter((f) => isDraft(f.status)).length,
        submitted: forms.filter((f) => isSubmitted(f.status)).length,
        completed: forms.filter((f) => isCompleted(f.status)).length,
    };
    const statusBadge = (status) => {
        if (isDraft(status))
            return _jsxs(Badge, { variant: "secondary", className: "gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), " Bozza"] });
        if (isSubmitted(status))
            return _jsxs(Badge, { className: "gap-1 border border-border", children: [_jsx(Send, { className: "h-3 w-3" }), " Inviato"] });
        if (isCompleted(status))
            return _jsxs(Badge, { className: "gap-1 border border-border", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Completato"] });
        return _jsx(Badge, { variant: "outline", children: status });
    };
    return (_jsxs(AdminLayout, { title: "Registro Carico / Scarico", subtitle: "Elenco completo dei Formulari di Identificazione Rifiuti", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [
                    { label: "Totale FIR", value: stats.total, icon: FileText, color: "text-primary" },
                    { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
                    { label: "Inviati", value: stats.submitted, icon: Send, color: "text-cyan-400" },
                    { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
                ].map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground font-mono uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-display text-foreground", children: s.value })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per N\u00B0 FIR, CER, produttore, trasportatore, autista...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: fetchForms, disabled: loading, children: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })] }), _jsx(Tabs, { value: tab, onValueChange: setTab, className: "mb-4", children: _jsxs(TabsList, { className: "bg-card/60 border border-border/30", children: [_jsxs(TabsTrigger, { value: "all", children: ["Tutti (", stats.total, ")"] }), _jsxs(TabsTrigger, { value: "draft", children: ["Bozze (", stats.draft, ")"] }), _jsxs(TabsTrigger, { value: "submitted", children: ["Inviati (", stats.submitted, ")"] }), _jsxs(TabsTrigger, { value: "completed", children: ["Completati (", stats.completed, ")"] })] }) }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) })) : (_jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Autista" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "CER" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Rifiuto" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Produttore" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Trasportatore" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Destinatario" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Quantit\u00E0" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Data" }), _jsx("th", { className: "text-right p-3 font-mono text-xs text-muted-foreground uppercase min-w-[200px]", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((form) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-secondary/30 transition-colors", children: [_jsx("td", { className: "p-3", children: statusBadge(form.status) }), _jsx("td", { className: "p-3 font-mono text-xs text-foreground", children: form.numero_fir || "—" }), _jsx("td", { className: "p-3 text-foreground", children: form.user_profile ? `${form.user_profile.nome} ${form.user_profile.cognome}` : "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.codice_eer || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs max-w-[180px] truncate", children: form.descrizione_rifiuto || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: form.produttore_denominazione || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: form.trasportatore_denominazione || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: form.destinatario_denominazione || "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs whitespace-nowrap", children: new Date(form.updated_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) }), _jsx("td", { className: "p-3 min-w-[200px]", children: _jsxs("div", { className: "flex items-center justify-end gap-2 whitespace-nowrap", children: [_jsxs("button", { className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium border border-cyan-400 hover:bg-cyan-500 transition-colors", title: "Visualizza / Modifica", onClick: () => openEdit(form), children: [isDraft(form.status) ? _jsx(Edit, { className: "h-3.5 w-3.5" }) : _jsx(Eye, { className: "h-3.5 w-3.5" }), isDraft(form.status) ? "Modifica" : "Dettagli"] }), _jsxs("button", { className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium border border-red-400 hover:bg-red-500 transition-colors", title: "Elimina", onClick: async () => {
                                                                if (!confirm("Eliminare questo formulario?"))
                                                                    return;
                                                                try {
                                                                    const { error } = await supabase.functions.invoke("admin-user-manage", {
                                                                        body: { action: "delete_fir_form", form_id: form.id },
                                                                    });
                                                                    if (error)
                                                                        throw error;
                                                                    toast.success("Formulario eliminato");
                                                                    fetchForms();
                                                                }
                                                                catch (e) {
                                                                    toast.error("Errore: " + e.message);
                                                                }
                                                            }, children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "Elimina"] })] }) })] }, form.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "p-8 text-center text-muted-foreground", children: "Nessun formulario trovato" }) }))] })] }) }) })), _jsx(Dialog, { open: editDialog.open, onOpenChange: (o) => setEditDialog({ open: o, form: o ? editDialog.form : null }), children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Modifica Bozza \u2014 ", editDialog.form?.numero_fir || "Senza Numero"] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Codice EER" }), _jsx(Input, { value: editData.codice_eer || "", onChange: (e) => setEditData((p) => ({ ...p, codice_eer: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Quantit\u00E0" }), _jsx(Input, { type: "number", value: editData.quantita || "", onChange: (e) => setEditData((p) => ({ ...p, quantita: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Unit\u00E0 Misura" }), _jsx(Input, { value: editData.unita_misura || "", onChange: (e) => setEditData((p) => ({ ...p, unita_misura: e.target.value })), placeholder: "kg" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Stato Fisico" }), _jsx(Input, { value: editData.stato_fisico || "", onChange: (e) => setEditData((p) => ({ ...p, stato_fisico: e.target.value })), placeholder: "S / L / F" })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Descrizione Rifiuto" }), _jsx(Textarea, { value: editData.descrizione_rifiuto || "", onChange: (e) => setEditData((p) => ({ ...p, descrizione_rifiuto: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Produttore" }), _jsx(Input, { value: editData.produttore_denominazione || "", onChange: (e) => setEditData((p) => ({ ...p, produttore_denominazione: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Trasportatore" }), _jsx(Input, { value: editData.trasportatore_denominazione || "", onChange: (e) => setEditData((p) => ({ ...p, trasportatore_denominazione: e.target.value })) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Destinatario" }), _jsx(Input, { value: editData.destinatario_denominazione || "", onChange: (e) => setEditData((p) => ({ ...p, destinatario_denominazione: e.target.value })) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx(Label, { children: "Note" }), _jsx(Textarea, { value: editData.note || "", onChange: (e) => setEditData((p) => ({ ...p, note: e.target.value })) })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setEditDialog({ open: false, form: null }), children: "Annulla" }), _jsxs(Button, { onClick: handleSave, disabled: saving, children: [saving ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Salva Modifiche"] })] })] }) })] }));
}
