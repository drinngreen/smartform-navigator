import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { X, Plus, Trash2, Save, AlertTriangle, Search, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { inviaFatturaASibill } from "@/lib/sibill";
const CER_REVERSE_CHARGE = new Set(["170405", "191202", "191203"]); // metalli ferrosi/non-ferrosi tipici RC art.74
export function NuovaFatturaDialog({ tenantId, onClose, onCreated, preselectedFirIds, preselectedRighe, clienteId: initialClienteId, clienteFallback }) {
    const [clienteSearch, setClienteSearch] = useState("");
    const [clienteId, setClienteId] = useState(initialClienteId || null);
    const [unitaLocale, setUnitaLocale] = useState("");
    const [dataEmissione, setDataEmissione] = useState(new Date().toISOString().slice(0, 10));
    const [note, setNote] = useState("");
    const [righe, setRighe] = useState(preselectedRighe && preselectedRighe.length ? preselectedRighe : [emptyRiga()]);
    const [saving, setSaving] = useState(false);
    const [showFirPicker, setShowFirPicker] = useState(false);
    const { data: clienti = [] } = useQuery({
        queryKey: ["fatture-clienti", tenantId, clienteSearch],
        queryFn: async () => {
            let q = supabase.from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,partita_iva,codice_fiscale,indirizzo,citta,cap,provincia,codice_destinatario")
                .eq("cliente", true)
                .order("ragione_sociale")
                .limit(50);
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            if (clienteSearch)
                q = q.ilike("ragione_sociale", `%${clienteSearch}%`);
            const { data, error } = await q;
            if (error)
                throw error;
            return (data || []);
        },
        enabled: !initialClienteId,
    });
    const { data: clienteSelezionato } = useQuery({
        queryKey: ["fatture-cliente", clienteId],
        queryFn: async () => {
            if (!clienteId)
                return null;
            const { data, error } = await supabase.from("anagrafica_aziende_mp")
                .select("*").eq("id", clienteId).maybeSingle();
            if (error)
                throw error;
            return data;
        },
        enabled: !!clienteId,
    });
    const { data: firsDisponibili = [] } = useQuery({
        queryKey: ["fatture-firs", tenantId],
        queryFn: async () => {
            let q = supabase.from("fir_forms")
                .select("id,numero_fir,form_data,cer,quantita_partenza,quantita_arrivo,destinatario_denominazione,produttore_denominazione,updated_at")
                .eq("status", "completato")
                .order("updated_at", { ascending: false })
                .limit(200);
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            const { data, error } = await q;
            if (error)
                throw error;
            return (data || []);
        },
        enabled: showFirPicker,
    });
    const { data: erpIva = [] } = useQuery({
        queryKey: ["erp-iva", tenantId],
        queryFn: async () => {
            let q = supabase.from("erp_codici_iva").select("codice,descrizione,aliquota,natura").eq("attivo", true);
            if (tenantId)
                q = q.eq("tenant_id", tenantId);
            const { data } = await q;
            return (data || []);
        },
    });
    const cliente = clienteSelezionato || clienteFallback;
    const hasPIva = !!cliente?.partita_iva;
    useEffect(() => {
        // Auto-check reverse charge in base al CER
        setRighe(r => r.map(x => ({ ...x, reverse_charge: CER_REVERSE_CHARGE.has(x.cer.replace(/\s/g, "")) || x.reverse_charge })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const totals = useMemo(() => {
        let imp = 0, iva = 0;
        for (const r of righe) {
            const rowImp = Number(r.quantita || 0) * Number(r.prezzo_unitario || 0);
            const rowIva = r.reverse_charge ? 0 : rowImp * (Number(r.aliquota_iva || 0) / 100);
            imp += rowImp;
            iva += rowIva;
        }
        return { imponibile: imp, iva, totale: imp + iva };
    }, [righe]);
    const addRiga = () => setRighe(r => [...r, emptyRiga()]);
    const rmRiga = (i) => setRighe(r => r.filter((_, idx) => idx !== i));
    const updRiga = (i, patch) => setRighe(r => r.map((x, idx) => idx === i ? { ...x, ...patch } : x));
    const addFirAsRiga = (fir) => {
        const cer = fir.cer || fir.form_data?.cer || "";
        const q = Number(fir.quantita_partenza || fir.quantita_arrivo || fir.form_data?.quantita || 0);
        setRighe(r => [...r, {
                descrizione: `Smaltimento CER ${cer} - FIR ${fir.numero_fir || ""}`.trim(),
                cer,
                fir_form_id: fir.id,
                numero_fir: fir.numero_fir || "",
                quantita: q || 1,
                unita_misura: "kg",
                prezzo_unitario: 0,
                aliquota_iva: 22,
                reverse_charge: CER_REVERSE_CHARGE.has(cer.replace(/\s/g, "")),
                tipo_riga: "servizio",
            }]);
        setShowFirPicker(false);
    };
    const doSalva = async (sendToSibill = false) => {
        if (!tenantId) {
            toast.error("Tenant mancante");
            return null;
        }
        if (!cliente) {
            toast.error("Selezionare un cliente");
            return null;
        }
        if (!hasPIva) {
            toast.error("Partita IVA cliente mancante: aggiornare l'anagrafica prima di fatturare");
            return null;
        }
        if (righe.length === 0 || righe.every(r => !r.descrizione)) {
            toast.error("Aggiungere almeno una riga");
            return null;
        }
        const anno = new Date(dataEmissione).getFullYear();
        const { data: numRes, error: numErr } = await supabase.rpc("next_fattura_number", { p_tenant_id: tenantId, p_anno: anno });
        if (numErr)
            throw numErr;
        const numero = numRes;
        const rc = righe.every(r => r.reverse_charge);
        const { data: fatt, error: fErr } = await supabase.from("fatture").insert({
            tenant_id: tenantId,
            numero, anno,
            data_emissione: dataEmissione,
            cliente_id: cliente.id,
            cliente_ragione_sociale: cliente.ragione_sociale,
            cliente_partita_iva: cliente.partita_iva,
            cliente_codice_fiscale: cliente.codice_fiscale,
            cliente_indirizzo: [cliente.indirizzo, cliente.cap, cliente.citta, cliente.provincia].filter(Boolean).join(" "),
            cliente_unita_locale: unitaLocale || null,
            tipo: righe.some(r => r.tipo_riga === "noleggio") ? "noleggio" : "servizi",
            stato: sendToSibill ? "inviata" : "cortesia",
            imponibile: totals.imponibile,
            iva: totals.iva,
            totale: totals.totale,
            reverse_charge: rc,
            note,
        }).select().single();
        if (fErr)
            throw fErr;
        const righeInsert = righe.map((r, i) => ({
            fattura_id: fatt.id,
            ordine: i,
            descrizione: r.descrizione,
            cer: r.cer || null,
            fir_form_id: r.fir_form_id,
            numero_fir: r.numero_fir || null,
            quantita: r.quantita,
            unita_misura: r.unita_misura,
            prezzo_unitario: r.prezzo_unitario,
            imponibile: Number(r.quantita) * Number(r.prezzo_unitario),
            aliquota_iva: r.reverse_charge ? 0 : r.aliquota_iva,
            iva: r.reverse_charge ? 0 : Number(r.quantita) * Number(r.prezzo_unitario) * (Number(r.aliquota_iva) / 100),
            totale: Number(r.quantita) * Number(r.prezzo_unitario) * (r.reverse_charge ? 1 : 1 + Number(r.aliquota_iva) / 100),
            reverse_charge: r.reverse_charge,
            tipo_riga: r.tipo_riga,
        }));
        const { error: rErr } = await supabase.from("fatture_righe").insert(righeInsert);
        if (rErr)
            throw rErr;
        return { fattura: fatt, numero, anno };
    };
    const salva = async () => {
        setSaving(true);
        try {
            const res = await doSalva(false);
            if (!res)
                return;
            toast.success(`Fattura ${res.numero}/${res.anno} creata in Cortesia`);
            onCreated();
        }
        catch (e) {
            toast.error(e.message || "Errore salvataggio");
        }
        finally {
            setSaving(false);
        }
    };
    const salvaEInviaSibill = async () => {
        setSaving(true);
        let res = null;
        try {
            res = await doSalva(true);
            if (!res)
                return;
            toast.info(`Fattura ${res.numero}/${res.anno} creata, invio a Sibill in corso...`);
            await inviaFatturaASibill(res.fattura);
            toast.success(`Fattura ${res.numero}/${res.anno} trasmessa a Sibill`);
            onCreated();
        }
        catch (e) {
            toast.error(e.message || "Errore invio a Sibill", { duration: 8000 });
            if (res?.fattura?.id) {
                try {
                    await supabase.from("fatture").update({ stato: "cortesia" }).eq("id", res.fattura.id);
                }
                catch { }
            }
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/40 shadow-2xl", children: [_jsxs("div", { className: "sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border/30 bg-card", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Nuova Fattura di Cortesia" }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-muted/20", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "p-6 space-y-5", children: [_jsxs("section", { children: [_jsx("label", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Cliente" }), !initialClienteId ? (_jsxs("div", { className: "relative mt-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), _jsx("input", { value: clienteSearch, onChange: e => { setClienteSearch(e.target.value); setClienteId(null); }, placeholder: "Cerca cliente...", className: "w-full pl-10 pr-4 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" }), clienteSearch && !clienteId && clienti.length > 0 && (_jsx("div", { className: "absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-card border border-border/40 shadow-xl", children: clienti.map(c => (_jsxs("button", { onClick: () => { setClienteId(c.id); setClienteSearch(c.ragione_sociale); }, className: "w-full text-left px-3 py-2 hover:bg-muted/20 text-sm border-b border-border/10 last:border-0", children: [_jsx("div", { className: "font-medium", children: c.ragione_sociale }), _jsxs("div", { className: "text-xs text-muted-foreground", children: ["P.IVA: ", c.partita_iva || "—", " \u00B7 ", c.citta || ""] })] }, c.id))) }))] })) : null, cliente && (_jsxs("div", { className: `mt-2 p-3 rounded-xl border text-sm ${hasPIva ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/10 border-red-500/40"}`, children: [_jsx("div", { className: "font-semibold", children: cliente.ragione_sociale }), _jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [cliente.indirizzo, " \u00B7 ", cliente.citta, " (", cliente.provincia, ") \u00B7 CF: ", cliente.codice_fiscale || "—"] }), !hasPIva && (_jsxs("div", { className: "mt-2 flex items-start gap-2 text-red-300 text-xs", children: [_jsx(AlertTriangle, { className: "h-4 w-4 mt-0.5" }), _jsxs("div", { children: [_jsx("strong", { children: "Partita IVA mancante." }), " Aggiornare l'anagrafica dell'impianto/cliente prima di generare la fattura."] })] })), _jsx("input", { value: unitaLocale, onChange: e => setUnitaLocale(e.target.value), placeholder: "Unit\u00E0 locale (facoltativa)", className: "mt-2 w-full px-3 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" })] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Data emissione" }), _jsx("input", { type: "date", value: dataEmissione, onChange: e => setDataEmissione(e.target.value), className: "mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Note" }), _jsx("input", { value: note, onChange: e => setNote(e.target.value), className: "mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-border/30 text-sm" })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("label", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: "Righe fattura" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowFirPicker(v => !v), className: "text-xs px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25", children: "Da Formulario" }), _jsxs("button", { onClick: addRiga, className: "text-xs px-3 py-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 flex items-center gap-1", children: [_jsx(Plus, { className: "h-3 w-3" }), "Riga libera"] })] })] }), showFirPicker && (_jsx("div", { className: "mb-3 p-3 rounded-xl bg-background/40 border border-border/30 max-h-56 overflow-y-auto", children: firsDisponibili.length === 0 ? (_jsxs("div", { className: "text-xs text-muted-foreground flex items-center gap-2", children: [_jsx(Loader2, { className: "h-3 w-3 animate-spin" }), "Carico formulari..."] })) : firsDisponibili.map((f) => (_jsxs("button", { onClick: () => addFirAsRiga(f), className: "w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/20 text-xs border-b border-border/10", children: [_jsx("span", { className: "font-mono font-semibold", children: f.numero_fir || "—" }), " \u00B7 CER ", f.cer || f.form_data?.cer || "—", " \u00B7 ", f.produttore_denominazione, " \u2192 ", f.destinatario_denominazione] }, f.id))) })), _jsx("div", { className: "space-y-2", children: righe.map((r, i) => (_jsxs("div", { className: "grid grid-cols-12 gap-2 items-start p-2 rounded-xl bg-background/40 border border-border/20", children: [_jsx("input", { value: r.descrizione, onChange: e => updRiga(i, { descrizione: e.target.value }), placeholder: "Descrizione", className: "col-span-4 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" }), _jsx("input", { value: r.cer, onChange: e => updRiga(i, { cer: e.target.value }), placeholder: "CER", className: "col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs font-mono" }), _jsx("input", { type: "number", step: "0.001", value: r.quantita, onChange: e => updRiga(i, { quantita: Number(e.target.value) }), placeholder: "Q.t\u00E0", className: "col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" }), _jsx("input", { value: r.unita_misura, onChange: e => updRiga(i, { unita_misura: e.target.value }), placeholder: "UM", className: "col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" }), _jsx("input", { type: "number", step: "0.0001", value: r.prezzo_unitario, onChange: e => updRiga(i, { prezzo_unitario: Number(e.target.value) }), placeholder: "Prezzo", className: "col-span-2 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs" }), _jsx("input", { type: "number", step: "0.01", list: "erp-iva-list", value: r.aliquota_iva, onChange: e => updRiga(i, { aliquota_iva: Number(e.target.value) }), disabled: r.reverse_charge, placeholder: "IVA %", className: "col-span-1 px-2 py-1.5 rounded-lg bg-background/60 border border-border/30 text-xs disabled:opacity-40" }), _jsxs("label", { className: "col-span-2 flex items-center gap-1 text-[10px] px-1", children: [_jsx("input", { type: "checkbox", checked: r.reverse_charge, onChange: e => updRiga(i, { reverse_charge: e.target.checked }) }), "Rev. charge", _jsx("button", { onClick: () => rmRiga(i), className: "ml-auto p-1 rounded hover:bg-destructive/20 text-destructive", children: _jsx(Trash2, { className: "h-3 w-3" }) })] })] }, i))) }), _jsx("datalist", { id: "erp-iva-list", children: erpIva.map((x) => (_jsxs("option", { value: x.aliquota, children: [x.codice, " \u2014 ", x.descrizione] }, x.codice))) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 p-4 rounded-xl bg-background/40 border border-border/30", children: [_jsx(TotBox, { label: "Imponibile", value: totals.imponibile }), _jsx(TotBox, { label: "IVA", value: totals.iva }), _jsx(TotBox, { label: "Totale", value: totals.totale, strong: true })] })] }), _jsxs("div", { className: "sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border/30 bg-card", children: [_jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-xl bg-muted/20 hover:bg-muted/30 text-sm", children: "Annulla" }), _jsxs("button", { disabled: saving || !hasPIva, onClick: salva, className: "px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2", children: [saving ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Save, { className: "h-4 w-4" }), "Genera Cortesia"] }), _jsxs("button", { disabled: saving || !hasPIva, onClick: salvaEInviaSibill, className: "px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-sm font-medium hover:bg-indigo-500/30 disabled:opacity-50 flex items-center gap-2", title: "Crea la fattura e la invia immediatamente a Sibill", children: [saving ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(UploadCloud, { className: "h-4 w-4" }), "Salva e invia a Sibill"] })] })] }) }));
}
function TotBox({ label, value, strong }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-mono uppercase tracking-wider text-muted-foreground", children: label }), _jsx("div", { className: `font-mono ${strong ? "text-lg font-bold text-primary" : "text-sm"}`, children: new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value) })] }));
}
function emptyRiga() {
    return { descrizione: "", cer: "", fir_form_id: null, numero_fir: "", quantita: 1, unita_misura: "kg", prezzo_unitario: 0, aliquota_iva: 22, reverse_charge: false, tipo_riga: "servizio" };
}
