import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Save, Send, Plus, ChevronDown, ChevronRight, FileText, Shield, MapPin, Scale, Search, Download, Eraser, Receipt } from "lucide-react";
import { useMNFIRForms } from "@/hooks/useMNFIRForms";
import { mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useMNFIRStore } from "@/stores/mnFirStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { inviaFirmaRentri, resolveSocietaId, chiudiFirRentri, getRentriPdf, getRentriPdfUrl, getRentriXfirUrl } from "@/services/rentriApi";
import { toRentriImageSrc, toRentriPdfPreviewSrc } from "@/lib/rentriMedia";
import { generateFIRSummaryPdf } from "@/lib/firSummaryPdf";
import { DESTINATARI } from "@/data/anagrafiche";
import { PresetAziendaSelector } from "@/components/fir/PresetAziendaSelector";
import { syncFirFinalToRegistryAndInventory, COMPANY_PRESETS, MULTY_TENANT_ID_CONST, NIYOL_TENANT_ID_CONST } from "@/lib/firFinalSync";
import { NuovaFatturaDialog } from "@/components/fatturazione/NuovaFatturaDialog";
// ── Neon color map per section ──────────────────────────────
const SECTION_NEON = {
    "1. Produttore": { border: "border-neon-cyan/40", text: "text-neon-cyan", glow: "shadow-[0_0_12px_hsl(187_92%_43%/0.3)]", bg: "bg-neon-cyan/5" },
    "Detentore": { border: "border-blue-500/40", text: "text-blue-400", glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]", bg: "bg-blue-500/5" },
    "Cantiere": { border: "border-blue-500/40", text: "text-blue-400", glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]", bg: "bg-blue-500/5" },
    "3. Destinatario": { border: "border-neon-green/40", text: "text-neon-green", glow: "shadow-[0_0_12px_hsl(160_84%_40%/0.3)]", bg: "bg-neon-green/5" },
    "4. Trasportatore": { border: "border-pink-500/40", text: "text-pink-400", glow: "shadow-[0_0_12px_rgba(236,72,153,0.3)]", bg: "bg-pink-500/5" },
    "5. Intermediario": { border: "border-orange-500/40", text: "text-orange-400", glow: "shadow-[0_0_12px_rgba(249,115,22,0.3)]", bg: "bg-orange-500/5" },
    "6. Caratteristiche": { border: "border-primary/40", text: "text-primary", glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]", bg: "bg-primary/5" },
    "Analisi": { border: "border-primary/40", text: "text-primary", glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]", bg: "bg-primary/5" },
    "7. Trasporto": { border: "border-primary/40", text: "text-primary", glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]", bg: "bg-primary/5" },
    "8-9. Conducente": { border: "border-neon-purple/40", text: "text-neon-purple", glow: "shadow-[0_0_12px_hsl(270_76%_60%/0.3)]", bg: "bg-neon-purple/5" },
    "12. Accettazione": { border: "border-red-500/40", text: "text-red-400", glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]", bg: "bg-red-500/5" },
};
function getSectionNeon(title) {
    for (const key of Object.keys(SECTION_NEON)) {
        if (title.startsWith(key))
            return SECTION_NEON[key];
    }
    return { border: "border-primary/20", text: "text-primary", glow: "shadow-[0_0_8px_hsl(47_38%_58%/0.2)]", bg: "bg-primary/5" };
}
function Section({ title, defaultOpen = false, onClear, children }) {
    const [open, setOpen] = useState(defaultOpen);
    const neon = getSectionNeon(title);
    return (_jsxs("div", { className: `rounded-2xl glass-card ${neon.border} border ${neon.bg} overflow-hidden transition-shadow ${open ? neon.glow : ""}`, children: [_jsxs("div", { className: "w-full flex items-center justify-between p-4 text-left", children: [_jsx("button", { onClick: () => setOpen(!open), className: "flex-1 flex items-center gap-2 text-left", children: _jsxs("span", { className: `text-xs font-mono uppercase tracking-wider ${neon.text} flex items-center gap-2`, children: [_jsx("span", { className: `w-2 h-2 rounded-full ${open ? "animate-pulse" : "opacity-50"}`, style: { backgroundColor: "currentColor" } }), title] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [onClear && (_jsx("button", { type: "button", onClick: (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Cancellare tutti i campi della sezione "${title}"?`))
                                        onClear();
                                }, title: "Pulisci sezione", className: "p-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors", children: _jsx(Eraser, { className: "h-3.5 w-3.5" }) })), _jsx("button", { onClick: () => setOpen(!open), type: "button", className: "p-1", children: open ? _jsx(ChevronDown, { className: `h-4 w-4 ${neon.text} opacity-60` }) : _jsx(ChevronRight, { className: `h-4 w-4 ${neon.text} opacity-60` }) })] })] }), open && _jsx("div", { className: "px-4 pb-4 space-y-3", children: children })] }));
}
function Field({ label, value, onChange, placeholder, type = "text" }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: label }), _jsx("input", { type: type, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: "w-full bg-sky-400/10 border border-sky-400/40 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-300 focus:border-sky-300/60 focus:bg-sky-400/15 focus:shadow-[0_0_10px_rgba(56,189,248,0.35)] transition-all" })] }));
}
function TextArea({ label, value, onChange, placeholder, rows = 2 }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: label }), _jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, rows: rows, className: "w-full bg-sky-400/10 border border-sky-400/40 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-300 focus:border-sky-300/60 focus:bg-sky-400/15 focus:shadow-[0_0_10px_rgba(56,189,248,0.35)] transition-all resize-none" })] }));
}
function Check({ label, checked, onChange }) {
    return (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => onChange(e.target.checked), className: "accent-primary" }), _jsx("span", { className: "text-xs text-white", children: label })] }));
}
function Row({ children }) {
    return _jsx("div", { className: "grid grid-cols-2 gap-3", children: children });
}
function DestinatarioSelector({ onSelect }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [dbResults, setDbResults] = useState([]);
    const ref = useRef(null);
    const filtered = search.length >= 1
        ? DESTINATARI.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()))
        : DESTINATARI;
    useEffect(() => {
        const q = search.trim();
        if (q.length < 2) {
            setDbResults([]);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            const { data } = await supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,indirizzo,citta,provincia,cap,codice_fiscale,partita_iva")
                .or(`ragione_sociale.ilike.%${q}%,codice_fiscale.ilike.%${q}%,partita_iva.ilike.%${q}%`)
                .order("ragione_sociale")
                .limit(25);
            if (cancelled)
                return;
            setDbResults((data || []).map((r) => ({
                nome: r.ragione_sociale || "",
                indirizzo: [r.indirizzo, [r.cap, r.citta, r.provincia ? `(${r.provincia})` : ""].filter(Boolean).join(" ")]
                    .filter(Boolean).join(" - "),
                cf: r.codice_fiscale || r.partita_iva || "",
                tipo: "IMPIANTO",
            })));
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [search]);
    const staticNames = new Set(filtered.map(d => d.nome.toLowerCase()));
    const extraResults = dbResults.filter(d => !staticNames.has(d.nome.toLowerCase()));
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target))
                setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    return (_jsxs("div", { ref: ref, className: "relative", children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "\uD83D\uDD0D Seleziona Destinatario / Impianto" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neon-green/60" }), _jsx("input", { type: "text", value: search, onChange: (e) => { setSearch(e.target.value); setIsOpen(true); }, onFocus: () => setIsOpen(true), placeholder: "Cerca impianti e anagrafica (nome, P.IVA, CF)...", className: "w-full bg-background/80 border-2 border-neon-green/30 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/50 focus:border-neon-green/60 transition-all" })] }), isOpen && (filtered.length > 0 || extraResults.length > 0) && (_jsxs("div", { className: "absolute z-[100] w-full mt-1 max-h-60 overflow-y-auto bg-[#0a0e1a] border-2 border-neon-green/30 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)]", children: [filtered.map((d, i) => (_jsxs("button", { onClick: () => { onSelect(d); setSearch(d.nome); setIsOpen(false); }, className: "w-full text-left px-3 py-2.5 hover:bg-neon-green/15 transition-colors border-b border-white/5", children: [_jsx("span", { className: "text-xs text-white font-medium block", children: d.nome }), d.indirizzo && _jsx("span", { className: "text-[10px] text-white/50 block", children: d.indirizzo }), !d.indirizzo && !d.cf && _jsx("span", { className: "text-[10px] text-yellow-500/70 block", children: "\u26A0 Dati incompleti" })] }, `s-${i}`))), extraResults.map((d, i) => (_jsxs("button", { onClick: () => { onSelect(d); setSearch(d.nome); setIsOpen(false); }, className: "w-full text-left px-3 py-2.5 hover:bg-neon-green/15 transition-colors border-b border-white/5", children: [_jsxs("span", { className: "text-xs text-white font-medium block", children: [d.nome, " ", _jsx("span", { className: "text-[9px] text-neon-green/70", children: "\u00B7 anagrafica" })] }), _jsx("span", { className: "text-[10px] text-white/50 block", children: [d.indirizzo, d.cf].filter(Boolean).join(" · ") })] }, `db-${i}`)))] })), search.trim().length > 1 && (_jsx("button", { onClick: () => { onSelect({ nome: search.trim(), indirizzo: "", cf: "", tipo: "IMPIANTO" }); setIsOpen(false); }, className: "w-full mt-1 text-left px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors", children: _jsxs("span", { className: "text-xs text-primary font-medium", children: ["\u270F\uFE0F Usa \"", search.trim(), "\" come nuovo impianto"] }) }))] }));
}
function PesoDestinoPopup({ onConfirm, onCancel }) {
    const [peso, setPeso] = useState("");
    return (_jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm", children: _jsxs("div", { className: "bg-card border border-primary/30 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary", children: [_jsx(Scale, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider", children: "PESO A DESTINO" })] }), _jsx("p", { className: "text-sm text-white/70", children: "Inserisci il peso riscontrato a destino (Kg) per chiudere definitivamente il FIR." }), _jsx("input", { type: "number", value: peso, onChange: (e) => setPeso(e.target.value), placeholder: "Peso in Kg", className: "w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary", autoFocus: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onCancel, className: "flex-1 py-3 rounded-xl bg-secondary/50 border border-border text-white/60 font-display text-sm", children: "ANNULLA" }), _jsx("button", { onClick: () => { if (peso.trim())
                                onConfirm(peso);
                            else
                                toast.error("Inserisci il peso"); }, className: "flex-1 py-3 rounded-xl bg-destructive/80 text-destructive-foreground font-display text-sm tracking-wider", children: "CHIUDI FIR" })] })] }) }));
}
// ── Main Component — NO PRESETS, all fields editable ──────────────────
const isTestFirNumberMN = (value) => {
    if (!value)
        return false;
    return /^(test[\s-]?|skkzr)/i.test(value.trim());
};
export function MNFIRFormComplete({ tenantId, mnContext, firFormId, draftData, impiantoId, registryMovementType, enableFatturazione = false }) {
    const { myForms, isLoadingMyForms, createFIR, submitFIR, silentSaveFIR, closeFIR } = useMNFIRForms(tenantId);
    const store = useMNFIRStore();
    const { user, profile } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(0);
    const isStarted = !!store.editingFirId;
    const activeTenantId = tenantId || profile?.tenant_id;
    const activeMnContext = mnContext || profile?.mn_context;
    const [isSigning, setIsSigning] = useState(false);
    const [showPesoPopup, setShowPesoPopup] = useState(false);
    const [showControlloStrada, setShowControlloStrada] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const autosaveRef = useRef(null);
    const [fatturaFrom, setFatturaFrom] = useState(null);
    const u = store.updateField;
    const d = store.data;
    // ── Crea fattura direttamente dal formulario ──────────────────────
    const cfKey = (v) => (v || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    const apriCreaFattura = async () => {
        const multyCf = cfKey(COMPANY_PRESETS.multy.codice_fiscale);
        const niyolCf = cfKey(COMPANY_PRESETS.niyol.codice_fiscale);
        const prod = { cf: cfKey(d.produttoreCF), nome: d.produttoreDenominazione, ind: d.produttoreUnitaLocale };
        const dest = { cf: cfKey(d.destinatarioCF), nome: d.destinatarioDenominazione, ind: d.destinatarioUnitaLocale };
        const trasCf = cfKey(d.trasportatoreCF);
        // Chi emette la fattura: la società (Multyproget o Niyol) presente sul formulario.
        let emittente = null;
        if ([prod.cf, dest.cf, trasCf].includes(niyolCf))
            emittente = "niyol";
        if ([prod.cf, dest.cf, trasCf].includes(multyCf))
            emittente = "multy";
        // Se entrambe sono presenti, emette chi fa il servizio principale (destinatario, poi trasportatore).
        if (dest.cf === niyolCf || (trasCf === niyolCf && dest.cf !== multyCf && prod.cf !== multyCf))
            emittente = "niyol";
        if (dest.cf === multyCf)
            emittente = "multy";
        if (!emittente)
            emittente = activeTenantId === NIYOL_TENANT_ID_CONST ? "niyol" : "multy";
        const emittenteCf = emittente === "niyol" ? niyolCf : multyCf;
        const tenantIdFattura = emittente === "niyol" ? NIYOL_TENANT_ID_CONST : MULTY_TENANT_ID_CONST;
        // Cliente = la controparte del formulario (mai la società emittente).
        const controparte = prod.cf && prod.cf !== emittenteCf ? prod : dest.cf !== emittenteCf ? dest : prod;
        let clienteFallback = undefined;
        if (controparte.cf) {
            const { data } = await supabase
                .from("anagrafica_aziende_mp")
                .select("id,ragione_sociale,partita_iva,codice_fiscale,indirizzo,citta,cap,provincia,codice_destinatario")
                .or(`codice_fiscale.eq.${controparte.cf},partita_iva.eq.${controparte.cf}`)
                .limit(1)
                .maybeSingle();
            if (data)
                clienteFallback = data;
        }
        if (!clienteFallback && controparte.nome) {
            clienteFallback = {
                ragione_sociale: controparte.nome,
                partita_iva: controparte.cf || null,
                codice_fiscale: controparte.cf || null,
                indirizzo: controparte.ind || null,
            };
        }
        const cer = d.codiceEER || "";
        const numeroFir = d.selectedFirNumber || "";
        const qta = Number(String(d.pesoRicevuto || d.quantita || "").replace(",", ".")) || 1;
        const riga = {
            descrizione: `Smaltimento CER ${cer} - FIR ${numeroFir}`.trim(),
            cer,
            fir_form_id: store.editingFirId || null,
            numero_fir: numeroFir,
            quantita: qta,
            unita_misura: d.unitaMisura || "kg",
            prezzo_unitario: 0,
            aliquota_iva: 22,
            reverse_charge: false,
            tipo_riga: "servizio",
        };
        setFatturaFrom({ tenantId: tenantIdFattura, emittente, righe: [riga], clienteFallback });
    };
    const clearFields = useCallback((keys) => {
        const cur = useMNFIRStore.getState().data;
        keys.forEach((k) => {
            const v = cur[k];
            let nv = "";
            if (Array.isArray(v))
                nv = [];
            else if (typeof v === "boolean")
                nv = false;
            else if (typeof v === "number")
                nv = 0;
            u(k, nv);
        });
    }, [u]);
    useEffect(() => {
        if (!draftData?.id)
            return;
        // Lo store è persistente: se questa stessa bozza era già aperta, contiene
        // i valori più recenti digitati dall'utente. Non sovrascriverli con la
        // copia DB quando la pagina viene rimontata o la sessione si rinnova.
        if (useMNFIRStore.getState().editingFirId === draftData.id)
            return;
        store.loadFromDatabase({
            ...draftData,
            form_data: draftData.form_data,
        });
        useMNFIRStore.setState({ editingFirId: draftData.id, workflowStatus: draftData.status === "completato" ? "chiuso" : draftData.status || "bozza" });
    }, [draftData?.id]);
    // ── Driver app starts clean: assigned FIRs are opened only by explicit click ─────────────
    const hasAutoRestored = useRef(false);
    useEffect(() => {
        if (firFormId || draftData?.id)
            return;
        // La pulizia automatica serve solo all'ingresso iniziale delle app autisti.
        // Nel gestionale Dev Multy il lavoro in corso deve restare fissato anche
        // dopo un rimontaggio della pagina o un cambio di scheda del browser.
        if (location.pathname.startsWith("/mn/admin") || location.pathname.startsWith("/admin"))
            return;
        if (!user?.id || hasAutoRestored.current)
            return;
        hasAutoRestored.current = true;
        if (store.editingFirId || store.data.selectedFirNumber || isTestFirNumberMN(store.data.selectedFirNumber)) {
            store.resetForm();
        }
    }, [user?.id, firFormId, draftData?.id, location.pathname]);
    // ── Autosave every 10 seconds ─────────────────────────
    const doAutosave = useCallback(async () => {
        if (!store.editingFirId || store.workflowStatus === 'chiuso')
            return;
        try {
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
        }
        catch { /* silent */ }
    }, [store.editingFirId, store.workflowStatus, store.data, silentSaveFIR]);
    useEffect(() => {
        if (store.editingFirId && store.workflowStatus !== 'chiuso') {
            autosaveRef.current = setInterval(doAutosave, 10000);
        }
        return () => { if (autosaveRef.current)
            clearInterval(autosaveRef.current); };
    }, [store.editingFirId, store.workflowStatus, doAutosave]);
    // ── Autofill Multyproget company data when tenant is Multy ─────────
    useEffect(() => {
        if (!store.editingFirId)
            return;
        if (activeTenantId !== MULTY_TENANT_ID_CONST)
            return;
        const preset = COMPANY_PRESETS.multy;
        const updates = {};
        // If Multy is not yet assigned to any role, prefill as PRODUTTORE by default
        // (most common case in DevMulty workspace: outbound trip from Multy plant).
        if (!store.data.produttoreDenominazione.trim() && !store.data.destinatarioDenominazione.trim()) {
            updates.produttoreDenominazione = preset.ragione_sociale;
            updates.produttoreCF = preset.codice_fiscale;
            updates.produttoreUnitaLocale = preset.indirizzo;
        }
        else if (store.data.produttoreDenominazione.trim() === preset.ragione_sociale &&
            !store.data.produttoreCF.trim()) {
            updates.produttoreCF = preset.codice_fiscale;
            updates.produttoreUnitaLocale = updates.produttoreUnitaLocale || (store.data.produttoreUnitaLocale || preset.indirizzo);
        }
        else if (store.data.destinatarioDenominazione.trim() === preset.ragione_sociale &&
            !store.data.destinatarioCF.trim()) {
            updates.destinatarioCF = preset.codice_fiscale;
            updates.destinatarioUnitaLocale = store.data.destinatarioUnitaLocale || preset.indirizzo;
        }
        if (Object.keys(updates).length > 0)
            store.updateMultipleFields(updates);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.editingFirId, activeTenantId]);
    // ── Salva BOZZA / DEFINITIVO from DevFirWorkspace toolbar ──────────
    useEffect(() => {
        const saveDraft = async () => {
            if (!store.editingFirId)
                return;
            try {
                const dbFields = mapStoreToDatabaseFields(store.data);
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
                // Le giacenze devono aggiornarsi già al salvataggio in bozza.
                const result = await syncFirFinalToRegistryAndInventory({
                    firId: store.editingFirId,
                    impiantoId: impiantoId || null,
                    registryMovementType: registryMovementType || "Carico",
                });
                if (result.warning)
                    throw new Error(result.warning);
                if (!result.inventory)
                    throw new Error("Il FIR non ha prodotto alcun movimento di giacenza: controlla ruolo Multyproget, CER e quantità");
                toast.success("💾 Bozza salvata (registro + giacenze aggiornati)");
                window.dispatchEvent(new CustomEvent("dev-fir-saved", { detail: { firId: store.editingFirId } }));
            }
            catch (e) {
                toast.error("Errore salvataggio bozza: " + (e?.message || String(e)));
            }
        };
        const saveFinal = async () => {
            if (!store.editingFirId)
                return;
            try {
                const dbFields = mapStoreToDatabaseFields(store.data);
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields, status: "completato", completed_at: new Date().toISOString() });
                useMNFIRStore.setState({ workflowStatus: 'chiuso' });
                const result = await syncFirFinalToRegistryAndInventory({
                    firId: store.editingFirId,
                    impiantoId: impiantoId || null,
                    registryMovementType: registryMovementType || "Carico",
                });
                if (result.warning)
                    throw new Error(result.warning);
                if (!result.inventory)
                    throw new Error("Il FIR non ha prodotto alcun movimento di giacenza: controlla ruolo Multyproget, CER e quantità");
                toast.success("✅ FIR salvato DEFINITIVO (registro + giacenze)");
                window.dispatchEvent(new CustomEvent("dev-fir-saved", { detail: { firId: store.editingFirId } }));
            }
            catch (e) {
                toast.error("Errore salvataggio definitivo: " + (e?.message || String(e)));
            }
        };
        const draftHandler = () => { void saveDraft(); };
        const finalHandler = () => { void saveFinal(); };
        window.addEventListener("dev-fir-save-draft", draftHandler);
        window.addEventListener("dev-fir-save-final", finalHandler);
        return () => {
            window.removeEventListener("dev-fir-save-draft", draftHandler);
            window.removeEventListener("dev-fir-save-final", finalHandler);
        };
    }, [store.editingFirId, store.data, silentSaveFIR, impiantoId, registryMovementType]);
    const ensureAndLoadDraft = async () => {
        if (!user?.id)
            throw new Error("Utente non autenticato");
        const { data: draftId, error: ensureErr } = tenantId
            ? await supabase.rpc("ensure_user_has_fir_draft_for_tenant", { p_user_id: user.id, p_tenant_id: tenantId })
            : await supabase.rpc("ensure_user_has_fir_draft", { p_user_id: user.id });
        if (ensureErr)
            throw ensureErr;
        if (!draftId)
            throw new Error("Nessuna bozza manuale trovata: crea il FIR inserendo prima il numero esatto");
        let draftQuery = supabase
            .from("fir_forms")
            .select("*")
            .eq("id", draftId)
            .eq("user_id", user.id)
            .eq("deleted_by_user", false);
        if (tenantId)
            draftQuery = draftQuery.eq("tenant_id", tenantId);
        const { data: draft, error: draftErr } = await draftQuery.maybeSingle();
        if (draftErr)
            throw draftErr;
        if (!draft)
            throw new Error("Bozza FIR manuale non trovata");
        store.loadFromDatabase({
            ...draft,
            form_data: draft.form_data,
        });
        useMNFIRStore.setState({ editingFirId: draft.id, workflowStatus: 'bozza' });
        return draft.numero_fir;
    };
    const handleStart = async () => {
        try {
            const numero = await ensureAndLoadDraft();
            toast.success(`FIR ${numero || "assegnato"} inizializzato!`);
        }
        catch (error) {
            toast.error(error?.message || "Errore nell'apertura del FIR");
        }
    };
    const handleSaveDraft = async () => {
        try {
            const dbFields = mapStoreToDatabaseFields(store.data);
            let savedId = store.editingFirId;
            if (store.editingFirId) {
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            }
            else {
                const created = await createFIR.mutateAsync(dbFields);
                savedId = created?.id || null;
            }
            // Anche il salvataggio in bozza deve aggiornare registro e giacenze.
            if (savedId) {
                try {
                    const result = await syncFirFinalToRegistryAndInventory({
                        firId: savedId,
                        impiantoId: impiantoId || null,
                        registryMovementType: registryMovementType || "Carico",
                    });
                    if (result.warning)
                        throw new Error(result.warning);
                    if (!result.inventory)
                        throw new Error("Il FIR non ha prodotto alcun movimento di giacenza: controlla ruolo Multyproget, CER e quantità");
                }
                catch (e) {
                    throw new Error("Dati FIR salvati, ma giacenze non aggiornate: " + (e?.message || String(e)));
                }
            }
            toast.success("Bozza salvata! Puoi riprendere dalla cronologia.");
            setTimeout(() => { store.resetForm(); }, 300);
        }
        catch {
            toast.error("Errore nel salvataggio");
        }
    };
    const handleNewFIR = async () => {
        if (store.editingFirId && store.workflowStatus !== 'chiuso') {
            try {
                const dbFields = mapStoreToDatabaseFields(store.data);
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            }
            catch { /* silent */ }
        }
        store.resetForm();
        try {
            const numero = await ensureAndLoadDraft();
            toast.success(`Nuovo FIR ${numero || "assegnato"} inizializzato!`);
        }
        catch (error) {
            toast.error(error?.message || "Errore nell'apertura del nuovo FIR");
        }
    };
    const handleOpenAssignedFir = (form) => {
        store.loadFromDatabase({
            ...form,
            form_data: form.form_data,
        });
        const mappedStatus = form.status === "completato" || form.status === "completed" ? "chiuso" : form.status === "inviato" || form.status === "submitted" ? "inviato" : "bozza";
        useMNFIRStore.setState({ editingFirId: form.id, workflowStatus: mappedStatus });
        if (!form.trasportatore_targa_automezzo && profile?.targa_automezzo) {
            store.updateField("targaAutomezzo", profile.targa_automezzo.trim());
        }
        if (!form.trasportatore_conducente && profile?.nome) {
            store.updateField("conducenteNomeCognome", profile.nome.trim());
        }
        toast.success(`FIR ${form.numero_fir || "senza numero"} aperto`);
    };
    const validateDeparture = () => {
        const errors = [];
        if (!d.targaAutomezzo.trim())
            errors.push("Targa Automezzo");
        if (!d.codiceEER.trim())
            errors.push("Codice EER");
        if (!d.produttoreDenominazione.trim())
            errors.push("Produttore");
        if (!d.destinatarioDenominazione.trim())
            errors.push("Destinatario");
        return errors;
    };
    const handleInviaFirma = async () => {
        if (!store.editingFirId)
            return;
        const missing = validateDeparture();
        if (missing.length > 0) {
            toast.error(`Campi obbligatori mancanti: ${missing.join(", ")}`);
            return;
        }
        setIsSigning(true);
        try {
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            const societaId = resolveSocietaId(activeTenantId, activeMnContext);
            const result = await inviaFirmaRentri({ societaId, payloadFir: { ...dbFields, numero_fir: d.selectedFirNumber } });
            const officialNumeroFir = String(result.numero_fir || d.selectedFirNumber || "").trim();
            const rentriFirId = String(result.firId || result.uuid_fir || "").trim();
            if (officialNumeroFir) {
                store.updateField("selectedFirNumber", officialNumeroFir);
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, numero_fir: officialNumeroFir, form_data: { ...dbFields.form_data, rentri_fir_id: rentriFirId || null }, status: "inviato", submitted_at: new Date().toISOString() });
            }
            const qrFromFirma = toRentriImageSrc(result.qr_code || result.qrCodeBytes || result.qrCode || result.qrUrl);
            if (qrFromFirma && d.selectedFirNumber) {
                setQrCodeData(qrFromFirma);
                await supabase.from("fir_number_pool").update({ qr_code_data: qrFromFirma }).eq("fir_number", d.selectedFirNumber);
            }
            // Extract PDF directly from emissione response (backend now returns pdf_content)
            const pdfFromEmissione = result.pdf_content || result.pdfContent || result.pdf_base64 || result.pdfBase64;
            if (pdfFromEmissione) {
                console.log("[RENTRI] PDF received directly from emissione response!");
                const pdfSrc = toRentriPdfPreviewSrc(pdfFromEmissione);
                if (pdfSrc)
                    setPdfBlobUrl(pdfSrc);
            }
            // Fallback: if no PDF/QR from emissione, try get-pdf proxy
            if (!pdfFromEmissione || !qrFromFirma) {
                const firIdForPdf = officialNumeroFir || d.selectedFirNumber;
                if (firIdForPdf) {
                    try {
                        console.log("[RENTRI] Fallback: fetching via get-pdf proxy for", firIdForPdf);
                        const pdfResult = await getRentriPdf(societaId, firIdForPdf);
                        if (!qrFromFirma) {
                            const qrSrc = toRentriImageSrc(pdfResult.qrCode || pdfResult.qr_code);
                            if (qrSrc) {
                                setQrCodeData(qrSrc);
                                await supabase.from("fir_number_pool").update({ qr_code_data: qrSrc }).eq("fir_number", d.selectedFirNumber || firIdForPdf);
                            }
                        }
                        if (!pdfFromEmissione) {
                            const pdfSrc = toRentriPdfPreviewSrc(pdfResult.pdfBase64, pdfResult.pdfUrl);
                            if (pdfSrc)
                                setPdfBlobUrl(pdfSrc);
                        }
                    }
                    catch (e) {
                        console.warn("[RENTRI] Fallback get-pdf failed:", e.message);
                    }
                }
            }
            toast.success(`📤 FIR ${officialNumeroFir || d.selectedFirNumber || ""} inviato e firmato su RENTRI`);
            window.dispatchEvent(new CustomEvent("dev-fir-saved", { detail: { firId: store.editingFirId } }));
        }
        catch (error) {
            toast.error(`Errore firma RENTRI: ${error.message}`);
        }
        finally {
            setIsSigning(false);
        }
    };
    // La toolbar admin (DevFirWorkspace) invia l'evento: qui si esegue l'invio reale a RENTRI.
    const inviaRentriRef = useRef(() => { });
    inviaRentriRef.current = () => { void handleInviaFirma(); };
    useEffect(() => {
        const handler = () => inviaRentriRef.current();
        window.addEventListener("dev-fir-send-rentri", handler);
        return () => window.removeEventListener("dev-fir-send-rentri", handler);
    }, []);
    const handleControlloPolizia = async () => {
        try {
            const societaId = resolveSocietaId(activeTenantId, activeMnContext);
            const firId = d.selectedFirNumber;
            if (firId) {
                try {
                    toast.info("Recupero documenti RENTRI...");
                    const pdfResult = await getRentriPdf(societaId, firId);
                    console.log("[RENTRI] Controllo Polizia response:", { hasQr: Boolean(pdfResult.qrCode), hasPdf: Boolean(pdfResult.pdfBase64), hasPdfUrl: Boolean(pdfResult.pdfUrl) });
                    const qrSrc = toRentriImageSrc(pdfResult.qrCode);
                    if (qrSrc)
                        setQrCodeData(qrSrc);
                    const pdfSrc = toRentriPdfPreviewSrc(pdfResult.pdfBase64, pdfResult.pdfUrl);
                    if (pdfSrc) {
                        setPdfBlobUrl(pdfSrc);
                        if (!qrSrc)
                            toast.success("PDF RENTRI pronto! (QR Code non disponibile dal server)");
                        else
                            toast.success("Documenti RENTRI pronti!");
                    }
                }
                catch (pdfErr) {
                    console.warn("[RENTRI] get-pdf error:", pdfErr.message);
                    toast.error("Errore recupero documenti: " + pdfErr.message);
                }
            }
            let qr = qrCodeData;
            if (!qr && firId) {
                const { data: poolRow } = await supabase.from("fir_number_pool").select("qr_code_data").eq("fir_number", firId).maybeSingle();
                if (poolRow?.qr_code_data) {
                    qr = poolRow.qr_code_data;
                    setQrCodeData(qr);
                }
            }
            setShowControlloStrada(true);
        }
        catch (error) {
            toast.error("Errore caricamento dati: " + error.message);
        }
    };
    const handleDownloadSummaryPdf = async () => {
        try {
            const blob = await generateFIRSummaryPdf(store.data, { qrCodeBase64: qrCodeData || undefined });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Riepilogo_FIR_${d.selectedFirNumber || "bozza"}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF riepilogo scaricato!");
        }
        catch (error) {
            toast.error("Errore generazione PDF: " + error.message);
        }
    };
    const handleArrivato = () => {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(() => { });
        setShowPesoPopup(true);
    };
    const handleConfirmClosure = async (peso) => {
        if (!store.editingFirId)
            return;
        try {
            store.updateField("pesoRicevuto", peso);
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields, form_data: { ...dbFields.form_data, peso_ricevuto: peso } });
            try {
                const societaId = resolveSocietaId(activeTenantId, activeMnContext);
                await chiudiFirRentri({
                    societaId,
                    numero_fir: d.selectedFirNumber,
                    peso_accettato: parseFloat(peso),
                    data_arrivo: new Date().toISOString(),
                    destinatario_denominazione: d.destinatarioDenominazione,
                    destinatario_codice_fiscale: d.destinatarioCF,
                    destinatario_indirizzo: d.destinatarioUnitaLocale,
                    destinatario_tipo_aut: d.destinatarioTipoAut || "AIA",
                    destinatario_numero_aut: d.destinatarioNumeroAut,
                    unita_misura: d.unitaMisura,
                });
            }
            catch (renderErr) {
                console.warn("[RENTRI] Chiusura server error:", renderErr.message);
            }
            await closeFIR.mutateAsync(store.editingFirId);
            useMNFIRStore.setState({ workflowStatus: 'chiuso' });
            setShowPesoPopup(false);
            toast.success("🏁 FIR chiuso definitivamente!");
            // ── AUTO EMAIL to impianto ──
            const emailDest = d.destinatarioEmail;
            if (emailDest) {
                try {
                    const nomeConducente = d.conducenteNomeCognome || d.trasportatoreNomeAutista || profile?.nome || "Autista";
                    const pdfBlob = await generateFIRSummaryPdf(store.data, { qrCodeBase64: qrCodeData || undefined });
                    const arrayBuf = await pdfBlob.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
                    await supabase.functions.invoke("send-global-email", {
                        body: {
                            to: emailDest,
                            subject: `FIR ${d.selectedFirNumber || ""} - Formulario da ${nomeConducente}`,
                            html: `<div style="font-family: Arial, sans-serif;"><p>Buongiorno,</p><p>in allegato il pdf del formulario scaricato da <strong>${nomeConducente}</strong>.</p><p style="margin-top: 24px; color: #666; font-size: 12px;">Email automatica — globalreco@zoli.live</p></div>`,
                            firId: store.editingFirId,
                            category: "automatica",
                            attachments: [{
                                    content: base64,
                                    filename: `FIR_${d.selectedFirNumber || "riepilogo"}.pdf`,
                                    type: "application/pdf",
                                }],
                        },
                    });
                    toast.success("📧 Email con PDF inviata a " + d.destinatarioDenominazione);
                }
                catch (emailErr) {
                    console.error("[AUTO-EMAIL] Errore invio:", emailErr);
                    toast.error("Email non inviata: " + emailErr.message);
                }
            }
        }
        catch (error) {
            toast.error("Errore chiusura: " + error.message);
        }
    };
    const handleDestinatarioSelect = (soggetto) => {
        u("destinatarioDenominazione", soggetto.nome);
        u("destinatarioUnitaLocale", soggetto.indirizzo);
        u("destinatarioCF", soggetto.cf);
        if (soggetto.email)
            u("destinatarioEmail", soggetto.email);
        if (soggetto.autorizzazione)
            u("destinatarioNumeroAut", soggetto.autorizzazione);
        if (soggetto.tipoAut)
            u("destinatarioTipoAut", soggetto.tipoAut);
        if (soggetto.operazione) {
            const isR = soggetto.operazione.startsWith("R");
            u("destinatarioOperazione", isR ? "R" : "D");
            u("destinatarioCodiceOperazione", soggetto.operazione);
            store.updateMultipleFields({
                destinatarioOperazione: isR ? "R" : "D",
                destinatarioCodiceOperazione: soggetto.operazione,
            });
        }
    };
    const tabs = [{ label: "PRINCIPALE" }, { label: "TRASBORDO" }, { label: "INTERMODALE" }];
    return (_jsxs("div", { className: "px-4 py-4 space-y-4", children: [showPesoPopup && _jsx(PesoDestinoPopup, { onConfirm: handleConfirmClosure, onCancel: () => setShowPesoPopup(false) }), _jsx("div", { className: "text-center", children: _jsx("h2", { className: "text-sm font-display uppercase tracking-widest text-primary", children: "COMPILA FIR / FORMULARIO RENTRI" }) }), _jsx("div", { className: "flex gap-1 bg-secondary/30 rounded-xl p-1", children: tabs.map((tab, i) => (_jsx("button", { onClick: () => setActiveTab(i), className: `flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${activeTab === i ? "bg-primary/20 text-primary font-semibold" : "text-white/50 hover:text-white"}`, children: tab.label }, i))) }), _jsxs("div", { className: "flex flex-col items-center gap-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" }), _jsx("span", { className: "text-xs font-mono uppercase tracking-widest text-neon-green", children: "Formulari Disponibili" })] }), !isStarted && !store.editingFirId ? (_jsx("div", { className: "w-full space-y-2", children: isLoadingMyForms ? (_jsx("div", { className: "w-full py-4 rounded-2xl border border-border/40 bg-card/40 text-center text-xs font-mono text-muted-foreground", children: "Caricamento FIR assegnati..." })) : (myForms ?? []).length > 0 ? ((myForms ?? []).map((form) => (_jsxs("button", { onClick: () => handleOpenAssignedFir(form), className: "w-full rounded-2xl border border-neon-green/30 bg-neon-green/5 px-4 py-4 text-left hover:bg-neon-green/10 transition-colors", children: [_jsx("span", { className: "block text-sm font-display text-neon-green tracking-wider", children: form.numero_fir || "FIR senza numero" }), _jsx("span", { className: "block text-[10px] font-mono uppercase text-white/50", children: form.status || "bozza" })] }, form.id)))) : (_jsx("div", { className: "w-full py-5 rounded-2xl border-2 border-dashed border-border/50 bg-card/30 text-center text-sm font-mono text-muted-foreground", children: "Nessun FIR assegnato." })) })) : (_jsx("div", { className: "w-full space-y-2", children: d.selectedFirNumber && (_jsx("div", { className: "text-center py-2 rounded-xl bg-neon-green/10 border border-neon-green/30", children: _jsx("span", { className: "text-xs font-mono text-neon-green tracking-wider", children: d.selectedFirNumber }) })) }))] }), (isStarted || store.editingFirId) && (_jsxs("div", { className: "space-y-2", children: [store.workflowStatus === 'bozza' && (_jsxs("button", { onClick: handleInviaFirma, disabled: isSigning, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 text-background font-display text-base tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]", children: [isSigning ? _jsx("div", { className: "w-5 h-5 border-2 border-background/50 border-t-background rounded-full animate-spin" }) : _jsx(Send, { className: "h-5 w-5 icon-led" }), isSigning ? "FIRMA IN CORSO..." : "INVIA E FIRMA PARTENZA"] })), store.workflowStatus === 'inviato' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: handleControlloPolizia, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]", children: [_jsx(Shield, { className: "h-5 w-5 icon-led" }), " CONTROLLO POLIZIA (QR CODE)"] }), _jsxs("button", { onClick: handleArrivato, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)]", children: [_jsx(MapPin, { className: "h-5 w-5 icon-led" }), " ARRIVATO"] })] })), store.workflowStatus === 'chiuso' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-center py-4 rounded-2xl bg-destructive/10 border border-destructive/30", children: [_jsx("p", { className: "text-destructive font-display text-sm tracking-wider", children: "\uD83C\uDFC1 FIR CHIUSO DEFINITIVAMENTE" }), d.pesoRicevuto && _jsxs("p", { className: "text-xs text-white/60 mt-1 font-mono", children: ["Peso a destino: ", d.pesoRicevuto, " Kg"] })] }), d.selectedFirNumber && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("a", { href: getRentriPdfUrl(d.selectedFirNumber), target: "_blank", rel: "noopener noreferrer", className: "flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " PDF RENTRI"] }), _jsxs("a", { href: getRentriXfirUrl(d.selectedFirNumber), target: "_blank", rel: "noopener noreferrer", className: "flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " xFIR XML"] })] }), _jsxs("button", { onClick: handleDownloadSummaryPdf, className: "w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-display text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors", children: [_jsx(FileText, { className: "h-4 w-4" }), " Scarica Riepilogo Viaggio"] })] })), _jsxs("button", { onClick: handleNewFIR, className: "w-full py-4 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-base tracking-widest hover:bg-neon-green/10 transition-all flex items-center justify-center gap-3", children: [_jsx(Plus, { className: "h-5 w-5" }), " NUOVO FIR"] })] })), showControlloStrada && store.workflowStatus === 'inviato' && (_jsxs("div", { className: "rounded-2xl border border-blue-500/30 overflow-hidden", children: [_jsxs("div", { className: "bg-white p-6 flex flex-col items-center gap-4", style: { backgroundColor: '#FFFFFF' }, children: [qrCodeData ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-gray-500 text-[10px] font-mono uppercase tracking-wider", children: "QR Code Ufficiale RENTRI" }), _jsx("img", { src: qrCodeData, alt: "QR Code RENTRI", className: "w-72 h-72 object-contain", style: { imageRendering: 'crisp-edges' } }), _jsx("p", { className: "text-gray-400 text-[9px] font-mono text-center max-w-[280px]", children: "Questo QR Code \u00E8 cifrato e leggibile solo dall'app in dotazione alle Forze dell'Ordine" })] })) : (_jsxs("div", { className: "w-72 h-72 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-xl bg-amber-50 gap-3", children: [_jsx(Shield, { className: "h-10 w-10 text-amber-500" }), _jsx("p", { className: "text-amber-700 text-sm text-center font-semibold px-4", children: "In attesa di ricezione QR Code ufficiale dal RENTRI" })] })), _jsx("p", { className: "text-black font-mono text-lg font-bold tracking-wider", children: d.selectedFirNumber || "N/A" })] }), _jsxs("div", { className: "bg-card/80 p-4 space-y-2 text-xs font-mono", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Targa:" }), _jsx("span", { className: "text-white font-bold", children: d.targaAutomezzo || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "EER:" }), _jsx("span", { className: "text-white font-bold", children: d.codiceEER || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Quantit\u00E0:" }), _jsxs("span", { className: "text-white font-bold", children: [d.quantita, " ", d.unitaMisura] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Produttore:" }), _jsx("span", { className: "text-white font-bold truncate ml-2", children: d.produttoreDenominazione || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Destinatario:" }), _jsx("span", { className: "text-white font-bold truncate ml-2", children: d.destinatarioDenominazione || "—" })] })] }), _jsxs("div", { className: "bg-card/60 p-3 flex gap-2", children: [_jsxs("button", { onClick: handleDownloadSummaryPdf, className: "flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " Scarica Riepilogo"] }), _jsxs("button", { onClick: () => {
                                            if (pdfBlobUrl) {
                                                window.open(pdfBlobUrl, "_blank", "noopener,noreferrer");
                                                return;
                                            }
                                            if (d.selectedFirNumber) {
                                                window.open(getRentriPdfUrl(d.selectedFirNumber), "_blank", "noopener,noreferrer");
                                                return;
                                            }
                                            toast.error("PDF ufficiale non disponibile");
                                        }, className: "flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors", children: [_jsx(FileText, { className: "h-4 w-4" }), " Apri PDF RENTRI"] }), _jsx("button", { onClick: () => setShowControlloStrada(false), className: "py-3 px-4 rounded-xl bg-muted/20 border border-border/30 text-muted-foreground font-display text-sm hover:bg-muted/30 transition-colors", children: "Chiudi" })] })] }))] })), (isStarted || store.editingFirId) && store.workflowStatus !== 'chiuso' && (_jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: () => { if (window.confirm("La bozza corrente verrà salvata automaticamente. Vuoi procedere con un nuovo formulario?"))
                            handleNewFIR(); }, disabled: createFIR.isPending, className: "flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo FIR"] }), _jsxs("button", { onClick: handleSaveDraft, disabled: createFIR.isPending || silentSaveFIR.isPending, className: "flex-1 py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors disabled:opacity-50", children: [_jsx(Save, { className: "h-4 w-4" }), " Metti in Bozza"] })] })), enableFatturazione && (isStarted || store.editingFirId) && (_jsxs("button", { onClick: () => void apriCreaFattura(), className: "w-full py-3 rounded-2xl bg-neon-green/15 border border-neon-green/40 text-neon-green font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-green/25 transition-colors", children: [_jsx(Receipt, { className: "h-4 w-4" }), " CREA FATTURA DA QUESTO FORMULARIO"] })), _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Data Emissione" }), _jsx("input", { type: "date", value: d.dataEmissione, onChange: (e) => u("dataEmissione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Registro" }), _jsxs("div", { className: "flex gap-1 mb-2", children: [_jsx("button", { onClick: () => u("registroSi", true), className: `flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`, children: "S\u00CC" }), _jsx("button", { onClick: () => u("registroSi", false), className: `flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${!d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`, children: "NO" })] }), d.registroSi && _jsx(Field, { label: "N\u00B0 Registro", value: d.numeroRegistro, onChange: (v) => u("numeroRegistro", v) })] })] }) }), activeTab === 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: "1. Produttore / Detentore", defaultOpen: true, onClear: () => clearFields(["produttoreDenominazione", "produttoreUnitaLocale", "produttoreCF", "produttoreNumeroAut", "produttoreTipoAut", "produttoreLuogoProduzioneDiverso", "produttoreDataAut", "isDetentore", "detentoreDenominazione", "detentoreUnitaLocale", "detentoreCF", "detentoreNumeroAut", "detentoreTipoAut"]), children: [_jsx(PresetAziendaSelector, { label: "Preset Multyproget / Niyol", ruolo: "PRODUTTORE", initialCf: d.produttoreCF, onSelectAzienda: (a) => {
                                    u("produttoreDenominazione", a.nome);
                                    u("produttoreUnitaLocale", a.indirizzo);
                                    u("produttoreCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("produttoreNumeroAut", aut.numero);
                                    u("produttoreTipoAut", aut.tipo);
                                    u("produttoreDataAut", aut.data);
                                }, onSelectCantiere: (c) => {
                                    u("cantiereIndirizzo", c.indirizzo);
                                    u("cantiereComune", c.comune);
                                    u("cantiereProvincia", c.provincia);
                                    u("cantiereCAP", c.cap);
                                    u("produttoreLuogoProduzioneDiverso", c.denominazione);
                                }, onSelectPartnerDefault: (p) => {
                                    if (!p.ruolo.startsWith("VETTORE"))
                                        return;
                                    u("trasportatoreDenominazione", p.nome);
                                    u("trasportatoreSituatoIn", p.indirizzo);
                                } }), _jsx(Field, { label: "Denominazione", value: d.produttoreDenominazione, onChange: (v) => u("produttoreDenominazione", v), placeholder: "Ragione sociale" }), _jsx(Field, { label: "Unit\u00E0 locale / Indirizzo", value: d.produttoreUnitaLocale, onChange: (v) => u("produttoreUnitaLocale", v), placeholder: "Indirizzo completo" }), _jsx(Field, { label: "Codice Fiscale / P.IVA", value: d.produttoreCF, onChange: (v) => u("produttoreCF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "RENTRI / Autorizzazione", value: d.produttoreNumeroAut, onChange: (v) => u("produttoreNumeroAut", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.produttoreTipoAut, onChange: (v) => u("produttoreTipoAut", v) })] }), _jsx(Field, { label: "Luogo produzione (se diverso)", value: d.produttoreLuogoProduzioneDiverso, onChange: (v) => u("produttoreLuogoProduzioneDiverso", v) }), _jsx(Field, { label: "Data Autorizzazione", value: d.produttoreDataAut, onChange: (v) => u("produttoreDataAut", v), type: "date" }), _jsx(Check, { label: "Detentore diverso dal produttore", checked: d.isDetentore, onChange: (v) => u("isDetentore", v) }), d.isDetentore && (_jsxs(_Fragment, { children: [_jsx(PresetAziendaSelector, { label: "Anagrafica detentore", ruolo: "PRODUTTORE", onSelectAzienda: (a) => {
                                            u("detentoreDenominazione", a.nome);
                                            u("detentoreUnitaLocale", a.indirizzo);
                                            u("detentoreCF", a.piva || a.cf);
                                        }, onSelectAutorizzazione: (aut) => {
                                            u("detentoreNumeroAut", aut.numero);
                                            u("detentoreTipoAut", aut.tipo);
                                        } }), _jsx(Field, { label: "Detentore - Denominazione", value: d.detentoreDenominazione, onChange: (v) => u("detentoreDenominazione", v) }), _jsx(Field, { label: "Detentore - Unit\u00E0 locale", value: d.detentoreUnitaLocale, onChange: (v) => u("detentoreUnitaLocale", v) }), _jsx(Field, { label: "Detentore - CF", value: d.detentoreCF, onChange: (v) => u("detentoreCF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Aut.", value: d.detentoreNumeroAut, onChange: (v) => u("detentoreNumeroAut", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.detentoreTipoAut, onChange: (v) => u("detentoreTipoAut", v) })] })] }))] }), _jsxs(Section, { title: "Cantiere (se applicabile)", onClear: () => clearFields(["cantiereIndirizzo", "cantiereComune", "cantiereProvincia", "cantiereCAP"]), children: [_jsx(PresetAziendaSelector, { label: "Preset cantieri / luoghi di produzione", ruolo: "PRODUTTORE", initialCf: d.produttoreCF, onSelectAzienda: (a) => {
                                    u("produttoreDenominazione", a.nome);
                                    u("produttoreUnitaLocale", a.indirizzo);
                                    u("produttoreCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("produttoreNumeroAut", aut.numero);
                                    u("produttoreTipoAut", aut.tipo);
                                    u("produttoreDataAut", aut.data);
                                }, onSelectCantiere: (c) => {
                                    u("cantiereIndirizzo", c.indirizzo || c.denominazione);
                                    u("cantiereComune", c.comune);
                                    u("cantiereProvincia", c.provincia);
                                    u("cantiereCAP", c.cap);
                                } }), _jsx(Field, { label: "Indirizzo", value: d.cantiereIndirizzo, onChange: (v) => u("cantiereIndirizzo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Comune", value: d.cantiereComune, onChange: (v) => u("cantiereComune", v) }), _jsx(Field, { label: "Provincia", value: d.cantiereProvincia, onChange: (v) => u("cantiereProvincia", v) })] }), _jsx(Field, { label: "CAP", value: d.cantiereCAP, onChange: (v) => u("cantiereCAP", v) })] }), _jsxs(Section, { title: "3. Destinatario", onClear: () => clearFields(["destinatarioDenominazione", "destinatarioUnitaLocale", "destinatarioCF", "destinatarioOperazione", "destinatarioCodiceOperazione", "destinatarioNumeroAut", "destinatarioTipoAut", "destinatarioDataAut"]), children: [_jsx(DestinatarioSelector, { onSelect: handleDestinatarioSelect }), _jsx(PresetAziendaSelector, { label: "Preset anagrafica destinatari", ruolo: "DESTINATARIO", onSelectAzienda: (a) => {
                                    u("destinatarioDenominazione", a.nome);
                                    u("destinatarioUnitaLocale", a.indirizzo);
                                    u("destinatarioCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("destinatarioNumeroAut", aut.numero);
                                    u("destinatarioTipoAut", aut.tipo);
                                    u("destinatarioDataAut", aut.data);
                                } }), _jsx(Field, { label: "Denominazione", value: d.destinatarioDenominazione, onChange: (v) => u("destinatarioDenominazione", v), placeholder: "Ragione sociale impianto" }), _jsx(Field, { label: "Unit\u00E0 locale / Indirizzo", value: d.destinatarioUnitaLocale, onChange: (v) => u("destinatarioUnitaLocale", v) }), _jsx(Field, { label: "Codice Fiscale / P.IVA", value: d.destinatarioCF, onChange: (v) => u("destinatarioCF", v) }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Operazione" }), _jsxs("select", { value: d.destinatarioOperazione, onChange: (e) => u("destinatarioOperazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "R", children: "Recupero (R)" }), _jsx("option", { value: "D", children: "Smaltimento (D)" })] })] }), _jsx(Field, { label: "Codice Operazione", value: d.destinatarioCodiceOperazione, onChange: (v) => u("destinatarioCodiceOperazione", v), placeholder: "es. R13" })] }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Autorizzazione", value: d.destinatarioNumeroAut, onChange: (v) => u("destinatarioNumeroAut", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.destinatarioTipoAut, onChange: (v) => u("destinatarioTipoAut", v) })] }), _jsx(Field, { label: "Data Autorizzazione", value: d.destinatarioDataAut, onChange: (v) => u("destinatarioDataAut", v), type: "date" })] }), _jsxs(Section, { title: "4. Trasportatore", onClear: () => clearFields(["trasportatoreDenominazione", "trasportatoreCF", "trasportatoreNumeroAlbo", "trasportatoreDataAlbo", "trasportatoreSituatoIn", "trasportatoreNomeAutista"]), children: [_jsx(PresetAziendaSelector, { label: "Preset Multyproget / Niyol", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("trasportatoreDenominazione", a.nome);
                                    u("trasportatoreCF", a.piva || a.cf);
                                    u("trasportatoreSituatoIn", a.indirizzo);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("trasportatoreNumeroAlbo", aut.numero);
                                    u("trasportatoreDataAlbo", aut.data);
                                }, onSelectTarga: (t) => {
                                    u("targaAutomezzo", t.targa);
                                    if (t.rimorchio)
                                        u("targaRimorchio", t.rimorchio);
                                    if (t.conducente) {
                                        u("conducenteNomeCognome", t.conducente);
                                        u("trasportatoreNomeAutista", t.conducente);
                                    }
                                }, onSelectConducente: (c) => {
                                    const nomeCompleto = [c.cognome, c.nome].filter(Boolean).join(" ");
                                    u("conducenteNomeCognome", nomeCompleto);
                                    u("trasportatoreNomeAutista", nomeCompleto);
                                } }), _jsx(Field, { label: "Denominazione", value: d.trasportatoreDenominazione, onChange: (v) => u("trasportatoreDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale / P.IVA", value: d.trasportatoreCF, onChange: (v) => u("trasportatoreCF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.trasportatoreNumeroAlbo, onChange: (v) => u("trasportatoreNumeroAlbo", v) }), _jsx(Field, { label: "Data Iscrizione", value: d.trasportatoreDataAlbo, onChange: (v) => u("trasportatoreDataAlbo", v), type: "date" })] }), _jsx(Field, { label: "Situato in", value: d.trasportatoreSituatoIn, onChange: (v) => u("trasportatoreSituatoIn", v) }), _jsx(Field, { label: "Nome Autista", value: d.trasportatoreNomeAutista, onChange: (v) => {
                                    u("trasportatoreNomeAutista", v);
                                    u("conducenteNomeCognome", v);
                                } })] }), _jsxs(Section, { title: "5. Intermediario / Commerciante", onClear: () => clearFields(["intermediarioDenominazione", "intermediarioCF", "intermediarioNumeroAlbo"]), children: [_jsx(PresetAziendaSelector, { label: "Preset anagrafica intermediari", ruolo: "INTERMEDIARIO", onSelectAzienda: (a) => {
                                    u("intermediarioDenominazione", a.nome);
                                    u("intermediarioCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("intermediarioNumeroAlbo", aut.numero);
                                } }), _jsx(Field, { label: "Denominazione", value: d.intermediarioDenominazione, onChange: (v) => u("intermediarioDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale / P.IVA", value: d.intermediarioCF, onChange: (v) => u("intermediarioCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo (Cod.RS)", value: d.intermediarioNumeroAlbo, onChange: (v) => u("intermediarioNumeroAlbo", v) })] }), _jsxs(Section, { title: "6. Caratteristiche del Rifiuto", defaultOpen: true, onClear: () => clearFields(["codiceEER", "descrizione", "statoFisico", "provenienza", "quantita", "quantitaLitri", "aspettoEsteriore", "numeroColli", "verificatoPartenza", "caratteristicheHP"]), children: [_jsx(Field, { label: "Codice EER", value: d.codiceEER, onChange: (v) => u("codiceEER", v), placeholder: "es. 17 04 05" }), _jsx(Field, { label: "Descrizione Rifiuto", value: d.descrizione, onChange: (v) => u("descrizione", v), placeholder: "Descrizione del rifiuto" }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Stato Fisico" }), _jsxs("select", { value: d.statoFisico, onChange: (e) => u("statoFisico", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "", children: "--" }), _jsx("option", { value: "1", children: "1 - Solido pulverulento" }), _jsx("option", { value: "2", children: "2 - Solido non pulverulento" }), _jsx("option", { value: "3", children: "3 - Fangoso palabile" }), _jsx("option", { value: "4", children: "4 - Liquido" }), _jsx("option", { value: "5", children: "5 - Aeriforme" }), _jsx("option", { value: "6", children: "6 - Altro" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Provenienza" }), _jsxs("select", { value: d.provenienza, onChange: (e) => u("provenienza", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "speciale", children: "Speciale" }), _jsx("option", { value: "urbano", children: "Urbano" })] })] })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Quantit\u00E0 (Kg)", value: d.quantita, onChange: (v) => u("quantita", v), placeholder: "0" }), _jsx(Field, { label: "Quantit\u00E0 (Litri)", value: d.quantitaLitri, onChange: (v) => u("quantitaLitri", v), placeholder: "0" })] }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Aspetto Esteriore" }), _jsxs("select", { value: d.aspettoEsteriore, onChange: (e) => u("aspettoEsteriore", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "colli", children: "Colli" }), _jsx("option", { value: "rinfusa", children: "Rinfusa" })] })] }), _jsx(Field, { label: "N\u00B0 Colli", value: d.numeroColli, onChange: (v) => u("numeroColli", v) })] }), _jsx(Check, { label: "Verificato in partenza", checked: d.verificatoPartenza, onChange: (v) => u("verificatoPartenza", v) }), _jsx(Field, { label: "Caratteristiche HP (separate da virgola)", value: d.caratteristicheHP.join(", "), onChange: (v) => u("caratteristicheHP", v.split(",").map(s => s.trim()).filter(Boolean)), placeholder: "HP4, HP5..." })] }), _jsxs(Section, { title: "Analisi e Classificazione", onClear: () => clearFields(["analisiRapportiProva", "analisiNumero", "analisiValidaAl", "classificazione", "classificazioneNumero", "classificazioneValidaAl"]), children: [_jsx(Check, { label: "Analisi / Rapporti di prova", checked: d.analisiRapportiProva, onChange: (v) => u("analisiRapportiProva", v) }), d.analisiRapportiProva && (_jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Documento", value: d.analisiNumero, onChange: (v) => u("analisiNumero", v) }), _jsx(Field, { label: "Valido al", value: d.analisiValidaAl, onChange: (v) => u("analisiValidaAl", v), type: "date" })] })), _jsx(Check, { label: "Classificazione", checked: d.classificazione, onChange: (v) => u("classificazione", v) }), d.classificazione && (_jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Documento", value: d.classificazioneNumero, onChange: (v) => u("classificazioneNumero", v) }), _jsx(Field, { label: "Valido al", value: d.classificazioneValidaAl, onChange: (v) => u("classificazioneValidaAl", v), type: "date" })] }))] }), _jsxs(Section, { title: "7. Trasporto ADR / Merci Pericolose", onClear: () => clearFields(["trasportoADR", "adrClassePericolo", "adrNumeroONU", "adrNote"]), children: [_jsx(Check, { label: "Trasporto soggetto a normativa ADR", checked: d.trasportoADR, onChange: (v) => u("trasportoADR", v) }), d.trasportoADR && (_jsxs(_Fragment, { children: [_jsxs(Row, { children: [_jsx(Field, { label: "Classe Pericolo", value: d.adrClassePericolo, onChange: (v) => u("adrClassePericolo", v) }), _jsx(Field, { label: "N\u00B0 ONU", value: d.adrNumeroONU, onChange: (v) => u("adrNumeroONU", v) })] }), _jsx(Field, { label: "Note ADR", value: d.adrNote, onChange: (v) => u("adrNote", v) })] }))] }), _jsxs(Section, { title: "8-9. Conducente e Trasporto", onClear: () => clearFields(["conducenteNomeCognome", "oraDataInizioTrasporto", "oraInizioTrasporto", "targaAutomezzo", "targaRimorchio", "percorsoDiverso"]), children: [_jsx(PresetAziendaSelector, { label: "Conducenti e mezzi del trasportatore", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("trasportatoreDenominazione", a.nome);
                                    u("trasportatoreCF", a.piva || a.cf);
                                    u("trasportatoreSituatoIn", a.indirizzo);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("trasportatoreNumeroAlbo", aut.numero);
                                    u("trasportatoreDataAlbo", aut.data);
                                }, onSelectTarga: (t) => {
                                    u("targaAutomezzo", t.targa);
                                    if (t.rimorchio)
                                        u("targaRimorchio", t.rimorchio);
                                    if (t.conducente) {
                                        u("conducenteNomeCognome", t.conducente);
                                        u("trasportatoreNomeAutista", t.conducente);
                                    }
                                }, onSelectConducente: (c) => {
                                    const nomeCompleto = [c.cognome, c.nome].filter(Boolean).join(" ");
                                    u("conducenteNomeCognome", nomeCompleto);
                                    u("trasportatoreNomeAutista", nomeCompleto);
                                } }), _jsx(Field, { label: "Conducente - Nome e Cognome", value: d.conducenteNomeCognome, onChange: (v) => {
                                    u("conducenteNomeCognome", v);
                                    u("trasportatoreNomeAutista", v);
                                } }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Inizio Trasporto", value: d.oraDataInizioTrasporto, onChange: (v) => u("oraDataInizioTrasporto", v), type: "date" }), _jsx(Field, { label: "Ora Inizio", value: d.oraInizioTrasporto, onChange: (v) => u("oraInizioTrasporto", v), type: "time" })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Automezzo", value: d.targaAutomezzo, onChange: (v) => u("targaAutomezzo", v), placeholder: "AA 000 BB" }), _jsx(Field, { label: "Targa Rimorchio", value: d.targaRimorchio, onChange: (v) => u("targaRimorchio", v) })] }), _jsx(Field, { label: "Percorso diverso dal pi\u00F9 breve", value: d.percorsoDiverso, onChange: (v) => u("percorsoDiverso", v) })] }), _jsxs(Section, { title: "10. Allegati", onClear: () => clearFields(["allegatoMicroraccolta", "allegatoIntermodale"]), children: [_jsx(Check, { label: "Allegato microraccolta", checked: d.allegatoMicroraccolta, onChange: (v) => u("allegatoMicroraccolta", v) }), _jsx(Check, { label: "Allegato intermodale", checked: d.allegatoIntermodale, onChange: (v) => u("allegatoIntermodale", v) })] }), _jsxs(Section, { title: "11. Registro", onClear: () => clearFields(["registroSi", "numeroRegistro", "dataEmissione"]), children: [_jsx(Check, { label: "Registro cronologico SI", checked: d.registroSi, onChange: (v) => u("registroSi", v) }), _jsx(Field, { label: "N\u00B0 Annotazione Registro", value: d.numeroRegistro, onChange: (v) => u("numeroRegistro", v) }), _jsx(Field, { label: "Data Emissione", value: d.dataEmissione, onChange: (v) => u("dataEmissione", v), type: "date" })] }), _jsxs(Section, { title: "12. Accettazione Destinatario", onClear: () => clearFields(["dataOraArrivo", "accettazione", "quantitaAccettata", "causaleRespingimento", "motivazioneRespingimento", "pesoRicevuto", "dataRicezione", "oraRicezione", "inAttesaVerificaAnalitica"]), children: [_jsxs(Row, { children: [_jsx(Field, { label: "Data Arrivo", value: d.dataOraArrivo, onChange: (v) => u("dataOraArrivo", v), type: "datetime-local" }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Accettazione" }), _jsxs("select", { value: d.accettazione, onChange: (e) => u("accettazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "", children: "--" }), _jsx("option", { value: "intero", children: "Accettato per intero" }), _jsx("option", { value: "parziale", children: "Accettato parzialmente" }), _jsx("option", { value: "respinto", children: "Respinto" })] })] })] }), d.accettazione === "parziale" && _jsx(Field, { label: "Quantit\u00E0 Accettata (Kg)", value: d.quantitaAccettata, onChange: (v) => u("quantitaAccettata", v) }), d.accettazione === "respinto" && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Causale Respingimento", value: d.causaleRespingimento, onChange: (v) => u("causaleRespingimento", v) }), _jsx(Field, { label: "Motivazione", value: d.motivazioneRespingimento, onChange: (v) => u("motivazioneRespingimento", v) })] })), _jsx(Field, { label: "Peso Ricevuto (Kg)", value: d.pesoRicevuto, onChange: (v) => u("pesoRicevuto", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Ricezione", value: d.dataRicezione, onChange: (v) => u("dataRicezione", v), type: "date" }), _jsx(Field, { label: "Ora Ricezione", value: d.oraRicezione, onChange: (v) => u("oraRicezione", v), type: "time" })] }), _jsx(Check, { label: "In attesa di verifica analitica", checked: d.inAttesaVerificaAnalitica, onChange: (v) => u("inAttesaVerificaAnalitica", v) })] }), _jsx(Section, { title: "17. Annotazioni", onClear: () => clearFields(["annotazioni"]), children: _jsx(TextArea, { label: "Annotazioni", value: d.annotazioni, onChange: (v) => u("annotazioni", v), rows: 3 }) })] })), activeTab === 1 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: "13. Trasbordo Parziale", onClear: () => clearFields(["trasbordoParzDenominazione", "trasbordoParzCF", "trasbordoParzAlbo", "trasbordoParzCausale", "trasbordoParzQuantitaResidua", "trasbordoParzNuovoFir"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica nuovo trasportatore", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("trasbordoParzDenominazione", a.nome);
                                    u("trasbordoParzCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => u("trasbordoParzAlbo", aut.numero) }), _jsx(Field, { label: "Nuovo Trasportatore - Denominazione", value: d.trasbordoParzDenominazione, onChange: (v) => u("trasbordoParzDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.trasbordoParzCF, onChange: (v) => u("trasbordoParzCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.trasbordoParzAlbo, onChange: (v) => u("trasbordoParzAlbo", v) }), _jsx(Field, { label: "Causale", value: d.trasbordoParzCausale, onChange: (v) => u("trasbordoParzCausale", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Quantit\u00E0 Residua (Kg)", value: d.trasbordoParzQuantitaResidua, onChange: (v) => u("trasbordoParzQuantitaResidua", v) }), _jsx(Field, { label: "N\u00B0 Nuovo FIR", value: d.trasbordoParzNuovoFir, onChange: (v) => u("trasbordoParzNuovoFir", v) })] })] }), _jsxs(Section, { title: "Trasbordo Totale", onClear: () => clearFields(["trasbordoTotDenominazione", "trasbordoTotCF", "trasbordoTotAlbo", "trasbordoTotTarga", "trasbordoTotRimorchio", "trasbordoTotConducente", "trasbordoTotDataPresaCarico"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica nuovo trasportatore", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("trasbordoTotDenominazione", a.nome);
                                    u("trasbordoTotCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => u("trasbordoTotAlbo", aut.numero), onSelectTarga: (t) => {
                                    u("trasbordoTotTarga", t.targa);
                                    if (t.rimorchio)
                                        u("trasbordoTotRimorchio", t.rimorchio);
                                    if (t.conducente)
                                        u("trasbordoTotConducente", t.conducente);
                                }, onSelectConducente: (c) => u("trasbordoTotConducente", [c.cognome, c.nome].filter(Boolean).join(" ")) }), _jsx(Field, { label: "Nuovo Trasportatore - Denominazione", value: d.trasbordoTotDenominazione, onChange: (v) => u("trasbordoTotDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.trasbordoTotCF, onChange: (v) => u("trasbordoTotCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.trasbordoTotAlbo, onChange: (v) => u("trasbordoTotAlbo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Nuovo Mezzo", value: d.trasbordoTotTarga, onChange: (v) => u("trasbordoTotTarga", v) }), _jsx(Field, { label: "Targa Rimorchio", value: d.trasbordoTotRimorchio, onChange: (v) => u("trasbordoTotRimorchio", v) })] }), _jsx(Field, { label: "Conducente", value: d.trasbordoTotConducente, onChange: (v) => u("trasbordoTotConducente", v) }), _jsx(Field, { label: "Data/Ora Presa in Carico", value: d.trasbordoTotDataPresaCarico, onChange: (v) => u("trasbordoTotDataPresaCarico", v), type: "datetime-local" })] }), _jsxs(Section, { title: "14. Soste Tecniche", onClear: () => clearFields(["sosta1Luogo", "sosta1Inizio", "sosta1Fine", "sosta2Luogo", "sosta2Inizio", "sosta2Fine", "sosta3Luogo", "sosta3Inizio", "sosta3Fine"]), children: [_jsx("p", { className: "text-xs text-white/60 mb-2", children: "Sosta 1" }), _jsx(Field, { label: "Luogo", value: d.sosta1Luogo, onChange: (v) => u("sosta1Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta1Inizio, onChange: (v) => u("sosta1Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta1Fine, onChange: (v) => u("sosta1Fine", v), type: "datetime-local" })] }), _jsx("p", { className: "text-xs text-white/60 mb-2 mt-3", children: "Sosta 2" }), _jsx(Field, { label: "Luogo", value: d.sosta2Luogo, onChange: (v) => u("sosta2Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta2Inizio, onChange: (v) => u("sosta2Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta2Fine, onChange: (v) => u("sosta2Fine", v), type: "datetime-local" })] }), _jsx("p", { className: "text-xs text-white/60 mb-2 mt-3", children: "Sosta 3" }), _jsx(Field, { label: "Luogo", value: d.sosta3Luogo, onChange: (v) => u("sosta3Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta3Inizio, onChange: (v) => u("sosta3Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta3Fine, onChange: (v) => u("sosta3Fine", v), type: "datetime-local" })] })] }), _jsxs(Section, { title: "15. Secondo Destinatario", onClear: () => clearFields(["dest2Denominazione", "dest2UnitaLocale", "dest2CF", "dest2Autorizzazione", "dest2TipoAut", "dest2DataAut", "dest2Operazione", "dest2CodiceOperazione"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica secondo destinatario", ruolo: "DESTINATARIO", onSelectAzienda: (a) => {
                                    u("dest2Denominazione", a.nome);
                                    u("dest2UnitaLocale", a.indirizzo);
                                    u("dest2CF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => {
                                    u("dest2Autorizzazione", aut.numero);
                                    u("dest2TipoAut", aut.tipo);
                                    u("dest2DataAut", aut.data);
                                } }), _jsx(Field, { label: "Denominazione", value: d.dest2Denominazione, onChange: (v) => u("dest2Denominazione", v) }), _jsx(Field, { label: "Unit\u00E0 Locale", value: d.dest2UnitaLocale, onChange: (v) => u("dest2UnitaLocale", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.dest2CF, onChange: (v) => u("dest2CF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Autorizzazione", value: d.dest2Autorizzazione, onChange: (v) => u("dest2Autorizzazione", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.dest2TipoAut, onChange: (v) => u("dest2TipoAut", v) })] }), _jsx(Field, { label: "Data Autorizzazione", value: d.dest2DataAut, onChange: (v) => u("dest2DataAut", v), type: "date" }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Operazione" }), _jsxs("select", { value: d.dest2Operazione, onChange: (e) => u("dest2Operazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "R", children: "Recupero (R)" }), _jsx("option", { value: "D", children: "Smaltimento (D)" })] })] }), _jsx(Field, { label: "Codice Operazione", value: d.dest2CodiceOperazione, onChange: (v) => u("dest2CodiceOperazione", v), placeholder: "es. R13" })] })] }), _jsx(Section, { title: "16-17. Annotazioni (continuazione)", onClear: () => clearFields(["annotazioniContinuazione"]), children: _jsx(TextArea, { label: "Annotazioni aggiuntive", value: d.annotazioniContinuazione, onChange: (v) => u("annotazioniContinuazione", v), rows: 4 }) })] })), activeTab === 2 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: "Intermodale Terrestre", defaultOpen: true, onClear: () => clearFields(["interTerrDenominazione", "interTerrCF", "interTerrAlbo", "interTerrConducente", "interTerrTarga", "interTerrRimorchio"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica vettore terrestre", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("interTerrDenominazione", a.nome);
                                    u("interTerrCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: (aut) => u("interTerrAlbo", aut.numero), onSelectTarga: (t) => {
                                    u("interTerrTarga", t.targa);
                                    if (t.rimorchio)
                                        u("interTerrRimorchio", t.rimorchio);
                                    if (t.conducente)
                                        u("interTerrConducente", t.conducente);
                                }, onSelectConducente: (c) => u("interTerrConducente", [c.cognome, c.nome].filter(Boolean).join(" ")) }), _jsx(Field, { label: "Denominazione", value: d.interTerrDenominazione, onChange: (v) => u("interTerrDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interTerrCF, onChange: (v) => u("interTerrCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.interTerrAlbo, onChange: (v) => u("interTerrAlbo", v) }), _jsx(Field, { label: "Conducente", value: d.interTerrConducente, onChange: (v) => u("interTerrConducente", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Mezzo", value: d.interTerrTarga, onChange: (v) => u("interTerrTarga", v) }), _jsx(Field, { label: "Targa Rimorchio", value: d.interTerrRimorchio, onChange: (v) => u("interTerrRimorchio", v) })] })] }), _jsxs(Section, { title: "Intermodale Ferroviario", onClear: () => clearFields(["interFerroDenominazione", "interFerroIdTreno", "interFerroCF", "interFerroTratta", "interFerroRid", "interFerroStazionePartenza", "interFerroStazioneArrivo", "interFerroDataPartenza", "interFerroDataArrivo"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica vettore ferroviario", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("interFerroDenominazione", a.nome);
                                    u("interFerroCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: () => undefined }), _jsx(Field, { label: "Denominazione", value: d.interFerroDenominazione, onChange: (v) => u("interFerroDenominazione", v) }), _jsx(Field, { label: "ID Treno", value: d.interFerroIdTreno, onChange: (v) => u("interFerroIdTreno", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interFerroCF, onChange: (v) => u("interFerroCF", v) }), _jsx(Field, { label: "Tratta", value: d.interFerroTratta, onChange: (v) => u("interFerroTratta", v) }), _jsx(Check, { label: "RID (merci pericolose)", checked: d.interFerroRid, onChange: (v) => u("interFerroRid", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Stazione Partenza", value: d.interFerroStazionePartenza, onChange: (v) => u("interFerroStazionePartenza", v) }), _jsx(Field, { label: "Stazione Arrivo", value: d.interFerroStazioneArrivo, onChange: (v) => u("interFerroStazioneArrivo", v) })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Partenza", value: d.interFerroDataPartenza, onChange: (v) => u("interFerroDataPartenza", v), type: "date" }), _jsx(Field, { label: "Data Arrivo", value: d.interFerroDataArrivo, onChange: (v) => u("interFerroDataArrivo", v), type: "date" })] })] }), _jsxs(Section, { title: "Intermodale Marittimo", onClear: () => clearFields(["interMareDenominazione", "interMareIdNave", "interMareCF", "interMareImdg", "interMarePortoPartenza", "interMarePortoArrivo", "interMareDataPartenza", "interMareDataArrivo"]), children: [_jsx(PresetAziendaSelector, { label: "Anagrafica vettore marittimo", ruolo: "TRASPORTATORE", onSelectAzienda: (a) => {
                                    u("interMareDenominazione", a.nome);
                                    u("interMareCF", a.piva || a.cf);
                                }, onSelectAutorizzazione: () => undefined }), _jsx(Field, { label: "Denominazione", value: d.interMareDenominazione, onChange: (v) => u("interMareDenominazione", v) }), _jsx(Field, { label: "ID Nave", value: d.interMareIdNave, onChange: (v) => u("interMareIdNave", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interMareCF, onChange: (v) => u("interMareCF", v) }), _jsx(Check, { label: "IMDG (merci pericolose)", checked: d.interMareImdg, onChange: (v) => u("interMareImdg", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Porto Partenza", value: d.interMarePortoPartenza, onChange: (v) => u("interMarePortoPartenza", v) }), _jsx(Field, { label: "Porto Arrivo", value: d.interMarePortoArrivo, onChange: (v) => u("interMarePortoArrivo", v) })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Partenza", value: d.interMareDataPartenza, onChange: (v) => u("interMareDataPartenza", v), type: "date" }), _jsx(Field, { label: "Data Arrivo", value: d.interMareDataArrivo, onChange: (v) => u("interMareDataArrivo", v), type: "date" })] })] })] })), fatturaFrom && (_jsx(NuovaFatturaDialog, { tenantId: fatturaFrom.tenantId, preselectedRighe: fatturaFrom.righe, clienteId: fatturaFrom.clienteFallback?.id, clienteFallback: fatturaFrom.clienteFallback, onClose: () => setFatturaFrom(null), onCreated: () => {
                    setFatturaFrom(null);
                    toast.success(`Fattura creata come ${fatturaFrom.emittente === "niyol" ? "NIYOL ETICONS LOGISTICA" : "MULTY PROGET"}`);
                } }))] }));
}
