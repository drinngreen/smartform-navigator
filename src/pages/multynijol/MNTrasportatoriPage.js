import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Users, Search, RefreshCw, Loader2, UserPlus, Trash2, Pencil, FilePlus, UserCog, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateTransporterDialog } from "@/components/admin/CreateTransporterDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
const CONTEXT_MAP = {
    multyproget: {
        label: "Multyproget",
        tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
        mnContext: "multyproget",
        orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
    },
    "dev-multyproget": {
        label: "Multyproget",
        tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
        mnContext: "multyproget",
        orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
    },
    niyol: {
        label: "Niyol",
        tenantId: "819c783e-78dd-4080-8265-802e75b0d813",
        mnContext: "niyol",
        orgId: "b3eae77a-e973-425d-b7fb-283007583e72",
    },
};
const APP_TENANT_OPTIONS = [CONTEXT_MAP.multyproget, CONTEXT_MAP.niyol];
function normalizeFirNumber(value) {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
    if (/^[A-Z]{5} [0-9]{6} [A-Z]{2}$/.test(normalized))
        return normalized;
    const compact = normalized.replace(/[^A-Z0-9]/g, "");
    const match = compact.match(/([A-Z]{5})([0-9]{6})([A-Z]{2})/);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : normalized;
}
export default function MNTrasportatoriPage({ embedded, context: contextProp } = {}) {
    const params = useParams();
    const navigate = useNavigate();
    const contextKey = contextProp || params.context || "multyproget";
    const tenant = CONTEXT_MAP[contextKey] || CONTEXT_MAP.multyproget;
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [createDialog, setCreateDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
    const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
    const [accessDialog, setAccessDialog] = useState({ open: false, user: null });
    const [manualFirDialog, setManualFirDialog] = useState({ open: false, user: null });
    const [manualFirNumber, setManualFirNumber] = useState("");
    const [manualFirContext, setManualFirContext] = useState(tenant.mnContext || "multyproget");
    const [accessForm, setAccessForm] = useState({
        nome: "",
        cognome: "",
        codiceFiscale: "",
        password: "",
        targaAutomezzo: "",
        mnContext: tenant.mnContext || "multyproget",
    });
    const [newPassword, setNewPassword] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [historyDialog, setHistoryDialog] = useState({ open: false, user: null });
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyForms, setHistoryForms] = useState([]);
    const openHistoryDialog = async (user) => {
        setHistoryDialog({ open: true, user });
        setHistoryLoading(true);
        setHistoryForms([]);
        try {
            const { data, error } = await supabase
                .from("fir_forms")
                .select("id, numero_fir, status, tenant_id, updated_at, created_at")
                .eq("user_id", user.id)
                .eq("deleted_by_user", false)
                .order("updated_at", { ascending: false });
            if (error)
                throw error;
            setHistoryForms(data || []);
        }
        catch (e) {
            toast.error("Errore caricamento storico: " + (e.message || ""));
        }
        finally {
            setHistoryLoading(false);
        }
    };
    const isDevHub = contextKey === "dev-multyproget";
    const assignTenant = APP_TENANT_OPTIONS.find((option) => option.mnContext === manualFirContext) || tenant;
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "list_users" },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            // Mostra solo trasportatori attivi del contesto corrente (esclude soft-deleted)
            const filtered = (data.users || []).filter((u) => u.role === "user" &&
                (isDevHub ? ["multyproget", "niyol"].includes(u.profile?.mn_context || "") : u.profile?.mn_context === tenant.mnContext) &&
                !u.profile?.deactivated_at);
            setUsers(filtered);
        }
        catch (e) {
            toast.error("Errore caricamento: " + e.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchUsers(); }, [contextKey]);
    const handleCreateFir = async () => {
        if (!manualFirDialog.user)
            return;
        const normalized = normalizeFirNumber(manualFirNumber);
        if (!normalized) {
            toast.error("Inserisci il numero FIR");
            return;
        }
        setActionLoading(true);
        try {
            const { data: draftId, error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                p_user_id: manualFirDialog.user.id,
                p_tenant_id: assignTenant.tenantId,
                p_numero_fir: normalized,
            });
            if (error)
                throw error;
            if (!draftId)
                throw new Error("Formulario non creato");
            toast.success(`Formulario ${normalized} assegnato su app ${assignTenant.label} a ${manualFirDialog.user.profile?.nome || "trasportatore"}`);
            setManualFirDialog({ open: false, user: null });
            setManualFirNumber("");
            if (!embedded) {
                const targetContext = assignTenant.mnContext || contextKey;
                navigate(`/mn/admin/${targetContext}/formulari?fir=${draftId}`);
            }
        }
        catch (e) {
            toast.error("Errore creazione FIR: " + e.message);
        }
        finally {
            setActionLoading(false);
        }
    };
    const openAccessDialog = (user) => {
        setAccessForm({
            nome: user.profile?.nome || "",
            cognome: user.profile?.cognome || "",
            codiceFiscale: user.profile?.codice_fiscale || "",
            password: "",
            targaAutomezzo: user.profile?.targa_automezzo || "",
            mnContext: user.profile?.mn_context || tenant.mnContext || "multyproget",
        });
        setAccessDialog({ open: true, user });
    };
    const handleUpdateAccess = async () => {
        if (!accessDialog.user)
            return;
        const targetTenant = APP_TENANT_OPTIONS.find((option) => option.mnContext === accessForm.mnContext) || tenant;
        if (accessForm.nome.trim().length < 2 || accessForm.cognome.trim().length < 2 || accessForm.codiceFiscale.trim().length !== 16) {
            toast.error("Nome, cognome e codice fiscale sono obbligatori");
            return;
        }
        if (accessForm.password && accessForm.password.length < 6) {
            toast.error("La nuova password deve avere almeno 6 caratteri");
            return;
        }
        setActionLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: {
                    action: "update_user_access",
                    user_id: accessDialog.user.id,
                    nome: accessForm.nome.trim(),
                    cognome: accessForm.cognome.trim(),
                    codice_fiscale: accessForm.codiceFiscale.toUpperCase().trim(),
                    password: accessForm.password || undefined,
                    tenant_id: targetTenant.tenantId,
                    mn_context: targetTenant.mnContext,
                    org_id: targetTenant.orgId,
                    targa_automezzo: accessForm.targaAutomezzo.trim().toUpperCase() || null,
                },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success(`Accessi aggiornati per app ${targetTenant.label}`);
            setAccessDialog({ open: false, user: null });
            fetchUsers();
        }
        catch (e) {
            toast.error("Errore modifica accessi: " + (e.message || "operazione fallita"));
        }
        finally {
            setActionLoading(false);
        }
    };
    const handleResetPassword = async () => {
        if (!passwordDialog.user || !newPassword)
            return;
        setActionLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "reset_password", user_id: passwordDialog.user.id, new_password: newPassword },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Password aggiornata");
            setPasswordDialog({ open: false, user: null });
            setNewPassword("");
        }
        catch (e) {
            toast.error("Errore: " + e.message);
        }
        finally {
            setActionLoading(false);
        }
    };
    const handleDeleteUser = async () => {
        if (!deleteDialog.user)
            return;
        setActionLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "delete_user", user_id: deleteDialog.user.id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Trasportatore eliminato");
            setDeleteDialog({ open: false, user: null });
            fetchUsers();
        }
        catch (e) {
            toast.error("Errore: " + e.message);
        }
        finally {
            setActionLoading(false);
        }
    };
    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        return (u.profile?.nome?.toLowerCase().includes(q) ||
            u.profile?.cognome?.toLowerCase().includes(q) ||
            u.profile?.codice_fiscale?.toLowerCase().includes(q) ||
            u.profile?.targa_automezzo?.toLowerCase().includes(q));
    });
    const statusColor = {
        online: "bg-green-500",
        offline: "bg-zinc-500",
        busy: "bg-red-500",
        away: "bg-yellow-500",
    };
    const content = (_jsxs(_Fragment, { children: [!embedded && _jsx("div", { className: "mb-4", children: _jsxs("h2", { className: "text-lg font-semibold", children: ["Ragazzi App ", isDevHub ? "Multyproget / Niyol" : tenant.label] }) }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-3 mb-6", children: [
                    { label: "Totale", value: users.length, icon: Users, color: "text-primary" },
                    { label: "Online", value: users.filter((u) => u.online_status === "online").length, icon: Users, color: "text-green-400" },
                ].map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground font-mono uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-display text-foreground", children: s.value })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per nome, CF, targa...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => setCreateDialog(true), className: "gap-2", children: [_jsx(UserPlus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Crea Login App" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: fetchUsers, disabled: loading, children: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) })) : (_jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Nome" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "App" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "CF" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Targa" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Ultimo Login" }), _jsx("th", { className: "text-right p-3 font-mono text-xs text-muted-foreground uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((user) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-secondary/30 transition-colors", children: [_jsx("td", { className: "p-3", children: _jsx("div", { className: `w-2.5 h-2.5 rounded-full ${statusColor[user.online_status] || "bg-zinc-500"}` }) }), _jsx("td", { className: "p-3 font-medium text-foreground", children: user.profile ? `${user.profile.nome} ${user.profile.cognome}` : "—" }), _jsx("td", { className: "p-3", children: _jsx(Badge, { variant: "outline", className: user.profile?.mn_context === "niyol" ? "border-cyan-500/40 text-cyan-400" : "border-emerald-500/40 text-emerald-400", children: user.profile?.mn_context === "niyol" ? "Niyol" : "Multyproget" }) }), _jsx("td", { className: "p-3 text-muted-foreground font-mono text-xs", children: user.profile?.codice_fiscale || "—" }), _jsx("td", { className: "p-3 text-muted-foreground font-mono text-xs", children: user.profile?.targa_automezzo || "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("it-IT") : "Mai" }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", onClick: () => {
                                                                setManualFirDialog({ open: true, user });
                                                                setManualFirNumber("");
                                                                setManualFirContext(user.profile?.mn_context || tenant.mnContext || "multyproget");
                                                            }, children: [_jsx(FilePlus, { className: "h-3.5 w-3.5" }), "Assegna FIR all'app"] }), _jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-xs", onClick: () => openAccessDialog(user), children: [_jsx(UserCog, { className: "h-3.5 w-3.5" }), "Modifica accessi"] }), _jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-xs border-sky-500/30 text-sky-400 hover:bg-sky-500/10", onClick: () => openHistoryDialog(user), children: [_jsx(History, { className: "h-3.5 w-3.5" }), "Storico FIR"] }), _jsxs(Button, { size: "sm", variant: "destructive", className: "gap-1.5 text-xs", onClick: () => setDeleteDialog({ open: true, user }), children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "Elimina"] })] }) })] }, user.id))), filtered.length === 0 && (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "p-8 text-center text-muted-foreground", children: ["Nessun ragazzo app trovato per ", isDevHub ? "Multyproget / Niyol" : tenant.label] }) }))] })] }) }) })), _jsx(CreateTransporterDialog, { open: createDialog, onOpenChange: setCreateDialog, onCreated: fetchUsers, tenant: tenant, tenantOptions: isDevHub ? APP_TENANT_OPTIONS : undefined }), _jsx(Dialog, { open: manualFirDialog.open, onOpenChange: (o) => setManualFirDialog({ open: o, user: o ? manualFirDialog.user : null }), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Assegna FIR all'app autista" }), _jsxs(DialogDescription, { children: ["Scegli Multyproget o Niyol: il FIR comparir\u00E0 solo nell'app scelta per ", _jsxs("strong", { children: [manualFirDialog.user?.profile?.nome, " ", manualFirDialog.user?.profile?.cognome] }), "."] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-mono uppercase text-muted-foreground", children: "App di destinazione" }), _jsx("select", { value: manualFirContext, onChange: (e) => setManualFirContext(e.target.value), className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground", children: APP_TENANT_OPTIONS.map((option) => (_jsx("option", { value: option.mnContext || "", children: option.label }, option.mnContext || option.label))) })] }), _jsx(Input, { value: manualFirNumber, onChange: (e) => setManualFirNumber(e.target.value.toUpperCase()), onKeyDown: (e) => {
                                if (e.key === "Enter")
                                    void handleCreateFir();
                            }, placeholder: "ZRZXR 000566 LG", className: "font-mono mt-3" }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setManualFirDialog({ open: false, user: null }), children: "Annulla" }), _jsxs(Button, { onClick: handleCreateFir, disabled: actionLoading || !manualFirNumber.trim(), className: "gap-2", children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(FilePlus, { className: "h-4 w-4" }), "Assegna questo FIR"] })] })] }) }), _jsx(Dialog, { open: accessDialog.open, onOpenChange: (o) => setAccessDialog({ open: o, user: o ? accessDialog.user : null }), children: _jsxs(DialogContent, { className: "sm:max-w-lg", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(UserCog, { className: "h-5 w-5 text-primary" }), "Modifica accessi app"] }), _jsxs(DialogDescription, { children: ["Cambia dati login, password, targa e app abilitata per ", _jsxs("strong", { children: [accessDialog.user?.profile?.nome, " ", accessDialog.user?.profile?.cognome] }), "."] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-mono uppercase text-muted-foreground", children: "App abilitata" }), _jsx("select", { value: accessForm.mnContext, onChange: (e) => setAccessForm((f) => ({ ...f, mnContext: e.target.value })), className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground", children: APP_TENANT_OPTIONS.map((option) => (_jsx("option", { value: option.mnContext || "", children: option.label }, option.mnContext || option.label))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Input, { placeholder: "Nome", value: accessForm.nome, onChange: (e) => setAccessForm((f) => ({ ...f, nome: e.target.value })) }), _jsx(Input, { placeholder: "Cognome", value: accessForm.cognome, onChange: (e) => setAccessForm((f) => ({ ...f, cognome: e.target.value })) })] }), _jsx(Input, { placeholder: "Codice Fiscale", value: accessForm.codiceFiscale, maxLength: 16, onChange: (e) => setAccessForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase() })), className: "font-mono" }), _jsx(Input, { placeholder: "Nuova password (lascia vuoto per non cambiarla)", type: "password", value: accessForm.password, onChange: (e) => setAccessForm((f) => ({ ...f, password: e.target.value })) }), _jsx(Input, { placeholder: "Targa automezzo", value: accessForm.targaAutomezzo, onChange: (e) => setAccessForm((f) => ({ ...f, targaAutomezzo: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setAccessDialog({ open: false, user: null }), children: "Annulla" }), _jsxs(Button, { onClick: handleUpdateAccess, disabled: actionLoading, className: "gap-2", children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Pencil, { className: "h-4 w-4" }), "Salva accessi"] })] })] }) }), _jsx(Dialog, { open: passwordDialog.open, onOpenChange: (o) => setPasswordDialog({ open: o, user: o ? passwordDialog.user : null }), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Cambia Password" }), _jsxs(DialogDescription, { children: ["Nuova password per ", _jsxs("strong", { children: [passwordDialog.user?.profile?.nome, " ", passwordDialog.user?.profile?.cognome] })] })] }), _jsx(Input, { type: "password", placeholder: "Nuova password (min 6 caratteri)", value: newPassword, onChange: (e) => setNewPassword(e.target.value) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setPasswordDialog({ open: false, user: null }), children: "Annulla" }), _jsxs(Button, { onClick: handleResetPassword, disabled: actionLoading || newPassword.length < 6, children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Conferma"] })] })] }) }), _jsx(AlertDialog, { open: deleteDialog.open, onOpenChange: (o) => setDeleteDialog({ open: o, user: o ? deleteDialog.user : null }), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Eliminare Trasportatore?" }), _jsxs(AlertDialogDescription, { children: ["Stai per eliminare ", _jsxs("strong", { children: [deleteDialog.user?.profile?.nome, " ", deleteDialog.user?.profile?.cognome] }), ". Azione irreversibile."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Annulla" }), _jsxs(AlertDialogAction, { onClick: handleDeleteUser, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Elimina"] })] })] }) }), _jsx(Dialog, { open: historyDialog.open, onOpenChange: (o) => setHistoryDialog({ open: o, user: o ? historyDialog.user : null }), children: _jsxs(DialogContent, { className: "sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(History, { className: "h-5 w-5 text-sky-400" }), "Storico assegnazioni FIR"] }), _jsxs(DialogDescription, { children: ["Tutti i formulari assegnati a ", _jsxs("strong", { children: [historyDialog.user?.profile?.nome, " ", historyDialog.user?.profile?.cognome] }), "."] })] }), historyLoading ? (_jsx("div", { className: "flex items-center justify-center py-10", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }) })) : ((() => {
                            const bozze = historyForms.filter((f) => (f.status || "").toLowerCase() === "bozza");
                            const inviati = historyForms.filter((f) => (f.status || "").toLowerCase() !== "bozza");
                            const tenantBadge = (tid) => {
                                if (tid === CONTEXT_MAP.niyol.tenantId)
                                    return _jsx(Badge, { variant: "outline", className: "border-cyan-500/40 text-cyan-400 text-[10px]", children: "Niyol" });
                                if (tid === CONTEXT_MAP.multyproget.tenantId)
                                    return _jsx(Badge, { variant: "outline", className: "border-emerald-500/40 text-emerald-400 text-[10px]", children: "Multyproget" });
                                return _jsx(Badge, { variant: "outline", className: "text-[10px]", children: "\u2014" });
                            };
                            const renderList = (list, emptyLabel) => list.length === 0 ? (_jsx("div", { className: "text-xs text-muted-foreground py-4 text-center", children: emptyLabel })) : (_jsx("ul", { className: "divide-y divide-border/30 rounded-lg border border-border/30 bg-card/40 overflow-hidden", children: list.map((f) => (_jsxs("li", { className: "flex items-center justify-between gap-3 px-3 py-2 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [tenantBadge(f.tenant_id), _jsx("span", { className: "font-mono text-xs truncate", children: f.numero_fir || "(senza numero)" })] }), _jsx("span", { className: "text-[11px] text-muted-foreground whitespace-nowrap", children: f.updated_at ? new Date(f.updated_at).toLocaleString("it-IT") : "—" })] }, f.id))) }));
                            return (_jsxs("div", { className: "overflow-y-auto space-y-4 pr-1", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Badge, { variant: "outline", className: "border-amber-500/40 text-amber-400", children: "Bozze" }), _jsx("span", { className: "text-xs text-muted-foreground", children: bozze.length })] }), renderList(bozze, "Nessuna bozza in sospeso")] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Badge, { variant: "outline", className: "border-emerald-500/40 text-emerald-400", children: "Inviati / Completati" }), _jsx("span", { className: "text-xs text-muted-foreground", children: inviati.length })] }), renderList(inviati, "Nessun FIR inviato")] })] }));
                        })()), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => setHistoryDialog({ open: false, user: null }), children: "Chiudi" }) })] }) })] }));
    if (embedded)
        return content;
    return (_jsx(MNAdminLayout, { title: `Trasportatori ${tenant.label}`, subtitle: `Gestione trasportatori ${tenant.label}`, children: content }));
}
