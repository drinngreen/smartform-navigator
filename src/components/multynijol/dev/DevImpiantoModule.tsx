import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevGiacenzeModule } from "./DevGiacenzeModule";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText, Search, RefreshCw, Loader2, Edit, CheckCircle, Clock,
  Warehouse, Plus, Package, Upload, Database, Zap, AlertTriangle,
} from "lucide-react";
import { richiestaVidimazioneNgrok, ngrokHealthCheck, emissioneFirNgrok } from "@/lib/rentriNgrokApi";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";
const SOCIETA_ID = "multy";

export function DevImpiantoModule() {
  return (
    <Tabs defaultValue="giacenze" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="giacenze" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Package className="h-4 w-4" /> Giacenze
        </TabsTrigger>
        <TabsTrigger value="formulari" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <FileText className="h-4 w-4" /> Formulari
        </TabsTrigger>
        <TabsTrigger value="gestione-fir" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Database className="h-4 w-4" /> Gestione FIR
        </TabsTrigger>
      </TabsList>

      <TabsContent value="giacenze">
        <DevGiacenzeModule />
      </TabsContent>
      <TabsContent value="formulari">
        <ImpiantoFormulari />
      </TabsContent>
      <TabsContent value="gestione-fir">
        <ImpiantoGestioneFIR />
      </TabsContent>
    </Tabs>
  );
}

// ─── Formulari sub-module ───
function ImpiantoFormulari() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [editDialog, setEditDialog] = useState<{ open: boolean; form: any | null }>({ open: false, form: null });
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const { data: forms = [], isLoading, refetch } = useQuery({
    queryKey: ["dev-impianto-formulari", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "list_fir_forms", tenant_id: MULTY_TENANT_ID },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.forms || [];
    },
  });

  const openEdit = (form: any) => {
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
        updates[k] = k === "quantita" ? (v ? parseFloat(v as string) : null) : (v || null);
      }
      const { data, error } = await supabase.functions.invoke("admin-user-manage", {
        body: { action: "update_fir_form", form_id: editDialog.form.id, updates },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Formulario aggiornato");
      setEditDialog({ open: false, form: null });
      refetch();
    } catch (e: any) {
      toast.error("Errore: " + e.message);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Totale", value: stats.total, icon: FileText, color: "text-emerald-400" },
          { label: "Bozze", value: stats.draft, icon: Clock, color: "text-yellow-400" },
          { label: "Inviati", value: stats.submitted, icon: FileText, color: "text-blue-400" },
          { label: "Completati", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card/60 border-emerald-500/30">
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

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca FIR, CER, produttore..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="border-emerald-500/30 text-emerald-400">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "draft", "submitted", "completed"].map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}
            className={tab === t ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500/30 text-emerald-400"}>
            {t === "all" ? `Tutti (${stats.total})` : t === "draft" ? `Bozze (${stats.draft})` : t === "submitted" ? `Inviati (${stats.submitted})` : `Completati (${stats.completed})`}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
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
                        <Badge variant={form.status === "completato" ? "default" : "secondary"} className="text-xs">
                          {form.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-emerald-300">{form.numero_fir || "—"}</td>
                      <td className="p-3 font-mono">{form.codice_eer || "—"}</td>
                      <td className="p-3">{form.produttore_denominazione || "—"}</td>
                      <td className="p-3 font-mono">{form.quantita ? `${form.quantita} ${form.unita_misura || "kg"}` : "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(form.updated_at).toLocaleDateString("it-IT")}</td>
                      <td className="p-3 text-right">
                        {(form.status === "draft" || form.status === "bozza") && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(form)} className="gap-1 text-emerald-400">
                            <Edit className="h-3 w-3" /> Modifica
                          </Button>
                        )}
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o, form: o ? editDialog.form : null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica Bozza — {editDialog.form?.numero_fir || "N/D"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Codice EER</Label><Input value={editData.codice_eer || ""} onChange={(e) => setEditData((p) => ({ ...p, codice_eer: e.target.value }))} /></div>
            <div><Label>Quantità</Label><Input type="number" value={editData.quantita || ""} onChange={(e) => setEditData((p) => ({ ...p, quantita: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Descrizione Rifiuto</Label><Textarea value={editData.descrizione_rifiuto || ""} onChange={(e) => setEditData((p) => ({ ...p, descrizione_rifiuto: e.target.value }))} /></div>
            <div><Label>Produttore</Label><Input value={editData.produttore_denominazione || ""} onChange={(e) => setEditData((p) => ({ ...p, produttore_denominazione: e.target.value }))} /></div>
            <div><Label>Destinatario</Label><Input value={editData.destinatario_denominazione || ""} onChange={(e) => setEditData((p) => ({ ...p, destinatario_denominazione: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Note</Label><Textarea value={editData.note || ""} onChange={(e) => setEditData((p) => ({ ...p, note: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, form: null })}>Annulla</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Gestione FIR sub-module (Pool + Vidimazione + Test RENTRI) ───
function ImpiantoGestioneFIR() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bulkInput, setBulkInput] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestQty, setRequestQty] = useState(5);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dev-fir-pool-stats-impianto", SOCIETA_ID],
    queryFn: async () => {
      const [totalRes, disponibiliRes, inUsoRes, usatiRes] = await Promise.all([
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "available"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "reserved"),
        supabase.from("fir_number_pool").select("id", { count: "exact", head: true }).eq("societa_id", SOCIETA_ID).eq("status", "consumed"),
      ]);
      return { total: totalRes.count ?? 0, disponibili: disponibiliRes.count ?? 0, inUso: inUsoRes.count ?? 0, usati: usatiRes.count ?? 0 };
    },
    refetchInterval: 10000,
  });

  const handleBulkImport = () => {
    const numbers = bulkInput.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (numbers.length === 0) { toast.error("Inserisci almeno un numero"); return; }
    const unique = [...new Set(numbers)];
    const rows = unique.map(n => ({ fir_number: n, user_id: user!.id, status: "available" as const, societa_id: SOCIETA_ID }));
    supabase.from("fir_number_pool").insert(rows).then(({ error }) => {
      if (error) { toast.error("Errore: " + error.message); return; }
      queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-stats-impianto"] });
      toast.success(`✅ ${unique.length} numeri caricati`);
      setBulkInput("");
    });
  };

  const handleRequestFromRentri = async () => {
    setIsRequesting(true);
    try {
      const result = await richiestaVidimazioneNgrok("MULTY", requestQty);
      const raw = result.data || {};
      let numeri: string[] = [];
      for (const key of ['numeri', 'firNumbers', 'numbers', 'formulari']) {
        if (Array.isArray(raw[key])) { numeri = raw[key]; break; }
        if (raw.data && Array.isArray(raw.data[key])) { numeri = raw.data[key]; break; }
      }
      if (numeri.length === 0) {
        const findStrArr = (obj: any): string[] => {
          if (!obj || typeof obj !== 'object') return [];
          for (const v of Object.values(obj)) {
            if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v as string[];
            const sub = findStrArr(v);
            if (sub.length > 0) return sub;
          }
          return [];
        };
        numeri = findStrArr(raw);
      }
      const realNumbers = numeri.filter((n: string) => n && !n.startsWith("FIR-") && !n.startsWith("TEST-"));
      if (realNumbers.length > 0) {
        const rows = realNumbers.map((n: string) => ({ fir_number: n, user_id: user!.id, status: "available" as const, societa_id: SOCIETA_ID }));
        const { error } = await supabase.from("fir_number_pool").insert(rows);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["dev-fir-pool-stats-impianto"] });
        toast.success(`✅ ${realNumbers.length} nuovi numeri ricevuti da RENTRI`);
      } else {
        toast.error("Nessun numero trovato nella risposta");
      }
    } catch (err: any) {
      toast.error(`Errore: ${err.message}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="h-6 w-6 text-emerald-400" />
            <div><p className="text-xs text-muted-foreground">Totale</p><p className="text-xl font-bold text-emerald-400">{stats?.total ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <div><p className="text-xs text-muted-foreground">Disponibili</p><p className="text-xl font-bold text-green-400">{stats?.disponibili ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-cyan-400" />
            <div><p className="text-xs text-muted-foreground">In Uso</p><p className="text-xl font-bold text-cyan-400">{stats?.inUso ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-6 w-6 text-amber-400" />
            <div><p className="text-xs text-muted-foreground">Consumati</p><p className="text-xl font-bold text-amber-400">{stats?.usati ?? 0}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import */}
      <Card className="bg-card/60 border-emerald-500/30">
        <CardHeader><CardTitle className="text-emerald-400 flex items-center gap-2"><Upload className="h-5 w-5" /> Carica Numeri nel Serbatoio</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder="FMGWB001234&#10;FMGWB001235" rows={3} className="font-mono bg-card/60 border-border/50" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">{bulkInput.split(/[,\n\r]+/).filter(n => n.trim()).length} numeri</span>
            <Button onClick={handleBulkImport} disabled={!bulkInput.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700"><Upload className="h-4 w-4" /> CARICA</Button>
          </div>
        </CardContent>
      </Card>

      {/* RENTRI Request */}
      <Card className="bg-card/60 border-emerald-500/30">
        <CardHeader><CardTitle className="text-cyan-400 flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Richiedi Numeri a RENTRI</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(stats?.disponibili ?? 0) === 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-xs"><AlertTriangle className="h-4 w-4" /> Serbatoio vuoto!</div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Quantità:</span>
            <div className="flex gap-2">
              {[5, 10, 50, 100].map((q) => (
                <Button key={q} variant={requestQty === q ? "default" : "outline"} size="sm" onClick={() => setRequestQty(q)}
                  className={requestQty === q ? "bg-cyan-600" : "border-cyan-500/30 text-cyan-400"}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={handleRequestFromRentri} disabled={isRequesting} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
            {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} RICHIEDI
          </Button>
        </CardContent>
      </Card>

      {/* Test RENTRI */}
      <Card className="bg-card/60 border-emerald-500/30">
        <CardHeader><CardTitle className="text-amber-400 flex items-center gap-2"><Zap className="h-5 w-5" /> Test Invio RENTRI</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={async () => {
            setIsTesting(true); setTestResult(null);
            try {
              const health = await ngrokHealthCheck();
              if (!health.ok) { setTestResult({ success: false, message: "❌ Server non raggiungibile" }); setIsTesting(false); return; }
              const result = await emissioneFirNgrok("MULTY", {
                numero_fir: "TEST-IMPIANTO",
                produttore: { denominazione: "Test Srl", codice_fiscale: "00000000000", indirizzo: "Via Test 1, 10100 Torino (TO)" },
                destinatario: { denominazione: "Impianto Test Srl", codice_fiscale: "11111111111", indirizzo: "Via Prova 2, 10100 Torino (TO)" },
                trasportatore: { denominazione: "Trasporto Test Srl", codice_fiscale: "22222222222", albo: "TO/00001" },
                rifiuto: { codice_eer: "150101", descrizione: "Test impianto", stato_fisico: "solido non pulverulento", quantita: 10, unita_misura: "kg" },
              });
              setTestResult({ success: result.ok, message: result.ok ? "✅ Test superato" : "❌ Test fallito", details: JSON.stringify(result.data, null, 2) });
            } catch (err: any) {
              setTestResult({ success: false, message: "❌ " + err.message });
            } finally { setIsTesting(false); }
          }} disabled={isTesting} variant="outline" className="gap-2 border-amber-500/30 text-amber-400">
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} TEST RENTRI
          </Button>
          {testResult && (
            <div className={`mt-3 rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <p className={`text-sm font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>{testResult.message}</p>
              {testResult.details && (
                <details className="mt-2"><summary className="text-xs text-muted-foreground cursor-pointer">Log tecnico</summary>
                  <pre className="mt-1 p-2 bg-card/60 rounded text-[10px] text-muted-foreground overflow-x-auto max-h-40 overflow-y-auto">{testResult.details}</pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
