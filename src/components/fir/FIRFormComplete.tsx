import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Send, Plus, ChevronDown, ChevronRight, FileText, Shield, MapPin, Scale, Lock, Search, Download } from "lucide-react";
import { useFIRForms, mapStoreToDatabaseFields } from "@/hooks/useFIRForms";
import { useFIRStore } from "@/stores/firStore";
import { useFIRNumberPool } from "@/hooks/useFIRNumberPool";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { inviaFirmaRentri, resolveSocietaId, chiudiFirRentri, getRentriPdfUrl, getRentriXfirUrl } from "@/services/rentriApi";
import { generateFIRPdf } from "@/lib/firPdfExport";
import { GLOBAL_RECO, MULTYPROGET, DESTINATARI } from "@/data/anagrafiche";

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

// ── Accordion Section ──────────────────────────────────────
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const neon = getSectionNeon(title);
  return (
    <div className={`rounded-2xl glass-card ${neon.border} border ${neon.bg} overflow-hidden transition-shadow ${open ? neon.glow : ""}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className={`text-xs font-mono uppercase tracking-wider ${neon.text} flex items-center gap-2`}>
          <span className={`w-2 h-2 rounded-full ${open ? "animate-pulse" : "opacity-50"}`} style={{ backgroundColor: "currentColor" }} />
          {title}
        </span>
        {open ? <ChevronDown className={`h-4 w-4 ${neon.text} opacity-60`} /> : <ChevronRight className={`h-4 w-4 ${neon.text} opacity-60`} />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Field Components ──────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-background/80 border border-primary/15 rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/40 focus:shadow-[0_0_8px_hsl(47_38%_58%/0.2)] transition-all resize-none" />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary" />
      <span className="text-xs text-foreground">{label}</span>
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

// ── Locked Field (read-only with lock icon) ──────────────────
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
        <Lock className="h-3 w-3 text-primary/60" />
        {label}
      </label>
      <div className="w-full bg-secondary/30 border border-primary/10 rounded-lg px-3 py-2 text-foreground/70 text-sm font-mono cursor-not-allowed select-none">
        {value || "—"}
      </div>
    </div>
  );
}

// ── Searchable Destinatario Dropdown ──────────────────────────
function DestinatarioSelector({ onSelect }: { onSelect: (nome: string, indirizzo: string, cf: string) => void }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.length >= 1
    ? DESTINATARI.filter(d => d.nome.toLowerCase().includes(search.toLowerCase())).slice(0, 20)
    : DESTINATARI.slice(0, 20);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Seleziona Destinatario</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Cerca impianto / destinatario..."
          className="w-full bg-background/80 border border-neon-green/20 rounded-lg pl-9 pr-3 py-2 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neon-green focus:border-neon-green/40 transition-all"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-card border border-border/50 rounded-xl shadow-xl backdrop-blur-sm">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nessun risultato</div>
          )}
          {filtered.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(d.nome, d.indirizzo, d.cf);
                setSearch(d.nome);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-neon-green/10 transition-colors border-b border-border/10 last:border-0"
            >
              <span className="text-xs text-foreground font-medium block">{d.nome}</span>
              {d.indirizzo && <span className="text-[10px] text-muted-foreground block">{d.indirizzo}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Peso a Destino Popup ──────────────────────────────────
function PesoDestinoPopup({ onConfirm, onCancel }: { onConfirm: (peso: string) => void; onCancel: () => void }) {
  const [peso, setPeso] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-primary/30 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Scale className="h-5 w-5" />
          <h3 className="font-display text-lg tracking-wider">PESO A DESTINO</h3>
        </div>
        <p className="text-sm text-muted-foreground">Inserisci il peso riscontrato a destino (Kg) per chiudere definitivamente il FIR.</p>
        <input
          type="number"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder="Peso in Kg"
          className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-secondary/50 border border-border text-muted-foreground font-display text-sm">ANNULLA</button>
          <button
            onClick={() => { if (peso.trim()) onConfirm(peso); else toast.error("Inserisci il peso"); }}
            className="flex-1 py-3 rounded-xl bg-destructive/80 text-destructive-foreground font-display text-sm tracking-wider"
          >
            CHIUDI FIR
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export function FIRFormComplete() {
  const { createFIR, submitFIR, silentSaveFIR, closeFIR } = useFIRForms();
  const store = useFIRStore();
  const { user, profile } = useAuth();
  const { availableNumbers } = useFIRNumberPool();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [isStarted, setIsStarted] = useState(!!store.editingFirId);
  const [isSigning, setIsSigning] = useState(false);
  const [showPesoPopup, setShowPesoPopup] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const u = store.updateField;
  const d = store.data;

  // ── Autosave every 10 seconds ─────────────────────────
  const doAutosave = useCallback(async () => {
    if (!store.editingFirId || store.workflowStatus === 'chiuso') return;
    try {
      const dbFields = mapStoreToDatabaseFields(store.data);
      await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
    } catch {
      // silent
    }
  }, [store.editingFirId, store.workflowStatus, store.data, silentSaveFIR]);

  useEffect(() => {
    if (store.editingFirId && store.workflowStatus !== 'chiuso') {
      autosaveRef.current = setInterval(doAutosave, 10000);
    }
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [store.editingFirId, store.workflowStatus, doAutosave]);

  // ── Start FIR ─────────────────────────────────────
  const handleStart = async () => {
    if (!availableNumbers || availableNumbers.length === 0) {
      toast.error("Nessun numero FIR disponibile nel tuo pool");
      return;
    }
    try {
      const firNumber = availableNumbers[0];
      const dbFields = mapStoreToDatabaseFields(store.data);
      const result = await createFIR.mutateAsync({ ...dbFields, numero_fir: firNumber.fir_number, status: "bozza" });
      store.updateField("selectedFirNumber", firNumber.fir_number);
      store.updateField("numeroRegistro", firNumber.fir_number);
      useFIRStore.setState({ editingFirId: result.id, workflowStatus: 'bozza' });
      setIsStarted(true);
      toast.success(`FIR ${firNumber.fir_number} inizializzato!`);
    } catch {
      toast.error("Errore nell'inizializzazione del FIR");
    }
  };

  // ── Save Draft ─────────────────────────────────────
  const handleSaveDraft = async () => {
    try {
      const dbFields = mapStoreToDatabaseFields(store.data);
      if (store.editingFirId) {
        await silentSaveFIR.mutateAsync({ id: store.editingFirId, ...dbFields });
      } else {
        await createFIR.mutateAsync(dbFields);
      }
      toast.success("Bozza salvata!");
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  // ── New FIR (reset and start fresh) ─────────────────────────────────────
  const handleNewFIR = () => {
    store.resetForm();
    setIsStarted(false);
    setPdfBlobUrl(null);
    toast.info("Pronto per un nuovo FIR");
  };

  // ── Validate departure fields ─────────────────────────
  const validateDeparture = (): string[] => {
    const errors: string[] = [];
    if (!d.targaAutomezzo.trim()) errors.push("Targa Automezzo");
    if (!d.codiceEER.trim()) errors.push("Codice EER");
    if (!d.quantita.trim()) errors.push("Quantità (Kg)");
    if (!d.produttoreDenominazione.trim()) errors.push("Produttore");
    if (!d.destinatarioDenominazione.trim()) errors.push("Destinatario");
    return errors;
  };

  // ── INVIA E FIRMA PARTENZA → Render API ─────────────
  const handleInviaFirma = async () => {
    if (!store.editingFirId) return;

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

      // Call Render API
      const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
      const result = await inviaFirmaRentri({
        societaId,
        payloadFir: { ...dbFields, numero_fir: d.selectedFirNumber },
      });

      // Persist numero_fir, qr_code and status
      if (result.numero_fir) {
        store.updateField("selectedFirNumber", result.numero_fir);
        await silentSaveFIR.mutateAsync({
          id: store.editingFirId,
          numero_fir: result.numero_fir,
          status: "inviato",
          submitted_at: new Date().toISOString(),
        });
      }

      // Save QR code data to pool if returned
      if (result.qr_code && d.selectedFirNumber) {
        await supabase
          .from("fir_number_pool")
          .update({ qr_code_data: result.qr_code } as any)
          .eq("fir_number", d.selectedFirNumber);
      }

      // Set workflow to green
      useFIRStore.setState({ workflowStatus: 'inviato' });

      // Register GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          console.log("[FIR] GPS partenza:", pos.coords.latitude, pos.coords.longitude);
        });
      }

      toast.success("✅ FIR firmato e inviato con successo!");
    } catch (error: any) {
      console.error("[RENTRI] Firma error:", error);
      toast.error(`Errore firma RENTRI: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  // ── CONTROLLO POLIZIA (QR CODE) → Generate PDF preview ──
  const handleControlloPolizia = async () => {
    try {
      const blob = await generateFIRPdf(store.data);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      toast.success("PDF generato - anteprima disponibile");
    } catch (error: any) {
      toast.error("Errore generazione PDF: " + error.message);
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
  const handleConfirmClosure = async (peso: string) => {
    if (!store.editingFirId) return;
    try {
      store.updateField("pesoRicevuto", peso);
      const dbFields = mapStoreToDatabaseFields(store.data);
      await silentSaveFIR.mutateAsync({
        id: store.editingFirId,
        ...dbFields,
        form_data: { ...dbFields.form_data, peso_ricevuto: peso },
      });

      // Send closure to Render backend
      try {
        const societaId = resolveSocietaId(profile?.tenant_id, profile?.mn_context);
        await chiudiFirRentri({
          societaId,
          numero_fir: d.selectedFirNumber,
          peso_accettato: parseFloat(peso),
          data_arrivo: new Date().toISOString(),
        });
      } catch (renderErr: any) {
        console.warn("[RENTRI] Chiusura server error (proceeding locally):", renderErr.message);
      }

      await closeFIR.mutateAsync(store.editingFirId);
      useFIRStore.setState({ workflowStatus: 'chiuso' });
      setShowPesoPopup(false);
      toast.success("🏁 FIR chiuso definitivamente!");
    } catch (error: any) {
      toast.error("Errore chiusura: " + error.message);
    }
  };

  // ── Handle destinatario selection from dropdown ──────────
  const handleDestinatarioSelect = (nome: string, indirizzo: string, cf: string) => {
    u("destinatarioDenominazione", nome);
    u("destinatarioUnitaLocale", indirizzo);
    u("destinatarioCF", cf);
  };

  const tabs = [
    { label: "PRINCIPALE" },
    { label: "TRASBORDO" },
    { label: "INTERMODALE" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Peso Popup */}
      {showPesoPopup && (
        <PesoDestinoPopup onConfirm={handleConfirmClosure} onCancel={() => setShowPesoPopup(false)} />
      )}

      {/* ── Header ── */}
      <div className="text-center">
        <h2 className="text-sm font-display uppercase tracking-widest text-primary">COMPILA FIR / FORMULARIO RENTRI</h2>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i as 0 | 1 | 2)} className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center transition-colors ${activeTab === i ? "bg-primary/20 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FORMULARI DISPONIBILI + INIZIA/RIPRENDI/NUOVO ── */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-widest text-neon-green">Formulari Disponibili</span>
        </div>
        {!isStarted && !store.editingFirId ? (
          <button onClick={handleStart} disabled={createFIR.isPending} className="w-full py-5 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-xl tracking-widest hover:bg-neon-green/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3 animate-pulse-subtle">
            <FileText className="h-6 w-6 icon-led" />
            INIZIA
          </button>
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

      {/* ── Workflow Action Buttons (Semaforo-driven) ── */}
      {(isStarted || store.editingFirId) && (
        <div className="space-y-2">
          {/* BOZZA state → INVIA E FIRMA PARTENZA */}
          {store.workflowStatus === 'bozza' && (
            <button
              onClick={handleInviaFirma}
              disabled={isSigning}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600/80 to-yellow-500/80 text-background font-display text-base tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
            >
              {isSigning ? (
                <div className="w-5 h-5 border-2 border-background/50 border-t-background rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5 icon-led" />
              )}
              {isSigning ? "FIRMA IN CORSO..." : "INVIA E FIRMA PARTENZA"}
            </button>
          )}

          {/* INVIATO state → CONTROLLO POLIZIA + ARRIVATO */}
          {store.workflowStatus === 'inviato' && (
            <>
               <button
                onClick={handleControlloPolizia}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600/80 to-blue-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              >
                <Shield className="h-5 w-5 icon-led" /> CONTROLLO POLIZIA (QR CODE)
              </button>
              <button
                onClick={handleArrivato}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600/80 to-red-500/80 text-white font-display text-base tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
              >
                <MapPin className="h-5 w-5 icon-led" /> ARRIVATO
              </button>
            </>
          )}

          {/* CHIUSO state → Download + NUOVO FIR */}
          {store.workflowStatus === 'chiuso' && (
            <>
              <div className="text-center py-4 rounded-2xl bg-destructive/10 border border-destructive/30">
                <p className="text-destructive font-display text-sm tracking-wider">🏁 FIR CHIUSO DEFINITIVAMENTE</p>
                {d.pesoRicevuto && <p className="text-xs text-muted-foreground mt-1 font-mono">Peso a destino: {d.pesoRicevuto} Kg</p>}
              </div>
              {/* Download PDF & xFIR from Render */}
              {d.selectedFirNumber && (
                <div className="flex gap-2">
                  <a
                    href={getRentriPdfUrl(d.selectedFirNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                  >
                    <Download className="h-4 w-4" /> PDF RENTRI
                  </a>
                  <a
                    href={getRentriXfirUrl(d.selectedFirNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors"
                  >
                    <Download className="h-4 w-4" /> xFIR XML
                  </a>
                </div>
              )}
              <button
                onClick={handleNewFIR}
                className="w-full py-4 rounded-2xl border-2 border-neon-green/40 bg-neon-green/5 text-neon-green font-display text-base tracking-widest hover:bg-neon-green/10 transition-all flex items-center justify-center gap-3"
              >
                <Plus className="h-5 w-5" /> NUOVO FIR
              </button>
            </>
          )}

          {/* PDF Preview (Controllo Polizia) */}
          {pdfBlobUrl && store.workflowStatus === 'inviato' && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-400 font-mono mb-2 text-center">📄 ANTEPRIMA PDF - CONTROLLO POLIZIA</p>
              <iframe src={pdfBlobUrl} className="w-full h-[400px] rounded-lg border border-border/30" />
              <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="block text-center mt-2 text-xs text-blue-400 underline">Apri in nuova scheda</a>
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons (Nuovo + Salva) — only when active and NOT closed ── */}
      {(isStarted || store.editingFirId) && store.workflowStatus !== 'chiuso' && (
        <div className="flex gap-2">
          <button onClick={() => { if (window.confirm("La bozza corrente verrà salvata. Vuoi procedere con un nuovo formulario?")) handleNewFIR(); }} className="flex-1 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-display text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
            <Plus className="h-4 w-4" /> Nuovo FIR
          </button>
          <button onClick={handleSaveDraft} disabled={createFIR.isPending || silentSaveFIR.isPending} className="flex-1 py-3 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-display text-sm flex items-center justify-center gap-2 hover:bg-neon-cyan/20 transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> Salva Bozza
          </button>
        </div>
      )}

      {/* ── Data Emissione + Registro ── */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/30">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Data Emissione</label>
            <input type="date" value={d.dataEmissione} onChange={(e) => u("dataEmissione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Registro</label>
            <div className="flex gap-1 mb-2">
              <button onClick={() => u("registroSi", true)} className={`flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground border border-border"}`}>SÌ</button>
              <button onClick={() => u("registroSi", false)} className={`flex-1 py-1.5 rounded-lg text-xs font-display transition-colors ${!d.registroSi ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground border border-border"}`}>NO</button>
            </div>
            {d.registroSi && (
              <input type="text" value={d.selectedFirNumber || d.numeroRegistro} readOnly className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground text-xs font-mono focus:outline-none" />
            )}
          </div>
        </div>
      </div>

      {/* ═══════ PAGINA 1 - FORMULARIO ═══════ */}
      {activeTab === 0 && (
        <div className="space-y-3">
          {/* ── 1. PRODUTTORE (LOCKED - Global Reco) ── */}
          <Section title={`1. Produttore (${GLOBAL_RECO.nome})`} defaultOpen>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Soggetto bloccato</span>
            </div>
            <LockedField label="Denominazione" value={d.produttoreDenominazione} />
            <LockedField label="Unità locale / Indirizzo" value={d.produttoreUnitaLocale} />
            <LockedField label="Codice Fiscale / P.IVA" value={d.produttoreCF} />
            <Row>
              <LockedField label="RENTRI / Autorizzazione" value={d.produttoreNumeroAut} />
              <LockedField label="Tipo Aut." value={d.produttoreTipoAut} />
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

          <Section title="Cantiere (se applicabile)">
            <Field label="Indirizzo" value={d.cantiereIndirizzo} onChange={(v) => u("cantiereIndirizzo", v)} />
            <Row>
              <Field label="Comune" value={d.cantiereComune} onChange={(v) => u("cantiereComune", v)} />
              <Field label="Provincia" value={d.cantiereProvincia} onChange={(v) => u("cantiereProvincia", v)} />
            </Row>
            <Field label="CAP" value={d.cantiereCAP} onChange={(v) => u("cantiereCAP", v)} />
          </Section>

          {/* ── 3. DESTINATARIO (Searchable dropdown) ── */}
          <Section title="3. Destinatario">
            <DestinatarioSelector onSelect={handleDestinatarioSelect} />
            <Field label="Denominazione" value={d.destinatarioDenominazione} onChange={(v) => u("destinatarioDenominazione", v)} placeholder="Ragione sociale impianto" />
            <Field label="Unità locale / Indirizzo" value={d.destinatarioUnitaLocale} onChange={(v) => u("destinatarioUnitaLocale", v)} />
            <Field label="Codice Fiscale / P.IVA" value={d.destinatarioCF} onChange={(v) => u("destinatarioCF", v)} />
            <Row>
              <div>
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Operazione</label>
                <select value={d.destinatarioOperazione} onChange={(e) => u("destinatarioOperazione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
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

          <Section title="4. Trasportatore">
            <Field label="Denominazione" value={d.trasportatoreDenominazione} onChange={(v) => u("trasportatoreDenominazione", v)} />
            <Field label="Codice Fiscale / P.IVA" value={d.trasportatoreCF} onChange={(v) => u("trasportatoreCF", v)} />
            <Row>
              <Field label="N° Iscrizione Albo" value={d.trasportatoreNumeroAlbo} onChange={(v) => u("trasportatoreNumeroAlbo", v)} />
              <Field label="Data Iscrizione" value={d.trasportatoreDataAlbo} onChange={(v) => u("trasportatoreDataAlbo", v)} type="date" />
            </Row>
            <Field label="Situato in" value={d.trasportatoreSituatoIn} onChange={(v) => u("trasportatoreSituatoIn", v)} />
            <Field label="Nome Autista" value={d.trasportatoreNomeAutista} onChange={(v) => u("trasportatoreNomeAutista", v)} />
          </Section>

          {/* ── 5. INTERMEDIARIO (LOCKED - Multyproget) ── */}
          <Section title="5. Intermediario / Commerciante">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Soggetto bloccato</span>
            </div>
            <LockedField label="Denominazione" value={d.intermediarioDenominazione} />
            <LockedField label="Codice Fiscale / P.IVA" value={d.intermediarioCF} />
            <LockedField label="N° Iscrizione Albo (Cod.RS)" value={d.intermediarioNumeroAlbo} />
          </Section>

          <Section title="6. Caratteristiche del Rifiuto" defaultOpen>
            <Field label="Codice EER" value={d.codiceEER} onChange={(v) => u("codiceEER", v)} placeholder="es. 17 04 05" />
            <Field label="Descrizione Rifiuto" value={d.descrizione} onChange={(v) => u("descrizione", v)} placeholder="Descrizione del rifiuto" />
            <Row>
              <div>
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Stato Fisico</label>
                <select value={d.statoFisico} onChange={(e) => u("statoFisico", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
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
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Provenienza</label>
                <select value={d.provenienza} onChange={(e) => u("provenienza", e.target.value as "urbano" | "speciale")} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
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
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Aspetto Esteriore</label>
                <select value={d.aspettoEsteriore} onChange={(e) => u("aspettoEsteriore", e.target.value as "colli" | "rinfusa")} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
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
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Accettazione</label>
                <select value={d.accettazione} onChange={(e) => u("accettazione", e.target.value as any)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">--</option>
                  <option value="intero">Accettato per intero</option>
                  <option value="parziale">Accettato parzialmente</option>
                  <option value="respinto">Respinto</option>
                </select>
              </div>
            </Row>
            {d.accettazione === "parziale" && (
              <Field label="Quantità Accettata (Kg)" value={d.quantitaAccettata} onChange={(v) => u("quantitaAccettata", v)} />
            )}
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

      {/* ═══════ PAGINA 2 - INTEGRAZIONE ═══════ */}
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
            <p className="text-xs text-muted-foreground mb-2">Sosta 1</p>
            <Field label="Luogo" value={d.sosta1Luogo} onChange={(v) => u("sosta1Luogo", v)} />
            <Row>
              <Field label="Inizio Sospensione" value={d.sosta1Inizio} onChange={(v) => u("sosta1Inizio", v)} type="datetime-local" />
              <Field label="Fine Sospensione" value={d.sosta1Fine} onChange={(v) => u("sosta1Fine", v)} type="datetime-local" />
            </Row>
            <p className="text-xs text-muted-foreground mb-2 mt-3">Sosta 2</p>
            <Field label="Luogo" value={d.sosta2Luogo} onChange={(v) => u("sosta2Luogo", v)} />
            <Row>
              <Field label="Inizio Sospensione" value={d.sosta2Inizio} onChange={(v) => u("sosta2Inizio", v)} type="datetime-local" />
              <Field label="Fine Sospensione" value={d.sosta2Fine} onChange={(v) => u("sosta2Fine", v)} type="datetime-local" />
            </Row>
            <p className="text-xs text-muted-foreground mb-2 mt-3">Sosta 3</p>
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
                <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Operazione</label>
                <select value={d.dest2Operazione} onChange={(e) => u("dest2Operazione", e.target.value)} className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary">
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
