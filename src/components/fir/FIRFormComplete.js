import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Save, Send, Plus, ChevronDown, ChevronRight, FileText, Shield, MapPin, Scale, Lock, Search, Download } from "lucide-react";
import { useFIRForms, mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useFIRStore } from "@/stores/firStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { inviaFirmaRentri, resolveSocietaId, chiudiFirRentri, getRentriPdf, getRentriPdfUrl, getRentriXfirUrl } from "@/services/rentriApi";
import { toRentriImageSrc, toRentriPdfPreviewSrc } from "@/lib/rentriMedia";
import { generateFIRPdf } from "@/lib/firPdfExport";
import { generateFIRSummaryPdf } from "@/lib/firSummaryPdf";
import { GLOBAL_RECO, DESTINATARI } from "@/data/anagrafiche";
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
// ── Accordion Section ──────────────────────────────────────
function Section({ title, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);
    const neon = getSectionNeon(title);
    return (_jsxs("div", { className: `rounded-2xl glass-card ${neon.border} border ${neon.bg} overflow-hidden transition-shadow ${open ? neon.glow : ""}`, children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center justify-between p-4 text-left", children: [_jsxs("span", { className: `text-xs font-mono uppercase tracking-wider ${neon.text} flex items-center gap-2`, children: [_jsx("span", { className: `w-2 h-2 rounded-full ${open ? "animate-pulse" : "opacity-50"}`, style: { backgroundColor: "currentColor" } }), title] }), open ? _jsx(ChevronDown, { className: `h-4 w-4 ${neon.text} opacity-60` }) : _jsx(ChevronRight, { className: `h-4 w-4 ${neon.text} opacity-60` })] }), open && _jsx("div", { className: "px-4 pb-4 space-y-3", children: children })] }));
}
// ── Field Components ──────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: label }), _jsx("input", { type: type, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: "w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all" })] }));
}
function TextArea({ label, value, onChange, placeholder, rows = 2 }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: label }), _jsx("textarea", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, rows: rows, className: "w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all resize-none" })] }));
}
function Check({ label, checked, onChange }) {
    return (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => onChange(e.target.checked), className: "accent-primary" }), _jsx("span", { className: "text-xs text-white", children: label })] }));
}
function Row({ children }) {
    return _jsx("div", { className: "grid grid-cols-2 gap-3", children: children });
}
// ── Locked Field (read-only with lock icon) ──────────────────
function LockedField({ label, value }) {
    return (_jsxs("div", { children: [_jsxs("label", { className: "text-[10px] text-white/70 font-mono uppercase tracking-wider mb-1 flex items-center gap-1", children: [_jsx(Lock, { className: "h-3 w-3 text-primary/60" }), label] }), _jsx("div", { className: "w-full bg-secondary/30 border border-primary/10 rounded-lg px-3 py-2 text-white/70 text-sm font-mono cursor-not-allowed select-none", children: value || "—" })] }));
}
// ── Searchable Destinatario Dropdown ──────────────────────────
function DestinatarioSelector({ onSelect }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    const filtered = search.length >= 1
        ? DESTINATARI.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()))
        : DESTINATARI;
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target))
                setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);
    return (_jsxs("div", { ref: ref, className: "relative", children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "\uD83D\uDD0D Seleziona Destinatario / Impianto" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neon-green/60" }), _jsx("input", { type: "text", value: search, onChange: (e) => { setSearch(e.target.value); setIsOpen(true); }, onFocus: () => setIsOpen(true), placeholder: "Cerca tra ~200 impianti...", className: "w-full bg-background/80 border-2 border-neon-green/30 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/50 focus:border-neon-green/60 transition-all" })] }), isOpen && filtered.length > 0 && (_jsx("div", { className: "absolute z-[100] w-full mt-1 max-h-60 overflow-y-auto bg-[#0a0e1a] border-2 border-neon-green/30 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)]", children: filtered.map((d, i) => (_jsxs("button", { onClick: () => {
                        onSelect(d);
                        setSearch(d.nome);
                        setIsOpen(false);
                    }, className: "w-full text-left px-3 py-2.5 hover:bg-neon-green/15 transition-colors border-b border-white/5", children: [_jsx("span", { className: "text-xs text-white font-medium block", children: d.nome }), d.indirizzo && _jsx("span", { className: "text-[10px] text-white/50 block", children: d.indirizzo }), !d.indirizzo && !d.cf && _jsx("span", { className: "text-[10px] text-yellow-500/70 block", children: "\u26A0 Dati incompleti" })] }, i))) })), search.trim().length > 1 && (_jsx("button", { onClick: () => {
                    onSelect({ nome: search.trim(), indirizzo: "", cf: "", tipo: "IMPIANTO" });
                    setIsOpen(false);
                }, className: "w-full mt-1 text-left px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors", children: _jsxs("span", { className: "text-xs text-primary font-medium", children: ["\u270F\uFE0F Usa \"", search.trim(), "\" come nuovo impianto"] }) }))] }));
}
// ── Peso a Destino Popup ──────────────────────────────────
function PesoDestinoPopup({ onConfirm, onCancel }) {
    const [peso, setPeso] = useState("");
    return (_jsx("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm", children: _jsxs("div", { className: "bg-card border border-primary/30 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-primary", children: [_jsx(Scale, { className: "h-5 w-5" }), _jsx("h3", { className: "font-display text-lg tracking-wider", children: "PESO A DESTINO" })] }), _jsx("p", { className: "text-sm text-white/70", children: "Inserisci il peso riscontrato a destino (Kg) per chiudere definitivamente il FIR." }), _jsx("input", { type: "number", value: peso, onChange: (e) => setPeso(e.target.value), placeholder: "Peso in Kg", className: "w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary", autoFocus: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onCancel, className: "flex-1 py-3 rounded-xl bg-secondary/50 border border-border text-white/60 font-display text-sm", children: "ANNULLA" }), _jsx("button", { onClick: () => { if (peso.trim())
                                onConfirm(peso);
                            else
                                toast.error("Inserisci il peso"); }, className: "flex-1 py-3 rounded-xl bg-destructive/80 text-destructive-foreground font-display text-sm tracking-wider", children: "CHIUDI FIR" })] })] }) }));
}
// ── Main Component ──────────────────────────────────────
const isTestFirNumber = (value) => {
    if (!value)
        return false;
    return /^(test[\s-]?|skkzr)/i.test(value.trim());
};
export function FIRFormComplete({ demoMode = false, demoEmailOverride } = {}) {
    const { createFIR, submitFIR, silentSaveFIR, closeFIR } = useFIRForms();
    const store = useFIRStore();
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const isStarted = !!store.editingFirId;
    const [isSigning, setIsSigning] = useState(false);
    const [showPesoPopup, setShowPesoPopup] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [hasPersistedRentriPdf, setHasPersistedRentriPdf] = useState(false);
    const [showControlloStrada, setShowControlloStrada] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);
    const autosaveRef = useRef(null);
    const u = store.updateField;
    const d = store.data;
    // ── Auto-restore + integrity check state locale ─────────────
    const hasAutoRestored = useRef(false);
    useEffect(() => {
        if (!user?.id || hasAutoRestored.current)
            return;
        hasAutoRestored.current = true;
        let isCancelled = false;
        (async () => {
            try {
                // Se lo stato locale indica un FIR attivo, verifica che esista davvero nel DB
                if (store.editingFirId) {
                    const { data: persistedFir } = await supabase
                        .from("fir_forms")
                        .select("*")
                        .eq("id", store.editingFirId)
                        .eq("user_id", user.id)
                        .eq("deleted_by_user", false)
                        .maybeSingle();
                    if (isCancelled)
                        return;
                    if (!persistedFir) {
                        store.resetForm();
                        return;
                    }
                    if (isTestFirNumber(store.data.selectedFirNumber) ||
                        (store.data.selectedFirNumber || "") !== (persistedFir.numero_fir || "")) {
                        store.loadFromDatabase({
                            ...persistedFir,
                            form_data: persistedFir.form_data,
                        });
                        // Pre-fill targa and conducente from profile if empty
                        if (!persistedFir.trasportatore_targa_automezzo && profile?.targa_automezzo) {
                            store.updateField("targaAutomezzo", profile.targa_automezzo.trim());
                        }
                        if (!persistedFir.trasportatore_conducente && profile?.nome) {
                            store.updateField("conducenteNomeCognome", profile.nome.trim());
                        }
                    }
                    // Load persisted PDF URL if available
                    const formData = persistedFir.form_data;
                    if (formData?.rentri_pdf_url) {
                        setPdfBlobUrl(formData.rentri_pdf_url);
                        setHasPersistedRentriPdf(true);
                        console.log("[FIR] Loaded persisted RENTRI PDF URL from form_data");
                    }
                    return;
                }
                const { data: activeFirs } = await supabase
                    .from("fir_forms")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("deleted_by_user", false)
                    .in("status", ["bozza", "inviato"])
                    .order("updated_at", { ascending: false })
                    .limit(1);
                if (isCancelled)
                    return;
                if (activeFirs && activeFirs.length > 0) {
                    const fir = activeFirs[0];
                    store.loadFromDatabase({
                        ...fir,
                        form_data: fir.form_data,
                    });
                    // Pre-fill targa and conducente from profile if draft has them empty
                    if (!fir.trasportatore_targa_automezzo && profile?.targa_automezzo) {
                        store.updateField("targaAutomezzo", profile.targa_automezzo.trim());
                    }
                    if (!fir.trasportatore_conducente && profile?.nome) {
                        store.updateField("conducenteNomeCognome", profile.nome.trim());
                    }
                    console.log("[FIR] Auto-restored active FIR:", fir.numero_fir, "status:", fir.status);
                    // Load persisted PDF URL if available
                    const fd = fir.form_data;
                    if (fd?.rentri_pdf_url) {
                        setPdfBlobUrl(fd.rentri_pdf_url);
                        setHasPersistedRentriPdf(true);
                        console.log("[FIR] Loaded persisted RENTRI PDF URL from form_data (restore)");
                    }
                }
                else if (isTestFirNumber(store.data.selectedFirNumber)) {
                    // Pulisce eventuale valore TEST rimasto nel local storage
                    store.updateMultipleFields({ selectedFirNumber: "", numeroRegistro: "" });
                }
            }
            catch (err) {
                console.warn("[FIR] Auto-restore failed:", err);
            }
        })();
        return () => {
            isCancelled = true;
        };
    }, [user?.id, store.editingFirId, store.data.selectedFirNumber]);
    // ── Autosave every 10 seconds ─────────────────────────
    const doAutosave = useCallback(async () => {
        if (!store.editingFirId || store.workflowStatus === 'chiuso')
            return;
        try {
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
        }
        catch {
            // silent
        }
    }, [store.editingFirId, store.workflowStatus, store.data, silentSaveFIR]);
    useEffect(() => {
        if (store.editingFirId && store.workflowStatus !== 'chiuso') {
            autosaveRef.current = setInterval(doAutosave, 10000);
        }
        return () => { if (autosaveRef.current)
            clearInterval(autosaveRef.current); };
    }, [store.editingFirId, store.workflowStatus, doAutosave]);
    // Generate a demo FIR number with correct format: XXXXX NNNNNN XX
    const generateDemoFirNumber = () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const randL = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * 26)]).join("");
        const randN = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
        return `${randL(5)} ${randN(6)} ${randL(2)}`;
    };
    const ensureAndLoadDraft = async () => {
        if (!user?.id)
            throw new Error("Utente non autenticato");
        // Demo mode: create a REAL draft in DB with a fake FIR number (no pool interaction)
        if (demoMode) {
            // Check if there's already an active demo draft for this user
            const { data: existingDemo } = await supabase
                .from("fir_forms")
                .select("*")
                .eq("user_id", user.id)
                .eq("deleted_by_user", false)
                .in("status", ["bozza", "inviato"])
                .like("note", "%[DEMO]%")
                .maybeSingle();
            if (existingDemo) {
                // Restore existing demo draft
                store.loadFromDatabase({
                    ...existingDemo,
                    form_data: existingDemo.form_data,
                });
                useFIRStore.setState({ editingFirId: existingDemo.id, workflowStatus: existingDemo.status || 'bozza' });
                return existingDemo.numero_fir;
            }
            const demoNum = generateDemoFirNumber();
            const demoId = crypto.randomUUID();
            // Insert a real row so autosave works
            const { error: insertErr } = await supabase.from("fir_forms").insert({
                id: demoId,
                user_id: user.id,
                tenant_id: "167d07ad-9184-484e-85a6-da5ceafa42a3",
                numero_fir: demoNum,
                status: "bozza",
                note: "[DEMO] Test FIR — non di produzione",
            });
            if (insertErr) {
                console.warn("[DEMO] Insert draft failed, falling back to local-only:", insertErr);
            }
            store.resetForm();
            store.updateMultipleFields({ selectedFirNumber: demoNum, numeroRegistro: demoNum });
            useFIRStore.setState({ editingFirId: demoId, workflowStatus: 'bozza' });
            return demoNum;
        }
        const { data: draftId, error: ensureErr } = await supabase.rpc("ensure_user_has_fir_draft", {
            p_user_id: user.id,
        });
        if (ensureErr)
            throw ensureErr;
        if (!draftId)
            throw new Error("Nessun numero FIR disponibile nel pool");
        const { data: draft, error: draftErr } = await supabase
            .from("fir_forms")
            .select("*")
            .eq("id", draftId)
            .eq("user_id", user.id)
            .eq("deleted_by_user", false)
            .maybeSingle();
        if (draftErr)
            throw draftErr;
        if (!draft)
            throw new Error("Bozza FIR non trovata dopo assegnazione");
        store.loadFromDatabase({
            ...draft,
            form_data: draft.form_data,
        });
        useFIRStore.setState({ editingFirId: draft.id, workflowStatus: 'bozza' });
        return draft.numero_fir;
    };
    // ── Start FIR ─────────────────────────────────────
    const handleStart = async () => {
        try {
            const numero = await ensureAndLoadDraft();
            toast.success(`FIR ${numero || "assegnato"} inizializzato!`);
        }
        catch (error) {
            toast.error(error?.message?.includes("Nessun numero FIR")
                ? "🚨 NESSUN NUMERO FIR DISPONIBILE — Contatta l'amministratore!"
                : "Errore nell'inizializzazione del FIR");
        }
    };
    // ── Save Draft (parks the FIR — user can leave) ─────────────────────────────────────
    const handleSaveDraft = async () => {
        try {
            const dbFields = mapStoreToDatabaseFields(store.data);
            if (store.editingFirId) {
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            }
            else {
                await createFIR.mutateAsync(dbFields);
            }
            toast.success("Bozza salvata! Puoi riprendere dalla cronologia.");
            // Reset local state so user is free to leave - delay to ensure save completes
            setPdfBlobUrl(null);
            setHasPersistedRentriPdf(false);
            setTimeout(() => { store.resetForm(); }, 300);
        }
        catch {
            toast.error("Errore nel salvataggio");
        }
    };
    // ── New FIR (reset, assign/reuse valid draft from backend) ─────────────────────────────────────
    const handleNewFIR = async () => {
        if (store.editingFirId && store.workflowStatus !== 'chiuso') {
            try {
                const dbFields = mapStoreToDatabaseFields(store.data);
                await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            }
            catch { /* silent */ }
        }
        store.resetForm();
        setPdfBlobUrl(null);
        setHasPersistedRentriPdf(false);
        try {
            const numero = await ensureAndLoadDraft();
            toast.success(`Nuovo FIR ${numero || "assegnato"} inizializzato!`);
        }
        catch (error) {
            toast.error(error?.message?.includes("Nessun numero FIR")
                ? "🚨 NESSUN NUMERO FIR DISPONIBILE — Contatta l'amministratore!"
                : "Errore nell'inizializzazione del nuovo FIR");
        }
    };
    // ── Validate departure fields ─────────────────────────
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
    // ── INVIA E FIRMA PARTENZA → Render API ─────────────
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
            // Save first
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
            // Call Ngrok Emissione API
            const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
            const result = await inviaFirmaRentri({
                societaId,
                payloadFir: { ...dbFields, numero_fir: d.selectedFirNumber },
            });
            const officialNumeroFir = String(result.numero_fir || d.selectedFirNumber || "").trim();
            const rentriFirId = String(result.firId || result.uuid_fir || "").trim();
            if (officialNumeroFir) {
                store.updateField("selectedFirNumber", officialNumeroFir);
                await silentSaveFIR.mutateAsync({
                    id: store.editingFirId,
                    numero_fir: officialNumeroFir,
                    form_data: { ...dbFields.form_data, rentri_fir_id: rentriFirId || null },
                    status: "inviato",
                    submitted_at: new Date().toISOString(),
                });
            }
            // Save official RENTRI QR code (extract from qr fields)
            const qrFromFirma = toRentriImageSrc(result.qr_code || result.qrCodeBytes || result.qrCode || result.qrUrl);
            if (qrFromFirma && d.selectedFirNumber) {
                setQrCodeData(qrFromFirma);
                await supabase
                    .from("fir_number_pool")
                    .update({ qr_code_data: qrFromFirma })
                    .eq("fir_number", d.selectedFirNumber);
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
        }
        catch (error) {
            console.error("[RENTRI] Firma error:", error);
            toast.error(`Errore firma RENTRI: ${error.message}`);
        }
        finally {
            setIsSigning(false);
        }
    };
    // ── CONTROLLO POLIZIA (QR CODE) → Generate PDF preview ──
    const handleControlloPolizia = async () => {
        try {
            const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
            const firId = d.selectedFirNumber;
            // Se abbiamo un PDF manualmente persistito su storage, NON chiamare RENTRI
            if (hasPersistedRentriPdf && pdfBlobUrl) {
                console.log("[RENTRI] Skipping get-pdf: using persisted rentri_pdf_url from form_data");
            }
            else if (firId) {
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
            // Fallback: load QR from DB
            let qr = qrCodeData;
            if (!qr && firId) {
                const { data: poolRow } = await supabase
                    .from("fir_number_pool")
                    .select("qr_code_data")
                    .eq("fir_number", firId)
                    .maybeSingle();
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
    const handleDownloadMinisterialPdf = async () => {
        try {
            const blob = await generateFIRPdf(store.data);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `FIR_Ministeriale_${d.selectedFirNumber || "bozza"}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF ministeriale scaricato!");
        }
        catch (error) {
            console.error("[PDF] Errore generazione ministeriale:", error);
            toast.error("Errore generazione PDF ministeriale: " + error.message);
        }
    };
    // ── ARRIVATO → Show peso popup ─────────────────────────
    const handleArrivato = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                console.log("[FIR] GPS arrivo:", pos.coords.latitude, pos.coords.longitude);
            });
        }
        setShowPesoPopup(true);
    };
    // ── Confirm closure with peso ─────────────────────────
    const handleConfirmClosure = async (peso) => {
        if (!store.editingFirId)
            return;
        try {
            store.updateField("pesoRicevuto", peso);
            const dbFields = mapStoreToDatabaseFields(store.data);
            await silentSaveFIR.mutateAsync({
                id: store.editingFirId,
                ...dbFields,
                form_data: { ...dbFields.form_data, peso_ricevuto: peso },
            });
            // Send closure to RENTRI backend (firma-ricezione)
            try {
                const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
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
                console.warn("[RENTRI] Chiusura server error (proceeding locally):", renderErr.message);
            }
            await closeFIR.mutateAsync(store.editingFirId);
            useFIRStore.setState({ workflowStatus: 'chiuso' });
            setShowPesoPopup(false);
            toast.success("🏁 FIR chiuso definitivamente!");
            // ── AUTO EMAIL to impianto (PDF RENTRI ufficiale) ──
            const emailDest = demoMode && demoEmailOverride ? demoEmailOverride : d.destinatarioEmail;
            if (emailDest) {
                try {
                    const nomeConducente = d.conducenteNomeCognome || d.trasportatoreNomeAutista || profile?.nome || "Autista";
                    // 1. Try to get RENTRI official PDF as base64
                    let pdfBase64 = null;
                    let pdfFilename = `FIR_${d.selectedFirNumber || "riepilogo"}.pdf`;
                    // 1a. If we have a blob URL, fetch and convert
                    if (pdfBlobUrl) {
                        try {
                            const blobRes = await fetch(pdfBlobUrl);
                            const blob = await blobRes.blob();
                            const arrayBuf = await blob.arrayBuffer();
                            pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
                            console.log("[AUTO-EMAIL] PDF RENTRI ufficiale recuperato da blob URL");
                        }
                        catch (blobErr) {
                            console.warn("[AUTO-EMAIL] Errore lettura blob URL:", blobErr);
                        }
                    }
                    // 1b. Fallback: fetch from RENTRI backend via proxy
                    if (!pdfBase64) {
                        try {
                            const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
                            const firIdForPdf = d.selectedFirNumber;
                            if (firIdForPdf) {
                                const pdfResult = await getRentriPdf(societaId, firIdForPdf);
                                if (pdfResult.pdfBase64) {
                                    pdfBase64 = pdfResult.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
                                    console.log("[AUTO-EMAIL] PDF RENTRI ufficiale recuperato via get-pdf proxy");
                                }
                            }
                        }
                        catch (proxyErr) {
                            console.warn("[AUTO-EMAIL] Fallback get-pdf proxy fallito:", proxyErr);
                        }
                    }
                    // 1c. Last fallback: generate local summary PDF
                    if (!pdfBase64) {
                        console.warn("[AUTO-EMAIL] PDF RENTRI non disponibile, uso summary locale");
                        const pdfBlob = await generateFIRSummaryPdf(store.data, { qrCodeBase64: qrCodeData || undefined });
                        const arrayBuf = await pdfBlob.arrayBuffer();
                        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
                    }
                    const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Buongiorno,</p>
              <p>in allegato il pdf del formulario scaricato da <strong>${nomeConducente}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">N° FIR</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${d.selectedFirNumber || "—"}</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">CER</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${d.codiceEER || "—"}</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Quantità</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${d.quantita || "—"} ${d.unitaMisura || "kg"}</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Peso a destino</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${peso} kg</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Produttore</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${d.produttoreDenominazione || "—"}</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold;">Destinatario</td><td style="padding: 6px; border-bottom: 1px solid #eee;">${d.destinatarioDenominazione || "—"}</td></tr>
              </table>
              <p style="margin-top: 24px; color: #666; font-size: 12px;">Email automatica inviata da Global Reco — globalreco@zoli.live</p>
            </div>
          `;
                    await supabase.functions.invoke("send-global-email", {
                        body: {
                            to: emailDest,
                            subject: `FIR ${d.selectedFirNumber || ""} - Formulario da ${nomeConducente}`,
                            html: htmlBody,
                            firId: store.editingFirId,
                            category: "automatica",
                            attachments: [{
                                    content: pdfBase64,
                                    filename: pdfFilename,
                                    type: "application/pdf",
                                }],
                        },
                    });
                    toast.success("📧 Email con PDF RENTRI inviata a " + d.destinatarioDenominazione);
                }
                catch (emailErr) {
                    console.error("[AUTO-EMAIL] Errore invio:", emailErr);
                    toast.error("Email non inviata: " + emailErr.message);
                }
            }
            else {
                console.warn("[AUTO-EMAIL] Nessuna email impianto per", d.destinatarioDenominazione);
            }
        }
        catch (error) {
            toast.error("Errore chiusura: " + error.message);
        }
    };
    // ── Handle destinatario selection from dropdown ──────────
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
    const tabs = [
        { label: "PRINCIPALE" },
        { label: "TRASBORDO" },
        { label: "INTERMODALE" },
    ];
    return (_jsxs("div", { className: "px-4 py-4 space-y-4", children: [showPesoPopup && (_jsx(PesoDestinoPopup, { onConfirm: handleConfirmClosure, onCancel: () => setShowPesoPopup(false) })), _jsx("div", { className: "text-center", children: _jsx("h2", { className: "text-sm font-display uppercase tracking-widest text-primary", children: "COMPILA FIR / FORMULARIO RENTRI" }) }), _jsx("div", { className: "flex gap-1 bg-secondary/30 rounded-xl p-1", children: tabs.map((tab, i) => (_jsx("button", { onClick: () => setActiveTab(i), className: `flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${activeTab === i ? "bg-primary/20 text-primary font-semibold" : "text-white/50 hover:text-white"}`, children: tab.label }, i))) }), _jsxs("div", { className: "flex flex-col items-center gap-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" }), _jsx("span", { className: "text-xs font-mono uppercase tracking-widest text-neon-green", children: "Formulari Disponibili" })] }), !isStarted && !store.editingFirId ? (_jsxs("button", { onClick: handleStart, disabled: createFIR.isPending, className: "w-full py-5 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-xl tracking-widest hover:bg-neon-green/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3 animate-pulse-subtle", children: [_jsx(FileText, { className: "h-6 w-6 icon-led" }), "INIZIA"] })) : (_jsx("div", { className: "w-full space-y-2", children: d.selectedFirNumber && (_jsx("div", { className: "text-center py-2 rounded-xl bg-neon-green/10 border border-neon-green/30", children: _jsx("span", { className: "text-xs font-mono text-neon-green tracking-wider", children: d.selectedFirNumber }) })) }))] }), (isStarted || store.editingFirId) && (_jsxs("div", { className: "space-y-2", children: [store.workflowStatus === 'bozza' && (_jsxs("button", { onClick: handleInviaFirma, disabled: isSigning, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 text-background font-display text-base tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]", children: [isSigning ? (_jsx("div", { className: "w-5 h-5 border-2 border-background/50 border-t-background rounded-full animate-spin" })) : (_jsx(Send, { className: "h-5 w-5 icon-led" })), isSigning ? "FIRMA IN CORSO..." : "INVIA E FIRMA PARTENZA"] })), store.workflowStatus === 'inviato' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: handleControlloPolizia, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]", children: [_jsx(Shield, { className: "h-5 w-5 icon-led" }), " CONTROLLO POLIZIA (QR CODE)"] }), _jsxs("button", { onClick: handleArrivato, className: "w-full py-4 rounded-2xl bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]", children: [_jsx(MapPin, { className: "h-5 w-5 icon-led" }), " ARRIVATO"] })] })), store.workflowStatus === 'chiuso' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-center py-4 rounded-2xl bg-destructive/10 border border-destructive/30", children: [_jsx("p", { className: "text-destructive font-display text-sm tracking-wider", children: "\uD83C\uDFC1 FIR CHIUSO DEFINITIVAMENTE" }), d.pesoRicevuto && _jsxs("p", { className: "text-xs text-white/60 mt-1 font-mono", children: ["Peso a destino: ", d.pesoRicevuto, " Kg"] })] }), d.selectedFirNumber && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("a", { href: getRentriPdfUrl(d.selectedFirNumber), target: "_blank", rel: "noopener noreferrer", className: "flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " PDF RENTRI"] }), _jsxs("a", { href: getRentriXfirUrl(d.selectedFirNumber), target: "_blank", rel: "noopener noreferrer", className: "flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " xFIR XML"] })] }), _jsxs("button", { onClick: handleDownloadSummaryPdf, className: "w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-display text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors", children: [_jsx(FileText, { className: "h-4 w-4" }), " Scarica Riepilogo Viaggio"] }), _jsxs("button", { onClick: handleDownloadMinisterialPdf, className: "w-full py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-display text-sm flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-colors", children: [_jsx(FileText, { className: "h-4 w-4" }), " PDF Ministeriale (3 pagine)"] })] })), _jsxs("button", { onClick: handleNewFIR, className: "w-full py-4 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-base tracking-widest hover:bg-neon-green/10 transition-all flex items-center justify-center gap-3", children: [_jsx(Plus, { className: "h-5 w-5" }), " NUOVO FIR"] })] })), showControlloStrada && store.workflowStatus === 'inviato' && (_jsxs("div", { className: "rounded-2xl border border-blue-500/30 overflow-hidden", children: [_jsxs("div", { className: "bg-white p-6 flex flex-col items-center gap-4", style: { backgroundColor: '#FFFFFF' }, children: [qrCodeData ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-gray-500 text-[10px] font-mono uppercase tracking-wider", children: "QR Code Ufficiale RENTRI" }), _jsx("img", { src: qrCodeData, alt: "QR Code Ufficiale RENTRI \u2013 cifrato per Forze dell'Ordine", className: "w-72 h-72 object-contain", style: { imageRendering: 'crisp-edges' } }), _jsx("p", { className: "text-gray-400 text-[9px] font-mono text-center max-w-[280px]", children: "Questo QR Code \u00E8 cifrato e leggibile solo dall'app in dotazione alle Forze dell'Ordine" })] })) : (_jsxs("div", { className: "w-72 h-72 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-xl bg-amber-50 gap-3", children: [_jsx(Shield, { className: "h-10 w-10 text-amber-500" }), _jsx("p", { className: "text-amber-700 text-sm text-center font-semibold px-4", children: "In attesa di ricezione QR Code ufficiale dal RENTRI" }), _jsx("p", { className: "text-amber-500 text-[10px] text-center font-mono px-4", children: "Il QR verr\u00E0 mostrato non appena il server RENTRI lo rilascer\u00E0" })] })), _jsx("p", { className: "text-black font-mono text-lg font-bold tracking-wider", children: d.selectedFirNumber || "N/A" })] }), _jsxs("div", { className: "bg-card/80 p-4 space-y-2 text-xs font-mono", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Targa:" }), _jsx("span", { className: "text-white font-bold", children: d.targaAutomezzo || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "EER:" }), _jsx("span", { className: "text-white font-bold", children: d.codiceEER || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Quantit\u00E0:" }), _jsxs("span", { className: "text-white font-bold", children: [d.quantita, " ", d.unitaMisura] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Produttore:" }), _jsx("span", { className: "text-white font-bold truncate ml-2", children: d.produttoreDenominazione || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Destinatario:" }), _jsx("span", { className: "text-white font-bold truncate ml-2", children: d.destinatarioDenominazione || "—" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Data Partenza:" }), _jsx("span", { className: "text-white font-bold", children: d.oraDataInizioTrasporto || "—" })] })] }), _jsxs("div", { className: "bg-card/60 p-3 flex gap-2", children: [_jsxs("button", { onClick: handleDownloadSummaryPdf, className: "flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors", children: [_jsx(Download, { className: "h-4 w-4" }), " Scarica Riepilogo Viaggio"] }), _jsxs("button", { onClick: () => {
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
                            handleNewFIR(); }, disabled: createFIR.isPending, className: "flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50", children: [_jsx(Plus, { className: "h-4 w-4" }), " Nuovo FIR"] }), _jsxs("button", { onClick: handleSaveDraft, disabled: createFIR.isPending || silentSaveFIR.isPending, className: "flex-1 py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors disabled:opacity-50", children: [_jsx(Save, { className: "h-4 w-4" }), " Metti in Bozza"] })] })), _jsx("div", { className: "p-4 rounded-2xl bg-card/60 border border-border/30", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Data Emissione" }), _jsx("input", { type: "date", value: d.dataEmissione, onChange: (e) => u("dataEmissione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Registro" }), _jsxs("div", { className: "flex gap-1 mb-2", children: [_jsx("button", { onClick: () => u("registroSi", true), className: `flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`, children: "S\u00CC" }), _jsx("button", { onClick: () => u("registroSi", false), className: `flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${!d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`, children: "NO" })] }), d.registroSi && (_jsx("input", { type: "text", value: d.selectedFirNumber || d.numeroRegistro, readOnly: true, className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none" }))] })] }) }), activeTab === 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: `1. Produttore (${GLOBAL_RECO.nome})`, defaultOpen: true, children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-2 px-1", children: [_jsx(Lock, { className: "h-3.5 w-3.5 text-primary" }), _jsx("span", { className: "text-[10px] font-mono text-primary uppercase tracking-wider", children: "Soggetto bloccato" })] }), _jsx(LockedField, { label: "Denominazione", value: d.produttoreDenominazione }), _jsx(LockedField, { label: "Unit\u00E0 locale / Indirizzo", value: d.produttoreUnitaLocale }), _jsx(LockedField, { label: "Codice Fiscale / P.IVA", value: d.produttoreCF }), _jsxs(Row, { children: [_jsx(LockedField, { label: "RENTRI / Autorizzazione", value: d.produttoreNumeroAut }), _jsx(LockedField, { label: "Tipo Aut.", value: d.produttoreTipoAut })] }), _jsx(Field, { label: "Luogo produzione (se diverso)", value: d.produttoreLuogoProduzioneDiverso, onChange: (v) => u("produttoreLuogoProduzioneDiverso", v) }), _jsx(Field, { label: "Data Autorizzazione", value: d.produttoreDataAut, onChange: (v) => u("produttoreDataAut", v), type: "date" }), _jsx(Check, { label: "Detentore diverso dal produttore", checked: d.isDetentore, onChange: (v) => u("isDetentore", v) }), d.isDetentore && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Detentore - Denominazione", value: d.detentoreDenominazione, onChange: (v) => u("detentoreDenominazione", v) }), _jsx(Field, { label: "Detentore - Unit\u00E0 locale", value: d.detentoreUnitaLocale, onChange: (v) => u("detentoreUnitaLocale", v) }), _jsx(Field, { label: "Detentore - CF", value: d.detentoreCF, onChange: (v) => u("detentoreCF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Aut.", value: d.detentoreNumeroAut, onChange: (v) => u("detentoreNumeroAut", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.detentoreTipoAut, onChange: (v) => u("detentoreTipoAut", v) })] })] }))] }), _jsxs(Section, { title: "Cantiere (se applicabile)", children: [_jsx(Field, { label: "Indirizzo", value: d.cantiereIndirizzo, onChange: (v) => u("cantiereIndirizzo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Comune", value: d.cantiereComune, onChange: (v) => u("cantiereComune", v) }), _jsx(Field, { label: "Provincia", value: d.cantiereProvincia, onChange: (v) => u("cantiereProvincia", v) })] }), _jsx(Field, { label: "CAP", value: d.cantiereCAP, onChange: (v) => u("cantiereCAP", v) })] }), _jsxs(Section, { title: "3. Destinatario", children: [_jsx(DestinatarioSelector, { onSelect: handleDestinatarioSelect }), _jsx(Field, { label: "Denominazione", value: d.destinatarioDenominazione, onChange: (v) => u("destinatarioDenominazione", v), placeholder: "Ragione sociale impianto" }), _jsx(Field, { label: "Unit\u00E0 locale / Indirizzo", value: d.destinatarioUnitaLocale, onChange: (v) => u("destinatarioUnitaLocale", v) }), _jsx(Field, { label: "Codice Fiscale / P.IVA", value: d.destinatarioCF, onChange: (v) => u("destinatarioCF", v) }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Operazione" }), _jsxs("select", { value: d.destinatarioOperazione, onChange: (e) => u("destinatarioOperazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "R", children: "Recupero (R)" }), _jsx("option", { value: "D", children: "Smaltimento (D)" })] })] }), _jsx(Field, { label: "Codice Operazione", value: d.destinatarioCodiceOperazione, onChange: (v) => u("destinatarioCodiceOperazione", v), placeholder: "es. R13" })] }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Autorizzazione", value: d.destinatarioNumeroAut, onChange: (v) => u("destinatarioNumeroAut", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.destinatarioTipoAut, onChange: (v) => u("destinatarioTipoAut", v) })] }), _jsx(Field, { label: "Data Autorizzazione", value: d.destinatarioDataAut, onChange: (v) => u("destinatarioDataAut", v), type: "date" })] }), _jsxs(Section, { title: `4. Trasportatore (${GLOBAL_RECO.nome})`, children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-2 px-1", children: [_jsx(Lock, { className: "h-3.5 w-3.5 text-primary" }), _jsx("span", { className: "text-[10px] font-mono text-primary uppercase tracking-wider", children: "Soggetto bloccato" })] }), _jsx(LockedField, { label: "Denominazione", value: d.trasportatoreDenominazione }), _jsx(LockedField, { label: "Codice Fiscale / P.IVA", value: d.trasportatoreCF }), _jsxs(Row, { children: [_jsx(LockedField, { label: "N\u00B0 Iscrizione Albo", value: d.trasportatoreNumeroAlbo }), _jsx(LockedField, { label: "Data Iscrizione", value: d.trasportatoreDataAlbo })] }), _jsx(LockedField, { label: "Situato in", value: d.trasportatoreSituatoIn }), _jsx(Field, { label: "Nome Autista", value: d.trasportatoreNomeAutista, onChange: (v) => u("trasportatoreNomeAutista", v) })] }), _jsxs(Section, { title: "5. Intermediario / Commerciante", children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-2 px-1", children: [_jsx(Lock, { className: "h-3.5 w-3.5 text-primary" }), _jsx("span", { className: "text-[10px] font-mono text-primary uppercase tracking-wider", children: "Soggetto bloccato" })] }), _jsx(LockedField, { label: "Denominazione", value: d.intermediarioDenominazione }), _jsx(LockedField, { label: "Codice Fiscale / P.IVA", value: d.intermediarioCF }), _jsx(LockedField, { label: "N\u00B0 Iscrizione Albo (Cod.RS)", value: d.intermediarioNumeroAlbo })] }), _jsxs(Section, { title: "6. Caratteristiche del Rifiuto", defaultOpen: true, children: [_jsx(Field, { label: "Codice EER", value: d.codiceEER, onChange: (v) => u("codiceEER", v), placeholder: "es. 17 04 05" }), _jsx(Field, { label: "Descrizione Rifiuto", value: d.descrizione, onChange: (v) => u("descrizione", v), placeholder: "Descrizione del rifiuto" }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Stato Fisico" }), _jsxs("select", { value: d.statoFisico, onChange: (e) => u("statoFisico", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "", children: "--" }), _jsx("option", { value: "1", children: "1 - Solido pulverulento" }), _jsx("option", { value: "2", children: "2 - Solido non pulverulento" }), _jsx("option", { value: "3", children: "3 - Fangoso palabile" }), _jsx("option", { value: "4", children: "4 - Liquido" }), _jsx("option", { value: "5", children: "5 - Aeriforme" }), _jsx("option", { value: "6", children: "6 - Altro" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Provenienza" }), _jsxs("select", { value: d.provenienza, onChange: (e) => u("provenienza", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "speciale", children: "Speciale" }), _jsx("option", { value: "urbano", children: "Urbano" })] })] })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Quantit\u00E0 (Kg)", value: d.quantita, onChange: (v) => u("quantita", v), placeholder: "0" }), _jsx(Field, { label: "Quantit\u00E0 (Litri)", value: d.quantitaLitri, onChange: (v) => u("quantitaLitri", v), placeholder: "0" })] }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Aspetto Esteriore" }), _jsxs("select", { value: d.aspettoEsteriore, onChange: (e) => u("aspettoEsteriore", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "colli", children: "Colli" }), _jsx("option", { value: "rinfusa", children: "Rinfusa" })] })] }), _jsx(Field, { label: "N\u00B0 Colli", value: d.numeroColli, onChange: (v) => u("numeroColli", v) })] }), _jsx(Check, { label: "Verificato in partenza", checked: d.verificatoPartenza, onChange: (v) => u("verificatoPartenza", v) }), _jsx(Field, { label: "Caratteristiche HP (separate da virgola)", value: d.caratteristicheHP.join(", "), onChange: (v) => u("caratteristicheHP", v.split(",").map(s => s.trim()).filter(Boolean)), placeholder: "HP4, HP5..." })] }), _jsxs(Section, { title: "Analisi e Classificazione", children: [_jsx(Check, { label: "Analisi / Rapporti di prova", checked: d.analisiRapportiProva, onChange: (v) => u("analisiRapportiProva", v) }), d.analisiRapportiProva && (_jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Documento", value: d.analisiNumero, onChange: (v) => u("analisiNumero", v) }), _jsx(Field, { label: "Valido al", value: d.analisiValidaAl, onChange: (v) => u("analisiValidaAl", v), type: "date" })] })), _jsx(Check, { label: "Classificazione", checked: d.classificazione, onChange: (v) => u("classificazione", v) }), d.classificazione && (_jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Documento", value: d.classificazioneNumero, onChange: (v) => u("classificazioneNumero", v) }), _jsx(Field, { label: "Valido al", value: d.classificazioneValidaAl, onChange: (v) => u("classificazioneValidaAl", v), type: "date" })] }))] }), _jsxs(Section, { title: "7. Trasporto ADR / Merci Pericolose", children: [_jsx(Check, { label: "Trasporto soggetto a normativa ADR", checked: d.trasportoADR, onChange: (v) => u("trasportoADR", v) }), d.trasportoADR && (_jsxs(_Fragment, { children: [_jsxs(Row, { children: [_jsx(Field, { label: "Classe Pericolo", value: d.adrClassePericolo, onChange: (v) => u("adrClassePericolo", v) }), _jsx(Field, { label: "N\u00B0 ONU", value: d.adrNumeroONU, onChange: (v) => u("adrNumeroONU", v) })] }), _jsx(Field, { label: "Note ADR", value: d.adrNote, onChange: (v) => u("adrNote", v) })] }))] }), _jsxs(Section, { title: "8-9. Conducente e Trasporto", children: [_jsx(Field, { label: "Conducente - Nome e Cognome", value: d.conducenteNomeCognome, onChange: (v) => u("conducenteNomeCognome", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Inizio Trasporto", value: d.oraDataInizioTrasporto, onChange: (v) => u("oraDataInizioTrasporto", v), type: "date" }), _jsx(Field, { label: "Ora Inizio", value: d.oraInizioTrasporto, onChange: (v) => u("oraInizioTrasporto", v), type: "time" })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Automezzo", value: d.targaAutomezzo, onChange: (v) => u("targaAutomezzo", v), placeholder: "AA 000 BB" }), _jsx(Field, { label: "Targa Rimorchio", value: d.targaRimorchio, onChange: (v) => u("targaRimorchio", v) })] }), _jsx(Field, { label: "Percorso diverso dal pi\u00F9 breve", value: d.percorsoDiverso, onChange: (v) => u("percorsoDiverso", v) })] }), _jsxs(Section, { title: "10. Allegati", children: [_jsx(Check, { label: "Allegato microraccolta", checked: d.allegatoMicroraccolta, onChange: (v) => u("allegatoMicroraccolta", v) }), _jsx(Check, { label: "Allegato intermodale", checked: d.allegatoIntermodale, onChange: (v) => u("allegatoIntermodale", v) })] }), _jsxs(Section, { title: "11. Registro", children: [_jsx(Check, { label: "Registro cronologico SI", checked: d.registroSi, onChange: (v) => u("registroSi", v) }), _jsx(Field, { label: "N\u00B0 Annotazione Registro", value: d.numeroRegistro, onChange: (v) => u("numeroRegistro", v) }), _jsx(Field, { label: "Data Emissione", value: d.dataEmissione, onChange: (v) => u("dataEmissione", v), type: "date" })] }), _jsxs(Section, { title: "12. Accettazione Destinatario", children: [_jsxs(Row, { children: [_jsx(Field, { label: "Data Arrivo", value: d.dataOraArrivo, onChange: (v) => u("dataOraArrivo", v), type: "datetime-local" }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Accettazione" }), _jsxs("select", { value: d.accettazione, onChange: (e) => u("accettazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "", children: "--" }), _jsx("option", { value: "intero", children: "Accettato per intero" }), _jsx("option", { value: "parziale", children: "Accettato parzialmente" }), _jsx("option", { value: "respinto", children: "Respinto" })] })] })] }), d.accettazione === "parziale" && (_jsx(Field, { label: "Quantit\u00E0 Accettata (Kg)", value: d.quantitaAccettata, onChange: (v) => u("quantitaAccettata", v) })), d.accettazione === "respinto" && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "Causale Respingimento", value: d.causaleRespingimento, onChange: (v) => u("causaleRespingimento", v) }), _jsx(Field, { label: "Motivazione", value: d.motivazioneRespingimento, onChange: (v) => u("motivazioneRespingimento", v) })] })), _jsx(Field, { label: "Peso Ricevuto (Kg)", value: d.pesoRicevuto, onChange: (v) => u("pesoRicevuto", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Ricezione", value: d.dataRicezione, onChange: (v) => u("dataRicezione", v), type: "date" }), _jsx(Field, { label: "Ora Ricezione", value: d.oraRicezione, onChange: (v) => u("oraRicezione", v), type: "time" })] }), _jsx(Check, { label: "In attesa di verifica analitica", checked: d.inAttesaVerificaAnalitica, onChange: (v) => u("inAttesaVerificaAnalitica", v) })] }), _jsx(Section, { title: "17. Annotazioni", children: _jsx(TextArea, { label: "Annotazioni", value: d.annotazioni, onChange: (v) => u("annotazioni", v), rows: 3 }) })] })), activeTab === 1 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: "13. Trasbordo Parziale", children: [_jsx(Field, { label: "Nuovo Trasportatore - Denominazione", value: d.trasbordoParzDenominazione, onChange: (v) => u("trasbordoParzDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.trasbordoParzCF, onChange: (v) => u("trasbordoParzCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.trasbordoParzAlbo, onChange: (v) => u("trasbordoParzAlbo", v) }), _jsx(Field, { label: "Causale", value: d.trasbordoParzCausale, onChange: (v) => u("trasbordoParzCausale", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Quantit\u00E0 Residua (Kg)", value: d.trasbordoParzQuantitaResidua, onChange: (v) => u("trasbordoParzQuantitaResidua", v) }), _jsx(Field, { label: "N\u00B0 Nuovo FIR", value: d.trasbordoParzNuovoFir, onChange: (v) => u("trasbordoParzNuovoFir", v) })] })] }), _jsxs(Section, { title: "Trasbordo Totale", children: [_jsx(Field, { label: "Nuovo Trasportatore - Denominazione", value: d.trasbordoTotDenominazione, onChange: (v) => u("trasbordoTotDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.trasbordoTotCF, onChange: (v) => u("trasbordoTotCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.trasbordoTotAlbo, onChange: (v) => u("trasbordoTotAlbo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Nuovo Mezzo", value: d.trasbordoTotTarga, onChange: (v) => u("trasbordoTotTarga", v) }), _jsx(Field, { label: "Targa Rimorchio", value: d.trasbordoTotRimorchio, onChange: (v) => u("trasbordoTotRimorchio", v) })] }), _jsx(Field, { label: "Conducente", value: d.trasbordoTotConducente, onChange: (v) => u("trasbordoTotConducente", v) }), _jsx(Field, { label: "Data/Ora Presa in Carico", value: d.trasbordoTotDataPresaCarico, onChange: (v) => u("trasbordoTotDataPresaCarico", v), type: "datetime-local" })] }), _jsxs(Section, { title: "14. Soste Tecniche", children: [_jsx("p", { className: "text-xs text-white/60 mb-2", children: "Sosta 1" }), _jsx(Field, { label: "Luogo", value: d.sosta1Luogo, onChange: (v) => u("sosta1Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta1Inizio, onChange: (v) => u("sosta1Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta1Fine, onChange: (v) => u("sosta1Fine", v), type: "datetime-local" })] }), _jsx("p", { className: "text-xs text-white/60 mb-2 mt-3", children: "Sosta 2" }), _jsx(Field, { label: "Luogo", value: d.sosta2Luogo, onChange: (v) => u("sosta2Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta2Inizio, onChange: (v) => u("sosta2Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta2Fine, onChange: (v) => u("sosta2Fine", v), type: "datetime-local" })] }), _jsx("p", { className: "text-xs text-white/60 mb-2 mt-3", children: "Sosta 3" }), _jsx(Field, { label: "Luogo", value: d.sosta3Luogo, onChange: (v) => u("sosta3Luogo", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Inizio Sospensione", value: d.sosta3Inizio, onChange: (v) => u("sosta3Inizio", v), type: "datetime-local" }), _jsx(Field, { label: "Fine Sospensione", value: d.sosta3Fine, onChange: (v) => u("sosta3Fine", v), type: "datetime-local" })] })] }), _jsxs(Section, { title: "15. Secondo Destinatario", children: [_jsx(Field, { label: "Denominazione", value: d.dest2Denominazione, onChange: (v) => u("dest2Denominazione", v) }), _jsx(Field, { label: "Unit\u00E0 Locale", value: d.dest2UnitaLocale, onChange: (v) => u("dest2UnitaLocale", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.dest2CF, onChange: (v) => u("dest2CF", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "N\u00B0 Autorizzazione", value: d.dest2Autorizzazione, onChange: (v) => u("dest2Autorizzazione", v) }), _jsx(Field, { label: "Tipo Aut.", value: d.dest2TipoAut, onChange: (v) => u("dest2TipoAut", v) })] }), _jsx(Field, { label: "Data Autorizzazione", value: d.dest2DataAut, onChange: (v) => u("dest2DataAut", v), type: "date" }), _jsxs(Row, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block", children: "Operazione" }), _jsxs("select", { value: d.dest2Operazione, onChange: (e) => u("dest2Operazione", e.target.value), className: "w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary", children: [_jsx("option", { value: "R", children: "Recupero (R)" }), _jsx("option", { value: "D", children: "Smaltimento (D)" })] })] }), _jsx(Field, { label: "Codice Operazione", value: d.dest2CodiceOperazione, onChange: (v) => u("dest2CodiceOperazione", v), placeholder: "es. R13" })] })] }), _jsx(Section, { title: "16-17. Annotazioni (continuazione)", children: _jsx(TextArea, { label: "Annotazioni aggiuntive", value: d.annotazioniContinuazione, onChange: (v) => u("annotazioniContinuazione", v), rows: 4 }) })] })), activeTab === 2 && (_jsxs("div", { className: "space-y-3", children: [_jsxs(Section, { title: "Intermodale Terrestre", defaultOpen: true, children: [_jsx(Field, { label: "Denominazione", value: d.interTerrDenominazione, onChange: (v) => u("interTerrDenominazione", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interTerrCF, onChange: (v) => u("interTerrCF", v) }), _jsx(Field, { label: "N\u00B0 Iscrizione Albo", value: d.interTerrAlbo, onChange: (v) => u("interTerrAlbo", v) }), _jsx(Field, { label: "Conducente", value: d.interTerrConducente, onChange: (v) => u("interTerrConducente", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Targa Mezzo", value: d.interTerrTarga, onChange: (v) => u("interTerrTarga", v) }), _jsx(Field, { label: "Targa Rimorchio", value: d.interTerrRimorchio, onChange: (v) => u("interTerrRimorchio", v) })] })] }), _jsxs(Section, { title: "Intermodale Ferroviario", children: [_jsx(Field, { label: "Denominazione", value: d.interFerroDenominazione, onChange: (v) => u("interFerroDenominazione", v) }), _jsx(Field, { label: "ID Treno", value: d.interFerroIdTreno, onChange: (v) => u("interFerroIdTreno", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interFerroCF, onChange: (v) => u("interFerroCF", v) }), _jsx(Field, { label: "Tratta", value: d.interFerroTratta, onChange: (v) => u("interFerroTratta", v) }), _jsx(Check, { label: "RID (merci pericolose)", checked: d.interFerroRid, onChange: (v) => u("interFerroRid", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Stazione Partenza", value: d.interFerroStazionePartenza, onChange: (v) => u("interFerroStazionePartenza", v) }), _jsx(Field, { label: "Stazione Arrivo", value: d.interFerroStazioneArrivo, onChange: (v) => u("interFerroStazioneArrivo", v) })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Partenza", value: d.interFerroDataPartenza, onChange: (v) => u("interFerroDataPartenza", v), type: "date" }), _jsx(Field, { label: "Data Arrivo", value: d.interFerroDataArrivo, onChange: (v) => u("interFerroDataArrivo", v), type: "date" })] })] }), _jsxs(Section, { title: "Intermodale Marittimo", children: [_jsx(Field, { label: "Denominazione", value: d.interMareDenominazione, onChange: (v) => u("interMareDenominazione", v) }), _jsx(Field, { label: "ID Nave", value: d.interMareIdNave, onChange: (v) => u("interMareIdNave", v) }), _jsx(Field, { label: "Codice Fiscale", value: d.interMareCF, onChange: (v) => u("interMareCF", v) }), _jsx(Check, { label: "IMDG (merci pericolose)", checked: d.interMareImdg, onChange: (v) => u("interMareImdg", v) }), _jsxs(Row, { children: [_jsx(Field, { label: "Porto Partenza", value: d.interMarePortoPartenza, onChange: (v) => u("interMarePortoPartenza", v) }), _jsx(Field, { label: "Porto Arrivo", value: d.interMarePortoArrivo, onChange: (v) => u("interMarePortoArrivo", v) })] }), _jsxs(Row, { children: [_jsx(Field, { label: "Data Partenza", value: d.interMareDataPartenza, onChange: (v) => u("interMareDataPartenza", v), type: "date" }), _jsx(Field, { label: "Data Arrivo", value: d.interMareDataArrivo, onChange: (v) => u("interMareDataArrivo", v), type: "date" })] })] })] }))] }));
}
