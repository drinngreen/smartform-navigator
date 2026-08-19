import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { FirQrCode } from "@/components/fir/FirQrCode";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { revertFirFromRegistryAndInventory } from "@/lib/firFinalSync";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Trash2, Receipt, BadgeEuro, } from "lucide-react";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { NuovaFatturaDialog } from "@/components/fatturazione/NuovaFatturaDialog";
import { FatturaViewerDialog } from "@/components/fatturazione/FatturaViewerDialog";
const normalizeCf = (v) => (v || "").toString().replace(/\s+/g, "").toUpperCase();
const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
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
export function DevFormulariList({ tenantId, mnContext, fallbackTenantId, accent = "emerald", title = "Formulari FIR", filterByTrasportatoreCf, crossTenantId, crossTransporterCf, }) {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [viewDialog, setViewDialog] = useState({ open: false, form: null });
    const [editorMode, setEditorMode] = useState("standard");
    const [fatturaFrom, setFatturaFrom] = useState(null);
    const [viewFatturaId, setViewFatturaId] = useState(null);
    const editorStorageKey = `dev-fir-editor:${tenantId}:${mnContext}`;
    // Per Conto Proprio: auto-rileva il ruolo Multyproget (CF filtro) nel FIR per decidere l'impatto giacenze.
    // - Multy = destinatario  -> CARICO  (rifiuto entra nell'impianto Multy)
    // - Multy = produttore    -> SCARICO (rifiuto esce dall'impianto Multy)
    // - né l'uno né l'altro   -> nessun impatto (solo trasporto per terzi)
    const detectMovement = (form) => {
        if (!form || !filterByTrasportatoreCf)
            return null;
        const target = normalizeCf(filterByTrasportatoreCf);
        const isDest = normalizeCf(form.destinatario_codice_fiscale) === target;
        const isProd = normalizeCf(form.produttore_codice_fiscale) === target;
        if (isDest)
            return "Carico";
        if (isProd)
            return "Scarico";
        return null;
    };
    const detectedMovement = detectMovement(viewDialog.form);
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
    const { data: forms = [], isLoading, refetch } = useQuery({
        queryKey: ["dev-formulari-list", tenantId, fallbackTenantId, crossTenantId, crossTransporterCf],
        queryFn: async () => {
            const loadForms = async (tid) => {
                const { data, error } = await supabase.functions.invoke("admin-user-manage", {
                    body: { action: "list_fir_forms", tenant_id: tid },
                });
                if (error)
                    throw error;
                if (data?.error)
                    throw new Error(data.error);
                return data.forms || [];
            };
            const main = await loadForms(tenantId);
            let base = main;
            if (main.length === 0 && fallbackTenantId) {
                base = await loadForms(fallbackTenantId);
            }
            if (crossTenantId && crossTransporterCf) {
                const cf = normalizeCf(crossTransporterCf);
                const cross = await loadForms(crossTenantId);
                const extras = cross.filter((f) => normalizeCf(f.trasportatore_codice_fiscale) === cf);
                const seen = new Set(base.map((f) => f.id));
                for (const f of extras)
                    if (!seen.has(f.id))
                        base.push({ ...f, _cross_tenant: true });
            }
            return base;
        },
    });
    // Fatture già collegate ai formulari (per "pescarla" direttamente dalla riga)
    const firIds = forms.map((f) => f.id);
    const { data: fattureByFir = {}, refetch: refetchFatture } = useQuery({
        queryKey: ["dev-formulari-fatture", firIds.join(",")],
        enabled: firIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("fatture_righe")
                .select("fir_form_id, fattura_id, fatture!inner(id,numero,anno,stato)")
                .in("fir_form_id", firIds);
            if (error)
                throw error;
            const map = {};
            for (const r of (data || [])) {
                if (r.fir_form_id && !map[r.fir_form_id])
                    map[r.fir_form_id] = r.fatture || { id: r.fattura_id };
            }
            return map;
        },
    });
    const buildRigaFromFir = (form) => {
        const fd = form.form_data || {};
        const cer = String(firstValue(form.codice_eer, fd.cer, fd.codice_eer, fd.codiceEER) || "");
        const qta = Number(firstValue(fd.quantita_destino, fd.peso_ricevuto, form.quantita, fd.quantita_origine, fd.quantita_partenza, fd.quantita) || 0);
        return {
            descrizione: `Smaltimento CER ${cer} - FIR ${form.numero_fir || ""}`.trim(),
            cer,
            fir_form_id: form.id,
            numero_fir: form.numero_fir || "",
            quantita: qta || 1,
            unita_misura: String(firstValue(form.unita_misura, fd.unita_misura, fd.unitaMisura) || "kg"),
            prezzo_unitario: 0,
            aliquota_iva: 22,
            reverse_charge: false,
            tipo_riga: "servizio",
        };
    };
    const openFatturaFromFir = async (form) => {
        const fd = form.form_data || {};
        const cf = normalizeCf(firstValue(form.produttore_codice_fiscale, fd.produttore_codice_fiscale, fd.produttoreCodiceFiscale));
        let clienteFallback = undefined;
        if (cf) {
            const { data } = await supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,partita_iva,codice_fiscale,indirizzo,citta,cap,provincia,codice_destinatario")
                .or(`codice_fiscale.eq.${cf},partita_iva.eq.${cf}`)
                .limit(1)
                .maybeSingle();
            if (data)
                clienteFallback = data;
        }
        setFatturaFrom({ righe: [buildRigaFromFir(form)], clienteFallback });
    };
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
        // Il ripristino deve avvenire solo quando arrivano i formulari.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forms]);
    const handleDeleteForm = async (form) => {
        if (!form)
            return;
        if (!window.confirm(`Eliminare dalla vista il FIR ${form.numero_fir || "senza numero"}? I dati restano recuperabili nel database.`))
            return;
        try {
            // Le giacenze tornano al valore precedente al formulario.
            await revertFirFromRegistryAndInventory(form.id);
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
            .channel(`dev-formulari-list-${tenantId}-${mnContext}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { void handleFormSaved(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId, mnContext, viewDialog.form?.id]);
    const cfFilter = normalizeCf(filterByTrasportatoreCf);
    const sourceForms = cfFilter
        ? forms.filter((f) => {
            const cf = normalizeCf(f.trasportatore_codice_fiscale);
            // Le bozze appena create (numero manuale, nessun dato compilato) non hanno
            // ancora il trasportatore: devono restare visibili altrimenti "spariscono".
            if (!cf)
                return f.status === "bozza" || f.status === "draft";
            return cf === cfFilter;
        })
        : forms;
    const filtered = sourceForms.filter((f) => {
        const q = search.toLowerCase();
        const matchSearch = f.numero_fir?.toLowerCase().includes(q) ||
            String(firstValue(f.codice_eer, f.form_data?.cer, f.form_data?.codice_eer, f.form_data?.codiceEER) || "").toLowerCase().includes(q) ||
            String(firstValue(f.produttore_denominazione, f.form_data?.produttore_denominazione, f.form_data?.produttoreDenominazione) || "").toLowerCase().includes(q) ||
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
        total: sourceForms.length,
        draft: sourceForms.filter((f) => f.status === "draft" || f.status === "bozza").length,
        submitted: sourceForms.filter((f) => f.status === "submitted" || f.status === "inviato").length,
        completed: sourceForms.filter((f) => f.status === "completed" || f.status === "completato").length,
    };
    const txt = `text-${accent}-400`;
    const border = `border-${accent}-500/30`;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: `flex items-center gap-2 ${txt}`, children: [_jsx(FileText, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm font-medium", children: title })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [
                    { label: "Totale", value: stats.total, icon: FileText, color: txt },
                    { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
                    { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
                    { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
                ].map((s) => (_jsx(Card, { className: `bg-card/60 ${border}`, children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(s.icon, { className: `h-4 w-4 ${s.color}` }), _jsx("span", { className: "text-xs text-muted-foreground uppercase", children: s.label })] }), _jsx("span", { className: "text-2xl font-bold text-foreground", children: s.value })] }) }, s.label))) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "Cerca FIR, CER, produttore...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10 bg-card/60 border-border/30" })] }), _jsx(Button, { variant: "outline", size: "icon", onClick: () => refetch(), disabled: isLoading, className: `${border} ${txt}`, children: _jsx(RefreshCw, { className: `h-4 w-4 ${isLoading ? "animate-spin" : ""}` }) })] }), _jsx("div", { className: "flex gap-2 flex-wrap", children: ["all", "draft", "submitted", "completed"].map((t) => (_jsx(Button, { variant: tab === t ? "default" : "outline", size: "sm", onClick: () => setTab(t), className: tab === t ? `bg-${accent}-600 hover:bg-${accent}-700` : `${border} ${txt}`, children: t === "all" ? `Tutti (${stats.total})` : t === "draft" ? `Bozze (${stats.draft})` : t === "submitted" ? `Inviati (${stats.submitted})` : `Completati (${stats.completed})` }, t))) }), isLoading ? (_jsx("div", { className: "flex items-center justify-center py-12", children: _jsx(Loader2, { className: `h-8 w-8 animate-spin ${txt}` }) })) : (_jsx(Card, { className: "bg-card/60 border-border/30", children: _jsx(CardContent, { className: "p-0", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border/30 text-muted-foreground", children: [_jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Stato" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "N\u00B0 FIR" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "CER" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Produttore" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Destinatario" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Trasportatore" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Q. Partenza" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Q. Destino" }), _jsx("th", { className: "text-left p-3 text-xs uppercase", children: "Data" }), _jsx("th", { className: "text-right p-3 text-xs uppercase", children: "Azioni" })] }) }), _jsxs("tbody", { children: [filtered.map((form) => {
                                            const fd = form.form_data || {};
                                            const cer = firstValue(form.codice_eer, fd.cer, fd.codice_eer, fd.codiceEER) || "—";
                                            const um = firstValue(form.unita_misura, fd.unita_misura, fd.unitaMisura) || "kg";
                                            const qPartenza = firstValue(form.quantita, fd.quantita_origine, fd.quantita_partenza, fd.quantita, fd.peso_partenza);
                                            const qDestino = firstValue(fd.quantita_destino, fd.peso_ricevuto, fd.pesoRicevuto, fd.quantita_arrivo, fd.quantita_accettata);
                                            const produttore = firstValue(form.produttore_denominazione, fd.produttore_denominazione, fd.produttoreDenominazione) || "—";
                                            const destinatario = firstValue(form.destinatario_denominazione, fd.destinatario_denominazione, fd.destinatarioDenominazione) || "—";
                                            const trasportatore = firstValue(form.trasportatore_denominazione, fd.trasportatore_denominazione, fd.trasportatoreDenominazione) || "—";
                                            const dataRaw = firstValue(fd.data_emissione, fd.dataEmissione, form.data_partenza, fd.data_partenza, form.data_arrivo, fd.data_arrivo);
                                            const missingDestino = form.status === "completato" && (qDestino === null || qDestino === undefined || qDestino === "" || Number(qDestino) === 0);
                                            return (_jsxs("tr", { title: missingDestino ? "Peso a destino mancante" : undefined, className: `border-b border-border/10 ${missingDestino ? "bg-amber-500/15 hover:bg-amber-500/25 border-l-4 border-l-amber-400" : "hover:bg-white/5"}`, children: [_jsx("td", { className: "p-3", children: _jsx(Badge, { variant: form.status === "completato" ? "default" : "secondary", className: "text-xs", children: form.status }) }), _jsxs("td", { className: `p-3 font-mono`, children: [form.numero_fir || "—", form._cross_tenant && _jsx("span", { className: "ml-2 text-[10px] uppercase text-fuchsia-300 border border-fuchsia-500/40 rounded px-1 py-0.5", children: "cross" })] }), _jsx("td", { className: "p-3 font-mono", children: String(cer) }), _jsx("td", { className: "p-3", children: String(produttore) }), _jsx("td", { className: "p-3", children: String(destinatario) }), _jsx("td", { className: "p-3", children: String(trasportatore) }), _jsx("td", { className: "p-3 font-mono", children: qPartenza != null && qPartenza !== "" ? `${qPartenza} ${um}` : "—" }), _jsx("td", { className: "p-3 font-mono", children: qDestino != null && qDestino !== "" ? `${qDestino} ${um}` : "—" }), _jsx("td", { className: "p-3 text-muted-foreground text-xs", children: formatFirDate(dataRaw) }), _jsxs("td", { className: "p-3 text-right", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => openEditor(form, "standard"), className: `gap-1 ${form.status === "bozza" || form.status === "draft" ? txt : "text-muted-foreground"}`, children: [_jsx(Edit, { className: "h-3 w-3" }), form.status === "bozza" || form.status === "draft" ? "Standard" : "Visualizza Standard"] }), (form.status === "bozza" || form.status === "draft") && (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => openEditor(form, "alternative"), className: "gap-1 text-amber-400", children: [_jsx(Edit, { className: "h-3 w-3" }), "Alternativo"] })), fattureByFir[form.id] ? (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setViewFatturaId(fattureByFir[form.id].id), className: "gap-1 text-blue-300 hover:bg-blue-500/10", title: "Apri la fattura collegata", children: [_jsx(BadgeEuro, { className: "h-3 w-3" }), "Fattura ", fattureByFir[form.id].numero
                                                                        ? `${fattureByFir[form.id].numero}/${fattureByFir[form.id].anno}`
                                                                        : ""] })) : (_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => void openFatturaFromFir(form), className: "gap-1 text-emerald-300 hover:bg-emerald-500/10", title: "Crea e invia fattura da questo formulario", children: [_jsx(Receipt, { className: "h-3 w-3" }), "Fattura"] })), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void handleDeleteForm(form), className: "gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10", title: "Elimina riga", children: _jsx(Trash2, { className: "h-3 w-3" }) })] })] }, form.id));
                                        }), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 10, className: "p-8 text-center text-muted-foreground", children: "Nessun formulario trovato" }) }))] })] }) }) }) })), _jsx(Dialog, { open: viewDialog.open, onOpenChange: (o) => { if (!o)
                    closeEditor(); }, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50", children: [_jsx(DialogHeader, { children: _jsxs(DialogTitle, { className: "flex items-center gap-2 font-display tracking-wider", children: [_jsx(FileText, { className: `h-5 w-5 ${txt}` }), viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza", " FIR \u2014 ", viewDialog.form?.numero_fir || "N/D"] }) }), viewDialog.form && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [_jsxs("button", { type: "button", onClick: () => changeEditorMode("standard"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "standard" ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Standard" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Formulario completo classico" })] }), _jsxs("button", { type: "button", onClick: () => changeEditorMode("alternative"), className: `rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "alternative" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`, children: [_jsx("span", { className: "block text-sm font-semibold", children: "Modulo Alternativo" }), _jsx("span", { className: "block text-xs text-muted-foreground", children: "Editor su template FIR" })] })] }), viewDialog.form.numero_fir && (_jsxs("div", { className: "mb-3 flex items-center gap-4 rounded-md border border-border/40 bg-background/40 p-3", children: [_jsx(FirQrCode, { numero_fir: viewDialog.form.numero_fir, cer: viewDialog.form.cer || viewDialog.form.codice_eer, produttore: viewDialog.form.produttore_denominazione, trasportatore: viewDialog.form.trasportatore_denominazione, destinatario: viewDialog.form.destinatario_denominazione, quantita: viewDialog.form.quantita || viewDialog.form.quantita_kg, data_partenza: viewDialog.form.data_trasporto || viewDialog.form.data_partenza }), _jsxs("div", { className: "text-xs text-muted-foreground", children: [_jsx("div", { className: "font-semibold text-foreground mb-1", children: "QR code per i controlli su strada" }), "Contiene numero FIR e dati sintetici (EER, produttore, trasportatore, destinatario, quantit\u00E0, data). Stampa in formato 28\u00D728 mm."] })] })), editorMode === "alternative" ? (_jsx(FIRAlternativeForm, { firFormId: viewDialog.form.id, presetNumeroFir: viewDialog.form.numero_fir || undefined, assignedUserId: viewDialog.form.user_id || undefined, draftData: viewDialog.form, registryMovementType: detectedMovement || undefined, onSaved: handleFormSaved }, `alt-${viewDialog.form.id}`)) : (_jsx(MNFIRFormComplete, { tenantId: tenantId, mnContext: mnContext, firFormId: viewDialog.form.id, draftData: viewDialog.form, enableFatturazione: true }, `std-${viewDialog.form.id}`))] })), viewDialog.form && (_jsxs("div", { className: "sticky bottom-0 mt-4 space-y-3 border-t border-border/30 bg-card/95 pt-3", children: [editorMode === "alternative" && filterByTrasportatoreCf && (_jsxs("div", { className: "text-xs px-3 py-2 rounded-md border border-border/30 bg-background/40", children: [_jsx("span", { className: "text-muted-foreground uppercase tracking-wider mr-2", children: "Impatto giacenze impianto Multyproget:" }), detectedMovement === "Carico" && (_jsx("span", { className: "text-emerald-300 font-semibold", children: "CARICO automatico (Multyproget \u00E8 destinatario)" })), detectedMovement === "Scarico" && (_jsx("span", { className: "text-amber-300 font-semibold", children: "SCARICO automatico (Multyproget \u00E8 produttore)" })), !detectedMovement && (_jsx("span", { className: "text-muted-foreground italic", children: "Nessun impatto \u2014 Multyproget non \u00E8 n\u00E9 produttore n\u00E9 destinatario (solo trasporto per terzi)" }))] })), _jsxs("div", { className: "flex justify-between items-center gap-2", children: [_jsxs(Button, { variant: "destructive", className: "gap-2", onClick: () => void handleDeleteForm(viewDialog.form), children: [_jsx(Trash2, { className: "h-4 w-4" }), " Elimina formulario"] }), _jsxs("div", { className: "flex gap-2", children: [fattureByFir[viewDialog.form.id] ? (_jsxs(Button, { variant: "outline", className: "gap-2 text-blue-300 border-blue-500/40", onClick: () => setViewFatturaId(fattureByFir[viewDialog.form.id].id), children: [_jsx(BadgeEuro, { className: "h-4 w-4" }), " Apri fattura"] })) : (_jsxs(Button, { variant: "outline", className: "gap-2 text-emerald-300 border-emerald-500/40", onClick: () => void openFatturaFromFir(viewDialog.form), children: [_jsx(Receipt, { className: "h-4 w-4" }), " Fattura questo FIR"] })), _jsx(Button, { variant: "outline", onClick: () => window.dispatchEvent(new Event("dev-fir-save-draft")), children: "\uD83D\uDCBE Salva bozza" }), editorMode === "alternative" && (_jsxs(Button, { className: "bg-emerald-600 hover:bg-emerald-700", onClick: () => window.dispatchEvent(new Event("dev-fir-save-final")), title: detectedMovement ? `Salva e registra ${detectedMovement} in giacenza` : "Salva senza impatto giacenze", children: ["\u2705 Salva DEFINITIVO ", detectedMovement ? `(${detectedMovement} giacenze)` : "(no giacenze)"] }))] })] })] }))] }) }), fatturaFrom && (_jsx(NuovaFatturaDialog, { tenantId: tenantId, preselectedRighe: fatturaFrom.righe, clienteId: fatturaFrom.clienteFallback?.id, clienteFallback: fatturaFrom.clienteFallback, onClose: () => setFatturaFrom(null), onCreated: () => { setFatturaFrom(null); void refetchFatture(); } })), viewFatturaId && (_jsx(FatturaViewerDialog, { fatturaId: viewFatturaId, onClose: () => setViewFatturaId(null) }))] }));
}
