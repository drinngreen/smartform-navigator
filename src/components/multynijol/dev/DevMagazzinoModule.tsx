import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowDown, ArrowUp, Plus, Minus, RefreshCw, Printer, FileSpreadsheet, Search, Scissors, History } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPdf } from "@/lib/exportUtils";
import { CER_DATA } from "./DevCERPreferitiModule";

const MULTY_TENANT_ID = "77ec9a3d-602e-438f-97bf-1c69abd8f691";

export function DevMagazzinoModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchCer, setSearchCer] = useState("");
  const [filterTipo, setFilterTipo] = useState<"all" | "privato" | "azienda">("all");
  const [showCarico, setShowCarico] = useState(false);
  const [showScarico, setShowScarico] = useState(false);
  const [showCernita, setShowCernita] = useState(false);
  const [selectedCer, setSelectedCer] = useState("");

  // Carico/Scarico form
  const [opForm, setOpForm] = useState({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
  const [cerSearchInput, setCerSearchInput] = useState("");

  // Cernita wizard
  const [cernitaStep, setCernitaStep] = useState(0);
  const [cernitaInput, setCernitaInput] = useState({ cer: "", quantita: "" });
  const [cernitaOutputs, setCernitaOutputs] = useState<{ cer: string; quantita: string; tipo: string }[]>([{ cer: "", quantita: "", tipo: "rifiuto" }]);

  // Fetch impianti
  const { data: impianti } = useQuery({
    queryKey: ["dev-impianti-mag", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("impianti").select("id, nome").eq("tenant_id", MULTY_TENANT_ID);
      if (error) throw error;
      return data;
    },
  });
  const impiantoId = impianti?.[0]?.id;

  // Fetch giacenze
  const { data: giacenze, isLoading } = useQuery({
    queryKey: ["dev-mag-giacenze", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase.from("magazzino_giacenze").select("*").eq("tenant_id", MULTY_TENANT_ID).order("cer");
      if (error) throw error;
      return data;
    },
  });

  // Fetch movimenti
  const { data: movimenti } = useQuery({
    queryKey: ["dev-mag-movimenti", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_impianto" as any)
        .select("*")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("data_movimento", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch cernite
  const { data: cernite } = useQuery({
    queryKey: ["dev-cernite", MULTY_TENANT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cernite" as any)
        .select("*, cernita_output(*)")
        .eq("tenant_id", MULTY_TENANT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidateAll = () => {
    ["dev-mag-giacenze", "dev-mag-movimenti", "dev-cernite", "dev-giacenze", "dev-movimenti-multy", "dev-registro-movimenti"].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] })
    );
  };

  // Recalculate
  const recalculate = useMutation({
    mutationFn: async () => {
      if (!movimenti) return;
      const stock: Record<string, { cer: string; impianto_id: string; carico: number; scarico: number }> = {};
      for (const m of movimenti) {
        const key = `${m.impianto_id}_${m.cer}`;
        if (!stock[key]) stock[key] = { cer: m.cer, impianto_id: m.impianto_id, carico: 0, scarico: 0 };
        if (m.tipo_movimento === "CARICO") stock[key].carico += Number(m.quantita_kg);
        else stock[key].scarico += Number(m.quantita_kg);
      }
      for (const [, v] of Object.entries(stock)) {
        const qty = v.carico - v.scarico;
        await supabase.from("magazzino_giacenze").upsert({
          tenant_id: MULTY_TENANT_ID, impianto_id: v.impianto_id, cer: v.cer, quantita_kg: qty, ultimo_carico_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,impianto_id,cer" });
      }
    },
    onSuccess: () => { invalidateAll(); toast.success("Giacenze ricalcolate"); },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  // Save operation
  const saveOperazione = async (tipo: "CARICO" | "SCARICO", cer: string, quantita: number, nota: string, firNumero?: string) => {
    if (!impiantoId) { toast.error("Nessun impianto configurato"); return; }
    // Insert movement
    const { error: movErr } = await supabase.from("movimenti_impianto" as any).insert({
      impianto_id: impiantoId, tenant_id: MULTY_TENANT_ID, cer, quantita_kg: quantita,
      tipo_movimento: tipo, ruolo_impianto: "DESTINATARIO", data_movimento: new Date().toISOString(),
      note: nota || null, numero_fir: firNumero || null, created_by: user?.id,
    } as any);
    if (movErr) throw movErr;

    // Upsert giacenza
    const current = giacenze?.find(g => g.cer === cer);
    const newQty = (Number(current?.quantita_kg) || 0) + (tipo === "CARICO" ? quantita : -quantita);
    const { error: gErr } = await supabase.from("magazzino_giacenze").upsert({
      tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, cer, quantita_kg: newQty,
      ...(tipo === "CARICO" ? { ultimo_carico_at: new Date().toISOString() } : { ultimo_scarico_at: new Date().toISOString() }),
    }, { onConflict: "tenant_id,impianto_id,cer" });
    if (gErr) throw gErr;
    invalidateAll();
  };

  const handleSaveCarico = async () => {
    if (!opForm.cer || !opForm.quantita) { toast.error("CER e quantità obbligatori"); return; }
    try {
      await saveOperazione("CARICO", opForm.cer, parseFloat(opForm.quantita), opForm.nota, opForm.fir_numero);
      toast.success("✅ Carico registrato");
      setShowCarico(false);
      setOpForm({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveScarico = async () => {
    if (!opForm.cer || !opForm.quantita) { toast.error("CER e quantità obbligatori"); return; }
    const current = giacenze?.find(g => g.cer === opForm.cer);
    if (parseFloat(opForm.quantita) > (Number(current?.quantita_kg) || 0)) { toast.error("Quantità superiore alla giacenza!"); return; }
    try {
      await saveOperazione("SCARICO", opForm.cer, parseFloat(opForm.quantita), opForm.nota, opForm.fir_numero);
      toast.success("✅ Scarico registrato");
      setShowScarico(false);
      setOpForm({ cer: "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveCernita = async () => {
    if (!cernitaInput.cer || !cernitaInput.quantita) { toast.error("Input obbligatorio"); return; }
    const validOutputs = cernitaOutputs.filter(o => o.cer && o.quantita);
    if (validOutputs.length === 0) { toast.error("Almeno un output obbligatorio"); return; }
    const inputKg = parseFloat(cernitaInput.quantita);
    const outputKg = validOutputs.reduce((s, o) => s + parseFloat(o.quantita), 0);
    const diff = Math.abs(inputKg - outputKg) / inputKg;
    if (outputKg > inputKg) { toast.error("Output supera l'input!"); return; }

    try {
      // Create cernita record
      const { data: cernitaData, error: cernitaErr } = await supabase.from("cernite" as any)
        .insert({ tenant_id: MULTY_TENANT_ID, impianto_id: impiantoId, cer_input: cernitaInput.cer, quantita_input: inputKg, stato: "completata", created_by: user?.id } as any)
        .select("id").single();
      if (cernitaErr) throw cernitaErr;
      const cernitaId = (cernitaData as any).id;

      // Insert outputs
      const outputRows = validOutputs.map(o => ({ cernita_id: cernitaId, cer_output: o.cer, quantita: parseFloat(o.quantita), tipo_output: o.tipo }));
      const { error: outErr } = await supabase.from("cernita_output" as any).insert(outputRows as any);
      if (outErr) throw outErr;

      // Scarico input
      await saveOperazione("SCARICO", cernitaInput.cer, inputKg, `Cernita ${cernitaId}`);

      // Carico outputs
      for (const o of validOutputs) {
        await saveOperazione("CARICO", o.cer, parseFloat(o.quantita), `Cernita ${cernitaId} — ${o.tipo}`);
      }

      toast.success("✅ Cernita completata!");
      setShowCernita(false);
      setCernitaStep(0);
      setCernitaInput({ cer: "", quantita: "" });
      setCernitaOutputs([{ cer: "", quantita: "", tipo: "rifiuto" }]);
    } catch (err: any) { toast.error(err.message); }
  };

  // Filtered
  const filteredGiacenze = useMemo(() => {
    return giacenze?.filter(g => {
      if (searchCer && !g.cer.includes(searchCer)) return false;
      if (filterTipo === "privato" && !g.cer.startsWith("20")) return false;
      if (filterTipo === "azienda" && g.cer.startsWith("20")) return false;
      return true;
    });
  }, [giacenze, searchCer, filterTipo]);

  const totaleKg = filteredGiacenze?.reduce((s, g) => s + Number(g.quantita_kg), 0) ?? 0;
  const positiveCers = filteredGiacenze?.filter(g => Number(g.quantita_kg) > 0).length ?? 0;
  const movimentiOggi = movimenti?.filter(m => new Date(m.data_movimento).toDateString() === new Date().toDateString()).length ?? 0;

  const filteredCerList = useMemo(() => {
    if (!cerSearchInput) return CER_DATA.slice(0, 15);
    const s = cerSearchInput.toLowerCase();
    return CER_DATA.filter(c => c.codice.includes(s) || c.descrizione.toLowerCase().includes(s)).slice(0, 15);
  }, [cerSearchInput]);

  const openCarico = (cer?: string) => {
    setOpForm({ cer: cer || "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
    setCerSearchInput(cer || "");
    setShowCarico(true);
  };

  const openScarico = (cer?: string) => {
    setOpForm({ cer: cer || "", quantita: "", conferente: "privato", nota: "", fir_numero: "" });
    setCerSearchInput(cer || "");
    setShowScarico(true);
  };

  const openCernita = (cer?: string) => {
    setCernitaStep(0);
    setCernitaInput({ cer: cer || "", quantita: "" });
    setCernitaOutputs([{ cer: "", quantita: "", tipo: "rifiuto" }]);
    setShowCernita(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="giacenze">
        <TabsList className="bg-card/60 border border-border/30 p-1">
          <TabsTrigger value="giacenze" className="gap-2 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Package className="h-4 w-4" /> Giacenze</TabsTrigger>
          <TabsTrigger value="cernita" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Scissors className="h-4 w-4" /> Cernita</TabsTrigger>
          <TabsTrigger value="storico" className="gap-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"><History className="h-4 w-4" /> Storico</TabsTrigger>
        </TabsList>

        {/* GIACENZE TAB */}
        <TabsContent value="giacenze" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><Package className="h-8 w-8 text-emerald-400" /><div><p className="text-xs text-muted-foreground">CER in Stock</p><p className="text-2xl font-bold text-emerald-400">{positiveCers}</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><ArrowDown className="h-8 w-8 text-blue-400" /><div><p className="text-xs text-muted-foreground">Totale in Giacenza</p><p className="text-2xl font-bold text-blue-400">{totaleKg.toLocaleString("it-IT")} kg</p></div></CardContent></Card>
            <Card className="bg-card/60 border-emerald-500/30"><CardContent className="p-4 flex items-center gap-3"><ArrowUp className="h-8 w-8 text-amber-400" /><div><p className="text-xs text-muted-foreground">Movimenti Oggi</p><p className="text-2xl font-bold text-amber-400">{movimentiOggi}</p></div></CardContent></Card>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Filtra per CER..." value={searchCer} onChange={e => setSearchCer(e.target.value)} className="max-w-xs bg-card/60 border-border/50" />
            <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
              <SelectTrigger className="w-40 bg-card/60 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="privato">Privati (200xxx)</SelectItem>
                <SelectItem value="azienda">Aziende</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => openCarico()} className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"><Plus className="h-4 w-4" /> Carico</Button>
            <Button variant="outline" onClick={() => openScarico()} className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"><Minus className="h-4 w-4" /> Scarico</Button>
            <Button variant="outline" onClick={() => openCernita()} className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"><Scissors className="h-4 w-4" /> Cernita</Button>
            <Button variant="outline" onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="gap-2 border-border/50 text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /> Ricalcola</Button>
          </div>

          {/* Table */}
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-3 px-4">CER</th><th className="text-left py-3 px-4">Tipo</th><th className="text-right py-3 px-4">Giacenza (kg)</th><th className="text-left py-3 px-4">Stato</th><th className="text-right py-3 px-4">Azioni</th>
                  </tr></thead>
                  <tbody>
                    {isLoading ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Caricamento...</td></tr>
                    : !filteredGiacenze?.length ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nessuna giacenza. Clicca "Ricalcola" o registra un carico.</td></tr>
                    : filteredGiacenze.map(g => {
                      const qty = Number(g.quantita_kg);
                      const tipo = g.cer.startsWith("20") ? "privato" : "azienda";
                      return (
                        <tr key={g.id} className="border-b border-border/10 hover:bg-white/5">
                          <td className="py-2 px-4 font-mono text-emerald-300">{g.cer}</td>
                          <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${tipo === "privato" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"}`}>{tipo}</span></td>
                          <td className={`py-2 px-4 text-right font-bold font-mono ${qty > 0 ? "text-emerald-400" : qty < 0 ? "text-red-400" : "text-muted-foreground"}`}>{qty.toLocaleString("it-IT")}</td>
                          <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] ${qty > 0 ? "bg-emerald-500/15 text-emerald-400" : qty === 0 ? "bg-muted/30 text-muted-foreground" : "bg-red-500/15 text-red-400"}`}>{qty > 0 ? "In stock" : qty === 0 ? "Vuoto" : "Negativo"}</span></td>
                          <td className="py-2 px-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openCarico(g.cer)} className="px-2 py-1 rounded text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">+ Carico</button>
                              <button onClick={() => openScarico(g.cer)} className="px-2 py-1 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20" disabled={qty <= 0}>- Scarico</button>
                              <button onClick={() => openCernita(g.cer)} className="px-2 py-1 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" disabled={qty <= 0}>Cernita</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CERNITA TAB */}
        <TabsContent value="cernita" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-display text-amber-400">Storico Cernite</h3>
            <Button variant="outline" onClick={() => openCernita()} className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"><Scissors className="h-4 w-4" /> Nuova Cernita</Button>
          </div>
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-3 px-4">Data</th><th className="text-left py-3 px-4">CER Input</th><th className="text-right py-3 px-4">Kg Input</th><th className="text-left py-3 px-4">Output</th><th className="text-left py-3 px-4">Stato</th>
                  </tr></thead>
                  <tbody>
                    {!cernite?.length ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nessuna cernita registrata</td></tr>
                    : cernite.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/10 hover:bg-white/5">
                        <td className="py-2 px-4 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("it-IT")}</td>
                        <td className="py-2 px-4 font-mono text-amber-300">{c.cer_input}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">{Number(c.quantita_input).toLocaleString("it-IT")}</td>
                        <td className="py-2 px-4 text-xs">
                          {(c.cernita_output || []).map((o: any, i: number) => (
                            <span key={i} className="inline-block mr-2 px-1.5 py-0.5 rounded bg-card/60 border border-border/20 font-mono">
                              {o.cer_output}: {Number(o.quantita).toLocaleString("it-IT")}kg <span className="text-muted-foreground">({o.tipo_output})</span>
                            </span>
                          ))}
                        </td>
                        <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] ${c.stato === "completata" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{c.stato}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORICO TAB */}
        <TabsContent value="storico" className="space-y-4">
          <Card className="bg-card/60 border-border/30">
            <CardHeader><CardTitle className="text-blue-400 flex items-center gap-2"><History className="h-5 w-5" /> Ultimi 100 Movimenti</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left py-3 px-4">Data</th><th className="text-left py-3 px-4">Tipo</th><th className="text-left py-3 px-4">CER</th><th className="text-right py-3 px-4">Kg</th><th className="text-left py-3 px-4">Note</th>
                  </tr></thead>
                  <tbody>
                    {!movimenti?.length ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nessun movimento</td></tr>
                    : movimenti.map((m: any) => (
                      <tr key={m.id} className="border-b border-border/10 hover:bg-white/5">
                        <td className="py-2 px-4 text-xs text-muted-foreground font-mono">{new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
                        <td className="py-2 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${m.tipo_movimento === "CARICO" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>{m.tipo_movimento}</span></td>
                        <td className="py-2 px-4 font-mono text-emerald-300">{m.cer}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold">{Number(m.quantita_kg).toLocaleString("it-IT")}</td>
                        <td className="py-2 px-4 text-xs text-muted-foreground truncate max-w-[200px]">{m.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CARICO DIALOG */}
      <Dialog open={showCarico} onOpenChange={setShowCarico}>
        <DialogContent className="bg-card border-emerald-500/30 max-w-md">
          <DialogHeader><DialogTitle className="text-emerald-400 flex items-center gap-2"><Plus className="h-5 w-5" /> Registra Carico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Codice CER *</Label>
              <Input value={opForm.cer} onChange={e => { setOpForm(f => ({ ...f, cer: e.target.value })); setCerSearchInput(e.target.value); }} placeholder="Es. 200101" className="font-mono bg-background/80 border-border/30" />
              {cerSearchInput && filteredCerList.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto border border-border/20 rounded-lg bg-card">
                  {filteredCerList.map(c => (
                    <button key={c.codice} onClick={() => { setOpForm(f => ({ ...f, cer: c.codice })); setCerSearchInput(""); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 text-foreground">
                      <span className="font-mono text-emerald-300">{c.codice}</span> — {c.descrizione.slice(0, 60)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><Label className="text-xs text-muted-foreground">Quantità (kg) *</Label><Input type="number" value={opForm.quantita} onChange={e => setOpForm(f => ({ ...f, quantita: e.target.value }))} className="font-mono bg-background/80 border-border/30" /></div>
            <div><Label className="text-xs text-muted-foreground">N° FIR (opzionale)</Label><Input value={opForm.fir_numero} onChange={e => setOpForm(f => ({ ...f, fir_numero: e.target.value }))} className="font-mono bg-background/80 border-border/30" /></div>
            <div><Label className="text-xs text-muted-foreground">Note</Label><Textarea value={opForm.nota} onChange={e => setOpForm(f => ({ ...f, nota: e.target.value }))} className="bg-background/80 border-border/30" rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveCarico} className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">Salva Carico</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCARICO DIALOG */}
      <Dialog open={showScarico} onOpenChange={setShowScarico}>
        <DialogContent className="bg-card border-red-500/30 max-w-md">
          <DialogHeader><DialogTitle className="text-red-400 flex items-center gap-2"><Minus className="h-5 w-5" /> Registra Scarico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Codice CER *</Label>
              <Input value={opForm.cer} onChange={e => { setOpForm(f => ({ ...f, cer: e.target.value })); setCerSearchInput(e.target.value); }} placeholder="Es. 200101" className="font-mono bg-background/80 border-border/30" />
              {opForm.cer && <p className="text-xs text-muted-foreground mt-1">Giacenza attuale: <span className="font-bold text-foreground">{(Number(giacenze?.find(g => g.cer === opForm.cer)?.quantita_kg) || 0).toLocaleString("it-IT")} kg</span></p>}
            </div>
            <div><Label className="text-xs text-muted-foreground">Quantità (kg) *</Label><Input type="number" value={opForm.quantita} onChange={e => setOpForm(f => ({ ...f, quantita: e.target.value }))} className="font-mono bg-background/80 border-border/30" /></div>
            <div><Label className="text-xs text-muted-foreground">N° FIR (opzionale)</Label><Input value={opForm.fir_numero} onChange={e => setOpForm(f => ({ ...f, fir_numero: e.target.value }))} className="font-mono bg-background/80 border-border/30" /></div>
            <div><Label className="text-xs text-muted-foreground">Note</Label><Textarea value={opForm.nota} onChange={e => setOpForm(f => ({ ...f, nota: e.target.value }))} className="bg-background/80 border-border/30" rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveScarico} className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30">Salva Scarico</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CERNITA WIZARD DIALOG */}
      <Dialog open={showCernita} onOpenChange={setShowCernita}>
        <DialogContent className="bg-card border-amber-500/30 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-amber-400 flex items-center gap-2"><Scissors className="h-5 w-5" /> Nuova Cernita — Step {cernitaStep + 1}/3</DialogTitle></DialogHeader>

          {cernitaStep === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Seleziona il CER in ingresso e la quantità da lavorare.</p>
              <div>
                <Label className="text-xs text-muted-foreground">CER Input *</Label>
                <Input value={cernitaInput.cer} onChange={e => setCernitaInput(f => ({ ...f, cer: e.target.value }))} placeholder="Es. 200301" className="font-mono bg-background/80 border-border/30" />
                {cernitaInput.cer && <p className="text-xs text-muted-foreground mt-1">Giacenza: <span className="font-bold">{(Number(giacenze?.find(g => g.cer === cernitaInput.cer)?.quantita_kg) || 0).toLocaleString("it-IT")} kg</span></p>}
              </div>
              <div><Label className="text-xs text-muted-foreground">Quantità (kg) *</Label><Input type="number" value={cernitaInput.quantita} onChange={e => setCernitaInput(f => ({ ...f, quantita: e.target.value }))} className="font-mono bg-background/80 border-border/30" /></div>
              <Button onClick={() => { if (!cernitaInput.cer || !cernitaInput.quantita) { toast.error("Compila i campi"); return; } setCernitaStep(1); }} className="bg-amber-500/20 border border-amber-500/30 text-amber-400 w-full">Avanti →</Button>
            </div>
          )}

          {cernitaStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Aggiungi le frazioni di output dalla cernita.</p>
              {cernitaOutputs.map((o, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1"><Label className="text-[10px] text-muted-foreground">CER</Label><Input value={o.cer} onChange={e => { const arr = [...cernitaOutputs]; arr[i].cer = e.target.value; setCernitaOutputs(arr); }} placeholder="CER" className="font-mono text-xs bg-background/80 border-border/30" /></div>
                  <div className="w-24"><Label className="text-[10px] text-muted-foreground">Kg</Label><Input type="number" value={o.quantita} onChange={e => { const arr = [...cernitaOutputs]; arr[i].quantita = e.target.value; setCernitaOutputs(arr); }} className="font-mono text-xs bg-background/80 border-border/30" /></div>
                  <div className="w-28">
                    <Label className="text-[10px] text-muted-foreground">Tipo</Label>
                    <Select value={o.tipo} onValueChange={v => { const arr = [...cernitaOutputs]; arr[i].tipo = v; setCernitaOutputs(arr); }}>
                      <SelectTrigger className="text-xs bg-background/80 border-border/30"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="rifiuto">Rifiuto</SelectItem><SelectItem value="mps">MPS</SelectItem><SelectItem value="eow">EOW</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {cernitaOutputs.length > 1 && <button onClick={() => setCernitaOutputs(arr => arr.filter((_, j) => j !== i))} className="text-red-400 text-xs pb-2">✕</button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCernitaOutputs(arr => [...arr, { cer: "", quantita: "", tipo: "rifiuto" }])} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Aggiungi Output</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCernitaStep(0)} className="flex-1">← Indietro</Button>
                <Button onClick={() => setCernitaStep(2)} className="flex-1 bg-amber-500/20 border border-amber-500/30 text-amber-400">Avanti →</Button>
              </div>
            </div>
          )}

          {cernitaStep === 2 && (() => {
            const inputKg = parseFloat(cernitaInput.quantita) || 0;
            const validOutputs = cernitaOutputs.filter(o => o.cer && o.quantita);
            const outputKg = validOutputs.reduce((s, o) => s + (parseFloat(o.quantita) || 0), 0);
            const diff = inputKg > 0 ? ((inputKg - outputKg) / inputKg * 100) : 0;
            return (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Verifica il bilancio prima di confermare.</p>
                <div className="rounded-lg bg-background/80 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Input:</span><span className="font-mono font-bold">{cernitaInput.cer} — {inputKg.toLocaleString("it-IT")} kg</span></div>
                  <div className="border-t border-border/20 pt-2">
                    {validOutputs.map((o, i) => (
                      <div key={i} className="flex justify-between text-xs"><span className="font-mono">{o.cer}</span><span>{parseFloat(o.quantita).toLocaleString("it-IT")} kg ({o.tipo})</span></div>
                    ))}
                  </div>
                  <div className="border-t border-border/20 pt-2 flex justify-between font-bold">
                    <span>Totale Output:</span><span className="font-mono">{outputKg.toLocaleString("it-IT")} kg</span>
                  </div>
                  <div className={`flex justify-between ${diff > 5 ? "text-amber-400" : diff > 0 ? "text-muted-foreground" : "text-emerald-400"}`}>
                    <span>Scarto:</span><span className="font-mono">{(inputKg - outputKg).toLocaleString("it-IT")} kg ({diff.toFixed(1)}%)</span>
                  </div>
                  {diff > 5 && <p className="text-amber-400 text-xs">⚠️ Scarto superiore al 5%</p>}
                  {outputKg > inputKg && <p className="text-red-400 text-xs">❌ L'output supera l'input!</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCernitaStep(1)} className="flex-1">← Indietro</Button>
                  <Button onClick={handleSaveCernita} disabled={outputKg > inputKg} className="flex-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">✅ Conferma Cernita</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
