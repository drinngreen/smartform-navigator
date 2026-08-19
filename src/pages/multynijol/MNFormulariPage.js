import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, Navigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { toast } from "sonner";
import { FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Eye, Trash2, Layers, Copy, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { MassiveFirGeneratorDialog } from "@/components/multynijol/dev/MassiveFirGeneratorDialog";
const validContexts = ["multyproget", "dev-multyproget", "niyol"];
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
export default function MNFormulariPage() {
    const { context } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    const requestedFirId = searchParams.get("fir");
    useEffect(() => {
        if (isValid)
            setActiveContext(mnCtx);
    }, [context, isValid]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [viewDialog, setViewDialog] = useState({ open: false, form: null });
    const [editorMode, setEditorMode] = useState("standard");
    const [massiveOpen, setMassiveOpen] = useState(false);
    const editorStorageKey = `mn-fir-editor:${context || "unknown"}`;
    const openEditor = (form, mode) => {
        setEditorMode(mode);
        setViewDialog({ open: true, form });
        sessionStorage.setItem(editorStorageKey, JSON.stringify({ formId: form.id, mode }));
    };
    const closeEditor = () => {
        if (viewDialog.form?.id)
            sessionStorage.removeItem(`fir-alternative-working-draft:${viewDialog.form.id}`);
        sessionStorage.removeItem(editorStorageKey);
        setViewDialog({ open: false, form: null });
        if (searchParams.get("fir"))
            setSearchParams({}, { replace: true });
    };
    const changeEditorMode = (mode) => {
        setEditorMode(mode);
        if (viewDialog.form?.id) {
            sessionStorage.setItem(editorStorageKey, JSON.stringify({ formId: viewDialog.form.id, mode }));
        }
    };
    const fetchForms = useCallback(async () => {
        if (!mnCtx)
            return;
        setLoading(true);
        try {
            const loadForms = async (tenantId) => {
                const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                    body: { action: "list_fir_forms", tenant_id: tenantId },
                });
                if (error)
                    throw error;
                if (data?.error)
                    throw new Error(data.error);
                return data.forms || [];
            };
            const scopedForms = await loadForms(mnCtx.tenantId);
            if (scopedForms.length > 0) {
                setForms(scopedForms);
                const requested = requestedFirId ? scopedForms.find((f) => f.id === requestedFirId) : null;
                let persisted = null;
                try {
                    persisted = JSON.parse(sessionStorage.getItem(editorStorageKey) || "null");
                }
                catch {
                    sessionStorage.removeItem(editorStorageKey);
                }
                const restored = persisted?.formId ? scopedForms.find((f) => f.id === persisted?.formId) : null;
                if (requested)
                    openEditor(requested, "standard");
                else if (restored)
                    openEditor(restored, persisted?.mode || "standard");
                return;
            }
            const shouldFallbackToGlobal = context === "multyproget" || context === "dev-multyproget";
            if (shouldFallbackToGlobal && mnCtx.tenantId !== GLOBAL_FIR_TENANT_ID) {
                const fallbackForms = await loadForms(GLOBAL_FIR_TENANT_ID);
                setForms(fallbackForms);
                return;
            }
            setForms(scopedForms);
        }
        catch (e) {
            toast.error("Errore caricamento formulari: " + e.message);
        }
        finally {
            setLoading(false);
        }
    }, [context, mnCtx?.tenantId, requestedFirId]);
    const handleDeleteForm = async (form) => {
        if (!window.confirm(`Eliminare dalla vista il FIR ${form.numero_fir || "senza numero"}? I dati restano recuperabili nel database.`))
            return;
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "delete_fir_form", form_id: form.id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            sessionStorage.removeItem(editorStorageKey);
            setViewDialog({ open: false, form: null });
            toast.success("Formulario eliminato dalla vista");
            await fetchForms();
        }
        catch (e) {
            toast.error("Errore eliminazione FIR: " + e.message);
        }
    };
    const handleDuplicateForm = async (form) => {
        const nuovoNumero = window.prompt(`Duplica FIR ${form.numero_fir || ""}\nInserisci il NUOVO numero formulario:`, "");
        if (!nuovoNumero || !nuovoNumero.trim())
            return;
        const categoria = window.prompt("Categoria di vidimazione (conto_proprio / miol / multy):", "multy");
        if (!categoria)
            return;
        try {
            const { data: newId, error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                p_user_id: form.user_id,
                p_tenant_id: mnCtx.tenantId,
                p_numero_fir: nuovoNumero.trim(),
            });
            if (error)
                throw error;
            const clonedFormData = { ...form.form_data, numero_fir: nuovoNumero.trim(), numero_formulario: nuovoNumero.trim(), categoria_vidimazione: categoria };
            await supabase.functions.invoke("admin-user-manage", {
                body: {
                    action: "update_fir_form",
                    form_id: newId,
                    updates: {
                        form_data: clonedFormData,
                        codice_eer: form.codice_eer,
                        descrizione_rifiuto: form.descrizione_rifiuto,
                        quantita: form.quantita,
                        unita_misura: form.unita_misura,
                        stato_fisico: form.stato_fisico,
                        produttore_denominazione: form.produttore_denominazione,
                        trasportatore_denominazione: form.trasportatore_denominazione,
                        destinatario_denominazione: form.destinatario_denominazione,
                    },
                },
            });
            toast.success(`FIR duplicato come ${nuovoNumero.trim()} (${categoria.toUpperCase()})`);
            await fetchForms();
        }
        catch (e) {
            toast.error("Errore duplicazione FIR: " + e.message);
        }
    };
    useEffect(() => { fetchForms(); }, [fetchForms]);
    useEffect(() => {
        const channel = supabase
            .channel(`mn-fir-forms-${context}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { fetchForms(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchForms, context]);
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const filtered = forms.filter((f) => {
        const q = search.toLowerCase();
        const matchSearch = f.numero_fir?.toLowerCase().includes(q) ||
            f.codice_eer?.toLowerCase().includes(q) ||
            f.produttore_denominazione?.toLowerCase().includes(q) ||
            f.user_profile?.nome?.toLowerCase().includes(q) ||
            f.user_profile?.cognome?.toLowerCase().includes(q) ||
            f.descrizione_rifiuto?.toLowerCase().includes(q);
        if (tab === "draft")
            return matchSearch && (f.status === "draft" || f.status === "bozza");
        if (tab === "submitted")
            return matchSearch && (f.status === "submitted" || f.status === "inviato");
        if (tab === "completed")
            return matchSearch && (f.status === "completed" || f.status === "completato");
        return matchSearch;
    });
    const stats = {
        total: forms.length,
        draft: forms.filter((f) => f.status === "draft" || f.status === "bozza").length,
        submitted: forms.filter((f) => f.status === "submitted" || f.status === "inviato").length,
        completed: forms.filter((f) => f.status === "completed" || f.status === "completato").length,
    };
    const statusBadge = (status) => {
        switch (status) {
            case "draft":
            case "bozza": return _jsxs(Badge, { variant: "secondary", className: "gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), " Bozza"] });
            case "submitted":
            case "inviato": return _jsxs(Badge, { className: "gap-1 border border-border", children: [_jsx(FileText, { className: "h-3 w-3" }), " Inviato"] });
            case "completed":
            case "completato": return _jsxs(Badge, { className: "gap-1 border border-border", children: [_jsx(CheckCircle, { className: "h-3 w-3" }), " Completato"] });
            default: return _jsx(Badge, { variant: "outline", children: status });
        }
    };
    const contextLabel = context === "niyol" ? "Niyol" : "Multyproget";
    return (_jsxs(MNAdminLayout, { title: `Formulari — ${contextLabel}`, subtitle: "Gestione formulari FIR creati dagli autisti", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [
                    { label: "Totale", value: stats.total, icon: FileText, color: "text-primary" },
                    { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
                    { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
                    { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
                ].map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground font-mono uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-display text-foreground", children: s.value })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per numero FIR, CER, produttore, autista...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { variant: "outline", onClick: () => setMassiveOpen(true), className: "gap-2 border-sky-400/50 text-sky-200 hover:bg-sky-500/10", children: [_jsx(Layers, { className: "h-4 w-4" }), " Generazione massiva"] }), _jsx(Button, { variant: "outline", size: "icon", onClick: fetchForms, disabled: loading, children: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })] }), _jsx(Tabs, { value: tab, onValueChange: setTab, className: "mb-4", children: _jsxs(TabsList, { className: "bg-card/60 border border-border/30", children: [_jsxs(TabsTrigger, { value: "all", children: ["Tutti (", stats.total, ")"] }), _jsxs(TabsTrigger, { value: "draft", children: ["Bozze (", stats.draft, ")"] }), _jsxs(TabsTrigger, { value: "submitted", children: ["Inviati (", stats.submitted, ")"] }), _jsxs(TabsTrigger, { value: "completed", children: ["Completati (", stats.completed, ")"] })] }) }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) })) : (_jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Autista" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "CER" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Rifiuto" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Produttore" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Quantit\u00E0" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Data" }), _jsx("th", { className: "text-right p-3 font-mono text-xs text-muted-foreground uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((form) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-secondary/30 transition-colors", children: [_jsx("td", { className: "p-3", children: statusBadge(form.status) }), _jsx("td", { className: "p-3 font-mono text-xs text-foreground", children: form.numero_fir || "—" }), _jsx("td", { className: "p-3 text-foreground", children: form.user_profile ? `${form.user_profile.nome} ${form.user_profile.cognome}` : "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.codice_eer || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs max-w-[200px] truncate", children: form.descrizione_rifiuto || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: form.produttore_denominazione || "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: new Date(form.updated_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx("button", { className: `flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.status === "draft" || form.status === "bozza"
                                                                ? "bg-blue-600 text-white border-blue-400 hover:bg-blue-500"
                                                                : "bg-secondary/50 text-foreground border-border/50 hover:bg-secondary"}`, onClick: () => openEditor(form, "standard"), children: form.status === "draft" || form.status === "bozza" ? (_jsxs(_Fragment, { children: [_jsx(Edit, { className: "h-4 w-4" }), " Standard"] })) : (_jsxs(_Fragment, { children: [_jsx(Eye, { className: "h-4 w-4" }), " Visualizza"] })) }), (form.status === "draft" || form.status === "bozza") && (_jsxs("button", { className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-400/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 transition-colors", onClick: () => openEditor(form, "alternative"), children: [_jsx(Edit, { className: "h-4 w-4" }), " Alternativo"] })), _jsxs("button", { className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-cyan-400/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition-colors", onClick: () => void handleDuplicateForm(form), title: "Duplica con scelta categoria", children: [_jsx(Copy, { className: "h-4 w-4" }), " Duplica"] }), _jsxs("button", { className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors", onClick: () => void handleDeleteForm(form), children: [_jsx(Trash2, { className: "h-4 w-4" }), " Elimina"] })] }) })] }, form.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Nessun formulario trovato" }) }))] })] }) }) })), _jsx(Dialog, { open: viewDialog.open, onOpenChange: (o) => { if (!o)
                    closeEditor(); }, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(FileText, { className: "h-5 w-5 text-primary" }), viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza", " FIR \u2014 ", viewDialog.form?.numero_fir || "Senza Numero", viewDialog.form?.user_profile && (_jsxs("span", { className: "text-sm text-muted-foreground font-normal ml-2", children: ["(", viewDialog.form.user_profile.nome, " ", viewDialog.form.user_profile.cognome, ")"] }))] }) }), viewDialog.form && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [_jsxs("button", { type: "button", onClick: () => changeEditorMode("standard"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "standard" ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Standard" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Formulario completo classico" })] }), _jsxs("button", { type: "button", onClick: () => changeEditorMode("alternative"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "alternative" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Alternativo" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Editor alternativo FIR" })] })] }), editorMode === "alternative" ? (_jsx(FIRAlternativeForm, { firFormId: viewDialog.form.id, presetNumeroFir: viewDialog.form.numero_fir || undefined, assignedUserId: viewDialog.form.user_id || undefined, draftData: viewDialog.form, onSaved: fetchForms }, `alt-${viewDialog.form.id}`)) : (_jsx(MNFIRFormComplete, { tenantId: mnCtx.tenantId, mnContext: mnCtx.id, firFormId: viewDialog.form.id, draftData: viewDialog.form }, `std-${viewDialog.form.id}`))] })), _jsx("div", { className: "sticky bottom-0 mt-4 flex justify-end border-t border-border/30 bg-card/95 pt-3", children: _jsxs(Button, { variant: "destructive", className: "gap-2", onClick: () => viewDialog.form && void handleDeleteForm(viewDialog.form), children: [_jsx(Trash2, { className: "h-4 w-4" }), " Elimina formulario"] }) })] }) }), _jsx(MassiveFirGeneratorDialog, { open: massiveOpen, onClose: () => setMassiveOpen(false), tenantId: mnCtx.tenantId, contextLabel: contextLabel, onCreated: fetchForms })] }));
}
