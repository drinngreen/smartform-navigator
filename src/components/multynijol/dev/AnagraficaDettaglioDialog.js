import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Building2, Truck, Hammer, ShieldCheck, FileText, Plus, Trash2, Upload, X, AlertTriangle, Loader2, Download, } from "lucide-react";
const TABS = [
    { id: "unita", label: "Unità Locali", icon: Building2 },
    { id: "targhe", label: "Targhe Mezzi", icon: Truck },
    { id: "cantieri", label: "Cantieri", icon: Hammer },
    { id: "autorizzazioni", label: "Autorizzazioni", icon: ShieldCheck },
    { id: "documenti", label: "Documenti", icon: FileText },
];
export function AnagraficaDettaglioDialog({ clienteId, clienteNome, tenantId, onClose }) {
    const [tab, setTab] = useState("unita");
    return (_jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4", onClick: onClose, children: _jsxs("div", { className: "bg-card border border-border/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border/30", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold", children: clienteNome }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Dettaglio anagrafica avanzato" })] }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-muted/30", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "flex gap-1 p-2 border-b border-border/30 overflow-x-auto", children: TABS.map(t => (_jsxs("button", { onClick: () => setTab(t.id), className: `flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap ${tab === t.id ? "bg-primary/20 text-primary border border-primary/40" : "text-muted-foreground hover:bg-muted/20"}`, children: [_jsx(t.icon, { className: "h-4 w-4" }), " ", t.label] }, t.id))) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [tab === "unita" && _jsx(UnitaLocaliTab, { clienteId: clienteId, tenantId: tenantId }), tab === "targhe" && _jsx(TargheTab, { clienteId: clienteId, tenantId: tenantId }), tab === "cantieri" && _jsx(CantieriTab, { clienteId: clienteId, tenantId: tenantId }), tab === "autorizzazioni" && _jsx(AutorizzazioniTab, { clienteId: clienteId, tenantId: tenantId }), tab === "documenti" && _jsx(DocumentiTab, { clienteId: clienteId, tenantId: tenantId })] })] }) }));
}
/* -------------------- generic helpers -------------------- */
function useCrud(table, clienteId) {
    const qc = useQueryClient();
    const list = useQuery({
        queryKey: [table, clienteId],
        queryFn: async () => {
            const { data, error } = await supabase.from(table).select("*").eq("cliente_id", clienteId).order("created_at", { ascending: false });
            if (error)
                throw error;
            return (data || []);
        },
    });
    const invalidate = () => qc.invalidateQueries({ queryKey: [table, clienteId] });
    const insert = useMutation({
        mutationFn: async (payload) => {
            const { error } = await supabase.from(table).insert(payload);
            if (error)
                throw error;
        },
        onSuccess: () => { invalidate(); toast.success("Salvato"); },
        onError: (e) => toast.error(e.message),
    });
    const del = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => { invalidate(); toast.success("Eliminato"); },
        onError: (e) => toast.error(e.message),
    });
    return { list, insert, del };
}
const inputCls = "w-full px-3 py-2 rounded-lg bg-background/60 border border-border/30 text-sm";
/* -------------------- Unità Locali -------------------- */
function UnitaLocaliTab({ clienteId, tenantId }) {
    const { list, insert, del } = useCrud("cliente_unita_locali", clienteId);
    const [form, setForm] = useState({ denominazione: "", indirizzo: "", comune: "", provincia: "", cap: "", note: "" });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsx("input", { placeholder: "Denominazione UL *", className: inputCls, value: form.denominazione, onChange: e => setForm({ ...form, denominazione: e.target.value }) }), _jsx("input", { placeholder: "Indirizzo", className: inputCls, value: form.indirizzo, onChange: e => setForm({ ...form, indirizzo: e.target.value }) }), _jsx("input", { placeholder: "Comune", className: inputCls, value: form.comune, onChange: e => setForm({ ...form, comune: e.target.value }) }), _jsx("input", { placeholder: "Prov", className: inputCls, value: form.provincia, onChange: e => setForm({ ...form, provincia: e.target.value }) }), _jsx("input", { placeholder: "CAP", className: inputCls, value: form.cap, onChange: e => setForm({ ...form, cap: e.target.value }) }), _jsx("input", { placeholder: "Note", className: inputCls, value: form.note, onChange: e => setForm({ ...form, note: e.target.value }) }), _jsxs("button", { onClick: () => {
                            if (!form.denominazione)
                                return toast.error("Denominazione obbligatoria");
                            insert.mutate({ ...form, cliente_id: clienteId, tenant_id: tenantId });
                            setForm({ denominazione: "", indirizzo: "", comune: "", provincia: "", cap: "", note: "" });
                        }, className: "col-span-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm", children: [_jsx(Plus, { className: "h-4 w-4" }), " Aggiungi UL"] })] }), _jsx(ItemList, { items: list.data || [], loading: list.isLoading, onDelete: del.mutate, render: (u) => (_jsxs(_Fragment, { children: [_jsx("strong", { className: "text-foreground", children: u.denominazione }), _jsx("span", { className: "text-muted-foreground text-xs", children: [u.indirizzo, u.comune, u.provincia, u.cap].filter(Boolean).join(" — ") })] })) })] }));
}
/* -------------------- Targhe -------------------- */
function TargheTab({ clienteId, tenantId }) {
    const { list, insert, del } = useCrud("cliente_targhe", clienteId);
    const [form, setForm] = useState({ targa: "", tipo_mezzo: "", conducente_default: "", note: "" });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsx("input", { placeholder: "Targa *", className: inputCls, value: form.targa, onChange: e => setForm({ ...form, targa: e.target.value.toUpperCase() }) }), _jsx("input", { placeholder: "Tipo mezzo", className: inputCls, value: form.tipo_mezzo, onChange: e => setForm({ ...form, tipo_mezzo: e.target.value }) }), _jsx("input", { placeholder: "Conducente default", className: inputCls, value: form.conducente_default, onChange: e => setForm({ ...form, conducente_default: e.target.value }) }), _jsx("input", { placeholder: "Note", className: inputCls, value: form.note, onChange: e => setForm({ ...form, note: e.target.value }) }), _jsxs("button", { onClick: () => {
                            if (!form.targa)
                                return toast.error("Targa obbligatoria");
                            insert.mutate({ ...form, cliente_id: clienteId, tenant_id: tenantId });
                            setForm({ targa: "", tipo_mezzo: "", conducente_default: "", note: "" });
                        }, className: "col-span-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm", children: [_jsx(Plus, { className: "h-4 w-4" }), " Aggiungi targa"] })] }), _jsx(ItemList, { items: list.data || [], loading: list.isLoading, onDelete: del.mutate, render: (t) => (_jsxs(_Fragment, { children: [_jsx("strong", { className: "text-foreground font-mono", children: t.targa }), _jsx("span", { className: "text-muted-foreground text-xs", children: [t.tipo_mezzo, t.conducente_default].filter(Boolean).join(" — ") })] })) })] }));
}
/* -------------------- Cantieri -------------------- */
function CantieriTab({ clienteId, tenantId }) {
    const { list, insert, del } = useCrud("cliente_cantieri", clienteId);
    const [form, setForm] = useState({ denominazione: "", indirizzo: "", comune: "", provincia: "" });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsx("input", { placeholder: "Cantiere *", className: inputCls, value: form.denominazione, onChange: e => setForm({ ...form, denominazione: e.target.value }) }), _jsx("input", { placeholder: "Indirizzo", className: inputCls, value: form.indirizzo, onChange: e => setForm({ ...form, indirizzo: e.target.value }) }), _jsx("input", { placeholder: "Comune", className: inputCls, value: form.comune, onChange: e => setForm({ ...form, comune: e.target.value }) }), _jsx("input", { placeholder: "Prov", className: inputCls, value: form.provincia, onChange: e => setForm({ ...form, provincia: e.target.value }) }), _jsxs("button", { onClick: () => {
                            if (!form.denominazione)
                                return toast.error("Denominazione obbligatoria");
                            insert.mutate({ ...form, cliente_id: clienteId, tenant_id: tenantId });
                            setForm({ denominazione: "", indirizzo: "", comune: "", provincia: "" });
                        }, className: "col-span-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm", children: [_jsx(Plus, { className: "h-4 w-4" }), " Aggiungi cantiere"] })] }), _jsx(ItemList, { items: list.data || [], loading: list.isLoading, onDelete: del.mutate, render: (c) => (_jsxs(_Fragment, { children: [_jsx("strong", { className: "text-foreground", children: c.denominazione }), _jsx("span", { className: "text-muted-foreground text-xs", children: [c.indirizzo, c.comune, c.provincia].filter(Boolean).join(" — ") })] })) })] }));
}
/* -------------------- Autorizzazioni -------------------- */
function AutorizzazioniTab({ clienteId, tenantId }) {
    const { list, insert, del } = useCrud("cliente_autorizzazioni", clienteId);
    const [form, setForm] = useState({ numero_autorizzazione: "", ente_rilascio: "", data_inizio: "", data_scadenza: "", tipo: "" });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsx("input", { placeholder: "Numero autorizzazione *", className: inputCls, value: form.numero_autorizzazione, onChange: e => setForm({ ...form, numero_autorizzazione: e.target.value }) }), _jsx("input", { placeholder: "Ente rilascio", className: inputCls, value: form.ente_rilascio, onChange: e => setForm({ ...form, ente_rilascio: e.target.value }) }), _jsx("input", { placeholder: "Tipo (es. Albo, RENTRI...)", className: inputCls, value: form.tipo, onChange: e => setForm({ ...form, tipo: e.target.value }) }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] uppercase text-muted-foreground", children: "Inizio" }), _jsx("input", { type: "date", className: inputCls, value: form.data_inizio, onChange: e => setForm({ ...form, data_inizio: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] uppercase text-muted-foreground", children: "Scadenza" }), _jsx("input", { type: "date", className: inputCls, value: form.data_scadenza, onChange: e => setForm({ ...form, data_scadenza: e.target.value }) })] }), _jsxs("button", { onClick: () => {
                            if (!form.numero_autorizzazione)
                                return toast.error("Numero obbligatorio");
                            insert.mutate({
                                ...form, cliente_id: clienteId, tenant_id: tenantId,
                                data_inizio: form.data_inizio || null, data_scadenza: form.data_scadenza || null,
                            });
                            setForm({ numero_autorizzazione: "", ente_rilascio: "", data_inizio: "", data_scadenza: "", tipo: "" });
                        }, className: "col-span-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm", children: [_jsx(Plus, { className: "h-4 w-4" }), " Aggiungi autorizzazione"] })] }), _jsx(ItemList, { items: list.data || [], loading: list.isLoading, onDelete: del.mutate, render: (a) => {
                    const scad = a.data_scadenza ? new Date(a.data_scadenza) : null;
                    const days = scad ? Math.floor((scad.getTime() - Date.now()) / (86400 * 1000)) : null;
                    const stato = days === null ? null : days < 0 ? "scaduta" : days < 30 ? "in-scadenza" : "valida";
                    const colors = {
                        "scaduta": "bg-red-500/20 border-red-500/40 text-red-300",
                        "in-scadenza": "bg-amber-500/20 border-amber-500/40 text-amber-300",
                        "valida": "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                    };
                    return (_jsxs(_Fragment, { children: [_jsx("strong", { className: "text-foreground font-mono", children: a.numero_autorizzazione }), _jsx("span", { className: "text-muted-foreground text-xs", children: [a.tipo, a.ente_rilascio].filter(Boolean).join(" — ") }), stato && (_jsxs("span", { className: `ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${colors[stato]}`, children: [stato === "scaduta" && _jsx(AlertTriangle, { className: "h-3 w-3" }), "Scad. ", new Date(a.data_scadenza).toLocaleDateString("it-IT"), " ", stato !== "valida" && `(${days}gg)`] }))] }));
                } })] }));
}
/* -------------------- Documenti scannerizzati -------------------- */
function DocumentiTab({ clienteId, tenantId }) {
    const { list, insert, del } = useCrud("cliente_documenti", clienteId);
    const [file, setFile] = useState(null);
    const [form, setForm] = useState({ tipo: "autorizzazione", descrizione: "", data_documento: "", data_scadenza: "" });
    const [uploading, setUploading] = useState(false);
    const upload = async () => {
        if (!file)
            return toast.error("Seleziona un file");
        setUploading(true);
        try {
            const ext = file.name.split(".").pop();
            const path = `${clienteId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error: upErr } = await supabase.storage.from("documenti_cliente").upload(path, file, { upsert: false, contentType: file.type });
            if (upErr)
                throw upErr;
            const { data: signed } = await supabase.storage.from("documenti_cliente").createSignedUrl(path, 60 * 60 * 24 * 365);
            insert.mutate({
                cliente_id: clienteId, tenant_id: tenantId,
                tipo: form.tipo, descrizione: form.descrizione || file.name,
                file_url: signed?.signedUrl || "", storage_path: path, mime_type: file.type,
                data_documento: form.data_documento || null, data_scadenza: form.data_scadenza || null,
            });
            setFile(null);
            setForm({ tipo: "autorizzazione", descrizione: "", data_documento: "", data_scadenza: "" });
        }
        catch (e) {
            toast.error(e.message);
        }
        finally {
            setUploading(false);
        }
    };
    const openDoc = async (doc) => {
        if (!doc.storage_path)
            return window.open(doc.file_url, "_blank");
        const { data } = await supabase.storage.from("documenti_cliente").createSignedUrl(doc.storage_path, 60 * 5);
        if (data?.signedUrl)
            window.open(data.signedUrl, "_blank");
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsxs("select", { className: inputCls, value: form.tipo, onChange: e => setForm({ ...form, tipo: e.target.value }), children: [_jsx("option", { value: "autorizzazione", children: "Autorizzazione" }), _jsx("option", { value: "analisi_metalli", children: "Analisi Metalli" }), _jsx("option", { value: "analisi_liquidi", children: "Analisi Liquidi" }), _jsx("option", { value: "contratto", children: "Contratto" }), _jsx("option", { value: "altro", children: "Altro" })] }), _jsx("input", { placeholder: "Descrizione", className: inputCls, value: form.descrizione, onChange: e => setForm({ ...form, descrizione: e.target.value }) }), _jsx("input", { type: "file", accept: "application/pdf,image/*", className: inputCls, onChange: e => setFile(e.target.files?.[0] || null) }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] uppercase text-muted-foreground", children: "Data documento" }), _jsx("input", { type: "date", className: inputCls, value: form.data_documento, onChange: e => setForm({ ...form, data_documento: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] uppercase text-muted-foreground", children: "Scadenza" }), _jsx("input", { type: "date", className: inputCls, value: form.data_scadenza, onChange: e => setForm({ ...form, data_scadenza: e.target.value }) })] }), _jsxs("button", { onClick: upload, disabled: uploading, className: "col-span-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm disabled:opacity-50", children: [uploading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Upload, { className: "h-4 w-4" }), "Carica documento"] })] }), _jsx(ItemList, { items: list.data || [], loading: list.isLoading, onDelete: del.mutate, render: (d) => (_jsxs(_Fragment, { children: [_jsx("strong", { className: "text-foreground", children: d.descrizione || d.storage_path }), _jsxs("span", { className: "text-muted-foreground text-xs", children: [d.tipo, d.data_scadenza ? ` — scade ${new Date(d.data_scadenza).toLocaleDateString("it-IT")}` : ""] }), _jsxs("button", { onClick: () => openDoc(d), className: "ml-2 inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200", children: [_jsx(Download, { className: "h-3 w-3" }), " Apri"] })] })) })] }));
}
/* -------------------- reusable list -------------------- */
function ItemList({ items, loading, onDelete, render }) {
    if (loading)
        return _jsxs("div", { className: "p-6 flex items-center justify-center text-muted-foreground gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Caricamento..."] });
    if (!items.length)
        return _jsx("div", { className: "p-6 text-center text-muted-foreground text-sm", children: "Nessun elemento" });
    return (_jsx("div", { className: "divide-y divide-border/20 rounded-xl border border-border/30 bg-background/30", children: items.map(it => (_jsxs("div", { className: "flex items-center justify-between gap-3 p-3", children: [_jsx("div", { className: "flex flex-wrap items-center gap-2 flex-1 min-w-0 text-sm", children: render(it) }), _jsx("button", { onClick: () => confirm("Eliminare?") && onDelete(it.id), className: "p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }, it.id))) }));
}
