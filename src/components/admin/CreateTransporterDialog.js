import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
export function CreateTransporterDialog({ open, onOpenChange, onCreated, tenant, tenantOptions }) {
    const [loading, setLoading] = useState(false);
    const availableTenants = tenantOptions?.length ? tenantOptions : [tenant];
    const [selectedContext, setSelectedContext] = useState(tenant.mnContext || "");
    const activeTenant = availableTenants.find((option) => option.mnContext === selectedContext) || tenant;
    const [form, setForm] = useState({
        nome: "",
        cognome: "",
        codiceFiscale: "",
        password: "",
        targaAutomezzo: "",
    });
    const CF_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    const cfValid = CF_REGEX.test(form.codiceFiscale.toUpperCase().trim());
    const isValid = form.nome.length >= 2 &&
        form.cognome.length >= 2 &&
        cfValid &&
        form.password.length >= 6;
    useEffect(() => {
        if (open)
            setSelectedContext(tenant.mnContext || "");
    }, [open, tenant.mnContext]);
    const handleCreate = async () => {
        if (!isValid)
            return;
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: {
                    action: "create_user",
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    codice_fiscale: form.codiceFiscale.toUpperCase().trim(),
                    password: form.password,
                    tenant_id: activeTenant.tenantId,
                    mn_context: activeTenant.mnContext,
                    org_id: activeTenant.orgId,
                    targa_automezzo: form.targaAutomezzo.trim() || null,
                },
            });
            if (error) {
                let detail = error.message;
                try {
                    const ctx = error.context;
                    const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
                    if (body?.message || body?.error)
                        detail = body.message || body.error;
                }
                catch { /* ignore */ }
                throw new Error(detail);
            }
            if (data?.error)
                throw new Error(data.message || data.error);
            toast.success(`Trasportatore ${form.nome} ${form.cognome} creato per ${activeTenant.label}`);
            setForm({ nome: "", cognome: "", codiceFiscale: "", password: "", targaAutomezzo: "" });
            onOpenChange(false);
            onCreated();
        }
        catch (e) {
            toast.error("Errore: " + (e.message || "Creazione fallita"));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(UserPlus, { className: "h-5 w-5 text-primary" }), "Crea Login App \u2014 ", availableTenants.length > 1 ? "Multyproget / Niyol" : activeTenant.label] }), _jsx(DialogDescription, { children: "Registra un nuovo ragazzo/autista e scegli l'app a cui abilitarlo." })] }), _jsxs("div", { className: "space-y-3", children: [availableTenants.length > 1 && (_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-mono uppercase text-muted-foreground", children: "App / societ\u00E0" }), _jsx("select", { value: selectedContext, onChange: (e) => setSelectedContext(e.target.value), className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground", children: availableTenants.map((option) => (_jsx("option", { value: option.mnContext || "", children: option.label }, option.mnContext || option.label))) })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Input, { placeholder: "Nome *", value: form.nome, name: "nuovo-nome", autoComplete: "off", onChange: (e) => setForm((f) => ({ ...f, nome: e.target.value })) }), _jsx(Input, { placeholder: "Cognome *", value: form.cognome, name: "nuovo-cognome", autoComplete: "off", onChange: (e) => setForm((f) => ({ ...f, cognome: e.target.value })) })] }), _jsx(Input, { placeholder: "Codice Fiscale (16 caratteri) *", value: form.codiceFiscale, maxLength: 16, name: "nuovo-cf", autoComplete: "off", autoCorrect: "off", spellCheck: false, onChange: (e) => setForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })), className: "font-mono" }), form.codiceFiscale.length > 0 && !cfValid && (_jsx("p", { className: "text-xs text-destructive font-mono", children: "Codice fiscale non valido: 16 caratteri nel formato RSSMRA80A01H501U (niente email o spazi)." })), _jsx(Input, { type: "password", placeholder: "Password (min 6 caratteri) *", value: form.password, name: "nuova-password-app", autoComplete: "new-password", onChange: (e) => setForm((f) => ({ ...f, password: e.target.value })) }), _jsx(Input, { placeholder: "Targa automezzo (opzionale)", value: form.targaAutomezzo, name: "nuova-targa", autoComplete: "off", onChange: (e) => setForm((f) => ({ ...f, targaAutomezzo: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Annulla" }), _jsxs(Button, { onClick: handleCreate, disabled: loading || !isValid, children: [loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(UserPlus, { className: "h-4 w-4 mr-2" }), "Crea Login App"] })] })] }) }));
}
