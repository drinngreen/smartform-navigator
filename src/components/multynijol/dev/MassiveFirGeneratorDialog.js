import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FilePlus2, Layers } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
const CATEGORIE = [
    { value: "conto_proprio", label: "Conto Proprio" },
    { value: "miol", label: "MIOL" },
    { value: "multy", label: "MULTY" },
];
export function MassiveFirGeneratorDialog({ open, onClose, tenantId, contextLabel, onCreated }) {
    const [drivers, setDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [driverId, setDriverId] = useState("");
    const [categoria, setCategoria] = useState("multy");
    const [numeriRaw, setNumeriRaw] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!open)
            return;
        (async () => {
            setLoadingDrivers(true);
            try {
                const { data, error } = await supabase.functions.invoke("admin-user-manage", { body: { action: "list_users" } });
                if (error)
                    throw error;
                const list = (data?.users || [])
                    .filter((u) => !u.profile?.tenant_id || u.profile?.tenant_id === tenantId)
                    .map((u) => ({
                    id: u.id,
                    label: u.profile ? `${u.profile.nome ?? ""} ${u.profile.cognome ?? ""} (${u.profile.codice_fiscale ?? u.email})`.trim() : u.email,
                }));
                setDrivers(list);
            }
            catch (e) {
                toast.error("Errore caricamento utenti: " + e.message);
            }
            finally {
                setLoadingDrivers(false);
            }
        })();
    }, [open, tenantId]);
    const numeri = useMemo(() => numeriRaw
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean), [numeriRaw]);
    const handleGenerate = async () => {
        if (!driverId)
            return toast.error("Seleziona un'anagrafica destinataria");
        if (numeri.length === 0)
            return toast.error("Inserisci almeno un numero FIR");
        setBusy(true);
        let ok = 0;
        let ko = 0;
        for (const n of numeri) {
            try {
                const { data, error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                    p_user_id: driverId,
                    p_tenant_id: tenantId,
                    p_numero_fir: n,
                });
                if (error)
                    throw error;
                const formId = data;
                if (formId) {
                    await supabase.functions.invoke("admin-user-manage", {
                        body: {
                            action: "update_fir_form",
                            form_id: formId,
                            updates: {
                                form_data: { numero_fir: n, numero_formulario: n, categoria_vidimazione: categoria },
                            },
                        },
                    });
                }
                ok++;
            }
            catch (e) {
                console.warn("[MassiveFIR] failed for", n, e?.message);
                ko++;
            }
        }
        setBusy(false);
        toast.success(`Generati ${ok} FIR (${ko} errori)`);
        if (ok > 0) {
            onCreated?.();
            onClose();
            setNumeriRaw("");
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (o) => { if (!o)
            onClose(); }, children: _jsxs(DialogContent, { className: "max-w-lg bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(Layers, { className: "h-5 w-5 text-primary" }), " Generazione Massiva FIR \u2014 ", contextLabel] }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Anagrafica / Autista" }), _jsxs(Select, { value: driverId, onValueChange: setDriverId, children: [_jsx(SelectTrigger, { className: "bg-background/60 border-border/40 mt-1", children: _jsx(SelectValue, { placeholder: loadingDrivers ? "Caricamento…" : "Seleziona anagrafica" }) }), _jsx(SelectContent, { children: drivers.map((d) => (_jsx(SelectItem, { value: d.id, children: d.label }, d.id))) })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs uppercase font-mono", children: "Categoria di vidimazione" }), _jsxs(Select, { value: categoria, onValueChange: setCategoria, children: [_jsx(SelectTrigger, { className: "bg-background/60 border-border/40 mt-1", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: CATEGORIE.map((c) => _jsx(SelectItem, { value: c.value, children: c.label }, c.value)) })] })] }), _jsxs("div", { children: [_jsxs(Label, { className: "text-xs uppercase font-mono", children: ["Numeri FIR (uno per riga, virgola o spazio) \u2014 ", numeri.length, " rilevati"] }), _jsx("textarea", { value: numeriRaw, onChange: (e) => setNumeriRaw(e.target.value), placeholder: "es.\\nABCDE 000123 AB\\nABCDE 000124 AB\\n...", rows: 7, className: "mt-1 w-full bg-sky-400/10 border border-sky-400/40 rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-sky-300" }), _jsx("p", { className: "text-[11px] text-muted-foreground mt-1", children: "Incolla i numeri pescati dal pool RENTRI o generati manualmente. Ogni numero diventa una bozza intestata all'anagrafica scelta." })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-border/30", children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: busy, children: "Annulla" }), _jsxs(Button, { onClick: handleGenerate, disabled: busy || numeri.length === 0 || !driverId, className: "gap-2", children: [busy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(FilePlus2, { className: "h-4 w-4" }), "Genera ", numeri.length || "", " FIR"] })] })] })] }) }));
}
