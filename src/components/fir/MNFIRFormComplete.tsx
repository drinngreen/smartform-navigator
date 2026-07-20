import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Save, Send, Plus, ChevronDown, ChevronRight, FileText, Shield, MapPin, Scale, Search, Download, Eraser } from "lucide-react";
import { useMNFIRForms } from "@/hooks/useMNFIRForms";
import { mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useMNFIRStore } from "@/stores/mnFirStore";
import { useFIRNumberPool } from "@/hooks/useFIRNumberPool";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { inviaFirmaRentri, resolveSocietaId, chiudiFirRentri, getRentriPdf, getRentriPdfUrl, getRentriXfirUrl } from "@/services/rentriApi";
import { toRentriImageSrc, toRentriPdfPreviewSrc } from "@/lib/rentriMedia";
import { generateFIRSummaryPdf } from "@/lib/firSummaryPdf";
import { DESTINATARI, type Soggetto } from "@/data/anagrafiche";
import { syncFirFinalToRegistryAndInventory, COMPANY_PRESETS, MULTY_TENANT_ID_CONST } from "@/lib/firFinalSync";

// ── Neon color map per section ──────────────────────────────
const SECTION_NEON: Record<string, { border: string; text: string; glow: string; bg: string }> = {
  "1. Produttore":        { border: "border-neon-cyan/40",    text: "text-neon-cyan",    glow: "shadow-[0_0_12px_hsl(187_92%_43%/0.3)]",  bg: "bg-neon-cyan/5" },
  "Detentore":            { border: "border-blue-500/40",     text: "text-blue-400",     glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]",   bg: "bg-blue-500/5" },
  "Cantiere":             { border: "border-blue-500/40",     text: "text-blue-400",     glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]",   bg: "bg-blue-500/5" },
  "3. Destinatario":      { border: "border-neon-green/40",   text: "text-neon-green",   glow: "shadow-[0_0_12px_hsl(160_84%_40%/0.3)]",   bg: "bg-neon-green/5" },
  "4. Trasportatore":     { border: "border-pink-500/40",     text: "text-pink-400",     glow: "shadow-[0_0_12px_rgba(236,72,153,0.3)]",   bg: "bg-pink-500/5" },
  "5. Intermediario":     { border: "border-orange-500/40",   text: "text-orange-400",   glow: "shadow-[0_0_12px_rgba(249,115,22,0.3)]",   bg: "bg-orange-500/5" },
  "6. Caratteristiche":   { border: "border-primary/40",      text: "text-primary",      glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]",    bg: "bg-primary/5" },
  "Analisi":              { border: "border-primary/40",      text: "text-primary",      glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]",    bg: "bg-primary/5" },
  "7. Trasporto":         { border: "border-primary/40",      text: "text-primary",      glow: "shadow-[0_0_12px_hsl(47_38%_58%/0.3)]",    bg: "bg-primary/5" },
  "8-9. Conducente":      { border: "border-neon-purple/40",  text: "text-neon-purple",  glow: "shadow-[0_0_12px_hsl(270_76%_60%/0.3)]",   bg: "bg-neon-purple/5" },
  "12. Accettazione":     { border: "border-red-500/40",      text: "text-red-400",      glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]",    bg: "bg-red-500/5" },
};

function getSectionNeon(title: string) {
  for (const key of Object.keys(SECTION_NEON)) {
    if (title.startsWith(key)) return SECTION_NEON[key];
  }
  return { border: "border-primary/20", text: "text-primary", glow: "shadow-[0_0_8px_hsl(47_38%_58%/0.2)]", bg: "bg-primary/5" };
}

function Section({ title, defaultOpen = false, onClear, children }: { title: string; defaultOpen?: boolean; onClear?: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const neon = getSectionNeon(title);
  return (
    <div className={`rounded-2xl glass-card ${neon.border} border ${neon.bg} overflow-hidden transition-shadow ${open ? neon.glow : ""}`}>
      <div className="w-full flex items-center justify-between p-4 text-left">
        <button onClick={() => setOpen(!open)} className="flex-1 flex items-center gap-2 text-left">
          <span className={`text-xs font-mono uppercase tracking-wider ${neon.text} flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full ${open ? "animate-pulse" : "opacity-50"}`} style={{ backgroundColor: "currentColor" }} />
            {title}
          </span>
        </button>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Cancellare tutti i campi della sezione "${title}"?`)) onClear();
              }}
              title="Pulisci sezione"
              className="p-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setOpen(!open)} type="button" className="p-1">
            {open ? <ChevronDown className={`h-4 w-4 ${neon.text} opacity-60`} /> : <ChevronRight className={`h-4 w-4 ${neon.text} opacity-60`} />}
          </button>
        </div>
      </div>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all resize-none" />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      <span className="text-xs text-white">{label}</span>
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function DestinatarioSelector({ onSelect }: { onSelect: (soggetto: Soggetto) => void }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.length >= 1
    ? DESTINATARI.filter(d => d.nome.toLowerCase().includes(search.toLowerCase()))
    : DESTINATARI;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">🔍 Seleziona Destinatario / Impianto</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neon-green/60" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} placeholder="Cerca tra ~200 impianti..." className="w-full bg-background/80 border-2 border-neon-green/30 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/50 focus:border-neon-green/60 transition-all" />
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 max-h-60 overflow-y-auto bg-[#0a0e1a] border-2 border-neon-green/30 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.15)]">
          {filtered.map((d, i) => (
            <button key={i} onClick={() => { onSelect(d); setSearch(d.nome); setIsOpen(false); }} className="w-full text-left px-3 py-2.5 hover:bg-neon-green/15 transition-colors border-b border-white/5">
              <span className="text-xs text-white font-medium block">{d.nome}</span>
              {d.indirizzo && <span className="text-[10px] text-white/50 block">{d.indirizzo}</span>}
              {!d.indirizzo && !d.cf && <span className="text-[10px] text-yellow-500/70 block">⚠ Dati incompleti</span>}
            </button>
          ))}
        </div>
      )}
      {search.trim().length > 1 && (
        <button onClick={() => { onSelect({ nome: search.trim(), indirizzo: "", cf: "", tipo: "IMPIANTO" }); setIsOpen(false); }} className="w-full mt-1 text-left px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors">
          <span className="text-xs text-primary font-medium">✏️ Usa "{search.trim()}" come nuovo impianto</span>
        </button>
      )}
    </div>
  );
}

function PesoDestinoPopup({ onConfirm, onCancel }: { onConfirm: (peso: string) => void; onCancel: () => void }) {
  const [peso, setPeso] = useState("");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-primary/30 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Scale className="h-5 w-5" />
          <h3 className="font-display text-lg tracking-wider">PESO A DESTINO</h3>
        </div>
        <p className="text-sm text-white/70">Inserisci il peso riscontrato a destino (Kg) per chiudere definitivamente il FIR.</p>
        <input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Peso in Kg" className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border text-white/60 font-display text-sm">ANNULLA</button>
          <button onClick={() => { if (peso.trim()) onConfirm(peso); else toast.error("Inserisci il peso"); }} className="flex-1 py-3 rounded-xl bg-destructive/80 text-destructive-foreground font-display text-sm tracking-wider">CHIUDI FIR</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component — NO PRESETS, all fields editable ──────────────────
const isTestFirNumberMN = (value?: string | null) => {
  if (!value) return false;
  return /^(test[\s-]?|skkzr)/i.test(value.trim());
};

interface MNFIRFormCompleteProps {
  tenantId?: string;
  mnContext?: string;
  firFormId?: string;
  draftData?: any | null;
  impiantoId?: string | null;
  registryMovementType?: "Carico" | "Scarico";
}

export function MNFIRFormComplete({ tenantId, mnContext, firFormId, draftData, impiantoId, registryMovementType }: MNFIRFormCompleteProps) {
  const { myForms, isLoadingMyForms, createFIR, submitFIR, silentSaveFIR, closeFIR } = useMNFIRForms(tenantId);
  const store = useMNFIRStore();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const isStarted = !!store.editingFirId;
  const activeTenantId = tenantId || profile?.tenant_id;
  const activeMnContext = mnContext || profile?.mn_context;
  const [isSigning, setIsSigning] = useState(false);
  const [showPesoPopup, setShowPesoPopup] = useState(false);
  const [showControlloStrada, setShowControlloStrada] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const u = store.updateField;
  const d = store.data;

  const clearFields = useCallback((keys: string[]) => {
    const cur: any = useMNFIRStore.getState().data;
    keys.forEach((k) => {
      const v = cur[k];
      let nv: any = "";
      if (Array.isArray(v)) nv = [];
      else if (typeof v === "boolean") nv = false;
      else if (typeof v === "number") nv = 0;
      (u as any)(k, nv);
    });
  }, [u]);

  useEffect(() => {
    if (!draftData?.id) return;
    store.loadFromDatabase({
      ...draftData,
      form_data: draftData.form_data as Record<string, any> | null,
    });
    useMNFIRStore.setState({ editingFirId: draftData.id, workflowStatus: draftData.status === "completato" ? "chiuso" : (draftData.status as any) || "bozza" });
  }, [draftData?.id]);

  // ── Driver app starts clean: assigned FIRs are opened only by explicit click ─────────────
  const hasAutoRestored = useRef(false);
  useEffect(() => {
    if (firFormId || draftData?.id) return;
    if (!user?.id || hasAutoRestored.current) return;
    hasAutoRestored.current = true;
    if (store.editingFirId || store.data.selectedFirNumber || isTestFirNumberMN(store.data.selectedFirNumber)) {
      store.resetForm();
    }
  }, [user?.id, firFormId, draftData?.id]);

  // ── Autosave every 10 seconds ─────────────────────────
  const doAutosave = useCallback(async () => {
    if (!store.editingFirId || store.workflowStatus === 'chiuso') return;
    try {
      const dbFields = mapStoreToDatabaseFields(store.data);
      await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
    } catch { /* silent */ }
  }, [store.editingFirId, store.workflowStatus, store.data, silentSaveFIR]);

  useEffect(() => {
    if (store.editingFirId && store.workflowStatus !== 'chiuso') {
      autosaveRef.current = setInterval(doAutosave, 10000);
    }
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [store.editingFirId, store.workflowStatus, doAutosave]);

  // ── Autofill Multyproget company data when tenant is Multy ─────────
  useEffect(() => {
    if (!store.editingFirId) return;
    if (activeTenantId !== MULTY_TENANT_ID_CONST) return;
    const preset = COMPANY_PRESETS.multy;
    const updates: Partial<typeof store.data> = {};
    // If Multy is not yet assigned to any role, prefill as PRODUTTORE by default
    // (most common case in DevMulty workspace: outbound trip from Multy plant).
    if (!store.data.produttoreDenominazione.trim() && !store.data.destinatarioDenominazione.trim()) {
      updates.produttoreDenominazione = preset.ragione_sociale;
      updates.produttoreCF = preset.codice_fiscale;
      updates.produttoreUnitaLocale = preset.indirizzo;
    } else if (
      store.data.produttoreDenominazione.trim() === preset.ragione_sociale &&
      !store.data.produttoreCF.trim()
    ) {
      updates.produttoreCF = preset.codice_fiscale;
      updates.produttoreUnitaLocale = updates.produttoreUnitaLocale || (store.data.produttoreUnitaLocale || preset.indirizzo);
    } else if (
      store.data.destinatarioDenominazione.trim() === preset.ragione_sociale &&
      !store.data.destinatarioCF.trim()
    ) {
      updates.destinatarioCF = preset.codice_fiscale;
      updates.destinatarioUnitaLocale = store.data.destinatarioUnitaLocale || preset.indirizzo;
    }
    if (Object.keys(updates).length > 0) store.updateMultipleFields(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.editingFirId, activeTenantId]);

  // ── Salva BOZZA / DEFINITIVO from DevFirWorkspace toolbar ──────────
  useEffect(() => {
    const saveDraft = async () => {
      if (!store.editingFirId) return;
      try {
        const dbFields = mapStoreToDatabaseFields(store.data);
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
        toast.success("💾 Bozza salvata");
      } catch (e: any) {
        toast.error("Errore salvataggio bozza: " + (e?.message || String(e)));
      }
    };
    const saveFinal = async () => {
      if (!store.editingFirId) return;
      try {
        const dbFields = mapStoreToDatabaseFields(store.data);
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields, status: "completato", completed_at: new Date().toISOString() } as any);
        useMNFIRStore.setState({ workflowStatus: 'chiuso' });
        const result = await syncFirFinalToRegistryAndInventory({
          firId: store.editingFirId,
          impiantoId: impiantoId || null,
          registryMovementType: registryMovementType || "Carico",
        });
        if (result.warning) toast.warning(result.warning);
        else toast.success("✅ FIR salvato DEFINITIVO (registro + giacenze)");
        window.dispatchEvent(new CustomEvent("dev-fir-saved", { detail: { firId: store.editingFirId } }));
      } catch (e: any) {
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
    if (!user?.id) throw new Error("Utente non autenticato");

    const { data: draftId, error: ensureErr } = tenantId
      ? await supabase.rpc("ensure_user_has_fir_draft_for_tenant" as any, { p_user_id: user.id, p_tenant_id: tenantId })
      : await supabase.rpc("ensure_user_has_fir_draft" as any, { p_user_id: user.id });
    if (ensureErr) throw ensureErr;
    if (!draftId) throw new Error("Nessuna bozza manuale trovata: crea il FIR inserendo prima il numero esatto");

    let draftQuery = supabase
      .from("fir_forms")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .eq("deleted_by_user", false);
    if (tenantId) draftQuery = draftQuery.eq("tenant_id", tenantId);
    const { data: draft, error: draftErr } = await draftQuery.maybeSingle();

    if (draftErr) throw draftErr;
    if (!draft) throw new Error("Bozza FIR manuale non trovata");

    store.loadFromDatabase({
      ...draft,
      form_data: draft.form_data as Record<string, any> | null,
    });
    useMNFIRStore.setState({ editingFirId: draft.id, workflowStatus: 'bozza' });

    return draft.numero_fir;
  };

  const handleStart = async () => {
    try {
      const numero = await ensureAndLoadDraft();
      toast.success(`FIR ${numero || "assegnato"} inizializzato!`);
    } catch (error: any) {
      toast.error(error?.message || "Errore nell'apertura del FIR");
    }
  };

  const handleSaveDraft = async () => {
    try {
      const dbFields = mapStoreToDatabaseFields(store.data);
      if (store.editingFirId) {
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
      } else {
        await createFIR.mutateAsync(dbFields);
      }
      toast.success("Bozza salvata! Puoi riprendere dalla cronologia.");
      setTimeout(() => { store.resetForm(); }, 300);
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  const handleNewFIR = async () => {
    if (store.editingFirId && store.workflowStatus !== 'chiuso') {
      try {
        const dbFields = mapStoreToDatabaseFields(store.data);
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
      } catch { /* silent */ }
    }

    store.resetForm();

    try {
      const numero = await ensureAndLoadDraft();
      toast.success(`Nuovo FIR ${numero || "assegnato"} inizializzato!`);
    } catch (error: any) {
      toast.error(error?.message || "Errore nell'apertura del nuovo FIR");
    }
  };

  const handleOpenAssignedFir = (form: any) => {
    store.loadFromDatabase({
      ...form,
      form_data: form.form_data as Record<string, any> | null,
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

  const validateDeparture = (): string[] => {
    const errors: string[] = [];
    if (!d.targaAutomezzo.trim()) errors.push("Targa Automezzo");
    if (!d.codiceEER.trim()) errors.push("Codice EER");
    if (!d.produttoreDenominazione.trim()) errors.push("Produttore");
    if (!d.destinatarioDenominazione.trim()) errors.push("Destinatario");
    return errors;
  };

  const handleInviaFirma = async () => {
    if (!store.editingFirId) return;
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
      const rentriFirId = String(result.firId || (result as any).uuid_fir || "").trim();
      if (officialNumeroFir) {
        store.updateField("selectedFirNumber", officialNumeroFir);
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, numero_fir: officialNumeroFir, form_data: { ...dbFields.form_data, rentri_fir_id: rentriFirId || null }, status: "inviato", submitted_at: new Date().toISOString() });
      }
      const qrFromFirma = toRentriImageSrc(
        result.qr_code || (result as any).qrCodeBytes || (result as any).qrCode || (result as any).qrUrl
      );
      if (qrFromFirma && d.selectedFirNumber) {
        setQrCodeData(qrFromFirma);
        await supabase.from("fir_number_pool").update({ qr_code_data: qrFromFirma } as any).eq("fir_number", d.selectedFirNumber);
      }

      // Extract PDF directly from emissione response (backend now returns pdf_content)
      const pdfFromEmissione = (result as any).pdf_content || (result as any).pdfContent || (result as any).pdf_base64 || (result as any).pdfBase64;
      if (pdfFromEmissione) {
        console.log("[RENTRI] PDF received directly from emissione response!");
        const pdfSrc = toRentriPdfPreviewSrc(pdfFromEmissione);
        if (pdfSrc) setPdfBlobUrl(pdfSrc);
      }

      // Fallback: if no PDF/QR from emissione, try get-pdf proxy
      if (!pdfFromEmissione || !qrFromFirma) {
        const firIdForPdf = officialNumeroFir || d.selectedFirNumber;
        if (firIdForPdf) {
          try {
            console.log("[RENTRI] Fallback: fetching via get-pdf proxy for", firIdForPdf);
            const pdfResult = await getRentriPdf(societaId, firIdForPdf);
            if (!qrFromFirma) {
              const qrSrc = toRentriImageSrc(pdfResult.qrCode || (pdfResult as any).qr_code);
              if (qrSrc) {
                setQrCodeData(qrSrc);
                await supabase.from("fir_number_pool").update({ qr_code_data: qrSrc } as any).eq("fir_number", d.selectedFirNumber || firIdForPdf);
              }
            }
            if (!pdfFromEmissione) {
              const pdfSrc = toRentriPdfPreviewSrc(pdfResult.pdfBase64, (pdfResult as any).pdfUrl);
              if (pdfSrc) setPdfBlobUrl(pdfSrc);
            }
          } catch (e: any) {
            console.warn("[RENTRI] Fallback get-pdf failed:", e.message);
          }
        }
      }
    } catch (error: any) {
      toast.error(`Errore firma RENTRI: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

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
          if (qrSrc) setQrCodeData(qrSrc);

          const pdfSrc = toRentriPdfPreviewSrc(pdfResult.pdfBase64, pdfResult.pdfUrl);
          if (pdfSrc) {
            setPdfBlobUrl(pdfSrc);
            if (!qrSrc) toast.success("PDF RENTRI pronto! (QR Code non disponibile dal server)");
            else toast.success("Documenti RENTRI pronti!");
          }
        } catch (pdfErr: any) {
          console.warn("[RENTRI] get-pdf error:", pdfErr.message);
          toast.error("Errore recupero documenti: " + pdfErr.message);
        }
      }
      let qr = qrCodeData;
      if (!qr && firId) {
        const { data: poolRow } = await supabase.from("fir_number_pool").select("qr_code_data").eq("fir_number", firId).maybeSingle();
        if (poolRow?.qr_code_data) { qr = poolRow.qr_code_data; setQrCodeData(qr); }
      }
      setShowControlloStrada(true);
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error("Errore generazione PDF: " + error.message);
    }
  };

  const handleArrivato = () => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(() => {});
    setShowPesoPopup(true);
  };

  const handleConfirmClosure = async (peso: string) => {
    if (!store.editingFirId) return;
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
      } catch (renderErr: any) { console.warn("[RENTRI] Chiusura server error:", renderErr.message); }
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
        } catch (emailErr: any) {
          console.error("[AUTO-EMAIL] Errore invio:", emailErr);
          toast.error("Email non inviata: " + emailErr.message);
        }
      }
    } catch (error: any) {
      toast.error("Errore chiusura: " + error.message);
    }
  };

  const handleDestinatarioSelect = (soggetto: Soggetto) => {
    u("destinatarioDenominazione", soggetto.nome);
    u("destinatarioUnitaLocale", soggetto.indirizzo);
    u("destinatarioCF", soggetto.cf);
    if (soggetto.email) u("destinatarioEmail", soggetto.email);
    if (soggetto.autorizzazione) u("destinatarioNumeroAut", soggetto.autorizzazione);
    if (soggetto.tipoAut) u("destinatarioTipoAut", soggetto.tipoAut);
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

  return (
    <div className="px-4 py-4 space-y-4">
      {showPesoPopup && <PesoDestinoPopup onConfirm={handleConfirmClosure} onCancel={() => setShowPesoPopup(false)} />}

      <div className="text-center">
        <h2 className="text-sm font-display uppercase tracking-widest text-primary">COMPILA FIR / FORMULARIO RENTRI</h2>
      </div>

      <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i as 0 | 1 | 2)} className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${activeTab === i ? "bg-primary/20 text-primary font-semibold" : "text-white/50 hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* FORMULARI DISPONIBILI + INIZIA/RIPRENDI/NUOVO */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-neon-green">Formulari Disponibili</span>
        </div>
        {!isStarted && !store.editingFirId ? (
          <div className="w-full space-y-2">
            {isLoadingMyForms ? (
              <div className="w-full py-4 rounded-2xl border border-border/40 bg-card/40 text-center text-xs font-mono text-muted-foreground">Caricamento FIR assegnati...</div>
            ) : (myForms ?? []).length > 0 ? (
              (myForms ?? []).map((form: any) => (
                <button key={form.id} onClick={() => handleOpenAssignedFir(form)} className="w-full rounded-2xl border border-neon-green/30 bg-neon-green/5 px-4 py-4 text-left hover:bg-neon-green/10 transition-colors">
                  <span className="block text-sm font-display text-neon-green tracking-wider">{form.numero_fir || "FIR senza numero"}</span>
                  <span className="block text-[10px] font-mono uppercase text-white/50">{form.status || "bozza"}</span>
                </button>
              ))
            ) : (
              <div className="w-full py-5 rounded-2xl border-2 border-dashed border-border/50 bg-card/30 text-center text-sm font-mono text-muted-foreground">
                Nessun FIR assegnato.
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-2">
            {d.selectedFirNumber && (
              <div className="text-center py-2 rounded-xl bg-neon-green/10 border border-neon-green/30">
                <span className="text-xs font-mono text-neon-green tracking-wider">{d.selectedFirNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workflow Action Buttons */}
      {(isStarted || store.editingFirId) && (
        <div className="space-y-2">
          {store.workflowStatus === 'bozza' && (
            <button onClick={handleInviaFirma} disabled={isSigning} className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 text-background font-display text-base tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              {isSigning ? <div className="w-5 h-5 border-2 border-background/50 border-t-background rounded-full animate-spin" /> : <Send className="h-5 w-5 icon-led" />}
              {isSigning ? "FIRMA IN CORSO..." : "INVIA E FIRMA PARTENZA"}
            </button>
          )}

          {store.workflowStatus === 'inviato' && (
            <>
              <button onClick={handleControlloPolizia} className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Shield className="h-5 w-5 icon-led" /> CONTROLLO POLIZIA (QR CODE)
              </button>
              <button onClick={handleArrivato} className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <MapPin className="h-5 w-5 icon-led" /> ARRIVATO
              </button>
            </>
          )}

          {store.workflowStatus === 'chiuso' && (
            <>
              <div className="text-center py-4 rounded-2xl bg-destructive/10 border border-destructive/30">
                <p className="text-destructive font-display text-sm tracking-wider">🏁 FIR CHIUSO DEFINITIVAMENTE</p>
                {d.pesoRicevuto && <p className="text-xs text-white/60 mt-1 font-mono">Peso a destino: {d.pesoRicevuto} Kg</p>}
              </div>
              {d.selectedFirNumber && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <a href={getRentriPdfUrl(d.selectedFirNumber)} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                      <Download className="h-4 w-4" /> PDF RENTRI
                    </a>
                    <a href={getRentriXfirUrl(d.selectedFirNumber)} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors">
                      <Download className="h-4 w-4" /> xFIR XML
                    </a>
                  </div>
                  <button onClick={handleDownloadSummaryPdf} className="w-full py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-display text-sm flex items-center justify-center gap-2 hover:bg-blue-500/20 transition-colors">
                    <FileText className="h-4 w-4" /> Scarica Riepilogo Viaggio
                  </button>
                </div>
              )}
              <button onClick={handleNewFIR} className="w-full py-4 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-base tracking-widest hover:bg-neon-green/10 transition-all flex items-center justify-center gap-3">
                <Plus className="h-5 w-5" /> NUOVO FIR
              </button>
            </>
          )}

          {/* Controllo Strada – QR Code + Riepilogo */}
          {showControlloStrada && store.workflowStatus === 'inviato' && (
            <div className="rounded-2xl border border-blue-500/30 overflow-hidden">
              <div className="bg-white p-6 flex flex-col items-center gap-4" style={{ backgroundColor: '#FFFFFF' }}>
                {qrCodeData ? (
                  <>
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">QR Code Ufficiale RENTRI</p>
                    <img src={qrCodeData} alt="QR Code RENTRI" className="w-72 h-72 object-contain" style={{ imageRendering: 'crisp-edges' }} />
                    <p className="text-gray-400 text-[9px] font-mono text-center max-w-[280px]">Questo QR Code è cifrato e leggibile solo dall'app in dotazione alle Forze dell'Ordine</p>
                  </>
                ) : (
                  <div className="w-72 h-72 flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-xl bg-amber-50 gap-3">
                    <Shield className="h-10 w-10 text-amber-500" />
                    <p className="text-amber-700 text-sm text-center font-semibold px-4">In attesa di ricezione QR Code ufficiale dal RENTRI</p>
                  </div>
                )}
                <p className="text-black font-mono text-lg font-bold tracking-wider">{d.selectedFirNumber || "N/A"}</p>
              </div>
              <div className="bg-card/80 p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">Targa:</span><span className="text-white font-bold">{d.targaAutomezzo || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">EER:</span><span className="text-white font-bold">{d.codiceEER || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantità:</span><span className="text-white font-bold">{d.quantita} {d.unitaMisura}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Produttore:</span><span className="text-white font-bold truncate ml-2">{d.produttoreDenominazione || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Destinatario:</span><span className="text-white font-bold truncate ml-2">{d.destinatarioDenominazione || "—"}</span></div>
              </div>
              <div className="bg-card/60 p-3 flex gap-2">
                <button onClick={handleDownloadSummaryPdf} className="flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                  <Download className="h-4 w-4" /> Scarica Riepilogo
                </button>
                <button
                  onClick={() => {
                    if (pdfBlobUrl) {
                      window.open(pdfBlobUrl, "_blank", "noopener,noreferrer");
                      return;
                    }
                    if (d.selectedFirNumber) {
                      window.open(getRentriPdfUrl(d.selectedFirNumber), "_blank", "noopener,noreferrer");
                      return;
                    }
                    toast.error("PDF ufficiale non disponibile");
                  }}
                  className="flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors"
                >
                  <FileText className="h-4 w-4" /> Apri PDF RENTRI
                </button>
                <button onClick={() => setShowControlloStrada(false)} className="py-3 px-4 rounded-xl bg-muted/20 border border-border/30 text-muted-foreground font-display text-sm hover:bg-muted/30 transition-colors">Chiudi</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons — only when active and NOT closed */}
      {(isStarted || store.editingFirId) && store.workflowStatus !== 'chiuso' && (
        <div className="flex gap-2">
          <button onClick={() => { if (window.confirm("La bozza corrente verrà salvata automaticamente. Vuoi procedere con un nuovo formulario?")) handleNewFIR(); }} disabled={createFIR.isPending} className="flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50">
            <Plus className="h-4 w-4" /> Nuovo FIR
          </button>
          <button onClick={handleSaveDraft} disabled={createFIR.isPending || silentSaveFIR.isPending} className="flex-1 py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> Metti in Bozza
          </button>
        </div>
      )}

      {/* Data Emissione + Registro */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Data Emissione</label>
            <input type="date" value={d.dataEmissione} onChange={(e) => u("dataEmissione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Registro</label>
            <div className="flex gap-1 mb-2">
              <button onClick={() => u("registroSi", true)} className={`flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`}>SÌ</button>
              <button onClick={() => u("registroSi", false)} className={`flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${!d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-white/50 border border-border"}`}>NO</button>
            </div>
            {d.registroSi && <Field label="N° Registro" value={d.numeroRegistro} onChange={(v) => u("numeroRegistro", v)} />}
          </div>
        </div>
      </div>

      {/* ═══════ PAGINA 1 - PRINCIPALE ═══════ */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {/* ALL FIELDS EDITABLE — NO LOCKS */}
          <Section title="1. Produttore / Detentore" defaultOpen onClear={() => clearFields(["produttoreDenominazione","produttoreUnitaLocale","produttoreCF","produttoreNumeroAut","produttoreTipoAut","produttoreLuogoProduzioneDiverso","produttoreDataAut","isDetentore","detentoreDenominazione","detentoreUnitaLocale","detentoreCF","detentoreNumeroAut","detentoreTipoAut"])}>
            <Field label="Denominazione" value={d.produttoreDenominazione} onChange={(v) => u("produttoreDenominazione", v)} placeholder="Ragione sociale" />
            <Field label="Unità locale / Indirizzo" value={d.produttoreUnitaLocale} onChange={(v) => u("produttoreUnitaLocale", v)} placeholder="Indirizzo completo" />
            <Field label="Codice Fiscale / P.IVA" value={d.produttoreCF} onChange={(v) => u("produttoreCF", v)} />
            <Row>
              <Field label="RENTRI / Autorizzazione" value={d.produttoreNumeroAut} onChange={(v) => u("produttoreNumeroAut", v)} />
              <Field label="Tipo Aut." value={d.produttoreTipoAut} onChange={(v) => u("produttoreTipoAut", v)} />
            </Row>
            <Field label="Luogo produzione (se diverso)" value={d.produttoreLuogoProduzioneDiverso} onChange={(v) => u("produttoreLuogoProduzioneDiverso", v)} />
            <Field label="Data Autorizzazione" value={d.produttoreDataAut} onChange={(v) => u("produttoreDataAut", v)} type="date" />
            <Check label="Detentore diverso dal produttore" checked={d.isDetentore} onChange={(v) => u("isDetentore", v)} />
            {d.isDetentore && (
              <>
                <Field label="Detentore - Denominazione" value={d.detentoreDenominazione} onChange={(v) => u("detentoreDenominazione", v)} />
                <Field label="Detentore - Unità locale" value={d.detentoreUnitaLocale} onChange={(v) => u("detentoreUnitaLocale", v)} />
                <Field label="Detentore - CF" value={d.detentoreCF} onChange={(v) => u("detentoreCF", v)} />
                <Row>
                  <Field label="N° Aut." value={d.detentoreNumeroAut} onChange={(v) => u("detentoreNumeroAut", v)} />
                  <Field label="Tipo Aut." value={d.detentoreTipoAut} onChange={(v) => u("detentoreTipoAut", v)} />
                </Row>
              </>
            )}
          </Section>

          <Section title="Cantiere (se applicabile)" onClear={() => clearFields(["cantiereIndirizzo","cantiereComune","cantiereProvincia","cantiereCAP"])}>
            <Field label="Indirizzo" value={d.cantiereIndirizzo} onChange={(v) => u("cantiereIndirizzo", v)} />
            <Row>
              <Field label="Comune" value={d.cantiereComune} onChange={(v) => u("cantiereComune", v)} />
              <Field label="Provincia" value={d.cantiereProvincia} onChange={(v) => u("cantiereProvincia", v)} />
            </Row>
            <Field label="CAP" value={d.cantiereCAP} onChange={(v) => u("cantiereCAP", v)} />
          </Section>

          <Section title="3. Destinatario" onClear={() => clearFields(["destinatarioDenominazione","destinatarioUnitaLocale","destinatarioCF","destinatarioOperazione","destinatarioCodiceOperazione","destinatarioNumeroAut","destinatarioTipoAut","destinatarioDataAut"])}>
            <DestinatarioSelector onSelect={handleDestinatarioSelect} />
            <Field label="Denominazione" value={d.destinatarioDenominazione} onChange={(v) => u("destinatarioDenominazione", v)} placeholder="Ragione sociale impianto" />
            <Field label="Unità locale / Indirizzo" value={d.destinatarioUnitaLocale} onChange={(v) => u("destinatarioUnitaLocale", v)} />
            <Field label="Codice Fiscale / P.IVA" value={d.destinatarioCF} onChange={(v) => u("destinatarioCF", v)} />
            <Row>
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Operazione</label>
                <select value={d.destinatarioOperazione} onChange={(e) => u("destinatarioOperazione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="R">Recupero (R)</option>
                  <option value="D">Smaltimento (D)</option>
                </select>
              </div>
              <Field label="Codice Operazione" value={d.destinatarioCodiceOperazione} onChange={(v) => u("destinatarioCodiceOperazione", v)} placeholder="es. R13" />
            </Row>
            <Row>
              <Field label="N° Autorizzazione" value={d.destinatarioNumeroAut} onChange={(v) => u("destinatarioNumeroAut", v)} />
              <Field label="Tipo Aut." value={d.destinatarioTipoAut} onChange={(v) => u("destinatarioTipoAut", v)} />
            </Row>
            <Field label="Data Autorizzazione" value={d.destinatarioDataAut} onChange={(v) => u("destinatarioDataAut", v)} type="date" />
          </Section>

          <Section title="4. Trasportatore" onClear={() => clearFields(["trasportatoreDenominazione","trasportatoreCF","trasportatoreNumeroAlbo","trasportatoreDataAlbo","trasportatoreSituatoIn","trasportatoreNomeAutista"])}>
            <Field label="Denominazione" value={d.trasportatoreDenominazione} onChange={(v) => u("trasportatoreDenominazione", v)} />
            <Field label="Codice Fiscale / P.IVA" value={d.trasportatoreCF} onChange={(v) => u("trasportatoreCF", v)} />
            <Row>
              <Field label="N° Iscrizione Albo" value={d.trasportatoreNumeroAlbo} onChange={(v) => u("trasportatoreNumeroAlbo", v)} />
              <Field label="Data Iscrizione" value={d.trasportatoreDataAlbo} onChange={(v) => u("trasportatoreDataAlbo", v)} type="date" />
            </Row>
            <Field label="Situato in" value={d.trasportatoreSituatoIn} onChange={(v) => u("trasportatoreSituatoIn", v)} />
            <Field label="Nome Autista" value={d.trasportatoreNomeAutista} onChange={(v) => u("trasportatoreNomeAutista", v)} />
          </Section>

          {/* INTERMEDIARIO — ALL FIELDS EDITABLE, NO LOCK */}
          <Section title="5. Intermediario / Commerciante">
            <Field label="Denominazione" value={d.intermediarioDenominazione} onChange={(v) => u("intermediarioDenominazione", v)} />
            <Field label="Codice Fiscale / P.IVA" value={d.intermediarioCF} onChange={(v) => u("intermediarioCF", v)} />
            <Field label="N° Iscrizione Albo (Cod.RS)" value={d.intermediarioNumeroAlbo} onChange={(v) => u("intermediarioNumeroAlbo", v)} />
          </Section>

          <Section title="6. Caratteristiche del Rifiuto" defaultOpen>
            <Field label="Codice EER" value={d.codiceEER} onChange={(v) => u("codiceEER", v)} placeholder="es. 17 04 05" />
            <Field label="Descrizione Rifiuto" value={d.descrizione} onChange={(v) => u("descrizione", v)} placeholder="Descrizione del rifiuto" />
            <Row>
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Stato Fisico</label>
                <select value={d.statoFisico} onChange={(e) => u("statoFisico", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">--</option>
                  <option value="1">1 - Solido pulverulento</option>
                  <option value="2">2 - Solido non pulverulento</option>
                  <option value="3">3 - Fangoso palabile</option>
                  <option value="4">4 - Liquido</option>
                  <option value="5">5 - Aeriforme</option>
                  <option value="6">6 - Altro</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Provenienza</label>
                <select value={d.provenienza} onChange={(e) => u("provenienza", e.target.value as "urbano" | "speciale")} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="speciale">Speciale</option>
                  <option value="urbano">Urbano</option>
                </select>
              </div>
            </Row>
            <Row>
              <Field label="Quantità (Kg)" value={d.quantita} onChange={(v) => u("quantita", v)} placeholder="0" />
              <Field label="Quantità (Litri)" value={d.quantitaLitri} onChange={(v) => u("quantitaLitri", v)} placeholder="0" />
            </Row>
            <Row>
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Aspetto Esteriore</label>
                <select value={d.aspettoEsteriore} onChange={(e) => u("aspettoEsteriore", e.target.value as "colli" | "rinfusa")} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="colli">Colli</option>
                  <option value="rinfusa">Rinfusa</option>
                </select>
              </div>
              <Field label="N° Colli" value={d.numeroColli} onChange={(v) => u("numeroColli", v)} />
            </Row>
            <Check label="Verificato in partenza" checked={d.verificatoPartenza} onChange={(v) => u("verificatoPartenza", v)} />
            <Field label="Caratteristiche HP (separate da virgola)" value={d.caratteristicheHP.join(", ")} onChange={(v) => u("caratteristicheHP", v.split(",").map(s => s.trim()).filter(Boolean))} placeholder="HP4, HP5..." />
          </Section>

          <Section title="Analisi e Classificazione">
            <Check label="Analisi / Rapporti di prova" checked={d.analisiRapportiProva} onChange={(v) => u("analisiRapportiProva", v)} />
            {d.analisiRapportiProva && (
              <Row>
                <Field label="N° Documento" value={d.analisiNumero} onChange={(v) => u("analisiNumero", v)} />
                <Field label="Valido al" value={d.analisiValidaAl} onChange={(v) => u("analisiValidaAl", v)} type="date" />
              </Row>
            )}
            <Check label="Classificazione" checked={d.classificazione} onChange={(v) => u("classificazione", v)} />
            {d.classificazione && (
              <Row>
                <Field label="N° Documento" value={d.classificazioneNumero} onChange={(v) => u("classificazioneNumero", v)} />
                <Field label="Valido al" value={d.classificazioneValidaAl} onChange={(v) => u("classificazioneValidaAl", v)} type="date" />
              </Row>
            )}
          </Section>

          <Section title="7. Trasporto ADR / Merci Pericolose">
            <Check label="Trasporto soggetto a normativa ADR" checked={d.trasportoADR} onChange={(v) => u("trasportoADR", v)} />
            {d.trasportoADR && (
              <>
                <Row>
                  <Field label="Classe Pericolo" value={d.adrClassePericolo} onChange={(v) => u("adrClassePericolo", v)} />
                  <Field label="N° ONU" value={d.adrNumeroONU} onChange={(v) => u("adrNumeroONU", v)} />
                </Row>
                <Field label="Note ADR" value={d.adrNote} onChange={(v) => u("adrNote", v)} />
              </>
            )}
          </Section>

          <Section title="8-9. Conducente e Trasporto">
            <Field label="Conducente - Nome e Cognome" value={d.conducenteNomeCognome} onChange={(v) => u("conducenteNomeCognome", v)} />
            <Row>
              <Field label="Data Inizio Trasporto" value={d.oraDataInizioTrasporto} onChange={(v) => u("oraDataInizioTrasporto", v)} type="date" />
              <Field label="Ora Inizio" value={d.oraInizioTrasporto} onChange={(v) => u("oraInizioTrasporto", v)} type="time" />
            </Row>
            <Row>
              <Field label="Targa Automezzo" value={d.targaAutomezzo} onChange={(v) => u("targaAutomezzo", v)} placeholder="AA 000 BB" />
              <Field label="Targa Rimorchio" value={d.targaRimorchio} onChange={(v) => u("targaRimorchio", v)} />
            </Row>
            <Field label="Percorso diverso dal più breve" value={d.percorsoDiverso} onChange={(v) => u("percorsoDiverso", v)} />
          </Section>

          <Section title="10. Allegati">
            <Check label="Allegato microraccolta" checked={d.allegatoMicroraccolta} onChange={(v) => u("allegatoMicroraccolta", v)} />
            <Check label="Allegato intermodale" checked={d.allegatoIntermodale} onChange={(v) => u("allegatoIntermodale", v)} />
          </Section>

          <Section title="11. Registro">
            <Check label="Registro cronologico SI" checked={d.registroSi} onChange={(v) => u("registroSi", v)} />
            <Field label="N° Annotazione Registro" value={d.numeroRegistro} onChange={(v) => u("numeroRegistro", v)} />
            <Field label="Data Emissione" value={d.dataEmissione} onChange={(v) => u("dataEmissione", v)} type="date" />
          </Section>

          <Section title="12. Accettazione Destinatario">
            <Row>
              <Field label="Data Arrivo" value={d.dataOraArrivo} onChange={(v) => u("dataOraArrivo", v)} type="datetime-local" />
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Accettazione</label>
                <select value={d.accettazione} onChange={(e) => u("accettazione", e.target.value as any)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">--</option>
                  <option value="intero">Accettato per intero</option>
                  <option value="parziale">Accettato parzialmente</option>
                  <option value="respinto">Respinto</option>
                </select>
              </div>
            </Row>
            {d.accettazione === "parziale" && <Field label="Quantità Accettata (Kg)" value={d.quantitaAccettata} onChange={(v) => u("quantitaAccettata", v)} />}
            {d.accettazione === "respinto" && (
              <>
                <Field label="Causale Respingimento" value={d.causaleRespingimento} onChange={(v) => u("causaleRespingimento", v)} />
                <Field label="Motivazione" value={d.motivazioneRespingimento} onChange={(v) => u("motivazioneRespingimento", v)} />
              </>
            )}
            <Field label="Peso Ricevuto (Kg)" value={d.pesoRicevuto} onChange={(v) => u("pesoRicevuto", v)} />
            <Row>
              <Field label="Data Ricezione" value={d.dataRicezione} onChange={(v) => u("dataRicezione", v)} type="date" />
              <Field label="Ora Ricezione" value={d.oraRicezione} onChange={(v) => u("oraRicezione", v)} type="time" />
            </Row>
            <Check label="In attesa di verifica analitica" checked={d.inAttesaVerificaAnalitica} onChange={(v) => u("inAttesaVerificaAnalitica", v)} />
          </Section>

          <Section title="17. Annotazioni">
            <TextArea label="Annotazioni" value={d.annotazioni} onChange={(v) => u("annotazioni", v)} rows={3} />
          </Section>
        </div>
      )}

      {/* ═══════ PAGINA 2 - TRASBORDO ═══════ */}
      {activeTab === 1 && (
        <div className="space-y-3">
          <Section title="13. Trasbordo Parziale">
            <Field label="Nuovo Trasportatore - Denominazione" value={d.trasbordoParzDenominazione} onChange={(v) => u("trasbordoParzDenominazione", v)} />
            <Field label="Codice Fiscale" value={d.trasbordoParzCF} onChange={(v) => u("trasbordoParzCF", v)} />
            <Field label="N° Iscrizione Albo" value={d.trasbordoParzAlbo} onChange={(v) => u("trasbordoParzAlbo", v)} />
            <Field label="Causale" value={d.trasbordoParzCausale} onChange={(v) => u("trasbordoParzCausale", v)} />
            <Row>
              <Field label="Quantità Residua (Kg)" value={d.trasbordoParzQuantitaResidua} onChange={(v) => u("trasbordoParzQuantitaResidua", v)} />
              <Field label="N° Nuovo FIR" value={d.trasbordoParzNuovoFir} onChange={(v) => u("trasbordoParzNuovoFir", v)} />
            </Row>
          </Section>

          <Section title="Trasbordo Totale">
            <Field label="Nuovo Trasportatore - Denominazione" value={d.trasbordoTotDenominazione} onChange={(v) => u("trasbordoTotDenominazione", v)} />
            <Field label="Codice Fiscale" value={d.trasbordoTotCF} onChange={(v) => u("trasbordoTotCF", v)} />
            <Field label="N° Iscrizione Albo" value={d.trasbordoTotAlbo} onChange={(v) => u("trasbordoTotAlbo", v)} />
            <Row>
              <Field label="Targa Nuovo Mezzo" value={d.trasbordoTotTarga} onChange={(v) => u("trasbordoTotTarga", v)} />
              <Field label="Targa Rimorchio" value={d.trasbordoTotRimorchio} onChange={(v) => u("trasbordoTotRimorchio", v)} />
            </Row>
            <Field label="Conducente" value={d.trasbordoTotConducente} onChange={(v) => u("trasbordoTotConducente", v)} />
            <Field label="Data/Ora Presa in Carico" value={d.trasbordoTotDataPresaCarico} onChange={(v) => u("trasbordoTotDataPresaCarico", v)} type="datetime-local" />
          </Section>

          <Section title="14. Soste Tecniche">
            <p className="text-xs text-white/60 mb-2">Sosta 1</p>
            <Field label="Luogo" value={d.sosta1Luogo} onChange={(v) => u("sosta1Luogo", v)} />
            <Row>
              <Field label="Inizio Sospensione" value={d.sosta1Inizio} onChange={(v) => u("sosta1Inizio", v)} type="datetime-local" />
              <Field label="Fine Sospensione" value={d.sosta1Fine} onChange={(v) => u("sosta1Fine", v)} type="datetime-local" />
            </Row>
            <p className="text-xs text-white/60 mb-2 mt-3">Sosta 2</p>
            <Field label="Luogo" value={d.sosta2Luogo} onChange={(v) => u("sosta2Luogo", v)} />
            <Row>
              <Field label="Inizio Sospensione" value={d.sosta2Inizio} onChange={(v) => u("sosta2Inizio", v)} type="datetime-local" />
              <Field label="Fine Sospensione" value={d.sosta2Fine} onChange={(v) => u("sosta2Fine", v)} type="datetime-local" />
            </Row>
            <p className="text-xs text-white/60 mb-2 mt-3">Sosta 3</p>
            <Field label="Luogo" value={d.sosta3Luogo} onChange={(v) => u("sosta3Luogo", v)} />
            <Row>
              <Field label="Inizio Sospensione" value={d.sosta3Inizio} onChange={(v) => u("sosta3Inizio", v)} type="datetime-local" />
              <Field label="Fine Sospensione" value={d.sosta3Fine} onChange={(v) => u("sosta3Fine", v)} type="datetime-local" />
            </Row>
          </Section>

          <Section title="15. Secondo Destinatario">
            <Field label="Denominazione" value={d.dest2Denominazione} onChange={(v) => u("dest2Denominazione", v)} />
            <Field label="Unità Locale" value={d.dest2UnitaLocale} onChange={(v) => u("dest2UnitaLocale", v)} />
            <Field label="Codice Fiscale" value={d.dest2CF} onChange={(v) => u("dest2CF", v)} />
            <Row>
              <Field label="N° Autorizzazione" value={d.dest2Autorizzazione} onChange={(v) => u("dest2Autorizzazione", v)} />
              <Field label="Tipo Aut." value={d.dest2TipoAut} onChange={(v) => u("dest2TipoAut", v)} />
            </Row>
            <Field label="Data Autorizzazione" value={d.dest2DataAut} onChange={(v) => u("dest2DataAut", v)} type="date" />
            <Row>
              <div>
                <label className="text-[10px] text-white/80 font-mono uppercase tracking-wider mb-1 block">Operazione</label>
                <select value={d.dest2Operazione} onChange={(e) => u("dest2Operazione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="R">Recupero (R)</option>
                  <option value="D">Smaltimento (D)</option>
                </select>
              </div>
              <Field label="Codice Operazione" value={d.dest2CodiceOperazione} onChange={(v) => u("dest2CodiceOperazione", v)} placeholder="es. R13" />
            </Row>
          </Section>

          <Section title="16-17. Annotazioni (continuazione)">
            <TextArea label="Annotazioni aggiuntive" value={d.annotazioniContinuazione} onChange={(v) => u("annotazioniContinuazione", v)} rows={4} />
          </Section>
        </div>
      )}

      {/* ═══════ PAGINA 3 - INTERMODALE ═══════ */}
      {activeTab === 2 && (
        <div className="space-y-3">
          <Section title="Intermodale Terrestre" defaultOpen>
            <Field label="Denominazione" value={d.interTerrDenominazione} onChange={(v) => u("interTerrDenominazione", v)} />
            <Field label="Codice Fiscale" value={d.interTerrCF} onChange={(v) => u("interTerrCF", v)} />
            <Field label="N° Iscrizione Albo" value={d.interTerrAlbo} onChange={(v) => u("interTerrAlbo", v)} />
            <Field label="Conducente" value={d.interTerrConducente} onChange={(v) => u("interTerrConducente", v)} />
            <Row>
              <Field label="Targa Mezzo" value={d.interTerrTarga} onChange={(v) => u("interTerrTarga", v)} />
              <Field label="Targa Rimorchio" value={d.interTerrRimorchio} onChange={(v) => u("interTerrRimorchio", v)} />
            </Row>
          </Section>

          <Section title="Intermodale Ferroviario">
            <Field label="Denominazione" value={d.interFerroDenominazione} onChange={(v) => u("interFerroDenominazione", v)} />
            <Field label="ID Treno" value={d.interFerroIdTreno} onChange={(v) => u("interFerroIdTreno", v)} />
            <Field label="Codice Fiscale" value={d.interFerroCF} onChange={(v) => u("interFerroCF", v)} />
            <Field label="Tratta" value={d.interFerroTratta} onChange={(v) => u("interFerroTratta", v)} />
            <Check label="RID (merci pericolose)" checked={d.interFerroRid} onChange={(v) => u("interFerroRid", v)} />
            <Row>
              <Field label="Stazione Partenza" value={d.interFerroStazionePartenza} onChange={(v) => u("interFerroStazionePartenza", v)} />
              <Field label="Stazione Arrivo" value={d.interFerroStazioneArrivo} onChange={(v) => u("interFerroStazioneArrivo", v)} />
            </Row>
            <Row>
              <Field label="Data Partenza" value={d.interFerroDataPartenza} onChange={(v) => u("interFerroDataPartenza", v)} type="date" />
              <Field label="Data Arrivo" value={d.interFerroDataArrivo} onChange={(v) => u("interFerroDataArrivo", v)} type="date" />
            </Row>
          </Section>

          <Section title="Intermodale Marittimo">
            <Field label="Denominazione" value={d.interMareDenominazione} onChange={(v) => u("interMareDenominazione", v)} />
            <Field label="ID Nave" value={d.interMareIdNave} onChange={(v) => u("interMareIdNave", v)} />
            <Field label="Codice Fiscale" value={d.interMareCF} onChange={(v) => u("interMareCF", v)} />
            <Check label="IMDG (merci pericolose)" checked={d.interMareImdg} onChange={(v) => u("interMareImdg", v)} />
            <Row>
              <Field label="Porto Partenza" value={d.interMarePortoPartenza} onChange={(v) => u("interMarePortoPartenza", v)} />
              <Field label="Porto Arrivo" value={d.interMarePortoArrivo} onChange={(v) => u("interMarePortoArrivo", v)} />
            </Row>
            <Row>
              <Field label="Data Partenza" value={d.interMareDataPartenza} onChange={(v) => u("interMareDataPartenza", v)} type="date" />
              <Field label="Data Arrivo" value={d.interMareDataArrivo} onChange={(v) => u("interMareDataArrivo", v)} type="date" />
            </Row>
          </Section>
        </div>
      )}
    </div>
  );
}
