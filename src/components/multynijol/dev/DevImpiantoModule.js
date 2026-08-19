import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevGiacenzeModule } from "./DevGiacenzeModule";
import { DevRegistroCaricoScaricoModule } from "./DevRegistroCaricoScaricoModule";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { ImpiantoFirList } from "@/components/impianto/ImpiantoFirList";
import { ImpiantoFirDetail } from "@/components/impianto/ImpiantoFirDetail";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { listIncomingXFir, signIncomingXFir } from "@/services/impiantoFirService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Plus, Package, Upload, Database, Zap, AlertTriangle, CreditCard, FileSpreadsheet, Printer, ClipboardList, Truck, Trash2, } from "lucide-react";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { FatturazioneModule } from "@/components/fatturazione/FatturazioneModule";
import { vidimaFIRAsync, emissioneFir, inviaOperazioneRentri } from "@/lib/rentriVpsApi";
import { getTenantConfig } from "@/lib/rentriBlockCodes";
const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";
const NIYOL_TENANT_ID = "819c783e-78dd-4080-8265-802e75b0d813";
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";
const SOCIETA_ID = "multy";
const IMPIANTO_RGB = "16, 185, 129";
const firstFirValue = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
const formatFirDate = (value) => {
    if (!value)
        return "—";
    const raw = String(value);
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly)
        return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("it-IT");
};
const firDisplayData = (form) => {
    const fd = form.form_data || {};
    return {
        cer: firstFirValue(form.codice_eer, fd.cer, fd.codice_eer, fd.codiceEER) || "—",
        produttore: firstFirValue(form.produttore_denominazione, fd.produttore_denominazione, fd.produttoreDenominazione) || "—",
        destinatario: firstFirValue(form.destinatario_denominazione, fd.destinatario_denominazione, fd.destinatarioDenominazione) || "—",
        trasportatore: firstFirValue(form.trasportatore_denominazione, fd.trasportatore_denominazione, fd.trasportatoreDenominazione) || "—",
        qPartenza: firstFirValue(form.quantita, fd.quantita_origine, fd.quantita_partenza, fd.quantita, fd.peso_partenza),
        qDestino: firstFirValue(fd.quantita_destino, fd.peso_ricevuto, fd.pesoRicevuto, fd.quantita_arrivo, fd.quantita_accettata),
        unita: firstFirValue(form.unita_misura, fd.unita_misura, fd.unitaMisura) || "kg",
        data: firstFirValue(fd.data_emissione, fd.dataEmissione, form.data_partenza, fd.data_partenza, form.data_arrivo, fd.data_arrivo),
    };
};
async function loadImpiantoPoolStats() {
    const [totalRes, disponibiliRes, inUsoRes, usatiRes] = await Promise.all([
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "available"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "reserved"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "consumed"),
    ]);
    return {
        total: totalRes.count ?? 0,
        disponibili: disponibiliRes.count ?? 0,
        inUso: inUsoRes.count ?? 0,
        usati: usatiRes.count ?? 0,
    };
}
function DevSerbatoioOverview() {
    const { data: stats } = useQuery({
        queryKey: ["dev-fir-pool-stats-impianto", SOCIETA_ID],
        queryFn: loadImpiantoPoolStats,
        refetchInterval: 10000,
    });
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-400", children: [_jsx(Database, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "Serbatoio FIR Multy" })] }), _jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Database, { className: "h-6 w-6 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Totale" }), _jsx("p", { className: "text-xl font-bold text-emerald-400", children: stats?.total ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(CheckCircle, { className: "h-6 w-6 text-green-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Disponibili" }), _jsx("p", { className: "text-xl font-bold text-green-400", children: stats?.disponibili ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Clock, { className: "h-6 w-6 text-cyan-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "In Uso" }), _jsx("p", { className: "text-xl font-bold text-cyan-400", children: stats?.inUso ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-6 w-6 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Consumati" }), _jsx("p", { className: "text-xl font-bold text-amber-400", children: stats?.usati ?? 0 })] })] }) })] })] }));
}
export function DevImpiantoModule() {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(DevSerbatoioOverview, {}), _jsxs(Tabs, { defaultValue: "formulari", className: "space-y-4", children: [_jsxs(TabsList, { className: "bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1", children: [_jsxs(TabsTrigger, { value: "nuovo-fir", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo FIR"] }), _jsxs(TabsTrigger, { value: "giacenze", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Package, { className: "h-4 w-4" }), " Giacenze"] }), _jsxs(TabsTrigger, { value: "formulari", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(FileText, { className: "h-4 w-4" }), " Formulari"] }), _jsxs(TabsTrigger, { value: "gestione-fir", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(Database, { className: "h-4 w-4" }), " Gestione FIR"] }), _jsxs(TabsTrigger, { value: "fatturazione", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(CreditCard, { className: "h-4 w-4" }), " Fatturazione"] }), _jsxs(TabsTrigger, { value: "registro", className: "gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400", children: [_jsx(ClipboardList, { className: "h-4 w-4" }), " Registro C/S"] })] }), _jsx(TabsContent, { value: "nuovo-fir", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(MNFIRFormComplete, { tenantId: MULTY_TENANT_ID, mnContext: "multyproget", enableFatturazione: true }) }) }), _jsx(TabsContent, { value: "giacenze", children: _jsx(DevGiacenzeModule, {}) }), _jsx(TabsContent, { value: "formulari", children: _jsx(ImpiantoFormulari, {}) }), _jsx(TabsContent, { value: "gestione-fir", children: _jsx(ImpiantoGestioneFIR, {}) }), _jsx(TabsContent, { value: "fatturazione", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(FatturazioneModule, { tenantId: MULTY_TENANT_ID }) }) }), _jsx(TabsContent, { value: "registro", children: _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-emerald-500/20", children: _jsx(DevRegistroCaricoScaricoModule, {}) }) })] })] }));
}
// ─── Formulari sub-module ───
function ImpiantoFormulari() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [viewDialog, setViewDialog] = useState({ open: false, form: null });
    const [editorMode, setEditorMode] = useState("standard");
    const [selectedIncoming, setSelectedIncoming] = useState(null);
    const [incomingEvents, setIncomingEvents] = useState({});
    const editorStorageKey = "dev-fir-editor:impianto-multyproget";
    const openEditor = (form, mode = "standard") => {
        setEditorMode(mode);
        setViewDialog({ open: true, form });
        sessionStorage.setItem(editorStorageKey, JSON.stringify({ formId: form.id, mode }));
    };
    const closeEditor = () => {
        if (viewDialog.form?.id)
            sessionStorage.removeItem(`fir-alternative-working-draft:${viewDialog.form.id}`);
        sessionStorage.removeItem(editorStorageKey);
        setViewDialog({ open: false, form: null });
    };
    const changeEditorMode = (mode) => {
        setEditorMode(mode);
        if (viewDialog.form?.id) {
            sessionStorage.setItem(editorStorageKey, JSON.stringify({ formId: viewDialog.form.id, mode }));
        }
    };
    const handleDeleteForm = async (form) => {
        if (!form)
            return;
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
            await refetch();
        }
        catch (e) {
            toast.error("Errore eliminazione FIR: " + (e?.message ?? "sconosciuto"));
        }
    };
    const handleFormSaved = async () => {
        // Se un formulario e' aperto in modifica NON lo ricarichiamo: l'utente sta
        // compilando e i dati non salvati andrebbero persi. Aggiorniamo solo la lista
        // quando il dialog e' chiuso.
        if (viewDialog.open)
            return;
        await refetch();
    };
    useEffect(() => {
        const channel = supabase
            .channel("dev-impianto-fir-forms")
            .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { void handleFormSaved(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewDialog.form?.id]);
    const { data: forms = [], isLoading, refetch } = useQuery({
        queryKey: ["dev-impianto-formulari", MULTY_TENANT_ID, NIYOL_TENANT_ID, GLOBAL_FIR_TENANT_ID],
        queryFn: async () => {
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
            const [multyForms, niyolForms] = await Promise.all([
                loadForms(MULTY_TENANT_ID),
                loadForms(NIYOL_TENANT_ID),
            ]);
            const combined = [...multyForms, ...niyolForms];
            if (combined.length > 0) {
                return Array.from(new Map(combined.map((form) => [form.id, form])).values());
            }
            return await loadForms(GLOBAL_FIR_TENANT_ID);
        },
    });
    useEffect(() => {
        if (viewDialog.open || forms.length === 0)
            return;
        try {
            const saved = JSON.parse(sessionStorage.getItem(editorStorageKey) || "null");
            if (!saved?.formId)
                return;
            const form = forms.find((item) => item.id === saved.formId);
            if (form)
                openEditor(form, saved.mode || "standard");
        }
        catch {
            sessionStorage.removeItem(editorStorageKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forms]);
    const { data: incomingItems = [], isLoading: incomingLoading, refetch: refetchIncoming } = useQuery({
        queryKey: ["dev-impianto-fir-in-arrivo", SOCIETA_ID],
        queryFn: async () => {
            const cfg = getTenantConfig(SOCIETA_ID);
            if (!cfg)
                throw new Error("Configurazione RENTRI Multy mancante");
            return await listIncomingXFir("multy", cfg.issuer);
        },
        refetchInterval: 30000,
    });
    const MULTY_CF = "12347770013";
    const normCf = (v) => String(v || "").replace(/\s+/g, "").toUpperCase();
    const impiantoForms = forms.filter((f) => {
        const fd = f.form_data || {};
        const prod = normCf(f.produttore_codice_fiscale ?? fd.produttore_codice_fiscale ?? fd.produttoreCodiceFiscale);
        const dest = normCf(f.destinatario_codice_fiscale ?? fd.destinatario_codice_fiscale ?? fd.destinatarioCodiceFiscale);
        const trasportatore = normCf(f.trasportatore_codice_fiscale ?? fd.trasportatore_codice_fiscale ?? fd.trasportatoreCodiceFiscale);
        const isMovimentoImpianto = prod === MULTY_CF || dest === MULTY_CF;
        const isContoProprio = trasportatore === MULTY_CF;
        return isMovimentoImpianto && !isContoProprio;
    });
    const filtered = impiantoForms.filter((f) => {
        const q = search.toLowerCase();
        const display = firDisplayData(f);
        const matchSearch = f.numero_fir?.toLowerCase().includes(q) ||
            String(display.cer).toLowerCase().includes(q) ||
            String(display.produttore).toLowerCase().includes(q) ||
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
        total: impiantoForms.length,
        draft: impiantoForms.filter((f) => f.status === "draft" || f.status === "bozza").length,
        submitted: impiantoForms.filter((f) => f.status === "submitted" || f.status === "inviato").length,
        completed: impiantoForms.filter((f) => f.status === "completed" || f.status === "completato").length,
    };
    const selectedIncomingEvents = selectedIncoming
        ? incomingEvents[selectedIncoming.id] ?? [{
                id: `incoming-${selectedIncoming.id}`,
                tipo: "importato",
                descrizione: "FIR individuato tra i formulari in arrivo da firmare",
                timestamp: selectedIncoming.data_ricezione,
                payload: { stato_rentri: selectedIncoming.stato_rentri ?? "IN_ARRIVO" },
            }]
        : [];
    const handleIncomingSign = async (mode, payload) => {
        if (!selectedIncoming)
            throw new Error("Nessun FIR selezionato");
        const cfg = getTenantConfig(SOCIETA_ID);
        if (!cfg?.unitId)
            throw new Error("num_iscr_sito Multy non configurato");
        const response = await signIncomingXFir("multy", selectedIncoming.id, {
            numero_fir: selectedIncoming.numero_fir,
            ...payload,
        }, cfg.unitId);
        if (!response.success) {
            const detailMessage = typeof response.data === "object" && response.data
                ? JSON.stringify(response.data)
                : "";
            throw new Error(response.error || detailMessage || "Firma impianto non riuscita");
        }
        setIncomingEvents((prev) => ({
            ...prev,
            [selectedIncoming.id]: [
                ...(prev[selectedIncoming.id] ?? selectedIncomingEvents),
                {
                    id: `${mode}-${Date.now()}`,
                    tipo: mode === "destination" ? "firma_destinatario" : "firma_ricezione",
                    descrizione: mode === "destination" ? "Accettazione e scarico firmati su RENTRI" : "Ricezione registrata su RENTRI",
                    timestamp: new Date().toISOString(),
                    payload: response.data ?? undefined,
                },
            ],
        }));
        await refetchIncoming();
        setSelectedIncoming(null);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                    { label: "Totale", value: stats.total, icon: FileText, color: "text-emerald-400" },
                    { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
                    { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
                    { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
                ].map((s) => (_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-bold text-foreground", children: s.value })] }) }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, CER, produttore...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: () => refetch(), disabled: isLoading, className: "border-emerald-500/30 text-emerald-400", children: _jsx(RefreshCw, { className: `h-4 w-4 ${isLoading ? "animate-spin" : ""}` }) }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filtered.length)
                                return toast.error("Nessun formulario");
                            const cols = [
                                { header: "Stato", key: "status", width: 12 },
                                { header: "N° FIR", key: "numero_fir", width: 16 },
                                { header: "CER", key: "codice_eer", width: 12 },
                                { header: "Produttore", key: "produttore_denominazione", width: 24 },
                                { header: "Quantità", key: "quantita", width: 12, format: (v, r) => v ? `${v} ${r.unita_misura || "kg"}` : "-" },
                                { header: "Data", key: "updated_at", width: 12, format: (v) => new Date(v).toLocaleDateString("it-IT") },
                            ];
                            exportToExcel(filtered, cols, "formulari-impianto-dev", "Formulari");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(FileSpreadsheet, { className: "h-3 w-3" }), " Excel"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            if (!filtered.length)
                                return toast.error("Nessun formulario");
                            const cols = [
                                { header: "Stato", key: "status", width: 12 },
                                { header: "N° FIR", key: "numero_fir", width: 16 },
                                { header: "CER", key: "codice_eer", width: 12 },
                                { header: "Produttore", key: "produttore_denominazione", width: 24 },
                                { header: "Quantità", key: "quantita", width: 12, format: (v, r) => v ? `${v} ${r.unita_misura || "kg"}` : "-" },
                                { header: "Data", key: "updated_at", width: 12, format: (v) => new Date(v).toLocaleDateString("it-IT") },
                            ];
                            exportToPdf(filtered, cols, "formulari-impianto-dev", "Formulari Impianto — Multyproget Dev");
                        }, className: "gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(Printer, { className: "h-3 w-3" }), " PDF"] })] }), _jsxs(Card, { className: "bg-card/60 border-emerald-500/30", children: [_jsxs(CardHeader, { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(Truck, { className: "h-5 w-5" }), " Accettazione rifiuti RENTRI"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: async () => {
                                    const prevCount = incomingItems.length;
                                    const tid = toast.loading("Interrogazione RENTRI in corso...");
                                    try {
                                        await qc.invalidateQueries({ queryKey: ["dev-impianto-fir-in-arrivo", SOCIETA_ID] });
                                        const res = await refetchIncoming();
                                        const newCount = (res.data ?? []).length;
                                        const delta = newCount - prevCount;
                                        toast.success(delta > 0
                                            ? `✅ ${newCount} FIR in arrivo (+${delta} nuovi)`
                                            : `✅ ${newCount} FIR in arrivo (nessuna novità)`, { id: tid });
                                    }
                                    catch (e) {
                                        toast.error("Errore aggiornamento: " + (e?.message ?? "sconosciuto"), { id: tid });
                                    }
                                }, disabled: incomingLoading, className: "gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", children: [_jsx(RefreshCw, { className: `h-4 w-4 ${incomingLoading ? "animate-spin" : ""}` }), " Aggiorna FIR in arrivo"] })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Questa lista interroga RENTRI lato Multyproget con ruolo destinatario e mostra solo i FIR in arrivo ancora da accettare e firmare." }), _jsx(ImpiantoFirList, { items: incomingItems, loading: incomingLoading, color: IMPIANTO_RGB, onSelect: setSelectedIncoming })] })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: ["all", "draft", "submitted", "completed"].map((t) => (_jsx(Button, { variant: tab === t ? "default" : "outline", size: "sm", onClick: () => setTab(t), className: tab === t ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500/30 text-emerald-400", children: t === "all" ? `Tutti (${stats.total})` : t === "draft" ? `Bozze (${stats.draft})` : t === "submitted" ? `Inviati (${stats.submitted})` : `Completati (${stats.completed})` }, t))) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-emerald-400" }) })) : (_jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "CER" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Produttore" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Destinatario" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Trasportatore" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Q. Partenza" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Q. Destino" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Data" }), _jsx("th", { className: "text-right p-3 text-xs uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((form) => {
                                            const display = firDisplayData(form);
                                            return (_jsxs("tr", { className: "border-b border-border/10 hover:bg-white/5", children: [_jsx("td", { className: "p-3", children: _jsx(Badge, { variant: form.status === "completato" ? "default" : "secondary", className: "text-xs", children: form.status }) }), _jsx("td", { className: "p-3 font-mono text-emerald-300", children: form.numero_fir || "—" }), _jsx("td", { className: "p-3 font-mono", children: String(display.cer) }), _jsx("td", { className: "p-3", children: String(display.produttore) }), _jsx("td", { className: "p-3", children: String(display.destinatario) }), _jsx("td", { className: "p-3", children: String(display.trasportatore) }), _jsx("td", { className: "p-3 font-mono", children: display.qPartenza != null ? `${display.qPartenza} ${display.unita}` : "—" }), _jsx("td", { className: "p-3 font-mono", children: display.qDestino != null ? `${display.qDestino} ${display.unita}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: formatFirDate(display.data) }), _jsxs("td", { className: "p-3 text-right", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => openEditor(form, "standard"), className: `gap-1 ${form.status === "bozza" || form.status === "draft" ? "text-emerald-400" : "text-muted-foreground"}`, children: [_jsx(Edit, { className: "h-3 w-3" }), form.status === "bozza" || form.status === "draft" ? "Standard" : "Visualizza Standard"] }), (form.status === "bozza" || form.status === "draft") && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => openEditor(form, "alternative"), className: "gap-1 text-amber-400", children: [_jsx(Edit, { className: "h-3 w-3" }), "Alternativo"] })), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void handleDeleteForm(form), className: "gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10", title: "Elimina riga", children: _jsx(Trash2, { className: "h-3 w-3" }) })] })] }, form.id));
                                        }), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "p-8 text-center text-muted-foreground", children: "Nessun formulario trovato" }) }))] })] }) }) }) })), _jsx(Dialog, { open: viewDialog.open, onOpenChange: (o) => { if (!o)
                    closeEditor(); }, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(FileText, { className: "h-5 w-5 text-emerald-400" }), viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza", " FIR \u2014 ", viewDialog.form?.numero_fir || "N/D"] }) }), viewDialog.form && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [_jsxs("button", { type: "button", onClick: () => changeEditorMode("standard"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "standard" ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Standard" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Formulario completo classico" })] }), _jsxs("button", { type: "button", onClick: () => changeEditorMode("alternative"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "alternative" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Alternativo" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Editor su template FIR" })] })] }), editorMode === "alternative" ? (_jsx(FIRAlternativeForm, { firFormId: viewDialog.form.id, presetNumeroFir: viewDialog.form.numero_fir || undefined, assignedUserId: viewDialog.form.user_id || undefined, draftData: viewDialog.form, onSaved: handleFormSaved }, `alt-${viewDialog.form.id}`)) : (_jsx(MNFIRFormComplete, { tenantId: MULTY_TENANT_ID, mnContext: "multyproget", firFormId: viewDialog.form.id, draftData: viewDialog.form, enableFatturazione: true }, `std-${viewDialog.form.id}`))] })), viewDialog.form && (_jsx("div", { className: "sticky bottom-0 mt-4 flex justify-end border-t border-border/30 bg-card/95 pt-3", children: _jsxs(Button, { variant: "destructive", className: "gap-2", onClick: () => void handleDeleteForm(viewDialog.form), children: [_jsx(Trash2, { className: "h-4 w-4" }), " Elimina formulario"] }) }))] }) }), _jsx(ImpiantoFirDetail, { item: selectedIncoming, events: selectedIncomingEvents, color: IMPIANTO_RGB, onClose: () => setSelectedIncoming(null), onSignReception: (payload) => handleIncomingSign("reception", payload), onSignDestination: (payload) => handleIncomingSign("destination", payload), forceDestinationOnly: true, destinationActionLabel: "ACCETTA E FIRMA SCARICO" })] }));
}
// ─── Gestione FIR sub-module (Pool + Vidimazione + Test RENTRI) ───
function ImpiantoGestioneFIR() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [bulkInput, setBulkInput] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestQty, setRequestQty] = useState(5);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["dev-fir-pool-stats-impianto", SOCIETA_ID],
        queryFn: loadImpiantoPoolStats,
        refetchInterval: 10000,
    });
    const handleBulkImport = () => {
        const numbers = bulkInput.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
        if (numbers.length === 0) {
            toast.error("Inserisci almeno un numero");
            return;
        }
        const unique = [...new Set(numbers)];
        const rows = unique.map(n => ({ fir_number: n, user_id: user.id, status: "available", societa_id: SOCIETA_ID }));
        supabase.from("fir_number_pool").insert(rows).then(({ error }) => {
            if (error) {
                toast.error("Errore: " + error.message);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-stats-impianto"] });
            toast.success(`✅ ${unique.length} numeri caricati`);
            setBulkInput("");
        });
    };
    const handleRequestFromRentri = async () => {
        setIsRequesting(true);
        try {
            const cfg = getTenantConfig("multy");
            const blockCode = cfg?.primaryBlock || "ZRZXR";
            const numIscrSito = cfg?.unitId;
            const result = await vidimaFIRAsync("multy", requestQty, blockCode, numIscrSito, (msg) => {
                toast.info(msg, { id: "vidimazione-progress" });
            });
            if (result.numeri.length > 0) {
                const realNumbers = result.numeri.filter((n) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
                if (realNumbers.length > 0) {
                    const rows = realNumbers.map((n) => ({ fir_number: n, user_id: user.id, status: "available", societa_id: SOCIETA_ID }));
                    const { error } = await supabase.from("fir_number_pool").insert(rows);
                    if (error)
                        throw error;
                    queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-stats-impianto"] });
                    toast.success(`✅ ${realNumbers.length} nuovi numeri ricevuti da RENTRI`);
                }
            }
            else if (result.pending) {
                toast.warning(`Richiesta accettata ma numeri non ancora pronti. Riprova tra qualche minuto.`);
            }
            else {
                toast.error("Nessun numero trovato nella risposta");
            }
        }
        catch (err) {
            toast.error(`Errore: ${err.message}`);
        }
        finally {
            setIsRequesting(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Database, { className: "h-6 w-6 text-emerald-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Totale" }), _jsx("p", { className: "text-xl font-bold text-emerald-400", children: stats?.total ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(CheckCircle, { className: "h-6 w-6 text-green-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Disponibili" }), _jsx("p", { className: "text-xl font-bold text-green-400", children: stats?.disponibili ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Clock, { className: "h-6 w-6 text-cyan-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "In Uso" }), _jsx("p", { className: "text-xl font-bold text-cyan-400", children: stats?.inUso ?? 0 })] })] }) }), _jsx(Card, { className: "bg-card/60 border-emerald-500/30", children: _jsxs(CardContent, { className: "p-4 flex items-center gap-3", children: [_jsx(Package, { className: "h-6 w-6 text-amber-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: "Consumati" }), _jsx("p", { className: "text-xl font-bold text-amber-400", children: stats?.usati ?? 0 })] })] }) })] }), _jsxs(Card, { className: "bg-card/60 border-emerald-500/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-emerald-400 flex items-center gap-2", children: [_jsx(Upload, { className: "h-5 w-5" }), " Carica Numeri nel Serbatoio"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx(Textarea, { value: bulkInput, onChange: (e) => setBulkInput(e.target.value), placeholder: "FMGWB001234\nFMGWB001235", rows: 3, className: "font-mono bg-card/60 border-border/50" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs text-muted-foreground font-mono", children: [bulkInput.split(/[,\n\r]+/).filter(n => n.trim()).length, " numeri"] }), _jsxs(Button, { onClick: handleBulkImport, disabled: !bulkInput.trim(), className: "gap-2 bg-emerald-600 hover:bg-emerald-700", children: [_jsx(Upload, { className: "h-4 w-4" }), " CARICA"] })] })] })] }), _jsxs(Card, { className: "bg-card/60 border-emerald-500/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-cyan-400 flex items-center gap-2", children: [_jsx(RefreshCw, { className: "h-5 w-5" }), " Richiedi Numeri a RENTRI"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [(stats?.disponibili ?? 0) === 0 && (_jsxs("div", { className: "flex items-center gap-2 text-amber-400 text-xs", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), " Serbatoio vuoto!"] })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm text-muted-foreground", children: "Quantit\u00E0:" }), _jsx("div", { className: "flex gap-2", children: [5, 10, 50, 100].map((q) => (_jsx(Button, { variant: requestQty === q ? "default" : "outline", size: "sm", onClick: () => setRequestQty(q), className: requestQty === q ? "bg-cyan-600" : "border-cyan-500/30 text-cyan-400", children: q }, q))) })] }), _jsxs(Button, { onClick: handleRequestFromRentri, disabled: isRequesting, className: "gap-2 bg-cyan-600 hover:bg-cyan-700", children: [isRequesting ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(RefreshCw, { className: "h-4 w-4" }), " RICHIEDI"] })] })] }), _jsxs(Card, { className: "bg-card/60 border-emerald-500/30", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-amber-400 flex items-center gap-2", children: [_jsx(Zap, { className: "h-5 w-5" }), " Test Invio RENTRI"] }) }), _jsxs(CardContent, { children: [_jsxs(Button, { onClick: async () => {
                                    setIsTesting(true);
                                    setTestResult(null);
                                    try {
                                        const health = await inviaOperazioneRentri({ cliente: "multy", tipo_operazione: "LISTA_BLOCCHI", payload: {} });
                                        if (!health.success) {
                                            setTestResult({ success: false, message: "❌ Server non raggiungibile" });
                                            setIsTesting(false);
                                            return;
                                        }
                                        const { data: poolNum } = await supabase.from("fir_number_pool").select("fir_number").eq("societa_id", SOCIETA_ID).eq("status", "available").limit(1).maybeSingle();
                                        if (!poolNum?.fir_number) {
                                            setTestResult({ success: false, message: "❌ Nessun numero FIR reale disponibile nel pool" });
                                            setIsTesting(false);
                                            return;
                                        }
                                        const result = await emissioneFir("multy", {
                                            numero_fir: poolNum.fir_number,
                                            produttore: { denominazione: "Test Srl", codice_fiscale: "00000000000", indirizzo: "Via Test 1, 10100 Torino (TO)" },
                                            destinatario: { denominazione: "Impianto Test Srl", codice_fiscale: "11111111111", indirizzo: "Via Prova 2, 10100 Torino (TO)" },
                                            trasportatore: { denominazione: "Trasporto Test Srl", codice_fiscale: "22222222222", albo: "TO/00001" },
                                            rifiuto: { codice_eer: "150101", descrizione: "Test impianto", stato_fisico: "solido non pulverulento", quantita: 10, unita_misura: "kg" },
                                        });
                                        setTestResult({ success: result.success, message: result.success ? "✅ Test superato" : "❌ Test fallito", details: JSON.stringify(result.data, null, 2) });
                                    }
                                    catch (err) {
                                        setTestResult({ success: false, message: "❌ " + err.message });
                                    }
                                    finally {
                                        setIsTesting(false);
                                    }
                                }, disabled: isTesting, variant: "outline", className: "gap-2 border-amber-500/30 text-amber-400", children: [isTesting ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Zap, { className: "h-4 w-4" }), " TEST RENTRI"] }), testResult && (_jsxs("div", { className: `mt-3 rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`, children: [_jsx("p", { className: `text-sm font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`, children: testResult.message }), testResult.details && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "text-xs text-muted-foreground cursor-pointer", children: "Log tecnico" }), _jsx("pre", { className: "mt-1 p-2 bg-card/60 rounded text-[10px] text-muted-foreground overflow-x-auto max-h-40 overflow-y-auto", children: testResult.details })] }))] }))] })] })] }));
}
