import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Users, Shield, Eye, Pencil, Trash2, Search, RefreshCw, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateTransporterDialog } from "@/components/admin/CreateTransporterDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
export default function PersonalePage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
    const [newPassword, setNewPassword] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [createDialog, setCreateDialog] = useState(false);
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
            setUsers(data.users || []);
        }
        catch (e) {
            toast.error("Errore caricamento utenti: " + e.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchUsers(); }, []);
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
            toast.success("Password aggiornata per " + (passwordDialog.user.profile?.nome || passwordDialog.user.email));
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
            toast.success("Utente eliminato");
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
        return (u.email?.toLowerCase().includes(q) ||
            u.profile?.nome?.toLowerCase().includes(q) ||
            u.profile?.cognome?.toLowerCase().includes(q) ||
            u.profile?.codice_fiscale?.toLowerCase().includes(q));
    });
    const stats = {
        total: users.length,
        admins: users.filter((u) => u.role === "admin").length,
        online: users.filter((u) => u.online_status === "online").length,
        drivers: users.filter((u) => u.role === "user").length,
    };
    const statusColor = {
        online: "bg-green-500",
        offline: "bg-zinc-500",
        busy: "bg-red-500",
        away: "bg-yellow-500",
    };
    return (_jsxs(AdminLayout, { title: "Personale", subtitle: "Gestione utenti e operatori", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6", children: [
                    { label: "Totale Utenti", value: stats.total, icon: Users, color: "text-primary" },
                    { label: "Amministratori", value: stats.admins, icon: Shield, color: "text-pink-400" },
                    { label: "Autisti", value: stats.drivers, icon: Users, color: "text-cyan-400" },
                    { label: "Online Adesso", value: stats.online, icon: Eye, color: "text-green-400" },
                ].map((s) => (_jsxs("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground font-mono uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-display text-foreground", children: s.value })] }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca per nome, email, codice fiscale...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsxs(Button, { onClick: () => setCreateDialog(true), className: "gap-2", children: [_jsx(UserPlus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Crea Trasportatore" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: fetchUsers, disabled: loading, children: _jsx(RefreshCw, { className: `h-4 w-4 ${loading ? "animate-spin" : ""}` }) })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) })) : (_jsx("div", { className: "rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30", children: [_jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Nome" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Email" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "CF" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Targa" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Ruolo" }), _jsx("th", { className: "text-left p-3 font-mono text-xs text-muted-foreground uppercase", children: "Ultimo Login" }), _jsx("th", { className: "text-right p-3 font-mono text-xs text-muted-foreground uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((user) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-secondary/30 transition-colors", children: [_jsx("td", { className: "p-3", children: _jsx("div", { className: `w-2.5 h-2.5 rounded-full ${statusColor[user.online_status] || "bg-zinc-500"}` }) }), _jsx("td", { className: "p-3 font-medium text-foreground", children: user.profile ? `${user.profile.nome} ${user.profile.cognome}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground font-mono text-xs", children: user.email }), _jsx("td", { className: "p-3 text-muted-foreground font-mono text-xs", children: user.profile?.codice_fiscale || "—" }), _jsx("td", { className: "p-3 text-muted-foreground font-mono text-xs", children: user.profile?.targa_automezzo || "—" }), _jsx("td", { className: "p-3", children: _jsx(Badge, { variant: user.role === "admin" ? "default" : "secondary", className: "text-xs", children: user.role }) }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("it-IT") : "Mai" }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsxs("button", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium border border-cyan-400 hover:bg-cyan-500 transition-colors", title: "Cambia Password", onClick: () => { setPasswordDialog({ open: true, user }); setNewPassword(""); }, children: [_jsx(Pencil, { className: "h-3.5 w-3.5" }), "Password"] }), _jsxs("button", { className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium border border-red-400 hover:bg-red-500 transition-colors", title: "Elimina Utente", onClick: () => setDeleteDialog({ open: true, user }), children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "Elimina"] })] }) })] }, user.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-muted-foreground", children: "Nessun utente trovato" }) }))] })] }) }) })), _jsx(Dialog, { open: passwordDialog.open, onOpenChange: (o) => setPasswordDialog({ open: o, user: o ? passwordDialog.user : null }), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Cambia Password" }), _jsxs(DialogDescription, { children: ["Imposta una nuova password per", " ", _jsxs("strong", { children: [passwordDialog.user?.profile?.nome, " ", passwordDialog.user?.profile?.cognome] }), " ", "(", passwordDialog.user?.email, ")"] })] }), _jsx(Input, { type: "password", placeholder: "Nuova password (min 6 caratteri)", value: newPassword, onChange: (e) => setNewPassword(e.target.value) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setPasswordDialog({ open: false, user: null }), children: "Annulla" }), _jsxs(Button, { onClick: handleResetPassword, disabled: actionLoading || newPassword.length < 6, children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Conferma"] })] })] }) }), _jsx(AlertDialog, { open: deleteDialog.open, onOpenChange: (o) => setDeleteDialog({ open: o, user: o ? deleteDialog.user : null }), children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Eliminare Utente?" }), _jsxs(AlertDialogDescription, { children: ["Stai per eliminare definitivamente l'account di", " ", _jsxs("strong", { children: [deleteDialog.user?.profile?.nome, " ", deleteDialog.user?.profile?.cognome] }), " ", "(", deleteDialog.user?.email, "). Questa azione \u00E8 irreversibile."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Annulla" }), _jsxs(AlertDialogAction, { onClick: handleDeleteUser, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: [actionLoading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Elimina"] })] })] }) }), _jsx(CreateTransporterDialog, { open: createDialog, onOpenChange: setCreateDialog, onCreated: fetchUsers, tenant: { label: "Global Reco", tenantId: "167d07ad-9184-484e-85a6-da5ceafa42a3", mnContext: null, orgId: null } })] }));
}
