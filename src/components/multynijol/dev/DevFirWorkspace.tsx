import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, ScanLine, Save, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { revertFirFromRegistryAndInventory } from "@/lib/firFinalSync";
import { useAuth } from "@/hooks/useAuth";
import { useFormBridge } from "@/hooks/useFormBridge";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";
import { getCodiceOperazione } from "@/lib/codiciRecuperoSmaltimento";
import { useMNFIRStore } from "@/stores/mnFirStore";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

const OCR_FIELD_ALIASES: Record<string, string[]> = {
  numero_fir: ["numero formulario", "numero_formulario"],
  numero_formulario: ["numero_fir"],
  cer: ["codice_eer", "codice_cer", "codice eer"],
  codice_cer: ["codice_eer", "cer"],
  codice_eer: ["cer", "codice_cer"],
  descrizione_rifiuto: ["rifiuto_descrizione", "descrizione del rifiuto"],
  peso_kg: ["quantita", "peso", "quantita_kg"],
  quantita_kg: ["quantita", "peso", "peso_kg"],
  targa_veicolo: ["targa_automezzo", "targa automezzo"],
  targa: ["targa_automezzo", "targa automezzo"],
  produttore_denominazione: ["denominazione_produttore", "denominazione produttore"],
  produttore_cf: ["codice_fiscale_produttore", "produttore_codice_fiscale"],
  produttore_codice_fiscale: ["codice_fiscale_produttore"],
  produttore_indirizzo: ["unita_locale_produttore", "indirizzo_produttore"],
  destinatario_denominazione: ["denominazione_destinatario", "denominazione destinatario"],
  destinatario_cf: ["codice_fiscale_destinatario", "destinatario_codice_fiscale"],
  destinatario_codice_fiscale: ["codice_fiscale_destinatario"],
  destinatario_indirizzo: ["unita_locale_destinatario", "indirizzo_destinatario"],
  trasportatore_denominazione: ["denominazione_trasportatore", "denominazione trasportatore"],
  trasportatore_cf: ["codice_fiscale_trasportatore", "trasportatore_codice_fiscale"],
  trasportatore_codice_fiscale: ["codice_fiscale_trasportatore"],
  data_trasporto: ["data_inizio_trasporto", "data_partenza"],
  ora_trasporto: ["ora_inizio_trasporto", "ora_partenza"],
};

function normalizeOcrKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFirNumber(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (/^[A-Z]{5} [0-9]{6} [A-Z]{2}$/.test(normalized)) return normalized;
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const match = compact.match(/([A-Z]{5})([0-9]{6})([A-Z]{2})/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : normalized;
}

function isFirNumberEntry(id: string) {
  const normalized = normalizeOcrKey(id);
  return normalized === "numero_fir"
    || normalized === "numero_formulario"
    || normalized === "numero_del_formulario"
    || (normalized.includes("numero") && (normalized.includes("fir") || normalized.includes("formulario")));
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DevFirWorkspaceInner({ currentSectionLabel }: { currentSectionLabel?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { fillFields } = useFormBridge();
  const mnFirStore = useMNFIRStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [moduleType, setModuleType] = useState<"standard" | "alternative">("standard");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrEntries, setOcrEntries] = useState<{ id: string; value: string }[]>([]);
  const [registryMovementType, setRegistryMovementType] = useState<"Carico" | "Scarico">("Carico");
  const [codiceOp, setCodiceOp] = useState("");
  const [destSelected, setDestSelected] = useState("");
  const [impiantoId, setImpiantoId] = useState<string | null>(null);
  const [manualFirNumber, setManualFirNumber] = useState("");

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["dev-multy-fir-workspace-drafts", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fir_forms")
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .eq("deleted_by_user", false)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: impianti = [] } = useQuery({
    queryKey: ["dev-multy-impianti", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impianti")
        .select("id, nome, indirizzo, comune, provincia, autorizzaz_regione")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  useEffect(() => {
    if (!impiantoId && impianti.length > 0) setImpiantoId(impianti[0].id);
  }, [impiantoId, impianti]);

  const loadDraft = async (id: string) => {
    const { data, error } = await supabase.from("fir_forms").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Formulario non trovato");
    setActiveDraft(data);
    setActiveDraftId(id);
    setModuleType("standard");
    mnFirStore.loadFromDatabase({
      ...data,
      form_data: data.form_data as Record<string, any> | null,
    });
    return data;
  };

  useEffect(() => {
    const listener = (event: Event) => {
      const draftId = (event as CustomEvent<{ draftId?: string }>).detail?.draftId;
      if (!draftId) return;
      loadDraft(draftId)
        .then((draft) => toast.success(`Formulario aperto: ${draft.numero_fir || "senza numero"}`))
        .catch((error) => toast.error(error.message || "Errore apertura formulario"));
    };
    window.addEventListener("dev-fir-open-draft", listener as EventListener);
    return () => window.removeEventListener("dev-fir-open-draft", listener as EventListener);
  }, []);

  // Invalidate registry/inventory queries after Standard form save-final
  useEffect(() => {
    const savedHandler = () => {
      queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["dev-registro-generale"] });
      queryClient.invalidateQueries({ queryKey: ["dev-registro-movimenti"] });
      queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
      queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
      queryClient.invalidateQueries({ queryKey: ["dev-mag-giacenze"] });
      queryClient.invalidateQueries({ queryKey: ["dev-mag-movimenti"] });
      queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
    };
    window.addEventListener("dev-fir-saved", savedHandler);
    return () => window.removeEventListener("dev-fir-saved", savedHandler);
  }, [queryClient]);

  const handleNewDraft = async () => {
    if (!manualFirNumber.trim()) {
      toast.error("Inserisci il numero FIR esatto prima di creare il formulario");
      return;
    }
    setCreating(true);
    try {
      const draft = await openDraftByNumber(manualFirNumber);
      setManualFirNumber("");
      toast.success(`Formulario pronto: ${draft.numero_fir}`);
    } catch (error: any) {
      toast.error(error?.message || "Errore creazione formulario");
    } finally {
      setCreating(false);
    }
  };

  const openDraftByNumber = async (numeroFir: string) => {
    if (!user?.id) throw new Error("Utente non autenticato");
    const normalized = normalizeFirNumber(numeroFir);
    if (!normalized) throw new Error("Inserisci un numero FIR");

    const { data: draftId, error } = await supabase.rpc("create_manual_fir_draft_for_tenant" as any, {
      p_user_id: user.id,
      p_tenant_id: MULTY_TENANT_ID,
      p_numero_fir: normalized,
    });
    if (error) throw error;
    if (!draftId) throw new Error("Formulario non disponibile");

    const loaded = await loadDraft(String(draftId));
    if (loaded?.numero_fir !== normalized) {
      throw new Error(`Blocco sicurezza: richiesto ${normalized}, aperto ${loaded?.numero_fir || "N/D"}`);
    }
    await queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
    return loaded;
  };

  const handleDeleteActiveDraft = async () => {
    if (!activeDraftId) return;
    const label = activeDraft?.numero_fir || "questo formulario";
    if (!window.confirm(`Eliminare dalla vista ${label}? I dati restano recuperabili nel database.`)) return;
    try {
      await revertFirFromRegistryAndInventory(activeDraftId);
      if (activeDraft?.status === "bozza") {
        await supabase.rpc("release_fir_number" as any, { p_fir_id: activeDraftId });
      }
      const { error } = await supabase
        .from("fir_forms")
        .update({ deleted_by_user: true, updated_at: new Date().toISOString() })
        .eq("id", activeDraftId);
      if (error) throw error;
      setActiveDraftId(null);
      setActiveDraft(null);
      mnFirStore.resetForm();
      await queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
      toast.success(`Formulario ${label} eliminato dalla vista`);
    } catch (error: any) {
      toast.error(error?.message || "Errore eliminazione formulario");
    }
  };

  const handleOpenManualFir = async () => {
    try {
      const draft = await openDraftByNumber(manualFirNumber);
      setManualFirNumber("");
      toast.success(`Formulario aperto: ${draft.numero_fir}`);
    } catch (error: any) {
      toast.error(error?.message || "Errore apertura FIR");
    }
  };

  const handleOcrFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    try {
      const imageBase64 = await readFileAsBase64(file);
      const { data, error } = await supabase.functions.invoke("ocr-formulario", {
        body: {
          image_base64: imageBase64,
          mime_type: file.type || "application/octet-stream",
          instruction: "Estrai i campi del FIR Multyproget. Mantieni numeri, pesi e codici esattamente come letti.",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const fields = (data?.fields || []) as { id?: string; label?: string; value?: string }[];
      const entries = fields.flatMap((field) => {
        const id = normalizeOcrKey(field.id || field.label || "");
        const value = String(field.value ?? "").trim();
        if (!id || !value) return [];
        const aliases = OCR_FIELD_ALIASES[id] || [];
        return [{ id, value }, ...(field.label ? [{ id: field.label, value }] : []), ...aliases.map((alias) => ({ id: alias, value }))];
      });
      const ocrNumeroFir = normalizeFirNumber(entries.find((entry) => isFirNumberEntry(entry.id))?.value || "");
      let targetDraft = activeDraft;

      if (ocrNumeroFir) {
        const { data: matchingDraft, error: matchingError } = await supabase
          .from("fir_forms")
          .select("*")
          .eq("tenant_id", MULTY_TENANT_ID)
          .eq("deleted_by_user", false)
          .eq("numero_fir", ocrNumeroFir)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (matchingError) throw matchingError;
        if (matchingDraft?.id) {
          targetDraft = await loadDraft(matchingDraft.id);
        } else if (targetDraft?.numero_fir && targetDraft.numero_fir !== ocrNumeroFir) {
          toast.error(`OCR fermato: il documento è ${ocrNumeroFir}, ma il formulario aperto è ${targetDraft.numero_fir}`);
          return;
        } else {
          targetDraft = await openDraftByNumber(ocrNumeroFir);
        }
      }

      if (!targetDraft?.id) throw new Error("OCR fermato: il documento non contiene un numero FIR leggibile. Inserisci il numero e crea/apri il formulario manualmente.");

      const safeEntries = entries.filter((entry) => !isFirNumberEntry(entry.id));
      setOcrEntries(safeEntries);
      const filled = fillFields(safeEntries);
      toast.success(`OCR completato: ${fields.length} campi letti, ${filled} applicati`);
    } catch (error: any) {
      toast.error(error?.message || "Errore OCR formulario");
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // R/D code → autofill descrizione operazione via form bridge
  useEffect(() => {
    const code = codiceOp.trim().toUpperCase();
    if (!code) return;
    const found = getCodiceOperazione(code);
    if (!found) return;
    fillFields([
      { id: "codice_operazione", value: found.codice },
      { id: "operazione_destinatario", value: found.codice },
      { id: "descrizione_operazione", value: found.descrizione },
      { id: "recupero", value: found.tipo === "R" ? "true" : "false" },
      { id: "smaltimento", value: found.tipo === "D" ? "true" : "false" },
    ]);
  }, [codiceOp, fillFields]);

  // Destinatario selection → fill fields via bridge
  useEffect(() => {
    if (!destSelected) return;
    const dest = impianti.find((d) => d.id === destSelected);
    if (!dest) return;
    setImpiantoId(dest.id);
    const indirizzo = [dest.indirizzo, dest.comune, dest.provincia ? `(${dest.provincia})` : ""].filter(Boolean).join(" ");
    fillFields([
      { id: "denominazione_destinatario", value: dest.nome || "" },
      { id: "destinatario_denominazione", value: dest.nome || "" },
      { id: "unita_locale_destinatario", value: indirizzo },
      { id: "destinatario_indirizzo", value: indirizzo },
      { id: "numero_aut_comunicazione_destinatario", value: dest.autorizzaz_regione || "" },
    ]);
    toast.success(`Destinatario impostato: ${dest.nome}`);
  }, [destSelected, impianti, fillFields]);

  return (
    <Card className="border-emerald-500/30 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-400">
              <FileText className="h-5 w-5" /> Formulari FIR operativi {currentSectionLabel ? `· ${currentSectionLabel}` : ""}
            </CardTitle>
            <div className="grid w-full gap-2 lg:w-auto lg:min-w-[520px]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModuleType("standard")}
                  className={`rounded-md border px-4 py-3 text-left transition-colors ${moduleType === "standard" ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`}
                >
                  <span className="block text-sm font-semibold">Modulo Standard</span>
                  <span className="block text-xs text-muted-foreground">Formulario completo classico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModuleType("alternative")}
                  className={`rounded-md border px-4 py-3 text-left transition-colors ${moduleType === "alternative" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`}
                >
                  <span className="block text-sm font-semibold">Modulo Alternativo</span>
                  <span className="block text-xs text-muted-foreground">Editor alternativo FIR</span>
                </button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={manualFirNumber}
                  onChange={(e) => setManualFirNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleNewDraft();
                  }}
                  placeholder="NUMERO FIR MANUALE: ZRZXR 000566 LG"
                  className="h-10 min-w-0 flex-1 rounded-md border border-emerald-500/60 bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground"
                />
                <Button onClick={handleNewDraft} disabled={creating || !user?.id || !manualFirNumber.trim()} className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crea formulario manuale
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={registryMovementType}
                onChange={(e) => setRegistryMovementType(e.target.value as "Carico" | "Scarico")}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="Carico">Registro: Carico</option>
                <option value="Scarico">Registro: Scarico</option>
              </select>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={ocrBusy || !user?.id} className="gap-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
                {ocrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                Carica OCR
              </Button>
              <Button
                onClick={() => window.dispatchEvent(new Event("dev-fir-save-draft"))}
                disabled={!activeDraftId}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Save className="h-4 w-4" /> Salva BOZZA
              </Button>
              <Button
                onClick={() => window.dispatchEvent(new Event("dev-fir-save-final"))}
                disabled={!activeDraftId}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4" /> Salva DEFINITIVO
              </Button>
              <Button
                onClick={() => {
                  if (window.confirm("Confermi l'invio del formulario a RENTRI? L'operazione è definitiva.")) {
                    window.dispatchEvent(new Event("dev-fir-send-rentri"));
                  }
                }}
                disabled={!activeDraftId}
                className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-background"
              >
                <Send className="h-4 w-4" /> Invia a RENTRI
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteActiveDraft}
                disabled={!activeDraftId}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" /> Elimina FIR
              </Button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOcrFile} />
            </div>
          </div>

          {/* Helper row: destinatari from DB + codice R/D autocomplete */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/30 bg-background/40 p-2">
            <span className="text-xs font-mono text-muted-foreground">Aiuti compilazione:</span>
            <select
              value={destSelected}
              onChange={(e) => setDestSelected(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground min-w-[220px]"
            >
              <option value="">Destinatario da database…</option>
              {impianti.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
            <select
              value={impiantoId || ""}
              onChange={(e) => setImpiantoId(e.target.value || null)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground min-w-[220px]"
            >
              <option value="">Impianto giacenze…</option>
              {impianti.map((impianto) => (
                <option key={impianto.id} value={impianto.id}>
                  {impianto.nome}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={codiceOp}
              onChange={(e) => setCodiceOp(e.target.value)}
              placeholder="Codice op. (R12, R4, D15…)"
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground w-44"
            />
            {codiceOp && getCodiceOperazione(codiceOp.trim().toUpperCase()) && (
              <span className="text-xs text-emerald-400 truncate max-w-md">
                → {getCodiceOperazione(codiceOp.trim().toUpperCase())!.descrizione}
              </span>
            )}
          </div>

        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Caricamento bozze...</span>
          ) : drafts.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nessuna bozza FIR Multyproget caricata.</span>
          ) : (
            drafts.map((draft: any) => (
              <Button
                key={draft.id}
                variant={activeDraftId === draft.id ? "default" : "outline"}
                size="sm"
                onClick={() => loadDraft(draft.id).catch((error) => toast.error(error.message))}
                className="gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                {draft.numero_fir || "FIR senza numero"} · {draft.status}
              </Button>
            ))
          )}
        </div>

        {activeDraftId ? (
          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
            {moduleType === "alternative" ? (
              <FIRAlternativeForm
                key={`alternative-${activeDraftId}`}
                firFormId={activeDraftId}
                presetNumeroFir={activeDraft?.numero_fir || undefined}
                assignedUserId={activeDraft?.user_id || user?.id}
                impiantoId={impiantoId}
                draftData={activeDraft}
                ocrEntries={ocrEntries}
                disableRentriActions
                registryMovementType={registryMovementType}
                onSaved={() => {
                  if (activeDraftId) {
                    loadDraft(activeDraftId).catch(() => undefined);
                  }
                  queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-registro-generale"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-registro-movimenti"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-giacenze"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-movimenti-multy"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-mag-giacenze"] });
                  queryClient.invalidateQueries({ queryKey: ["dev-mag-movimenti"] });
                  queryClient.invalidateQueries({ queryKey: ["movimenti-impianto"] });
                }}
              />
            ) : (
              <MNFIRFormComplete
                key={`standard-${activeDraftId}`}
                tenantId={MULTY_TENANT_ID}
                mnContext="multyproget"
                firFormId={activeDraftId}
                draftData={activeDraft}
                impiantoId={impiantoId}
                registryMovementType={registryMovementType}
                enableFatturazione
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
            <Save className="h-4 w-4" /> Apri o crea un formulario per compilarlo, modificarlo, salvarlo e agganciarlo al registro.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DevFirWorkspace({ currentSectionLabel }: { currentSectionLabel?: string }) {
  // Uses the global FormBridgeProvider from App.tsx so Dark Lemon can fill these fields too.
  return <DevFirWorkspaceInner currentSectionLabel={currentSectionLabel} />;
}
