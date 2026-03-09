import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RubricaTab } from "@/components/comunicazioni/RubricaTab";
import { SMSComposer } from "@/components/comunicazioni/SMSComposer";
import { WhatsAppChat } from "@/components/comunicazioni/WhatsAppChat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookUser, MessageSquare, Phone, Users, Building2, Search, PhoneCall, Plus, Edit, Trash2, FileSpreadsheet, Printer, ListChecks,
} from "lucide-react";
import { AnagraficaCompletaMP } from "./AnagraficaCompletaMP";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";

const MULTY_TENANT_ID = "77ec9a3d-a6d4-4235-8e68-1a6f345de57a";

export function DevContattiModule() {
  return (
    <Tabs defaultValue="rubrica" className="space-y-4">
      <TabsList className="bg-card/60 border border-border/30 p-1 h-auto flex-wrap gap-1">
        <TabsTrigger value="rubrica" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <BookUser className="h-4 w-4" /> Rubrica
        </TabsTrigger>
        <TabsTrigger value="anagrafiche" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Users className="h-4 w-4" /> Anagrafiche
        </TabsTrigger>
        <TabsTrigger value="sms" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <MessageSquare className="h-4 w-4" /> SMS
        </TabsTrigger>
        <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <Phone className="h-4 w-4" /> WhatsApp
        </TabsTrigger>
        <TabsTrigger value="chiamate" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <PhoneCall className="h-4 w-4" /> Report Chiamate
        </TabsTrigger>
        <TabsTrigger value="anagrafica-completa" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
          <ListChecks className="h-4 w-4" /> Anagrafica Completa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rubrica">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <RubricaTab basePath="/mn/admin/dev-multyproget" />
        </div>
      </TabsContent>
      <TabsContent value="anagrafiche">
        <AnagraficheView />
      </TabsContent>
      <TabsContent value="sms">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <SMSComposer />
        </div>
      </TabsContent>
      <TabsContent value="whatsapp">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <WhatsAppChat />
        </div>
      </TabsContent>
      <TabsContent value="chiamate">
        <ReportChiamateView />
      </TabsContent>
      <TabsContent value="anagrafica-completa">
        <div className="p-4 rounded-2xl bg-card/60 border border-emerald-500/20">
          <AnagraficaCompletaMP />
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Anagrafiche Privati + Aziende with CRUD ───
function AnagraficheView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"privati" | "aziende">("privati");
  const [showNewPrivato, setShowNewPrivato] = useState(false);
  const [showEditPrivato, setShowEditPrivato] = useState<any>(null);
  const [privatoForm, setPrivatoForm] = useState({
    nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", tipo_utenza: "domestica",
    telefono: "", cellulare: "", email: "", pec: "", indirizzo: "", cap: "", provincia: "", note: "",
  });

  const { data: privati, refetch: refetchPrivati } = useQuery({
    queryKey: ["dev-anagrafiche-privati", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("anagrafica_privati").select("*").eq("tenant_id", MULTY_TENANT_ID).order("cognome");
      if (error) throw error;
      return data;
    },
  });

  const { data: aziende } = useQuery({
    queryKey: ["dev-anagrafiche-aziende", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => setPrivatoForm({
    nome: "", cognome: "", codice_fiscale: "", comune_residenza: "", tipo_utenza: "domestica",
    telefono: "", cellulare: "", email: "", pec: "", indirizzo: "", cap: "", provincia: "", note: "",
  });

  const openEdit = (p: any) => {
    setPrivatoForm({
      nome: p.nome || "", cognome: p.cognome || "", codice_fiscale: p.codice_fiscale || "",
      comune_residenza: p.comune_residenza || "", tipo_utenza: p.tipo_utenza || "domestica",
      telefono: p.telefono || "", cellulare: p.cellulare || "", email: p.email || "", pec: p.pec || "",
      indirizzo: p.indirizzo || "", cap: p.cap || "", provincia: p.provincia || "", note: p.note || "",
    });
    setShowEditPrivato(p);
  };

  const handleSavePrivato = async () => {
    if (!privatoForm.nome || !privatoForm.cognome || !privatoForm.codice_fiscale) {
      toast.error("Nome, cognome e CF obbligatori"); return;
    }
    if (showEditPrivato) {
      // Update
      const { error } = await supabase.from("anagrafica_privati").update(privatoForm as any).eq("id", showEditPrivato.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Anagrafica aggiornata");
      setShowEditPrivato(null);
    } else {
      // Insert
      const { error } = await supabase.from("anagrafica_privati").insert({ ...privatoForm, tenant_id: MULTY_TENANT_ID } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Nuovo privato registrato");
      setShowNewPrivato(false);
    }
    resetForm();
    refetchPrivati();
  };

  const handleDeletePrivato = async (id: string) => {
    if (!window.confirm("Eliminare questo privato?")) return;
    const { error } = await supabase.from("anagrafica_privati").update({ attivo: false } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Privato disattivato");
    refetchPrivati();
  };

  const q = search.toLowerCase();
  const filteredPrivati = (privati || []).filter(p =>
    !q || `${p.nome} ${p.cognome} ${p.codice_fiscale} ${p.comune_residenza || ""}`.toLowerCase().includes(q)
  );
  const filteredAziende = (aziende || []).filter(a =>
    !q || `${a.name} ${a.piva} ${a.codice_fiscale || ""} ${a.comune || ""}`.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca nome, CF, P.IVA, comune..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/30" />
        </div>
        <Button onClick={() => { resetForm(); setShowNewPrivato(true); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nuovo Privato
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const data = tab === "privati" ? filteredPrivati : filteredAziende;
          if (!data.length) return toast.error("Nessun dato da esportare");
          const cols = tab === "privati" ? [
            { header: "Nome", key: "_nome", width: 20, format: (_: any, r: any) => `${r.cognome} ${r.nome}` },
            { header: "CF", key: "codice_fiscale", width: 18 },
            { header: "Comune", key: "comune_residenza", width: 16 },
            { header: "Tipo", key: "tipo_utenza", width: 12 },
            { header: "Telefono", key: "_tel", width: 14, format: (_: any, r: any) => r.telefono || r.cellulare || "-" },
            { header: "Email", key: "email", width: 22 },
          ] : [
            { header: "Denominazione", key: "name", width: 24 },
            { header: "P.IVA", key: "piva", width: 14 },
            { header: "CF", key: "codice_fiscale", width: 18 },
            { header: "Comune", key: "comune", width: 16 },
            { header: "Indirizzo", key: "indirizzo", width: 22 },
          ];
          exportToExcel(data, cols, `anagrafiche-${tab}-dev`, tab === "privati" ? "Privati" : "Aziende");
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="h-3 w-3" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const data = tab === "privati" ? filteredPrivati : filteredAziende;
          if (!data.length) return toast.error("Nessun dato da esportare");
          const cols = tab === "privati" ? [
            { header: "Nome", key: "_nome", width: 20, format: (_: any, r: any) => `${r.cognome} ${r.nome}` },
            { header: "CF", key: "codice_fiscale", width: 18 },
            { header: "Comune", key: "comune_residenza", width: 16 },
            { header: "Tipo", key: "tipo_utenza", width: 12 },
            { header: "Telefono", key: "_tel", width: 14, format: (_: any, r: any) => r.telefono || r.cellulare || "-" },
            { header: "Email", key: "email", width: 22 },
          ] : [
            { header: "Denominazione", key: "name", width: 24 },
            { header: "P.IVA", key: "piva", width: 14 },
            { header: "CF", key: "codice_fiscale", width: 18 },
            { header: "Comune", key: "comune", width: 16 },
            { header: "Indirizzo", key: "indirizzo", width: 22 },
          ];
          exportToPdf(data, cols, `anagrafiche-${tab}-dev`, `Anagrafiche ${tab === "privati" ? "Privati" : "Aziende"}`);
        }} className="gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <Printer className="h-3 w-3" /> PDF
        </Button>
        <div className="flex gap-1">
          <button onClick={() => setTab("privati")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "privati" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`}>
            <Users className="h-4 w-4 inline mr-1" /> Privati ({filteredPrivati.length})
          </button>
          <button onClick={() => setTab("aziende")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "aziende" ? "bg-emerald-600 text-white" : "bg-card/60 text-muted-foreground hover:text-foreground border border-border/30"}`}>
            <Building2 className="h-4 w-4 inline mr-1" /> Aziende ({filteredAziende.length})
          </button>
        </div>
      </div>

      {tab === "privati" ? (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Nome</th>
                    <th className="text-left p-3 text-xs uppercase">CF</th>
                    <th className="text-left p-3 text-xs uppercase">Comune</th>
                    <th className="text-left p-3 text-xs uppercase">Tipo</th>
                    <th className="text-left p-3 text-xs uppercase">Telefono</th>
                    <th className="text-left p-3 text-xs uppercase">Email</th>
                    <th className="text-right p-3 text-xs uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrivati.slice(0, 100).map((p) => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3 font-medium">{p.cognome} {p.nome}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{p.codice_fiscale}</td>
                      <td className="p-3 text-muted-foreground">{p.comune_residenza || "—"}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">{p.tipo_utenza}</span></td>
                      <td className="p-3 text-muted-foreground">{p.telefono || p.cellulare || "—"}</td>
                      <td className="p-3 text-muted-foreground">{p.email || "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="text-emerald-400 h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePrivato(p.id)} className="text-red-400 h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPrivati.length > 100 && (
                    <tr><td colSpan={7} className="p-3 text-center text-muted-foreground text-xs">... e altri {filteredPrivati.length - 100} risultati</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left p-3 text-xs uppercase">Denominazione</th>
                    <th className="text-left p-3 text-xs uppercase">P.IVA</th>
                    <th className="text-left p-3 text-xs uppercase">CF</th>
                    <th className="text-left p-3 text-xs uppercase">Comune</th>
                    <th className="text-left p-3 text-xs uppercase">Indirizzo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAziende.slice(0, 100).map((a) => (
                    <tr key={a.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{a.piva}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{a.codice_fiscale || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.comune || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.indirizzo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New/Edit Privato Dialog */}
      <Dialog open={showNewPrivato || !!showEditPrivato} onOpenChange={(o) => { if (!o) { setShowNewPrivato(false); setShowEditPrivato(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditPrivato ? "Modifica Privato" : "Nuovo Privato"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={privatoForm.nome} onChange={(e) => setPrivatoForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Cognome *</Label><Input value={privatoForm.cognome} onChange={(e) => setPrivatoForm(p => ({ ...p, cognome: e.target.value }))} /></div>
            <div><Label>Codice Fiscale *</Label><Input value={privatoForm.codice_fiscale} onChange={(e) => setPrivatoForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))} className="font-mono" /></div>
            <div>
              <Label>Tipo Utenza</Label>
              <Select value={privatoForm.tipo_utenza} onValueChange={(v) => setPrivatoForm(p => ({ ...p, tipo_utenza: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestica">Domestica</SelectItem>
                  <SelectItem value="non_domestica">Non Domestica</SelectItem>
                  <SelectItem value="produttore_speciali">Produttore Speciali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Indirizzo</Label><Input value={privatoForm.indirizzo} onChange={(e) => setPrivatoForm(p => ({ ...p, indirizzo: e.target.value }))} /></div>
            <div><Label>Comune</Label><Input value={privatoForm.comune_residenza} onChange={(e) => setPrivatoForm(p => ({ ...p, comune_residenza: e.target.value }))} /></div>
            <div><Label>CAP</Label><Input value={privatoForm.cap} onChange={(e) => setPrivatoForm(p => ({ ...p, cap: e.target.value }))} /></div>
            <div><Label>Provincia</Label><Input value={privatoForm.provincia} onChange={(e) => setPrivatoForm(p => ({ ...p, provincia: e.target.value }))} /></div>
            <div><Label>Telefono</Label><Input value={privatoForm.telefono} onChange={(e) => setPrivatoForm(p => ({ ...p, telefono: e.target.value }))} /></div>
            <div><Label>Cellulare</Label><Input value={privatoForm.cellulare} onChange={(e) => setPrivatoForm(p => ({ ...p, cellulare: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={privatoForm.email} onChange={(e) => setPrivatoForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>PEC</Label><Input value={privatoForm.pec} onChange={(e) => setPrivatoForm(p => ({ ...p, pec: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Note</Label><Textarea value={privatoForm.note} onChange={(e) => setPrivatoForm(p => ({ ...p, note: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewPrivato(false); setShowEditPrivato(null); resetForm(); }}>Annulla</Button>
            <Button onClick={handleSavePrivato} className="bg-emerald-600 hover:bg-emerald-700">
              {showEditPrivato ? "Aggiorna" : "Registra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Report Chiamate ───
function ReportChiamateView() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["dev-calls-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calls").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="bg-card/60 border-border/30">
      <CardHeader>
        <CardTitle className="text-emerald-400 flex items-center gap-2">
          <PhoneCall className="h-5 w-5" /> Report Chiamate ({calls?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Caricamento...</p>
        ) : !calls?.length ? (
          <p className="text-muted-foreground text-sm">Nessuna chiamata registrata</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/30 text-muted-foreground">
                  <th className="text-left p-3 text-xs uppercase">Tipo</th>
                  <th className="text-left p-3 text-xs uppercase">Stato</th>
                  <th className="text-left p-3 text-xs uppercase">Durata</th>
                  <th className="text-left p-3 text-xs uppercase">Data</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => {
                  const duration = c.answered_at && c.ended_at
                    ? Math.round((new Date(c.ended_at).getTime() - new Date(c.answered_at).getTime()) / 1000)
                    : null;
                  return (
                    <tr key={c.id} className="border-b border-border/10 hover:bg-white/5">
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.call_type === "audio" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>{c.call_type}</span></td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${c.status === "ended" ? "bg-muted text-muted-foreground" : c.status === "answered" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{c.status}</span></td>
                      <td className="p-3 font-mono text-muted-foreground">{duration != null ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
