import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
  FileText, Search, RefreshCw, Loader2, Edit, Eye, CheckCircle, Clock, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

export default function FormulariPage() {
  const [forms, setForms] = useState<FirForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [editDialog, setEditDialog] = useState<{ open: boolean; form: FirForm | null }>({ open: false, form: null });
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "list_fir_forms" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setForms(data.forms || []);
    } catch (e: any) {
      toast.error("Errore caricamento formulari: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  // Realtime subscription for fir_forms changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-fir-forms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fir_forms" },
        () => { fetchForms(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchForms]);

  const openEdit = (form: FirForm) => {
    setEditData({
      codice_eer: form.codice_eer || "",
      descrizione_rifiuto: form.descrizione_rifiuto || "",
      quantita: form.quantita ?? "",
      unita_misura: form.unita_misura || "",
      stato_fisico: form.stato_fisico || "",
      produttore_denominazione: form.produttore_denominazione || "",
      trasportatore_denominazione: form.trasportatore_denominazione || "",
      destinatario_denominazione: form.destinatario_denominazione || "",
      note: form.note || "",
    });
    setEditDialog({ open: true, form });
  };

  const handleSave = async () => {
    if (!editDialog.form) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(editData)) {
        if (k === "quantita") {
          updates[k] = v ? parseFloat(v) : null;
        } else {
          updates[k] = v || null;
        }
      }

      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "update_fir_form", form_id: editDialog.form.id, updates },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Formulario aggiornato");
      setEditDialog({ open: false, form: null });
      fetchForms();
    } catch (e: any) {
      toast.error("Errore salvataggio: " + e.message);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <AdminLayout title="Formulari" subtitle="Gestione formulari FIR creati dagli autisti">
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
          <Input
            placeholder="Cerca per numero FIR, CER, produttore, autista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/30"
          />
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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
                    <td className="p-3 text-foreground">
                      {form.user_profile
                        ? `${form.user_profile.nome} ${form.user_profile.cognome}`
                        : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{form.codice_eer || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{form.descrizione_rifiuto || "—"}</td>
                    <td className="p-3 text-muted-foreground text-xs">{form.produttore_denominazione || "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(form.updated_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {(form.status === "draft" || form.status === "bozza") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 !text-cyan-400 hover:!text-cyan-300 hover:bg-cyan-400/10"
                            title="Modifica Bozza"
                            onClick={() => openEdit(form)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Nessun formulario trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Draft Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, form: o ? editDialog.form : null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Bozza — {editDialog.form?.numero_fir || "Senza Numero"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Codice EER</Label>
              <Input value={editData.codice_eer || ""} onChange={(e) => setEditData((p: any) => ({ ...p, codice_eer: e.target.value }))} />
            </div>
            <div>
              <Label>Quantità</Label>
              <Input type="number" value={editData.quantita || ""} onChange={(e) => setEditData((p: any) => ({ ...p, quantita: e.target.value }))} />
            </div>
            <div>
              <Label>Unità Misura</Label>
              <Input value={editData.unita_misura || ""} onChange={(e) => setEditData((p: any) => ({ ...p, unita_misura: e.target.value }))} placeholder="kg" />
            </div>
            <div>
              <Label>Stato Fisico</Label>
              <Input value={editData.stato_fisico || ""} onChange={(e) => setEditData((p: any) => ({ ...p, stato_fisico: e.target.value }))} placeholder="S / L / F" />
            </div>
            <div className="col-span-2">
              <Label>Descrizione Rifiuto</Label>
              <Textarea value={editData.descrizione_rifiuto || ""} onChange={(e) => setEditData((p: any) => ({ ...p, descrizione_rifiuto: e.target.value }))} />
            </div>
            <div>
              <Label>Produttore</Label>
              <Input value={editData.produttore_denominazione || ""} onChange={(e) => setEditData((p: any) => ({ ...p, produttore_denominazione: e.target.value }))} />
            </div>
            <div>
              <Label>Trasportatore</Label>
              <Input value={editData.trasportatore_denominazione || ""} onChange={(e) => setEditData((p: any) => ({ ...p, trasportatore_denominazione: e.target.value }))} />
            </div>
            <div>
              <Label>Destinatario</Label>
              <Input value={editData.destinatario_denominazione || ""} onChange={(e) => setEditData((p: any) => ({ ...p, destinatario_denominazione: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Note</Label>
              <Textarea value={editData.note || ""} onChange={(e) => setEditData((p: any) => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, form: null })}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
