import { useParams, Navigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { MNAdminLayout } from "@/components/multynijol/MNAdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { useMNContextStore, MN_CONTEXTS } from "@/stores/mnContextStore";
import { toast } from "sonner";
import {
  FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Eye, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";

interface FirForm {
  id: string;
  user_id: string;
  status: string;
  numero_fir: string | null;
  codice_eer: string | null;
  descrizione_rifiuto: string | null;
  quantita: number | null;
  unita_misura: string | null;
  stato_fisico: string | null;
  produttore_denominazione: string | null;
  trasportatore_denominazione: string | null;
  destinatario_denominazione: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  user_profile?: { nome: string; cognome: string; codice_fiscale: string } | null;
}

const validContexts = ["multyproget", "dev-multyproget", "niyol"];
const GLOBAL_FIR_TENANT_ID = "167d07ad-9184-484e-85a6-da5ceafa42a3";

export default function MNFormulariPage() {
  const { context } = useParams<{ context: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const setActiveContext = useMNContextStore((s) => s.setActiveContext);

  const isValid = !!context && validContexts.includes(context);
  const mnCtx = MN_CONTEXTS.find((c) => c.id === context) || MN_CONTEXTS[0];
  const requestedFirId = searchParams.get("fir");

  useEffect(() => {
    if (isValid) setActiveContext(mnCtx);
  }, [context, isValid]);

  const [forms, setForms] = useState<FirForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [viewDialog, setViewDialog] = useState<{ open: boolean; form: FirForm | null }>({ open: false, form: null });
  const [editorMode, setEditorMode] = useState<"standard" | "alternative">("alternative");

  const fetchForms = useCallback(async () => {
    if (!mnCtx) return;
    setLoading(true);
    try {
      const loadForms = async (tenantId: string) => {
        const { data, error } = await supabase.functions.invoke("admin-user-manage", {
          body: { action: "list_fir_forms", tenant_id: tenantId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data.forms || [];
      };

      const scopedForms = await loadForms(mnCtx.tenantId);
      if (scopedForms.length > 0) {
        setForms(scopedForms);
        const requested = requestedFirId ? scopedForms.find((f: FirForm) => f.id === requestedFirId) : null;
        if (requested) setViewDialog({ open: true, form: requested });
        return;
      }

      const shouldFallbackToGlobal = context === "multyproget" || context === "dev-multyproget";
      if (shouldFallbackToGlobal && mnCtx.tenantId !== GLOBAL_FIR_TENANT_ID) {
        const fallbackForms = await loadForms(GLOBAL_FIR_TENANT_ID);
        setForms(fallbackForms);
        return;
      }

      setForms(scopedForms);
    } catch (e: any) {
      toast.error("Errore caricamento formulari: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [context, mnCtx?.tenantId, requestedFirId]);

  const handleDeleteForm = async (form: FirForm) => {
    if (!window.confirm(`Eliminare dalla vista il FIR ${form.numero_fir || "senza numero"}? I dati restano recuperabili nel database.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "delete_fir_form", form_id: form.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setViewDialog({ open: false, form: null });
      toast.success("Formulario eliminato dalla vista");
      await fetchForms();
    } catch (e: any) {
      toast.error("Errore eliminazione FIR: " + e.message);
    }
  };

  useEffect(() => { fetchForms(); }, [fetchForms]);

  useEffect(() => {
    const channel = supabase
      .channel(`mn-fir-forms-${context}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { fetchForms(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchForms, context]);

  if (!isValid) return <Navigate to="/mn/admin" replace />;

  const filtered = forms.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      f.numero_fir?.toLowerCase().includes(q) ||
      f.codice_eer?.toLowerCase().includes(q) ||
      f.produttore_denominazione?.toLowerCase().includes(q) ||
      f.user_profile?.nome?.toLowerCase().includes(q) ||
      f.user_profile?.cognome?.toLowerCase().includes(q) ||
      f.descrizione_rifiuto?.toLowerCase().includes(q);
    if (tab === "draft") return matchSearch && (f.status === "draft" || f.status === "bozza");
    if (tab === "submitted") return matchSearch && (f.status === "submitted" || f.status === "inviato");
    if (tab === "completed") return matchSearch && (f.status === "completed" || f.status === "completato");
    return matchSearch;
  });

  const stats = {
    total: forms.length,
    draft: forms.filter((f) => f.status === "draft" || f.status === "bozza").length,
    submitted: forms.filter((f) => f.status === "submitted" || f.status === "inviato").length,
    completed: forms.filter((f) => f.status === "completed" || f.status === "completato").length,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "draft": case "bozza": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Bozza</Badge>;
      case "submitted": case "inviato": return <Badge className="gap-1 border border-border"><FileText className="h-3 w-3" /> Inviato</Badge>;
      case "completed": case "completato": return <Badge className="gap-1 border border-border"><CheckCircle className="h-3 w-3" /> Completato</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const contextLabel = context === "niyol" ? "Niyol" : "Multyproget";

  return (
    <MNAdminLayout title={`Formulari — ${contextLabel}`} subtitle="Gestione formulari FIR creati dagli autisti">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Totale", value: stats.total, icon: FileText, color: "text-primary" },
          { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
          { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
          { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground font-mono uppercase">{s.label}</span>
            </div>
            <span className="text-2xl font-display text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca per numero FIR, CER, produttore, autista..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button variant="outline" size="icon" onClick={fetchForms} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="bg-card/60 border border-border/30">
          <TabsTrigger value="all">Tutti ({stats.total})</TabsTrigger>
          <TabsTrigger value="draft">Bozze ({stats.draft})</TabsTrigger>
          <TabsTrigger value="submitted">Inviati ({stats.submitted})</TabsTrigger>
          <TabsTrigger value="completed">Completati ({stats.completed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Stato</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">N° FIR</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Autista</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">CER</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Rifiuto</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Produttore</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Quantità</th>
                  <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Data</th>
                  <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((form) => (
                  <tr key={form.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">{statusBadge(form.status)}</td>
                    <td className="p-3 font-mono text-xs text-foreground">{form.numero_fir || "—"}</td>
                    <td className="p-3 text-foreground">{form.user_profile ? `${form.user_profile.nome} ${form.user_profile.cognome}` : "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{form.codice_eer || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{form.descrizione_rifiuto || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{form.produttore_denominazione || "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{new Date(form.updated_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            form.status === "draft" || form.status === "bozza"
                              ? "bg-blue-600 text-white border-blue-400 hover:bg-blue-500"
                              : "bg-secondary/50 text-foreground border-border/50 hover:bg-secondary"
                          }`}
                          onClick={() => setViewDialog({ open: true, form })}
                        >
                          {form.status === "draft" || form.status === "bozza" ? (
                            <><Edit className="h-4 w-4" /> Modifica</>
                          ) : (
                            <><Eye className="h-4 w-4" /> Visualizza</>
                          )}
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                          onClick={() => void handleDeleteForm(form)}
                        >
                          <Trash2 className="h-4 w-4" /> Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nessun formulario trovato</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full FIR Alternative Form Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(o) => { setViewDialog({ open: o, form: o ? viewDialog.form : null }); if (!o && searchParams.get("fir")) setSearchParams({}, { replace: true }); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
              <FileText className="h-5 w-5 text-primary" />
              {viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza"} FIR — {viewDialog.form?.numero_fir || "Senza Numero"}
              {viewDialog.form?.user_profile && (
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  ({viewDialog.form.user_profile.nome} {viewDialog.form.user_profile.cognome})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewDialog.form && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setEditorMode("standard")}
                  className={`rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "standard" ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`}
                >
                  <span className="block text-sm font-semibold">Modulo Standard</span>
                  <span className="block text-xs text-muted-foreground">Formulario completo classico</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode("alternative")}
                  className={`rounded-md border px-4 py-2 text-left transition-colors ${editorMode === "alternative" ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-border bg-background/50 text-foreground hover:bg-secondary/40"}`}
                >
                  <span className="block text-sm font-semibold">Modulo Alternativo</span>
                  <span className="block text-xs text-muted-foreground">Editor alternativo FIR</span>
                </button>
              </div>
              {editorMode === "alternative" ? (
                <FIRAlternativeForm
                  key={`alt-${viewDialog.form.id}`}
                  firFormId={viewDialog.form.id}
                  presetNumeroFir={viewDialog.form.numero_fir || undefined}
                  assignedUserId={viewDialog.form.user_id || undefined}
                  draftData={viewDialog.form}
                  onSaved={fetchForms}
                />
              ) : (
                <MNFIRFormComplete
                  key={`std-${viewDialog.form.id}`}
                  tenantId={mnCtx.tenantId}
                  mnContext={mnCtx.id}
                  firFormId={viewDialog.form.id}
                  draftData={viewDialog.form}
                />
              )}
            </>
          )}
            <div className="sticky bottom-0 mt-4 flex justify-end border-t border-border/30 bg-card/95 pt-3">
              <Button variant="destructive" className="gap-2" onClick={() => viewDialog.form && void handleDeleteForm(viewDialog.form)}>
                <Trash2 className="h-4 w-4" /> Elimina formulario
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </MNAdminLayout>
  );
}