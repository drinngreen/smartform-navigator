import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { toast } from "sonner";
import { FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Eye, } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
const validContexts = ["multyproget", "dev-multyproget", "niyol"];
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
export default function MNFormulariPage() {
    const { context } = useParams();
    const setActiveContext = useMNContextStore((s) => s.setActiveContext);
    const isValid = !!context && validContexts.includes(context);
    const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
    useEffect(() => {
        if (isValid)
            setActiveContext(mnCtx);
    }, [context, isValid]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [viewDialog, setViewDialog] = useState({ open: false, form: null });
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
                return;
            }
            const shouldFallbackToGlobal = context === "multyproget" || context === "dev-multyproget";
            if (shouldFallbackToGlobal && mnCtx.tenantId !== GLOBAL_FIR_TENANT_ID) {
                setForms(await loadForms(GLOBAL_FIR_TENANT_ID));
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
    }, [context, mnCtx?.tenantId]);
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
                ].map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground font-mono uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-display text-foreground", children: s.value })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per numero FIR, CER, produttore, autista...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: fetchForms, disabled: loading, children: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })] }), _jsx(Tabs, { value: tab, onValueChange: setTab, className: "mb-4", children: _jsxs(TabsList, { className: "bg-card/60 border border-border/30", children: [_jsxs(TabsTrigger, { value: "all", children: ["Tutti (", stats.total, ")"] }), _jsxs(TabsTrigger, { value: "draft", children: ["Bozze (", stats.draft, ")"] }), _jsxs(TabsTrigger, { value: "submitted", children: ["Inviati (", stats.submitted, ")"] }), _jsxs(TabsTrigger, { value: "completed", children: ["Completati (", stats.completed, ")"] })] }) }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) })) : (_jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Autista" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "CER" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Rifiuto" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Produttore" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Quantit\u00E0" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Data" }), _jsx("th", { className: "text-right p-3 font-mono text-xs text-muted-foreground uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((form) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-secondary/30 transition-colors", children: [_jsx("td", { className: "p-3", children: statusBadge(form.status) }), _jsx("td", { className: "p-3 font-mono text-xs text-foreground", children: form.numero_fir || "—" }), _jsx("td", { className: "p-3 text-foreground", children: form.user_profile ? `${form.user_profile.nome} ${form.user_profile.cognome}` : "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.codice_eer || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs max-w-[200px] truncate", children: form.descrizione_rifiuto || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: form.produttore_denominazione || "—" }), _jsx("td", { className: "p-3 font-mono text-xs text-muted-foreground", children: form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: new Date(form.updated_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) }), _jsx("td", { className: "p-3", children: _jsx("div", { className: "flex items-center justify-end gap-1", children: _jsx("button", { className: `flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.status === "draft" || form.status === "bozza"
                                                            ? "bg-blue-600 text-white border-blue-400 hover:bg-blue-500"
                                                            : "bg-secondary/50 text-foreground border-border/50 hover:bg-secondary"}`, onClick: () => setViewDialog({ open: true, form }), children: form.status === "draft" || form.status === "bozza" ? (_jsxs(_Fragment, { children: [_jsx(Edit, { className: "h-4 w-4" }), " Modifica"] })) : (_jsxs(_Fragment, { children: [_jsx(Eye, { className: "h-4 w-4" }), " Visualizza"] })) }) }) })] }, form.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-muted-foreground", children: "Nessun formulario trovato" }) }))] })] }) }) })), _jsx(Dialog, { open: viewDialog.open, onOpenChange: (o) => setViewDialog({ open: o, form: o ? viewDialog.form : null }), children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(FileText, { className: "h-5 w-5 text-primary" }), viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza", " FIR \u2014 ", viewDialog.form?.numero_fir || "Senza Numero", viewDialog.form?.user_profile && (_jsxs("span", { className: "text-sm text-muted-foreground font-normal ml-2", children: ["(", viewDialog.form.user_profile.nome, " ", viewDialog.form.user_profile.cognome, ")"] }))] }) }), viewDialog.form && (_jsx(FIRAlternativeForm, { firFormId: viewDialog.form.id, presetNumeroFir: viewDialog.form.numero_fir || undefined, assignedUserId: viewDialog.form.user_id || undefined, draftData: viewDialog.form }, viewDialog.form.id))] }) })] }));
}
