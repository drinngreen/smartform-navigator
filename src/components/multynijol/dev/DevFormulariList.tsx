import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock, Trash2,
} from "lucide-react";
import { FIRAlternativeForm } from "@/components/fir/FIRAlternativeForm";
import { MNFIRFormComplete } from "@/components/fir/MNFIRFormComplete";

interface Props {
  tenantId: string;
  mnContext: string;
  fallbackTenantId?: string;
  /** color name used in classNames (emerald/cyan/etc) */
  accent?: "emerald" | "cyan" | "blue" | "amber";
  title?: string;
}

export function DevFormulariList({
  tenantId,
  mnContext,
  fallbackTenantId,
  accent = "emerald",
  title = "Formulari FIR",
}: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [viewDialog, setViewDialog] = useState<{ open: boolean; form: any | null }>({ open: false, form: null });
  const [editorMode, setEditorMode] = useState<"standard" | "alternative">("standard");

  const openEditor = (form: any, mode: "standard" | "alternative" = "standard") => {
    setEditorMode(mode);
    setViewDialog({ open: true, form });
  };

  const { data: forms = [], isLoading, refetch } = useQuery({
    queryKey: ["dev-formulari-list", tenantId, fallbackTenantId],
    queryFn: async () => {
      const loadForms = async (tid: string) => {
        const { data, error } = await supabase.functions.invoke("admin-user-manage", {
          body: { action: "list_fir_forms", tenant_id: tid },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data.forms || [];
      };
      const main = await loadForms(tenantId);
      if (main.length > 0 || !fallbackTenantId) return main;
      return await loadForms(fallbackTenantId);
    },
  });

  const handleDeleteForm = async (form: any) => {
    if (!form) return;
    if (!window.confirm(`Eliminare dalla vista il FIR ${form.numero_fir || "senza numero"}? I dati restano recuperabili nel database.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "delete_fir_form", form_id: form.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setViewDialog({ open: false, form: null });
      toast.success("Formulario eliminato dalla vista");
      await refetch();
    } catch (e: any) {
      toast.error("Errore eliminazione FIR: " + (e?.message ?? "sconosciuto"));
    }
  };

  const handleFormSaved = async () => {
    const res = await refetch();
    const list = (res.data as any[]) || [];
    if (viewDialog.form) {
      const updated = list.find((f: any) => f.id === viewDialog.form.id);
      if (updated) setViewDialog({ open: true, form: updated });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel(`dev-formulari-list-${tenantId}-${mnContext}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fir_forms" }, () => { void handleFormSaved(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, mnContext, viewDialog.form?.id]);

  const filtered = forms.filter((f: any) => {
    const q = search.toLowerCase();
    const matchSearch =
      f.numero_fir?.toLowerCase().includes(q) ||
      f.codice_eer?.toLowerCase().includes(q) ||
      f.produttore_denominazione?.toLowerCase().includes(q) ||
      f.descrizione_rifiuto?.toLowerCase().includes(q);
    if (tab === "draft") return matchSearch && (f.status === "draft" || f.status === "bozza");
    if (tab === "submitted") return matchSearch && (f.status === "submitted" || f.status === "inviato");
    if (tab === "completed") return matchSearch && (f.status === "completed" || f.status === "completato");
    return matchSearch;
  });

  const stats = {
    total: forms.length,
    draft: forms.filter((f: any) => f.status === "draft" || f.status === "bozza").length,
    submitted: forms.filter((f: any) => f.status === "submitted" || f.status === "inviato").length,
    completed: forms.filter((f: any) => f.status === "completed" || f.status === "completato").length,
  };

  const txt = `text-${accent}-400`;
  const border = `border-${accent}-500/30`;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 ${txt}`}>
        <FileText className="h-5 w-5" />
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totale", value: stats.total, icon: FileText, color: txt },
          { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
          { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
          { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
        ].map((s) => (
          <Card key={s.label} className={`bg-card/60 ${border}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground uppercase">{s.label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca FIR, CER, produttore..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className={`${border} ${txt}`}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "submitted", "completed"].map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}
            className={tab === t ? `bg-${accent}-600 hover:bg-${accent}-700` : `${border} ${txt}`}>
            {t === "all" ? `Tutti (${stats.total})` : t === "draft" ? `Bozze (${stats.draft})` : t === "submitted" ? `Inviati (${stats.submitted})` : `Completati (${stats.completed})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className={`h-8 w-8 animate-spin ${txt}`} /></div>
      ) : (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Stato</th>
                    <th className="text-left p-3 text-xs uppercase">N° FIR</th>
                    <th className="text-left p-3 text-xs uppercase">CER</th>
                    <th className="text-left p-3 text-xs uppercase">Produttore</th>
                    <th className="text-left p-3 text-xs uppercase">Quantità</th>
                    <th className="text-left p-3 text-xs uppercase">Data</th>
                    <th className="text-right p-3 text-xs uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((form: any) => (
                    <tr key={form.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3">
                        <Badge variant={form.status === "completato" ? "default" : "secondary"} className="text-xs">{form.status}</Badge>
                      </td>
                      <td className={`p-3 font-mono`}>{form.numero_fir || "—"}</td>
                      <td className="p-3 font-mono">{form.codice_eer || "—"}</td>
                      <td className="p-3">{form.produttore_denominazione || "—"}</td>
                      <td className="p-3 font-mono">{form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(form.updated_at).toLocaleDateString("it-IT")}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditor(form, "standard")}
                          className={`gap-1 ${form.status === "bozza" || form.status === "draft" ? txt : "text-muted-foreground"}`}
                        >
                          <Edit className="h-3 w-3" />
                          {form.status === "bozza" || form.status === "draft" ? "Standard" : "Visualizza Standard"}
                        </Button>
                        {(form.status === "bozza" || form.status === "draft") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditor(form, "alternative")}
                            className="gap-1 text-amber-400"
                          >
                            <Edit className="h-3 w-3" />
                            Alternativo
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteForm(form)}
                          className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Elimina riga"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nessun formulario trovato</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full FIR Dialog with Standard/Alternative toggle */}
      <Dialog open={viewDialog.open} onOpenChange={(o) => setViewDialog({ open: o, form: o ? viewDialog.form : null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
              <FileText className={`h-5 w-5 ${txt}`} />
              {viewDialog.form?.status === "bozza" || viewDialog.form?.status === "draft" ? "Modifica" : "Visualizza"} FIR — {viewDialog.form?.numero_fir || "N/D"}
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
                  <span className="block text-xs text-muted-foreground">Editor su template FIR</span>
                </button>
              </div>
              {editorMode === "alternative" ? (
                <FIRAlternativeForm
                  key={`alt-${viewDialog.form.id}`}
                  firFormId={viewDialog.form.id}
                  presetNumeroFir={viewDialog.form.numero_fir || undefined}
                  assignedUserId={viewDialog.form.user_id || undefined}
                  draftData={viewDialog.form}
                  onSaved={handleFormSaved}
                />
              ) : (
                <MNFIRFormComplete
                  key={`std-${viewDialog.form.id}`}
                  tenantId={tenantId}
                  mnContext={mnContext as any}
                  firFormId={viewDialog.form.id}
                  draftData={viewDialog.form}
                />
              )}
            </>
          )}
          {viewDialog.form && (
            <div className="sticky bottom-0 mt-4 flex justify-end border-t border-border/30 bg-card/95 pt-3">
              <Button variant="destructive" className="gap-2" onClick={() => void handleDeleteForm(viewDialog.form)}>
                <Trash2 className="h-4 w-4" /> Elimina formulario
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
