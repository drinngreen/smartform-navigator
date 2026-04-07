import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Factory, Search, Shield, ShieldOff, Key, Eye, RefreshCw, } from "lucide-react";
const TENANT_LABELS = {
    "167d07ad-9184-484e-85a6-da5ceafa42a3": "Global Reco",
    "77ec9a3d-a6d4-4235-8e68-1a6f345de57a": "Multyproget",
    "819c783e-4ecf-4774-85b7-7e7a1c5848fa": "Niyol",
};
export function AdminAreeRiservateImpianti({ tenantFilter }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [pwDialog, setPwDialog] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [inboxDialog, setInboxDialog] = useState(null);
    const [inbox, setInbox] = useState([]);
    const [inboxLoading, setInboxLoading] = useState(false);
    const loadAccounts = async () => {
        setLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "admin_list", tenant_id: tenantFilter || undefined },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (error)
                throw error;
            if (!data?.success)
                throw new Error(data?.error);
            setAccounts(data.accounts || []);
        }
        catch (err) {
            toast.error("Errore caricamento: " + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { loadAccounts(); }, [tenantFilter]);
    const toggleActive = async (account) => {
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "admin_toggle_active", impianto_account_id: account.id },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (error)
                throw error;
            if (!data?.success)
                throw new Error(data?.error);
            toast.success(data.attivo ? "Accesso riattivato" : "Accesso disabilitato");
            loadAccounts();
        }
        catch (err) {
            toast.error(err.message);
        }
    };
    const changePassword = async () => {
        if (!pwDialog || !newPassword)
            return;
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "admin_change_password", impianto_account_id: pwDialog.id, new_password: newPassword },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (error)
                throw error;
            if (!data?.success)
                throw new Error(data?.error);
            toast.success("Password aggiornata");
            setPwDialog(null);
            setNewPassword("");
        }
        catch (err) {
            toast.error(err.message);
        }
    };
    const viewInbox = async (account) => {
        setInboxDialog(account);
        setInboxLoading(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            const { data, error } = await supabase.functions.invoke("impianto-auth", {
                body: { action: "admin_view_inbox", impianto_account_id: account.id },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (error)
                throw error;
            setInbox(data?.inbox || []);
        }
        catch (err) {
            toast.error(err.message);
        }
        finally {
            setInboxLoading(false);
        }
    };
    const filtered = accounts.filter((a) => {
        if (!search)
            return true;
        const s = search.toLowerCase();
        return a.ragione_sociale.toLowerCase().includes(s) || a.email.toLowerCase().includes(s);
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Factory, { className: "h-5 w-5 text-blue-400" }), _jsx("h2", { className: "text-lg font-bold text-foreground", children: "Aree Riservate Impianti" }), _jsxs(Badge, { variant: "outline", className: "text-xs", children: [accounts.length, " impianti"] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: loadAccounts, className: "border-border/50", children: [_jsx(RefreshCw, { className: "h-3 w-3 mr-1" }), " Aggiorna"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca impianto...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9 bg-card/60 border-border/30" })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground text-xs uppercase", children: [_jsx("th", { className: "p-3 text-left", children: "Ragione Sociale" }), _jsx("th", { className: "p-3 text-left", children: "Email" }), !tenantFilter && _jsx("th", { className: "p-3 text-left", children: "Tenant" }), _jsx("th", { className: "p-3 text-center", children: "Stato" }), _jsx("th", { className: "p-3 text-left", children: "Ultimo Accesso" }), _jsx("th", { className: "p-3 text-center", children: "Azioni" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "p-8 text-center text-muted-foreground", children: "Caricamento..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "p-8 text-center text-muted-foreground", children: "Nessun impianto" }) })) : (filtered.map((a) => (_jsxs("tr", { className: "border-b border-border/10 hover:bg-accent/5", children: [_jsx("td", { className: "p-3 font-medium", children: a.ragione_sociale }), _jsx("td", { className: "p-3 text-xs text-muted-foreground", children: a.email }), !tenantFilter && (_jsx("td", { className: "p-3", children: _jsx(Badge, { variant: "outline", className: "text-[10px]", children: a.tenant_id ? TENANT_LABELS[a.tenant_id] || "Altro" : "—" }) })), _jsx("td", { className: "p-3 text-center", children: a.attivo ? (_jsx("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", children: "Attivo" })) : (_jsx("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30", children: "Disabilitato" })) }), _jsx("td", { className: "p-3 text-xs text-muted-foreground", children: a.ultimo_accesso ? new Date(a.ultimo_accesso).toLocaleString("it-IT") : "Mai" }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => viewInbox(a), className: "h-7 px-2 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10", children: [_jsx(Eye, { className: "h-3 w-3 mr-1" }), " FIR"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => { setPwDialog(a); setNewPassword(""); }, className: "h-7 px-2 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10", children: [_jsx(Key, { className: "h-3 w-3 mr-1" }), " PW"] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => toggleActive(a), className: `h-7 px-2 text-xs ${a.attivo
                                                            ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                                                            : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`, children: a.attivo ? _jsx(ShieldOff, { className: "h-3 w-3" }) : _jsx(Shield, { className: "h-3 w-3" }) })] }) })] }, a.id)))) })] }) }) }), _jsx(Dialog, { open: !!pwDialog, onOpenChange: (open) => { if (!open)
                    setPwDialog(null); }, children: _jsxs(DialogContent, { className: "max-w-sm bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["Cambia Password \u2014 ", pwDialog?.ragione_sociale] }) }), _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { type: "text", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Nuova password", className: "bg-secondary/50 border-border" }), _jsxs(Button, { onClick: changePassword, disabled: !newPassword, className: "w-full bg-amber-600 hover:bg-amber-500 text-white", children: [_jsx(Key, { className: "h-4 w-4 mr-1" }), " Aggiorna Password"] })] })] }) }), _jsx(Dialog, { open: !!inboxDialog, onOpenChange: (open) => { if (!open)
                    setInboxDialog(null); }, children: _jsxs(DialogContent, { className: "max-w-2xl bg-card border-border/50 max-h-[80vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { children: ["FIR Ricevuti \u2014 ", inboxDialog?.ragione_sociale] }) }), inboxLoading ? (_jsx("p", { className: "text-center text-muted-foreground py-8", children: "Caricamento..." })) : inbox.length === 0 ? (_jsx("p", { className: "text-center text-muted-foreground py-8", children: "Nessun FIR nell'area riservata" })) : (_jsx("div", { className: "space-y-2", children: inbox.map((item) => {
                                const f = item.fir_forms;
                                return (_jsxs("div", { className: "p-3 rounded-lg bg-secondary/30 border border-border/20 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-mono font-bold text-blue-300", children: f?.numero_fir || "N/A" }), _jsx("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.stato === "confermato" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                                                        item.stato === "contestato" ? "bg-red-500/20 text-red-300 border-red-500/30" :
                                                            "bg-amber-500/20 text-amber-300 border-amber-500/30"}`, children: item.stato })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 mt-1 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["CER: ", f?.codice_eer || "—"] }), _jsxs("span", { children: ["Produttore: ", f?.produttore_denominazione || "—"] }), _jsxs("span", { children: ["Quantit\u00E0: ", f?.quantita?.toLocaleString("it-IT") || "—"] })] })] }, item.id));
                            }) }))] }) })] }));
}
