import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Plus, ScanLine, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useFormBridge } from "@/hooks/useFormBridge";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrEntries, setOcrEntries] = useState<{ id: string; value: string }[]>([]);
  const [registryMovementType, setRegistryMovementType] = useState<"Carico" | "Scarico">("Carico");

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

  const loadDraft = async (id: string) => {
    const { data, error } = await supabase.from("fir_forms").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Formulario non trovato");
    setActiveDraft(data);
    setActiveDraftId(id);
    return data;
  };

  const ensureDraft = async () => {
    if (!user?.id) throw new Error("Utente non autenticato");
    setCreating(true);
    try {
      const { data: draftId, error } = await supabase.rpc("ensure_user_has_fir_draft_for_tenant" as any, {
        p_user_id: user.id,
        p_tenant_id: MULTY_TENANT_ID,
      });
      if (error) throw error;
      if (!draftId) throw new Error("Nessun numero FIR disponibile nel serbatoio Multyproget");
      await loadDraft(String(draftId));
      await queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
      return String(draftId);
    } finally {
      setCreating(false);
    }
  };

  const handleNewDraft = async () => {
    try {
      const id = await ensureDraft();
      toast.success(`Formulario pronto: ${id ? "bozza caricata" : "bozza creata"}`);
    } catch (error: any) {
      toast.error(error?.message || "Errore creazione formulario");
    }
  };

  const handleOcrFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    try {
      if (!activeDraftId) {
        await ensureDraft();
        await new Promise((resolve) => window.setTimeout(resolve, 700));
      }

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
      setOcrEntries(entries);
      const filled = fillFields(entries);
      toast.success(`OCR completato: ${fields.length} campi letti, ${filled} applicati al formulario`);
    } catch (error: any) {
      toast.error(error?.message || "Errore OCR formulario");
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="border-emerald-500/30 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-400">
            <FileText className="h-5 w-5" /> Formulari FIR operativi {currentSectionLabel ? `· ${currentSectionLabel}` : ""}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={registryMovementType}
              onChange={(event) => setRegistryMovementType(event.target.value as "Carico" | "Scarico")}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="Carico">Registro: Carico</option>
              <option value="Scarico">Registro: Scarico</option>
            </select>
            <Button onClick={handleNewDraft} disabled={creating || !user?.id} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Nuovo / carica FIR
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={ocrBusy || !user?.id} className="gap-2 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
              {ocrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              Carica OCR
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new Event("dev-fir-save-active"))}
              disabled={!activeDraftId}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" /> Salva formulario e registro
            </Button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOcrFile} />
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
            <FIRAlternativeForm
              key={activeDraftId}
              firFormId={activeDraftId}
              presetNumeroFir={activeDraft?.numero_fir || undefined}
              assignedUserId={activeDraft?.user_id || user?.id}
              draftData={activeDraft}
              ocrEntries={ocrEntries}
              registryMovementType={registryMovementType}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ["dev-multy-fir-workspace-drafts"] });
                queryClient.invalidateQueries({ queryKey: ["dev-registro-generale"] });
                queryClient.invalidateQueries({ queryKey: ["dev-registro-movimenti"] });
              }}
            />
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