import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Users, RefreshCw, Loader2, FilePlus, Pencil, Trash2, ShieldCheck, ShieldAlert, Hash, Zap, CheckCircle2, AlertTriangle, UserPlus, UserCog, UserX, PlusCircle, Copy, ArrowLeft, } from "lucide-react";
import { vidimaFIRAsync } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";
import { CreateTransporterDialog } from "@/components/admin/CreateTransporterDialog";
const SHARED_POOL_USER_ID = "00000000-0000-0000-0000-000000000000";
const COMPANIES = {
    multy: {
        label: "Multyproget",
        tenantId: "77ec9a3d-602e-438f-97bf-1c69abd8f691",
        mnContext: "multyproget",
        accent: "text-neon-green",
        orgId: "0d9cd11c-4ca8-4e5f-90ab-1529899124b5",
    },
    niyol: {
        label: "Niyol",
        tenantId: "819c783e-78dd-4080-8265-802e75b0d813",
        mnContext: "niyol",
        accent: "text-neon-cyan",
        orgId: "b3eae77a-e973-425d-b7fb-283007583e72",
    },
};
const TENANT_OPTIONS = [
    { label: "Multyproget", tenantId: COMPANIES.multy.tenantId, mnContext: COMPANIES.multy.mnContext, orgId: COMPANIES.multy.orgId },
    { label: "Niyol", tenantId: COMPANIES.niyol.tenantId, mnContext: COMPANIES.niyol.mnContext, orgId: COMPANIES.niyol.orgId },
];
const validContexts = ["multyproget", "dev-multyproget", "niyol"];
function normalizeFirNumber(value) {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
    if (/^[A-Z]{5} [0-9]{6} [A-Z]{2}$/.test(normalized))
        return normalized;
    const compact = normalized.replace(/[^A-Z0-9]/g, "");
    const match = compact.match(/([A-Z]{5})([0-9]{6})([A-Z]{2})/);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : normalized;
}
export default function MNCentroAppFirPage() {
    const params = useParams();
    const navigate = useNavigate();
    const context = params.context ?? "dev-multyproget";
    const isValid = validContexts.includes(context);
    const [company, setCompany] = useState(context === "niyol" ? "niyol" : "multy");
    const cfg = COMPANIES[company];
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [poolFree, setPoolFree] = useState(0);
    const [busy, setBusy] = useState(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [vidimaBusy, setVidimaBusy] = useState(false);
    const [vidimaQty, setVidimaQty] = useState(10);
    const [manualDialog, setManualDialog] = useState({ open: false, emp: null });
    const [manualNumber, setManualNumber] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [poolNumber, setPoolNumber] = useState("");
    const [poolBusy, setPoolBusy] = useState(false);
    const [editDialog, setEditDialog] = useState({ open: false, emp: null });
    const [editForm, setEditForm] = useState({ nome: "", cognome: "", codiceFiscale: "", password: "", targa: "", mnContext: "multyproget" });
    const [editBusy, setEditBusy] = useState(false);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, draftsRes, poolRes] = await Promise.all([
                supabase.functions.invoke("admin-user-manage", { body: { action: "list_users" } }),
                supabase
                    .from("fir_forms")
                    .select("id, user_id, numero_fir, status, updated_at")
                    .eq("tenant_id", cfg.tenantId)
                    .eq("status", "bozza")
                    .eq("deleted_by_user", false)
                    .order("updated_at", { ascending: false }),
                supabase
                    .from("fir_number_pool")
                    .select("id", { count: "exact", head: true })
                    .eq("societa_id", company)
                    .eq("status", "available"),
            ]);
            if (usersRes.error)
                throw usersRes.error;
            const all = (usersRes.data?.users ?? []);
            const list = all
                .filter((u) => {
                const p = u.profile;
                if (!p)
                    return false;
                return p.mn_context === cfg.mnContext || p.tenant_id === cfg.tenantId;
            })
                .filter((u) => u.role !== "admin")
                .map((u) => ({
                user_id: u.id,
                email: u.email,
                nome: u.profile?.nome ?? "",
                cognome: u.profile?.cognome ?? "",
                codice_fiscale: u.profile?.codice_fiscale ?? "",
                targa: u.profile?.targa_automezzo ?? null,
                last_sign_in_at: u.last_sign_in_at ?? null,
                deactivated_at: u.profile?.deactivated_at ?? null,
            }))
                .sort((a, b) => `${a.cognome}${a.nome}`.localeCompare(`${b.cognome}${b.nome}`));
            setEmployees(list);
            setDrafts(draftsRes.data ?? []);
            setPoolFree(poolRes.count ?? 0);
        }
        catch (e) {
            toast.error("Errore caricamento: " + (e.message || ""));
        }
        finally {
            setLoading(false);
        }
    }, [cfg.tenantId, cfg.mnContext, company]);
    useEffect(() => { if (isValid)
        load(); }, [load, isValid]);
    const draftsByUser = useMemo(() => {
        var _a;
        const map = {};
        for (const d of drafts) {
            (map[_a = d.user_id] || (map[_a] = [])).push(d);
        }
        return map;
    }, [drafts]);
    const draftByUser = useMemo(() => {
        const map = {};
        for (const d of drafts) {
            const current = map[d.user_id];
            if (!current || (d.numero_fir && !current.numero_fir))
                map[d.user_id] = d;
        }
        return map;
    }, [drafts]);
    const pronti = employees.filter((e) => draftByUser[e.user_id]?.numero_fir).length;
    const scoperti = employees.length - pronti;
    if (!isValid)
        return _jsx(Navigate, { to: "/mn/admin", replace: true });
    const takePoolNumber = async () => {
        const { data } = await supabase
            .from("fir_number_pool")
            .select("fir_number")
            .eq("societa_id", company)
            .eq("status", "available")
            .eq("suspended", false)
            .in("user_id", [SHARED_POOL_USER_ID])
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
        return data?.fir_number ?? null;
    };
    const assignNumber = async (emp, numero) => {
        setBusy(emp.user_id);
        try {
            const firNumber = numero ?? (await takePoolNumber());
            if (!firNumber) {
                toast.error("Serbatoio vuoto: vidima nuovi numeri da RENTRI o inserisci un numero manuale.");
                return;
            }
            const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                p_user_id: emp.user_id,
                p_tenant_id: cfg.tenantId,
                p_numero_fir: normalizeFirNumber(firNumber),
            });
            if (error)
                throw error;
            toast.success(`FIR ${normalizeFirNumber(firNumber)} pronto per ${emp.cognome} ${emp.nome}`);
            await load();
        }
        catch (e) {
            toast.error("Errore assegnazione: " + (e.message || ""));
        }
        finally {
            setBusy(null);
        }
    };
    const removeDraftById = async (draft, emp) => {
        if (!window.confirm(`Togliere il FIR ${draft.numero_fir ?? ""} a ${emp.cognome} ${emp.nome}? Il numero torna disponibile per l'assegnazione.`))
            return;
        setBusy(emp.user_id);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "delete_fir_form", form_id: draft.id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success(`Numero ${draft.numero_fir ?? ""} rimesso nei FIR da assegnare`);
            await load();
        }
        catch (e) {
            toast.error("Errore rimozione: " + (e.message || ""));
        }
        finally {
            setBusy(null);
        }
    };
    const removeDraft = async (emp) => {
        const draft = draftByUser[emp.user_id];
        if (!draft)
            return;
        if (!window.confirm(`Rimuovere la bozza ${draft.numero_fir ?? ""} di ${emp.cognome} ${emp.nome}?`))
            return;
        setBusy(emp.user_id);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "delete_fir_form", form_id: draft.id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Bozza rimossa, numero rilasciato nel serbatoio");
            await load();
        }
        catch (e) {
            toast.error("Errore rimozione: " + (e.message || ""));
        }
        finally {
            setBusy(null);
        }
    };
    const prepareAll = async () => {
        const missing = employees.filter((e) => !draftByUser[e.user_id]?.numero_fir && !e.deactivated_at);
        if (missing.length === 0) {
            toast.info("Tutti i dipendenti hanno già un FIR pronto.");
            return;
        }
        if (poolFree < missing.length) {
            toast.error(`Servono ${missing.length} numeri ma nel serbatoio ce ne sono ${poolFree}. Vidima nuovi numeri da RENTRI.`);
            return;
        }
        setBulkBusy(true);
        let ok = 0;
        try {
            for (const emp of missing) {
                const numero = await takePoolNumber();
                if (!numero)
                    break;
                const { error } = await supabase.rpc("create_manual_fir_draft_for_tenant", {
                    p_user_id: emp.user_id,
                    p_tenant_id: cfg.tenantId,
                    p_numero_fir: normalizeFirNumber(numero),
                });
                if (error) {
                    toast.error(`${emp.cognome}: ${error.message}`);
                    continue;
                }
                ok += 1;
            }
            toast.success(`${ok} formulari pronti assegnati`);
            await load();
        }
        finally {
            setBulkBusy(false);
        }
    };
    const vidimaFromRentri = async () => {
        setVidimaBusy(true);
        try {
            const tenantCfg = getTenantConfig(company);
            const blockCode = tenantCfg?.primaryBlock || tenantCfg?.blocks[0]?.code || "";
            const result = await vidimaFIRAsync(company, vidimaQty, blockCode, tenantCfg?.unitId, (msg) => {
                toast.info(msg, { id: "vidimazione-centro" });
            });
            const numeri = (result.numeri ?? []).filter((n) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
            if (numeri.length === 0) {
                toast.error("Nessun numero ricevuto da RENTRI");
                return;
            }
            const rows = numeri.map((n) => ({
                fir_number: normalizeFirNumber(n),
                user_id: SHARED_POOL_USER_ID,
                status: "available",
                societa_id: company,
            }));
            const { error } = await supabase.from("fir_number_pool").insert(rows);
            if (error)
                throw error;
            toast.success(`${numeri.length} numeri vidimati e caricati nel serbatoio ${cfg.label}`);
            await load();
        }
        catch (e) {
            toast.error("Errore vidimazione: " + (e.message || ""));
        }
        finally {
            setVidimaBusy(false);
        }
    };
    const addPoolNumber = async () => {
        const numero = normalizeFirNumber(poolNumber);
        if (!numero)
            return;
        setPoolBusy(true);
        try {
            const { error } = await supabase.from("fir_number_pool").insert({
                fir_number: numero,
                user_id: SHARED_POOL_USER_ID,
                status: "available",
                societa_id: company,
            });
            if (error)
                throw error;
            toast.success(`Numero ${numero} aggiunto al serbatoio ${cfg.label}`);
            setPoolNumber("");
            await load();
        }
        catch (e) {
            toast.error("Errore inserimento numero: " + (e.message || ""));
        }
        finally {
            setPoolBusy(false);
        }
    };
    const openEdit = (emp) => {
        setEditForm({
            nome: emp.nome,
            cognome: emp.cognome,
            codiceFiscale: emp.codice_fiscale,
            password: "",
            targa: emp.targa ?? "",
            mnContext: cfg.mnContext,
        });
        setEditDialog({ open: true, emp });
    };
    const saveEdit = async () => {
        const emp = editDialog.emp;
        if (!emp)
            return;
        const target = TENANT_OPTIONS.find((t) => t.mnContext === editForm.mnContext) || TENANT_OPTIONS[0];
        setEditBusy(true);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: {
                    action: "update_user_access",
                    user_id: emp.user_id,
                    nome: editForm.nome.trim(),
                    cognome: editForm.cognome.trim(),
                    codice_fiscale: editForm.codiceFiscale.toUpperCase().trim(),
                    password: editForm.password || undefined,
                    tenant_id: target.tenantId,
                    mn_context: target.mnContext,
                    org_id: target.orgId,
                    targa_automezzo: editForm.targa.trim() || null,
                },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Accesso app aggiornato");
            setEditDialog({ open: false, emp: null });
            await load();
        }
        catch (e) {
            toast.error("Errore aggiornamento: " + (e.message || ""));
        }
        finally {
            setEditBusy(false);
        }
    };
    const removeEmployee = async (emp) => {
        if (!window.confirm(`Eliminare l'accesso app e il dipendente ${emp.cognome} ${emp.nome}? Lo storico resta per audit.`))
            return;
        setBusy(emp.user_id);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "delete_user", user_id: emp.user_id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success("Dipendente e app disattivati");
            await load();
        }
        catch (e) {
            toast.error("Errore eliminazione: " + (e.message || ""));
        }
        finally {
            setBusy(null);
        }
    };
    const restoreEmployee = async (emp) => {
        setBusy(emp.user_id);
        try {
            const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                body: { action: "restore_user", user_id: emp.user_id },
            });
            if (error)
                throw error;
            if (data?.error)
                throw new Error(data.error);
            toast.success(`App riattivata per ${emp.cognome} ${emp.nome}`);
            await load();
        }
        catch (e) {
            toast.error("Errore riattivazione: " + (e.message || ""));
        }
        finally {
            setBusy(null);
        }
    };
    const openForm = (draftId) => {
        const routeCtx = company === "niyol" ? "niyol" : "multyproget";
        navigate(`/mn/admin/${routeCtx}/formulari?fir=${draftId}`);
    };
    return (_jsxs(MNAdminLayout, { title: "Centro App & FIR", subtitle: "Accessi app dipendenti e formulari sempre pronti", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => navigate("/mn/admin/dev-multyproget"), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), " Torna alla console centrale"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [Object.keys(COMPANIES).map((key) => (_jsx("button", { onClick: () => setCompany(key), className: `px-5 py-2.5 rounded-xl border text-sm font-display tracking-wider transition-colors ${company === key
                                    ? "bg-primary/20 border-primary/50 text-primary"
                                    : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground"}`, children: COMPANIES[key].label }, key))), _jsxs(Button, { variant: "outline", size: "sm", onClick: load, disabled: loading, className: "ml-auto", children: [loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(RefreshCw, { className: "h-4 w-4" }), _jsx("span", { className: "ml-2", children: "Aggiorna" })] })] }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatBox, { icon: _jsx(Users, { className: "h-5 w-5" }), label: "Dipendenti con app", value: employees.length }), _jsx(StatBox, { icon: _jsx(CheckCircle2, { className: "h-5 w-5" }), label: "FIR pronti", value: pronti, tone: "text-neon-green" }), _jsx(StatBox, { icon: _jsx(AlertTriangle, { className: "h-5 w-5" }), label: "Senza FIR", value: scoperti, tone: scoperti > 0 ? "text-amber-400" : "text-muted-foreground" }), _jsx(StatBox, { icon: _jsx(Hash, { className: "h-5 w-5" }), label: "Numeri in serbatoio", value: poolFree, tone: poolFree > 0 ? "text-neon-cyan" : "text-destructive" })] }), _jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-5 flex flex-wrap items-center gap-3", children: [_jsxs(Button, { onClick: prepareAll, disabled: bulkBusy || scoperti === 0, children: [bulkBusy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(FilePlus, { className: "h-4 w-4 mr-2" }), "Prepara un FIR per tutti (", scoperti, ")"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-muted-foreground font-mono", children: "Vidima da RENTRI:" }), _jsx(Input, { type: "number", min: 1, max: 100, value: vidimaQty, onChange: (e) => setVidimaQty(Math.max(1, Math.min(100, Number(e.target.value) || 1))), className: "w-20 h-9" }), _jsxs(Button, { variant: "outline", onClick: vidimaFromRentri, disabled: vidimaBusy, children: [vidimaBusy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(Zap, { className: "h-4 w-4 mr-2" }), "Vidima numeri ", cfg.label] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-muted-foreground font-mono", children: "Numero gi\u00E0 in tuo possesso:" }), _jsx(Input, { value: poolNumber, onChange: (e) => setPoolNumber(e.target.value), placeholder: "ZRZXR 000123 AB", className: "w-44 h-9 font-mono" }), _jsxs(Button, { variant: "outline", onClick: addPoolNumber, disabled: poolBusy || !poolNumber.trim(), children: [poolBusy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(PlusCircle, { className: "h-4 w-4 mr-2" }), "Aggiungi al serbatoio"] })] }), _jsxs(Button, { className: "ml-auto", onClick: () => setCreateOpen(true), children: [_jsx(UserPlus, { className: "h-4 w-4 mr-2" }), " Nuovo dipendente + app"] })] }), _jsx("div", { className: "rounded-2xl bg-card/60 border border-border/30 overflow-hidden", children: loading ? (_jsx("div", { className: "p-10 flex justify-center", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }) })) : employees.length === 0 ? (_jsxs("div", { className: "p-10 text-center text-sm text-muted-foreground", children: ["Nessun dipendente con accesso app per ", cfg.label, ". Creane uno con \"Nuovo dipendente + app\"."] })) : (_jsx("div", { className: "divide-y divide-border/20", children: employees.map((emp) => {
                                const draft = draftByUser[emp.user_id];
                                const empDrafts = (draftsByUser[emp.user_id] ?? []).filter((d) => d.numero_fir);
                                const pronto = !!draft?.numero_fir;
                                return (_jsxs("div", { className: "p-4 flex flex-col lg:flex-row lg:items-center gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "font-display text-sm tracking-wide", children: [emp.cognome, " ", emp.nome] }), emp.deactivated_at ? (_jsxs(Badge, { variant: "destructive", className: "text-[10px]", children: [_jsx(ShieldAlert, { className: "h-3 w-3 mr-1" }), "Disattivato"] })) : (_jsxs(Badge, { variant: "outline", className: "text-[10px]", children: [_jsx(ShieldCheck, { className: "h-3 w-3 mr-1" }), "App attiva"] })), emp.targa && _jsx(Badge, { variant: "secondary", className: "text-[10px] font-mono", children: emp.targa }), empDrafts.length > 1 && (_jsxs(Badge, { variant: "secondary", className: "text-[10px]", children: [empDrafts.length, " FIR assegnati"] }))] }), _jsxs("div", { className: "text-[11px] text-muted-foreground font-mono truncate", children: [emp.codice_fiscale || emp.email, emp.last_sign_in_at && ` · ultimo accesso ${new Date(emp.last_sign_in_at).toLocaleDateString("it-IT")}`] })] }), _jsx("div", { className: "lg:w-72", children: empDrafts.length > 0 ? (_jsx("div", { className: "flex flex-col gap-1", children: empDrafts.map((d) => (_jsxs("div", { className: "text-xs font-mono text-neon-green flex items-center gap-2", children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), " ", d.numero_fir, _jsx("button", { type: "button", title: "Copia numero FIR", onClick: async () => {
                                                                try {
                                                                    await navigator.clipboard.writeText(d.numero_fir);
                                                                    toast.success(`Copiato: ${d.numero_fir}`);
                                                                }
                                                                catch {
                                                                    toast.error("Copia non riuscita");
                                                                }
                                                            }, className: "rounded-md border border-border/60 bg-background/60 p-1 text-muted-foreground hover:text-foreground", children: _jsx(Copy, { className: "h-3.5 w-3.5" }) }), _jsx("button", { type: "button", onClick: () => openForm(d.id), className: "text-[10px] underline text-muted-foreground hover:text-foreground", children: "compila" }), _jsx("button", { type: "button", disabled: busy === emp.user_id, onClick: () => removeDraftById(d, emp), title: "Togli assegnazione e rimetti il numero nei FIR da assegnare", className: "text-[10px] underline text-destructive hover:opacity-80 disabled:opacity-40", children: "togli" })] }, d.id))) })) : (_jsxs("div", { className: "text-xs font-mono text-amber-400 flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " Nessun formulario pronto"] })) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs(Button, { size: "sm", variant: "outline", disabled: busy === emp.user_id, onClick: () => assignNumber(emp), children: [busy === emp.user_id ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(Hash, { className: "h-3.5 w-3.5" }), _jsx("span", { className: "ml-1.5", children: "Assegna numero" })] }), _jsxs(Button, { size: "sm", variant: "outline", disabled: busy === emp.user_id, onClick: () => { setManualNumber(""); setManualDialog({ open: true, emp }); }, children: [_jsx(FilePlus, { className: "h-3.5 w-3.5 mr-1.5" }), " Numero manuale"] }), _jsxs(Button, { size: "sm", disabled: !draft, onClick: () => draft && openForm(draft.id), children: [_jsx(Pencil, { className: "h-3.5 w-3.5 mr-1.5" }), " Compila"] }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-destructive", disabled: !draft || busy === emp.user_id, onClick: () => removeDraft(emp), children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => openEdit(emp), children: [_jsx(UserCog, { className: "h-3.5 w-3.5 mr-1.5" }), " Login / App"] }), emp.deactivated_at ? (_jsxs(Button, { size: "sm", variant: "outline", className: "text-neon-green border-neon-green/40", disabled: busy === emp.user_id, onClick: () => restoreEmployee(emp), children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5 mr-1.5" }), " Riattiva app"] })) : (_jsx(Button, { size: "sm", variant: "ghost", className: "text-destructive", disabled: busy === emp.user_id, title: "Disattiva ed elimina l'accesso app", onClick: () => removeEmployee(emp), children: _jsx(UserX, { className: "h-3.5 w-3.5" }) }))] })] }, emp.user_id));
                            }) })) })] }), _jsx(Dialog, { open: manualDialog.open, onOpenChange: (o) => setManualDialog({ open: o, emp: o ? manualDialog.emp : null }), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Numero FIR manuale" }), _jsxs(DialogDescription, { children: ["Assegna un numero specifico a ", manualDialog.emp?.cognome, " ", manualDialog.emp?.nome, ". Il formulario resta compilabile sia in modulo standard che alternativo."] })] }), _jsx(Input, { value: manualNumber, onChange: (e) => setManualNumber(e.target.value), placeholder: "ZRZXR 000123 AB", className: "font-mono" }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setManualDialog({ open: false, emp: null }), children: "Annulla" }), _jsx(Button, { disabled: !manualNumber.trim(), onClick: async () => {
                                        const emp = manualDialog.emp;
                                        if (!emp)
                                            return;
                                        setManualDialog({ open: false, emp: null });
                                        await assignNumber(emp, manualNumber);
                                    }, children: "Assegna" })] })] }) }), _jsx(CreateTransporterDialog, { open: createOpen, onOpenChange: setCreateOpen, onCreated: load, tenant: TENANT_OPTIONS.find((t) => t.mnContext === cfg.mnContext) || TENANT_OPTIONS[0], tenantOptions: TENANT_OPTIONS }), _jsx(Dialog, { open: editDialog.open, onOpenChange: (o) => setEditDialog({ open: o, emp: o ? editDialog.emp : null }), children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Login e app dipendente" }), _jsxs(DialogDescription, { children: ["Modifica credenziali di accesso e app assegnata a ", editDialog.emp?.cognome, " ", editDialog.emp?.nome, "."] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-mono uppercase text-muted-foreground", children: "App / societ\u00E0" }), _jsx("select", { value: editForm.mnContext, onChange: (e) => setEditForm((f) => ({ ...f, mnContext: e.target.value })), className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground", children: TENANT_OPTIONS.map((t) => (_jsx("option", { value: t.mnContext || "", children: t.label }, t.mnContext || t.label))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Input, { placeholder: "Nome", value: editForm.nome, onChange: (e) => setEditForm((f) => ({ ...f, nome: e.target.value })) }), _jsx(Input, { placeholder: "Cognome", value: editForm.cognome, onChange: (e) => setEditForm((f) => ({ ...f, cognome: e.target.value })) })] }), _jsx(Input, { placeholder: "Codice fiscale (login)", maxLength: 16, value: editForm.codiceFiscale, onChange: (e) => setEditForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase() })), className: "font-mono" }), _jsx(Input, { type: "password", placeholder: "Nuova password (lascia vuoto per non cambiarla)", value: editForm.password, onChange: (e) => setEditForm((f) => ({ ...f, password: e.target.value })) }), _jsx(Input, { placeholder: "Targa automezzo", value: editForm.targa, onChange: (e) => setEditForm((f) => ({ ...f, targa: e.target.value.toUpperCase() })), className: "font-mono" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setEditDialog({ open: false, emp: null }), children: "Annulla" }), _jsxs(Button, { onClick: saveEdit, disabled: editBusy || editForm.nome.trim().length < 2 || editForm.cognome.trim().length < 2 || editForm.codiceFiscale.trim().length !== 16, children: [editBusy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(UserCog, { className: "h-4 w-4 mr-2" }), "Salva"] })] })] }) })] }));
}
function StatBox({ icon, label, value, tone = "text-primary" }) {
    return (_jsxs("div", { className: "rounded-2xl bg-card/60 border border-border/30 p-4", children: [_jsxs("div", { className: `flex items-center gap-2 ${tone}`, children: [icon, _jsx("span", { className: "text-2xl font-display", children: value })] }), _jsx("div", { className: "text-[11px] text-muted-foreground mt-1 uppercase tracking-wider", children: label })] }));
}
